/*
 * NEON LOOPS 关卡生成器 + 验收（Node 和浏览器共用一份代码）
 *
 * 规则只有一份：src/core.js（机制、碰撞、求解器）和 src/layout.js（排版、避让陪玩角色）。
 * 这里只负责：搭结构 → 随机角度 → 合法性 → 求解 → 量难度 → 按 docs/level-rules.md 的验收标准打分。
 *
 * Node：  node tools/levelgen/cli.js help
 * 浏览器：tools/verify.html（验收全部关卡）
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const path = require('path'), src = path.join(__dirname, '..', '..', 'src');
    for (const f of ['core.js', 'layout.js', 'chapters.js']) require(path.join(src, f));
    require(path.join(__dirname, 'curve.js'));
    module.exports = factory(globalThis);
  } else root.RRGen = factory(root);
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';
  const C = root.RRCore, LAY = root.RRLayout, CURVE = root.RRCurve, CH = root.RRChapters;
  const DEG = Math.PI / 180;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const round = (v, k) => Math.round(v * 10 ** k) / 10 ** k;

  // ---------- 验收用的硬指标（改这里要同步改 docs/level-rules.md） ----------
  const RULES = {
    RING_PX_MIN: 27.5,  // 参考屏（390×844）上最小环的半径下限：第 4 关最小环改版前的实测值
    TUBE_PX_MIN: 9.0,   // 管子粗细下限（缩放 0.75）
    HARD_SIZE: 0.9,     // 困难关可以缩到上面两个下限的 90%
    GROWTH: 2,          // 零件数最多比前面所有关卡里最多的那关多 2 个
    GROWTH_EARLY: 3,    // 第 1-5 关（教学阶段）放宽到 +3
    NEW_MAX: 1,         // 每关最多引入 1 个新机制
    NEW_MAX_EARLY: 2,   // 第 1-4 关（教学关）最多 2 个
    EARLY: 5,
    LINKS_PER_RING: 4,  // 一个环身上最多几条连接（杆 + 夹套）
    BFS: { maxDepth: 26, maxNodes: 60000 },  // 精确求最少步数的预算
    FAST: { maxNodes: 120000 },              // 精确求不出来时，快速求解兜底（只保证可解）
    TRAP_NODES: 15000,                       // 量“第一步陷阱”时，每个分支的预算
  };
  const PALETTE = ['#ff3df2', '#28e7ff', '#ffad42', '#b6ff4a', '#a47bff', '#ffe45c', '#ff4d6d', '#4d8bff', '#3dffb0'];

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  const randInt = (R, [lo, hi]) => lo + Math.floor(R() * (hi - lo + 1));
  const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
  function shuffle(R, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  // 第 n 关（从 1 数）所在章节的立绘轮廓；还没做角色的章节按第 1 章的轮廓留位置（每章都会有陪玩角色）
  function maskFor(n) {
    const list = CH.list, c = list[Math.floor((n - 1) / CH.PER_CHAPTER)];
    return (c && c.girl && c.girl.mask) || list[0].girl.mask;
  }
  const isHard = (n) => CH.isHard(n - 1);

  // ---------- 手工模板：树形结构 ----------
  // 节点 [id, 父 id, 方位角, 半径, 选项]；父是主环，伸杆扣住子环。选项：at 绝对坐标、stem 杆长、closed 闭合、knob 带凸钉
  function tree(nodes, extraLinks, bars) {
    const pos = {}, rings = [], links = [];
    for (const [id, parent, dir, r, opt] of nodes) {
      let x = 0, y = 0;
      if (opt && opt.at) { x = opt.at[0]; y = opt.at[1]; }
      else if (parent) {
        const P = pos[parent], d = P.r + r + ((opt && opt.stem) || 18);
        x = P.x + Math.cos(dir * DEG) * d; y = P.y + Math.sin(dir * DEG) * d;
      }
      if (parent) links.push([parent, id, opt && opt.keep]);
      pos[id] = { x, y, r };
      rings.push({ id, x: Math.round(x), y: Math.round(y), r, opt: opt || {} });
    }
    // 大环（半径 > 90）默认被它周围的小环扣住：连接方向反过来；选项 keep 表示真的由大环伸杆扣住这个小环
    const all = links.concat(extraLinks || []).map(([o, h, keep]) => (!keep && pos[o].r > 90 ? [h, o] : [o, h]));
    for (const [id, owner, dir, len, opt] of bars || []) {
      const P = pos[owner], d = P.r + ((opt && opt.stem) || 16);
      const x = P.x + Math.cos(dir * DEG) * d, y = P.y + Math.sin(dir * DEG) * d;
      rings.push({ id, type: 'bar', x: Math.round(x), y: Math.round(y), dir: dir + 90, len, opt: opt || {} });
      all.push([owner, id]);
    }
    return { rings, links: all };
  }

  const TEMPLATES = {
    L1: () => tree([
      ['a', null, 0, 46, { at: [-56, 0] }],
      ['b', 'a', 0, 46, {}],
    ]),
    L2: () => tree([
      ['a', null, 0, 44, { at: [0, -110] }],
      ['b', 'a', 90, 46, {}],
      ['c', 'b', 90, 44, {}],
      ['d', 'b', 0, 38, { stem: 16 }],
    ]),
    L3: () => tree([
      ['h', null, 0, 42, { at: [0, 10], closed: true }],
      ['a', 'h', -90, 42, { knob: true }],
      ['b', 'h', 30, 42, { knob: true }],
      ['c', 'h', 150, 42, { knob: true }],
      ['e', 'a', -90, 36, { stem: 16 }],
    ]),
    L4: () => tree([
      ['h1', null, 0, 40, { at: [-95, 0], closed: true }],
      ['h2', null, 0, 40, { at: [95, 0], closed: true }],
      ['m', 'h1', 0, 40, { stem: 15 }],
      ['a', 'h1', -120, 38, { knob: true }],
      ['b', 'h1', 120, 38, {}],
      ['c', 'h2', -60, 38, { knob: true }],
      ['d', 'h2', 60, 38, {}],
      ['e', 'd', 60, 36, { knob: true }],
    ], [['h2', 'm']]),
    // 第 5 关（困难）：闭合环 h 扣三个环，右上的 r 和 h 一起扣住 m（桥）；多根凸钉和空夹套互相卡位。竖向排，右下给角色留空
    L5: () => tree([
      ['h', null, 0, 40, { at: [-40, -40], closed: true }],
      ['a', 'h', -90, 40, { knob: true }],
      ['b', 'h', 150, 40, { knob: true }],
      ['m', 'h', 30, 40, {}],
      ['r', null, 0, 40, { at: [96, -119] }],
      ['n', 'r', -90, 38, { knob: true, stem: 16 }],
      ['g', 'a', -90, 38, { stem: 16 }],
      ['k', 'b', 90, 38, { knob: true, stem: 16 }],
      ['d', 'm', 90, 40, { knob: true }],
      ['e', 'd', 150, 38, { knob: true, stem: 16 }],
    ], [['r', 'm']]),
    // 第 6 关：上面两个闭合环各扣一圈，中间的 x 被两边同时扣住，x 下面还挂着一个
    L6: () => tree([
      ['h1', null, 0, 40, { at: [-69, -69], closed: true }],
      ['h2', null, 0, 40, { at: [69, -69], closed: true }],
      ['x', 'h1', 0, 40, { at: [0, 0] }],
      ['a', 'h1', -90, 40, {}],
      ['b', 'h1', -150, 40, { knob: true }],
      ['c', 'h1', 150, 40, {}],
      ['e', 'h2', -90, 40, {}],
      ['f', 'h2', -30, 40, { knob: true }],
      ['k', 'x', 90, 40, { knob: true }],
      ['c2', 'c', 90, 38, { stem: 16 }],
    ], [['h2', 'x']]),
    // 第 7 关：一棵树，树枝末端先走，凸钉别撞上
    L7: () => tree([
      ['h', null, 0, 40, { at: [0, -150], closed: true }],
      ['a', 'h', 210, 40, { knob: true }],
      ['b', 'h', -30, 40, {}],
      ['c', 'h', 90, 40, {}],
      ['d', 'c', 60, 40, { knob: true }],
      ['e', 'c', 120, 40, { knob: true }],
      ['g', 'e', 90, 38, { knob: true, stem: 16 }],
      ['f', 'd', 90, 38, { stem: 16 }],
      ['a2', 'a', 150, 38, { stem: 16 }],
      ['b2', 'b', -90, 38, { knob: true, stem: 16 }],
    ]),
    // 第 8 关：左下两个闭合环托着一座塔，塔底的 x1 被两边扣住
    L8: () => tree([
      ['h1', null, 0, 40, { at: [-150, 130], closed: true }],
      ['h2', null, 0, 40, { at: [-50, 130], closed: true }],
      ['x1', 'h1', 0, 42, { at: [-100, 43] }],
      ['x2', 'h2', -45, 42, {}],
      ['t', 'x1', -60, 42, {}],
      ['u', 't', -90, 40, {}],
      ['w1', 'u', -60, 38, { stem: 16, knob: true }],
      ['w2', 'u', -120, 38, { stem: 16, knob: true }],
      ['s1', 'h1', 210, 38, { knob: true, stem: 16 }],
      ['s2', 'x2', 0, 38, { stem: 16 }],
    ], [['h2', 'x1']]),
    // 第 9 关：直杆登场。两个闭合环在上，中间一座小桥，下面挂一串，两根直杆
    L9: () => tree([
      ['h1', null, 0, 40, { at: [-90, -150], closed: true }],
      ['h2', null, 0, 40, { at: [90, -150], closed: true }],
      ['m', 'h1', 0, 34, { at: [0, -150] }],
      ['a', 'h1', 150, 40, { knob: true }],
      ['b', 'h1', 90, 40, {}],
      ['d', 'h2', 90, 40, {}],
      ['n', 'b', 90, 38, { stem: 16, knob: true }],
      ['p', 'n', 90, 38, { stem: 16 }],
      ['g', 'a', 90, 38, { stem: 16 }],
    ], [['h2', 'm']], [
      ['z1', 'h2', -60, 90, {}],
      ['z2', 'd', 90, 100, {}],
    ]),
    // 大环（第 13 关登场）：一个大 C 环包住一个小环，外面三个环扣着它，它自己还扣着下面的 k（k 不走大环转不动）；
    // 里面的直杆只能从大环的缺口滑出去
    BIG: () => tree([
      ['B', null, 0, 104, { at: [0, 0], knob: true }],
      ['i1', 'B', 0, 36, { at: [-36, -30] }],
      ['o1', 'B', -90, 38, { stem: 18 }],
      ['o2', 'B', 150, 38, { knob: true }],
      ['o3', 'B', -150, 38, {}],
      ['p2', 'o2', 120, 36, { stem: 16, knob: true }],
      ['p3', 'p2', 180, 36, { stem: 16 }],
      ['q', 'o1', -90, 36, { stem: 16, knob: true }],
      ['q3', 'q', -30, 36, { stem: 16, knob: true }],
      ['k', 'B', 90, 36, { stem: 16, keep: true }],
    ], [], [
      ['z1', 'i1', 60, 60, {}],
      ['z2', 'o1', -20, 80, {}],
    ]),
  };

  // ---------- 程序生成：在网格上长出一块连通的结构 ----------
  /*
   * 1. 在参考屏的棋盘区域里铺一张三角或方格网格（格距 = 2r + 杆长），去掉陪玩角色占的格子；
   * 2. 从一个格子开始，按“和已选格子相邻越多越容易被选中”往外长，得到紧凑的一块；
   * 3. 选几个格子当闭合根环，从它们出发广度优先，父格子扣住子格子（主环 → 被扣环，保证无环）；
   * 4. 再在相邻但没连上的格子之间加几条连接（桥：一个环被两个主环扣住，其中至少一个是根环，否则是死结）；
   * 5. 在空的相邻方向挂直杆；一部分被扣环加凸钉。
   * 角度（缺口朝向、初始转角、凸钉方位）由 instantiate 随机。
   */
  function grow(slot, R, n) {
    const g = slot.grow, N = randInt(R, slot.pieces);
    const nBars = Math.min(randInt(R, g.bars), Math.max(0, N - 4));
    const nRings = N - nBars;
    const r0 = g.r || 38, stem = g.stem || 16, P = 2 * r0 + stem;
    const sT = g.scale || 0.84;
    const A = LAY.REF.area, acx = (A.x0 + A.x1) / 2, acy = (A.y0 + A.y1) / 2;
    const hw = (A.x1 - A.x0) / 2 / sT, hh = (A.y1 - A.y0) / 2 / sT;
    const girl = LAY.girlRects(LAY.REF.girlBox, maskFor(n)).map((q) => ({ x0: (q.x0 - acx) / sT, x1: (q.x1 - acx) / sT, y0: (q.y0 - acy) / sT, y1: (q.y1 - acy) / sT }));
    const okSpot = (x, y, rad) => Math.abs(x) + rad <= hw && Math.abs(y) + rad <= hh && girl.every((q) => {
      const dx = Math.max(q.x0 - x, 0, x - q.x1), dy = Math.max(q.y0 - y, 0, y - q.y1);
      return dx * dx + dy * dy >= rad * rad;
    });
    const lat = g.lattice === 'any' || !g.lattice ? (R() < 0.55 ? 'tri' : 'sq') : g.lattice;
    const reach = r0 + C.TUBE / 2 + 8;
    const nodes = [];
    const flip = R() < 0.5, px = R() * P, py = R() * P;
    const dyRow = lat === 'tri' ? (P * Math.sqrt(3)) / 2 : P;
    for (let j = -14; j <= 14; j++) for (let i = -14; i <= 14; i++) {
      let x = i * P + (lat === 'tri' && j & 1 ? P / 2 : 0) + px, y = j * dyRow + py;
      if (flip) [x, y] = [y, x];
      if (okSpot(x, y, reach)) nodes.push({ x, y, k: nodes.length });
    }
    if (nodes.length < nRings) return null;
    const adj = nodes.map(() => []);
    for (const a of nodes) for (const b of nodes) if (a.k < b.k && Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - P) < 1) { adj[a.k].push(b.k); adj[b.k].push(a.k); }
    // 从靠上、靠中间的格子开始长（右下是角色）
    const order = nodes.slice().sort((a, b) => Math.hypot(a.x + hw * 0.1, a.y + hh * 0.15) - Math.hypot(b.x + hw * 0.1, b.y + hh * 0.15));
    const start = order[Math.floor(R() * Math.min(6, order.length))].k;
    const sel = new Set([start]), compact = g.compact || 1.6;
    while (sel.size < nRings) {
      const cand = new Map();
      for (const s of sel) for (const nb of adj[s]) if (!sel.has(nb)) cand.set(nb, (cand.get(nb) || 0) + 1);
      if (!cand.size) return null;
      let tot = 0; const arr = [];
      for (const [k, c] of cand) { const w = c ** compact * (0.6 + R()); arr.push([k, w]); tot += w; }
      let u = R() * tot, chosen = arr[0][0];
      for (const [k, w] of arr) { u -= w; if (u <= 0) { chosen = k; break; } }
      sel.add(chosen);
    }
    const ids = [...sel];
    const deg = (k) => adj[k].filter((x) => sel.has(x)).length;
    // 根环：分散开
    const nHubs = Math.max(1, Math.min(randInt(R, g.hubs), Math.floor(nRings / 4)));
    const hubs = [pick(R, ids.filter((k) => deg(k) >= 2).length ? ids.filter((k) => deg(k) >= 2) : ids)];
    const hopDist = (from) => {
      const d = new Map([[from, 0]]), q = [from];
      while (q.length) { const x = q.shift(); for (const nb of adj[x]) if (sel.has(nb) && !d.has(nb)) { d.set(nb, d.get(x) + 1); q.push(nb); } }
      return d;
    };
    while (hubs.length < nHubs) {
      const ds = hubs.map(hopDist);
      let best = null, bestV = -1;
      for (const k of shuffle(R, ids.slice())) {
        if (hubs.includes(k)) continue;
        const v = Math.min(...ds.map((d) => d.get(k) ?? 99));
        if (v > bestV) { bestV = v; best = k; }
      }
      if (best == null || bestV < 2) break;
      hubs.push(best);
    }
    // 广度优先：父扣子
    const depth = new Map(), links = [], parent = new Map();
    let q = shuffle(R, hubs.slice());
    q.forEach((h) => depth.set(h, 0));
    while (q.length) {
      const next = [];
      for (const x of q) for (const nb of shuffle(R, adj[x].slice())) {
        if (!sel.has(nb) || depth.has(nb)) continue;
        depth.set(nb, depth.get(x) + 1); parent.set(nb, x); links.push([x, nb]); next.push(nb);
      }
      q = shuffle(R, next);
    }
    if (depth.size !== sel.size) return null;
    const rank = (k) => depth.get(k) * 1000 + k;
    // 每个环身上连接的方向（用来保证缺口有地方放）
    const dirs = new Map(ids.map((k) => [k, []]));
    const dirOf = (a, b) => Math.atan2(nodes[b].y - nodes[a].y, nodes[b].x - nodes[a].x);
    const addDir = (k, a) => dirs.get(k).push(a);
    for (const [o, h] of links) { addDir(o, dirOf(o, h)); addDir(h, dirOf(h, o)); }
    // 缺口（名义宽度最大 108°，两边各留 14°）要能放进某段没有连接的弧里
    const roomFor = (list) => {
      if (list.length <= 1) return true;
      const s = list.map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
      for (let i = 0; i < s.length; i++) { const gap = (i + 1 < s.length ? s[i + 1] : s[0] + 2 * Math.PI) - s[i]; if (gap >= 140 * DEG) return true; }
      return false;
    };
    const isHub = (k) => hubs.includes(k);
    // 桥
    const nBridges = randInt(R, g.bridges);
    const linked = new Set(links.map(([a, b]) => a + '-' + b).concat(links.map(([a, b]) => b + '-' + a)));
    const extra = [];
    for (const a of shuffle(R, ids.slice())) for (const b of adj[a]) {
      if (extra.length >= nBridges) break;
      if (!sel.has(b) || linked.has(a + '-' + b)) continue;
      const [o, h] = rank(a) < rank(b) ? [a, b] : [b, a];
      if (isHub(h)) continue;
      // 被两个主环扣住的环，至少要有一个主环是根（闭合根环）：根环可以带着还扣着的连接整体飞走，
      // 非根的主环在扣着东西时永远转不动、也飞不走，两个主环都不是根就成了死结
      if (!isHub(o) && !isHub(parent.get(h))) continue;
      if (links.concat(extra).filter(([, hh2]) => hh2 === h).length >= 2) continue;
      const dO = dirs.get(o).concat([dirOf(o, h)]), dH = dirs.get(h).concat([dirOf(h, o)]);
      if (dO.length > RULES.LINKS_PER_RING || dH.length > RULES.LINKS_PER_RING) continue;
      if (!isHub(o) && !roomFor(dO)) continue;
      if (!roomFor(dH)) continue;
      extra.push([o, h]); linked.add(o + '-' + h); linked.add(h + '-' + o);
      addDir(o, dirOf(o, h)); addDir(h, dirOf(h, o));
    }
    for (const k of ids) if (!isHub(k) && !roomFor(dirs.get(k))) return null;
    // 直杆：挂在某个环朝空格子的方向上，杆和主环的杆垂直
    const bars = [];
    function barPts(b) { const out = [], ux = Math.cos(b.dir * DEG), uy = Math.sin(b.dir * DEG); for (let t = -b.len / 2; t <= b.len / 2 + 0.1; t += 6) out.push({ x: b.x + ux * t, y: b.y + uy * t }); return out; }
    const stepDirs = lat === 'tri' ? [0, 60, 120, 180, 240, 300] : [0, 90, 180, 270];
    for (let tries = 0; bars.length < nBars && tries < 60; tries++) {
      const o = pick(R, ids);
      if (dirs.get(o).length >= RULES.LINKS_PER_RING) continue;
      // 三角网格转 90° 铺的时候，相邻方向变成 30°、90°…
      const a = (pick(R, stepDirs) + (lat === 'tri' && flip ? 30 : 0)) * DEG;
      const bs = 16, d = r0 + bs + C.BAR / 2 - 4;
      const len = 70 + Math.round(R() * 40);
      const bx = nodes[o].x + Math.cos(a) * d, by = nodes[o].y + Math.sin(a) * d;
      const b = { x: bx, y: by, dir: a / DEG + 90, len };
      const pts = barPts(b);
      if (!pts.every((p) => okSpot(p.x, p.y, C.BAR / 2 + 6))) continue;
      // 不能压到别的环（自己的主环只检查管子外缘）
      if (!pts.every((p) => ids.every((k) => Math.hypot(nodes[k].x - p.x, nodes[k].y - p.y) >= r0 + C.TUBE / 2 + C.BAR / 2 + 3))) continue;
      if (!pts.every((p) => bars.every((b2) => barPts(b2).every((p2) => Math.hypot(p2.x - p.x, p2.y - p.y) >= C.BAR + 6)))) continue;
      if (!isHub(o) && !roomFor(dirs.get(o).concat([a]))) continue;
      addDir(o, a);
      bars.push({ ...b, owner: o });
    }
    if (bars.length < nBars) return null;
    // 编号：根环 h1、h2…，其余按字母；直杆 z1、z2…
    const name = new Map();
    hubs.forEach((k, i) => name.set(k, 'h' + (i + 1)));
    const letters = 'abcdefgkmnpqrstuvwxy';
    ids.filter((k) => !isHub(k)).sort((a, b) => rank(a) - rank(b)).forEach((k, i) => name.set(k, letters[i % letters.length] + (i >= letters.length ? '2' : '')));
    const openRoot = R() < (g.openRoot == null ? 0.2 : g.openRoot);
    const rings = ids.sort((a, b) => rank(a) - rank(b)).map((k) => ({
      id: name.get(k), x: Math.round(nodes[k].x), y: Math.round(nodes[k].y), r: r0,
      opt: { closed: isHub(k) && !(openRoot && k === hubs[0] && nHubs > 1), knob: !isHub(k) && R() < g.knobs ? 'maybe' : false },
    }));
    bars.forEach((b, i) => rings.push({ id: 'z' + (i + 1), type: 'bar', x: Math.round(b.x), y: Math.round(b.y), dir: Math.round(b.dir), len: b.len, opt: {} }));
    const L = links.concat(extra).map(([o, h]) => [name.get(o), name.get(h)]).concat(bars.map((b, i) => [name.get(b.owner), 'z' + (i + 1)]));
    return { rings, links: L, lattice: lat };
  }

  // ---------- 随机角度：缺口朝向、初始转角、凸钉方位 ----------
  function instantiate(T, seed) {
    const R = rng(seed), lv = { rings: [], links: T.links };
    // 先用 core 算出每条连接真实的杆根方向和夹套方向（套在大环里时方向是反的）
    const geo = C.build({ rings: T.rings.map((r) => (r.type === 'bar' ? r : { id: r.id, x: r.x, y: r.y, r: r.r, angle: 0 })), links: T.links });
    const idOf = (i) => T.rings[i].id;
    const dirsOf = (id) => {
      const out = [];
      for (const L of geo.links) {
        if (idOf(L.owner) === id) out.push(L.stubAt / DEG);
        if (idOf(L.held) === id) out.push(L.clampAng / DEG);
      }
      return out;
    };
    for (const r of T.rings) {
      if (r.type === 'bar') {
        const len = r.len + Math.round((R() - 0.5) * 16);
        const off = (R() - 0.5) * (len - C.CLAMP_LEN - 20);
        const u = r.dir * DEG;
        lv.rings.push({ id: r.id, type: 'bar', x: Math.round(r.x + Math.cos(u) * off), y: Math.round(r.y + Math.sin(u) * off), dir: r.dir, len });
        continue;
      }
      const ring = { id: r.id, x: r.x, y: r.y, r: r.r };
      const avoid = dirsOf(r.id);
      if (!r.opt.closed) {
        const w = 96 + Math.round(R() * 12);
        ring.gap = { at: 0, w };
        const ok = [];
        for (let a = 0; a < 360; a += 3) if (avoid.every((v) => Math.abs(C.angDiff(a * DEG, v * DEG)) > (w / 2 + 14) * DEG)) ok.push(a);
        if (!ok.length) return { fail: 'nogap ' + r.id };
        ring.angle = ok[Math.floor(R() * ok.length)];
      } else ring.angle = 0;
      if (r.opt.knob) {
        // 凸钉只能长在实心管子上：避开缺口、杆和夹套；还要伸到空地里，不能一开始就顶着别的环
        const w = ring.gap ? ring.gap.w : 0, len = 20 + Math.round(R() * 6);
        const linkGap = (C.CLAMP_LEN + C.KNOB * 2) / r.r + 4 * DEG;
        const ok = [];
        for (let a = 0; a < 360; a += 3) {
          if (ring.gap && Math.abs(C.angDiff(a * DEG, 0)) <= (w / 2 + 22) * DEG) continue;
          const world = (a + ring.angle) * DEG;
          if (avoid.some((v) => Math.abs(C.angDiff(world, v * DEG)) <= linkGap)) continue;
          let clear = true;
          for (let t = r.r + 8; t <= r.r + len + C.KNOB && clear; t += 4) {
            const px = r.x + Math.cos(world) * t, py = r.y + Math.sin(world) * t;
            for (const q of T.rings) {
              if (q.id === r.id || q.type === 'bar') continue;
              if (Math.abs(Math.hypot(px - q.x, py - q.y) - q.r) < C.TUBE / 2 + C.KNOB + 3) { clear = false; break; }
            }
          }
          if (clear) ok.push(a);
        }
        if (!ok.length && r.opt.knob === 'maybe') { lv.rings.push(ring); continue; } // 程序生成的凸钉放不下就不放
        if (!ok.length) return { fail: 'noknob ' + r.id };
        ring.knobs = [{ at: ok[Math.floor(R() * ok.length)], len }];
      }
      lv.rings.push(ring);
    }
    assignColors(lv, R);
    return lv;
  }

  // 颜色：连在一起或挨得近的零件颜色不同
  function assignColors(lv, R) {
    const near = (a, b) => {
      if (lv.links.some(([o, h]) => (o === a.id && h === b.id) || (o === b.id && h === a.id))) return true;
      return Math.hypot(a.x - b.x, a.y - b.y) < (a.r || 40) + (b.r || 40) + 40;
    };
    lv.rings.forEach((r, i) => {
      const used = new Set(lv.rings.slice(0, i).filter((q) => near(q, r)).map((q) => q.color));
      const free = PALETTE.filter((c) => !used.has(c));
      r.color = (free.length ? free : PALETTE)[Math.floor(R() * (free.length || PALETTE.length))];
    });
  }

  // ---------- 量难度 ----------
  function stats(lv, G) {
    const rings = lv.rings.filter((r) => r.type !== 'bar');
    const owners = {}, heldBy = {};
    for (const [o, h] of lv.links) { (heldBy[h] = heldBy[h] || []).push(o); (owners[o] = owners[o] || []).push(h); }
    // 主环关系必须无环（A 扣 B、B 又扣 A 时谁都转不动）
    const memo = {}, visiting = new Set();
    let cycle = false;
    const chain = (id) => {
      if (memo[id] != null) return memo[id];
      if (visiting.has(id)) { cycle = true; return 0; }
      visiting.add(id);
      const v = 1 + Math.max(0, ...(owners[id] || []).map(chain));
      visiting.delete(id);
      return (memo[id] = v);
    };
    const maxChain = Math.max(...lv.rings.map((r) => chain(r.id)));
    return {
      pieces: lv.rings.length, rings: rings.length, bars: lv.rings.length - rings.length,
      closed: rings.filter((r) => !r.gap).length,
      knobs: rings.reduce((n, r) => n + (r.knobs || []).length, 0),
      links: lv.links.length,
      bridges: Object.values(heldBy).filter((a) => a.length > 1).length,
      nested: G.links.filter((L) => L.mode === 'ownerInside' || L.mode === 'heldInside').length,
      chain: maxChain, cycle,
    };
  }
  // 难度指数：步数是主体，第一步陷阱、要回头再拖的零件、存在死局都算加难（困难关要比同组普通关都高）
  function diffIndex(m) {
    if (m.par == null) return null;
    return round(m.par + 6 * (m.trap || 0) + 2 * (m.revisit || 0) + (m.dead ? 3 : 0), 1);
  }
  // 机制标签：用来检查“每关最多引入 1 个新机制”
  function features(m) {
    const f = [];
    if (m.chain >= 3) f.push('chain');
    if (m.closed) f.push('closed');
    if (m.knobs) f.push('knob');
    if (m.bridges) f.push('bridge');
    if (m.bars) f.push('bar');
    if (m.nested) f.push('nest');
    return f;
  }
  // 结构指纹：零件构成 + 每个零件的连接数，完全一样视为重复
  function signature(lv, m) {
    const deg = {};
    for (const [o, h] of lv.links) { deg[o] = (deg[o] || 0) + 1; deg[h] = (deg[h] || 0) + 1; }
    return [m.pieces, m.closed, m.bars, m.knobs, m.bridges, m.nested, Object.values(deg).sort().join('')].join('|');
  }
  function keyOf(G, s) {
    return s.angles.map((a, i) => (!s.ring[i] ? 'x' : G.rings[i].kind === 'bar' ? 'b' + Math.round(a / 3) : Math.round(a / DEG / 2) % 180)).join(',') + '|' + s.link.map(Number).join('');
  }

  // 第一步有哪些（不同的结果状态算不同的走法；转动不到 2° 或滑动不到 2px 的不算）
  function firstStates(G, s0) {
    const seen = new Map(), out = [];
    for (let i = 0; i < G.rings.length; i++) {
      if (C.blockReason(G, s0, i)) continue;
      for (const d of C.candidateMoves(G, s0, i)) {
        const n = C.cloneState(s0);
        const moved = C.sweep(G, n, i, d, null);
        if (Math.abs(moved) < (G.rings[i].kind === 'bar' ? 2 : 2 * DEG)) continue;
        const key = keyOf(G, n);
        if (seen.has(key)) continue;
        seen.set(key, out.length);
        out.push({ key, s: n });
      }
    }
    return out;
  }

  /*
   * 一次广度优先同时算出：最少步数 par、一条最优解、哪些第一步在某条最优解上。
   * 最优解经过的每个状态都处在它的最短距离上，所以只要把“从哪个第一步来的”沿最短距离传下去，
   * 走到终点时收集到的就是所有好的第一步。预算用完返回 null。
   */
  function optimalBfs(G, s0, maxDepth, maxNodes) {
    const firsts = firstStates(G, s0), bitOf = new Map(firsts.map((f, k) => [f.key, 1n << BigInt(k)]));
    const k0 = keyOf(G, s0), depth = new Map([[k0, 0]]), parent = new Map();
    let frontier = [{ key: k0, s: s0, mask: 0n }], nodes = 0;
    const done = (s) => s.ring.every((x) => !x);
    for (let d = 0; d < maxDepth && frontier.length; d++) {
      const next = new Map();
      let goal = null;
      for (const node of frontier) {
        for (let i = 0; i < G.rings.length; i++) {
          if (C.blockReason(G, node.s, i)) continue;
          for (const dd of C.candidateMoves(G, node.s, i)) {
            const n = C.cloneState(node.s);
            const moved = C.sweep(G, n, i, dd, null);
            if (Math.abs(moved) < 0.5 * DEG) continue;
            const key = keyOf(G, n);
            const mask = d === 0 ? bitOf.get(key) || 0n : node.mask;
            const seenAt = depth.get(key);
            if (seenAt === d + 1) { next.get(key).mask |= mask; continue; }
            if (seenAt != null) continue;
            depth.set(key, d + 1);
            parent.set(key, { from: node.key, ring: i, delta: moved });
            const item = { key, s: n, mask };
            next.set(key, item);
            if (done(n)) goal = item;
            if (++nodes > maxNodes) return null;
          }
        }
      }
      if (goal) {
        const moves = [];
        for (let k = goal.key; k !== k0;) { const p = parent.get(k); moves.unshift({ ring: p.ring, delta: p.delta }); k = p.from; }
        const good = firsts.filter((f) => (goal.mask & bitOf.get(f.key)) !== 0n);
        return { par: d + 1, moves, firsts, good: new Set(good.map((f) => f.key)), nodes };
      }
      frontier = [...next.values()];
    }
    return null;
  }

  // 死局：走完这一步以后彻底解不开（快速求解器把状态走完了也没找到解）
  function isDead(G, s) {
    const f = C.solveFast(G, C.cloneState(s), { maxNodes: 12000 });
    return !f.moves && !f.aborted;
  }

  /*
   * 第一步分析：每一种第一步走完后，还能不能在 par-1 步内解开；解不开的叫“陷阱”，彻底解不开的叫“死局”。
   * ob 是 optimalBfs 的结果（精确）；没有时逐个第一步检查：先用快速求解器，找到不超过 par-1 步的解就算好的，
   * 否则用广度优先确认（预算用完记为 unknown，不计入比例）。
   */
  function firstMoves(G, s0, par, exact, o, ob) {
    const r = { first: 0, bad: 0, dead: 0, unknown: 0 };
    const firsts = ob ? ob.firsts : firstStates(G, s0);
    for (const f of firsts) {
      r.first++;
      const n = f.s;
      if (n.ring.every((a) => !a)) continue;
      // 能解开的第一步不可能是死局，只对走错的那些查死局（死局检查很贵）
      let bad, solvable = false;
      if (ob) bad = !ob.good.has(f.key);
      else {
        const fast = C.solveFast(G, C.cloneState(n), { maxNodes: 3000 });
        if (fast.moves && fast.moves.length <= par - 1) continue;
        solvable = !!fast.moves;
        if (exact) {
          const r2 = C.solve(G, C.cloneState(n), { maxDepth: par - 1, maxNodes: (o && o.trapNodes) || RULES.TRAP_NODES });
          if (r2.moves) continue;
          if (r2.aborted) { r.unknown++; continue; }
          bad = true;
        } else bad = false;
      }
      const dead = (bad || !exact) && !solvable && isDead(G, n);
      if (dead) r.dead++;
      if (bad || (!exact && dead)) r.bad++;
    }
    const known = r.first - r.unknown;
    r.trap = known > 0 ? round(r.bad / known, 2) : 0;
    return r;
  }

  /*
   * measure(level, { n })：一关的全部指标
   *   结构：pieces rings bars closed knobs links bridges nested chain
   *   排版：scale minRingPx tubePx clear（参考屏 390×844，避让第 n 关所在章节的陪玩角色）
   *   难度：par exact（是否精确最少步数） solution revisit（最优解里拖了不止一次的零件数） hint（开局时提示按钮能给出下一步）
   *         first（第一步有几种走法） trap（第一步陷阱比例） dead（走进死局的第一步个数）
   */
  function measure(lv, o) {
    o = o || {};
    const t0 = now(), n = o.n || 1;
    const G = C.build(lv);
    const m = stats(lv, G);
    m.problems = C.validate(G);
    if (m.cycle) m.problems.push('owner cycle');
    const f = LAY.refFit(lv, maskFor(n));
    const rs = lv.rings.filter((r) => r.type !== 'bar').map((r) => r.r);
    m.scale = round(f.scale, 3); m.clear = f.clear;
    m.minRingPx = round(Math.min(...rs) * f.scale, 1); m.tubePx = round(C.TUBE * f.scale, 1);
    if (m.problems.length || o.solve === false) { m.ms = Math.round(now() - t0); return m; }
    const s0 = C.initState(G);
    // 先试一次算完最少步数和第一步分析；预算不够时退回普通的广度优先（找到第一个解就停）
    // （optimalBfs 和 solve 的预算、状态去重完全一样，前者没算出来时后者也算不出来，不用再跑一遍）
    const ob = o.trap !== false ? optimalBfs(G, s0, RULES.BFS.maxDepth, o.nodes || RULES.BFS.maxNodes) : null;
    let res = ob ? { moves: ob.moves } : o.trap !== false ? { moves: null } : C.solve(G, C.cloneState(s0), { maxDepth: RULES.BFS.maxDepth, maxNodes: o.nodes || RULES.BFS.maxNodes });
    m.exact = !!res.moves;
    if (!res.moves) {
      const f2 = C.solveFast(G, C.cloneState(s0), { maxNodes: RULES.FAST.maxNodes });
      if (!f2.moves) { m.par = null; m.unsolvable = !f2.aborted; m.ms = Math.round(now() - t0); return m; }
      res = f2;
    }
    m.par = res.moves.length;
    m.solution = res.moves.map((mv) => lv.rings[mv.ring].id + (G.rings[mv.ring].kind === 'bar' ? (mv.delta > 0 ? '+' : '') + Math.round(mv.delta) + 'px' : (mv.delta > 0 ? '+' : '') + Math.round(mv.delta / DEG) + '°')).join(' ');
    const cnt = {};
    res.moves.forEach((mv) => { cnt[mv.ring] = (cnt[mv.ring] || 0) + 1; });
    m.revisit = Object.values(cnt).filter((c) => c > 1).length;
    m.hint = !!C.hintMove(G, C.cloneState(s0), C.hintBudget(G));
    if (o.trap !== false) Object.assign(m, firstMoves(G, s0, m.par, m.exact, o, ob));
    m.ms = Math.round(now() - t0);
    return m;
  }

  // ---------- 验收 ----------
  /*
   * accept(level, metrics, n, ctx) → 不通过的条目列表（空 = 通过）
   * ctx（跨关卡检查用，可选）：{ prevMaxPieces, prevFeatures: Set, prevSigs: Set, groupD: [前面同组普通关的难度指数] }
   */
  function accept(lv, m, n, ctx) {
    const slot = CURVE[n - 1], hard = isHard(n), fail = [];
    const sz = hard ? RULES.HARD_SIZE : 1;
    // A 合法
    if (m.problems.length) fail.push('A 合法性：' + m.problems.slice(0, 3).join('; '));
    // B 可解
    if (!m.problems.length && m.par == null) fail.push('B 可解：' + (m.unsolvable ? '无解' : '求解器预算内没解出来'));
    if (m.hint === false) fail.push('B 提示：开局时游戏里的提示按钮给不出下一步');
    // C 尺寸
    if (m.minRingPx < RULES.RING_PX_MIN * sz - 1e-9) fail.push(`C 尺寸：最小环半径 ${m.minRingPx}px < ${round(RULES.RING_PX_MIN * sz, 1)}px`);
    if (m.tubePx < RULES.TUBE_PX_MIN * sz - 1e-9) fail.push(`C 尺寸：管子 ${m.tubePx}px < ${round(RULES.TUBE_PX_MIN * sz, 1)}px`);
    // D 不挡角色
    if (!m.clear) fail.push('D 避让：参考屏上躲不开陪玩角色');
    // E 难度
    if (slot) {
      if (m.pieces < slot.pieces[0] || m.pieces > slot.pieces[1]) fail.push(`E 零件数 ${m.pieces} 不在 ${slot.pieces.join('-')}`);
      if (m.par != null && (m.par < slot.par[0] || m.par > slot.par[1])) fail.push(`E 最少步数 ${m.par}${m.exact ? '' : '~'} 不在 ${slot.par.join('-')}`);
      if (m.trap != null && m.trap < slot.trap) fail.push(`E 第一步陷阱 ${m.trap} < ${slot.trap}`);
    }
    if (!!lv.hard !== hard) fail.push('E 困难关标记应为 ' + hard);
    // F 节奏和结构（跨关卡）
    if (ctx) {
      const grow = n <= RULES.EARLY ? RULES.GROWTH_EARLY : RULES.GROWTH;
      if (ctx.prevMaxPieces && m.pieces > ctx.prevMaxPieces + grow) fail.push(`F 零件数 ${m.pieces} 比前面最多的 ${ctx.prevMaxPieces} 多了 ${m.pieces - ctx.prevMaxPieces}（上限 +${grow}）`);
      if (ctx.prevFeatures) {
        const fresh = features(m).filter((x) => !ctx.prevFeatures.has(x)), cap = n < RULES.EARLY ? RULES.NEW_MAX_EARLY : RULES.NEW_MAX;
        if (fresh.length > cap) fail.push('F 一关引入了 ' + fresh.length + ' 个新机制：' + fresh.join(', ') + '（上限 ' + cap + '）');
        if (hard && fresh.length) fail.push('F 困难关不引入新机制（这关新出现了 ' + fresh.join(', ') + '）');
        if (fresh.length && n > 1 && !lv.tip && !ctx.noTipCheck) fail.push('F 引入新机制（' + fresh.join(', ') + '）要配提示 tip');
      }
      if (ctx.prevSigs && ctx.prevSigs.has(signature(lv, m))) fail.push('F 结构和前面某关完全一样');
      if (hard && ctx.groupD && ctx.groupD.length && m.par != null && diffIndex(m) < Math.max(...ctx.groupD)) fail.push(`F 困难关难度指数 ${diffIndex(m)} 低于同组普通关的 ${Math.max(...ctx.groupD)}`);
    }
    return fail;
  }

  // 生成第 n 关：试很多种子，挑通过验收且最贴近目标的那个
  function generate(n, opts) {
    const o = opts || {}, slot = Object.assign({}, CURVE[n - 1], o.slot || {});
    if (!slot.tpl && !slot.grow) throw new Error('第 ' + n + ' 关在 curve.js 里没有 tpl 或 grow');
    const seeds = o.seeds || 60, seed0 = o.seed0 || 1, stats2 = {}, t0 = now();
    const bump = (k) => { stats2[k] = (stats2[k] || 0) + 1; };
    let best = null;
    for (let seed = seed0; seed < seed0 + seeds; seed++) {
      if (o.timeLimit && now() - t0 > o.timeLimit) { bump('timeout'); break; }
      const T = slot.tpl ? TEMPLATES[slot.tpl](rng(seed * 7919 + n * 104729)) : grow(slot, rng(seed * 7919 + n * 104729), n);
      if (!T) { bump('nolayout'); continue; }
      const lv = instantiate(T, seed);
      if (lv.fail) { bump(lv.fail.split(' ')[0]); continue; }
      if (isHard(n)) lv.hard = true;
      if (slot.new) lv.tip = slot.new; // 引入新机制的关卡带一句提示（中文；其他语言在 src/i18n.js 里补）
      // 先做便宜的检查，过了再求解
      const quick = measure(lv, { n, solve: false });
      if (quick.problems.length) { bump('invalid'); continue; }
      const pre = accept(lv, Object.assign({}, quick, { par: null, trap: null, problems: [] }), n).filter((x) => !/^B /.test(x));
      if (pre.length) { bump(pre[0].slice(0, 6)); continue; }
      // 游戏里的提示在开局就要能用；这一步也最快筛掉解不开的候选
      const G0 = C.build(lv);
      if (!C.hintMove(G0, C.initState(G0), C.hintBudget(G0))) { bump('nohint'); continue; }
      const m0 = measure(lv, { n, trap: false });
      if (m0.par == null) { bump('unsolved'); continue; }
      if (m0.par < slot.par[0] || m0.par > slot.par[1]) { bump('par' + m0.par); continue; }
      const m = measure(lv, { n });
      const fails = accept(lv, m, n, o.ctx);
      if (fails.length) { bump(fails[0].slice(0, 6)); continue; }
      bump('ok');
      m.D = diffIndex(m);
      const mid = (slot.par[0] + slot.par[1]) / 2;
      // 越贴近目标步数越好；陷阱多、要回头再拖的零件多、环越大越好；精确最少步数优先
      const score = Math.abs(m.par - mid) / (slot.par[1] - slot.par[0] + 1) - Math.min(m.trap, 0.8) - 0.1 * m.revisit - 0.15 * m.dead / Math.max(1, m.first) - 0.01 * m.minRingPx + (m.exact ? 0 : 0.5);
      if (!best || score < best.score) best = { seed, score, level: lv, metrics: m, template: T.lattice || slot.tpl };
      if (o.first) break;
    }
    return { n, best, stats: stats2, ms: Math.round(now() - t0) };
  }

  // 验收一整套关卡（默认 src/levels.js 的 RRLevels）
  function checkAll(levels, o) {
    o = o || {};
    const rows = [];
    let maxPieces = 0;
    const feats = new Set(), sigs = new Set();
    levels.forEach((lv, i) => {
      const n = i + 1;
      if ((o.from && n < o.from) || (o.to && n > o.to)) {
        const m = stats(lv, C.build(lv)); maxPieces = Math.max(maxPieces, m.pieces); features(m).forEach((x) => feats.add(x)); sigs.add(signature(lv, m));
        return;
      }
      const m = (o.cached && o.cached(i, lv)) || measure(lv, { n, trap: o.trap !== false });
      const groupStart = Math.floor(i / CH.SET) * CH.SET;
      const groupD = rows.filter((r) => r.n > groupStart && r.n < n && r.m.par != null).map((r) => diffIndex(r.m));
      const fails = accept(lv, m, n, { prevMaxPieces: maxPieces, prevFeatures: n > 1 ? feats : null, prevSigs: sigs, groupD });
      m.D = diffIndex(m);
      rows.push({ n, name: lv.en, m, fails });
      maxPieces = Math.max(maxPieces, m.pieces);
      features(m).forEach((x) => feats.add(x));
      sigs.add(signature(lv, m));
    });
    return rows;
  }

  // ---------- 写回 src/levels.js 的格式 ----------
  const COLOR_NAME = { '#ff3df2': 'PINK', '#28e7ff': 'CYAN', '#ffad42': 'ORANGE', '#b6ff4a': 'LIME', '#a47bff': 'VIOLET', '#ffe45c': 'YELLOW', '#ff4d6d': 'RED', '#4d8bff': 'BLUE', '#3dffb0': 'MINT' };
  function fmtPiece(r) {
    const c = COLOR_NAME[r.color] || JSON.stringify(r.color);
    if (r.type === 'bar') return `{ id: '${r.id}', type: 'bar', x: ${r.x}, y: ${r.y}, dir: ${r.dir}, len: ${r.len}, color: ${c} }`;
    let s = `{ id: '${r.id}', x: ${r.x}, y: ${r.y}, r: ${r.r}, color: ${c}`;
    if (r.gap) s += `, gap: { at: ${r.gap.at}, w: ${r.gap.w} }`;
    s += `, angle: ${r.angle || 0}`;
    if (r.knobs && r.knobs.length) s += ', knobs: [' + r.knobs.map((k) => `{ at: ${k.at}, len: ${k.len} }`).join(', ') + ']';
    return s + ' }';
  }
  function formatLevels(levels) {
    const head = `/*
 * 关卡数据（原创布局）。由 tools/levelgen 生成并通过验收（docs/level-rules.md），
 * 用 node tools/levelgen/cli.js apply 写回这里；手改后要重新跑 node tools/levelgen/cli.js check。
 * 坐标为逻辑像素，原点在棋盘中心，y 轴向下；角度单位为度，0° 指向右，顺时针为正。
 * gap: 缺口（相对环自身的朝向和宽度），没有 gap 的是闭合环。angle: 初始转角。
 * knobs: 环身上凸出的短杆，转动时会撞到别的东西。type: 'bar' 是直杆（dir 方向、len 长度）。
 * links: [主环, 被扣环]，主环伸出杆子，夹套套在被扣环的管子上。
 */
(function (root) {
  'use strict';
  const PINK = '#ff3df2', CYAN = '#28e7ff', ORANGE = '#ffad42', LIME = '#b6ff4a', VIOLET = '#a47bff',
    YELLOW = '#ffe45c', RED = '#ff4d6d', BLUE = '#4d8bff', MINT = '#3dffb0';

  root.RRLevels = [
`;
    const body = levels.map((lv) => {
      const meta = [`name: ${JSON.stringify(lv.name || '')}`, `en: ${JSON.stringify(lv.en || '')}`, `tip: ${JSON.stringify(lv.tip || '')}`];
      if (lv.hard) meta.push('hard: true');
      return `    {
      ${meta.join(', ')},
      rings: [
${lv.rings.map((r) => '        ' + fmtPiece(r) + ',').join('\n')}
      ],
      links: [${lv.links.map(([a, b]) => `['${a}', '${b}']`).join(', ')}],
    },`;
    }).join('\n');
    return head + body + `
  ];
})(typeof window !== 'undefined' ? window : globalThis);
`;
  }

  return { RULES, CURVE, TEMPLATES, rng, tree, grow, instantiate, measure, accept, generate, checkAll, features, signature, diffIndex, formatLevels, maskFor, isHard };
});

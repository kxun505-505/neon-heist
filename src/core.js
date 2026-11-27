/*
 * 核心规则（与渲染无关，浏览器和验证脚本共用）
 *
 * 对标原作的机制：
 * - 环是带缺口的 C 形管，或没有缺口的闭合环。环之间不重叠。
 * - 连接 = 扣件：主环伸出一根短杆，杆端的夹套套在被扣环的管子上。
 * - 被扣环转动时，管子在夹套里滑动；缺口转到夹套处，这个夹套就“松开”。
 *   松开不是永久的：继续转、缺口离开夹套，就又扣回去了（对照原作：转出去的环可以再转回来）。
 * - 一个零件身上所有还在的连接同时松开时，它就飞走；飞走后它的连接都消失，可能引发连锁。
 * - 被扣的零件飞走后，主环上留下杆和空夹套，成为跟着主环转的凸起，会撞到别的东西（对照原作视频确认）。
 * - 主环还扣着别的环时转不动（杆被夹套固定住）。
 * - 杆必须长在主环的实心管子上，不能落在主环的缺口里。
 * - 环身上可能有凸起的短杆（凸钉），转动时凸钉会撞到别的环、杆、夹套，撞上就停。
 * - 一个环身上没有任何连接时自动飞走。全部飞走即过关。
 * - 直杆（对照原作第 6-10 关）：只能沿自身方向滑动；主环伸出的杆端是银色套筒，套在直杆上。
 *   直杆滑到端头离开套筒，这条连接就断开。直杆会挡住环的转动，环和别的零件也会挡住直杆。
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const TUBE = 12;        // 管子粗细
  const STEM = 7;         // 杆粗细
  const CLAMP_LEN = 18;   // 夹套沿管子方向的长度
  const KNOB = 7;         // 凸钉末端方块的半径
  const STEP = 1 * DEG;   // 转动时碰撞检测的步长
  const BAR = 10;         // 直杆粗细
  const SLIDE = 1.5;      // 直杆滑动时碰撞检测的步长（像素）

  const norm = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
  const angDiff = (a, b) => { let d = norm(a - b); return d > Math.PI ? d - TAU : d; };

  function build(level) {
    const idx = {};
    level.rings.forEach((r, i) => { idx[r.id] = i; });
    const rings = level.rings.map((r, i) => (r.type === 'bar' ? {
      id: r.id, i, kind: 'bar', x: r.x, y: r.y, r: 0, color: r.color, gap: null, knobs: [],
      ux: Math.cos(r.dir * DEG), uy: Math.sin(r.dir * DEG), len: r.len, half: r.len / 2,
    } : {
      id: r.id, i, kind: 'ring', x: r.x, y: r.y, r: r.r, color: r.color,
      gap: r.gap ? { at: r.gap.at * DEG, w: r.gap.w * DEG } : null,
      knobs: (r.knobs || []).map((k) => ({ at: k.at * DEG, len: k.len })),
    }));
    rings.forEach((R) => {
      if (!R.gap) return;
      // 圆头管的可见开口比名义缺口小一个管子粗细
      R.openHalf = R.gap.w / 2 - (TUBE / 2) / R.r;
      R.releaseHalf = R.openHalf - (CLAMP_LEN / 2) / R.r;
    });
    const links = (level.links || []).map(([o, h], k) => {
      const O = rings[idx[o]], H = rings[idx[h]];
      if (H.kind === 'bar') {
        // 套筒在直杆轴线上离主环圆心最近的点，杆垂直于直杆
        const t0 = (O.x - H.x) * H.ux + (O.y - H.y) * H.uy;
        const px = H.x + H.ux * t0, py = H.y + H.uy * t0;
        const dd = Math.hypot(px - O.x, py - O.y), nx = (px - O.x) / dd, ny = (py - O.y) / dd;
        const rootDir = Math.atan2(ny, nx);
        return {
          k, owner: O.i, held: H.i, mode: 'bar', clampT0: t0,
          clampAng: Math.atan2(-ny, -nx), cx: px, cy: py,
          sx: O.x + nx * (O.r + TUBE / 2), sy: O.y + ny * (O.r + TUBE / 2),
          stemLen: dd - O.r,
          stubAt: rootDir - norm((level.rings[O.i].angle || 0) * DEG), stubIn: false, stubLen: dd - O.r,
        };
      }
      const dx = H.x - O.x, dy = H.y - O.y, d = Math.hypot(dx, dy);
      const ux = dx / d, uy = dy / d;
      // 三种摆法：主环在外面（最常见）、主环套在大环里面、被扣环套在主环里面
      let mode = 'out', ex = ux, ey = uy, rootR = O.r + TUBE / 2, clampSign = -1, stemLen = d - O.r - H.r;
      if (d + O.r < H.r) { mode = 'ownerInside'; ex = -ux; ey = -uy; stemLen = H.r - d - O.r; }
      else if (d + H.r < O.r) { mode = 'heldInside'; rootR = O.r - TUBE / 2; clampSign = 1; stemLen = O.r - d - H.r; }
      // 夹套在被扣环管子上离主环最近的点
      const cx = H.x + clampSign * ux * H.r * (mode === 'heldInside' ? 1 : 1), cy = H.y + clampSign * uy * H.r;
      const rootDir = mode === 'heldInside' ? Math.atan2(uy, ux) : Math.atan2(ey, ex);
      return {
        k, owner: O.i, held: H.i, mode,
        clampAng: Math.atan2(cy - H.y, cx - H.x),
        cx, cy,
        sx: O.x + Math.cos(rootDir) * rootR, sy: O.y + Math.sin(rootDir) * rootR,
        stemLen,
        // 滑脱后留下的凸起：相对主环自身的朝向（主环扣着东西时从没转过，所以用初始角度换算）
        stubAt: rootDir - norm((level.rings[O.i].angle || 0) * DEG),
        stubIn: mode === 'heldInside', // 杆朝圆心方向长
        stubLen: stemLen,
      };
    });
    return {
      level, rings, links,
      angles0: level.rings.map((r) => (r.type === 'bar' ? 0 : norm((r.angle || 0) * DEG))),
      ringAlive0: level.rings.map(() => true),
      linkAlive0: links.map(() => true),
    };
  }

  const initState = (G) => ({ angles: G.angles0.slice(), ring: G.ringAlive0.slice(), link: G.linkAlive0.slice() });
  const cloneState = (s) => ({ angles: s.angles.slice(), ring: s.ring.slice(), link: s.link.slice() });

  function ownsLive(G, s, i) { return G.links.some((L) => s.link[L.k] && L.owner === i); }
  function linkCount(G, s, i) { return G.links.reduce((n, L) => n + (s.link[L.k] && (L.owner === i || L.held === i) ? 1 : 0), 0); }

  // 不能转的原因：null 表示可以转
  function blockReason(G, s, i) {
    if (!s.ring[i]) return 'gone';
    if (ownsLive(G, s, i)) return 'owner';
    const R = G.rings[i];
    if (R.kind !== 'bar' && !R.gap && !R.knobs.length && !G.links.some((L) => L.owner === i)) return 'closed';
    return null;
  }

  // 凸起的采样圆（世界坐标）：关卡自带的凸钉 + 滑脱后留下的空夹套杆
  function knobCircles(G, s, i, ang) {
    const R = G.rings[i], out = [];
    for (const L of G.links) {
      if (L.owner !== i || s.link[L.k] || s.ring[L.held]) continue;
      const a = L.stubAt + ang, c = Math.cos(a), sn = Math.sin(a), sg = L.stubIn ? -1 : 1;
      for (let t = TUBE / 2 + STEM / 2; t < L.stubLen - 6; t += 4) out.push({ x: R.x + c * (R.r + sg * t), y: R.y + sn * (R.r + sg * t), rad: STEM / 2 });
      const e = R.r + sg * L.stubLen; // 空夹套中心，原来套在被扣环的管子上
      out.push({ x: R.x + c * e, y: R.y + sn * e, rad: CLAMP_LEN / 2 });
    }
    for (const k of R.knobs) {
      const a = k.at + ang, c = Math.cos(a), sn = Math.sin(a);
      for (let t = R.r + TUBE / 2 + STEM / 2; t < R.r + k.len - KNOB; t += 4) out.push({ x: R.x + c * t, y: R.y + sn * t, rad: STEM / 2 });
      out.push({ x: R.x + c * (R.r + k.len), y: R.y + sn * (R.r + k.len), rad: KNOB });
    }
    return out;
  }

  // 直杆在滑动量 sv 时的采样圆
  function barCircles(R, sv) {
    const out = [];
    for (let t = -R.half; t <= R.half + 0.01; t += 4) out.push({ x: R.x + R.ux * (sv + t), y: R.y + R.uy * (sv + t), rad: BAR / 2 });
    return out;
  }
  function hitsBar(R, sv, p) {
    const dx = p.x - R.x, dy = p.y - R.y;
    const t = Math.max(-R.half, Math.min(R.half, dx * R.ux + dy * R.uy - sv));
    return Math.hypot(dx - R.ux * (sv + t), dy - R.uy * (sv + t)) < BAR / 2 + p.rad;
  }
  const hitsPiece = (Q, v, p) => (Q.kind === 'bar' ? hitsBar(Q, v, p) : hitsTube(Q, v, p));

  function linkCircles(L) {
    const out = [];
    const dx = L.cx - L.sx, dy = L.cy - L.sy, len = Math.hypot(dx, dy);
    for (let t = 0; t < len - 6; t += 4) out.push({ x: L.sx + (dx * t) / len, y: L.sy + (dy * t) / len, rad: STEM / 2 });
    return out;
  }
  const clampCircle = (L) => ({ x: L.cx, y: L.cy, rad: TUBE / 2 + 3 });

  function hitsTube(R, ang, p) {
    const dx = p.x - R.x, dy = p.y - R.y, d = Math.hypot(dx, dy);
    if (Math.abs(d - R.r) >= TUBE / 2 + p.rad) return false;
    if (R.gap) {
      const ad = Math.abs(angDiff(Math.atan2(dy, dx), R.gap.at + ang));
      if (ad < R.openHalf - p.rad / R.r) return false;
    }
    return true;
  }
  const hitsCircle = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < a.rad + b.rad;

  // 环 i 在角度 ang 时是否与其他物体相撞；撞上时返回接触点
  function collision(G, s, i, ang) {
    const R = G.rings[i];
    const mine = R.kind === 'bar' ? barCircles(R, ang) : knobCircles(G, s, i, ang);
    const obstacles = [];
    for (let j = 0; j < G.rings.length; j++) {
      if (j === i || !s.ring[j]) continue;
      const Q = G.rings[j];
      for (const p of mine) if (hitsPiece(Q, s.angles[j], p)) return p;
      if (Q.kind !== 'bar') for (const q of knobCircles(G, s, j, s.angles[j])) obstacles.push(q);
      else if (R.kind !== 'bar') for (const q of barCircles(Q, s.angles[j])) obstacles.push(q);
    }
    for (const L of G.links) {
      if (!s.link[L.k]) continue;
      // 自己身上的夹套和杆不算：被扣环的管子在夹套里滑动；主环有连接时本来就转不动
      if (L.held === i || L.owner === i) continue;
      for (const q of linkCircles(L)) obstacles.push(q);
      obstacles.push(clampCircle(L));
    }
    for (const q of obstacles) {
      for (const p of mine) if (hitsCircle(p, q)) return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      if (R.kind !== 'bar' && hitsTube(R, ang, q)) return q;
    }
    return null;
  }

  // 这条连接现在是否松开（夹套落在缺口里 / 套筒已经离开直杆）
  function isOpen(G, s, L) {
    const H = G.rings[L.held];
    if (H.kind === 'bar') return Math.abs(L.clampT0 - s.angles[L.held]) > H.half + CLAMP_LEN / 2 - 3;
    if (!H.gap) return false;
    return Math.abs(angDiff(L.clampAng, H.gap.at + s.angles[L.held])) <= H.releaseHalf;
  }

  // （旧接口，保留给验证脚本）环 i 当前松开的连接
  function releases(G, s, i) {
    const R = G.rings[i], out = [];
    if (R.kind === 'bar') {
      for (const L of G.links) {
        if (!s.link[L.k] || L.held !== i) continue;
        if (Math.abs(L.clampT0 - s.angles[i]) > R.half + CLAMP_LEN / 2 - 3) out.push(L.k);
      }
      return out;
    }
    if (!R.gap) return out;
    for (const L of G.links) {
      if (!s.link[L.k] || L.held !== i) continue;
      if (Math.abs(angDiff(L.clampAng, R.gap.at + s.angles[i])) <= R.releaseHalf) out.push(L.k);
    }
    return out;
  }

  // 身上所有还在的连接都松开的零件飞走（没有连接的也飞走）
  function flyers(G, s) {
    const out = [];
    for (let i = 0; i < G.rings.length; i++) {
      if (!s.ring[i]) continue;
      let free = true;
      for (const L of G.links) {
        if (!s.link[L.k] || (L.owner !== i && L.held !== i)) continue;
        if (!isOpen(G, s, L)) { free = false; break; }
      }
      if (free) out.push(i);
    }
    return out;
  }
  // 连锁飞走：飞走的零件带走它的连接，可能让别的零件也全部松开
  function cascade(G, s, events) {
    let flown = 0;
    for (;;) {
      const f = flyers(G, s);
      if (!f.length) return flown;
      flown += f.length;
      for (const i of f) {
        s.ring[i] = false;
        for (const L of G.links) if (s.link[L.k] && (L.owner === i || L.held === i)) s.link[L.k] = false;
        if (events) events.push({ type: 'fly', i });
      }
    }
  }

  /*
   * 一次转动过程中别的零件都不动，所以能碰到的东西可以预先算好、筛掉够不着的（只有发生飞走时才重算）。
   * 结果和 collision() 完全一样：保留的顺序不变，筛掉的都是几何上不可能碰到的。
   */
  function sweepCtx(G, s, i) {
    const R = G.rings[i], obstacles = [], pieces = [];
    for (let j = 0; j < G.rings.length; j++) {
      if (j === i || !s.ring[j]) continue;
      const Q = G.rings[j];
      pieces.push(j);
      if (Q.kind !== 'bar') for (const q of knobCircles(G, s, j, s.angles[j])) obstacles.push(q);
      else if (R.kind !== 'bar') for (const q of barCircles(Q, s.angles[j])) obstacles.push(q);
    }
    for (const L of G.links) {
      if (!s.link[L.k] || L.held === i || L.owner === i) continue;
      for (const q of linkCircles(L)) obstacles.push(q);
      obstacles.push(clampCircle(L));
    }
    if (R.kind === 'bar') return { pieces, obs: obstacles, mine: true };
    // 环转动时，自己的凸起离圆心的距离不变：只有落在这个距离范围里的东西才可能碰到
    const mine0 = knobCircles(G, s, i, 0);
    let lo = Infinity, hi = -Infinity;
    for (const p of mine0) { const d = Math.hypot(p.x - R.x, p.y - R.y); lo = Math.min(lo, d - p.rad); hi = Math.max(hi, d + p.rad); }
    const band = (q, a, b) => { const d = Math.hypot(q.x - R.x, q.y - R.y); return d + q.rad > a - 6 && d - q.rad < b + 6; };
    const obs = obstacles.filter((q) => band(q, R.r - TUBE / 2, R.r + TUBE / 2) || (mine0.length && band(q, lo, hi)));
    const near = mine0.length ? pieces.filter((j) => {
      const Q = G.rings[j];
      if (Q.kind === 'bar') {
        // 直杆上的点到我圆心的距离范围
        let mn = Infinity, mx = -Infinity;
        for (const q of barCircles(Q, s.angles[j])) { const d = Math.hypot(q.x - R.x, q.y - R.y); mn = Math.min(mn, d - q.rad); mx = Math.max(mx, d + q.rad); }
        return mn < hi + 6 && mx > lo - 6;
      }
      const d = Math.hypot(Q.x - R.x, Q.y - R.y);
      return Math.abs(d - Q.r) - TUBE / 2 < hi + 6 && d + Q.r + TUBE / 2 > lo - 6;
    }) : [];
    return { pieces: near, obs, mine: mine0.length > 0 };
  }
  function collisionCtx(G, s, i, ang, ctx) {
    const R = G.rings[i];
    const mine = R.kind === 'bar' ? barCircles(R, ang) : ctx.mine ? knobCircles(G, s, i, ang) : [];
    for (const j of ctx.pieces) {
      const Q = G.rings[j];
      for (const p of mine) if (hitsPiece(Q, s.angles[j], p)) return p;
    }
    for (const q of ctx.obs) {
      for (const p of mine) if (hitsCircle(p, q)) return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
      if (R.kind !== 'bar' && hitsTube(R, ang, q)) return q;
    }
    return null;
  }

  /*
   * 把环 i 往 delta 方向转，逐步检测碰撞和滑脱（会原地修改 s）。
   * events 记录过程中发生的事：{type:'release', k} / {type:'fly', i} / {type:'hit', p}
   * 只有环 i 扣着的连接会变，所以只在其中某条刚松开时才检查飞走（结果和每一步都检查一样）。
   */
  function sweep(G, s, i, delta, events) {
    const dir = Math.sign(delta), bar = G.rings[i].kind === 'bar';
    let left = Math.abs(delta), moved = 0;
    const mineL = G.links.filter((L) => L.held === i);
    let open = mineL.map((L) => s.link[L.k] && isOpen(G, s, L));
    let ctx = sweepCtx(G, s, i);
    while (left > 1e-9) {
      if (!s.ring[i]) break;
      const st = Math.min(bar ? SLIDE : STEP, left);
      const next = bar ? s.angles[i] + dir * st : norm(s.angles[i] + dir * st);
      const hit = collisionCtx(G, s, i, next, ctx);
      if (hit) { if (events) events.push({ type: 'hit', p: hit, ring: i }); break; }
      s.angles[i] = next;
      moved += dir * st;
      left -= st;
      let opened = false;
      for (let k = 0; k < mineL.length; k++) {
        const L = mineL[k];
        if (!s.link[L.k]) { open[k] = false; continue; }
        const o = isOpen(G, s, L);
        if (o && !open[k]) { opened = true; if (events) events.push({ type: 'open', k: L.k }); }
        else if (!o && open[k] && events) events.push({ type: 'close', k: L.k });
        open[k] = o;
      }
      if (opened && cascade(G, s, events)) {
        ctx = sweepCtx(G, s, i);
        open = mineL.map((L) => s.link[L.k] && isOpen(G, s, L));
      }
    }
    return moved;
  }

  function candidateMoves(G, s, i) {
    const R = G.rings[i], out = [];
    if (R.kind === 'bar') {
      for (const L of G.links) {
        if (!s.link[L.k] || L.held !== i) continue;
        const need = R.half + CLAMP_LEN / 2 - 2;
        out.push(L.clampT0 - need - s.angles[i], L.clampT0 + need - s.angles[i]);
      }
      return out;
    }
    if (R.gap) {
      const mine = G.links.filter((L) => s.link[L.k] && L.held === i);
      const aim = (target) => { const d = angDiff(target, R.gap.at + s.angles[i]); out.push(d, d > 0 ? d - TAU : d + TAU); };
      for (const L of mine) aim(L.clampAng);
      for (let a = 0; a < mine.length; a++) for (let b = a + 1; b < mine.length; b++) {
        const dd = angDiff(mine[b].clampAng, mine[a].clampAng);
        if (Math.abs(dd) < 2 * R.releaseHalf) aim(mine[a].clampAng + dd / 2);
      }
    }
    if (R.knobs.length || G.links.some((L) => L.owner === i)) out.push(TAU - 1e-6, -TAU + 1e-6); // 转到底，用来挪开凸起
    return out;
  }

  const stateKey = (s, G) => s.angles.map((a, i) => (!s.ring[i] ? 'x' : G && G.rings[i].kind === 'bar' ? 'b' + Math.round(a / 3) : Math.round(a / DEG / 2) % 180)).join(',') + '|' + s.link.map(Number).join('');

  // 广度优先求最少拖动次数
  function solve(G, start, opts) {
    const maxDepth = (opts && opts.maxDepth) || 16, maxNodes = (opts && opts.maxNodes) || 200000;
    if (start.ring.every((a) => !a)) return { moves: [], nodes: 0 };
    const seen = new Set([stateKey(start, G)]);
    let frontier = [{ s: start, path: [] }], nodes = 0;
    for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
      const next = [];
      for (const { s, path } of frontier) {
        for (let i = 0; i < G.rings.length; i++) {
          if (blockReason(G, s, i)) continue;
          for (const d of candidateMoves(G, s, i)) {
            const n = cloneState(s);
            const moved = sweep(G, n, i, d, null);
            if (Math.abs(moved) < 0.5 * DEG) continue;
            const p = path.concat([{ ring: i, delta: moved }]);
            if (n.ring.every((a) => !a)) return { moves: p, nodes };
            const key = stateKey(n, G);
            if (seen.has(key)) continue;
            seen.add(key);
            if (++nodes > maxNodes) return { moves: null, nodes, aborted: true };
            next.push({ s: n, path: p });
          }
        }
      }
      frontier = next;
    }
    return { moves: null, nodes };
  }

  /*
   * 快速求解（不保证最少步数）：深度优先，优先尝试能断开更多连接的走法，记住走过的状态。
   * 大关卡上广度优先太慢，提示和关卡生成在这里兜底。
   */
  function solveFast(G, start, opts) {
    const maxNodes = (opts && opts.maxNodes) || 20000;
    const seen = new Set();
    let nodes = 0;
    // 进度分：飞走的零件最重要，其次是已经松开的夹套（新规则下松开不会立刻减少连接数）
    const live = (s) => {
      let n = 0;
      for (let i = 0; i < s.ring.length; i++) if (s.ring[i]) n += 10;
      for (const L of G.links) if (s.link[L.k]) n += isOpen(G, s, L) ? 0 : 1;
      return n;
    };
    function dfs(s, path) {
      if (s.ring.every((a) => !a)) return path;
      if (++nodes > maxNodes) return null;
      const key = stateKey(s, G);
      if (seen.has(key)) return null;
      seen.add(key);
      const before = live(s), opts2 = [];
      for (let i = 0; i < G.rings.length; i++) {
        if (blockReason(G, s, i)) continue;
        for (const d of candidateMoves(G, s, i)) {
          const n = cloneState(s);
          const moved = sweep(G, n, i, d, null);
          if (Math.abs(moved) < 0.5 * DEG) continue;
          opts2.push({ n, gain: before - live(n), m: { ring: i, delta: moved }, cost: Math.abs(moved) });
        }
      }
      opts2.sort((a, b) => b.gain - a.gain || a.cost - b.cost);
      for (const o of opts2) {
        const r = dfs(o.n, path.concat([o.m]));
        if (r) return r;
      }
      return null;
    }
    const moves = dfs(start, []);
    return { moves, nodes, aborted: !moves && nodes > maxNodes };
  }

  // 游戏里提示按钮的求解预算（关卡验收也用它检查开局时提示能用）
  const hintBudget = (G) => (G.rings.length > 9 ? 8000 : 40000);
  // 提示用：先试最少步数，状态太多时退回快速求解
  function hintMove(G, s, budget) {
    const r = solve(G, cloneState(s), { maxDepth: 30, maxNodes: budget || 12000 });
    if (r.moves && r.moves.length) return r.moves[0];
    const f = solveFast(G, cloneState(s), { maxNodes: 30000 });
    return f.moves && f.moves.length ? f.moves[0] : null;
  }

  // 关卡合法性：初始无碰撞、无可直接飞走的环、无已滑脱的夹套
  function validate(G) {
    const s = initState(G), problems = [];
    G.links.forEach((L) => {
      if (L.stemLen < 8) problems.push('link ' + L.k + ' stem too short ' + L.stemLen.toFixed(1));
      // 杆的根部必须在主环实心的地方
      const O = G.rings[L.owner];
      if (O.gap && Math.abs(angDiff(L.stubAt, O.gap.at)) < O.openHalf + (STEM / 2 + 4) / O.r) problems.push('link ' + L.k + ' stem in owner gap');
      if (L.mode === 'bar') {
        const B = G.rings[L.held];
        if (Math.abs(L.clampT0) > B.half - CLAMP_LEN / 2 - 6) problems.push('link ' + L.k + ' sleeve off bar');
        return;
      }
      if (G.rings[L.owner].kind === 'bar') { problems.push('link ' + L.k + ' bar cannot own'); return; }
      // 夹套不能一开始就落在被扣环的缺口里
      const Hr = G.rings[L.held];
      if (Hr.gap && Math.abs(angDiff(L.clampAng, Hr.gap.at + s.angles[L.held])) < Hr.openHalf + 4 / Hr.r) problems.push('link ' + L.k + ' clamp in held gap');
    });
    // 凸钉必须长在实心管子上，不能悬空在缺口里，也不能和杆、夹套挤在一起
    G.rings.forEach((R) => {
      for (const k of R.knobs) {
        if (R.gap && Math.abs(angDiff(k.at, R.gap.at)) < R.openHalf + (KNOB + 4) / R.r) problems.push('ring ' + R.id + ' knob in gap');
        for (const L of G.links) {
          const dir = L.owner === R.i ? L.stubAt : L.held === R.i ? L.clampAng - s.angles[R.i] : null;
          if (dir != null && Math.abs(angDiff(k.at, dir)) < (CLAMP_LEN + KNOB * 2) / R.r) problems.push('ring ' + R.id + ' knob touches link');
        }
      }
    });
    if (flyers(G, s).length) problems.push('something flies at start');
    for (let i = 0; i < G.rings.length; i++) {
      if (collision(G, s, i, s.angles[i])) problems.push('ring ' + G.rings[i].id + ' collides at start');
      if (G.links.some((L) => s.link[L.k] && L.held === i && isOpen(G, s, L))) problems.push('ring ' + G.rings[i].id + ' already released');
      if (linkCount(G, s, i) === 0) problems.push('ring ' + G.rings[i].id + ' has no link');
      for (let j = i + 1; j < G.rings.length; j++) {
        const A = G.rings[i], B = G.rings[j];
        if (A.kind === 'bar' || B.kind === 'bar') continue; // 直杆靠碰撞检测
        const dd = Math.hypot(A.x - B.x, A.y - B.y), small = Math.min(A.r, B.r), big = Math.max(A.r, B.r);
        const nested = dd + small + TUBE + 6 < big;
        if (!nested && dd < A.r + B.r + TUBE) problems.push('rings ' + A.id + B.id + ' overlap');
      }
    }
    return problems;
  }

  root.RRCore = {
    TAU, DEG, TUBE, STEM, CLAMP_LEN, KNOB, BAR, barCircles, norm, angDiff, build, initState, cloneState,
    ownsLive, linkCount, blockReason, isOpen, cascade, knobCircles, collision, releases, flyers, sweep, candidateMoves, solve, solveFast, hintMove, hintBudget, validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);

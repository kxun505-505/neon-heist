/*
 * 核心规则（与渲染无关，浏览器和验证脚本共用）
 *
 * 对标原作的机制：
 * - 环是带缺口的 C 形管，或没有缺口的闭合环。环之间不重叠。
 * - 连接 = 扣件：主环伸出一根短杆，杆端的夹套套在被扣环的管子上。
 * - 被扣环转动时，管子在夹套里滑动；缺口转到夹套处，夹套就滑脱，这条连接永久断开。
 * - 主环还扣着别的环时转不动（杆被夹套固定住）。
 * - 环身上可能有凸起的短杆（凸钉），转动时凸钉会撞到别的环、杆、夹套，撞上就停。
 * - 一个环身上没有任何连接时自动飞走。全部飞走即过关。
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

  const norm = (a) => { a %= TAU; return a < 0 ? a + TAU : a; };
  const angDiff = (a, b) => { let d = norm(a - b); return d > Math.PI ? d - TAU : d; };

  function build(level) {
    const idx = {};
    level.rings.forEach((r, i) => { idx[r.id] = i; });
    const rings = level.rings.map((r, i) => ({
      id: r.id, i, x: r.x, y: r.y, r: r.r, color: r.color,
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
      const dx = H.x - O.x, dy = H.y - O.y, d = Math.hypot(dx, dy);
      const ux = dx / d, uy = dy / d;
      return {
        k, owner: O.i, held: H.i,
        // 夹套位于被扣环管子上、正对主环圆心的点
        clampAng: Math.atan2(-uy, -ux),
        cx: H.x - ux * H.r, cy: H.y - uy * H.r,
        sx: O.x + ux * (O.r + TUBE / 2), sy: O.y + uy * (O.r + TUBE / 2),
        stemLen: d - O.r - H.r,
      };
    });
    return {
      level, rings, links,
      angles0: level.rings.map((r) => norm((r.angle || 0) * DEG)),
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
    if (!R.gap && !R.knobs.length) return 'closed';
    return null;
  }

  // 凸钉的采样圆（世界坐标）
  function knobCircles(R, ang) {
    const out = [];
    for (const k of R.knobs) {
      const a = k.at + ang, c = Math.cos(a), sn = Math.sin(a);
      for (let t = R.r + TUBE / 2 + STEM / 2; t < R.r + k.len - KNOB; t += 4) out.push({ x: R.x + c * t, y: R.y + sn * t, rad: STEM / 2 });
      out.push({ x: R.x + c * (R.r + k.len), y: R.y + sn * (R.r + k.len), rad: KNOB });
    }
    return out;
  }

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
    const mine = knobCircles(R, ang);
    const obstacles = [];
    for (let j = 0; j < G.rings.length; j++) {
      if (j === i || !s.ring[j]) continue;
      const Q = G.rings[j];
      for (const p of mine) if (hitsTube(Q, s.angles[j], p)) return p;
      for (const q of knobCircles(Q, s.angles[j])) obstacles.push(q);
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
      if (hitsTube(R, ang, q)) return q;
    }
    return null;
  }

  // 检查环 i 当前角度下哪些夹套滑脱，返回断开的连接
  function releases(G, s, i) {
    const R = G.rings[i], out = [];
    if (!R.gap) return out;
    for (const L of G.links) {
      if (!s.link[L.k] || L.held !== i) continue;
      if (Math.abs(angDiff(L.clampAng, R.gap.at + s.angles[i])) <= R.releaseHalf) out.push(L.k);
    }
    return out;
  }

  // 没有任何连接的环飞走
  function flyers(G, s) {
    const out = [];
    for (let i = 0; i < G.rings.length; i++) if (s.ring[i] && linkCount(G, s, i) === 0) out.push(i);
    return out;
  }

  /*
   * 把环 i 往 delta 方向转，逐步检测碰撞和滑脱（会原地修改 s）。
   * events 记录过程中发生的事：{type:'release', k} / {type:'fly', i} / {type:'hit', p}
   */
  function sweep(G, s, i, delta, events) {
    const dir = Math.sign(delta);
    let left = Math.abs(delta), moved = 0;
    while (left > 1e-9) {
      if (!s.ring[i]) break;
      const st = Math.min(STEP, left);
      const next = norm(s.angles[i] + dir * st);
      const hit = collision(G, s, i, next);
      if (hit) { if (events) events.push({ type: 'hit', p: hit, ring: i }); break; }
      s.angles[i] = next;
      moved += dir * st;
      left -= st;
      const rel = releases(G, s, i);
      if (rel.length) {
        rel.forEach((k) => { s.link[k] = false; if (events) events.push({ type: 'release', k }); });
        for (const f of flyers(G, s)) { s.ring[f] = false; if (events) events.push({ type: 'fly', i: f }); }
      }
    }
    return moved;
  }

  function candidateMoves(G, s, i) {
    const R = G.rings[i], out = [];
    if (R.gap) {
      for (const L of G.links) {
        if (!s.link[L.k] || L.held !== i) continue;
        const d = angDiff(L.clampAng, R.gap.at + s.angles[i]);
        out.push(d, d > 0 ? d - TAU : d + TAU);
      }
    }
    if (R.knobs.length) out.push(TAU - 1e-6, -TAU + 1e-6); // 转到底，用来挪开凸钉
    return out;
  }

  const stateKey = (s) => s.angles.map((a, i) => (s.ring[i] ? Math.round(a / DEG / 2) % 180 : 'x')).join(',') + '|' + s.link.map(Number).join('');

  // 广度优先求最少拖动次数
  function solve(G, start, opts) {
    const maxDepth = (opts && opts.maxDepth) || 16, maxNodes = (opts && opts.maxNodes) || 200000;
    if (start.ring.every((a) => !a)) return { moves: [], nodes: 0 };
    const seen = new Set([stateKey(start)]);
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
            const key = stateKey(n);
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

  // 关卡合法性：初始无碰撞、无可直接飞走的环、无已滑脱的夹套
  function validate(G) {
    const s = initState(G), problems = [];
    G.links.forEach((L) => { if (L.stemLen < 8) problems.push('link ' + L.k + ' stem too short ' + L.stemLen.toFixed(1)); });
    for (let i = 0; i < G.rings.length; i++) {
      if (collision(G, s, i, s.angles[i])) problems.push('ring ' + G.rings[i].id + ' collides at start');
      if (releases(G, s, i).length) problems.push('ring ' + G.rings[i].id + ' already released');
      if (linkCount(G, s, i) === 0) problems.push('ring ' + G.rings[i].id + ' has no link');
      for (let j = i + 1; j < G.rings.length; j++) {
        const A = G.rings[i], B = G.rings[j];
        if (Math.hypot(A.x - B.x, A.y - B.y) < A.r + B.r + TUBE) problems.push('rings ' + A.id + B.id + ' overlap');
      }
    }
    return problems;
  }

  root.RRCore = {
    TAU, DEG, TUBE, STEM, CLAMP_LEN, KNOB, norm, angDiff, build, initState, cloneState,
    ownsLive, linkCount, blockReason, knobCircles, collision, releases, flyers, sweep, candidateMoves, solve, validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);

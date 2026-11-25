/*
 * 核心规则（与渲染无关，可在浏览器和验证脚本里共用）
 *
 * 规则：
 * - 每个环有 0~N 个缺口，可绕自身圆心旋转。
 * - 两个环相交就算"扣在一起"，相交处有两个交点。
 * - 只要任一交点落在其中一个环的缺口里，这对环的扣就"打开"。
 * - 一个环和所有仍在场的环的扣都打开时，它自动脱出。脱出可连锁。
 * - 锁：带锁的环在钥匙环脱出前不能转。
 * - 联动（S 扣）：联动的两个环反向同步转动；任一方被锁住则整组卡死。
 * - 固定环：永远不能转，只能靠别的环的缺口解开。
 * - 所有环都脱出即过关。
 */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const STROKE = 16;            // 环的线宽（逻辑像素）
  const SNAP_EXTRA = 5 * DEG;   // 松手时超出覆盖范围多少以内仍会吸附

  function norm(a) { a %= TAU; return a < 0 ? a + TAU : a; }
  function angDiff(a, b) { let d = norm(a - b); return d > Math.PI ? d - TAU : d; }

  function circleCross(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d === 0 || d >= a.r + b.r || d <= Math.abs(a.r - b.r)) return null;
    const l = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
    const h = Math.sqrt(a.r * a.r - l * l);
    const mx = a.x + (l * dx) / d, my = a.y + (l * dy) / d;
    const ox = (-dy / d) * h, oy = (dx / d) * h;
    return [{ x: mx + ox, y: my + oy }, { x: mx - ox, y: my - oy }];
  }

  function build(level) {
    const idx = {};
    level.rings.forEach((r, i) => { idx[r.id] = i; });
    const rings = level.rings.map((r, i) => ({
      id: r.id, i, x: r.x, y: r.y, r: r.r,
      color: r.color,
      fixed: !!r.fixed,
      lock: r.lock != null ? idx[r.lock] : -1,
      gaps: (r.gaps || []).map((g) => ({ at: g.at * DEG, w: g.w * DEG })),
      // 交点需要离缺口边缘至少半个线宽才算真正穿过去
      margin: (STROKE / 2 + 1) / r.r,
    }));
    const links = [];
    for (let i = 0; i < rings.length; i++) {
      for (let j = i + 1; j < rings.length; j++) {
        const pts = circleCross(rings[i], rings[j]);
        if (!pts) continue;
        links.push({
          a: i, b: j,
          pts: pts.map((p) => ({
            x: p.x, y: p.y,
            angA: Math.atan2(p.y - rings[i].y, p.x - rings[i].x),
            angB: Math.atan2(p.y - rings[j].y, p.x - rings[j].x),
          })),
        });
      }
    }
    const couples = (level.couples || []).map(([a, b, ratio]) => ({ a: idx[a], b: idx[b], ratio: ratio || 1 }));
    const linksOf = rings.map((_, i) => links.filter((L) => L.a === i || L.b === i));
    return {
      level, rings, links, couples, linksOf,
      angles0: level.rings.map((r) => norm((r.angle || 0) * DEG)),
      alive0: level.rings.map(() => true),
    };
  }

  function gapCovers(G, i, worldAng, angles) {
    const R = G.rings[i];
    for (const g of R.gaps) {
      if (Math.abs(angDiff(worldAng, g.at + angles[i])) <= g.w / 2 - R.margin) return true;
    }
    return false;
  }

  function linkOpen(G, L, angles) {
    for (const p of L.pts) {
      if (gapCovers(G, L.a, p.angA, angles) || gapCovers(G, L.b, p.angB, angles)) return true;
    }
    return false;
  }

  function isLocked(G, i, alive) {
    const R = G.rings[i];
    return R.fixed || (R.lock >= 0 && alive[R.lock]);
  }

  // 转动 i 时一起转的环（通过联动传递），f 为转动系数
  function rotationGroup(G, i, alive) {
    const out = [{ j: i, f: 1 }];
    const seen = new Set([i]);
    for (let k = 0; k < out.length; k++) {
      const { j, f } = out[k];
      for (const c of G.couples) {
        if (!alive[c.a] || !alive[c.b]) continue;
        let n = -1, nf = 0;
        if (c.a === j) { n = c.b; nf = -f * c.ratio; }
        else if (c.b === j) { n = c.a; nf = -f / c.ratio; }
        if (n >= 0 && !seen.has(n)) { seen.add(n); out.push({ j: n, f: nf }); }
      }
    }
    return out;
  }

  function canRotate(G, i, alive) {
    if (!alive[i]) return false;
    return rotationGroup(G, i, alive).every(({ j }) => !isLocked(G, j, alive));
  }

  function rotate(G, i, delta, angles, alive) {
    const next = angles.slice();
    for (const { j, f } of rotationGroup(G, i, alive)) next[j] = norm(next[j] + delta * f);
    return next;
  }

  // 返回本轮会脱出的环
  function findFree(G, angles, alive) {
    const free = [];
    for (let i = 0; i < G.rings.length; i++) {
      if (!alive[i]) continue;
      let ok = true;
      for (const L of G.linksOf[i]) {
        const o = L.a === i ? L.b : L.a;
        if (alive[o] && !linkOpen(G, L, angles)) { ok = false; break; }
      }
      if (ok) free.push(i);
    }
    return free;
  }

  // 连锁脱出，返回每一波脱出的环
  function cascade(G, angles, alive) {
    const live = alive.slice();
    const waves = [];
    for (;;) {
      const f = findFree(G, angles, live);
      if (!f.length) break;
      f.forEach((i) => { live[i] = false; });
      waves.push(f);
    }
    return { alive: live, waves };
  }

  // 松手吸附：组内任一缺口接近某交点时，返回把它对正所需的转角
  function snapDelta(G, i, angles, alive) {
    let best = null;
    for (const { j, f } of rotationGroup(G, i, alive)) {
      const R = G.rings[j];
      for (const L of G.linksOf[j]) {
        const o = L.a === j ? L.b : L.a;
        if (!alive[o]) continue;
        for (const p of L.pts) {
          const pa = L.a === j ? p.angA : p.angB;
          for (const g of R.gaps) {
            const d = angDiff(pa, g.at + angles[j]);
            if (Math.abs(d) <= g.w / 2 + SNAP_EXTRA) {
              const di = d / f;
              if (!best || Math.abs(di) < Math.abs(best)) best = di;
            }
          }
        }
      }
    }
    return best;
  }

  // 候选操作：把组内某个缺口正对某个交点
  function candidateMoves(G, i, angles, alive) {
    const out = [];
    for (const { j, f } of rotationGroup(G, i, alive)) {
      const R = G.rings[j];
      for (const L of G.linksOf[j]) {
        const o = L.a === j ? L.b : L.a;
        if (!alive[o]) continue;
        for (const p of L.pts) {
          const pa = L.a === j ? p.angA : p.angB;
          for (const g of R.gaps) {
            const dj = angDiff(pa, g.at + angles[j]);
            const turns = Math.abs(f) === 1 ? [0] : [-1, 0, 1];
            for (const k of turns) {
              const d = (dj + k * TAU) / f;
              if (Math.abs(d) > 0.5 * DEG && Math.abs(d) <= Math.PI + 1e-9) out.push(d);
            }
          }
        }
      }
    }
    return out;
  }

  function stateKey(angles, alive) {
    let s = '';
    for (let i = 0; i < angles.length; i++) {
      s += alive[i] ? Math.round((norm(angles[i]) / DEG) * 2) % 720 + ',' : 'x,';
    }
    return s;
  }

  // 广度优先求最少步数。每一步 = 拖动一个环一次。
  function solve(G, angles, alive, opts) {
    const maxDepth = (opts && opts.maxDepth) || 14;
    const maxNodes = (opts && opts.maxNodes) || 300000;
    const start = cascade(G, angles, alive);
    if (start.alive.every((a) => !a)) return { moves: [], nodes: 0 };
    const seen = new Set([stateKey(angles, start.alive)]);
    let frontier = [{ angles, alive: start.alive, path: [] }];
    let nodes = 0;
    for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
      const next = [];
      for (const s of frontier) {
        for (let i = 0; i < G.rings.length; i++) {
          if (!canRotate(G, i, s.alive)) continue;
          for (const d of candidateMoves(G, i, s.angles, s.alive)) {
            const na = rotate(G, i, d, s.angles, s.alive);
            const c = cascade(G, na, s.alive);
            const path = s.path.concat([{ ring: i, delta: d }]);
            if (c.alive.every((a) => !a)) return { moves: path, nodes };
            const key = stateKey(na, c.alive);
            if (seen.has(key)) continue;
            seen.add(key);
            if (++nodes > maxNodes) return { moves: null, nodes, aborted: true };
            next.push({ angles: na, alive: c.alive, path });
          }
        }
      }
      frontier = next;
    }
    return { moves: null, nodes };
  }

  root.RRCore = {
    TAU, DEG, STROKE, norm, angDiff, build, gapCovers, linkOpen, isLocked,
    rotationGroup, canRotate, rotate, findFree, cascade, snapDelta, candidateMoves, solve,
  };
})(typeof window !== 'undefined' ? window : globalThis);

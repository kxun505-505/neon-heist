/*
 * 棋盘排版（与渲染无关，游戏和关卡生成器共用）
 *
 * - footprint(level)：每个零件占的地方，用一组圆表示。
 *   环 = 管子外圈；会转的环再加上转动时扫过的范围（凸钉、滑脱后留下的空夹套杆都跟着环转）。
 *   直杆 = 沿轴线的一串圆。
 * - girlRects(box, mask, pad)：陪玩角色立绘的实际轮廓（按 10 条横带近似），换成屏幕上的矩形。
 * - fit(fp, area, avoid)：在可用区域里找最大的缩放和位置，让所有零件都在区域内，并且不压到 avoid 里的矩形。
 * - REF：参考屏幕 390×844（iPhone 12-15 的 CSS 尺寸）。关卡验收按这块屏幕算，tools/layout.html 会核对它和真实页面一致。
 */
(function (root) {
  'use strict';

  const REF = {
    W: 390, H: 844,
    // 棋盘可用区域：左右各留 12，上面让出 HUD 和提示条，下面让出按钮栏
    area: { x0: 12, y0: 112, x1: 378, y1: 760 },
    // 右下角立绘框（.girl：高 min(30vh, 270px)，宽 = 高 × 0.75，right: -4px，贴底）
    girlBox: { left: 204.1, top: 590.8, width: 189.9, height: 253.2 },
  };
  const GIRL_PAD = 8;     // 立绘轮廓外再留的空，盖住呼吸、摇摆、弹跳动画
  const MAX_SCALE = 1.45;

  function C() { return root.RRCore; }

  function footprint(lv) {
    const K = C(), DEG = Math.PI / 180, out = [];
    // 会转的环：被别人扣着的环（主环和闭合根环转不动；主环的孩子都走了以后它才会转，转的时候带着空夹套杆）
    const held = new Set((lv.links || []).map((l) => l[1]));
    const stubReach = {};
    for (const [o, h] of lv.links || []) {
      const O = lv.rings.find((r) => r.id === o), H = lv.rings.find((r) => r.id === h);
      if (!O || !H || O.type === 'bar') continue;
      let reach;
      if (H.type === 'bar') {
        const ux = Math.cos(H.dir * DEG), uy = Math.sin(H.dir * DEG);
        const t0 = (O.x - H.x) * ux + (O.y - H.y) * uy;
        reach = Math.hypot(H.x + ux * t0 - O.x, H.y + uy * t0 - O.y) - O.r + K.CLAMP_LEN / 2;
      } else {
        const d = Math.hypot(H.x - O.x, H.y - O.y);
        if (d + H.r < O.r) reach = 0; // 被扣环套在主环里面：空夹套杆朝圆心长，不会扫到外面
        else if (d + O.r < H.r) reach = H.r - d - O.r + K.CLAMP_LEN / 2;
        else reach = d - O.r - H.r + K.CLAMP_LEN / 2;
      }
      stubReach[o] = Math.max(stubReach[o] || 0, reach);
    }
    for (const r of lv.rings) {
      if (r.type === 'bar') {
        const ux = Math.cos(r.dir * DEG), uy = Math.sin(r.dir * DEG), h = r.len / 2;
        for (let t = -h; t < h; t += 6) out.push({ x: r.x + ux * t, y: r.y + uy * t, rad: K.BAR / 2 + 1 });
        out.push({ x: r.x + ux * h, y: r.y + uy * h, rad: K.BAR / 2 + 1 });
        continue;
      }
      let ext = K.TUBE / 2;
      for (const k of r.knobs || []) ext = Math.max(ext, k.len + K.KNOB);
      if (held.has(r.id) && stubReach[r.id]) ext = Math.max(ext, stubReach[r.id]);
      out.push({ x: r.x, y: r.y, rad: r.r + ext });
    }
    return out;
  }

  function boundsOf(fp) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of fp) {
      x0 = Math.min(x0, c.x - c.rad); x1 = Math.max(x1, c.x + c.rad);
      y0 = Math.min(y0, c.y - c.rad); y1 = Math.max(y1, c.y + c.rad);
    }
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  // mask：10 条等高横带，每条 [x0, x1]（相对立绘框宽度的比例），由 tools/assets.sh 从立绘的透明通道算出
  function girlRects(box, mask, pad) {
    if (!box || !mask || !mask.length) return [];
    const p = pad == null ? GIRL_PAD : pad, n = mask.length, out = [];
    mask.forEach(([a, b], k) => {
      if (b <= a) return;
      out.push({
        x0: box.left + box.width * a - p, x1: box.left + box.width * b + p,
        y0: box.top + (box.height * k) / n - p, y1: box.top + (box.height * (k + 1)) / n + p,
      });
    });
    return out;
  }

  function clearOf(fp, s, ox, oy, avoid) {
    for (const c of fp) {
      const cx = ox + c.x * s, cy = oy + c.y * s, rr = c.rad * s;
      for (const r of avoid) {
        const dx = Math.max(r.x0 - cx, 0, cx - r.x1), dy = Math.max(r.y0 - cy, 0, cy - r.y1);
        if (dx * dx + dy * dy < rr * rr) return false;
      }
    }
    return true;
  }

  // 缩放为 s 时找一个不压到 avoid 的位置：优先居中，其次离居中最近
  function placeAt(fp, b, s, area, avoid) {
    const oxMin = area.x0 - b.x0 * s, oxMax = area.x1 - b.x1 * s;
    const oyMin = area.y0 - b.y0 * s, oyMax = area.y1 - b.y1 * s;
    if (oxMin > oxMax + 1e-6 || oyMin > oyMax + 1e-6) return null;
    const oxc = (area.x0 + area.x1) / 2 - b.cx * s, oyc = (area.y0 + area.y1) / 2 - b.cy * s;
    if (clearOf(fp, s, oxc, oyc, avoid)) return { ox: oxc, oy: oyc };
    const N = 28, cands = [];
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
      const ox = oxMin + ((oxMax - oxMin) * i) / N, oy = oyMin + ((oyMax - oyMin) * j) / N;
      cands.push({ ox, oy, d: (ox - oxc) ** 2 + (oy - oyc) ** 2 });
    }
    cands.sort((a, b2) => a.d - b2.d);
    for (const c of cands) if (clearOf(fp, s, c.ox, c.oy, avoid)) return { ox: c.ox, oy: c.oy };
    return null;
  }

  /*
   * 返回 { scale, ox, oy, clear }：屏幕坐标 = (ox + x * scale, oy + y * scale)。
   * clear = false 表示怎么缩都躲不开 avoid（只会在极小的窗口里出现），这时退回居中摆放。
   */
  function fit(fp, area, avoid, opts) {
    const b = boundsOf(fp), maxS = (opts && opts.maxScale) || MAX_SCALE;
    const aw = area.x1 - area.x0, ah = area.y1 - area.y0;
    const hi0 = Math.max(0.05, Math.min(aw / b.w, ah / b.h, maxS));
    const av = avoid || [];
    let p = placeAt(fp, b, hi0, area, av);
    if (p) return { scale: hi0, ox: p.ox, oy: p.oy, clear: true, bounds: b };
    let lo = 0, hi = hi0, found = null;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      p = placeAt(fp, b, mid, area, av);
      if (p) { lo = mid; found = { scale: mid, ox: p.ox, oy: p.oy }; } else hi = mid;
    }
    if (found && found.scale > 0.05) return { ...found, clear: true, bounds: b };
    return { scale: hi0, ox: (area.x0 + area.x1) / 2 - b.cx * hi0, oy: (area.y0 + area.y1) / 2 - b.cy * hi0, clear: false, bounds: b };
  }

  // 参考屏幕上的排版（关卡验收用）
  function refFit(lv, mask) {
    return fit(footprint(lv), REF.area, girlRects(REF.girlBox, mask));
  }

  root.RRLayout = { REF, GIRL_PAD, MAX_SCALE, footprint, boundsOf, girlRects, fit, refFit, clearOf };
})(typeof window !== 'undefined' ? window : globalThis);

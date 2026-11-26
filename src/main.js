/*
 * 交互、动画和渲染。规则判定全部交给 RRCore。
 */
(function () {
  'use strict';
  const C = RRCore, LEVELS = RRLevels, SFX = RRAudio, HAP = RRHaptics, I18N = RRI18n, t = RRI18n.t, TAU = C.TAU, DEG = C.DEG;
  const TUBE = C.TUBE, STEM = C.STEM, CLAMP_LEN = C.CLAMP_LEN, KNOB = C.KNOB, BAR = C.BAR;
  const SILVER = '#cfcbe3';
  const PROGRESS_KEY = 'neonloops-progress-v2';
  const UNLOCK_ALL = /[?&]unlock/.test(location.search);
  const BG_KEY = 'neonloops-bg';
  const qBg = (location.search.match(/[?&]bg=(\d+)/) || [])[1];
  let bgIndex = qBg != null ? +qBg - 1 : +(localStorage.getItem(BG_KEY) || 0);
  

  const $ = (id) => document.getElementById(id);
  const cv = $('game'), ctx = cv.getContext('2d');
  const bg = document.createElement('canvas');
  let W = 0, H = 0, DPR = 1, scale = 1, ox = 0, oy = 0;

  // ---------- 存档：每关最高分 ----------
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { progress = {}; }
  const unlocked = (n) => UNLOCK_ALL || n === 0 || progress[n - 1] != null;
  function saveScore(n, sc) {
    if (progress[n] == null || progress[n] < sc) progress[n] = sc;
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (e) { /* 隐私模式 */ }
  }

  // ---------- 关卡状态 ----------
  let levelIndex = 0, G = null, S = null, bounds = null;
  let moves = 0, score = 0, shownScore = 0, won = false, everDragged = false;
  let drag = null, hint = null, combo = { n: 0, t: 0 };
  let fx = [];            // 各种一次性动画
  let shakes = {}, lift = {}, flashLinks = {};
  // 特效时钟：结尾慢镜头时只让特效变慢（输入和界面照常）
  let timeScale = 1, fxClock = 0, fxReal = performance.now(), slowmo = null, probeHold = null;
  const fxTime = () => fxClock + (performance.now() - fxReal) * timeScale;
  const SHORT = 0.24; // 霓虹短路的时长（秒）

  function levelBounds(lv) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of lv.rings) {
      if (r.type === 'bar') {
        const ux = Math.cos(r.dir * DEG), uy = Math.sin(r.dir * DEG), h = r.len / 2 + BAR;
        for (const sg of [1, -1]) {
          x0 = Math.min(x0, r.x + ux * h * sg - BAR); x1 = Math.max(x1, r.x + ux * h * sg + BAR);
          y0 = Math.min(y0, r.y + uy * h * sg - BAR); y1 = Math.max(y1, r.y + uy * h * sg + BAR);
        }
        continue;
      }
      const ext = r.r + TUBE / 2 + Math.max(0, ...(r.knobs || []).map((k) => k.len + KNOB));
      x0 = Math.min(x0, r.x - ext); x1 = Math.max(x1, r.x + ext);
      y0 = Math.min(y0, r.y - ext); y1 = Math.max(y1, r.y + ext);
    }
    return { x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }

  function loadLevel(n) {
    levelIndex = n;
    const lv = LEVELS[n];
    G = C.build(lv);
    S = C.initState(G);
    bounds = levelBounds(lv);
    moves = 0; score = 0; shownScore = 0; won = false;
    drag = null; hint = null; combo = { n: 0, t: 0 };
    fx = []; shakes = {}; lift = {}; flashLinks = {}; slowmo = null; timeScale = 1;
    $('lvNum').textContent = t('level') + ' ' + (n + 1);
    $('lvName').textContent = lv.en;
    $('score').textContent = '0';
    $('win').classList.remove('show');
    layout();
    showTip(t('tips')[n] || '');
    if (lv.hard) showBanner();
    if (n === 0 && !everDragged) setTimeout(() => { if (levelIndex === 0 && !everDragged) showHint(true); }, 700);
  }

  let tipTimer = 0;
  function showTip(text, ms) {
    const el = $('tip');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => el.classList.remove('show'), ms || 4200);
  }
  function showBanner() {
    const el = $('banner');
    $('bannerText').textContent = t('hard');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    SFX.banner();
  }

  // ---------- 坐标 ----------
  function layout() {
    if (!bounds) return;
    // 棋盘区域：HUD 下方留出提示条的位置，底部让出工具栏（自动包含 iPhone 刘海和底部横条的安全区）
    const TOP = $('hud').getBoundingClientRect().bottom + 44;
    const BOTTOM = H - $('tools').getBoundingClientRect().top + 8;
    const aw = W - 24, ah = Math.max(200, H - TOP - BOTTOM);
    scale = Math.min(aw / bounds.w, ah / bounds.h, 1.45);
    ox = W / 2 - bounds.cx * scale;
    oy = TOP + ah / 2 - bounds.cy * scale;
    RRBg.paint(bg, W, H, DPR, { x: W / 2, y: TOP + ah / 2, r: Math.max(bounds.w, bounds.h) * scale * 0.62 }, bgIndex);
  }
  function resize() {
    DPR = Math.min(3, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    layout();
  }
  const toLogical = (e) => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });

  // 找手指下的环：管子、凸钉、它伸出的杆都算
  function pickRing(p) {
    let best = -1, bestD = Infinity, inner = -1, innerR = Infinity;
    const tol = TUBE / 2 + 18 / scale;
    G.rings.forEach((R, i) => {
      if (!S.ring[i]) return;
      if (R.kind === 'bar') {
        const sv = S.angles[i], t = Math.max(-R.half, Math.min(R.half, (p.x - R.x) * R.ux + (p.y - R.y) * R.uy - sv));
        const d = Math.max(0, Math.hypot(p.x - R.x - R.ux * (sv + t), p.y - R.y - R.uy * (sv + t)) - BAR / 2);
        if (d < tol && d < bestD) { best = i; bestD = d; }
        return;
      }
      const dc = Math.hypot(p.x - R.x, p.y - R.y);
      let d = Math.abs(dc - R.r);
      for (const k of C.knobCircles(G, S, i, S.angles[i])) d = Math.min(d, Math.max(0, Math.hypot(p.x - k.x, p.y - k.y) - k.rad));
      if (d < tol && d < bestD) { best = i; bestD = d; }
      if (dc < R.r && R.r < innerR) { inner = i; innerR = R.r; }
    });
    return best >= 0 ? best : inner;
  }

  // ---------- 输入 ----------
  cv.addEventListener('pointerdown', (e) => {
    SFX.ensure();
    if (won || !G || drag) return;
    const p = toLogical(e);
    const i = pickRing(p);
    if (i < 0) return;
    const why = C.blockReason(G, S, i);
    if (why) {
      shakes[i] = performance.now();
      SFX.locked();
      HAP.fire('blocked');
      if (why === 'owner') {
        // 把它扣住的环闪一下，告诉玩家要先处理谁
        G.links.forEach((L) => { if (S.link[L.k] && L.owner === i) flashLinks[L.k] = performance.now(); });
        showTip(t('tipOwner'), 2600);
      } else showTip(t('tipClosed'), 2600);
      return;
    }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件 */ }
    const R = G.rings[i];
    drag = { i, id: e.pointerId, last: Math.atan2(p.y - R.y, p.x - R.x), lastP: p, bar: R.kind === 'bar', total: 0, tick: 0, lastHit: 0, moved: false };
    lift[i] = { t0: performance.now(), on: true };
    HAP.fire('grab');
    if (hint && !hint.auto) hint = null;
    SFX.grab();
  });

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      if (!drag) break;
      const p = toLogical(ev), R = G.rings[drag.i];
      if (drag.bar) {
        // 直杆：手指位移投影到杆的方向上
        const d = (p.x - drag.lastP.x) * R.ux + (p.y - drag.lastP.y) * R.uy;
        drag.lastP = p;
        turn(d);
        continue;
      }
      const rad = Math.hypot(p.x - R.x, p.y - R.y);
      if (rad < 10) continue; // 太靠近圆心时角度不稳定
      const a = Math.atan2(p.y - R.y, p.x - R.x);
      const d = C.angDiff(a, drag.last);
      drag.last = a;
      turn(d);
    }
  }
  cv.addEventListener('pointermove', onMove);

  function turn(d) {
    const i = drag.i;
    const events = [];
    const moved = C.sweep(G, S, i, d, events);
    drag.total += drag.bar ? Math.abs(moved) / 40 : Math.abs(moved);
    if (!drag.moved && drag.total > 2 * DEG) {
      drag.moved = true; moves++; everDragged = true;
      if (hint) hint = null;
    }
    drag.tick += drag.bar ? Math.abs(moved) / 60 : Math.abs(moved);
    if (drag.tick > 10 * DEG) { drag.tick = 0; SFX.tick(); HAP.fire('tick'); }
    handleEvents(events);
  }

  function handleEvents(events) {
    const now = performance.now(), ft = fxTime();
    let flew = 0;
    for (const ev of events) {
      if (ev.type === 'hit') {
        if (now - (drag ? drag.lastHit : 0) > 140) {
          if (drag) drag.lastHit = now;
          SFX.bump();
          HAP.fire('bump');
          fx.push({ type: 'bump', x: ev.p.x, y: ev.p.y, t0: ft });
          shakes[ev.ring] = now - 200; // 轻微一抖
        }
      } else if (ev.type === 'open') {
        const L = G.links[ev.k];
        fx.push({ type: 'slip', L, t0: ft, color: G.rings[L.owner].color });
        SFX.slip();
        HAP.fire('open');
      } else if (ev.type === 'close') {
        SFX.tick();
        HAP.fire('close');
      } else if (ev.type === 'fly') {
        // 连击序号从 1 开始（1.4 秒内接着飞走的算连击）
        const base = now - combo.t < 1400 ? combo.n : 0;
        flyAway(ev.i, ft + flew * 70, base + flew + 1);
        flew++;
        if (drag && drag.i === ev.i) endDrag(null, true);
      }
    }
    if (flew) {
      combo.n = now - combo.t < 1400 ? combo.n + flew : flew;
      combo.t = now;
      const gain = flew * 200 * Math.min(combo.n, 5);
      score += gain;
      $('score').textContent = String(score);
      bumpScore();
      // 连击字在灯管爆掉的那一刻出现
      const R = G.rings[events.find((e) => e.type === 'fly').i];
      const wx = R.kind === 'bar' ? R.x : R.x, wy = R.kind === 'bar' ? R.y - 30 : R.y - R.r - 20;
      if (combo.n >= 2 || flew >= 2) {
        const words = ['', '', 'Great!', 'Excellent!', 'Amazing!', 'Unreal!'];
        fx.push({ type: 'word', text: words[Math.min(combo.n, 5)], x: wx, y: wy, t0: ft + SHORT * 1000 });
      } else fx.push({ type: 'word', text: 'Good!', x: wx, y: wy, t0: ft + SHORT * 1000, small: true });
      if (S.ring.every((a) => !a)) {
        // 最后一个零件：慢镜头收尾
        slowmo = { t0: now + (flew - 1) * 70 + SHORT * 1000 * 0.6 };
        setTimeout(() => SFX.slowmo(), (flew - 1) * 70 + 120);
        win();
      }
    }
  }

  // 零件飞走：像接触不良的霓虹灯管一样闪两下、冒电火花（A），然后爆开成烧焦的碎片和烟
  function flyAway(i, t0, comboN) {
    const R = G.rings[i];
    fx.push({ type: 'short', i, R, ang: S.angles[i], t0, combo: comboN,
      stubs: G.links.filter((L) => L.owner === i && !S.link[L.k] && !S.ring[L.held] && L.held !== i).map((L) => L.k) });
  }

  let pendingFx = [];
  function burst(f) {
    const R = f.R, now = f.t0 + SHORT * 1000;
    const fx = pendingFx; // 遮住外层的 fx：本函数里的 push 都进待加入列表
    const burnt = (c) => darken(c, 0.45);
    const pts = (size) => {
      const out = [], sides = 4 + Math.floor(Math.random() * 3);
      for (let q = 0; q < sides; q++) { const pa = (q / sides) * TAU + Math.random() * 0.6; const pr = size * (0.6 + Math.random() * 0.5); out.push([Math.cos(pa) * pr, Math.sin(pa) * pr]); }
      return out;
    };
    // 沿着零件取样：位置 + 向外的方向
    const samples = [];
    if (R.kind === 'bar') {
      const n = Math.round(R.len / 7);
      for (let k = 0; k < n; k++) {
        const t = -R.half + (R.len * (k + Math.random() * 0.6)) / n, a = Math.random() * TAU;
        samples.push({ x: R.x + R.ux * (f.ang + t), y: R.y + R.uy * (f.ang + t), a });
      }
    } else {
      const g0 = R.gap ? R.gap.at + f.ang + R.gap.w / 2 : 0, span = R.gap ? TAU - R.gap.w : TAU;
      const n = Math.round((span * R.r) / 8);
      for (let k = 0; k < n; k++) {
        const a = g0 + span * ((k + Math.random() * 0.6) / n);
        samples.push({ x: R.x + Math.cos(a) * R.r, y: R.y + Math.sin(a) * R.r, a });
      }
    }
    for (const p of samples) {
      const sp = 50 + Math.random() * 130;
      fx.push({ type: 'chunk', color: burnt(R.color), glowColor: R.color, x: p.x, y: p.y, pts: pts(3 + Math.random() * 3.5),
        vx: Math.cos(p.a) * sp + (Math.random() - 0.5) * 50, vy: Math.sin(p.a) * sp - 60 - Math.random() * 60,
        vr: (Math.random() - 0.5) * 12, t0: now + Math.random() * 30, life: 0.7 + Math.random() * 0.35 });
    }
    // 电火花：亮、快、带重力
    for (let k = 0; k < 34; k++) {
      const p = samples[Math.floor(Math.random() * samples.length)], a = Math.random() * TAU, sp = 120 + Math.random() * 320;
      fx.push({ type: 'spark', color: k % 3 ? '#bff6ff' : R.color, x: p.x, y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, t0: now, life: 0.25 + Math.random() * 0.4 });
    }
    // 几团烟
    for (let k = 0; k < 5; k++) {
      const p = samples[Math.floor(Math.random() * samples.length)];
      fx.push({ type: 'smoke', x: p.x, y: p.y, t0: now + k * 25, life: 0.9 + Math.random() * 0.4, r0: 6 + Math.random() * 6 });
    }
    const cx = R.kind === 'bar' ? R.x + R.ux * f.ang : R.x, cy = R.kind === 'bar' ? R.y + R.uy * f.ang : R.y;
    fx.push({ type: 'flash', x: cx, y: cy, r: R.kind === 'bar' ? R.half : R.r, t0: now });
    fx.push({ type: 'plus', x: cx, y: cy, t0: now, text: '+' + 200 * Math.min(f.combo, 5) });
    SFX.burst();
    SFX.free(Math.max(0, f.combo - 1));
    HAP.fire('fly');
  }

  // 短路时的零件本体（已经不在棋盘状态里了，单独画）
  function drawGhost(f, alpha, glow) {
    const R = f.R;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (R.kind === 'bar') {
      const ax = R.x + R.ux * (f.ang - R.half), ay = R.y + R.uy * (f.ang - R.half);
      const bx = R.x + R.ux * (f.ang + R.half), by = R.y + R.uy * (f.ang + R.half);
      lineTube(ax, ay, bx, by, R.color, BAR, glow);
    } else {
      for (const k of R.knobs) drawKnob(R, R.x, R.y, f.ang, k, glow);
      if (R.gap) { const g = R.gap.at + f.ang; arcTube(R.x, R.y, R.r, g + R.gap.w / 2, g - R.gap.w / 2 + TAU, R.color, TUBE, glow, false, f.ang); }
      else arcTube(R.x, R.y, R.r, 0, TAU, R.color, TUBE, glow, true, f.ang);
    }
    ctx.restore();
  }

  // 过曝的霓虹光晕
  function drawHalo(f, k) {
    const R = f.R;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    const path = () => {
      ctx.beginPath();
      if (R.kind === 'bar') { ctx.moveTo(R.x + R.ux * (f.ang - R.half), R.y + R.uy * (f.ang - R.half)); ctx.lineTo(R.x + R.ux * (f.ang + R.half), R.y + R.uy * (f.ang + R.half)); }
      else if (R.gap) { const g = R.gap.at + f.ang; ctx.arc(R.x, R.y, R.r, g + R.gap.w / 2, g - R.gap.w / 2 + TAU); }
      else ctx.arc(R.x, R.y, R.r, 0, TAU);
    };
    for (const [w, a] of [[34, 0.12], [20, 0.22], [10, 0.35]]) { ctx.strokeStyle = rgba(R.color, a * k); ctx.lineWidth = w; path(); ctx.stroke(); }
    ctx.restore();
  }

  // 沿着零件乱窜的电弧
  function drawBolts(f) {
    const R = f.R;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    for (let b = 0; b < 4; b++) {
      const path = [];
      if (R.kind === 'bar') {
        const t0 = (Math.random() - 0.5) * R.len, nx = -R.uy, ny = R.ux;
        for (let j = 0; j <= 6; j++) {
          const t = t0 + (j - 3) * 7, o = (Math.random() - 0.5) * 14;
          path.push([R.x + R.ux * (f.ang + t) + nx * o, R.y + R.uy * (f.ang + t) + ny * o]);
        }
      } else {
        const a0 = Math.random() * TAU;
        for (let j = 0; j <= 7; j++) {
          const a = a0 + j * 0.09, rr = R.r + (Math.random() - 0.5) * 18;
          path.push([R.x + Math.cos(a) * rr, R.y + Math.sin(a) * rr]);
        }
      }
      for (const [w, c] of [[7, 'rgba(90,220,255,0.35)'], [3.5, 'rgba(150,235,255,0.7)'], [1.6, 'rgba(255,255,255,1)']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); path.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    }
    ctx.restore();
  }
  // 闪烁节奏：亮—灭—亮—灭—过亮，然后爆
  const flickOn = (t) => t < 0.05 || (t >= 0.08 && t < 0.13) || t >= 0.155;

  function endDrag(e, forced) {
    if (!drag) return;
    if (e && e.pointerId !== drag.id) return;
    lift[drag.i] = { t0: performance.now(), on: false };
    drag = null;
    if (!forced) SFX.drop();
  }
  cv.addEventListener('pointerup', (e) => endDrag(e));
  cv.addEventListener('pointercancel', (e) => endDrag(e));



  let scoreTimer = 0;
  function bumpScore() {
    const el = $('score');
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    clearTimeout(scoreTimer);
  }

  function win() {
    won = true;
    if (drag) endDrag(null, true);
    saveScore(levelIndex, score);
    setTimeout(() => {
      SFX.win();
      const last = levelIndex === LEVELS.length - 1;
      $('winTitle').textContent = last ? t('demoDone') : t('wins')[levelIndex % 4];
      $('winScore').textContent = String(score);
      $('winInfo').textContent = t('moves', { n: moves });
      $('btnNextLabel').textContent = last ? t('toLevels') : t('next');
      HAP.fire('win');
      $('win').classList.add('show');
    }, 1750);
  }

  // ---------- 提示：求解器算出下一步，用手指动画演示 ----------
  function showHint(auto) {
    if (won || !G) return;
    const m = C.hintMove(G, S, G.rings.length > 9 ? 8000 : 40000);
    if (!m) { showTip(t('tipDead')); return; }
    hint = { i: m.ring, delta: m.delta, t0: performance.now(), auto: !!auto };
    if (!auto) showTip(t('tipHint'), 2600);
  }

  // ---------- 按钮 ----------
  function btn(id, fn) {
    const el = $(id);
    el.addEventListener('click', () => {
      // 按钮所在的面板没打开时一律不响应（防止误触到隐藏面板里的按钮）
      const panel = el.closest('.overlay');
      if (panel && !panel.classList.contains('show')) return;
      SFX.ensure(); SFX.button(); if (!/iP(hone|ad|od)/.test(navigator.userAgent)) HAP.fire('tap'); fn();
    });
  }
  btn('btnReset', () => loadLevel(levelIndex));
  btn('btnHint', () => showHint(false));
  // ---------- 设置 ----------
  function syncToggles() {
    $('togMusic').classList.toggle('off', !SFX.music);
    $('togSound').classList.toggle('off', SFX.muted);
    $('togVibe').classList.toggle('off', !HAP.enabled);
    $('langVal').textContent = I18N.name(I18N.lang);
  }
  function openSettings() { syncToggles(); $('langList').classList.remove('open'); $('settings').classList.add('show'); }
  function closeSettings() { $('settings').classList.remove('show'); }
  btn('btnSettings', openSettings);
  btn('btnCloseSettings', closeSettings);
  btn('togMusic', () => { SFX.setMusic(!SFX.music); syncToggles(); showTip(t('musicSoon'), 1800); });
  btn('togSound', () => { SFX.toggle(); syncToggles(); });
  btn('togVibe', () => { HAP.set(!HAP.enabled); syncToggles(); });
  btn('btnLang', () => {
    const box = $('langList');
    if (!box.children.length) {
      I18N.ORDER.forEach((code) => {
        const b = document.createElement('button');
        b.textContent = I18N.name(code);
        b.dataset.code = code;
        b.addEventListener('click', () => { if (!$('settings').classList.contains('show')) return; SFX.button(); HAP.fire('tap'); I18N.set(code); refreshTexts(); syncToggles(); markLang(); });
        box.appendChild(b);
        HAP.attach(b);
      });
    }
    markLang();
    box.classList.toggle('open');
  });
  function markLang() { [...$('langList').children].forEach((b) => b.classList.toggle('on', b.dataset.code === I18N.lang)); }
  btn('btnHome', () => { closeSettings(); openMenu(); });
  btn('btnRestart', () => { closeSettings(); loadLevel(levelIndex); });
  $('settings').addEventListener('click', (e) => { if (e.target.id === 'settings') closeSettings(); });
  // 切换语言后刷新所有文字
  function refreshTexts() {
    I18N.apply();
    $('lvNum').textContent = t('level') + ' ' + (levelIndex + 1);
    if ($('menu').classList.contains('show')) openMenu();
  }
  btn('btnNext', () => { $('win').classList.remove('show'); if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1); else openMenu(); });
  btn('btnRetry', () => { $('win').classList.remove('show'); loadLevel(levelIndex); });
  // iPhone：按钮上盖透明原生开关，直接点按就有震感
  ['btnSettings', 'btnReset', 'btnHint', 'togMusic', 'togSound', 'togVibe', 'btnLang', 'btnHome', 'btnRestart', 'btnCloseSettings', 'btnNext', 'btnRetry']
    .forEach((id) => HAP.attach($(id)));
  I18N.apply();

  function openMenu() {
    const box = $('levels');
    box.innerHTML = '';
    LEVELS.forEach((lv, n) => {
      const b = document.createElement('button');
      const open = unlocked(n), best = progress[n];
      b.className = 'card' + (open ? '' : ' locked') + (n === levelIndex ? ' current' : '');
      b.innerHTML = '<span class="no">' + (n + 1) + '</span><span class="nm">' + lv.en + (lv.hard ? '<b class="hard">' + t('hard') + '</b>' : '') +
        '</span><span class="st">' + (open ? (best != null ? '✓ ' + best : '') : '🔒') + '</span>';
      if (open) b.addEventListener('click', () => { SFX.ensure(); SFX.button(); $('menu').classList.remove('show'); loadLevel(n); });
      box.appendChild(b);
    });
    // 背景选择：每个场景画一张缩略图
    const bgs = $('bgs');
    bgs.innerHTML = '';
    RRBg.scenes().forEach((_, k) => {
      const name = t('bgs')[k];
      const b = document.createElement('button');
      b.className = 'bgpick' + (k === bgIndex ? ' on' : '');
      const c = document.createElement('canvas');
      RRBg.paint(c, 72, 120, 2, null, k);
      c.style.width = '100%'; c.style.height = 'auto';
      b.appendChild(c);
      const label = document.createElement('span'); label.textContent = name; b.appendChild(label);
      b.addEventListener('click', () => {
        SFX.ensure(); SFX.button();
        bgIndex = k;
        try { localStorage.setItem(BG_KEY, String(k)); } catch (e) { /* 隐私模式 */ }
        layout();
        [...bgs.children].forEach((el, j) => el.classList.toggle('on', j === k));
      });
      bgs.appendChild(b);
    });
    $('menu').classList.add('show');
  }
  $('menu').addEventListener('click', (e) => { if (e.target.id === 'menu') $('menu').classList.remove('show'); });

  // ---------- 绘制 ----------
  function lighten(hex, t) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.round(c + (255 - c) * t);
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }
  function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  // 霓虹管：外层辉光用加宽的半透明描边叠加（比 shadowBlur 快很多，iPhone 上也流畅）
  function neonPath(path, color, width, glow) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(color, 0.05 * glow); ctx.lineWidth = width + 18; path(); ctx.stroke();
    ctx.strokeStyle = rgba(color, 0.11 * glow); ctx.lineWidth = width + 8; path(); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(12,2,30,0.85)'; ctx.lineWidth = width + 3; path(); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = width; path(); ctx.stroke();
    ctx.strokeStyle = rgba('#ffffff', 0.55); ctx.lineWidth = width * 0.3; path(); ctx.stroke();
  }


  // 实体光泽管：先画投影，再在管子轮廓内按“光从左上方来”叠出暗面、本色、高光、镜面反光
  function darken(hex, t) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.round(c * (1 - t));
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }
  const LX = -0.55, LY = -0.83; // 主光方向（左上）
  const LANG = Math.atan2(LY, LX);
  // 金属漆里的细小闪粉：一张噪点贴图，随环一起转
  const flake = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const x = c.getContext('2d');
    for (let i = 0; i < 260; i++) {
      x.fillStyle = 'rgba(255,255,255,' + (0.25 + Math.random() * 0.75) + ')';
      x.fillRect(Math.random() * 96, Math.random() * 96, Math.random() < 0.8 ? 0.7 : 1.3, Math.random() < 0.8 ? 0.7 : 1.3);
    }
    return c;
  })();
  let flakePattern = null;

  /*
   * 汽车烤漆质感的管子（光从左上来，上方是亮的天空、下方是暗的地面）：
   * 投影 → 暗面 → 本色 → 清漆层里反射的天空（边缘清晰）→ 锐利的镜面高光 → 背光侧的环境反光 → 闪粉
   * center(dx, dy) 画中心线；outline() 画管子轮廓，用来裁剪；glints() 画固定在世界坐标里的高光点
   */
  function paintTube(center, outline, color, w, glow, glints, spin) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glow > 1.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(color, 0.12 * (glow - 1)); ctx.lineWidth = w + 14; center(0, 0); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    // 软投影：两层
    ctx.strokeStyle = 'rgba(5,0,15,0.18)'; ctx.lineWidth = w + 7; center(3, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(5,0,15,0.35)'; ctx.lineWidth = w + 1; center(1.8, 4); ctx.stroke();
    ctx.strokeStyle = 'rgba(8,2,20,0.95)'; ctx.lineWidth = w + 2; center(0, 0); ctx.stroke();
    ctx.save();
    outline(); ctx.clip('evenodd');
    const o = (k) => [LX * w * k, LY * w * k];
    ctx.strokeStyle = darken(color, 0.62); ctx.lineWidth = w + 2; center(0, 0); ctx.stroke();
    ctx.strokeStyle = darken(color, 0.25); ctx.lineWidth = w * 0.86; center(...o(0.1)); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w * 0.62; center(...o(0.2)); ctx.stroke();
    // 清漆里反射的天空：亮、偏暖，边缘清楚
    ctx.strokeStyle = lighten(color, 0.55); ctx.lineWidth = w * 0.3; center(...o(0.3)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,250,240,0.95)'; ctx.lineWidth = Math.max(1, w * 0.09); center(...o(0.34)); ctx.stroke();
    // 背光侧的环境反光（地面霓虹的反射）
    ctx.strokeStyle = 'rgba(120,220,255,0.55)'; ctx.lineWidth = Math.max(0.8, w * 0.07); center(...o(-0.42)); ctx.stroke();
    ctx.strokeStyle = rgba(color, 0.5); ctx.lineWidth = w * 0.14; center(...o(-0.3)); ctx.stroke();
    // 闪粉（随环转动）
    if (!flakePattern) flakePattern = ctx.createPattern(flake, 'repeat');
    if (spin) {
      ctx.save();
      ctx.translate(spin.x, spin.y); ctx.rotate(spin.a);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.16;
      ctx.fillStyle = flakePattern; ctx.fillRect(-spin.r - w, -spin.r - w, (spin.r + w) * 2, (spin.r + w) * 2);
      ctx.restore();
    }
    if (glints) glints();
    ctx.restore();
  }

  function glint(x, y, rad, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(255,255,255,' + a + ')'); g.addColorStop(0.35, 'rgba(255,255,255,' + a * 0.5 + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // 圆弧管
  function arcTube(cx, cy, r, a0, a1, color, w, glow, full, spinAng) {
    const center = (dx, dy) => { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, a0, a1); };
    const outline = () => {
      ctx.beginPath();
      if (full) {
        ctx.arc(cx, cy, r + w / 2, 0, TAU); ctx.moveTo(cx + r - w / 2, cy); ctx.arc(cx, cy, r - w / 2, 0, TAU);
      } else {
        ctx.arc(cx, cy, r + w / 2, a0, a1);
        ctx.arc(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r, w / 2, a1, a1 + Math.PI);
        ctx.arc(cx, cy, r - w / 2, a1, a0, true);
        ctx.arc(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, w / 2, a0 + Math.PI, a0 + TAU);
        ctx.closePath();
      }
    };
    // 高光点固定在“朝向光源”的位置：外圈左上、内圈右下；环转动时漆面从高光下滑过
    const inArc = (t) => full || C.norm(t - a0) <= C.norm(a1 - a0);
    const glints = () => {
      const ta = LANG, tb = LANG + Math.PI;
      if (inArc(ta)) glint(cx + Math.cos(ta) * (r + w * 0.12), cy + Math.sin(ta) * (r + w * 0.12) + LY * w * 0.05, w * 1.1, 0.95);
      if (inArc(tb)) glint(cx + Math.cos(tb) * (r - w * 0.12), cy + Math.sin(tb) * (r - w * 0.12), w * 0.8, 0.55);
    };
    paintTube(center, outline, color, w, glow, glints, spinAng != null ? { x: cx, y: cy, r, a: spinAng } : null);
  }

  // 直管（杆）
  function lineTube(x0, y0, x1, y1, color, w, glow) {
    const a = Math.atan2(y1 - y0, x1 - x0);
    const center = (dx, dy) => { ctx.beginPath(); ctx.moveTo(x0 + dx, y0 + dy); ctx.lineTo(x1 + dx, y1 + dy); };
    const outline = () => {
      ctx.beginPath();
      ctx.arc(x1, y1, w / 2, a - Math.PI / 2, a + Math.PI / 2);
      ctx.arc(x0, y0, w / 2, a + Math.PI / 2, a + Math.PI * 1.5);
      ctx.closePath();
    };
    paintTube(center, outline, color, w, glow, null, null);
  }

  function ringPath(R, cx, cy, ang) {
    return () => {
      ctx.beginPath();
      if (R.gap) {
        const g = R.gap.at + ang;
        ctx.arc(cx, cy, R.r, g + R.gap.w / 2, g - R.gap.w / 2 + TAU);
      } else ctx.arc(cx, cy, R.r, 0, TAU);
    };
  }

  function drawKnob(R, cx, cy, ang, k, glow) {
    const a = k.at + ang, c = Math.cos(a), s = Math.sin(a);
    const r0 = R.r + TUBE / 2 - 2, r1 = R.r + k.len - KNOB * 0.6;
    lineTube(cx + c * r0, cy + s * r0, cx + c * r1, cy + s * r1, R.color, STEM, glow);
    // 末端方块
    ctx.save();
    ctx.translate(cx + c * (R.r + k.len), cy + s * (R.r + k.len));
    ctx.rotate(a);
    ctx.fillStyle = 'rgba(12,2,30,0.85)';
    roundRect(-KNOB - 1.5, -KNOB - 1.5, KNOB * 2 + 3, KNOB * 2 + 3, 4); ctx.fill();
    const kg = ctx.createLinearGradient(0, -KNOB, 0, KNOB);
    kg.addColorStop(0, darken(R.color, 0.4)); kg.addColorStop(0.3, lighten(R.color, 0.6)); kg.addColorStop(0.55, R.color); kg.addColorStop(1, darken(R.color, 0.45));
    ctx.fillStyle = kg;
    roundRect(-KNOB, -KNOB, KNOB * 2, KNOB * 2, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(-KNOB + 2, -KNOB * 0.45, KNOB * 2 - 4, 1.4);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function ringOffset(i, now) {
    let dx = 0, dy = 0;
    const s = shakes[i];
    if (s != null) {
      const t = (now - s) / 1000;
      if (t > 0.36) delete shakes[i];
      else dx = Math.sin(t * 62) * 4.5 * (1 - t / 0.36);
    }
    return { dx, dy };
  }
  function liftAmount(i, now) {
    const l = lift[i];
    if (!l) return 0;
    const t = Math.min(1, (now - l.t0) / 110);
    const e = 1 - Math.pow(1 - t, 3);
    return l.on ? e : 1 - e;
  }

  function drawBar(i, now) {
    const R = G.rings[i], sv = S.angles[i];
    const { dx, dy } = ringOffset(i, now);
    const lf = liftAmount(i, now);
    const glow = 1 + lf * 1.2 + (hint && hint.i === i ? 0.8 + 0.6 * Math.sin(now / 160) : 0);
    const ax = R.x + dx + R.ux * (sv - R.half), ay = R.y + dy + R.uy * (sv - R.half) - lf * 2.5;
    const bx = R.x + dx + R.ux * (sv + R.half), by = R.y + dy + R.uy * (sv + R.half) - lf * 2.5;
    lineTube(ax, ay, bx, by, R.color, BAR * (1 + lf * 0.08), glow);
    // 两端的镀铬端帽
    for (const [x, y] of [[ax, ay], [bx, by]]) {
      const g = ctx.createRadialGradient(x - 1.5, y - 2, 0.5, x, y, BAR * 0.62);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#b9b6cf'); g.addColorStop(1, '#3d3a50');
      ctx.fillStyle = 'rgba(8,2,20,0.95)'; ctx.beginPath(); ctx.arc(x, y, BAR * 0.62 + 1.2, 0, TAU); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, BAR * 0.62, 0, TAU); ctx.fill();
    }
  }

  function drawRing(i, now) {
    const R = G.rings[i];
    if (R.kind === 'bar') { drawBar(i, now); return; }
    const { dx, dy } = ringOffset(i, now);
    const lf = liftAmount(i, now);
    const cx = R.x + dx, cy = R.y + dy - lf * 2.5, ang = S.angles[i];
    // 抬起时的投影
    if (lf > 0 && R.kind !== 'bar') {
      ctx.save();
      ctx.globalAlpha = 0.35 * lf;
      ctx.strokeStyle = '#000'; ctx.lineWidth = TUBE + 4; ctx.lineCap = 'round';
      ringPath(R, cx + 3, cy + 7, ang)(); ctx.stroke();
      ctx.restore();
    }
    const glow = 1 + lf * 1.2 + (hint && hint.i === i ? 0.8 + 0.6 * Math.sin(now / 160) : 0);
    for (const k of R.knobs) drawKnob(R, cx, cy, ang, k, glow);
    // 滑脱后留在主环上的杆和空夹套，跟着主环一起转
    for (const L of G.links) {
      if (L.owner !== i || S.link[L.k]) continue;
      const a = L.stubAt + ang, c = Math.cos(a), sn = Math.sin(a), sg = L.stubIn ? -1 : 1;
      const r0 = R.r + sg * (TUBE / 2 - 2), r1 = R.r + sg * (L.stubLen - 4), re = R.r + sg * L.stubLen;
      lineTube(cx + c * r0, cy + sn * r0, cx + c * r1, cy + sn * r1, R.color, STEM, glow);
      drawClampAt(L.mode === 'bar' ? SILVER : R.color, cx + c * re, cy + sn * re, a, 1, 1, 0, now);
    }
    const tw = TUBE * (1 + lf * 0.06);
    if (R.gap) { const g = R.gap.at + ang; arcTube(cx, cy, R.r, g + R.gap.w / 2, g - R.gap.w / 2 + TAU, R.color, tw, glow, false, ang); }
    else arcTube(cx, cy, R.r, 0, TAU, R.color, tw, glow, true, ang);
  }

  function drawStem(L, now) {
    const O = G.rings[L.owner];
    const fl = flashLinks[L.k] != null ? Math.max(0, 1 - (now - flashLinks[L.k]) / 700) : 0;
    const { dx, dy } = ringOffset(L.owner, now);
    lineTube(L.sx + dx, L.sy + dy, L.cx, L.cy, O.color, STEM, 1 + fl * 2);
  }

  function drawClamp(L, now, alpha, sc) {
    let fl = flashLinks[L.k] != null ? Math.max(0, 1 - (now - flashLinks[L.k]) / 700) : 0;
    if (C.isOpen(G, S, L)) fl = Math.max(fl, 0.55 + 0.25 * Math.sin(now / 120));
    drawClampAt(L.mode === 'bar' ? SILVER : G.rings[L.owner].color, L.cx, L.cy, L.clampAng + Math.PI, alpha, sc, fl, now);
  }

  // 夹套：方向 dir 为杆的方向（从主环指向夹套）
  function drawClampAt(color, x, y, dir, alpha, sc, fl, now) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(dir + Math.PI / 2);
    ctx.scale(sc * (1 + fl * 0.25 * Math.sin(now / 50) ** 2), sc);
    const w = CLAMP_LEN, h = TUBE + 6;
    if (fl > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(color, 0.35 * fl);
      roundRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14, 9); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // 投影（跟着世界坐标的左上光源走，这里近似成固定偏移）
    ctx.save(); ctx.rotate(-(dir + Math.PI / 2));
    ctx.fillStyle = 'rgba(5,0,15,0.4)'; ctx.beginPath(); ctx.ellipse(2.5, 5, w * 0.62, h * 0.62, dir + Math.PI / 2, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(10,2,25,0.95)';
    roundRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, 5); ctx.fill();
    // 套筒本体：与主环同色的烤漆，横向是圆柱明暗（光从上方来）
    const pg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    pg.addColorStop(0, darken(color, 0.2)); pg.addColorStop(0.18, lighten(color, 0.6)); pg.addColorStop(0.32, color);
    pg.addColorStop(0.75, darken(color, 0.35)); pg.addColorStop(1, darken(color, 0.65));
    ctx.fillStyle = pg;
    roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(-w / 2 + 3, -h / 2 + 2.2, w - 6, 1.6, 0.8); ctx.fill();
    // 两端的镀铬箍：高对比的明暗带，像车上的镀铬饰条
    const cg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    cg.addColorStop(0, '#5d5a70'); cg.addColorStop(0.2, '#ffffff'); cg.addColorStop(0.42, '#a7a4bd'); cg.addColorStop(0.55, '#2a2738');
    cg.addColorStop(0.8, '#d9d6ee'); cg.addColorStop(1, '#4a4760');
    ctx.fillStyle = cg;
    roundRect(-w / 2 - 0.5, -h / 2 - 0.5, 3.4, h + 1, 1.5); ctx.fill();
    roundRect(w / 2 - 2.9, -h / 2 - 0.5, 3.4, h + 1, 1.5); ctx.fill();
    ctx.restore();
  }

  function drawHand(x, y, press, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    // 原创的简笔手指：圆形指尖 + 光圈
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + press * 0.4) + ')';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, 12 + press * 6, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(7, 18, 9, 22, -0.45, 0, TAU);
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, 2, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,61,242,0.9)';
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawHint(now) {
    if (!hint || !S.ring[hint.i] || drag) return;
    const R = G.rings[hint.i];
    if (R.kind === 'bar') {
      const t = ((now - hint.t0) / 1000) % 1.9, sv = S.angles[hint.i];
      const dist = Math.sign(hint.delta) * Math.min(Math.abs(hint.delta), 70);
      let p, press, alpha = 1;
      if (t < 0.3) { p = 0; press = t / 0.3; alpha = t / 0.3; }
      else if (t < 1.4) { const e = (t - 0.3) / 1.1; p = e * e * (3 - 2 * e); press = 1; }
      else { p = 1; press = 1 - (t - 1.4) / 0.5; alpha = press; }
      const x0 = R.x + R.ux * sv, y0 = R.y + R.uy * sv;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([5, 7]);
      ctx.beginPath(); ctx.moveTo(x0 - R.uy * 16, y0 + R.ux * 16); ctx.lineTo(x0 - R.uy * 16 + R.ux * dist, y0 + R.ux * 16 + R.uy * dist); ctx.stroke();
      ctx.restore();
      drawHand(x0 + R.ux * dist * p, y0 + R.uy * dist * p, press, alpha);
      return;
    }
    const t = ((now - hint.t0) / 1000) % 1.9;
    // 在离其他物体最远的位置演示
    const base = Math.atan2(R.y - bounds.cy, R.x - bounds.cx);
    const sweepA = Math.sign(hint.delta) * Math.min(Math.abs(hint.delta), 100 * DEG);
    let p, press, alpha = 1;
    if (t < 0.3) { p = 0; press = t / 0.3; alpha = t / 0.3; }
    else if (t < 1.4) { const e = (t - 0.3) / 1.1; p = e * e * (3 - 2 * e); press = 1; }
    else { p = 1; press = 1 - (t - 1.4) / 0.5; alpha = press; }
    const a = base + sweepA * p;
    const rr = R.r;
    // 方向箭头
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -now / 30 * Math.sign(hint.delta);
    ctx.beginPath(); ctx.arc(R.x, R.y, rr + TUBE + 8, Math.min(base, base + sweepA), Math.max(base, base + sweepA)); ctx.stroke();
    ctx.restore();
    drawHand(R.x + Math.cos(a) * rr, R.y + Math.sin(a) * rr, press, alpha);
  }

  function drawFx(now) {
    const next = fx.filter((f) => {
      const raw = (now - f.t0) / 1000;
      if (f.type === 'short') {
        if (raw < 0) { drawGhost(f, 1, 1); return true; }
        if (raw >= SHORT) { if (!f.burst) { f.burst = true; burst(f); } return false; }
        if (!f.zapped) { f.zapped = true; SFX.zap(); }
        const on = flickOn(raw), hot = raw >= 0.155;
        if (on) drawHalo(f, hot ? 1 : 0.6);
        drawGhost(f, on ? 1 : 0.22, on ? (hot ? 4 : 2.6) : 0.2);
        if (on) drawBolts(f);
        return true;
      }
      if (raw < 0) return true; // 还没轮到（例如连击字要等灯管爆掉）
      const t = raw;
      switch (f.type) {
        case 'smoke': {
          if (t > f.life) return false;
          const k = t / f.life, r = f.r0 + k * 26;
          const g = ctx.createRadialGradient(f.x, f.y - k * 40, 0, f.x, f.y - k * 40, r);
          g.addColorStop(0, 'rgba(70,55,95,' + 0.45 * (1 - k) + ')'); g.addColorStop(1, 'rgba(70,55,95,0)');
          ctx.fillStyle = g; ctx.fillRect(f.x - r, f.y - k * 40 - r, r * 2, r * 2);
          return true;
        }
        case 'flash': {
          if (t > 0.18) return false;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 1.8);
          g.addColorStop(0, 'rgba(255,255,255,' + 0.85 * (1 - t / 0.18) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(f.x - f.r * 2, f.y - f.r * 2, f.r * 4, f.r * 4);
          ctx.restore();
          return true;
        }
        case 'bump': {
          if (t > 0.3) return false;
          ctx.save();
          ctx.globalAlpha = 1 - t / 0.3;
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(f.x, f.y, 6 + t * 40, 0, TAU); ctx.stroke();
          ctx.restore();
          return true;
        }
        case 'slip': {
          if (t > 0.3) return false;
          const L = f.L;
          ctx.save();
          ctx.globalAlpha = 1 - t / 0.3;
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = rgba(f.color, 0.9);
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(L.cx, L.cy, 8 + t * 60, 0, TAU); ctx.stroke();
          ctx.restore();
          return true;
        }
        case 'chunk': {
          if (t > f.life) return false;
          const x = f.x + f.vx * t, y = f.y + f.vy * t + 420 * t * t;
          ctx.save();
          ctx.globalAlpha = t < f.life * 0.6 ? 1 : 1 - (t - f.life * 0.6) / (f.life * 0.4);
          ctx.translate(x, y);
          ctx.rotate(f.vr * t);
          ctx.fillStyle = 'rgba(12,2,30,0.8)';
          ctx.beginPath(); f.pts.forEach(([px, py], q) => (q ? ctx.lineTo(px * 1.25, py * 1.25) : ctx.moveTo(px * 1.25, py * 1.25))); ctx.closePath(); ctx.fill();
          if (f.glowColor && t < 0.25) { ctx.shadowColor = f.glowColor; ctx.shadowBlur = 8 * (1 - t / 0.25) * DPR; }
          ctx.fillStyle = f.color;
          ctx.beginPath(); f.pts.forEach(([px, py], q) => (q ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.45)';
          ctx.beginPath(); ctx.arc(f.pts[0][0] * 0.3, f.pts[0][1] * 0.3, 1.3, 0, TAU); ctx.fill();
          ctx.restore();
          return true;
        }
        case 'shard': {
          if (t > 0.8) return false;
          const x = f.x + f.vx * t, y = f.y + f.vy * t + 520 * t * t;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - t / 0.8);
          ctx.translate(x, y);
          ctx.rotate(f.vr * t);
          const R = f.R;
          neonPath(() => { ctx.beginPath(); ctx.arc(-Math.cos(f.rot) * R.r, -Math.sin(f.rot) * R.r, R.r, f.rot + f.a0, f.rot + f.a1); }, R.color, TUBE * (1 - t * 0.5), 1.4);
          ctx.restore();
          return true;
        }
        case 'pop': {
          if (t > 0.25) return false;
          ctx.save();
          ctx.globalAlpha = 1 - t / 0.25;
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = rgba(f.R.color, 0.6);
          ctx.lineWidth = TUBE * (2 - t * 4);
          ctx.beginPath(); ctx.arc(f.R.x, f.R.y, f.R.r * (1 + t * 1.2), 0, TAU); ctx.stroke();
          ctx.restore();
          return true;
        }
        case 'spark': {
          if (t > f.life) return false;
          ctx.save();
          ctx.globalAlpha = 1 - t / f.life;
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = lighten(f.color, 0.35);
          ctx.beginPath(); ctx.arc(f.x + f.vx * t, f.y + f.vy * t + 260 * t * t, 2.6 * (1 - t / f.life) + 0.8, 0, TAU); ctx.fill();
          ctx.restore();
          return true;
        }
        case 'plus': {
          if (t > 0.9) return false;
          ctx.save();
          ctx.globalAlpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.2;
          ctx.font = '900 italic 20px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffe45c';
          ctx.strokeStyle = 'rgba(40,0,60,0.9)'; ctx.lineWidth = 4;
          ctx.strokeText(f.text, f.x, f.y - t * 50); ctx.fillText(f.text, f.x, f.y - t * 50);
          ctx.restore();
          return true;
        }
        case 'word': {
          if (t > 1.0) return false;
          const s = t < 0.18 ? 0.4 + (t / 0.18) * 0.8 : t < 0.3 ? 1.2 - ((t - 0.18) / 0.12) * 0.2 : 1;
          ctx.save();
          ctx.globalAlpha = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
          ctx.translate(f.x, f.y - t * 26);
          ctx.rotate(-0.08);
          ctx.scale(s, s);
          ctx.font = '900 italic ' + (f.small ? 26 : 34) + 'px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          const g = ctx.createLinearGradient(0, -24, 0, 6);
          g.addColorStop(0, '#fff6c2'); g.addColorStop(0.5, '#ffb36b'); g.addColorStop(1, '#ff3d9a');
          ctx.lineWidth = 7; ctx.strokeStyle = '#2a0750'; ctx.strokeText(f.text, 0, 0);
          ctx.fillStyle = g; ctx.fillText(f.text, 0, 0);
          ctx.restore();
          return true;
        }
      }
      return false;
    });
    fx = next.concat(pendingFx);
    pendingFx = [];
  }

  let lastT = performance.now(), frameCount = 0;
  // RGB 分离（色差）后期：把画面拆成红绿蓝三份，红蓝左右错开再叠回去
  const post = { w: 0, h: 0, src: null, r: null, g: null, b: null };
  function rgbSplit(px) {
    const w = cv.width, h = cv.height;
    if (post.w !== w || post.h !== h) {
      for (const k of ['src', 'r', 'g', 'b']) { post[k] = document.createElement('canvas'); post[k].width = w; post[k].height = h; }
      post.w = w; post.h = h;
    }
    post.src.getContext('2d').drawImage(cv, 0, 0);
    for (const [k, c] of [['r', '#ff0000'], ['g', '#00ff00'], ['b', '#0000ff']]) {
      const x = post[k].getContext('2d');
      x.globalCompositeOperation = 'copy'; x.drawImage(post.src, 0, 0);
      x.globalCompositeOperation = 'multiply'; x.fillStyle = c; x.fillRect(0, 0, w, h);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'copy'; ctx.drawImage(post.g, 0, 0);
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(post.r, px, 0); ctx.drawImage(post.b, -px, 0);
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame() {
    requestAnimationFrame(frame);
    const now = performance.now();
    // 慢镜头：0.28 倍速持续约 1 秒，再在 0.5 秒内恢复
    let sm = 0;
    if (probeHold != null && slowmo) slowmo.t0 = now - probeHold * 1000; // 截图时定格在指定时刻
    if (slowmo) {
      sm = (now - slowmo.t0) / 1000;
      timeScale = sm < 0 ? 1 : sm < 1.0 ? 0.28 : sm < 1.5 ? 0.28 + ((sm - 1.0) / 0.5) * 0.72 : 1;
      if (sm > 1.7) slowmo = null;
    }
    fxClock += (now - fxReal) * timeScale; fxReal = now;
    frameCount++;
    lastT = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(bg, 0, 0);
    if (G) {
      // 慢镜头开始的一瞬间镜头抖一下
      let sx = 0, sy = 0;
      if (slowmo && sm >= 0 && sm < 0.35) { const k = (1 - sm / 0.35) * 7; sx = (Math.random() - 0.5) * k; sy = (Math.random() - 0.5) * k; }
      ctx.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * (ox + sx), DPR * (oy + sy));
      // 层次：杆 → 环（被拖动的最上面）→ 夹套
      for (const L of G.links) if (S.link[L.k]) drawStem(L, now);
      const order = [];
      for (let i = 0; i < G.rings.length; i++) if (S.ring[i] && !(drag && drag.i === i)) order.push(i);
      if (drag && S.ring[drag.i]) order.push(drag.i);
      for (const i of order) drawRing(i, now);
      for (const L of G.links) if (S.link[L.k]) drawClamp(L, now, 1, 1);
      drawHint(now);
      drawFx(fxClock);
    }
    // 慢镜头期间：宽银幕黑边 + RGB 分离（D）
    if (slowmo && sm >= 0) {
      const inK = Math.min(1, sm / 0.25), outK = sm > 1.25 ? Math.max(0, 1 - (sm - 1.25) / 0.4) : 1;
      const bar = H * 0.09 * inK * outK;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#05010d';
      ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
      const ab = sm < 0.12 ? sm / 0.12 : Math.max(0, 1 - (sm - 0.12) / 0.9);
      if (ab > 0.02) rgbSplit(Math.round(6 * DPR * ab));
    }
  }

  // iOS：禁止双指缩放和长按菜单
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchend', () => SFX.ensure(), { passive: true });

  window.addEventListener('resize', resize);
  resize();
  const qLevel = parseInt((location.search.match(/[?&]level=(\d+)/) || [])[1], 10) - 1;
  if (qLevel >= 0 && qLevel < LEVELS.length && unlocked(qLevel)) loadLevel(qLevel);
  else loadLevel(Math.max(0, Math.min(LEVELS.length - 1, Object.keys(progress).length)));
  requestAnimationFrame(frame);
  if (!(qLevel >= 0 && qLevel < LEVELS.length && unlocked(qLevel))) openMenu();
  if (/[?&]open=settings/.test(location.search)) openSettings();
  if (/[?&]debug=fc/.test(location.search)) setTimeout(() => { document.title = 'FC ' + frameCount; }, 1500);
  // 截图检查特效用：?probe=short|burst|slow&pi=环序号&pt=秒
  const probe = (location.search.match(/[?&]probe=(\w+)/) || [])[1];
  if (probe) setTimeout(() => {
    const pi = +((location.search.match(/[?&]pi=(\d+)/) || [])[1] || 0), pt = +((location.search.match(/[?&]pt=([\d.]+)/) || [])[1] || 0.1);
    $('tip').classList.remove('show');
    if (probe === 'slow') { slowmo = { t0: performance.now() - pt * 1000 }; probeHold = pt; frame(); return; }
    const R = G.rings[pi];
    S.ring[pi] = false; G.links.forEach((L) => { if (L.owner === pi || L.held === pi) S.link[L.k] = false; });
    if (probe === 'short') { frame(); fx.push({ type: 'short', i: pi, R, ang: S.angles[pi], t0: fxClock - pt * 1000, combo: 1, stubs: [] }); timeScale = 0; frame(); return; }
    fx.push({ type: 'short', i: pi, R, ang: S.angles[pi], t0: fxTime() - SHORT * 1000 - 1, combo: 2, stubs: [] });
    frame(); fxClock += pt * 1000; timeScale = 0; frame();
  }, 400);
  const qLang = (location.search.match(/[?&]lang=(\w+)/) || [])[1];
  if (qLang) { I18N.set(qLang); refreshTexts(); syncToggles(); }

  // 给验证脚本用的接口
  window.__neon = {
    get state() { return { levelIndex, angles: S.angles.slice(), ring: S.ring.slice(), link: S.link.slice(), moves, score, won, dragging: !!drag, frameCount }; },
    loadLevel,
    toScreen(x, y) { return { x: ox + x * scale, y: oy + y * scale }; },
  };
})();

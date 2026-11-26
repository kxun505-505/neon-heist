/*
 * 交互、动画和渲染。规则判定全部交给 RRCore。
 */
(function () {
  'use strict';
  const C = RRCore, LEVELS = RRLevels, SFX = RRAudio, TAU = C.TAU, DEG = C.DEG;
  const TUBE = C.TUBE, STEM = C.STEM, CLAMP_LEN = C.CLAMP_LEN, KNOB = C.KNOB;
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

  function levelBounds(lv) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of lv.rings) {
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
    fx = []; shakes = {}; lift = {}; flashLinks = {};
    $('lvNum').textContent = 'LEVEL ' + (n + 1);
    $('lvName').textContent = lv.name;
    $('score').textContent = '0';
    $('win').classList.remove('show');
    layout();
    showTip(lv.tip);
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
    let best = -1, bestD = Infinity;
    const tol = TUBE / 2 + 18 / scale;
    G.rings.forEach((R, i) => {
      if (!S.ring[i]) return;
      let d = Math.abs(Math.hypot(p.x - R.x, p.y - R.y) - R.r);
      for (const k of C.knobCircles(G, S, i, S.angles[i])) d = Math.min(d, Math.max(0, Math.hypot(p.x - k.x, p.y - k.y) - k.rad));
      // 环内部也能抓，但优先级低一点
      if (Math.hypot(p.x - R.x, p.y - R.y) < R.r) d = Math.min(d, tol * 0.9);
      if (d < tol && d < bestD) { best = i; bestD = d; }
    });
    return best;
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
      buzz(18);
      if (why === 'owner') {
        // 把它扣住的环闪一下，告诉玩家要先处理谁
        G.links.forEach((L) => { if (S.link[L.k] && L.owner === i) flashLinks[L.k] = performance.now(); });
        showTip('它还扣着别的环，先把被扣住的环转出来', 2600);
      } else showTip('闭合的环转不动，等扣在它身上的环都离开', 2600);
      return;
    }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件 */ }
    const R = G.rings[i];
    drag = { i, id: e.pointerId, last: Math.atan2(p.y - R.y, p.x - R.x), total: 0, tick: 0, lastHit: 0, moved: false };
    lift[i] = { t0: performance.now(), on: true };
    if (hint && !hint.auto) hint = null;
    SFX.grab();
  });

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) {
      if (!drag) break;
      const p = toLogical(ev), R = G.rings[drag.i];
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
    drag.total += Math.abs(moved);
    if (!drag.moved && drag.total > 2 * DEG) {
      drag.moved = true; moves++; everDragged = true;
      if (hint) hint = null;
    }
    drag.tick += Math.abs(moved);
    if (drag.tick > 10 * DEG) { drag.tick = 0; SFX.tick(); }
    handleEvents(events);
  }

  function handleEvents(events) {
    const now = performance.now();
    let flew = 0;
    for (const ev of events) {
      if (ev.type === 'hit') {
        if (now - (drag ? drag.lastHit : 0) > 140) {
          if (drag) drag.lastHit = now;
          SFX.bump();
          buzz(8);
          fx.push({ type: 'bump', x: ev.p.x, y: ev.p.y, t0: now });
          shakes[ev.ring] = now - 200; // 轻微一抖
        }
      } else if (ev.type === 'release') {
        const L = G.links[ev.k];
        fx.push({ type: 'slip', L, t0: now, color: G.rings[L.owner].color });
        SFX.slip();
        buzz(12);
      } else if (ev.type === 'fly') {
        flew++;
        flyAway(ev.i, now);
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
      SFX.free(combo.n - 1);
      if (combo.n >= 2 || flew >= 2) {
        const words = ['', '', 'Great!', 'Excellent!', 'Amazing!', 'Unreal!'];
        const R = G.rings[events.find((e) => e.type === 'fly').i];
        fx.push({ type: 'word', text: words[Math.min(combo.n, 5)], x: R.x, y: R.y - R.r - 20, t0: now });
      } else {
        const R = G.rings[events.find((e) => e.type === 'fly').i];
        fx.push({ type: 'word', text: 'Good!', x: R.x, y: R.y - R.r - 20, t0: now, small: true });
      }
      if (S.ring.every((a) => !a)) win();
    }
  }

  function flyAway(i, now) {
    const R = G.rings[i];
    const ang = S.angles[i];
    const g0 = R.gap ? R.gap.at + ang + R.gap.w / 2 : 0;
    const span = R.gap ? TAU - R.gap.w : TAU;
    const n = Math.round((span * R.r) / 7);
    for (let k = 0; k < n; k++) {
      const a = g0 + span * ((k + Math.random() * 0.6) / n);
      const off = (Math.random() - 0.5) * TUBE * 0.8;
      const x = R.x + Math.cos(a) * (R.r + off), y = R.y + Math.sin(a) * (R.r + off);
      const sp = 40 + Math.random() * 120, out = Math.random() < 0.5 ? 1 : -0.4;
      const pts = [];
      const sides = 4 + Math.floor(Math.random() * 3), size = 3.5 + Math.random() * 3.5;
      for (let q = 0; q < sides; q++) { const pa = (q / sides) * TAU + Math.random() * 0.6; const pr = size * (0.6 + Math.random() * 0.5); pts.push([Math.cos(pa) * pr, Math.sin(pa) * pr]); }
      fx.push({ type: 'chunk', color: R.color, x, y, pts,
        vx: Math.cos(a) * sp * out + (Math.random() - 0.5) * 60, vy: Math.sin(a) * sp * out - 40 - Math.random() * 80,
        vr: (Math.random() - 0.5) * 10, t0: now + Math.random() * 40, life: 0.75 + Math.random() * 0.35 });
    }
    fx.push({ type: 'pop', R, ang, t0: now });
    fx.push({ type: 'plus', x: R.x, y: R.y, t0: now, text: '+' + 200 * Math.min(combo.n + 1, 5) });
    buzz(30);
  }

  function endDrag(e, forced) {
    if (!drag) return;
    if (e && e.pointerId !== drag.id) return;
    lift[drag.i] = { t0: performance.now(), on: false };
    drag = null;
    if (!forced) SFX.drop();
  }
  cv.addEventListener('pointerup', (e) => endDrag(e));
  cv.addEventListener('pointercancel', (e) => endDrag(e));

  function buzz(ms) { if (navigator.vibrate) navigator.vibrate(ms); }

  let scoreTimer = 0;
  function bumpScore() {
    const el = $('scoreBox');
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
      $('winTitle').textContent = last ? '试玩通关！' : ['Nice!', 'Great!', 'Awesome!', 'Superb!'][levelIndex % 4];
      $('winScore').textContent = String(score);
      $('winInfo').textContent = '拖动 ' + moves + ' 次';
      $('btnNext').textContent = last ? '回到关卡' : '下一关 ›';
      $('win').classList.add('show');
    }, 750);
  }

  // ---------- 提示：求解器算出下一步，用手指动画演示 ----------
  function showHint(auto) {
    if (won || !G) return;
    const res = C.solve(G, C.cloneState(S), { maxDepth: 16, maxNodes: 120000 });
    if (!res.moves || !res.moves.length) { showTip('试试重来这一关'); return; }
    const m = res.moves[0];
    hint = { i: m.ring, delta: m.delta, t0: performance.now(), auto: !!auto };
    if (!auto) showTip('跟着手指转动发光的环', 2600);
  }

  // ---------- 按钮 ----------
  function btn(id, fn) { $(id).addEventListener('click', () => { SFX.ensure(); SFX.button(); fn(); }); }
  btn('btnReset', () => loadLevel(levelIndex));
  btn('btnHint', () => showHint(false));
  btn('btnMute', () => { $('btnMute').classList.toggle('off', SFX.toggle()); });
  btn('btnMenu', openMenu);
  btn('btnNext', () => { $('win').classList.remove('show'); if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1); else openMenu(); });
  btn('btnRetry', () => { $('win').classList.remove('show'); loadLevel(levelIndex); });
  $('btnMute').classList.toggle('off', SFX.muted);

  function openMenu() {
    const box = $('levels');
    box.innerHTML = '';
    LEVELS.forEach((lv, n) => {
      const b = document.createElement('button');
      const open = unlocked(n), best = progress[n];
      b.className = 'card' + (open ? '' : ' locked') + (n === levelIndex ? ' current' : '');
      b.innerHTML = '<span class="no">' + (n + 1) + '</span><span class="nm">' + lv.name + (lv.hard ? '<b class="hard">困难</b>' : '') +
        '<small>' + lv.en + '</small></span><span class="st">' + (open ? (best != null ? '✓ ' + best : '') : '🔒') + '</span>';
      if (open) b.addEventListener('click', () => { SFX.ensure(); SFX.button(); $('menu').classList.remove('show'); loadLevel(n); });
      box.appendChild(b);
    });
    // 背景选择：每个场景画一张缩略图
    const bgs = $('bgs');
    bgs.innerHTML = '';
    RRBg.scenes().forEach((name, k) => {
      const b = document.createElement('button');
      b.className = 'bgpick' + (k === bgIndex ? ' on' : '');
      const c = document.createElement('canvas');
      RRBg.paint(c, 72, 120, 2, null, k);
      c.style.width = '100%'; c.style.height = 'auto';
      b.appendChild(c);
      const t = document.createElement('span'); t.textContent = name; b.appendChild(t);
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
  const LX = -0.55, LY = -0.83; // 光线方向（左上）
  function solidTube(center, outline, color, w, glow) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // 霓虹余辉（很淡，只保留氛围）
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(color, 0.07 * glow); ctx.lineWidth = w + 12; center(0, 0); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    // 投影
    ctx.strokeStyle = 'rgba(5,0,15,0.38)'; ctx.lineWidth = w + 2; center(2.2, 4.5); ctx.stroke();
    // 轮廓描边
    ctx.strokeStyle = 'rgba(10,2,25,0.9)'; ctx.lineWidth = w + 2.4; center(0, 0); ctx.stroke();
    ctx.save();
    outline(); ctx.clip('evenodd');
    ctx.strokeStyle = darken(color, 0.42); ctx.lineWidth = w + 2; center(0, 0); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w * 0.92; center(LX * w * 0.14, LY * w * 0.14); ctx.stroke();
    ctx.strokeStyle = lighten(color, 0.42); ctx.lineWidth = w * 0.46; center(LX * w * 0.26, LY * w * 0.26); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.2, w * 0.13); center(LX * w * 0.32, LY * w * 0.32); ctx.stroke();
    // 底部反光（环境光）
    ctx.strokeStyle = rgba(color, 0.55); ctx.lineWidth = w * 0.18; center(-LX * w * 0.36, -LY * w * 0.36); ctx.stroke();
    ctx.restore();
  }
  // 圆弧管：中心线 + 轮廓（带圆头）
  function arcTube(cx, cy, r, a0, a1, color, w, glow, full) {
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
    solidTube(center, outline, color, w, glow);
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
    solidTube(center, outline, color, w, glow);
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

  function drawRing(i, now) {
    const R = G.rings[i];
    const { dx, dy } = ringOffset(i, now);
    const lf = liftAmount(i, now);
    const cx = R.x + dx, cy = R.y + dy - lf * 2.5, ang = S.angles[i];
    // 抬起时的投影
    if (lf > 0) {
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
      const a = L.stubAt + ang, c = Math.cos(a), sn = Math.sin(a);
      const r0 = R.r + TUBE / 2 - 2, r1 = R.r + L.stubLen - 4;
      lineTube(cx + c * r0, cy + sn * r0, cx + c * r1, cy + sn * r1, R.color, STEM, glow);
      drawClampAt(R.color, cx + c * (R.r + L.stubLen), cy + sn * (R.r + L.stubLen), a, 1, 1, 0, now);
    }
    const tw = TUBE * (1 + lf * 0.06);
    if (R.gap) { const g = R.gap.at + ang; arcTube(cx, cy, R.r, g + R.gap.w / 2, g - R.gap.w / 2 + TAU, R.color, tw, glow, false); }
    else arcTube(cx, cy, R.r, 0, TAU, R.color, tw, glow, true);
  }

  function drawStem(L, now) {
    const O = G.rings[L.owner];
    const fl = flashLinks[L.k] != null ? Math.max(0, 1 - (now - flashLinks[L.k]) / 700) : 0;
    const { dx, dy } = ringOffset(L.owner, now);
    lineTube(L.sx + dx, L.sy + dy, L.cx, L.cy, O.color, STEM, 1 + fl * 2);
  }

  function drawClamp(L, now, alpha, sc) {
    const fl = flashLinks[L.k] != null ? Math.max(0, 1 - (now - flashLinks[L.k]) / 700) : 0;
    drawClampAt(G.rings[L.owner].color, L.cx, L.cy, L.clampAng + Math.PI, alpha, sc, fl, now);
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
    // 金属套筒：沿管子方向的圆柱明暗 + 一条镜面反光
    const gr = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    gr.addColorStop(0, darken(color, 0.45)); gr.addColorStop(0.22, lighten(color, 0.25)); gr.addColorStop(0.38, lighten(color, 0.75));
    gr.addColorStop(0.55, color); gr.addColorStop(1, darken(color, 0.5));
    ctx.fillStyle = gr;
    roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-w / 2 + w * 0.3, -h / 2 + 2, 1.6, h - 4);
    // 两道箍
    ctx.fillStyle = 'rgba(10,2,25,0.45)';
    ctx.fillRect(-w / 2 + 2.5, -h / 2, 1.4, h);
    ctx.fillRect(w / 2 - 3.9, -h / 2, 1.4, h);
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
    fx = fx.filter((f) => {
      const t = Math.max(0, (now - f.t0) / 1000);
      switch (f.type) {
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
          ctx.fillStyle = f.color;
          ctx.beginPath(); f.pts.forEach(([px, py], q) => (q ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); ctx.fill();
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
  }

  let lastT = performance.now(), frameCount = 0;
  function frame() {
    const now = performance.now();
    frameCount++;
    lastT = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(bg, 0, 0);
    if (G) {
      ctx.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * ox, DPR * oy);
      // 层次：杆 → 环（被拖动的最上面）→ 夹套
      for (const L of G.links) if (S.link[L.k]) drawStem(L, now);
      const order = [];
      for (let i = 0; i < G.rings.length; i++) if (S.ring[i] && !(drag && drag.i === i)) order.push(i);
      if (drag && S.ring[drag.i]) order.push(drag.i);
      for (const i of order) drawRing(i, now);
      for (const L of G.links) if (S.link[L.k]) drawClamp(L, now, 1, 1);
      drawHint(now);
      drawFx(now);
    }
    requestAnimationFrame(frame);
  }

  // iOS：禁止双指缩放和长按菜单
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchend', () => SFX.ensure(), { passive: true });

  window.addEventListener('resize', resize);
  resize();
  const qLevel = parseInt((location.search.match(/[?&]level=(\d+)/) || [])[1], 10) - 1;
  if (qLevel >= 0 && qLevel < LEVELS.length && unlocked(qLevel)) loadLevel(qLevel);
  else { loadLevel(Math.max(0, Math.min(LEVELS.length - 1, Object.keys(progress).length))); openMenu(); }
  requestAnimationFrame(frame);

  // 给验证脚本用的接口
  window.__neon = {
    get state() { return { levelIndex, angles: S.angles.slice(), ring: S.ring.slice(), link: S.link.slice(), moves, score, won, dragging: !!drag, frameCount }; },
    loadLevel,
    toScreen(x, y) { return { x: ox + x * scale, y: oy + y * scale }; },
  };
})();

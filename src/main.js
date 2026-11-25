/*
 * 交互、动画和渲染。规则判定全部交给 RRCore。
 */
(function () {
  'use strict';
  const C = RRCore, LEVELS = RRLevels, SFX = RRAudio, TAU = C.TAU, DEG = C.DEG, STROKE = C.STROKE;
  const BOARD = 440;                       // 棋盘逻辑尺寸
  const PROGRESS_KEY = 'neonloops-progress';
  const UNLOCK_ALL = /[?&]unlock/.test(location.search);

  const $ = (id) => document.getElementById(id);
  const cv = $('game'), ctx = cv.getContext('2d');
  const bg = document.createElement('canvas');
  let W = 0, H = 0, DPR = 1, scale = 1, ox = 0, oy = 0;

  // ---------- 存档 ----------
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch (e) { return {}; }
  }
  let progress = loadProgress();          // { [levelIndex]: stars }
  function saveStars(n, stars) {
    if ((progress[n] || 0) < stars) progress[n] = stars;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }
  const unlocked = (n) => UNLOCK_ALL || n === 0 || progress[n - 1] > 0;

  // ---------- 关卡状态 ----------
  let levelIndex = 0, G = null, angles = [], alive = [], par = 0, moves = 0, history = [];
  let drag = null, coast = null, snapAnim = null, busy = false, hint = null, won = false;
  let flying = [], sparks = [], shakes = {}, unlockFx = [], pulse = 0, rodPhase = 0;

  function loadLevel(n) {
    levelIndex = n;
    G = C.build(LEVELS[n]);
    angles = G.angles0.slice();
    alive = G.alive0.slice();
    const sol = C.solve(G, angles, alive);
    par = sol.moves ? sol.moves.length : 0;
    moves = 0; history = []; drag = coast = snapAnim = hint = null; busy = false; won = false;
    flying = []; sparks = []; shakes = {}; unlockFx = [];
    $('lvNum').textContent = 'LEVEL ' + (n + 1) + ' / ' + LEVELS.length;
    $('lvName').textContent = LEVELS[n].name + ' · ' + LEVELS[n].en;
    showTip(LEVELS[n].tip);
    updateHud();
  }

  function updateHud() {
    $('moves').innerHTML = '步数 <b>' + moves + '</b><span>最少 ' + par + '</span>';
    $('btnUndo').disabled = !history.length || busy;
  }

  let tipTimer = 0;
  function showTip(text) {
    const el = $('tip');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => el.classList.remove('show'), 4500);
  }

  // ---------- 坐标 ----------
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const top = 86, bottom = 96;
    const avail = Math.max(200, H - top - bottom);
    scale = Math.min(W * 0.96, avail) / BOARD;
    ox = W / 2; oy = top + avail / 2;
    RRBg.paint(bg, W, H, DPR, { x: ox, y: oy, r: (BOARD / 2) * scale });
  }
  const toLogical = (e) => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });

  function pickRing(p) {
    let best = -1, bestD = Infinity;
    const tol = STROKE / 2 + 14 / Math.max(scale, 0.6);
    G.rings.forEach((R, i) => {
      if (!alive[i]) return;
      const d = Math.abs(Math.hypot(p.x - R.x, p.y - R.y) - R.r);
      if (d < tol && d < bestD) { best = i; bestD = d; }
    });
    return best;
  }

  // ---------- 输入 ----------
  cv.addEventListener('pointerdown', (e) => {
    SFX.ensure();
    if (busy || won || !G) return;
    const p = toLogical(e);
    const i = pickRing(p);
    if (i < 0) return;
    if (!C.canRotate(G, i, alive)) {
      // 被锁、被固定或被联动卡住时，整组一起抖
      C.rotationGroup(G, i, alive).forEach(({ j }) => { shakes[j] = performance.now(); });
      SFX.locked();
      if (navigator.vibrate) navigator.vibrate([10, 40, 10]);
      const R = G.rings[i];
      if (R.fixed) showTip('这个环被螺栓固定了，转不动');
      else if (C.isLocked(G, i, alive)) showTip('先让同色的钥匙环脱出才能解锁');
      else showTip('联动的另一个环被锁住了');
      return;
    }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件没有真实指针 */ }
    const R = G.rings[i];
    drag = {
      i, id: e.pointerId,
      last: Math.atan2(p.y - R.y, p.x - R.x),
      snapshot: { angles: angles.slice(), alive: alive.slice() },
      total: 0, omega: 0, t: performance.now(), tick: 0,
    };
  });

  cv.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const p = toLogical(e), R = G.rings[drag.i];
    // 离圆心太近时角度会乱跳，忽略
    if (Math.hypot(p.x - R.x, p.y - R.y) < 12) return;
    const a = Math.atan2(p.y - R.y, p.x - R.x);
    const d = C.angDiff(a, drag.last);
    drag.last = a;
    const now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
    drag.t = now;
    angles = C.rotate(G, drag.i, d, angles, alive);
    drag.total += Math.abs(d);
    drag.omega = drag.omega * 0.6 + (d / dt) * 0.4;
    drag.tick += Math.abs(d);
    if (drag.tick > 9 * DEG) { drag.tick = 0; SFX.tick(); }
    rodPhase += d;
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    // 停顿后松手不应带惯性
    const idle = performance.now() - d.t > 60;
    if (d.total < 1.5 * DEG) { angles = d.snapshot.angles; return; }
    moves++;
    history.push(d.snapshot);
    hint = null;
    busy = true;
    const om = idle ? 0 : Math.max(-14, Math.min(14, d.omega));
    if (Math.abs(om) > 4) coast = { i: d.i, omega: om };
    else settle(d.i);
    updateHud();
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  // ---------- 松手后的惯性、吸附、脱出 ----------
  function settle(i) {
    const d = C.snapDelta(G, i, angles, alive);
    if (d !== null && Math.abs(d) > 0.05 * DEG) {
      snapAnim = { i, from: angles.slice(), d, t0: performance.now(), dur: 110 + Math.min(120, (Math.abs(d) / DEG) * 6) };
    } else {
      if (d !== null) SFX.snap();
      resolve(0);
    }
  }

  function resolve(wave) {
    const free = C.findFree(G, angles, alive);
    if (!free.length) {
      busy = false;
      updateHud();
      if (alive.every((a) => !a)) win();
      return;
    }
    const now = performance.now();
    free.forEach((i) => {
      alive[i] = false;
      const R = G.rings[i];
      let dx = R.x, dy = R.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) { dx = 0; dy = -1; } else { dx /= len; dy /= len; }
      flying.push({ i, t0: now, dx, dy, ang: angles[i], spin: (Math.random() - 0.5) * 3 });
      for (let k = 0; k < 26; k++) {
        const a = Math.random() * TAU, sp = 60 + Math.random() * 220;
        sparks.push({
          x: R.x + Math.cos(a) * R.r, y: R.y + Math.sin(a) * R.r,
          vx: Math.cos(a) * sp + dx * 80, vy: Math.sin(a) * sp + dy * 80,
          t0: now, life: 0.5 + Math.random() * 0.4, color: R.color,
        });
      }
      // 解锁效果
      G.rings.forEach((Q, j) => { if (Q.lock === i && alive[j]) { unlockFx.push({ j, t0: now }); SFX.unlock(); } });
    });
    SFX.free(wave);
    if (navigator.vibrate) navigator.vibrate(25);
    setTimeout(() => resolve(wave + 1), 240);
  }

  function win() {
    won = true;
    const stars = moves <= par ? 3 : moves <= par + 2 ? 2 : 1;
    saveStars(levelIndex, stars);
    setTimeout(() => {
      SFX.win();
      $('winStars').innerHTML = [0, 1, 2].map((k) => '<i class="' + (k < stars ? 'on' : '') + '" style="animation-delay:' + (0.15 + k * 0.15) + 's">★</i>').join('');
      $('winInfo').textContent = '用了 ' + moves + ' 步 · 最少 ' + par + ' 步';
      $('btnNext').style.display = levelIndex < LEVELS.length - 1 ? '' : 'none';
      $('winTitle').textContent = levelIndex < LEVELS.length - 1 ? '过关！' : '试玩通关！';
      $('win').classList.add('show');
    }, 650);
  }

  // ---------- 按钮 ----------
  function btn(id, fn) {
    $(id).addEventListener('click', () => { SFX.ensure(); SFX.button(); fn(); });
  }
  btn('btnUndo', () => {
    if (busy || won || !history.length) return;
    const s = history.pop();
    angles = s.angles; alive = s.alive; moves = Math.max(0, moves - 1); hint = null;
    updateHud();
  });
  btn('btnReset', () => { if (!busy) loadLevel(levelIndex); });
  btn('btnHint', () => {
    if (busy || won) return;
    const res = C.solve(G, angles, alive);
    if (!res.moves || !res.moves.length) return;
    const m = res.moves[0];
    hint = { i: m.ring, delta: m.delta, t0: performance.now() };
    showTip('照着箭头转动发光的环');
  });
  btn('btnMute', () => { $('btnMute').classList.toggle('off', SFX.toggle()); });
  btn('btnMenu', openMenu);
  btn('btnNext', () => { $('win').classList.remove('show'); loadLevel(levelIndex + 1); });
  btn('btnRetry', () => { $('win').classList.remove('show'); loadLevel(levelIndex); });
  btn('btnLevels', () => { $('win').classList.remove('show'); openMenu(); });
  $('btnMute').classList.toggle('off', SFX.muted);

  function openMenu() {
    const box = $('levels');
    box.innerHTML = '';
    LEVELS.forEach((lv, n) => {
      const b = document.createElement('button');
      const open = unlocked(n);
      b.className = 'card' + (open ? '' : ' locked');
      const st = progress[n] || 0;
      b.innerHTML = '<span class="no">' + (n + 1) + '</span><span class="nm">' + lv.name + '<small>' + lv.en + '</small></span>' +
        '<span class="st">' + (open ? '★★★'.split('').map((s, k) => '<i class="' + (k < st ? 'on' : '') + '">★</i>').join('') : '🔒') + '</span>';
      if (open) b.addEventListener('click', () => { SFX.ensure(); SFX.button(); $('menu').classList.remove('show'); loadLevel(n); });
      box.appendChild(b);
    });
    $('menu').classList.add('show');
  }

  // ---------- 绘制 ----------
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function lighten(hex, t) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.round(c + (255 - c) * t);
    return 'rgb(' + f(n >> 16) + ',' + f((n >> 8) & 255) + ',' + f(n & 255) + ')';
  }

  function solidArcs(R, ang) {
    if (!R.gaps.length) return [[0, TAU]];
    const gs = R.gaps.map((g) => ({ c: C.norm(g.at + ang), h: g.w / 2 })).sort((a, b) => a.c - b.c);
    const out = [];
    for (let k = 0; k < gs.length; k++) {
      const s = gs[k].c + gs[k].h;
      let e = gs[(k + 1) % gs.length].c - gs[(k + 1) % gs.length].h;
      while (e <= s) e += TAU;
      out.push([s, e]);
    }
    return out;
  }

  function inGap(R, ang, worldA) {
    return R.gaps.some((g) => Math.abs(C.angDiff(worldA, g.at + ang)) < g.w / 2);
  }

  function tube(R, cx, cy, arcs, color, glowPx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    // 外发光
    ctx.shadowColor = color;
    ctx.shadowBlur = glowPx * DPR;
    ctx.strokeStyle = color;
    ctx.lineWidth = STROKE;
    for (const [a0, a1] of arcs) { ctx.beginPath(); ctx.arc(cx, cy, R.r, a0, a1); ctx.stroke(); }
    ctx.shadowBlur = 0;
    // 管子暗边，增加立体感
    ctx.strokeStyle = 'rgba(20,0,40,0.35)';
    ctx.lineWidth = 2;
    for (const [a0, a1] of arcs) {
      ctx.beginPath(); ctx.arc(cx, cy, R.r + STROKE / 2 - 1, a0, a1); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R.r - STROKE / 2 + 1, a0, a1); ctx.stroke();
    }
    // 高亮芯
    ctx.strokeStyle = lighten(color, 0.65);
    ctx.lineWidth = STROKE * 0.32;
    for (const [a0, a1] of arcs) { ctx.beginPath(); ctx.arc(cx, cy, R.r - 1.5, a0, a1); ctx.stroke(); }
    ctx.restore();
  }

  function chromeTube(R, cx, cy, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(cx - R.r, cy - R.r, cx + R.r, cy + R.r);
    g.addColorStop(0, '#f4f1ff'); g.addColorStop(0.5, '#7d7598'); g.addColorStop(1, '#e8e2ff');
    ctx.strokeStyle = g;
    ctx.lineWidth = STROKE + 2;
    ctx.shadowColor = 'rgba(200,190,255,0.6)';
    ctx.shadowBlur = 8 * DPR;
    ctx.beginPath(); ctx.arc(cx, cy, R.r, 0, TAU); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(30,10,50,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, R.r + STROKE / 2, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, R.r - STROKE / 2, 0, TAU); ctx.stroke();
    // 螺栓
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      const bx = cx + Math.cos(a) * R.r, by = cy + Math.sin(a) * R.r;
      ctx.fillStyle = '#3a3150';
      ctx.beginPath(); ctx.arc(bx, by, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#d8d2f0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx - 3, by - 3); ctx.lineTo(bx + 3, by + 3); ctx.stroke();
    }
    ctx.restore();
  }

  function notches(R, cx, cy, ang, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha * 0.5;
    ctx.fillStyle = 'rgba(25,0,45,0.9)';
    for (let k = 0; k < 12; k++) {
      const a = ang + (k * TAU) / 12 + TAU / 24;
      if (inGap(R, ang, a) || R.gaps.some((g) => Math.abs(C.angDiff(a, g.at + ang)) < g.w / 2 + 0.15)) continue;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R.r, cy + Math.sin(a) * R.r, 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawRing(i, cx, cy, ang, alpha, extraGlow) {
    const R = G.rings[i];
    if (R.fixed) chromeTube(R, cx, cy, alpha);
    else { tube(R, cx, cy, solidArcs(R, ang), R.color, 16 + extraGlow, alpha); notches(R, cx, cy, ang, alpha); }
  }

  // 交叉处一上一下，形成链环相扣的效果
  function drawOverlaps() {
    for (const L of G.links) {
      if (!alive[L.a] || !alive[L.b]) continue;
      L.pts.forEach((p, k) => {
        const top = k === 0 ? L.a : L.b;
        const R = G.rings[top];
        const pa = top === L.a ? p.angA : p.angB;
        const ang = angles[top];
        if (!R.fixed && inGap(R, ang, pa)) return;
        const span = (STROKE * 1.5) / R.r;
        const { dx, dy } = offsetOf(top);
        const cx = R.x + dx, cy = R.y + dy;
        ctx.save();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = 'rgba(12,2,30,0.95)';
        ctx.lineWidth = STROKE + 7;
        ctx.beginPath(); ctx.arc(cx, cy, R.r, pa - span, pa + span); ctx.stroke();
        ctx.restore();
        const arcs = [[pa - span - 0.02, pa + span + 0.02]];
        if (R.fixed) {
          ctx.save();
          ctx.strokeStyle = '#bdb6d8'; ctx.lineWidth = STROKE + 2;
          ctx.beginPath(); ctx.arc(cx, cy, R.r, arcs[0][0], arcs[0][1]); ctx.stroke();
          ctx.strokeStyle = '#f4f1ff'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy, R.r - 2, arcs[0][0], arcs[0][1]); ctx.stroke();
          ctx.restore();
        } else {
          tube(R, cx, cy, arcs, R.color, 6, 1);
        }
      });
    }
  }

  function offsetOf(i) {
    const s = shakes[i];
    if (!s) return { dx: 0, dy: 0 };
    const t = (performance.now() - s) / 1000;
    if (t > 0.35) { delete shakes[i]; return { dx: 0, dy: 0 }; }
    return { dx: Math.sin(t * 70) * 5 * (1 - t / 0.35), dy: 0 };
  }

  function drawPadlock(x, y, color, s, open) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.shadowColor = color; ctx.shadowBlur = 10 * DPR;
    ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (open) { ctx.arc(0, -9, 7, Math.PI, Math.PI * 1.9); }
    else { ctx.arc(0, -6, 7, Math.PI, 0); ctx.lineTo(7, 0); ctx.moveTo(-7, -6); ctx.lineTo(-7, 0); }
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(-11, -1, 22, 17, 4); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#14052b';
    ctx.beginPath(); ctx.arc(0, 6, 2.6, 0, TAU); ctx.fill();
    ctx.fillRect(-1.2, 6, 2.4, 6);
    ctx.restore();
  }

  function drawKey(x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.shadowColor = color; ctx.shadowBlur = 10 * DPR;
    ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-9, 0, 6, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(13, 0); ctx.moveTo(8, 0); ctx.lineTo(8, 5); ctx.moveTo(12, 0); ctx.lineTo(12, 4); ctx.stroke();
    ctx.restore();
  }

  function drawCouples() {
    for (const c of G.couples) {
      if (!alive[c.a] || !alive[c.b]) continue;
      const A = G.rings[c.a], B = G.rings[c.b];
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(12,2,30,0.9)';
      ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.strokeStyle = '#ffe36b';
      ctx.shadowColor = '#ffe36b'; ctx.shadowBlur = 8 * DPR;
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = -rodPhase * 30;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.setLineDash([]);
      for (const [R, j] of [[A, c.a], [B, c.b]]) {
        ctx.fillStyle = '#1a0838';
        ctx.beginPath(); ctx.arc(R.x, R.y, 13, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(R.x, R.y, 13, 0, TAU); ctx.stroke();
        // 小齿轮，跟着环转
        ctx.save();
        ctx.translate(R.x, R.y); ctx.rotate(angles[j]);
        for (let k = 0; k < 6; k++) { ctx.rotate(TAU / 6); ctx.fillStyle = '#ffe36b'; ctx.fillRect(-1.5, -10, 3, 5); }
        ctx.restore();
      }
      ctx.restore();
    }
  }

  function drawIcons(now) {
    G.rings.forEach((R, i) => {
      if (!alive[i]) return;
      const { dx } = offsetOf(i);
      if (R.lock >= 0 && alive[R.lock]) drawPadlock(R.x + dx, R.y, G.rings[R.lock].color, 1, false);
      if (G.rings.some((Q, j) => alive[j] && Q.lock === i)) drawKey(R.x, R.y + (G.couples.some((c) => alive[c.a] && alive[c.b] && (c.a === i || c.b === i)) ? 26 : 0), R.color);
      if (R.fixed) {
        ctx.save();
        ctx.fillStyle = '#c9c3e6'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.globalAlpha = 0.75;
        ctx.fillText('固定', R.x, R.y + 4);
        ctx.restore();
      }
    });
    unlockFx = unlockFx.filter((u) => {
      const t = (now - u.t0) / 1000;
      if (t > 0.6) return false;
      const R = G.rings[u.j];
      ctx.save();
      ctx.globalAlpha = 1 - t / 0.6;
      drawPadlock(R.x, R.y - t * 40, '#ffffff', 1 + t * 0.6, true);
      ctx.restore();
      return true;
    });
  }

  function drawHint(now) {
    if (!hint || !alive[hint.i]) return;
    const R = G.rings[hint.i];
    const t = (now - hint.t0) / 1000;
    const a = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + a * 0.5) + ')';
    ctx.lineWidth = STROKE + 10;
    ctx.beginPath(); ctx.arc(R.x, R.y, R.r, 0, TAU); ctx.stroke();
    // 箭头：沿环外侧，从当前缺口指向目标
    const g = R.gaps[0];
    if (g) {
      const from = g.at + angles[hint.i], to = from + hint.delta;
      const rr = R.r + STROKE + 8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -t * 30 * Math.sign(hint.delta);
      ctx.beginPath(); ctx.arc(R.x, R.y, rr, Math.min(from, to), Math.max(from, to)); ctx.stroke();
      ctx.setLineDash([]);
      const hx = R.x + Math.cos(to) * rr, hy = R.y + Math.sin(to) * rr;
      const dir = to + (Math.sign(hint.delta) * Math.PI) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(dir) * 9, hy + Math.sin(dir) * 9);
      ctx.lineTo(hx + Math.cos(dir + 2.4) * 8, hy + Math.sin(dir + 2.4) * 8);
      ctx.lineTo(hx + Math.cos(dir - 2.4) * 8, hy + Math.sin(dir - 2.4) * 8);
      ctx.fill();
    }
    ctx.restore();
  }

  let lastT = performance.now(), frameCount = 0;
  function update(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    pulse += dt;

    // 惯性
    if (coast) {
      const d = coast.omega * dt;
      angles = C.rotate(G, coast.i, d, angles, alive);
      rodPhase += d;
      coast.omega *= Math.exp(-dt * 7);
      if (Math.abs(coast.omega) < 2.2) { const i = coast.i; coast = null; settle(i); }
    }
    // 吸附动画
    if (snapAnim) {
      const t = Math.min(1, (now - snapAnim.t0) / snapAnim.dur);
      const e = 1 - Math.pow(1 - t, 3);
      angles = C.rotate(G, snapAnim.i, snapAnim.d * e, snapAnim.from, alive);
      if (t >= 1) { snapAnim = null; SFX.snap(); if (navigator.vibrate) navigator.vibrate(12); resolve(0); }
    }

  }

  function frame(now) {
    frameCount++;
    update(now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    if (G) {
      ctx.setTransform(DPR * scale, 0, 0, DPR * scale, DPR * ox, DPR * oy);
      drawCouples();
      G.rings.forEach((R, i) => {
        if (!alive[i]) return;
        const { dx, dy } = offsetOf(i);
        const grab = (drag && C.rotationGroup(G, drag.i, alive).some((x) => x.j === i)) ? 10 : 0;
        drawRing(i, R.x + dx, R.y + dy, angles[i], 1, grab);
      });
      drawOverlaps();
      drawIcons(now);
      drawHint(now);

      // 脱出的环飞走
      flying = flying.filter((f) => {
        const t = (now - f.t0) / 1000;
        if (t > 0.7) return false;
        const R = G.rings[f.i];
        const e = t * t;
        ctx.save();
        ctx.translate(R.x + f.dx * e * 900, R.y + f.dy * e * 900);
        ctx.scale(1 + t * 0.5, 1 + t * 0.5);
        drawRing(f.i, 0, 0, f.ang + f.spin * t, Math.max(0, 1 - t / 0.7), 20);
        ctx.restore();
        return true;
      });
      sparks = sparks.filter((s) => {
        const t = (now - s.t0) / 1000;
        if (t > s.life) return false;
        ctx.save();
        ctx.globalAlpha = 1 - t / s.life;
        ctx.fillStyle = lighten(s.color, 0.4);
        ctx.shadowColor = s.color; ctx.shadowBlur = 6 * DPR;
        ctx.beginPath(); ctx.arc(s.x + s.vx * t, s.y + s.vy * t + 120 * t * t, 2.4 * (1 - t / s.life) + 0.6, 0, TAU); ctx.fill();
        ctx.restore();
        return true;
      });
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  // ?level=N 直接进入第 N 关（需已解锁，或同时带 ?unlock）
  const qLevel = parseInt((location.search.match(/[?&]level=(\d+)/) || [])[1], 10) - 1;
  if (qLevel >= 0 && qLevel < LEVELS.length && unlocked(qLevel)) loadLevel(qLevel);
  else { loadLevel(0); openMenu(); }
  requestAnimationFrame(frame);

  // 给验证脚本用的只读接口
  window.__neon = {
    get state() { return { levelIndex, angles: angles.slice(), alive: alive.slice(), moves, par, won, busy, coast, snapAnim: snapAnim && { i: snapAnim.i, d: snapAnim.d, age: performance.now() - snapAnim.t0 }, drag: !!drag, frameCount }; },
    loadLevel,
    step(ms) { const t = performance.now() + (ms || 0); update(t); },
    toScreen(x, y) { return { x: ox + x * scale, y: oy + y * scale }; },
  };
})();

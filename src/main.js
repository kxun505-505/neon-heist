/*
 * 交互、动画和渲染。规则判定全部交给 RRCore。
 */
(function () {
  'use strict';
  const C = RRCore, LEVELS = RRLevels, SFX = RRAudio, HAP = RRHaptics, I18N = RRI18n, t = RRI18n.t, TAU = C.TAU, DEG = C.DEG;
  const TUBE = C.TUBE, STEM = C.STEM, CLAMP_LEN = C.CLAMP_LEN, KNOB = C.KNOB, BAR = C.BAR;
  const SILVER = '#cfcbe3';
  const PROGRESS_KEY = 'neonloops-progress-v2';
  // 换皮：?skin=heist 或 <html data-skin="heist">（撬锁劫案风格测试）。<html data-test-level="N">：只玩第 N 关，不显示主页和女生
  const SKIN = (location.search.match(/[?&]skin=(\w+)/) || [])[1] || document.documentElement.dataset.skin || 'classic';
  const HEIST = SKIN === 'heist' && !!window.RRHeistAudio, HA = window.RRHeistAudio;
  const TEST_LEVEL = +((location.search.match(/[?&]test=(\d+)/) || [])[1] || document.documentElement.dataset.testLevel || 0);
  document.documentElement.classList.toggle('skin-heist', HEIST);
  document.documentElement.classList.toggle('test-solo', !!TEST_LEVEL);
  const UNLOCK_ALL = !!TEST_LEVEL || /[?&]unlock/.test(location.search);
  // 劫案皮肤的两种画法：A 'paint' 烤漆管（默认）；B 'cine' 电影感（高清金属 + 夕阳调色 + 胶片颗粒），?look=cine 或测试页上的切换按钮
  let LOOK = (location.search.match(/[?&]look=([\w-]+)/) || [])[1] || (() => { try { return localStorage.getItem('neonheist-look'); } catch (e) { return null; } })() || 'paint';
  // C 'cine-clean'：电影感，但消除零件时不撒钞票（用户 11-28：消除时画面太乱）
  // D 'real'：写实高清（用户 11-28：在 C 的基础上，更接近写实大作的美术、更清晰、锁扣小 15%、正式的按钮）
  // E 'e'：按 docs/art-bible.md 统一（场景层写实 + 界面层海报风，7 色色板，一个光源，背景虚化，没有保险柜门板）
  const ELOOK = HEIST && LOOK === 'e';
  const REAL = HEIST && (LOOK === 'real' || ELOOK);
  const CINE = HEIST && (LOOK === 'cine' || LOOK === 'cine-clean' || REAL);
  const NOBILLS = HEIST && (LOOK === 'cine-clean' || REAL);
  document.documentElement.classList.toggle('look-e', ELOOK);
  if (ELOOK && document.fonts && document.fonts.load) document.fonts.load('40px Anton');
  document.documentElement.classList.toggle('look-cine', CINE);
  document.documentElement.classList.toggle('look-real', REAL);
  // 测试页上的 A/B 切换按钮
  if (HEIST && (TEST_LEVEL || /[?&]looks/.test(location.search))) window.addEventListener('DOMContentLoaded', () => {
    const box = document.createElement('div'); box.id = 'lookSwitch';
    box.innerHTML = '<button data-l="paint">A</button><button data-l="cine">B</button><button data-l="cine-clean">C</button><button data-l="real">D</button><button data-l="e">E 统一</button>';
    box.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('on', b.dataset.l === (ELOOK ? 'e' : REAL ? 'real' : NOBILLS ? 'cine-clean' : CINE ? 'cine' : 'paint'));
      b.addEventListener('click', () => { try { localStorage.setItem('neonheist-look', b.dataset.l); } catch (e) { /* 隐私模式 */ } location.href = location.pathname + location.search.replace(/[?&]look=[\w-]+/, ''); });
    });
    document.body.appendChild(box);
    if (REAL) {
      // 正式按钮：图标换成 SVG
      const ico = {
        btnReset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4"/><path fill="currentColor" d="M3.2 3.6v6h6z"/></svg>',
        btnHint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 21h6v-1.6H9zm3-19a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z"/></svg>',
      };
      for (const id in ico) { const b = document.querySelector('#' + id + ' b'); if (b) b.outerHTML = '<i class="bi">' + ico[id] + '</i>'; }
    }
  });
  const money = (n) => (HEIST ? '$' + Number(n).toLocaleString('en-US') : String(n));
  // 背景跟着章节走；?bg=N 只用于测试时强制指定
  const qBg = (location.search.match(/[?&]bg=(\d+)/) || [])[1];
  let bgIndex = 0;
  const CH = RRChapters, PER = CH.PER_CHAPTER, SETN = CH.SET;
  const chapterIndex = (n) => Math.min(CH.list.length - 1, Math.floor(n / PER));
  const chapterOf = (n) => CH.list[chapterIndex(n)];
  // 奖励：每关 1 张照片；每 5 关的第 5 关是困难关，解锁视频
  const levelOfPhoto = (ci, k) => ci * PER + Math.floor(k / (SETN - 1)) * SETN + (k % (SETN - 1));
  const levelOfVideo = (ci, k) => ci * PER + k * SETN + SETN - 1;
  const cleared = (n) => progress[n] != null;
  const chapterDone = (ci) => { for (let n = ci * PER; n < (ci + 1) * PER; n++) if (!cleared(n)) return false; return true; };
  const chapterCount = (ci) => { let c = 0; for (let n = ci * PER; n < (ci + 1) * PER; n++) if (cleared(n)) c++; return c; };
  // 背景（和章节）解锁标准：上一章 20 关全部通关
  const bgUnlocked = (ci) => ci === 0 || chapterDone(ci - 1);
  

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
  let lastProgress = performance.now(), lastStuck = 0, blockedTaps = [];
  let drag = null, hint = null, combo = { n: 0, t: 0 };
  let fx = [];            // 各种一次性动画
  let stampAt = 0;        // 劫案皮肤：过关时盖“VAULT OPEN”章的时刻（真实时间）
  let shakes = {}, lift = {}, flashLinks = {};
  // 特效时钟：结尾慢镜头时只让特效变慢（输入和界面照常）
  let timeScale = 1, fxClock = 0, fxReal = performance.now(), slowmo = null, probeHold = null;
  const fxTime = () => fxClock + (performance.now() - fxReal) * timeScale;

  // 零件占地（含转动时扫过的凸钉和空夹套杆），排版和特效方向都用它
  let footprint = null;

  function loadLevel(n) {
    levelIndex = n;
    const lv = LEVELS[n];
    G = C.build(lv);
    S = C.initState(G);
    if (ELOOK) G.rings.forEach((R) => { R.color = PAL7[R.color.toLowerCase()] || R.color; }); // 只改画面用的颜色
    footprint = RRLayout.footprint(lv);
    bounds = RRLayout.boundsOf(footprint);
    moves = 0; score = 0; shownScore = 0; won = false;
    drag = null; hint = null; combo = { n: 0, t: 0 };
    fx = []; shakes = {}; lift = {}; flashLinks = {}; slowmo = null; timeScale = 1; stampAt = 0; rain = []; counted = -1;
    const chap = chapterOf(n);
    $('lvName').textContent = chap.name + ' · ' + ((n % PER) + 1);
    $('lvNum').textContent = t('level') + ' ' + (n + 1);
    bgIndex = qBg != null ? +qBg - 1 : CINE ? 0 : chap.bg; // 电影感用日落海岸（迈阿密黄金时刻）
    // E 测试页：把第 1 章的 Kira 放进画面看效果（第 28 关属于第 2 章，第 2 章的角色还是占位图）
    Girl.setChapter(ELOOK && TEST_LEVEL ? (Girl.testChap = Girl.testChap || Object.assign({}, chap, { girl: CH.list[0].girl })) : chap);
    lastProgress = performance.now(); blockedTaps = [];
    if (n % PER === 0 && progress[n] == null) setTimeout(() => Girl.react('greet'), 600);
    else if (ELOOK && TEST_LEVEL && !Girl.testGreeted) { Girl.testGreeted = true; setTimeout(() => Girl.react('greet'), 600); }
    $('score').textContent = money(0);
    $('win').classList.remove('show');
    layout();
    showTip(t('tips')[n] || '');
    if (CH.isHard(n)) showBanner();
    if (n === 0 && !everDragged) setTimeout(() => { if (levelIndex === 0 && !everDragged) showHint(true); }, 700);
  }

  let tipTimer = 0;
  function showTip(text, ms) {
    const el = $('tip');
    el.textContent = text;
    if (!text) { el.classList.remove('show'); return; } // 没有提示的关卡不显示空条
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
    if (HEIST) HA.alarm(); else SFX.banner();
  }

  // ---------- 坐标 ----------
  function layout() {
    if (!bounds) return;
    // 棋盘区域：HUD 下方留出提示条的位置，底部让出按钮栏（自动包含 iPhone 刘海和底部横条的安全区）
    const area = { x0: 12, x1: W - 12, y0: $('hud').getBoundingClientRect().bottom + 44, y1: $('tools').getBoundingClientRect().top - 8 };
    if (area.y1 - area.y0 < 200) area.y1 = area.y0 + 200;
    // 不压到右下角的陪玩角色：按立绘的实际轮廓避让，躲不开时整体缩小
    const f = RRLayout.fit(footprint, area, Girl.rects());
    scale = f.scale; ox = f.ox; oy = f.oy;
    const cx = ox + bounds.cx * scale, cy = oy + bounds.cy * scale;
    RRBg.paint(bg, W, H, DPR, { x: cx, y: cy, r: Math.max(bounds.w, bounds.h) * scale * 0.62 }, bgIndex);
    if (REAL) bakeGrade();
  }
  // D 写实：调色和暗角只烤进背景层，零件画在上面保持清晰
  function bakeGrade() {
    const x = bg.getContext('2d'), w = bg.width, h = bg.height;
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    if (ELOOK) {
      // 景深：缩小再放大两次做模糊（不用 ctx.filter，老 Safari 不支持），像相机对焦在棋盘上
      for (const k of [5, 3]) {
        const tmp = document.createElement('canvas'); tmp.width = Math.max(1, Math.round(w / k)); tmp.height = Math.max(1, Math.round(h / k));
        const tx = tmp.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(bg, 0, 0, tmp.width, tmp.height);
        x.imageSmoothingQuality = 'high'; x.clearRect(0, 0, w, h); x.drawImage(tmp, 0, 0, w, h);
      }
      // 提亮、降对比：一层暖色的 screen
      x.globalCompositeOperation = 'screen'; x.fillStyle = 'rgba(255,150,120,0.16)'; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'source-over';
    }
    x.globalCompositeOperation = 'soft-light';
    let g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,170,210,0.4)'); g.addColorStop(0.55, 'rgba(255,170,90,0.15)'); g.addColorStop(1, 'rgba(255,110,20,0.45)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    g = x.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.45, w / 2, h * 0.48, Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, ELOOK ? 'rgba(10,0,6,0.28)' : 'rgba(10,0,6,0.5)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.restore();
  }
  function resize() {
    DPR = Math.min(3, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    layout();
  }
  const toLogical = (e) => ({ x: (e.clientX - ox) / scale, y: (e.clientY - oy) / scale });
  const panOf = (x) => (W ? Math.max(-1, Math.min(1, ((ox + x * scale) / W) * 2 - 1)) : 0); // 声像：零件在屏幕上的左右位置

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
      if (HEIST) HA.locked(panOf(G.rings[i].x)); else SFX.locked();
      HAP.fire('blocked');
      const tnow = performance.now();
      blockedTaps = blockedTaps.filter((x) => tnow - x < 10000).concat([tnow]);
      if (blockedTaps.length >= 3) { blockedTaps = []; stuckReact(); }
      if (why === 'owner') {
        // 把它扣住的环闪一下，告诉玩家要先处理谁
        G.links.forEach((L) => { if (S.link[L.k] && L.owner === i) flashLinks[L.k] = performance.now(); });
        showTip(t('tipOwner'), 2600);
      } else showTip(t('tipClosed'), 2600);
      return;
    }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 合成事件 */ }
    const R = G.rings[i];
    drag = { i, id: e.pointerId, last: Math.atan2(p.y - R.y, p.x - R.x), lastP: p, bar: R.kind === 'bar', total: 0, tick: 0, lastHit: 0, moved: false,
      det: Math.floor(S.angles[i] / (R.kind === 'bar' ? BAR_STEP : DIAL_STEP)), detN: 0, v: 0, lastT: performance.now(), lastMoveT: 0 };
    lift[i] = { t0: performance.now(), on: true };
    HAP.fire('grab');
    if (hint && !hint.auto) hint = null;
    if (HEIST) HA.touch(panOf(R.x)); else SFX.grab();
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
    if (HEIST) dialSound(i, moved);
    else {
      drag.tick += drag.bar ? Math.abs(moved) / 60 : Math.abs(moved);
      if (drag.tick > 10 * DEG) { drag.tick = 0; SFX.tick(); HAP.fire('tick'); }
    }
    handleEvents(events);
  }

  // 保险柜密码盘：卡位跟着环的绝对角度走（每 6° 一格，每 36° 一个大格）；直杆每滑 14 像素一格
  const DIAL_STEP = 6 * DEG, BAR_STEP = 14;
  function dialSound(i, moved) {
    const R = G.rings[i], now = performance.now(), dt = Math.max(4, now - drag.lastT) / 1000;
    drag.lastT = now;
    if (!moved) return;
    drag.lastMoveT = now;
    const inst = drag.bar ? Math.abs(moved) / dt : Math.abs(moved) / DEG / dt;
    drag.v = drag.v * 0.7 + Math.min(inst, 3000) * 0.3;
    HA.friction(drag.v, drag.bar);
    const idx = Math.floor(S.angles[i] / (drag.bar ? BAR_STEP : DIAL_STEP));
    if (idx === drag.det) return;
    const b = idx > drag.det ? idx : drag.det; // 刚越过的那条卡位线
    drag.det = idx;
    const pan = panOf(R.kind === 'bar' ? R.x + R.ux * S.angles[i] : R.x);
    if (drag.bar) { HA.slideStep(pan); HAP.fire('tick'); return; }
    const major = ((b % 6) + 6) % 6 === 0;
    // 震动比声音稀一半：每两格一下，大格必震
    if (HA.detent(major, R.r, pan, drag.v) && (major || drag.detN++ % 2 === 0)) HAP.fire('tick');
  }

  function handleEvents(events) {
    const now = performance.now(), ft = fxTime();
    let flew = 0;
    for (const ev of events) {
      if (ev.type === 'hit') {
        if (now - (drag ? drag.lastHit : 0) > 140) {
          if (drag) drag.lastHit = now;
          if (HEIST) { HA.knock(panOf(ev.p.x)); alarmT = now; } else SFX.bump();
          HAP.fire('bump');
          fx.push({ type: 'bump', x: ev.p.x, y: ev.p.y, t0: ft });
          shakes[ev.ring] = now - 200; // 轻微一抖
        }
      } else if (ev.type === 'open') {
        const L = G.links[ev.k];
        fx.push({ type: 'slip', L, t0: ft, color: G.rings[L.owner].color });
        if (HEIST) HA.gate(G.rings[L.held] ? G.rings[L.held].r : 36, panOf(L.cx)); else SFX.slip();
        HAP.fire('open');
      } else if (ev.type === 'close') {
        const L = G.links[ev.k];
        if (HEIST) HA.regate(G.rings[L.held] ? G.rings[L.held].r : 36, panOf(L.cx)); else SFX.tick();
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
      if (!HEIST) $('score').textContent = money(score); // 劫案皮肤：在 frame() 里滚动上涨
      bumpScore();
      const R = G.rings[events.find((e) => e.type === 'fly').i];
      const wx = R.kind === 'bar' ? R.x : R.x, wy = R.kind === 'bar' ? R.y - 30 : R.y - R.r - 20;
      if (ELOOK) { if (combo.n >= 2) comboTag(combo.n); } // E：棋盘上不弹字，连击放在金额旁边
      else if (combo.n >= 2 || flew >= 2) {
        const words = HEIST ? ['', '', 'Cracked!', 'Jackpot!', 'Big Score!', 'Untouchable!'] : ['', '', 'Great!', 'Excellent!', 'Amazing!', 'Unreal!'];
        fx.push({ type: 'word', text: words[Math.min(combo.n, 5)], x: wx, y: wy, t0: ft });
      } else fx.push({ type: 'word', text: HEIST ? 'Click!' : 'Good!', x: wx, y: wy, t0: ft, small: true });
      lastProgress = now;
      if ((combo.n >= 2 || flew >= 2) && !S.ring.every((a) => !a)) Girl.react('combo');
      if (S.ring.every((a) => !a)) {
        // 最后一个零件：慢镜头收尾
        // 最后一个零件刚起步就进入慢镜头，让它在慢动作里拖着光带冲出去
        slowmo = { t0: now + (flew - 1) * 70 + RECOIL * 1000 + 30 };
        // 劫案皮肤不放原来的慢镜头音效：它是往下扫的，听起来像挑战失败
        if (!HEIST) setTimeout(() => SFX.slowmo(), (flew - 1) * 70 + 60);
        win();
      }
    }
  }

  // 零件飞走（B. 跑车尾灯拖影）：零件往后一缩蓄力，然后猛地加速冲出屏幕，身后留下红白两道光带
  const DASH = 0.34;   // 冲出屏幕的时长（秒）
  const RECOIL = 0.05; // 蓄力的时长（秒）
  function flyAway(i, t0, comboN) {
    const R = G.rings[i], ang = S.angles[i];
    const x0 = R.kind === 'bar' ? R.x + R.ux * ang : R.x, y0 = R.kind === 'bar' ? R.y + R.uy * ang : R.y;
    // 方向：从棋盘中心往外，以水平为主（像公路上的车流），中间的零件随机往左或往右
    let dx = x0 - bounds.cx, dy = (y0 - bounds.cy) * 0.35;
    if (Math.hypot(dx, dy) < 24) { dx = Math.random() < 0.5 ? -1 : 1; dy = -0.12; }
    const len = Math.hypot(dx, dy); dx /= len; dy /= len;
    const far = Math.hypot(W, H) / scale + 160; // 保证冲出屏幕
    // 劫案皮肤：不要尾灯拖影，零件原地轻轻浮起、淡掉，化成一把钞票
    fx.push(HEIST ? { type: 'vanish', R, ang, x0, y0, t0 } : { type: 'dash', R, ang, x0, y0, dx, dy, far, t0, combo: comboN });
    // 劫案皮肤不弹“+$200”：和右上角赃款数字的跳动重复（用户 11-28）
    if (!HEIST) fx.push({ type: 'plus', x: x0, y: y0, t0, text: '+' + money(200 * Math.min(comboN, 5)) });
    if (HEIST && !NOBILLS) cashBurst(x0, y0, t0, comboN);
    const pan = panOf(x0);
    setTimeout(() => {
      if (HEIST) { HA.release(comboN - 1, pan); HA.whoosh(comboN - 1); } else { SFX.dash(comboN - 1); SFX.free(Math.max(0, comboN - 1)); }
    }, Math.max(0, (t0 - fxTime()) / Math.max(timeScale, 0.3)));
    HAP.fire('fly');
  }

  let pendingFx = [];
  // 冲刺时零件走过的距离（先往后缩 6 像素，再匀加速）
  function dashDist(f, t) {
    if (t < RECOIL) return -6 * Math.sin((t / RECOIL) * Math.PI / 2);
    const tt = t - RECOIL, acc = (2 * (f.far + 6)) / Math.pow(DASH - RECOIL, 2);
    return -6 + 0.5 * acc * tt * tt;
  }

  // 短路时的零件本体（已经不在棋盘状态里了，单独画）
  function drawGhost(f, alpha, glow) {
    const R = f.R;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (R.kind === 'bar') {
      const ax = R.x + R.ux * (f.ang - R.half), ay = R.y + R.uy * (f.ang - R.half);
      const bx = R.x + R.ux * (f.ang + R.half), by = R.y + R.uy * (f.ang + R.half);
      if (HEIST) goldBar(ax, ay, bx, by, BAR, glow); else lineTube(ax, ay, bx, by, R.color, BAR, glow);
    } else {
      for (const k of R.knobs) drawKnob(R, R.x, R.y, f.ang, k, glow);
      if (R.gap) { const g = R.gap.at + f.ang; arcTube(R.x, R.y, R.r, g + R.gap.w / 2, g - R.gap.w / 2 + TAU, R.color, TUBE, glow, false, f.ang); }
      else arcTube(R.x, R.y, R.r, 0, TAU, R.color, TUBE, glow, true, f.ang);
    }
    ctx.restore();
  }


  function endDrag(e, forced) {
    if (!drag) return;
    if (e && e.pointerId !== drag.id) return;
    lift[drag.i] = { t0: performance.now(), on: false };
    const Rd = G.rings[drag.i];
    drag = null;
    if (HEIST) { HA.friction(0); if (!forced) HA.drop(panOf(Rd.x)); } else if (!forced) SFX.drop();
  }
  cv.addEventListener('pointerup', (e) => endDrag(e));
  cv.addEventListener('pointercancel', (e) => endDrag(e));



  let scoreTimer = 0, comboTimer = 0;
  // E：金额旁边的连击标签「×N」
  function comboTag(n) {
    let el = $('comboTag');
    if (!el) { el = document.createElement('div'); el.id = 'comboTag'; $('scoreBox').appendChild(el); }
    el.textContent = '×' + n;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(comboTimer); comboTimer = setTimeout(() => el.classList.remove('show'), 1300);
  }
  function bumpScore() {
    const el = $('score');
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    clearTimeout(scoreTimer);
    if (HEIST) { const b = $('scoreBox'); b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
  }

  function win() {
    won = true;
    if (drag) endDrag(null, true);
    const firstClear = progress[levelIndex] == null;
    saveScore(levelIndex, score);
    const ci = chapterIndex(levelIndex), chap = chapterOf(levelIndex), rw = CH.rewardAt(levelIndex);
    const rsrc = rw.kind === 'photo' ? chap.photos[rw.i] : chap.videos[rw.i];
    const isNew = firstClear;
    if (isNew) markNew(ci, rw.kind, rw.i);
    // 这一关打完正好凑齐本章 20 关 → 解锁下一章的背景
    const newBg = firstClear && ci + 1 < CH.list.length && chapterDone(ci);
    setTimeout(() => Girl.react(isNew ? rw.kind : 'clear'), 450);
    // 劫案皮肤：保险柜门转开（和“保险箱打开”的声音对齐：把手 → 门闩 → 密封嘶声时门开始转）
    if (HEIST) { setTimeout(() => HA.vault(), 550); stampAt = performance.now() + 850; }
    const wp = $('winPhoto');
    wp.classList.toggle('show', isNew);
    wp.classList.toggle('soon', isNew && !rsrc);
    wp.classList.toggle('isvideo', rw.kind === 'video');
    if (isNew) {
      $('winPhotoTitle').textContent = rw.kind === 'video' ? t('newVideo') : t('newPhoto');
      $('winPhotoImg').src = rw.kind === 'photo' && rsrc ? rsrc : (chap.girl ? chap.girl.expr.happy : '');
      wp.onclick = () => { if (rsrc) openViewer(rw.kind === 'video' ? 'video' : 'img', rsrc, ci, rw.kind, rw.i); };
    }
    $('winBg').classList.toggle('show', newBg);
    if (newBg) $('winBgName').textContent = CH.list[ci + 1].name;
    setTimeout(() => {
      if (HEIST) HA.win(); else SFX.win();
      const last = levelIndex === LEVELS.length - 1;
      $('winTitle').textContent = last ? t('demoDone') : t('wins')[levelIndex % 4];
      $('winScore').textContent = money(score);
      $('winInfo').textContent = t('moves', { n: moves });
      $('btnNextLabel').textContent = last ? t('toLevels') : t('next');
      HAP.fire('win');
      $('win').classList.add('show');
    }, HEIST ? 2600 : 1900);
  }

  // ---------- 提示：求解器算出下一步，用手指动画演示 ----------
  function showHint(auto) {
    if (won || !G) return;
    const m = C.hintMove(G, S, C.hintBudget(G));
    if (!m) { showTip(t('tipDead')); return; }
    hint = { i: m.ring, delta: m.delta, t0: performance.now(), auto: !!auto };
    if (!auto) { showTip(t('tipHint'), 2600); Girl.react('hint'); }
  }

  // ---------- 按钮 ----------
  function btn(id, fn) {
    const el = $(id);
    el.addEventListener('click', () => {
      // 按钮所在的面板没打开时一律不响应（防止误触到隐藏面板里的按钮）
      const panel = el.closest('.overlay');
      if (panel && !panel.classList.contains('show')) return;
      SFX.ensure(); if (HEIST) HA.button(); else SFX.button(); if (!/iP(hone|ad|od)/.test(navigator.userAgent)) HAP.fire('tap'); fn();
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
  function openSettings() { syncToggles(); $('langList').classList.remove('open', 'closing'); $('btnLang').classList.remove('open'); $('settings').classList.add('show'); }
  function closeSettings() { $('settings').classList.remove('show'); }
  btn('btnSettings', openSettings);
  btn('btnCloseSettings', closeSettings);
  btn('togMusic', () => { SFX.setMusic(!SFX.music); syncToggles(); showTip(t('musicSoon'), 1800); });
  btn('togSound', () => { SFX.toggle(); syncToggles(); });
  btn('togVibe', () => { HAP.set(!HAP.enabled); syncToggles(); });
  // 语言：半透明下拉弹窗，从语言按钮下方展开；选中后短暂高亮再收回
  function langOpen(on) {
    const box = $('langList'), b = $('btnLang');
    if (on) {
      box.style.top = (b.offsetTop + b.offsetHeight + 6) + 'px';
      box.classList.remove('closing'); box.classList.add('open'); b.classList.add('open');
    } else if (box.classList.contains('open')) {
      box.classList.remove('open'); box.classList.add('closing'); b.classList.remove('open');
      setTimeout(() => box.classList.remove('closing'), 260);
    }
  }
  btn('btnLang', () => {
    const box = $('langList');
    if (!box.children.length) {
      I18N.ORDER.forEach((code) => {
        const b = document.createElement('button');
        b.innerHTML = '<span>' + I18N.name(code) + '</span><i>✓</i>';
        b.dataset.code = code;
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!$('settings').classList.contains('show')) return;
          SFX.button(); HAP.fire('tap'); I18N.set(code); refreshTexts(); syncToggles(); markLang();
          b.classList.add('pick'); setTimeout(() => { b.classList.remove('pick'); langOpen(false); }, 140);
        });
        box.appendChild(b);
        HAP.attach(b);
      });
    }
    markLang();
    langOpen(!box.classList.contains('open'));
  });
  // 点弹窗外面收起
  $('settings').addEventListener('pointerdown', (e) => { if (!e.target.closest('#langList') && !e.target.closest('#btnLang')) langOpen(false); });
  function markLang() { [...$('langList').children].forEach((b) => b.classList.toggle('on', b.dataset.code === I18N.lang)); }
  btn('btnHome', () => { closeSettings(); openMenu(); });
  btn('btnAlbum', openAlbum);
  btn('btnCloseAlbum', () => { $('album').classList.remove('show'); $('albumNew').classList.toggle('on', hasNew()); if ($('menu').classList.contains('show')) renderStrip(homeCh); });
  btn('btnCloseViewer', closeViewer);
  $('viewer').addEventListener('click', (e) => { if (e.target.id === 'viewer' || e.target.id === 'viewImg') closeViewer(); });
  btn('btnRestart', () => { closeSettings(); loadLevel(levelIndex); });
  $('settings').addEventListener('click', (e) => { if (e.target.id === 'settings') closeSettings(); });
  // 切换语言后刷新所有文字
  function refreshTexts() {
    I18N.apply();
    $('lvNum').textContent = t('level') + ' ' + (levelIndex + 1);
    if ($('menu').classList.contains('show')) openMenu();
    if ($('album').classList.contains('show')) openAlbum();
  }
  btn('btnNext', () => { $('win').classList.remove('show'); if (TEST_LEVEL) loadLevel(levelIndex); else if (levelIndex < LEVELS.length - 1) loadLevel(levelIndex + 1); else openMenu(); });
  btn('btnRetry', () => { $('win').classList.remove('show'); loadLevel(levelIndex); });
  // iPhone：按钮上盖透明原生开关，直接点按就有震感
  ['btnSettings', 'btnReset', 'btnHint', 'togMusic', 'togSound', 'togVibe', 'btnLang', 'btnHome', 'btnRestart', 'btnCloseSettings', 'btnNext', 'btnRetry']
    .forEach((id) => HAP.attach($(id)));
  I18N.apply();

  // ---------- 主页：相册 + 章节 + 关卡转盘 ----------
  let homeCh = 0, homeMid = 0;
  const chapterLevels = (ci) => Math.max(0, Math.min(PER, LEVELS.length - ci * PER)); // 这一章已经做好的关卡数
  const chapterOpen = (ci) => chapterLevels(ci) > 0 && (UNLOCK_ALL || bgUnlocked(ci));
  // 新章节第一次开放时，章节按钮上显示 NEW，点过以后消失
  const chSeenKey = (ci) => 'ch:' + ci;

  function openMenu() {
    // 默认显示“下一关要玩的”那一章：通关第 20 关后，自动切到新开放的章节
    let target = levelIndex;
    while (target + 1 < LEVELS.length && cleared(target) && unlocked(target + 1)) target++;
    homeCh = chapterIndex(target);
    renderChips();
    renderChapter(homeCh, target);
    $('albumNew').classList.toggle('on', hasNew());
    $('menu').classList.add('show');
  }

  function renderChips() {
    const box = $('chapters');
    box.innerHTML = '';
    CH.list.forEach((chap, ci) => {
      const open = chapterOpen(ci), b = document.createElement('button');
      if (open && ci > 0 && seen[chSeenKey(ci)] == null) { seen[chSeenKey(ci)] = false; saveSeen(); }
      b.className = 'chip' + (ci === homeCh ? ' on' : '') + (open ? '' : ' locked') + (open && seen[chSeenKey(ci)] === false ? ' new' : '');
      b.innerHTML = (open ? '' : '🔒 ') + chap.name + '<small>' + (open ? chapterCount(ci) + '/' + PER : '') + '</small>';
      b.addEventListener('click', () => {
        SFX.button();
        if (!open) {
          // 锁住的章节：抖一下，写明解锁标准
          b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); HAP.fire('blocked');
          $('chapterNote').textContent = chapterLevels(ci) ? t('bgLocked', { n: PER, c: CH.list[ci - 1].name }) : t('comingSoon');
          return;
        }
        homeCh = ci;
        renderChips();
        renderChapter(ci, levelIndex >= ci * PER && levelIndex < (ci + 1) * PER ? levelIndex : ci * PER);
      });
      box.appendChild(b);
      HAP.attach(b);
    });
    const on = box.children[homeCh];
    if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function renderChapter(ci, focus) {
    if (seen[chSeenKey(ci)] === false) { seen[chSeenKey(ci)] = true; saveSeen(); }
    $('chapterNote').textContent = '';
    renderStrip(ci);
    const box = $('levels');
    box.innerHTML = '';
    for (let n = ci * PER; n < ci * PER + chapterLevels(ci); n++) {
      const open = unlocked(n), best = progress[n], rw = CH.rewardAt(n), c = document.createElement('button');
      c.className = 'lvcard' + (open ? '' : ' locked') + (n === levelIndex ? ' current' : '');
      c.dataset.n = n;
      c.innerHTML = (CH.isHard(n) ? '<b class="hard">' + t('hard') + '</b>' : '') + '<span class="big">' + ((n % PER) + 1) + '</span>' +
        '<span class="lv">' + t('level') + ' ' + (n + 1) + '</span>' +
        '<span class="rw">' + (rw.kind === 'video' ? '▶ ' + t('video') : '✦ ' + t('photoN', { n: rw.i + 1 })) + '</span>' +
        '<span class="best">' + (open ? (best != null ? '✓ ' + best : '') : '🔒') + '</span>';
      c.addEventListener('click', () => {
        // 点旁边的卡片先滑到中间；点中间那张直接开始
        if (+c.dataset.n !== homeMid) { centerCard(c, true); return; }
        playMid();
      });
      box.appendChild(c);
    }
    // 立刻居中（不等下一帧，免得玩家先点了卡片又被拉回来）
    const f = box.querySelector('[data-n="' + focus + '"]') || box.firstChild;
    if (f) centerCard(f, false);
  }

  // 代码触发的滑动（点卡片、打开主页）：滑完之前选中的关卡固定为目标，不跟着中途经过的卡片变
  let pinUntil = 0;
  function centerCard(c, smooth) {
    const box = $('levels');
    homeMid = +c.dataset.n; pinUntil = performance.now() + (smooth ? 700 : 150);
    box.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - box.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
    updatePlay(); scaleCards();
  }
  // 按离中心的距离缩放：中间最大，两边渐小渐暗
  function scaleCards() {
    const box = $('levels'), mid = box.scrollLeft + box.clientWidth / 2;
    let best = null, bestD = Infinity;
    for (const c of box.children) {
      const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid), k = Math.min(1, d / 150);
      c.style.setProperty('--s', (1 - 0.3 * k).toFixed(3));
      c.style.setProperty('--o', (1 - 0.5 * k).toFixed(3));
      c.style.zIndex = String(100 - Math.round(k * 50));
      if (d < bestD) { bestD = d; best = c; }
    }
    if (performance.now() < pinUntil) { for (const c of box.children) c.classList.toggle('mid', +c.dataset.n === homeMid); return; }
    for (const c of box.children) c.classList.toggle('mid', c === best);
    if (best && +best.dataset.n !== homeMid) { homeMid = +best.dataset.n; updatePlay(); HAP.fire('tick'); }
  }
  $('levels').addEventListener('scroll', () => requestAnimationFrame(scaleCards), { passive: true });
  function updatePlay() {
    const open = unlocked(homeMid), b = $('btnPlay');
    b.classList.toggle('locked', !open);
    $('playLabel').textContent = (open ? t('play') + ' · ' : '🔒 ') + t('level') + ' ' + (homeMid + 1);
  }
  function playMid() {
    if (!unlocked(homeMid)) { HAP.fire('blocked'); $('chapterNote').textContent = t('unlockAt', { n: homeMid }); return; }
    SFX.ensure(); SFX.button(); $('menu').classList.remove('show'); loadLevel(homeMid);
  }
  btn('btnPlay', playMid);

  // 主页顶部的相册条：这一章的 16 张照片 + 4 段视频，按关卡顺序；滑到最新解锁的那张，下一张模糊预览
  function renderStrip(ci) {
    const box = $('albumStrip'), chap = CH.list[ci];
    box.innerHTML = '';
    let got = 0, total = 0, last = null, teased = false;
    for (let n = ci * PER; n < (ci + 1) * PER; n++) {
      const rw = CH.rewardAt(n), src = rw.kind === 'video' ? chap.videos[rw.i] : chap.photos[rw.i], have = cleared(n) && src;
      const isNew = seen[keyOf(ci, rw.kind, rw.i)] === false;
      total++; if (have) got++;
      const c = document.createElement('button');
      c.className = 'ph ' + rw.kind + (have ? ' got' : src ? ' tease' : ' soon') + (have && isNew ? ' new' : '');
      if (rw.kind === 'photo' && src) c.innerHTML = '<img src="' + src + '" alt="" loading="lazy" decoding="async">';
      c.innerHTML += (have ? (rw.kind === 'video' ? '<span class="mid">▶</span>' : '') : '<span class="mid">' + (src ? '🔒' : '✦') + '</span>') +
        '<span class="badge">' + (have ? (rw.kind === 'video' ? t('videoN', { n: rw.i + 1 }) : t('photoN', { n: rw.i + 1 })) : src ? t('unlockAt', { n: n + 1 }) : t('comingSoon')) + '</span>';
      if (have) c.addEventListener('click', () => openViewer(rw.kind === 'video' ? 'video' : 'img', src, ci, rw.kind, rw.i));
      else c.addEventListener('click', () => {
        // 还没解锁：滑到对应关卡
        const card = $('levels').querySelector('[data-n="' + n + '"]');
        if (card) centerCard(card, true);
      });
      box.appendChild(c);
      if (have) last = c;
      else if (src && !teased) { teased = true; if (!last) last = c; }
    }
    $('albumCount').textContent = got + '/' + total;
    // 让最新解锁的那张排在左边第二个位置：左边露出上一张，右边是模糊的下一张
    requestAnimationFrame(() => {
      if (!last) return;
      const prev = last.previousElementSibling || last;
      box.scrollLeft += prev.getBoundingClientRect().left - box.getBoundingClientRect().left - 16;
    });
  }

  // ---------- 相册 ----------
  const SEEN_KEY = 'neonloops-seen';
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch (e) { seen = {}; }
  const keyOf = (ci, kind, k) => ci + ':' + kind + ':' + k;
  function markNew(ci, kind, k) { if (seen[keyOf(ci, kind, k)] == null) seen[keyOf(ci, kind, k)] = false; saveSeen(); }
  function markSeen(ci, kind, k) { if (ci != null) { seen[keyOf(ci, kind, k)] = true; saveSeen(); } }
  function saveSeen() { try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) { /* 隐私模式 */ } }
  const hasNew = () => Object.values(seen).some((v) => v === false);

  function slot(kind, src, got, lvNo, ci, k, label) {
    const cell = document.createElement('button');
    const isNew = seen[keyOf(ci, kind, k)] === false;
    cell.className = 'aslot ' + kind + (got && src ? ' got' : '') + (isNew && got ? ' new' : '');
    if (got && src) {
      cell.innerHTML = (kind === 'photo' ? '<img src="' + src + '" alt="" loading="lazy" decoding="async">' : '<span class="lock">▶</span>') +
        '<span class="tag">' + label + '</span>';
      cell.addEventListener('click', () => openViewer(kind === 'video' ? 'video' : 'img', src, ci, kind, k));
    } else {
      const sub = got ? t('comingSoon') : t('unlockAt', { n: lvNo }) + (src ? '' : ' · ' + t('comingSoon'));
      cell.innerHTML = '<span class="lock">' + (got ? '✦' : '🔒') + '</span><span class="tag">' + label + '<small>' + sub + '</small></span>';
    }
    return cell;
  }

  function bgThumb(ci) {
    const c = document.createElement('canvas');
    RRBg.paint(c, 120, 68, 2, null, CH.list[ci].bg);
    return c.toDataURL('image/png');
  }

  function openAlbum() {
    const body = $('albumBody');
    body.innerHTML = '';
    const playable = Math.ceil(LEVELS.length / PER);
    CH.list.forEach((chap, ci) => {
      const open = bgUnlocked(ci);
      const sec = document.createElement('div');
      sec.className = 'asec' + (open ? '' : ' locked');
      sec.innerHTML = '<div class="ahead"><b>' + (open ? '' : '🔒 ') + chap.name + '</b><span>' + (chap.girl ? chap.girl.name : t('comingSoon')) + '</span></div>';
      // 背景卡
      const bgc = document.createElement('button');
      bgc.className = 'abg' + (open ? ' got' : '');
      bgc.innerHTML = '<img src="' + bgThumb(ci) + '" alt=""><span class="tag"><b>' + t('background') + '</b><small>' +
        (open ? t('progressN', { a: chapterCount(ci), b: PER }) : t('bgLocked', { n: PER, c: CH.list[ci - 1].name })) + '</small></span>';
      if (open) bgc.addEventListener('click', () => openViewer('bg', chap.bg));
      sec.appendChild(bgc);
      if (ci < playable) {
        for (let set = 0; set < PER / SETN; set++) {
          const row = document.createElement('div');
          row.className = 'arow';
          for (let j = 0; j < SETN - 1; j++) {
            const k = set * (SETN - 1) + j, lvNo = levelOfPhoto(ci, k);
            row.appendChild(slot('photo', chap.photos[k], cleared(lvNo), lvNo + 1, ci, k, t('photoN', { n: k + 1 })));
          }
          const vl = levelOfVideo(ci, set);
          row.appendChild(slot('video', chap.videos[set], cleared(vl), vl + 1, ci, set, t('videoN', { n: set + 1 })));
          sec.appendChild(row);
        }
      }
      body.appendChild(sec);
    });
    $('album').classList.add('show');
  }
  function openViewer(kind, src, ci, rkind, k) {
    const img = $('viewImg'), vid = $('viewVid');
    img.style.display = kind === 'video' ? 'none' : '';
    vid.style.display = kind === 'video' ? '' : 'none';
    if (kind === 'bg') {
      // 背景预览：按屏幕尺寸画一张大图
      const c = document.createElement('canvas');
      RRBg.paint(c, Math.round(W), Math.round(H), Math.min(2, DPR), null, src);
      img.src = c.toDataURL('image/jpeg', 0.9);
    } else if (kind === 'img') { img.src = src; markSeen(ci, rkind, k); }
    else { vid.src = src; markSeen(ci, rkind, k); vid.play().catch(() => { /* 需要用户再点一下 */ }); }
    $('viewer').classList.add('show');
    $('albumNew').classList.toggle('on', hasNew());
  }
  function closeViewer() { $('viewVid').pause(); $('viewer').classList.remove('show'); if ($('album').classList.contains('show')) openAlbum(); if ($('menu').classList.contains('show')) renderStrip(homeCh); }

  // ---------- 陪玩角色：静态立绘 + 代码微动画（呼吸、摇摆、眨眼、换表情、说话气泡） ----------
  const Girl = (() => {
    const el = $('girl'), A = $('girlA'), B = $('girlB'), BL = $('girlBlink'), bubble = $('bubble');
    let chap = null, front = A, cur = 'idle', backTimer = 0, bubbleTimer = 0, blinkTimer = 0, lastLine = {}, swapToken = 0, fadeTimer = 0;
    // 有的 iPhone 不加载 WebP（比如开了锁定模式）：只要有一张 WebP 加载失败，就整体换成同名 PNG（540 像素高）
    let noWebp = false;
    const fix = (u) => (noWebp && u ? u.replace(/\.webp$/, '.png') : u);
    function src(expr) { return fix((chap && (chap.girl.expr[expr] || chap.girl.expr.idle)) || ''); }
    [A, B, BL].forEach((img) => img.addEventListener('error', () => {
      const u = img.getAttribute('src') || '';
      if (!/\.webp$/.test(u)) return;
      noWebp = true;
      [A, B, BL].forEach((o) => { const v = o.getAttribute('src') || ''; if (/\.webp$/.test(v)) o.src = fix(v); });
    }));
    function hideNow(img) { img.style.transition = 'none'; img.classList.remove('on'); void img.offsetWidth; img.style.transition = ''; }
    function show(expr) {
      if (!chap || expr === cur) return;
      cur = expr;
      const back = front === A ? B : A, old = front, token = ++swapToken;
      // 上一次切换还没收尾时，先把要复用的那张立刻藏起来，避免它换图时闪一下
      clearTimeout(fadeTimer); hideNow(back);
      // 新表情加载好后叠在上层淡入，淡入完再撤掉旧的：身体始终不透明，不会透出背景
      // 同一次切换只执行一次（缓存命中时 complete 和 onload 可能都会触发）
      const swap = () => {
        if (token !== swapToken) return;
        back.onload = null;
        back.style.zIndex = 2; old.style.zIndex = 1;
        back.classList.add('on'); front = back;
        fadeTimer = setTimeout(() => { if (token === swapToken) old.classList.remove('on'); }, 170);
      };
      back.onload = swap;
      back.src = src(expr);
      if (back.complete && back.naturalWidth) swap();
    }
    function say(text) {
      bubble.textContent = text;
      bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 2800);
    }
    function pick(group) {
      const L = chap.girl.lines[group];
      const arr = (L && (L[I18N.lang] || L.en)) || [];
      if (!arr.length) return '';
      let k = Math.floor(Math.random() * arr.length);
      if (arr.length > 1 && k === lastLine[group]) k = (k + 1) % arr.length;
      lastLine[group] = k;
      return arr[k];
    }
    const EXPR = { greet: 'happy', stuck: 'pout', combo: 'surprised', clear: 'wink', photo: 'happy', video: 'wink', hint: 'thinking' };
    function react(group) {
      if (!chap) return;
      show(EXPR[group] || 'idle');
      const line = pick(group);
      if (line) say(line);
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      clearTimeout(backTimer);
      backTimer = setTimeout(() => show('idle'), 2800);
    }
    function blinkLoop() {
      clearTimeout(blinkTimer);
      blinkTimer = setTimeout(() => {
        if (chap && chap.girl.expr.blink && cur === 'idle') { BL.classList.add('on'); setTimeout(() => BL.classList.remove('on'), 130); }
        blinkLoop();
      }, 3000 + Math.random() * 3000);
    }
    function setChapter(c) {
      if (chap === c || !c.girl) return;
      chap = c;
      el.classList.toggle('left', c.girl.side === 'left');
      // 先把这一章的表情图都预加载，换表情时不闪
      Object.values(c.girl.expr).forEach((u) => { const im = new Image(); im.decoding = 'async'; im.src = fix(u); });
      swapToken++; clearTimeout(fadeTimer); cur = 'idle'; A.onload = B.onload = null;
      A.src = src('idle'); A.style.zIndex = 2; B.style.zIndex = 1; A.classList.add('on'); hideNow(B); front = A;
      BL.src = fix(c.girl.expr.blink || '');
      blinkLoop();
    }
    // 立绘在屏幕上的实际轮廓（没有角色或被隐藏时为空）
    function rects() {
      if (!chap || !chap.girl || !chap.girl.mask) return [];
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).display === 'none') return [];
      return RRLayout.girlRects({ left: r.left, top: r.top, width: r.width, height: r.height }, chap.girl.mask);
    }
    return { setChapter, react, rects, get expr() { return cur; } };
  })();

  function stuckReact() {
    const now = performance.now();
    if (now - lastStuck < 15000 || won) return;
    lastStuck = now; lastProgress = now;
    Girl.react('stuck');
  }

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
    if (CINE) { cineTube(center, outline, color, w, glow, glints, spin); return; }
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

  /*
   * B 电影感：阳极氧化铝 + 镜面高光。对比更强、暗部更深；上半反射天空（冷青），下半反射夕阳（暖橙），
   * 和整体的青橙调色一致；环上再叠一层围着圆心的放射状拉丝反光（机加工转盘的质感），高光固定在光源方向。
   */
  function cineTube(center, outline, color, w, glow, glints, spin) {
    if (REAL) { realTube(center, outline, color, w, glow, glints, spin); return; }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glow > 1.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(color, 0.14 * (glow - 1)); ctx.lineWidth = w + 16; center(0, 0); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = w + 10; center(4, 10); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = w + 2; center(2, 5); ctx.stroke();
    ctx.strokeStyle = 'rgba(4,2,8,0.98)'; ctx.lineWidth = w + 1.6; center(0, 0); ctx.stroke();
    ctx.save();
    outline(); ctx.clip('evenodd');
    const o = (k) => [LX * w * k, LY * w * k];
    ctx.strokeStyle = darken(color, 0.7); ctx.lineWidth = w + 2; center(0, 0); ctx.stroke();
    ctx.strokeStyle = darken(color, 0.3); ctx.lineWidth = w * 0.9; center(...o(0.06)); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w * 0.64; center(...o(0.14)); ctx.stroke();
    ctx.strokeStyle = lighten(color, 0.25); ctx.lineWidth = w * 0.34; center(...o(0.2)); ctx.stroke();
    // 下半：夕阳的暖色反光
    ctx.strokeStyle = 'rgba(255,150,70,0.6)'; ctx.lineWidth = w * 0.16; center(...o(-0.33)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.7)'; ctx.lineWidth = Math.max(0.6, w * 0.05); center(...o(-0.4)); ctx.stroke();
    // 上半：天空的冷色反光 + 锐利的镜面高光
    ctx.strokeStyle = 'rgba(190,240,255,0.55)'; ctx.lineWidth = w * 0.24; center(...o(0.3)); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, w * 0.07); center(...o(0.35)); ctx.stroke();
    // 放射状拉丝反光（只有环有圆心）
    if (spin && ctx.createConicGradient) {
      const cg = ctx.createConicGradient(LANG - 0.5, spin.x, spin.y);
      cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.07, 'rgba(255,255,255,0.5)'); cg.addColorStop(0.14, 'rgba(255,255,255,0)');
      cg.addColorStop(0.5, 'rgba(255,255,255,0)'); cg.addColorStop(0.57, 'rgba(255,200,150,0.35)'); cg.addColorStop(0.64, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = cg; ctx.lineWidth = w; center(0, 0); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    if (glints) glints();
    ctx.restore();
  }

  /*
   * D 写实：去掉卡通黑描边，边缘只用本色的暗部；接触阴影柔和；车漆清漆层的天空反光边缘锐利；
   * 背光一侧有一道夕阳的橙色轮廓光。所有层都画在调色之上，不再被颗粒和整屏调色糊掉。
   */
  function realTube(center, outline, color, w, glow, glints, spin) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (glow > 1.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(color, 0.12 * (glow - 1)); ctx.lineWidth = w + 12; center(0, 0); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    // 接触阴影：三层由宽到窄、由淡到深
    ctx.strokeStyle = 'rgba(10,2,10,0.10)'; ctx.lineWidth = w + 12; center(4, 11); ctx.stroke();
    ctx.strokeStyle = 'rgba(10,2,10,0.18)'; ctx.lineWidth = w + 5; center(3, 7); ctx.stroke();
    ctx.strokeStyle = 'rgba(10,2,10,0.32)'; ctx.lineWidth = w + 1; center(1.5, 3.5); ctx.stroke();
    ctx.strokeStyle = darken(color, 0.72); ctx.lineWidth = w + 1; center(0, 0); ctx.stroke();
    ctx.save();
    outline(); ctx.clip('evenodd');
    const o = (k) => [LX * w * k, LY * w * k];
    ctx.strokeStyle = darken(color, 0.58); ctx.lineWidth = w + 2; center(0, 0); ctx.stroke();
    ctx.strokeStyle = darken(color, 0.22); ctx.lineWidth = w * 0.86; center(...o(0.05)); ctx.stroke();
    ctx.strokeStyle = color; ctx.lineWidth = w * 0.6; center(...o(0.12)); ctx.stroke();
    ctx.strokeStyle = lighten(color, 0.3); ctx.lineWidth = w * 0.3; center(...o(0.2)); ctx.stroke();
    // 清漆层的天空反光：一宽一窄，边缘锐利
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = w * 0.22; center(...o(0.3)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.96)'; ctx.lineWidth = Math.max(1, w * 0.085); center(...o(0.34)); ctx.stroke();
    // 背光侧：夕阳的橙色轮廓光 + 地面反射
    ctx.strokeStyle = 'rgba(255,120,50,0.45)'; ctx.lineWidth = w * 0.2; center(...o(-0.3)); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,196,120,0.95)'; ctx.lineWidth = Math.max(0.8, w * 0.06); center(...o(-0.43)); ctx.stroke();
    if (spin && ctx.createConicGradient) {
      const cg = ctx.createConicGradient(LANG - 0.45, spin.x, spin.y);
      cg.addColorStop(0, 'rgba(255,255,255,0)'); cg.addColorStop(0.06, 'rgba(255,255,255,0.3)'); cg.addColorStop(0.12, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = cg; ctx.lineWidth = w; center(0, 0); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
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
    if (HEIST) { drawSensor(R, cx + c * (R.r + k.len), cy + s * (R.r + k.len), a, k); return; }
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

  // 劫案皮肤：凸钉 = 警报触点。深色钢壳 + 主色边 + 中间一颗慢慢呼吸的红灯；最近被撞过就亮成一片
  let alarmT = 0;
  function drawSensor(R, x, y, a, k) {
    const now = performance.now(), hitK = Math.max(0, 1 - (now - alarmT) / 450);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = 'rgba(8,2,20,0.95)'; roundRect(-KNOB - 1.5, -KNOB - 1.5, KNOB * 2 + 3, KNOB * 2 + 3, 4); ctx.fill();
    let kg;
    if (ELOOK) kg = litGrad(a, KNOB * 1.2, STEEL);
    else { kg = ctx.createLinearGradient(0, -KNOB, 0, KNOB); kg.addColorStop(0, '#6a6684'); kg.addColorStop(0.3, '#d9d6ee'); kg.addColorStop(0.55, '#4a4660'); kg.addColorStop(1, '#25222f'); }
    ctx.fillStyle = kg; roundRect(-KNOB, -KNOB, KNOB * 2, KNOB * 2, 3); ctx.fill();
    ctx.strokeStyle = R.color; ctx.lineWidth = 1.3; roundRect(-KNOB + 1.2, -KNOB + 1.2, KNOB * 2 - 2.4, KNOB * 2 - 2.4, 2); ctx.stroke();
    const p = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(now / 420 + k.at * 7)), on = Math.min(1, p + hitK);
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, KNOB * (1.6 + hitK * 1.6));
    lg.addColorStop(0, 'rgba(255,70,90,' + 0.8 * on + ')'); lg.addColorStop(1, 'rgba(255,40,70,0)');
    ctx.fillStyle = lg; ctx.fillRect(-KNOB * 3.4, -KNOB * 3.4, KNOB * 6.8, KNOB * 6.8);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgb(' + Math.round(120 + 135 * on) + ',' + Math.round(20 + 60 * on) + ',' + Math.round(30 + 50 * on) + ')';
    ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-0.8, -0.9, 0.8, 0, TAU); ctx.fill();
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
    if (HEIST) { goldBar(ax, ay, bx, by, BAR * (1 + lf * 0.08), glow); return; }
    lineTube(ax, ay, bx, by, R.color, BAR * (1 + lf * 0.08), glow);
    // 两端的镀铬端帽
    for (const [x, y] of [[ax, ay], [bx, by]]) {
      const g = ctx.createRadialGradient(x - 1.5, y - 2, 0.5, x, y, BAR * 0.62);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#b9b6cf'); g.addColorStop(1, '#3d3a50');
      ctx.fillStyle = 'rgba(8,2,20,0.95)'; ctx.beginPath(); ctx.arc(x, y, BAR * 0.62 + 1.2, 0, TAU); ctx.fill();
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, BAR * 0.62, 0, TAU); ctx.fill();
    }
  }

  // 劫案皮肤：直杆 = 金条。金色烤漆管 + 中间压印的成色章 + 两端斜切面
  const GOLD = '#f2b630';
  // docs/art-bible.md 第 4 节：7 种零件色，明度拉齐
  const PAL7 = { '#ff3df2': '#ff4f9a', '#ff4d6d': '#ff4f9a', '#ffad42': '#ff8a4c', '#ffe45c': '#ffc93c', '#b6ff4a': '#9be15a',
    '#28e7ff': '#2dd4bf', '#3dffb0': '#2dd4bf', '#4d8bff': '#4f9dff', '#a47bff': '#a274ff' };
  // 一个光源：在旋转过的局部坐标里，按屏幕方向（主光左上）做明暗。rot：局部坐标相对屏幕转了多少；s：半径
  function litGrad(rot, s, stops) {
    const lx = LX * Math.cos(rot) + LY * Math.sin(rot), ly = -LX * Math.sin(rot) + LY * Math.cos(rot);
    const g = ctx.createLinearGradient(lx * s, ly * s, -lx * s, -ly * s);
    stops.forEach(([k, c]) => g.addColorStop(k, c));
    return g;
  }
  const STEEL = [[0, '#ffffff'], [0.3, '#cfcbe3'], [0.62, '#6d6984'], [1, '#2a2738']];
  function goldBar(ax, ay, bx, by, w, glow) {
    lineTube(ax, ay, bx, by, GOLD, w, glow);
    const a = Math.atan2(by - ay, bx - ax), len = Math.hypot(bx - ax, by - ay);
    ctx.save(); ctx.translate((ax + bx) / 2, (ay + by) / 2); ctx.rotate(a);
    const pw = Math.min(20, len * 0.4);
    ctx.fillStyle = 'rgba(255,244,200,0.28)'; roundRect(-pw / 2, -w * 0.3, pw, w * 0.6, 1.5); ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,0,0.75)'; ctx.lineWidth = 0.9; roundRect(-pw / 2, -w * 0.3, pw, w * 0.6, 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-pw * 0.3, -w * 0.08); ctx.lineTo(pw * 0.3, -w * 0.08); ctx.moveTo(-pw * 0.2, w * 0.12); ctx.lineTo(pw * 0.2, w * 0.12); ctx.stroke();
    for (const e of [-len / 2, len / 2]) {
      ctx.fillStyle = 'rgba(120,70,0,0.55)'; ctx.beginPath(); ctx.ellipse(e, 0, 2.2, w * 0.42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,190,0.6)'; ctx.beginPath(); ctx.ellipse(e - Math.sign(e) * 0.6, -w * 0.1, 1, w * 0.2, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
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
      drawClampAt(L.mode === 'bar' ? SILVER : R.color, cx + c * re, cy + sn * re, a, 1, 1, 0, now, 'stub', L.mode === 'bar');
    }
    const tw = TUBE * (1 + lf * 0.06);
    if (R.gap) { const g = R.gap.at + ang; arcTube(cx, cy, R.r, g + R.gap.w / 2, g - R.gap.w / 2 + TAU, R.color, tw, glow, false, ang); }
    else arcTube(cx, cy, R.r, 0, TAU, R.color, tw, glow, true, ang);
    if (HEIST) dialMarks(R, cx, cy, ang, tw);
  }

  // 劫案皮肤：密码盘刻度（每 12° 一条，每 36° 一条长的），跟着环转；缺口两端是机加工的钢制槽口
  function dialMarks(R, cx, cy, ang, w) {
    const N = 30, step = TAU / N, g = R.gap ? R.gap.at + ang : 0;
    ctx.save(); ctx.lineCap = 'round';
    for (let k = 0; k < N; k++) {
      const a = ang + k * step;
      if (R.gap) { const d = Math.abs(C.angDiff(a, g)); if (d < R.gap.w / 2 + 0.16) continue; }
      const major = k % 3 === 0, c = Math.cos(a), sn = Math.sin(a);
      const r0 = R.r + w * (major ? -0.08 : 0.14), r1 = R.r + w * 0.47;
      ctx.strokeStyle = REAL ? 'rgba(20,6,20,0.42)' : 'rgba(14,4,30,0.6)'; ctx.lineWidth = REAL ? (major ? 1.1 : 0.7) : major ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(cx + c * r0, cy + sn * r0); ctx.lineTo(cx + c * r1, cy + sn * r1); ctx.stroke();
      ctx.strokeStyle = REAL ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.32)'; ctx.lineWidth = REAL ? 0.45 : 0.6;
      ctx.beginPath(); ctx.moveTo(cx + c * r0 + 0.6, cy + sn * r0 + 0.8); ctx.lineTo(cx + c * r1 + 0.6, cy + sn * r1 + 0.8); ctx.stroke();
    }
    if (R.gap) for (const sg of [1, -1]) {
      const a = g + sg * (R.gap.w / 2 + 0.02);
      ctx.save();
      ctx.translate(cx + Math.cos(a) * R.r, cy + Math.sin(a) * R.r); ctx.rotate(a);
      const cg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      cg.addColorStop(0, '#4a4760'); cg.addColorStop(0.3, '#ffffff'); cg.addColorStop(0.55, '#8d8aa6'); cg.addColorStop(0.75, '#2a2738'); cg.addColorStop(1, '#cfcbe3');
      ctx.fillStyle = 'rgba(8,2,20,0.9)'; roundRect(-w / 2 - 1.5, -2.6, w + 3, 5.2, 1.5); ctx.fill();
      ctx.fillStyle = ELOOK ? litGrad(a, w * 0.55, STEEL) : cg; roundRect(-w / 2 - 0.8, -1.9, w + 1.6, 3.8, 1.2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawStem(L, now) {
    const O = G.rings[L.owner];
    const fl = flashLinks[L.k] != null ? Math.max(0, 1 - (now - flashLinks[L.k]) / 700) : 0;
    const { dx, dy } = ringOffset(L.owner, now);
    lineTube(L.sx + dx, L.sy + dy, L.cx, L.cy, O.color, STEM, 1 + fl * 2);
  }

  function drawClamp(L, now, alpha, sc) {
    let fl = flashLinks[L.k] != null ? Math.max(0, 1 - (now - flashLinks[L.k]) / 700) : 0;
    const op = C.isOpen(G, S, L);
    if (op) fl = Math.max(fl, 0.55 + 0.25 * Math.sin(now / 120));
    drawClampAt(L.mode === 'bar' ? SILVER : G.rings[L.owner].color, L.cx, L.cy, L.clampAng + Math.PI, alpha, sc, fl, now, op ? 'open' : null, L.mode === 'bar');
  }

  // 夹套：方向 dir 为杆的方向（从主环指向夹套）
  function drawClampAt(color, x, y, dir, alpha, sc, fl, now, st, isBar) {
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
    if (HEIST) { if (REAL && !isBar) ctx.scale(0.85, 0.85); padlock(color, w, h, st, isBar, dir + Math.PI / 2); ctx.restore(); return; } // D：锁扣小 15%（只改画面，碰撞不变）
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

  /*
   * 劫案皮肤：夹套 = 挂锁（主环颜色的锁身 + 钢锁梁 + 钥匙孔）。局部坐标：x 沿被扣环的管子，+y 指向主环。
   * st：null 锁着；'open' 缺口对上了，锁梁弹起一点；'stub' 被扣环已经走了，留下的空锁，锁梁歪开、锁身有撬痕。
   * isBar：直杆的卡座，画成带两颗螺丝的钢支架。
   */
  function padlock(color, w, h, st, isBar, rot) {
    const steel = (y0, y1) => {
      const g = ctx.createLinearGradient(0, y0, 0, y1);
      g.addColorStop(0, '#5d5a70'); g.addColorStop(0.2, '#ffffff'); g.addColorStop(0.45, '#a7a4bd'); g.addColorStop(0.6, '#2a2738'); g.addColorStop(0.85, '#d9d6ee'); g.addColorStop(1, '#4a4760');
      return g;
    };
    if (isBar) {
      ctx.fillStyle = 'rgba(10,2,25,0.95)'; roundRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, 3); ctx.fill();
      ctx.fillStyle = ELOOK ? litGrad(rot, h * 0.6, STEEL) : steel(-h / 2, h / 2); roundRect(-w / 2, -h / 2, w, h, 2.5); ctx.fill();
      for (const sx of [-w / 2 + 3.6, w / 2 - 3.6]) {
        ctx.fillStyle = '#1d1a28'; ctx.beginPath(); ctx.arc(sx, 0, 2, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#cfcbe3'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx - 1.3, -1.3); ctx.lineTo(sx + 1.3, 1.3); ctx.stroke();
      }
      return;
    }
    // 锁梁：U 形钢条，在远离主环的一侧
    const sw = w * 0.3, top = -h / 2 - 4.5, lift = st === 'open' ? 3 : st === 'stub' ? 3.5 : 0;
    ctx.save();
    ctx.translate(0, -lift);
    if (st === 'stub') { ctx.translate(-sw, -h / 2); ctx.rotate(-0.55); ctx.translate(sw, h / 2); }
    const U = () => { ctx.beginPath(); ctx.moveTo(-sw, -h / 2 + 3); ctx.lineTo(-sw, top); ctx.arc(0, top, sw, Math.PI, 0); ctx.lineTo(sw, -h / 2 + 3); };
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(8,2,20,0.95)'; ctx.lineWidth = 4.4; U(); ctx.stroke();
    if (ELOOK) {
      // 锁梁的明暗按屏幕方向（主光左上）
      const sr = rot + (st === 'stub' ? -0.55 : 0);
      ctx.strokeStyle = litGrad(sr, h * 0.7, STEEL); ctx.lineWidth = 2.8; U(); ctx.stroke();
    } else {
      ctx.strokeStyle = '#b9b6cf'; ctx.lineWidth = 2.8; U(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.9; ctx.save(); ctx.translate(-0.5, -0.5); U(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    // 锁身
    ctx.fillStyle = 'rgba(10,2,25,0.95)'; roundRect(-w / 2 - 1.5, -h / 2 - 1.5, w + 3, h + 3, 5); ctx.fill();
    const pg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    const base = st === 'stub' ? darken(color, 0.35) : color;
    pg.addColorStop(0, darken(base, 0.2)); pg.addColorStop(0.18, lighten(base, 0.6)); pg.addColorStop(0.32, base); pg.addColorStop(0.75, darken(base, 0.35)); pg.addColorStop(1, darken(base, 0.65));
    if (ELOOK) {
      ctx.fillStyle = litGrad(rot, h * 0.62, [[0, lighten(base, 0.55)], [0.28, base], [0.7, darken(base, 0.3)], [1, darken(base, 0.6)]]);
      roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill();
      // 镜面高光：落在朝主光的那个角
      const lx = LX * Math.cos(rot) + LY * Math.sin(rot), ly = -LX * Math.sin(rot) + LY * Math.cos(rot);
      const hx = lx * w * 0.3, hy = ly * h * 0.3, hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, w * 0.32);
      hg.addColorStop(0, 'rgba(255,255,255,0.85)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill();
      ctx.fillStyle = litGrad(rot, h * 0.6, STEEL); roundRect(-w / 2 + 0.5, h / 2 - 3.4, w - 1, 3.2, 1.2); ctx.fill();
    } else {
    ctx.fillStyle = pg; roundRect(-w / 2, -h / 2, w, h, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; roundRect(-w / 2 + 3, -h / 2 + 2.2, w - 6, 1.4, 0.7); ctx.fill();
    // 底部钢箍
    ctx.fillStyle = steel(h / 2 - 3.4, h / 2); roundRect(-w / 2 + 0.5, h / 2 - 3.4, w - 1, 3.2, 1.2); ctx.fill();
    }
    // 钥匙孔
    ctx.fillStyle = 'rgba(10,2,25,0.92)';
    ctx.beginPath(); ctx.arc(0, -1.2, 2.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1, -0.6); ctx.lineTo(1, -0.6); ctx.lineTo(1.6, 3); ctx.lineTo(-1.6, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(0.6, -0.4, 0.7, 0, TAU); ctx.fill();
    if (st === 'stub') {
      // 撬痕
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-w / 2 + 2, -h / 2 + 5); ctx.lineTo(-w / 2 + 7, -h / 2 + 3.5);
      ctx.moveTo(w / 2 - 7, h / 2 - 6); ctx.lineTo(w / 2 - 2.5, h / 2 - 8.5);
      ctx.moveTo(w / 2 - 6, h / 2 - 4.8); ctx.lineTo(w / 2 - 3, h / 2 - 6.4); ctx.stroke();
    }
  }

  // 劫案皮肤：零件飞走时撒出一小撮钞票和硬币，0.5 秒左右散完，不挡后面的操作
  function cashBurst(x, y, t0, c) {
    // 只撒钞票（用户 11-28：比之前多 50%，0.8 秒慢慢散完）
    const n = 6 + Math.min(c, 4) * 3, t = t0 + 40;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, sp = 90 + Math.random() * 150;
      fx.push({ type: 'bill', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, vr: (Math.random() - 0.5) * 7, ph: Math.random() * 6, t0: t + Math.random() * 40, life: 0.75 + Math.random() * 0.1 });
    }
  }

  /*
   * 劫案皮肤的过关效果（海报风，docs/art-bible.md 第 7 节；11-28 起不再有保险柜门）：
   * 放射状硬边光芒（金、橙两色交替，慢慢转）→ 斜切的「SAFE CRACKED」热粉横幅从左边滑进来 →
   * 下面的钞票绿金额标签，数字从 $0 滚到本关得分（每跳一下是一声很轻、越来越高的密码盘咔哒）。
   * 全部是平涂、墨线、往右下的硬投影；不用发光、渐变字和歪着的框（像“拒绝”章）。有钞票的画法（A、B）再加钞票雨。
   */
  const INK = '#1a0b2e', CREAM = '#fff4e0';
  let rain = [], counted = -1, stampFreeze = null; // stampFreeze：截图检查用，把过关动画定格在第几秒
  const easeOutBack = (k) => 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
  // 斜切的海报标签：平涂底 + 墨线 + 往右下的硬投影
  function posterTag(cx, cy, w, h, fill, skew) {
    const sk = h * Math.tan(skew), path = (dx, dy) => { ctx.beginPath(); ctx.moveTo(cx - w / 2 + sk / 2 + dx, cy - h / 2 + dy); ctx.lineTo(cx + w / 2 + sk / 2 + dx, cy - h / 2 + dy); ctx.lineTo(cx + w / 2 - sk / 2 + dx, cy + h / 2 + dy); ctx.lineTo(cx - w / 2 - sk / 2 + dx, cy + h / 2 + dy); ctx.closePath(); };
    ctx.fillStyle = INK; path(0, 5); ctx.fill();
    ctx.fillStyle = fill; path(0, 0); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; path(0, 0); ctx.stroke();
  }
  function posterText(text, x, y, size, fill) {
    ctx.font = size + 'px Anton, Impact, "Arial Narrow", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.fillStyle = INK; ctx.fillText(text, x + 0.5, y + 3.5);
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.strokeText(text, x, y);
    ctx.fillStyle = fill; ctx.fillText(text, x, y);
  }
  function drawStamp(now) {
    if (stampFreeze == null && (!stampAt || now < stampAt)) return;
    const t = stampFreeze != null ? stampFreeze : (now - stampAt) / 1000;
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const cx = W / 2, cy = Math.max(150, oy + bounds.cy * scale - 30);
    // 光芒：硬边扇形，两色交替
    const ra = Math.min(1, t / 0.25), R = Math.hypot(W, H);
    ctx.save(); ctx.globalAlpha = 0.55 * ra; ctx.translate(cx, cy); ctx.rotate(t * 0.25);
    for (let k = 0; k < 16; k++) {
      ctx.fillStyle = k % 2 ? '#ff8a4c' : '#ffc93c';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, (k / 16) * TAU, ((k + 1) / 16) * TAU); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // 钞票雨（只有带钞票的画法）
    if (!NOBILLS) {
      if (!rain.length) for (let i = 0; i < 46; i++) rain.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vy: 160 + Math.random() * 140, ph: Math.random() * 6, vr: (Math.random() - 0.5) * 3, d: Math.random() * 0.5 });
      for (const b of rain) {
        const tt = t - 0.1 - b.d;
        if (tt < 0) continue;
        const y = b.y + b.vy * tt, x = b.x + Math.sin(tt * 3 + b.ph) * 14;
        if (y > H + 20) continue;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(tt * 2 + b.ph) * 0.6 + b.vr * tt); ctx.scale(1.3, 1.3 * (0.35 + 0.65 * Math.abs(Math.cos(tt * 6 + b.ph))));
        ctx.fillStyle = '#0d3a1f'; ctx.fillRect(-6.5, -3.4, 13, 6.8);
        ctx.fillStyle = '#46c072'; ctx.fillRect(-5.8, -2.7, 11.6, 5.4);
        ctx.fillStyle = '#b8f5c8'; ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1.9, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    // 横幅从左边滑进来（带一点回弹）
    const bt = Math.min(1, Math.max(0, (t - 0.12) / 0.32));
    if (bt > 0) {
      const bw = Math.min(W - 40, 320), bx = cx - (1 - easeOutBack(bt)) * (W * 0.9);
      posterTag(bx, cy, bw, 66, '#ff4f9a', -0.1);
      posterText('SAFE CRACKED', bx, cy + 2, 44, CREAM);
    }
    // 金额标签从下面弹上来，数字滚动
    const mt = Math.min(1, Math.max(0, (t - 0.38) / 0.25));
    if (mt > 0) {
      const ck = Math.min(1, Math.max(0, (t - 0.5) / 0.9)), val = Math.round((1 - Math.pow(1 - ck, 3)) * score / 100) * 100;
      if (val !== counted && ck > 0) { counted = val; HA.count(ck); }
      const my = cy + 64 + (1 - easeOutBack(mt)) * 30;
      ctx.globalAlpha = Math.min(1, mt * 2);
      posterTag(cx, my, 190, 50, '#2fbf71', -0.1);
      posterText(money(val), cx, my + 2, 32, CREAM);
    }
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
      if (f.type === 'vanish') {
        const raw2 = (now - f.t0) / 1000;
        if (raw2 < 0) { drawGhost(f, 1, 1); return true; }
        if (raw2 > 0.32) return false;
        const k = raw2 / 0.32, e = 1 - Math.pow(1 - k, 2), sc = 1 + e * 0.12;
        ctx.save();
        ctx.translate(f.x0, f.y0 - e * 6); ctx.scale(sc, sc); ctx.translate(-f.x0, -f.y0);
        drawGhost(f, 1 - e, 1.4 + e);
        ctx.restore();
        return true;
      }
      if (f.type === 'dash') {
        if (raw < 0) { drawGhost(f, 1, 1); return true; }
        const FADE = 0.28;
        if (raw > DASH + FADE) return false;
        const R = f.R, d = dashDist(f, Math.min(raw, DASH));
        const x = f.x0 + f.dx * d, y = f.y0 + f.dy * d;
        const nx = -f.dy, ny = f.dx; // 垂直于前进方向
        const off = R.kind === 'bar' ? 3 : R.r * 0.5;
        // 光带：从起点（尾端随时间往前收）一直拉到零件当前位置
        const tailD = Math.max(0, d - 340) + (raw > DASH ? ((raw - DASH) / FADE) * 340 : 0);
        const fade = raw > DASH ? 1 - (raw - DASH) / FADE : 1;
        if (d > 4) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineCap = 'round';
          const hx = f.x0 + f.dx * d, hy = f.y0 + f.dy * d, tx = f.x0 + f.dx * tailD, ty = f.y0 + f.dy * tailD;
          for (const sg of [1, -1]) {
            const ox = nx * off * sg, oy = ny * off * sg;
            const g1 = ctx.createLinearGradient(tx + ox, ty + oy, hx + ox, hy + oy);
            g1.addColorStop(0, 'rgba(255,40,70,0)'); g1.addColorStop(0.7, 'rgba(255,40,70,' + 0.55 * fade + ')'); g1.addColorStop(1, 'rgba(255,90,110,' + 0.8 * fade + ')');
            ctx.strokeStyle = g1; ctx.lineWidth = 8;
            ctx.beginPath(); ctx.moveTo(tx + ox, ty + oy); ctx.lineTo(hx + ox, hy + oy); ctx.stroke();
            const g2 = ctx.createLinearGradient(tx + ox, ty + oy, hx + ox, hy + oy);
            g2.addColorStop(0, rgba(R.color, 0)); g2.addColorStop(1, rgba(R.color, 0.9 * fade));
            ctx.strokeStyle = g2; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(tx + ox, ty + oy); ctx.lineTo(hx + ox, hy + oy); ctx.stroke();
            const g3 = ctx.createLinearGradient(tx + ox, ty + oy, hx + ox, hy + oy);
            g3.addColorStop(0.4, 'rgba(255,255,255,0)'); g3.addColorStop(1, 'rgba(255,255,255,' + 0.95 * fade + ')');
            ctx.strokeStyle = g3; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(tx + ox, ty + oy); ctx.lineTo(hx + ox, hy + oy); ctx.stroke();
          }
          // 中间一道淡的白色主光带
          const g4 = ctx.createLinearGradient(tx, ty, hx, hy);
          g4.addColorStop(0, 'rgba(255,255,255,0)'); g4.addColorStop(1, 'rgba(255,240,230,' + 0.28 * fade + ')');
          ctx.strokeStyle = g4; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.restore();
        }
        // 零件本体：越快拉得越长（动态模糊感）
        if (raw < DASH) {
          const v = raw < RECOIL ? 0 : ((2 * (f.far + 6)) / Math.pow(DASH - RECOIL, 2)) * (raw - RECOIL);
          const stretch = 1 + Math.min(1.4, v / 3500), squash = 1 / Math.sqrt(stretch);
          const a = Math.atan2(f.dy, f.dx);
          ctx.save();
          ctx.translate(x, y); ctx.rotate(a); ctx.scale(raw < RECOIL ? 0.92 : stretch, raw < RECOIL ? 1.05 : squash); ctx.rotate(-a); ctx.translate(-f.x0, -f.y0);
          drawGhost(f, 1, 1.6 + Math.min(2, v / 2500));
          ctx.restore();
          // 起步瞬间的速度线
          if (raw > RECOIL && raw < RECOIL + 0.12) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.5;
            for (let q = 0; q < 5; q++) {
              const o2 = ((q - 2) / 2) * (off * 2 + 14), l = 30 + q * 7;
              const bx = f.x0 - f.dx * 10 + nx * o2, by = f.y0 - f.dy * 10 + ny * o2;
              ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - f.dx * l, by - f.dy * l); ctx.stroke();
            }
            ctx.restore();
          }
        }
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
          ctx.strokeStyle = HEIST ? '#ff4d6d' : '#fff'; ctx.lineWidth = 2;
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
          ctx.globalAlpha = (1 - t / 0.25) * (f.soft ? 0.45 : 1);
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = rgba(f.R.color, 0.6);
          ctx.lineWidth = TUBE * (f.soft ? 1 - t * 2 : 2 - t * 4);
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
        case 'bill': {
          if (t > f.life) return false;
          // 空气阻力：先冲出去，很快慢下来，再飘着往下落、左右摆
          const k = t / f.life, dragK = (1 - Math.exp(-t * 4.5)) / 4.5;
          const x = f.x + f.vx * dragK + Math.sin(t * 7 + f.ph) * 6 * k, y = f.y + f.vy * dragK + 110 * t * t;
          ctx.save();
          ctx.globalAlpha = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
          ctx.translate(x, y); ctx.rotate(f.vr * t + f.ph); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(t * 11 + f.ph)));
          ctx.fillStyle = '#0d3a1f'; ctx.fillRect(-6.5, -3.4, 13, 6.8);
          ctx.fillStyle = '#46c072'; ctx.fillRect(-5.8, -2.7, 11.6, 5.4);
          ctx.fillStyle = '#b8f5c8'; ctx.beginPath(); ctx.ellipse(0, 0, 2.2, 1.9, 0, 0, TAU); ctx.fill();
          ctx.restore();
          return true;
        }
        case 'coin': {
          if (t > f.life) return false;
          const k = t / f.life, x = f.x + f.vx * t, y = f.y + f.vy * t + 900 * t * t;
          ctx.save();
          ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
          ctx.translate(x, y); ctx.scale(0.25 + 0.75 * Math.abs(Math.cos(t * 22 + f.ph)), 1);
          const cg = ctx.createLinearGradient(-3, -3, 3, 3);
          cg.addColorStop(0, '#fff3b0'); cg.addColorStop(0.5, '#f2b630'); cg.addColorStop(1, '#8a5a00');
          ctx.fillStyle = '#3a2200'; ctx.beginPath(); ctx.arc(0, 0, 4.1, 0, TAU); ctx.fill();
          ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.fill();
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
    if (G && !won && now - lastProgress > 25000 && !document.querySelector('.overlay.show')) stuckReact();
    // 慢镜头：0.28 倍速持续约 1 秒，再在 0.5 秒内恢复
    let sm = 0;
    if (probeHold != null && slowmo) slowmo.t0 = now - probeHold * 1000; // 截图时定格在指定时刻
    if (slowmo) {
      sm = (now - slowmo.t0) / 1000;
      timeScale = sm < 0 ? 1 : sm < 0.85 ? 0.3 : sm < 1.25 ? 0.3 + ((sm - 0.85) / 0.4) * 0.7 : 1;
      if (sm > 1.45) slowmo = null;
    }
    fxClock += (now - fxReal) * timeScale; fxReal = now;
    // 劫案皮肤：右上角赃款数字 0.45 秒内滚到新值
    if (HEIST && shownScore !== score) {
      const step = Math.max(100, Math.ceil(Math.abs(score - shownScore) * Math.min(1, (now - lastT) / 150) / 100) * 100);
      shownScore = score > shownScore ? Math.min(score, shownScore + step) : score;
      $('score').textContent = money(shownScore);
    }
    if (HEIST && drag && drag.lastMoveT && now - drag.lastMoveT > 60) { drag.v = 0; drag.lastMoveT = 0; HA.friction(0); }
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
      if (HEIST) drawStamp(now);
    }
    // 慢镜头期间：宽银幕黑边 + RGB 分离（D）
    if (slowmo && sm >= 0) {
      const inK = Math.min(1, sm / 0.2), outK = sm > 1.05 ? Math.max(0, 1 - (sm - 1.05) / 0.35) : 1;
      const bar = H * 0.09 * inK * outK;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#05010d';
      ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar);
      const ab = sm < 0.12 ? sm / 0.12 : Math.max(0, 1 - (sm - 0.12) / 0.9);
      if (ab > 0.02) rgbSplit(Math.round(4 * DPR * ab));
    }
    if (REAL) realLight(now); else if (CINE) cineGrade(now);
  }
  // D 写实的每帧后期：只有顶部一道很淡的横向镜头光条，不加颗粒、不叠整屏调色
  function realLight(now) {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = cv.width, ly = cv.height * 0.155, br = 0.75 + 0.25 * Math.sin(now / 1700);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(60,180,255,0)'); g.addColorStop(0.5, 'rgba(160,225,255,' + 0.18 * br + ')'); g.addColorStop(1, 'rgba(60,180,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, ly - 1 * DPR, w, 2 * DPR);
    ctx.restore();
  }

  /*
   * B 电影感后期：青橙调色（上冷下暖，像迈阿密的黄金时刻）→ 暗角 → 横向的变形镜头光条 → 会动的胶片颗粒。
   * 都是整屏一次填充，iPhone 上也很便宜。
   */
  let grain = null, grainPat = null;
  function cineGrade(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const w = cv.width, h = cv.height;
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    let g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,170,210,0.32)'); g.addColorStop(0.55, 'rgba(255,170,90,0.1)'); g.addColorStop(1, 'rgba(255,110,20,0.38)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 提亮中间调、加对比（“高清”感）：用 overlay 叠一层暖色的中灰
    ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = 'rgba(255,200,150,0.16)'; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    g = ctx.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.45, w / 2, h * 0.48, Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(10,0,6,0.42)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // 变形镜头光条
    ctx.globalCompositeOperation = 'lighter';
    const ly = h * 0.155, br = 0.75 + 0.25 * Math.sin(now / 1700);
    g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(60,180,255,0)'); g.addColorStop(0.5, 'rgba(140,220,255,' + 0.22 * br + ')'); g.addColorStop(1, 'rgba(60,180,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, ly - 1.2 * DPR, w, 2.4 * DPR);
    ctx.globalAlpha = 0.35; ctx.fillRect(0, ly - 7 * DPR, w, 14 * DPR); ctx.globalAlpha = 1;
    // 胶片颗粒
    if (!grain) {
      grain = document.createElement('canvas'); grain.width = grain.height = 160;
      const x = grain.getContext('2d'), im = x.createImageData(160, 160);
      for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      x.putImageData(im, 0, 0);
      grainPat = ctx.createPattern(grain, 'repeat');
    }
    ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.09;
    ctx.translate(Math.random() * 160, Math.random() * 160);
    ctx.fillStyle = grainPat; ctx.fillRect(-160, -160, w + 320, h + 320);
    ctx.restore();
  }

  // iOS：禁止双指缩放和长按菜单
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchend', () => SFX.ensure(), { passive: true });

  window.addEventListener('resize', resize);
  resize();
  const qLevel = parseInt((location.search.match(/[?&]level=(\d+)/) || [])[1] || TEST_LEVEL, 10) - 1;
  if (qLevel >= 0 && qLevel < LEVELS.length && unlocked(qLevel)) loadLevel(qLevel);
  else loadLevel(Math.max(0, Math.min(LEVELS.length - 1, Object.keys(progress).length)));
  requestAnimationFrame(frame);
  if (!(qLevel >= 0 && qLevel < LEVELS.length && unlocked(qLevel))) openMenu();
  if (/[?&]open=settings/.test(location.search)) openSettings();
  if (/[?&]notrans/.test(location.search)) document.body.classList.add('notrans');
  const qReact = (location.search.match(/[?&]react=(\w+)/) || [])[1];
  if (qReact) setTimeout(() => { $('tip').classList.remove('show'); Girl.react(qReact); }, 500);
  if (/[?&]open=album/.test(location.search)) setTimeout(openAlbum, 300);
  if (/[?&]debug=fc/.test(location.search)) setTimeout(() => { document.title = 'FC ' + frameCount; }, 1500);
  // 截图检查特效用：?probe=short|burst|slow&pi=环序号&pt=秒
  const probe = (location.search.match(/[?&]probe=(\w+)/) || [])[1];
  if (probe) setTimeout(() => {
    const pi = +((location.search.match(/[?&]pi=(\d+)/) || [])[1] || 0), pt = +((location.search.match(/[?&]pt=([\d.]+)/) || [])[1] || 0.1);
    $('tip').classList.remove('show');
    if (probe === 'win') { S.ring = S.ring.map(() => false); S.link = S.link.map(() => false); won = true; score = 11000; stampFreeze = pt; return; }
    if (probe === 'slow') { slowmo = { t0: performance.now() - pt * 1000 }; probeHold = pt; frame(); return; }
    const R = G.rings[pi];
    S.ring[pi] = false; G.links.forEach((L) => { if (L.owner === pi || L.held === pi) S.link[L.k] = false; });
    if (probe === 'dash') { frame(); flyAway(pi, fxClock - pt * 1000, 2); S.ring[pi] = false; timeScale = 0; frame(); frame(); return; }
  }, 400);
  // ?logo=a|b|c：切换主页 logo 样式（给美术对比用）
  const qLogo = (location.search.match(/[?&]logo=([abc])/) || [])[1];
  if (qLogo) { const h = document.querySelector('.hhead .nlogo'); h.classList.remove('lg-chrome', 'lg-tube', 'lg-outrun'); h.classList.add({ a: 'lg-chrome', b: 'lg-tube', c: 'lg-outrun' }[qLogo]); }
  const qLang = (location.search.match(/[?&]lang=(\w+)/) || [])[1];
  if (qLang) { I18N.set(qLang); refreshTexts(); syncToggles(); }

  // 给验证脚本用的接口
  window.__neon = {
    get state() { return { levelIndex, angles: S.angles.slice(), ring: S.ring.slice(), link: S.link.slice(), moves, score, won, dragging: !!drag, frameCount }; },
    loadLevel, openAlbum, girl: () => Girl.expr,
    toScreen(x, y) { return { x: ox + x * scale, y: oy + y * scale }; },
  };
})();

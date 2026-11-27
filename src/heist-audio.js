/*
 * 撬锁劫案音效（美术风格测试关用，?skin=heist 或 <html data-skin="heist">）。
 * 全部实时合成，没有外部音频文件。思路是“模态合成”：金属件被敲一下，会按自己的几个固有频率衰减振动，
 * 每个声音 = 一个很短的撞击噪声 + 几个按指数衰减的正弦（频率、衰减时间、响度各不相同）。
 *
 * 保险柜密码盘的声音拆成这几层（这是贯穿整个游戏的声音，所以分得很细）：
 *   1. 卡位咔哒（detent）：转盘每转 6° 过一个卡位。真锁的卡位是弹片先碰到齿尖、再落进齿槽，
 *      所以每一下其实是两下：很轻的“t”接 1.7 毫秒后的“k”。每 36° 一个重卡位，声音更低更厚，像刻度盘上的大格。
 *      卡位跟着环的绝对角度走：来回拧，咔哒落在同一个位置，手感像真的。
 *   2. 摩擦底噪：转动时轴承和盘面的沙沙声，越快越响、越亮。快速转动时单个咔哒会被合并，靠底噪撑住连续感。
 *   3. 落槽（gate）：缺口转到夹套处 = 转盘的槽口对上了锁杆，锁杆“咚”地落进去。比卡位低、重、长，
 *      前面带一下锁杆擦过槽边的轻响，后面带一下回弹。这是玩家最想听到的声音。
 *   4. 出槽（regate）：缺口转走、重新扣上：先一下短促的刮擦，再一下中等的咔哒。
 *   5. 开锁弹出（shackle）：零件飞走 = 挂锁锁梁被弹簧弹开，钢件会“铮”地响一会儿，连击时一级级升调。
 *      接着几枚硬币落下的叮当声（连击越多硬币越多）。
 *   6. 其他：撞到警报触点（闷的金属敲击 + 一声很轻的传感器提示）、拧不动（被锁住的把手晃三下）、
 *      手指按上转盘（滚花表面的轻触）、直杆是金条在卡座里滑（低沉的“嗒”）、
 *      过关是金库门的三根门闩依次退开，最后收银机“咔-叮”。
 * 每种声音预先合成 3-4 个略有差别的版本，播放时再随机微调音高，听起来不会像机器重复。
 * 环越大，声音越低：每个环有自己的“嗓音”。声音按零件在屏幕上的位置左右声像。
 */
(function (root) {
  'use strict';
  const A = root.RRAudio;
  let ac = null, out = null, bank = null, noiseBuf = null, fr = null, lastDetent = 0;

  // ---- 合成 ----
  // 简单的 RBJ 带通，用来做刮擦声
  function bandpass(x, sr, f, q) {
    const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), cw = Math.cos(w);
    const b0 = al, b2 = -al, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = (b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  }
  /*
   * spec = { dur, hits: [{ at, g, modes: [[频率, 衰减秒, 响度]], click, clickDec }], scrape: [{ at, dur, f, q, g }] }
   * jit：频率和响度的随机偏差，用来做同一种声音的几个版本
   */
  const SR = 48000;
  const newBuf = (n) => (typeof AudioBuffer === 'function' && AudioBuffer.length !== undefined ? (() => { try { return new AudioBuffer({ length: n, sampleRate: SR, numberOfChannels: 1 }); } catch (e) { return null; } })() : null) || (ac && ac.createBuffer(1, n, SR));
  function render(spec, jit) {
    const sr = SR, n = Math.ceil(spec.dur * sr), d = new Float32Array(n);
    const J = (k) => 1 + (Math.random() * 2 - 1) * k;
    for (const h of spec.hits || []) {
      const i0 = Math.floor(h.at * sr), g = h.g * J(jit * 2);
      for (const [f0, dec0, amp0] of h.modes) {
        const f = f0 * J(jit), dec = dec0 * J(jit * 2), amp = amp0 * J(jit * 4) * g, ph = Math.random() * 6.283, w = 2 * Math.PI * f / sr;
        const len = Math.min(n - i0, Math.ceil(dec * 7 * sr));
        for (let i = 0; i < len; i++) {
          const t = i / sr;
          d[i0 + i] += amp * Math.exp(-t / dec) * (1 - Math.exp(-t / 0.00012)) * Math.sin(w * i + ph);
        }
      }
      if (h.click) {
        // 撞击瞬间的宽带噪声，减去上一个样本做一次高通，让它更“脆”
        const dec = h.clickDec || 0.0003, len = Math.min(n - i0, Math.ceil(dec * 8 * sr));
        let prev = 0;
        for (let i = 0; i < len; i++) { const v = Math.random() * 2 - 1; d[i0 + i] += h.click * g * (v - prev * 0.6) * Math.exp(-i / sr / dec); prev = v; }
      }
    }
    for (const s of spec.scrape || []) {
      const i0 = Math.floor(s.at * sr), len = Math.min(n - i0, Math.ceil(s.dur * sr)), x = new Float32Array(len);
      for (let i = 0; i < len; i++) x[i] = Math.random() * 2 - 1;
      const y = bandpass(x, sr, s.f * J(jit), s.q);
      for (let i = 0; i < len; i++) { const k = i / len, env = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7; d[i0 + i] += y[i] * env * s.g * 3; }
    }
    let pk = 0;
    for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    // 结尾 3 毫秒淡出，避免截断时“啪”一下
    const fade = Math.floor(0.003 * sr);
    for (let i = 0; i < fade && i < n; i++) d[n - 1 - i] *= i / fade;
    if (pk > 0) for (let i = 0; i < n; i++) d[i] *= 0.9 / pk;
    const b = newBuf(n); b.getChannelData(0).set(d);
    return b;
  }

  const SPECS = {
    // 小卡位：弹片碰齿尖（t）→ 落进齿槽（k）
    tick: { dur: 0.045, hits: [
      { at: 0, g: 0.42, modes: [[3400, 0.0025, 0.6], [5200, 0.0018, 0.4]], click: 0.5, clickDec: 0.00025 },
      { at: 0.0017, g: 1, modes: [[2950, 0.0055, 0.55], [4630, 0.0035, 0.38], [6880, 0.0022, 0.25], [1630, 0.009, 0.2], [230, 0.005, 0.35]], click: 0.7, clickDec: 0.0003 },
    ] },
    // 大卡位（每 36°）：更低、更厚
    major: { dur: 0.07, hits: [
      { at: 0, g: 0.5, modes: [[2900, 0.003, 0.6], [4400, 0.002, 0.4]], click: 0.5, clickDec: 0.0003 },
      { at: 0.0024, g: 1, modes: [[2350, 0.009, 0.55], [3720, 0.006, 0.4], [5480, 0.0038, 0.25], [1180, 0.016, 0.3], [160, 0.011, 0.5]], click: 0.75, clickDec: 0.00035 },
    ] },
    // 落槽：锁杆擦过槽边 → 落进槽口 → 回弹
    gate: { dur: 0.2, hits: [
      { at: 0, g: 0.3, modes: [[3600, 0.003, 0.5], [5400, 0.002, 0.3]], click: 0.4 },
      { at: 0.016, g: 1, modes: [[860, 0.032, 0.5], [1420, 0.022, 0.42], [2290, 0.014, 0.3], [3650, 0.007, 0.2], [5200, 0.004, 0.12], [108, 0.04, 0.8], [432, 0.03, 0.4], [648, 0.026, 0.32]], click: 0.6, clickDec: 0.0005 },
      { at: 0.054, g: 0.22, modes: [[2100, 0.006, 0.4], [3300, 0.004, 0.3]], click: 0.2 },
    ] },
    // 出槽：刮一下，再一下中等的咔哒
    regate: { dur: 0.07, scrape: [{ at: 0, dur: 0.02, f: 2300, q: 3, g: 0.25 }], hits: [
      { at: 0.019, g: 0.8, modes: [[2600, 0.005, 0.5], [4100, 0.0035, 0.35], [200, 0.006, 0.3]], click: 0.5 },
    ] },
    // 挂锁锁梁弹开：钢件“铮”一声，再一下“嗒”（锁梁撞到限位）
    shackle: { dur: 0.36, hits: [
      { at: 0, g: 1, modes: [[1980, 0.11, 0.35], [3140, 0.075, 0.28], [4870, 0.045, 0.2], [7020, 0.025, 0.12], [820, 0.03, 0.25], [170, 0.025, 0.55]], click: 0.9, clickDec: 0.0006 },
      { at: 0.028, g: 0.45, modes: [[1250, 0.02, 0.4], [2600, 0.012, 0.3], [130, 0.02, 0.5]], click: 0.4 },
    ] },
    // 硬币：落地，再轻轻弹一下
    coin: { dur: 0.22, hits: [
      { at: 0, g: 1, modes: [[5274, 0.06, 0.32], [7930, 0.04, 0.24], [10900, 0.025, 0.14], [3720, 0.08, 0.12], [13200, 0.012, 0.08]], click: 0.35, clickDec: 0.0002 },
      { at: 0.048, g: 0.32, modes: [[5274, 0.04, 0.32], [7930, 0.03, 0.24], [3720, 0.05, 0.12]], click: 0.2, clickDec: 0.0002 },
    ] },
    // 撞到警报触点：闷的金属敲击
    knock: { dur: 0.1, hits: [
      { at: 0, g: 1, modes: [[540, 0.022, 0.5], [1270, 0.013, 0.36], [2230, 0.008, 0.22], [3400, 0.004, 0.12], [150, 0.03, 0.55], [880, 0.016, 0.3]], click: 0.35, clickDec: 0.0004 },
    ] },
    // 拧不动：被锁住的把手晃一下（播放三次）
    rattle: { dur: 0.11, hits: [
      { at: 0, g: 1, modes: [[330, 0.028, 0.5], [780, 0.018, 0.35], [1620, 0.01, 0.22], [2900, 0.005, 0.12], [95, 0.04, 0.6], [1080, 0.014, 0.3], [560, 0.022, 0.35]], click: 0.4, clickDec: 0.0005 },
    ] },
    // 手指按上滚花转盘
    touch: { dur: 0.035, scrape: [{ at: 0.002, dur: 0.018, f: 3200, q: 1.5, g: 0.12 }], hits: [
      { at: 0, g: 1, modes: [[1850, 0.004, 0.35], [2980, 0.003, 0.25], [280, 0.005, 0.35]], click: 0.3, clickDec: 0.0002 },
    ] },
    // 金条在卡座里滑过一格
    slide: { dur: 0.05, hits: [
      { at: 0, g: 1, modes: [[720, 0.013, 0.45], [1540, 0.008, 0.3], [2650, 0.004, 0.15], [170, 0.016, 0.5], [1050, 0.01, 0.25]], click: 0.3 },
    ] },
    // 金库门闩：先刮着退出去，最后“咚”到底
    bolt: { dur: 0.36, scrape: [{ at: 0, dur: 0.075, f: 1300, q: 2, g: 0.3 }], hits: [
      { at: 0.072, g: 1, modes: [[196, 0.09, 0.6], [436, 0.06, 0.45], [884, 0.035, 0.3], [1660, 0.016, 0.2], [2900, 0.007, 0.1], [72, 0.11, 0.9], [1290, 0.03, 0.3], [640, 0.05, 0.4]], click: 0.5, clickDec: 0.0008 },
    ] },
    // 收银机：抽屉弹出“咔”+ 铃“叮”两下
    ching: { dur: 0.75, hits: [
      { at: 0, g: 0.7, modes: [[900, 0.02, 0.3], [180, 0.03, 0.5]], click: 0.7, clickDec: 0.0006 },
      { at: 0.06, g: 0.8, modes: [[2637, 0.28, 0.32], [3951, 0.2, 0.24], [5274, 0.12, 0.16], [6650, 0.07, 0.1]], click: 0.3, clickDec: 0.0002 },
      { at: 0.145, g: 0.85, modes: [[3136, 0.3, 0.3], [4699, 0.2, 0.22], [6272, 0.12, 0.14]], click: 0.3, clickDec: 0.0002 },
    ] },
    // 界面按钮：金属拨动开关
    button: { dur: 0.03, hits: [
      { at: 0, g: 1, modes: [[2400, 0.004, 0.4], [3800, 0.003, 0.3], [300, 0.004, 0.3]], click: 0.4, clickDec: 0.0002 },
    ] },
  };

  // 声音库在页面空闲时就合成好（约 0.1 秒），第一次按下转盘时不卡
  function buildBank() {
    if (bank) return;
    const b = {};
    for (const k in SPECS) b[k] = [0, 1, 2, 3].map(() => render(SPECS[k], 0.03));
    bank = b;
  }
  if (typeof window !== 'undefined') {
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 300));
    idle(() => { try { buildBank(); } catch (e) { bank = null; } });
  }

  function setup() {
    const g = A.graph();
    if (!g) return false;
    if (ac === g.ac) return true;
    ac = g.ac;
    // 总线：压缩器防止连锁时叠爆 → 总音量；再并一路很短的“箱体”混响，让声音像在金属柜里，不那么干
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.002; comp.release.value = 0.12;
    comp.connect(g.master);
    out = ac.createGain(); out.gain.value = 1; out.connect(comp);
    if (ac.createConvolver) {
      const sr = ac.sampleRate, len = Math.floor(sr * 0.16), ir = ac.createBuffer(2, len, sr);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c); let lp = 0;
        for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.exp(-i / sr / 0.032); }
      }
      const cv = ac.createConvolver(); cv.buffer = ir;
      const wet = ac.createGain(); wet.gain.value = 0.16;
      out.connect(cv); cv.connect(wet); wet.connect(comp);
    }
    buildBank();
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); let b = 0;
    for (let i = 0; i < nd.length; i++) { b = b * 0.6 + (Math.random() * 2 - 1) * 0.4; nd[i] = b; }
    fr = null;
    return true;
  }

  // pan：-1（左）到 1（右）；rate：变速（同时变调）
  function play(name, o) {
    if (!setup()) return;
    o = o || {};
    const vs = bank[name], src = ac.createBufferSource();
    src.buffer = vs[(Math.random() * vs.length) | 0];
    src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() * 2 - 1) * (o.jit != null ? o.jit : 0.025));
    const g = ac.createGain(); g.gain.value = o.gain != null ? o.gain : 0.4;
    src.connect(g);
    if (o.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); g.connect(p); p.connect(out); }
    else g.connect(out);
    src.start(ac.currentTime + (o.at || 0));
  }

  // 摩擦底噪：一直循环播放，用音量和滤波频率跟着转速走
  function friction(v, bar) {
    if (!setup()) return;
    if (!fr) {
      const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9; bp.frequency.value = 1200;
      const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
      const g = ac.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(hp); hp.connect(g); g.connect(out); src.start();
      fr = { bp, g };
    }
    const t = ac.currentTime, k = Math.min(1, Math.max(0, v) / (bar ? 500 : 650));
    fr.g.gain.setTargetAtTime(v > 0 ? (bar ? 0.09 : 0.055) * Math.pow(k, 0.8) : 0, t, v > 0 ? 0.025 : 0.06);
    fr.bp.frequency.setTargetAtTime(bar ? 520 + k * 700 : 900 + k * 1700, t, 0.04);
  }

  const voice = (r) => Math.max(0.82, Math.min(1.12, Math.pow(36 / (r || 36), 0.18))); // 环越大越低
  const STEPS = [0, 2, 4, 7, 9, 12]; // 连击升调用的五声音阶

  root.RRHeistAudio = {
    // 试听页和自检用：合成好的声音库
    _bank() { buildBank(); return bank; },
    _specs: SPECS,
    /*
     * 过一个卡位。major：大格（每 36°）；r：环半径；pan：声像；speed：转速（度/秒）。
     * 两个卡位间隔不到 12 毫秒就跳过（太快时单个咔哒听不清，交给摩擦底噪），返回是否真的响了。
     */
    detent(major, r, pan, speed) {
      if (!setup()) return false;
      const now = ac.currentTime;
      if (now - lastDetent < 0.012) return false;
      lastDetent = now;
      const soft = 1 - 0.35 * Math.min(1, (speed || 0) / 900);
      play(major ? 'major' : 'tick', { gain: (major ? 0.5 : 0.33) * soft, rate: voice(r), pan: pan * 0.5 });
      return true;
    },
    slideStep(pan) { play('slide', { gain: 0.42, pan: pan * 0.5 }); },
    friction,
    gate(r, pan) { play('gate', { gain: 0.62, rate: voice(r), pan: pan * 0.5, jit: 0.015 }); },
    regate(r, pan) { play('regate', { gain: 0.38, rate: voice(r), pan: pan * 0.5 }); },
    // 零件飞走：锁梁弹开（连击升调）+ 硬币
    release(combo, pan) {
      const c = Math.max(0, Math.min(combo | 0, STEPS.length - 1));
      play('shackle', { gain: 0.5, rate: Math.pow(2, STEPS[c] / 12), pan: pan * 0.5, jit: 0.01 });
      const coins = 2 + Math.min(c, 4);
      for (let i = 0; i < coins; i++) play('coin', { gain: 0.16 + Math.random() * 0.1, rate: 0.9 + Math.random() * 0.25, pan: pan * 0.5 + (Math.random() - 0.5) * 0.6, at: 0.06 + i * 0.045 + Math.random() * 0.05 });
    },
    // 撞到凸钉（警报触点）：闷响 + 一声很轻的传感器提示
    knock(pan) {
      play('knock', { gain: 0.5, pan: pan * 0.5 });
      if (!setup()) return;
      const t = ac.currentTime + 0.01, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'square'; o.frequency.value = 1960; lp.type = 'lowpass'; lp.frequency.value = 2600;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.018, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.08);
    },
    // 拧不动：把手晃三下，一下比一下轻
    locked(pan) { [0, 0.06, 0.115].forEach((at, i) => play('rattle', { gain: 0.42 * [1, 0.7, 0.45][i], at, pan: pan * 0.5, rate: [1, 1.04, 0.97][i] })); },
    touch(pan) { play('touch', { gain: 0.26, pan: pan * 0.5 }); },
    // 松手：很轻的一下，比按下更低
    drop(pan) { play('touch', { gain: 0.12, rate: 0.8, pan: pan * 0.5 }); },
    button() { play('button', { gain: 0.3 }); },
    // 飞走时的风声（跑车拖影还在，只保留风声，不要引擎声）
    whoosh(n) {
      if (!setup()) return;
      const t = ac.currentTime, src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = noiseBuf; bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(3800 + (n | 0) * 200, t); bp.frequency.exponentialRampToValueAtTime(600, t + 0.28);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      src.connect(bp); bp.connect(g); g.connect(out); src.start(t, Math.random() * 0.5); src.stop(t + 0.32);
    },
    // 过关第一段：金库门的三根门闩依次退开
    vault() { [0, 0.17, 0.34].forEach((at, i) => play('bolt', { gain: 0.6, at, rate: [1, 0.95, 0.9][i], jit: 0.01 })); },
    // 过关第二段（弹出过关面板时）：收银机“咔-叮”+ 一个温暖的和弦垫底
    win() {
      play('ching', { gain: 0.42, jit: 0.005 });
      if (!setup()) return;
      const t = ac.currentTime + 0.12;
      [261.63, 329.63, 392, 523.25].forEach((f, i) => {
        const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 1500;
        g.gain.setValueAtTime(0.0001, t + i * 0.03); g.gain.exponentialRampToValueAtTime(0.035, t + i * 0.03 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
        o.connect(lp); lp.connect(g); g.connect(out); o.start(t + i * 0.03); o.stop(t + 1.35);
      });
    },
    // 困难关开场：两声低沉的警报
    alarm() {
      if (!setup()) return;
      const t = ac.currentTime, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 900;
      [0, 0.22, 0.44, 0.66].forEach((at, i) => o.frequency.setValueAtTime(i % 2 ? 520 : 690, t + at));
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.03); g.gain.setValueAtTime(0.05, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + 0.92);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);

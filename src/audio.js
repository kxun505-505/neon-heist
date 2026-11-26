/*
 * 音效：全部用 Web Audio 实时合成，没有外部音频文件。
 */
(function (root) {
  'use strict';
  let ac = null, master = null;
  let muted = localStorage.getItem('neonloops-muted') === '1';

  function ensure() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.7;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone({ type = 'sine', f0, f1, dur, gain = 0.2, at = 0, cutoff }) {
    if (!ensure() || muted) return;
    const t = ac.currentTime + at;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (cutoff) {
      const fl = ac.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.value = cutoff;
      o.connect(fl);
      node = fl;
    }
    node.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // 白噪声：电火花“滋滋”声、慢镜头的风声
  let noiseBuf = null;
  function noise({ dur, gain = 0.1, f = 2500, q = 1.2, at = 0, type = 'bandpass' }) {
    if (!ensure() || muted) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.6), ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ac.currentTime + at;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.3); src.stop(t + dur + 0.02);
  }

  const NOTES = [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.5];

  root.RRAudio = {
    ensure,
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      localStorage.setItem('neonloops-muted', muted ? '1' : '0');
      if (master) master.gain.value = muted ? 0 : 0.7;
      return muted;
    },
    // 背景音乐：先占位，开关状态会保存，以后接入音乐时直接读取
    get music() { return localStorage.getItem('neonloops-music') !== '0'; },
    setMusic(on) { localStorage.setItem('neonloops-music', on ? '1' : '0'); },
    tick() { tone({ type: 'triangle', f0: 2600, f1: 1700, dur: 0.016, gain: 0.035 }); },
    grab() { tone({ type: 'sine', f0: 520, f1: 760, dur: 0.06, gain: 0.08 }); },
    drop() { tone({ type: 'sine', f0: 620, f1: 420, dur: 0.06, gain: 0.05 }); },
    bump() {
      tone({ type: 'sine', f0: 180, f1: 90, dur: 0.08, gain: 0.22 });
      tone({ type: 'square', f0: 1400, f1: 900, dur: 0.015, gain: 0.03 });
    },
    slip() {
      tone({ type: 'square', f0: 2200, f1: 1200, dur: 0.02, gain: 0.05 });
      tone({ type: 'sine', f0: 900, f1: 1500, dur: 0.07, gain: 0.1, at: 0.01 });
    },
    banner() {
      tone({ type: 'sawtooth', f0: 220, f1: 440, dur: 0.35, gain: 0.08, cutoff: 1800 });
      tone({ type: 'sawtooth', f0: 330, f1: 660, dur: 0.35, gain: 0.06, cutoff: 1800, at: 0.05 });
    },
    free(n) {
      const f = NOTES[Math.max(0, Math.min(n | 0, NOTES.length - 1))];
      tone({ type: 'sawtooth', f0: f, dur: 0.35, gain: 0.12, cutoff: 2400 });
      tone({ type: 'sine', f0: f * 2, dur: 0.25, gain: 0.06, at: 0.03 });
    },
    locked() {
      tone({ type: 'square', f0: 140, f1: 90, dur: 0.14, gain: 0.07, cutoff: 900 });
      tone({ type: 'square', f0: 140, f1: 90, dur: 0.12, gain: 0.06, cutoff: 900, at: 0.09 });
    },
    unlock() {
      tone({ type: 'triangle', f0: 880, dur: 0.08, gain: 0.12 });
      tone({ type: 'triangle', f0: 1320, dur: 0.12, gain: 0.12, at: 0.07 });
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone({ type: 'sawtooth', f0: f, dur: 0.5, gain: 0.1, cutoff: 3000, at: i * 0.09 }));
      [261.63, 329.63, 392].forEach((f) => tone({ type: 'triangle', f0: f, dur: 1.2, gain: 0.08, at: 0.45 }));
    },
    button() { tone({ type: 'triangle', f0: 1200, f1: 900, dur: 0.05, gain: 0.07 }); },
    // 霓虹灯短路：三下“滋”的电火花，节奏和画面上的闪烁对齐
    zap() {
      [[0, 0.05], [0.08, 0.045], [0.155, 0.085]].forEach(([at, dur]) => {
        noise({ dur, gain: 0.14, f: 3200 + Math.random() * 1500, q: 0.9, at });
        tone({ type: 'square', f0: 95 + Math.random() * 30, dur, gain: 0.035, cutoff: 1400, at });
      });
    },
    // 灯管爆掉
    burst() {
      noise({ dur: 0.18, gain: 0.16, f: 1800, q: 0.6 });
      tone({ type: 'sine', f0: 240, f1: 70, dur: 0.18, gain: 0.18 });
    },
    // 结尾慢镜头：像磁带被拖慢一样往下滑的音调，加一阵风声
    slowmo() {
      tone({ type: 'sawtooth', f0: 520, f1: 60, dur: 1.1, gain: 0.07, cutoff: 1200 });
      tone({ type: 'sine', f0: 180, f1: 40, dur: 1.2, gain: 0.16 });
      noise({ dur: 1.2, gain: 0.06, f: 600, q: 0.4, type: 'lowpass' });
    },
  };
})(window);

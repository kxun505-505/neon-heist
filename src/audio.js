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
    tick() { tone({ type: 'triangle', f0: 2400, f1: 1500, dur: 0.018, gain: 0.05 }); },
    snap() {
      tone({ type: 'sine', f0: 320, f1: 130, dur: 0.09, gain: 0.25 });
      tone({ type: 'square', f0: 3200, f1: 2000, dur: 0.012, gain: 0.03 });
    },
    free(n) {
      const f = NOTES[Math.min(n, NOTES.length - 1)];
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
  };
})(window);

/*
 * 震动反馈。
 * - Android 等支持 Vibration API 的浏览器：navigator.vibrate，按事件用不同的节奏。
 * - iPhone：Safari 不支持 Vibration API。这里用 WebKit 原生开关控件 <input type="checkbox" switch>
 *   被切换时系统会“嗒”一下的特性（参考开源项目 tijnjh/ios-haptics、m1ckc3s/project-fathom）：
 *   1) 脚本触发：点击一个隐藏的开关。iOS 18 ~ 26.4 有效；iOS 26.5 起苹果禁止了脚本触发。
 *   2) 直接点击：在按钮上盖一层透明的原生开关，手指点按钮时实际点到的是开关，任何 iOS 18+ 都有效。
 *   所以在新版 iOS 上，按钮点按有震感，拖动过程中的震感（碰撞、脱开、飞走）只能在 Android 上体验。
 */
(function (root) {
  'use strict';
  const KEY = 'neonloops-vibe';
  let enabled = localStorage.getItem(KEY) !== '0';
  const canVibrate = typeof navigator.vibrate === 'function';
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // 隐藏的原生开关，用于脚本触发
  let hiddenLabel = null;
  function ensureHidden() {
    if (hiddenLabel || !isIOS) return;
    hiddenLabel = document.createElement('label');
    hiddenLabel.setAttribute('aria-hidden', 'true');
    hiddenLabel.style.cssText = 'position:fixed;left:-100px;top:-100px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('switch', '');
    hiddenLabel.appendChild(input);
    document.body.appendChild(hiddenLabel);
  }

  const PATTERNS = {
    tap: 8, grab: 8, tick: 4, bump: 14, open: 16, close: 6, fly: 28,
    blocked: [12, 40, 12], win: [30, 60, 30, 60, 90],
  };
  let last = 0;

  function fire(kind) {
    if (!enabled) return;
    const now = performance.now();
    if (kind === 'tick' && now - last < 60) return;
    last = now;
    if (canVibrate) { navigator.vibrate(PATTERNS[kind] || 10); return; }
    if (isIOS) { ensureHidden(); try { hiddenLabel.click(); } catch (e) { /* 不支持就算了 */ } }
  }

  // 给按钮盖一层透明的原生开关：直接点按时 iOS 会震一下，点击事件照常冒泡到按钮
  function attach(btn) {
    if (!isIOS || !btn || btn.querySelector('.hapsw')) return;
    const sw = document.createElement('input');
    sw.type = 'checkbox';
    sw.setAttribute('switch', '');
    sw.className = 'hapsw';
    sw.tabIndex = -1;
    sw.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.appendChild(sw);
  }

  if (!enabled) document.addEventListener('DOMContentLoaded', () => document.body.classList.add('novibe'));
  if (!enabled && document.body) document.body.classList.add('novibe');

  root.RRHaptics = {
    fire, attach,
    get enabled() { return enabled; },
    set(on) {
      enabled = !!on;
      try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) { /* 隐私模式 */ }
      document.body.classList.toggle('novibe', !enabled);
      if (enabled) fire('tap');
    },
  };
})(window);

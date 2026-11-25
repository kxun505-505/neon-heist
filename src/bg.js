/*
 * 背景：程序绘制的原创日落海岸场景（夕阳、条纹太阳、海面倒影、棕榈剪影、远处楼群）。
 * 不使用任何外部图片素材。窗口尺寸变化时重绘到离屏画布。
 */
(function (root) {
  'use strict';

  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function palm(ctx, x, y, h, lean, s, flip) {
    const topX = x + lean * h, topY = y - h;
    const cx = x + lean * h * 0.15, cy = y - h * 0.55;
    // 树干：两侧各取一条二次曲线，宽度从下往上收窄
    const w0 = 16 * s, w1 = 7 * s;
    ctx.beginPath();
    ctx.moveTo(x - w0, y);
    ctx.quadraticCurveTo(cx - (w0 + w1) / 2, cy, topX - w1, topY);
    ctx.lineTo(topX + w1, topY);
    ctx.quadraticCurveTo(cx + (w0 + w1) / 2, cy, x + w0, y);
    ctx.closePath();
    ctx.fill();
    // 树干上的横纹
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#2a0b3d';
    ctx.lineWidth = 2 * s;
    for (let t = 0.08; t < 0.95; t += 0.07) {
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * topX;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * topY;
      const ww = w0 + (w1 - w0) * t;
      ctx.beginPath(); ctx.moveTo(px - ww, py); ctx.lineTo(px + ww, py + 3 * s); ctx.stroke();
    }
    ctx.restore();
    // 叶子
    const fronds = [-170, -140, -110, -75, -40, -10, 20];
    for (const deg0 of fronds) {
      const deg = flip ? -180 - deg0 : deg0;
      const a = (deg * Math.PI) / 180;
      const len = (h * 0.42 + (Math.abs(Math.sin(a * 3)) * h) / 10) * 1;
      const tipX = topX + Math.cos(a) * len;
      const tipY = topY + Math.sin(a) * len * 0.55 + len * 0.45;
      const midX = topX + Math.cos(a) * len * 0.5;
      const midY = topY + Math.sin(a) * len * 0.5 - len * 0.12;
      const nx = -Math.sin(a), ny = Math.cos(a);
      const lw = 22 * s;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(midX + nx * lw, midY + ny * lw, tipX, tipY);
      ctx.quadraticCurveTo(midX - nx * lw * 0.3, midY - ny * lw * 0.3, topX, topY);
      ctx.fill();
      // 叶片锯齿
      for (let k = 1; k < 8; k++) {
        const t = k / 8;
        const px = (1 - t) * (1 - t) * topX + 2 * (1 - t) * t * midX + t * t * tipX;
        const py = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * midY + t * t * tipY;
        const l = lw * (1 - t) * 1.1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + nx * l + Math.cos(a) * l * 0.6, py + ny * l + Math.sin(a) * l * 0.6 + l * 0.5);
        ctx.lineTo(px + Math.cos(a) * l * 0.3, py + Math.sin(a) * l * 0.3);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(topX - 6 * s, topY + 8 * s, 6 * s, 0, Math.PI * 2);
    ctx.arc(topX + 6 * s, topY + 10 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function paint(canvas, W, H, dpr, board) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = rng(1984);
    const horizon = Math.round(H * 0.7);
    const m = Math.min(W, H);

    // 天空
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#0d0426');
    sky.addColorStop(0.35, '#2e0b55');
    sky.addColorStop(0.62, '#7a1f73');
    sky.addColorStop(0.82, '#e0406f');
    sky.addColorStop(1, '#ff9a5a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizon);

    // 星星
    for (let i = 0; i < 90; i++) {
      const y = rand() * horizon * 0.45;
      ctx.globalAlpha = 0.25 + rand() * 0.6 * (1 - y / (horizon * 0.45));
      ctx.fillStyle = '#fff';
      const sz = rand() < 0.9 ? 1 : 2;
      ctx.fillRect(rand() * W, y, sz, sz);
    }
    ctx.globalAlpha = 1;

    // 太阳光晕
    const sunR = m * 0.3;
    const sx = W / 2, sy = horizon - sunR * 0.42;
    const halo = ctx.createRadialGradient(sx, sy, sunR * 0.6, sx, sy, sunR * 2.4);
    halo.addColorStop(0, 'rgba(255,120,120,0.45)');
    halo.addColorStop(1, 'rgba(255,60,140,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, horizon);

    // 条纹太阳（先画到离屏，再挖出横条）
    const sun = document.createElement('canvas');
    sun.width = Math.ceil(sunR * 2 * dpr);
    sun.height = Math.ceil(sunR * 2 * dpr);
    const sc = sun.getContext('2d');
    sc.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sg = sc.createLinearGradient(0, 0, 0, sunR * 2);
    sg.addColorStop(0, '#fff3a0');
    sg.addColorStop(0.45, '#ffb45a');
    sg.addColorStop(1, '#ff2f8f');
    sc.fillStyle = sg;
    sc.beginPath(); sc.arc(sunR, sunR, sunR, 0, Math.PI * 2); sc.fill();
    sc.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 9; k++) {
      const y = sunR * (1.0 + k * 0.12);
      sc.fillRect(0, y, sunR * 2, 1.5 + k * 1.6);
    }
    ctx.drawImage(sun, sx - sunR, sy - sunR, sunR * 2, sunR * 2);

    // 细长云
    for (let i = 0; i < 7; i++) {
      const y = horizon * (0.45 + rand() * 0.5);
      const w = W * (0.2 + rand() * 0.35);
      const x = rand() * W - w / 2;
      ctx.globalAlpha = 0.18 + rand() * 0.2;
      ctx.fillStyle = i % 2 ? '#3b1060' : '#5a1468';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y, w / 2, 2 + rand() * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 远处楼群
    let x = -10;
    while (x < W + 10) {
      const bw = 14 + rand() * 34;
      const nearCenter = Math.abs(x - W / 2) < sunR * 0.9;
      const bh = (nearCenter ? 0.25 : 1) * (12 + rand() * (H * 0.09));
      ctx.fillStyle = '#1b0733';
      ctx.fillRect(x, horizon - bh, bw, bh);
      for (let wy = horizon - bh + 4; wy < horizon - 3; wy += 6) {
        for (let wx = x + 3; wx < x + bw - 3; wx += 5) {
          if (rand() < 0.22) {
            ctx.fillStyle = ['#ff4fd8', '#3ff0ff', '#ffd36b'][Math.floor(rand() * 3)];
            ctx.globalAlpha = 0.35 + rand() * 0.4;
            ctx.fillRect(wx, wy, 2, 2);
          }
        }
      }
      ctx.globalAlpha = 1;
      x += bw + rand() * 4;
    }

    // 海面
    const sea = ctx.createLinearGradient(0, horizon, 0, H);
    sea.addColorStop(0, '#3a0f5e');
    sea.addColorStop(1, '#0a0320');
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, W, H - horizon);
    // 太阳倒影
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const y = horizon + 3 + t * (H - horizon) * 0.8;
      const w = sunR * (1.3 - t * 0.8) * (0.5 + rand() * 0.7);
      ctx.globalAlpha = 0.55 * (1 - t);
      ctx.fillStyle = i % 3 ? '#ff6f91' : '#ffc46b';
      ctx.fillRect(sx - w / 2 + (rand() - 0.5) * 20, y, w, 1.5 + t * 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,170,120,0.8)';
    ctx.fillRect(0, horizon, W, 1);

    // 棕榈剪影
    ctx.fillStyle = '#0a0216';
    const s = Math.max(0.6, Math.min(1.4, m / 700));
    palm(ctx, W * 0.04, H + 10, H * 0.62, 0.22, s, false);
    palm(ctx, W * 0.14, H + 10, H * 0.42, 0.05, s * 0.8, false);
    palm(ctx, W * 0.97, H + 10, H * 0.56, -0.2, s, true);
    palm(ctx, W * 0.86, H + 10, H * 0.36, -0.06, s * 0.75, true);

    // 棋盘背后压暗，保证环清晰
    if (board) {
      const bd = ctx.createRadialGradient(board.x, board.y, board.r * 0.2, board.x, board.y, board.r * 1.15);
      bd.addColorStop(0, 'rgba(10,3,30,0.62)');
      bd.addColorStop(0.75, 'rgba(10,3,30,0.4)');
      bd.addColorStop(1, 'rgba(10,3,30,0)');
      ctx.fillStyle = bd;
      ctx.fillRect(0, 0, W, H);
    }

    // 暗角
    const vg = ctx.createRadialGradient(W / 2, H / 2, m * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(5,0,15,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  root.RRBg = { paint };
})(window);

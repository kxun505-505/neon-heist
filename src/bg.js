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

  const SCENES = [];

  function paint(canvas, W, H, dpr, board, variant) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const rand = rng(1984);
    const m = Math.min(W, H);
    const scene = SCENES[variant] || SCENES[0];
    scene.draw(ctx, W, H, rand, m, dpr);

    // 棋盘背后压暗，保证环清晰
    if (board) {
      const bd = ctx.createRadialGradient(board.x, board.y, board.r * 0.2, board.x, board.y, board.r * 1.15);
      const dc = scene.dimColor || '10,3,30';
      bd.addColorStop(0, 'rgba(' + dc + ',' + (scene.dim || 0.62) + ')');
      bd.addColorStop(0.75, 'rgba(' + dc + ',' + (scene.dim || 0.62) * 0.65 + ')');
      bd.addColorStop(1, 'rgba(' + dc + ',0)');
      ctx.fillStyle = bd;
      ctx.fillRect(0, 0, W, H);
    }

    // 暗角
    const vg = ctx.createRadialGradient(W / 2, H / 2, m * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.6);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, scene.vig || 'rgba(5,0,15,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }


  SCENES.push({ name: '日落海岸', draw(ctx, W, H, rand, m, dpr) {
    const horizon = Math.round(H * 0.7);
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

  } });


  // ---------- 通用小部件 ----------
  function grad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([t, c]) => g.addColorStop(t, c));
    return g;
  }
  function glowDot(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a; ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  }
  function stars(ctx, W, h, rand, n) {
    for (let i = 0; i < n; i++) {
      const y = rand() * h;
      ctx.globalAlpha = 0.25 + rand() * 0.6 * (1 - y / h);
      ctx.fillStyle = '#fff';
      const sz = rand() < 0.9 ? 1 : 2;
      ctx.fillRect(rand() * W, y, sz, sz);
    }
    ctx.globalAlpha = 1;
  }
  // 一排楼：返回每栋楼的位置，方便加招牌
  function skyline(ctx, W, base, rand, o) {
    const out = [];
    let x = -10;
    while (x < W + 10) {
      const bw = o.wMin + rand() * (o.wMax - o.wMin);
      const bh = o.hMin + rand() * (o.hMax - o.hMin);
      ctx.fillStyle = o.color;
      ctx.fillRect(x, base - bh, bw, bh);
      if (rand() < 0.3) ctx.fillRect(x + bw * 0.35, base - bh - 6 - rand() * 14, 2, 20); // 天线
      for (let wy = base - bh + 5; wy < base - 4; wy += o.wy) {
        for (let wx = x + 3; wx < x + bw - 3; wx += o.wx) {
          if (rand() < o.lit) {
            ctx.fillStyle = o.win[Math.floor(rand() * o.win.length)];
            ctx.globalAlpha = 0.45 + rand() * 0.5;
            ctx.fillRect(wx, wy, o.ws, o.ws + 1);
          }
        }
      }
      ctx.globalAlpha = 1;
      out.push({ x, w: bw, top: base - bh });
      x += bw + rand() * o.gap;
    }
    return out;
  }

  // ---------- 霓虹夜城：雨后的城市夜景、高架桥上的车灯拖影 ----------
  SCENES.push({ name: '霓虹夜城', dim: 0.55, draw(ctx, W, H, rand, m) {
    const horizon = Math.round(H * 0.66);
    ctx.fillStyle = grad(ctx, 0, horizon, [[0, '#04021a'], [0.5, '#170a45'], [0.85, '#3d1260'], [1, '#7a1d6e']]);
    ctx.fillRect(0, 0, W, horizon);
    stars(ctx, W, horizon * 0.4, rand, 60);
    // 月亮
    glowDot(ctx, W * 0.78, H * 0.12, m * 0.16, 'rgba(255,220,255,0.35)', 1);
    ctx.fillStyle = '#ffe9fb'; ctx.beginPath(); ctx.arc(W * 0.78, H * 0.12, m * 0.045, 0, Math.PI * 2); ctx.fill();
    // 远景楼
    skyline(ctx, W, horizon, rand, { color: '#1a0b3e', wMin: 18, wMax: 40, hMin: H * 0.08, hMax: H * 0.2, wx: 5, wy: 7, ws: 2, lit: 0.18, gap: 3, win: ['#5ad8ff', '#ff7ad9'] });
    // 近景楼 + 霓虹招牌（只用几何图形，不放文字和商标）
    const near = skyline(ctx, W, horizon + 6, rand, { color: '#0e0526', wMin: 34, wMax: 70, hMin: H * 0.12, hMax: H * 0.3, wx: 7, wy: 9, ws: 3, lit: 0.28, gap: 8, win: ['#ffd36b', '#5ad8ff', '#ff7ad9', '#ffffff'] });
    const neon = ['#ff3df2', '#28e7ff', '#ffe45c', '#ff5c8a', '#7dff6a'];
    near.forEach((b, k) => {
      if (rand() < 0.55) {
        const c = neon[k % neon.length];
        const sw = Math.min(b.w - 8, 18 + rand() * 24), sh = 6 + rand() * 30;
        const sx = b.x + (b.w - sw) / 2, sy = b.top + 10 + rand() * 30;
        glowDot(ctx, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * 1.4, c, 0.35);
        ctx.strokeStyle = c; ctx.lineWidth = 2;
        if (rand() < 0.5) { ctx.strokeRect(sx, sy, sw, sh); ctx.fillStyle = c; ctx.globalAlpha = 0.5; ctx.fillRect(sx + 3, sy + sh / 2 - 1, sw - 6, 2); ctx.globalAlpha = 1; }
        else { ctx.beginPath(); ctx.arc(sx + sw / 2, sy + sh / 2, Math.min(sw, sh) / 2 + 4, 0, Math.PI * 2); ctx.stroke(); }
      }
    });
    // 高架桥和车灯拖影
    const by = horizon + H * 0.04;
    ctx.fillStyle = '#0a031c'; ctx.fillRect(0, by, W, 10);
    for (let x = 20; x < W; x += 90) ctx.fillRect(x, by + 10, 8, H * 0.06);
    for (let i = 0; i < 6; i++) {
      const red = i % 2 === 0;
      const y = by + 2 + (i % 3) * 2;
      const x0 = rand() * W * 0.6, len = W * (0.25 + rand() * 0.4);
      const g = ctx.createLinearGradient(x0, 0, x0 + len, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, red ? 'rgba(255,60,90,0.95)' : 'rgba(255,245,220,0.95)');
      ctx.fillStyle = g; ctx.fillRect(x0, y, len, 1.6);
    }
    // 湿地面的倒影
    ctx.fillStyle = grad(ctx, horizon + 6, H, [[0, '#1a0838'], [1, '#05010f']]);
    ctx.fillRect(0, by + 10 + H * 0.06 - 2, W, H);
    const fy = by + 10 + H * 0.06;
    for (let i = 0; i < 70; i++) {
      const x = rand() * W, w = 2 + rand() * 5, len = 20 + rand() * (H - fy) * 0.6;
      ctx.globalAlpha = 0.08 + rand() * 0.22;
      ctx.fillStyle = neon[Math.floor(rand() * neon.length)];
      ctx.fillRect(x, fy + rand() * 20, w, len);
    }
    ctx.globalAlpha = 1;
    // 前景棕榈
    ctx.fillStyle = '#04010c';
    const s = Math.max(0.6, Math.min(1.4, m / 700));
    palm(ctx, W * 0.03, H + 10, H * 0.66, 0.2, s, false);
    palm(ctx, W * 0.96, H + 10, H * 0.5, -0.18, s * 0.9, true);
  } });

  // ---------- 金色海滩：傍晚的沙滩、救生塔、海浪 ----------
  SCENES.push({ name: '金色海滩', dim: 0.5, draw(ctx, W, H, rand, m) {
    const horizon = Math.round(H * 0.58), shore = Math.round(H * 0.76);
    ctx.fillStyle = grad(ctx, 0, horizon, [[0, '#2b3f8f'], [0.35, '#7a5cb0'], [0.7, '#ff8fa3'], [1, '#ffd08a']]);
    ctx.fillRect(0, 0, W, horizon);
    // 低垂的太阳
    const sx = W * 0.32, sy = horizon - m * 0.05, sr = m * 0.12;
    glowDot(ctx, sx, sy, sr * 4, 'rgba(255,200,140,0.7)', 1);
    ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    // 粉色积云
    for (let i = 0; i < 6; i++) {
      const cx = rand() * W, cy = horizon * (0.2 + rand() * 0.55), cw = W * (0.18 + rand() * 0.25);
      ctx.fillStyle = i % 2 ? 'rgba(255,170,190,0.55)' : 'rgba(255,215,200,0.45)';
      for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(cx + (k - 2) * cw * 0.2, cy - Math.sin(k) * 6, cw * 0.22, 9 + rand() * 8, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // 远处海岸线上的酒店楼
    skyline(ctx, W * 0.45, horizon, rand, { color: '#6d4f9a', wMin: 10, wMax: 22, hMin: 8, hMax: H * 0.06, wx: 4, wy: 5, ws: 1.5, lit: 0.3, gap: 2, win: ['#ffe9c4'] });
    // 海面
    ctx.fillStyle = grad(ctx, horizon, shore, [[0, '#ff9fa0'], [0.25, '#4fb3c9'], [1, '#1f7f9e']]);
    ctx.fillRect(0, horizon, W, shore - horizon);
    for (let i = 0; i < 60; i++) {
      const t = rand(), y = horizon + 4 + t * (shore - horizon - 8);
      ctx.globalAlpha = 0.35 + rand() * 0.4;
      ctx.fillStyle = Math.abs(rand() * W - sx) < 80 ? '#fff1c4' : '#d9fbff';
      ctx.fillRect(rand() * W, y, 6 + t * 26, 1.4);
    }
    ctx.globalAlpha = 1;
    // 浪花
    ctx.fillStyle = '#f6fbff';
    ctx.beginPath(); ctx.moveTo(0, shore);
    for (let x = 0; x <= W + 20; x += 20) ctx.quadraticCurveTo(x + 10, shore - 6 - rand() * 4, x + 20, shore);
    ctx.lineTo(W, shore + 8); ctx.lineTo(0, shore + 8); ctx.fill();
    // 沙滩
    ctx.fillStyle = grad(ctx, shore, H, [[0, '#f6c995'], [1, '#d98f68']]);
    ctx.fillRect(0, shore + 6, W, H);
    for (let i = 0; i < 120; i++) { ctx.globalAlpha = 0.15; ctx.fillStyle = '#a8603f'; ctx.fillRect(rand() * W, shore + 10 + rand() * (H - shore), 1.5, 1.5); }
    ctx.globalAlpha = 1;
    // 救生塔（原创扁平造型）
    const tx = W * 0.8, ty = shore + (H - shore) * 0.25, ts = Math.max(0.7, m / 500);
    ctx.fillStyle = '#5b3a6e';
    ctx.fillRect(tx - 22 * ts, ty, 4 * ts, 60 * ts); ctx.fillRect(tx + 18 * ts, ty, 4 * ts, 60 * ts);
    ctx.fillRect(tx - 26 * ts, ty + 6 * ts, 52 * ts, 4 * ts);
    ctx.fillStyle = '#ff6fa8'; ctx.fillRect(tx - 28 * ts, ty - 30 * ts, 56 * ts, 32 * ts);
    ctx.fillStyle = '#3fd0d4'; ctx.fillRect(tx - 28 * ts, ty - 30 * ts, 56 * ts, 6 * ts);
    ctx.fillStyle = '#fff3e0'; ctx.fillRect(tx - 18 * ts, ty - 20 * ts, 36 * ts, 12 * ts);
    ctx.fillStyle = '#3fd0d4';
    ctx.beginPath(); ctx.moveTo(tx - 34 * ts, ty - 30 * ts); ctx.lineTo(tx, ty - 46 * ts); ctx.lineTo(tx + 34 * ts, ty - 30 * ts); ctx.fill();
    // 海鸥
    ctx.strokeStyle = 'rgba(60,30,80,0.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const gx = W * (0.45 + rand() * 0.5), gy = horizon * (0.15 + rand() * 0.4), gw = 6 + rand() * 6;
      ctx.beginPath(); ctx.moveTo(gx - gw, gy); ctx.quadraticCurveTo(gx - gw / 2, gy - gw / 2, gx, gy); ctx.quadraticCurveTo(gx + gw / 2, gy - gw / 2, gx + gw, gy); ctx.stroke();
    }
    // 彩色棕榈（深青色，不是纯黑剪影）
    ctx.fillStyle = '#1e3b5a';
    const s = Math.max(0.6, Math.min(1.4, m / 700));
    palm(ctx, W * 0.05, H + 10, H * 0.7, 0.25, s, false);
    ctx.fillStyle = '#2a4d6e';
    palm(ctx, W * 0.18, H + 10, H * 0.48, 0.08, s * 0.8, false);
  } });

  // ---------- 湿地暮色：柏树、垂挂的苔藓、水面倒影、萤火虫、风扇船 ----------
  SCENES.push({ name: '湿地暮色', dim: 0.58, draw(ctx, W, H, rand, m) {
    const water = Math.round(H * 0.64);
    ctx.fillStyle = grad(ctx, 0, water, [[0, '#120a3a'], [0.4, '#4a1d6e'], [0.75, '#d9486e'], [1, '#ffb05a']]);
    ctx.fillRect(0, 0, W, water);
    stars(ctx, W, water * 0.3, rand, 40);
    const sx = W * 0.6, sr = m * 0.1;
    glowDot(ctx, sx, water - 4, sr * 4, 'rgba(255,170,90,0.6)', 1);
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(sx, water - 4, sr, Math.PI, 0); ctx.fill();
    // 水面：天空的倒影 + 波纹
    ctx.fillStyle = grad(ctx, water, H, [[0, '#ff9a5a'], [0.15, '#b23a6e'], [0.5, '#3a1550'], [1, '#0c0420']]);
    ctx.fillRect(0, water, W, H - water);
    for (let i = 0; i < 40; i++) {
      const y = water + 3 + rand() * (H - water) * 0.7;
      ctx.globalAlpha = 0.2 + rand() * 0.3;
      ctx.fillStyle = '#ffc48a';
      ctx.fillRect(sx - 40 - rand() * 60 + rand() * 80, y, 20 + rand() * 60, 1);
    }
    ctx.globalAlpha = 1;
    // 柏树（树干带板根，枝头挂苔藓），同时画倒影
    function cypress(x, h, w, color, alpha) {
      for (const flip of [1, -1]) {
        ctx.save();
        ctx.translate(x, water);
        ctx.scale(1, flip);
        ctx.globalAlpha = flip > 0 ? alpha : alpha * 0.35;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-w * 1.6, 0); ctx.quadraticCurveTo(-w * 0.6, -h * 0.12, -w * 0.45, -h * 0.3);
        ctx.lineTo(-w * 0.3, -h); ctx.lineTo(w * 0.3, -h); ctx.lineTo(w * 0.45, -h * 0.3);
        ctx.quadraticCurveTo(w * 0.6, -h * 0.12, w * 1.6, 0); ctx.closePath(); ctx.fill();
        // 树冠：几层扁平的团块
        for (let k = 0; k < 5; k++) {
          const cy = -h * (0.62 + k * 0.09), cw = w * (3.2 - k * 0.35);
          ctx.beginPath(); ctx.ellipse((k % 2 ? 1 : -1) * w * 0.4, cy, cw, h * 0.045, 0, 0, Math.PI * 2); ctx.fill();
          // 垂挂的苔藓
          for (let q = 0; q < 6; q++) {
            const mx = (k % 2 ? 1 : -1) * w * 0.4 + (q / 5 - 0.5) * cw * 1.6;
            ctx.fillRect(mx, cy, 1.5, h * (0.04 + ((q * 7 + k * 3) % 5) * 0.015));
          }
        }
        ctx.restore();
      }
    }
    const s = Math.max(0.6, Math.min(1.3, m / 600));
    cypress(W * 0.12, H * 0.3, 7 * s, '#3a1650', 0.9);
    cypress(W * 0.88, H * 0.26, 6 * s, '#3a1650', 0.9);
    cypress(W * 0.32, H * 0.2, 5 * s, '#2a0f40', 1);
    cypress(W * 0.72, H * 0.18, 4 * s, '#2a0f40', 1);
    cypress(-W * 0.02, H * 0.5, 11 * s, '#12051f', 1);
    cypress(W * 1.02, H * 0.45, 10 * s, '#12051f', 1);
    // 风扇船剪影（原创简笔造型）
    const bx = W * 0.5, by = water + 8, bs = Math.max(0.7, m / 520);
    ctx.fillStyle = '#12051f';
    ctx.beginPath(); ctx.moveTo(bx - 40 * bs, by); ctx.lineTo(bx + 36 * bs, by); ctx.lineTo(bx + 44 * bs, by - 6 * bs); ctx.lineTo(bx - 44 * bs, by - 6 * bs); ctx.fill();
    ctx.fillRect(bx - 4 * bs, by - 18 * bs, 6 * bs, 12 * bs);
    ctx.strokeStyle = '#12051f'; ctx.lineWidth = 2.5 * bs;
    ctx.beginPath(); ctx.arc(bx - 26 * bs, by - 22 * bs, 15 * bs, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bx - 26 * bs, by - 37 * bs); ctx.lineTo(bx - 26 * bs, by - 7 * bs); ctx.moveTo(bx - 41 * bs, by - 22 * bs); ctx.lineTo(bx - 11 * bs, by - 22 * bs); ctx.stroke();
    // 萤火虫
    for (let i = 0; i < 40; i++) {
      const x = rand() * W, y = water * (0.55 + rand() * 0.5);
      glowDot(ctx, x, y, 6 + rand() * 6, 'rgba(230,255,120,0.9)', 0.5 + rand() * 0.4);
      ctx.fillStyle = '#f4ffb0'; ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }
  } });

  // 白天的海滩（用户 11-28：在迈阿密黄昏之外再出一张白天的，作为效果切换）。正午偏后的阳光，青绿海水，白沙，两侧棕榈
  SCENES.push({ name: '白天海滩', dim: 0.22, dimColor: '20,40,60', vig: 'rgba(10,30,50,0.28)', draw(ctx, W, H, rand, m) {
    const horizon = Math.round(H * 0.5), shore = Math.round(H * 0.64);
    ctx.fillStyle = grad(ctx, 0, horizon, [[0, '#1f78d1'], [0.55, '#55b4f0'], [1, '#bfe9ff']]);
    ctx.fillRect(0, 0, W, horizon);
    // 太阳（右上，高）
    const sx = W * 0.78, sy = H * 0.12, sr = m * 0.07;
    glowDot(ctx, sx, sy, sr * 6, 'rgba(255,250,220,0.85)', 1);
    ctx.fillStyle = '#fffbe8'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
    // 云
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [cx, cy, k] of [[0.2, 0.16, 1], [0.55, 0.27, 0.8], [0.12, 0.36, 0.6], [0.86, 0.34, 0.7]]) {
      const x = W * cx, y = H * cy, r = m * 0.06 * k;
      ctx.beginPath(); ctx.ellipse(x, y, r * 2.2, r * 0.7, 0, 0, Math.PI * 2); ctx.ellipse(x - r, y - r * 0.35, r, r * 0.7, 0, 0, Math.PI * 2); ctx.ellipse(x + r * 0.7, y - r * 0.5, r * 1.1, r * 0.85, 0, 0, Math.PI * 2); ctx.fill();
    }
    // 海：远处深蓝，近处青绿，上面有阳光的碎光
    ctx.fillStyle = grad(ctx, horizon, shore, [[0, '#0c6fa8'], [0.45, '#0fa3c4'], [1, '#3fe0d0']]);
    ctx.fillRect(0, horizon, W, shore - horizon);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 70; i++) { const y = horizon + 4 + Math.pow(rand(), 1.6) * (shore - horizon - 8), w = 4 + rand() * 18 * (y - horizon) / (shore - horizon) + 2; ctx.fillRect(rand() * W, y, w, 1.2); }
    // 浪花和湿沙
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.moveTo(0, shore);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, shore - 3 + Math.sin(x / 23) * 3 + Math.sin(x / 7) * 1.2);
    ctx.lineTo(W, shore + 6); ctx.lineTo(0, shore + 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = grad(ctx, shore, H, [[0, '#e8cf9a'], [0.08, '#f5e2b3'], [1, '#f2d9a2']]);
    ctx.fillRect(0, shore + 5, W, H - shore);
    // 沙粒
    for (let i = 0; i < 500; i++) { ctx.fillStyle = rand() < 0.5 ? 'rgba(170,130,70,0.25)' : 'rgba(255,255,255,0.4)'; ctx.fillRect(rand() * W, shore + 8 + rand() * (H - shore), 1.2, 1.2); }
    // 两侧的棕榈（深绿，被阳光照着）
    ctx.fillStyle = '#1d5b40';
    palm(ctx, -W * 0.02, H * 0.98, H * 0.6, 0.18, m / 420, false);
    palm(ctx, W * 1.03, H * 1.0, H * 0.52, -0.2, m / 460, true);
    // 树影
    ctx.fillStyle = 'rgba(80,60,30,0.18)';
    ctx.beginPath(); ctx.ellipse(W * 0.25, H * 0.93, W * 0.3, H * 0.025, -0.1, 0, Math.PI * 2); ctx.fill();
  } });
  root.RRBg = { paint, scenes: () => SCENES.map((s) => s.name) };

})(window);

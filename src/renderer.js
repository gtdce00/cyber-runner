/* =========================================================
   src/renderer.js
   ---------------------------------------------------------
   ระบบวาดภาพทั้งหมด (Art Direction: Cute Futuristic Sci-Fi)

   หลักการสำคัญ:
     ทุกอย่างในไฟล์นี้เป็น "Placeholder แบบวาดด้วยโค้ด"
     ถ้ามีไฟล์ภาพจริงใน src/config/assets.js ระบบจะใช้ภาพจริงแทนทันที
     โดยไม่ต้องแก้โค้ดส่วนอื่น
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  /* ---------------- ชุดสีประจำแต่ละโลก ---------------- */
  const THEMES = {
    computer: {
      name: 'Computer World',
      sky: ['#1d2f7a', '#0d1440', '#080b25'],
      far: '#26357e', mid: '#2e409a', near: '#3a52c4',
      accent: '#34e0ff', accent2: '#7dff5a',
      ground: ['#31418f', '#1a2258'], groundTop: '#4fe3ff',
      deco: 'chip', fog: 'rgba(52,224,255,0.07)'
    },
    cyber: {
      name: 'Cyber / Logic World',
      sky: ['#3d1466', '#1c0b3a', '#0a0620'],
      far: '#4a1c7d', mid: '#5f2499', near: '#7a35c4',
      accent: '#ff4fd8', accent2: '#8b5cff',
      ground: ['#54209a', '#2a0f52'], groundTop: '#ff77e4',
      deco: 'shield', fog: 'rgba(255,79,216,0.07)'
    },
    coding: {
      name: 'Coding World',
      sky: ['#06403c', '#052a2e', '#04121c'],
      far: '#0a5a4e', mid: '#0d7663', near: '#12987d',
      accent: '#7dff5a', accent2: '#34e0ff',
      ground: ['#0f6b57', '#073830'], groundTop: '#9dff7a',
      deco: 'code', fog: 'rgba(125,255,90,0.06)'
    },
    network: {
      name: 'Network / Digital World',
      sky: ['#0a2b62', '#06183c', '#030c22'],
      far: '#0e3d84', mid: '#1152a8', near: '#1a6ed0',
      accent: '#34e0ff', accent2: '#ffd23f',
      ground: ['#14498f', '#0a2450'], groundTop: '#6fd7ff',
      deco: 'node', fog: 'rgba(52,224,255,0.08)'
    },
    ai: {
      name: 'AI / Future World',
      sky: ['#141a52', '#0c1038', '#05061a'],
      far: '#232a7a', mid: '#3a2fa5', near: '#5b3fd6',
      accent: '#b98cff', accent2: '#34e0ff',
      ground: ['#3b2f9c', '#1c1552'], groundTop: '#cbaaff',
      deco: 'neural', fog: 'rgba(185,140,255,0.08)'
    },
    boss: {
      name: 'Computer Boss Arena',
      sky: ['#5a0f2a', '#2a0718', '#0d0208'],
      far: '#7a1435', mid: '#9c1a43', near: '#c22355',
      accent: '#ff4f6e', accent2: '#ffd23f',
      ground: ['#8c1b3f', '#4a0d21'], groundTop: '#ff8aa0',
      deco: 'boss', fog: 'rgba(255,79,110,0.10)'
    }
  };

  const Renderer = {
    themes: THEMES,
    theme(name) { return THEMES[name] || THEMES.computer; },

    /* =====================================================
       BACKGROUND — 4 ชั้น Parallax
       ===================================================== */
    drawBackground(ctx, cam, themeName, time) {
      const th = this.theme(themeName);
      const W = cam.w, H = cam.h;

      // --- ถ้ามีไฟล์ภาพพื้นหลังจริง ให้ใช้ภาพนั้นเป็นชั้นล่างสุด ---
      const bgKey = CR.THEME_BACKGROUND[themeName];
      const bgImg = bgKey ? CR.AssetLoader.img(bgKey) : null;

      if (bgImg) {
        const scale = H / bgImg.naturalHeight;
        const tw = bgImg.naturalWidth * scale;
        const off = (-cam.x * 0.25) % tw;
        for (let x = off - tw; x < W + tw; x += tw) {
          ctx.drawImage(bgImg, x, 0, tw, H);
        }
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, th.sky[0]);
        g.addColorStop(0.55, th.sky[1]);
        g.addColorStop(1, th.sky[2]);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        this._stars(ctx, cam, th, time);
      }

      this._layerFar(ctx, cam, th, time);
      this._layerMid(ctx, cam, th, time);
      this._layerNear(ctx, cam, th, time);

      // หมอกสี ทำให้ภาพรวมกลมกลืน
      ctx.fillStyle = th.fog;
      ctx.fillRect(0, 0, W, H);
    },

    _stars(ctx, cam, th, time) {
      const px = cam.x * 0.06;
      const cols = 42;
      ctx.save();
      for (let i = 0; i < cols * 3; i++) {
        const seed = i * 977;
        const bx = ((seed % 1600) - px % 1600 + 1600) % 1600 - 100;
        const by = ((seed * 31) % (cam.h * 0.62));
        const tw = 0.45 + 0.55 * Math.sin(time * 1.8 + i);
        ctx.globalAlpha = 0.18 + tw * 0.42;
        ctx.fillStyle = i % 7 === 0 ? th.accent : '#ffffff';
        const s = i % 11 === 0 ? 2.4 : 1.4;
        ctx.fillRect(bx, by, s, s);
      }
      ctx.restore();
    },

    /** ภูเขา/ตึกไกล ๆ */
    _layerFar(ctx, cam, th, time) {
      const px = cam.x * 0.12;
      const H = cam.h;
      const base = H * 0.78;
      ctx.save();
      ctx.fillStyle = th.far;
      ctx.globalAlpha = 0.75;
      const step = 210;
      const start = Math.floor((px - 200) / step) * step;
      for (let x = start; x < px + cam.w + step; x += step) {
        const i = Math.floor(x / step);
        const h = 120 + ((i * 7919) % 190);
        const w = step * 0.86;
        const sx = x - px;
        ctx.fillRect(sx, base - h, w, h + 40);
        // ไฟหน้าต่าง
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.22;
        for (let wy = base - h + 16; wy < base - 12; wy += 22) {
          for (let wx = sx + 12; wx < sx + w - 14; wx += 26) {
            if (((wx * 7 + wy * 13 + i) | 0) % 3 === 0) ctx.fillRect(wx, wy, 8, 9);
          }
        }
        ctx.fillStyle = th.far;
        ctx.globalAlpha = 0.75;
      }
      ctx.restore();
    },

    /** ชั้นกลาง — เอกลักษณ์ของแต่ละโลก */
    _layerMid(ctx, cam, th, time) {
      const px = cam.x * 0.28;
      const H = cam.h;
      const base = H * 0.84;
      const step = 340;
      const start = Math.floor((px - 340) / step) * step;

      ctx.save();
      for (let x = start; x < px + cam.w + step; x += step) {
        const i = Math.floor(x / step);
        const sx = x - px;
        const wob = Math.sin(time * 0.6 + i) * 6;
        ctx.globalAlpha = 0.85;
        switch (th.deco) {
          case 'chip':   this._decoChip(ctx, sx, base + wob, th, i); break;
          case 'shield': this._decoShield(ctx, sx, base + wob, th, i, time); break;
          case 'code':   this._decoCode(ctx, sx, base + wob, th, i, time); break;
          case 'node':   this._decoNode(ctx, sx, base + wob, th, i, time); break;
          case 'neural': this._decoNeural(ctx, sx, base + wob, th, i, time); break;
          default:       this._decoBoss(ctx, sx, base + wob, th, i, time); break;
        }
      }
      ctx.restore();
    },

    /** ชั้นใกล้ — เส้นตารางเรืองแสงด้านล่าง */
    _layerNear(ctx, cam, th, time) {
      const H = cam.h, W = cam.w;
      const horizon = H * 0.82;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 1;

      // เส้นแนวนอนแบบ perspective
      for (let i = 1; i <= 9; i++) {
        const t = i / 9;
        const y = horizon + Math.pow(t, 2.2) * (H - horizon);
        ctx.globalAlpha = 0.26 * (1 - t * 0.7);
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      // เส้นแนวตั้งลู่เข้าจุดศูนย์กลาง
      const cx = W / 2 - (cam.x * 0.5 % 160);
      for (let i = -14; i <= 14; i++) {
        ctx.globalAlpha = 0.14;
        ctx.beginPath();
        ctx.moveTo(cx + i * 22, horizon);
        ctx.lineTo(cx + i * 190, H);
        ctx.stroke();
      }
      ctx.restore();
    },

    /* --------- ชิ้นส่วนตกแต่งแต่ละธีม --------- */
    _decoChip(ctx, x, base, th, i) {
      const w = 170, h = 120 + (i % 3) * 34;
      ctx.fillStyle = th.mid;
      U.roundRect(ctx, x, base - h, w, h, 10); ctx.fill();
      ctx.strokeStyle = th.accent; ctx.lineWidth = 2; ctx.globalAlpha = 0.5;
      U.roundRect(ctx, x + 22, base - h + 22, w - 44, h - 52, 6); ctx.stroke();
      ctx.globalAlpha = 0.85;
      // ขาชิป
      ctx.fillStyle = th.accent;
      for (let k = 0; k < 6; k++) {
        ctx.fillRect(x - 10, base - h + 26 + k * 16, 10, 6);
        ctx.fillRect(x + w, base - h + 26 + k * 16, 10, 6);
      }
      ctx.font = '700 15px Orbitron, monospace';
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = 0.7;
      ctx.fillText('CPU', x + w / 2 - 18, base - h / 2 + 4);
      ctx.globalAlpha = 0.85;
    },

    _decoShield(ctx, x, base, th, i, time) {
      const w = 130, h = 170;
      const y = base - h;
      ctx.fillStyle = th.mid;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + 34);
      ctx.lineTo(x + w, y + h * 0.6);
      ctx.quadraticCurveTo(x + w / 2, y + h + 24, x, y + h * 0.6);
      ctx.lineTo(x, y + 34);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(time * 2 + i);
      ctx.stroke();
      // รูกุญแจตรงกลางโล่
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = th.accent;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * 0.42, 13, 0, 6.283);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 7, y + h * 0.46);
      ctx.lineTo(x + w / 2 + 7, y + h * 0.46);
      ctx.lineTo(x + w / 2 + 4, y + h * 0.66);
      ctx.lineTo(x + w / 2 - 4, y + h * 0.66);
      ctx.closePath();
      ctx.fill();
    },

    _decoCode(ctx, x, base, th, i, time) {
      const w = 200, h = 150 + (i % 2) * 40;
      ctx.fillStyle = th.mid;
      U.roundRect(ctx, x, base - h, w, h, 8); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x + 10, base - h + 10, w - 20, 18);
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = 0.75;
      for (let k = 0; k < 6; k++) {
        const lw = 40 + ((i * 13 + k * 29) % 110);
        const blink = ((Math.floor(time * 2) + k + i) % 5 === 0) ? 0.35 : 0.75;
        ctx.globalAlpha = blink;
        ctx.fillRect(x + 18 + (k % 2) * 12, base - h + 40 + k * 17, lw, 7);
      }
      ctx.globalAlpha = 0.85;
    },

    _decoNode(ctx, x, base, th, i, time) {
      const cx = x + 90, cy = base - 130 - (i % 3) * 26;
      ctx.strokeStyle = th.accent;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + time * 0.4 + i;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 82, cy + Math.sin(a) * 60);
        ctx.stroke();
        ctx.fillStyle = th.accent2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 82, cy + Math.sin(a) * 60, 7, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = th.mid;
      ctx.beginPath(); ctx.arc(cx, cy, 26, 0, 6.283); ctx.fill();
      ctx.strokeStyle = th.accent; ctx.lineWidth = 3; ctx.stroke();
      // เสาสัญญาณ
      ctx.fillStyle = th.mid;
      ctx.fillRect(cx - 6, cy, 12, base - cy);
    },

    _decoNeural(ctx, x, base, th, i, time) {
      const cols = 3, rows = 4;
      const ox = x + 20, oy = base - 220;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = th.accent;
      ctx.lineWidth = 1.4;
      for (let c = 0; c < cols - 1; c++) {
        for (let r = 0; r < rows; r++) {
          for (let r2 = 0; r2 < rows; r2++) {
            ctx.beginPath();
            ctx.moveTo(ox + c * 80, oy + r * 50);
            ctx.lineTo(ox + (c + 1) * 80, oy + r2 * 50);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 0.9;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const pulse = 0.5 + 0.5 * Math.sin(time * 3 + c * 1.3 + r * 0.7 + i);
          ctx.fillStyle = c === 1 ? th.accent : th.accent2;
          ctx.globalAlpha = 0.35 + pulse * 0.55;
          ctx.beginPath();
          ctx.arc(ox + c * 80, oy + r * 50, 8 + pulse * 3, 0, 6.283);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 0.85;
    },

    _decoBoss(ctx, x, base, th, i, time) {
      const w = 150, h = 240;
      ctx.fillStyle = th.mid;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x + 24, base - h);
      ctx.lineTo(x + w - 24, base - h);
      ctx.lineTo(x + w, base);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = th.accent;
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 3 + i);
      ctx.fillRect(x + 40, base - h + 30, w - 80, 10);
      ctx.fillRect(x + 40, base - h + 70, w - 80, 10);
      ctx.globalAlpha = 0.85;
    },

    /* =====================================================
       PLATFORM / พื้น
       ===================================================== */
    drawPlatform(ctx, p, themeName, time) {
      const th = this.theme(themeName);
      const imgKey = p.kind === 'ground' ? 'tileGround' : 'tilePlatform';
      const img = CR.AssetLoader.img(imgKey);

      if (img) {
        const tw = img.naturalWidth, thh = img.naturalHeight;
        ctx.save();
        ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
        for (let x = p.x; x < p.x + p.w; x += tw) {
          for (let y = p.y; y < p.y + p.h; y += thh) ctx.drawImage(img, x, y, tw, thh);
        }
        ctx.restore();
        return;
      }

      // ---- Placeholder แบบ Procedural ----
      const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
      g.addColorStop(0, th.ground[0]);
      g.addColorStop(1, th.ground[1]);
      ctx.fillStyle = g;
      U.roundRect(ctx, p.x, p.y, p.w, p.h, p.kind === 'ground' ? 0 : 7);
      ctx.fill();

      // ขอบบนเรืองแสง
      ctx.fillStyle = th.groundTop;
      ctx.globalAlpha = 0.95;
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.globalAlpha = 0.22;
      ctx.fillRect(p.x, p.y + 4, p.w, 3);
      ctx.globalAlpha = 1;

      // ลายวงจรบนผิว
      ctx.save();
      ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
      ctx.strokeStyle = th.accent;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 2;
      for (let x = p.x + 16; x < p.x + p.w; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, p.y + 10);
        ctx.lineTo(x, p.y + 20);
        ctx.lineTo(x + 14, p.y + 20);
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = th.accent;
        ctx.fillRect(x + 13, p.y + 18, 4, 4);
        ctx.globalAlpha = 0.16;
      }
      ctx.restore();

      if (p.moving) {
        ctx.fillStyle = th.accent;
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 6);
        const cx = p.x + p.w / 2, cy = p.y + p.h / 2 + 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy - 6); ctx.lineTo(cx - 4, cy + 6);
        ctx.moveTo(cx + 12, cy); ctx.lineTo(cx + 4, cy - 6); ctx.lineTo(cx + 4, cy + 6);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    },

    /* =====================================================
       เหรียญข้อมูล (Data Coin)
       ===================================================== */
    drawCoin(ctx, c, time) {
      if (c.taken) return;
      const bob = Math.sin(time * 3 + c.phase) * 5;
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2 + bob;

      const anim = c.anim;
      if (anim && anim.ready) {
        anim.draw(ctx, cx - c.w / 2, cy - c.h / 2, c.w, c.h, false);
        return;
      }
      const img = CR.AssetLoader.img('coin');
      if (img) { ctx.drawImage(img, cx - c.w / 2, cy - c.h / 2, c.w, c.h); return; }

      const squash = Math.abs(Math.cos(time * 3.4 + c.phase));
      const rw = Math.max(3, (c.w / 2) * (0.25 + 0.75 * squash));

      ctx.save();
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw, c.h / 2, 0, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff2b8';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rw * 0.6, c.h * 0.32, 0, 0, 6.283);
      ctx.fill();
      if (squash > 0.45) {
        ctx.fillStyle = '#a97b06';
        ctx.font = `900 ${Math.round(c.h * 0.5)}px Orbitron, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◆', cx, cy + 1);
      }
      ctx.restore();
    },

    /* =====================================================
       จุดเช็คพอยต์
       ===================================================== */
    drawCheckpoint(ctx, cp, time) {
      const img = CR.AssetLoader.img('checkpoint');
      if (img) { ctx.drawImage(img, cp.x, cp.y, cp.w, cp.h); return; }

      const on = cp.active;
      const col = on ? '#7dff5a' : '#5a6a90';
      ctx.save();
      // เสา
      ctx.fillStyle = '#2a3560';
      ctx.fillRect(cp.x + cp.w / 2 - 4, cp.y, 8, cp.h);
      ctx.fillStyle = col;
      ctx.fillRect(cp.x + cp.w / 2 - 12, cp.y + cp.h - 8, 24, 8);
      // ธง
      const wave = on ? Math.sin(time * 6) * 5 : 0;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = on ? 18 : 0;
      ctx.beginPath();
      ctx.moveTo(cp.x + cp.w / 2 + 4, cp.y + 6);
      ctx.lineTo(cp.x + cp.w / 2 + 44 + wave, cp.y + 20);
      ctx.lineTo(cp.x + cp.w / 2 + 4, cp.y + 36);
      ctx.closePath();
      ctx.fill();
      if (on) {
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 4);
        ctx.beginPath();
        ctx.arc(cp.x + cp.w / 2, cp.y + cp.h, 34, Math.PI, 0);
        ctx.fill();
      }
      ctx.restore();
    },

    /* =====================================================
       ประตูคำถาม (Question Gate)
       ===================================================== */
    drawQuestionGate(ctx, gate, time) {
      const img = CR.AssetLoader.img('questionGate');
      if (img) { ctx.drawImage(img, gate.x, gate.y, gate.w, gate.h); return; }

      const done = gate.answered;
      const col = done ? '#7dff5a' : '#8b5cff';
      const cx = gate.x + gate.w / 2;

      ctx.save();
      // เสาสองข้าง
      ctx.fillStyle = '#1a2050';
      ctx.fillRect(gate.x, gate.y, 14, gate.h);
      ctx.fillRect(gate.x + gate.w - 14, gate.y, 14, gate.h);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(gate.x + 3, gate.y + 8, 8, gate.h - 16);
      ctx.fillRect(gate.x + gate.w - 11, gate.y + 8, 8, gate.h - 16);

      // คานบน
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#1a2050';
      U.roundRect(ctx, gate.x - 6, gate.y - 6, gate.w + 12, 30, 8); ctx.fill();
      ctx.fillStyle = col;
      ctx.shadowColor = col; ctx.shadowBlur = 20;
      ctx.font = '900 22px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(done ? 'PASSED' : 'QUESTION', cx, gate.y + 16);
      ctx.shadowBlur = 0;

      // ม่านพลังงาน
      ctx.globalAlpha = 0.14 + (done ? 0 : 0.1 * Math.sin(time * 3));
      ctx.fillStyle = col;
      ctx.fillRect(gate.x + 12, gate.y + 22, gate.w - 24, gate.h - 22);
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      for (let y = gate.y + 30; y < gate.y + gate.h; y += 16) {
        const o = Math.sin(time * 4 + y * 0.05) * 4;
        ctx.globalAlpha = 0.10;
        ctx.beginPath();
        ctx.moveTo(gate.x + 14 + o, y); ctx.lineTo(gate.x + gate.w - 14 + o, y);
        ctx.stroke();
      }

      // เครื่องหมายคำถามลอย
      ctx.globalAlpha = 1;
      ctx.fillStyle = done ? '#7dff5a' : '#ffd23f';
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 24;
      ctx.font = '900 54px Orbitron, monospace';
      ctx.fillText(done ? '✓' : '?', cx, gate.y + gate.h * 0.6 + Math.sin(time * 2.4) * 8);
      ctx.restore();
    },

    /* =====================================================
       แผ่นกระโดดบนพื้นใต้ป้ายคำตอบ
       บอกผู้เล่นว่า "ยืนตรงนี้แล้วกระโดดขึ้นไปชนป้าย"
       ===================================================== */
    drawAnswerPad(ctx, sign, groundY, time) {
      const LETTERS = ['A', 'B', 'C', 'D'];
      const cx = sign.x + sign.w / 2;
      const pulse = 0.5 + 0.5 * Math.sin(time * 3 - sign.index * 0.7);
      const col = sign.near ? '#ffd23f' : '#34e0ff';

      ctx.save();
      // แผ่นวงรีเรืองแสงบนพื้น
      ctx.globalAlpha = 0.25 + pulse * 0.3;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(cx, groundY - 4, sign.w * 0.34, 11, 0, 0, 6.283);
      ctx.fill();

      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, groundY - 4, sign.w * 0.34, 11, 0, 0, 6.283);
      ctx.stroke();

      // ลูกศรชี้ขึ้นไต่ระดับ บอกทิศทางที่ต้องกระโดด
      ctx.globalAlpha = 0.35 + pulse * 0.45;
      ctx.fillStyle = col;
      for (let i = 0; i < 3; i++) {
        const ay = groundY - 30 - i * 22 - pulse * 8;
        const s = 9 - i * 1.6;
        ctx.beginPath();
        ctx.moveTo(cx, ay - s);
        ctx.lineTo(cx + s, ay + s * 0.7);
        ctx.lineTo(cx - s, ay + s * 0.7);
        ctx.closePath();
        ctx.fill();
      }

      // ตัวอักษรกำกับบนพื้น
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = col;
      ctx.font = '900 17px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(LETTERS[sign.index] || '?', cx, groundY - 15);
      ctx.restore();
    },

    /* =====================================================
       ป้ายคำตอบ A / B / C / D
       ===================================================== */
    drawAnswerSign(ctx, sign, time) {
      const LETTERS = ['A', 'B', 'C', 'D'];
      const letter = LETTERS[sign.index] || '?';
      const bob = Math.sin(time * 2.2 + sign.index * 0.9) * 4;
      const x = sign.x, y = sign.y + bob, w = sign.w, h = sign.h;

      let border = '#34e0ff';
      let fill = 'rgba(12,20,52,0.92)';
      let badge = '#8b5cff';
      if (sign.state === 'correct') { border = '#7dff5a'; badge = '#7dff5a'; fill = 'rgba(14,54,20,0.92)'; }
      else if (sign.state === 'wrong') { border = '#ff5b6e'; badge = '#ff5b6e'; fill = 'rgba(58,12,20,0.92)'; }
      else if (sign.near) { border = '#ffd23f'; badge = '#ffd23f'; }

      ctx.save();

      const img = CR.AssetLoader.img('answerSign');
      if (img) {
        ctx.drawImage(img, x, y, w, h);
      } else {
        // ป้ายลอยได้ — ไฟลอยตัวใต้ป้ายแทนขาตั้ง
        const jet = 0.5 + 0.5 * Math.sin(time * 6 + sign.index);
        ctx.globalAlpha = 0.5 + jet * 0.3;
        ctx.fillStyle = border;
        for (const jx of [x + w * 0.28, x + w * 0.72]) {
          ctx.beginPath();
          ctx.ellipse(jx, y + h + 6, 9, 5 + jet * 3, 0, 0, 6.283);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // แผ่นป้าย
        ctx.shadowColor = border;
        ctx.shadowBlur = sign.near ? 26 : 14;
        ctx.fillStyle = fill;
        U.roundRect(ctx, x, y, w, h, 10); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = border;
        ctx.lineWidth = 3;
        U.roundRect(ctx, x, y, w, h, 10); ctx.stroke();

        // แถบสแกน
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = border;
        const sy = y + ((time * 60 + sign.index * 40) % h);
        ctx.fillRect(x + 2, sy, w - 4, 8);
        ctx.globalAlpha = 1;
      }

      // ตราตัวอักษร
      ctx.fillStyle = badge;
      U.roundRect(ctx, x + 8, y + 8, 34, 34, 8); ctx.fill();
      ctx.fillStyle = '#0a0f26';
      ctx.font = '900 22px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, x + 25, y + 26);

      // ข้อความตัวเลือก — ย่อขนาดอัตโนมัติให้พอดีป้าย
      ctx.fillStyle = '#eaf3ff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      const maxW = w - 22;
      const maxLines = 3;
      let fontSize = 17;
      let lines;
      do {
        ctx.font = `600 ${fontSize}px Kanit, Tahoma, sans-serif`;
        lines = U.wrapText(ctx, sign.text, maxW, 8);
        if (lines.length <= maxLines) break;
        fontSize -= 1;
      } while (fontSize > 11);
      if (lines.length > maxLines) lines = U.wrapText(ctx, sign.text, maxW, maxLines);

      const lineH = fontSize + 4;
      const startY = y + 48 + Math.max(0, (h - 56 - lines.length * lineH) / 2);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], x + 11, startY + i * lineH);
      }

      // ลูกศรชี้ลงเมื่อผู้เล่นอยู่ใกล้
      if (sign.near && !sign.state) {
        ctx.fillStyle = '#ffd23f';
        ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 14;
        const ay = y - 16 + Math.sin(time * 8) * 4;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, ay + 12);
        ctx.lineTo(x + w / 2 - 11, ay - 2);
        ctx.lineTo(x + w / 2 + 11, ay - 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    /* =====================================================
       กำแพงพลังงาน (ปิดทางจนกว่าจะตอบคำถาม)
       ===================================================== */
    drawBarrier(ctx, b, time) {
      if (b.disabled) return;
      const img = CR.AssetLoader.img('barrier');
      if (img) { ctx.drawImage(img, b.x, b.y, b.w, b.h); return; }

      ctx.save();
      const g = ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
      g.addColorStop(0, 'rgba(255,79,216,0.15)');
      g.addColorStop(0.5, 'rgba(255,79,216,0.42)');
      g.addColorStop(1, 'rgba(255,79,216,0.15)');
      ctx.fillStyle = g;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = '#ff4fd8';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff4fd8';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x + b.w / 2, b.y + b.h);
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2;
      for (let y = b.y; y < b.y + b.h; y += 18) {
        const o = Math.sin(time * 5 + y * 0.08) * 5;
        ctx.beginPath();
        ctx.moveTo(b.x + 2, y + o);
        ctx.lineTo(b.x + b.w - 2, y + o);
        ctx.stroke();
      }
      ctx.restore();
    },

    /* =====================================================
       สิ่งกีดขวาง (ไม่ทำให้ตาย — แค่ผลักถอยหลัง)
       ===================================================== */
    drawHazard(ctx, hz, time) {
      const img = CR.AssetLoader.img('spike');
      if (img) { ctx.drawImage(img, hz.x, hz.y, hz.w, hz.h); return; }

      ctx.save();
      ctx.fillStyle = '#ff5b6e';
      ctx.shadowColor = '#ff5b6e';
      ctx.shadowBlur = 12;
      const n = Math.max(2, Math.floor(hz.w / 18));
      const sw = hz.w / n;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        ctx.moveTo(hz.x + i * sw, hz.y + hz.h);
        ctx.lineTo(hz.x + i * sw + sw / 2, hz.y);
        ctx.lineTo(hz.x + (i + 1) * sw, hz.y + hz.h);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(time * 8);
      ctx.fillRect(hz.x, hz.y + hz.h - 4, hz.w, 4);
      ctx.restore();
    },

    /** ศัตรู "บั๊ก" เดินไปมา — ชนแล้วถูกผลัก ไม่ตาย */
    drawBug(ctx, e, time) {
      const img = CR.AssetLoader.img('bugEnemy');
      if (img) { ctx.drawImage(img, e.x, e.y, e.w, e.h); return; }

      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const legPhase = Math.sin(time * 12);
      ctx.save();
      // ขา
      ctx.strokeStyle = '#4a2b6b';
      ctx.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * 9, cy + 6);
        ctx.lineTo(cx + i * 15, cy + e.h / 2 + legPhase * i * 3);
        ctx.stroke();
      }
      // ตัว
      ctx.fillStyle = '#a24bd6';
      ctx.beginPath();
      ctx.ellipse(cx, cy, e.w / 2, e.h / 2.4, 0, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = '#d78bff';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 3, e.w / 3, e.h / 4, 0, 0, 6.283);
      ctx.fill();
      // ตา
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cx - 6, cy - 4, 4, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, cy - 4, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#231038';
      const look = e.dir * 1.6;
      ctx.beginPath(); ctx.arc(cx - 6 + look, cy - 4, 2, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6 + look, cy - 4, 2, 0, 6.283); ctx.fill();
      // หนวด
      ctx.strokeStyle = '#d78bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - e.h / 2.6); ctx.lineTo(cx - 10, cy - e.h / 1.7);
      ctx.moveTo(cx + 4, cy - e.h / 2.6); ctx.lineTo(cx + 10, cy - e.h / 1.7);
      ctx.stroke();
      ctx.restore();
    },

    /* =====================================================
       เส้นชัย / พอร์ทัลไปด่านถัดไป
       ===================================================== */
    drawFinish(ctx, f, time) {
      const img = CR.AssetLoader.img('finishFlag') || CR.AssetLoader.img('portal');
      if (img) { ctx.drawImage(img, f.x, f.y, f.w, f.h); return; }

      const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
      ctx.save();
      // วงแหวนพอร์ทัล
      for (let i = 3; i >= 0; i--) {
        const t = time * 1.6 + i * 0.6;
        const rx = (f.w / 2) * (0.55 + i * 0.16) * (0.9 + 0.1 * Math.sin(t));
        const ry = (f.h / 2) * (0.62 + i * 0.13);
        ctx.strokeStyle = i % 2 ? '#34e0ff' : '#7dff5a';
        ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t);
        ctx.lineWidth = 6 - i;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 22;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283);
        ctx.stroke();
      }
      // ใจกลาง
      ctx.globalAlpha = 0.9;
      ctx.shadowBlur = 30;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, f.w / 2.4);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.5, 'rgba(52,224,255,0.55)');
      g.addColorStop(1, 'rgba(52,224,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, f.w / 2.4, f.h / 2.2, 0, 0, 6.283);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#eaf3ff';
      ctx.font = '900 18px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', cx, f.y - 12);
      ctx.restore();
    },

    /* =====================================================
       PLAYER — หุ่นยนต์น่ารัก (Placeholder แบบวาดด้วยโค้ด)
       ===================================================== */
    drawPlayer(ctx, pl, time) {
      // 1) ถ้ามี Sprite Sheet จริง ให้ใช้ก่อน
      if (pl.anim && pl.anim.ready) {
        const pad = 8;
        pl.anim.draw(ctx, pl.x - pad, pl.y - pad, pl.w + pad * 2, pl.h + pad * 2, pl.facing < 0);
        return;
      }
      // 2) ถ้ามีภาพนิ่งของผู้เล่น
      const img = CR.AssetLoader.img('player');
      if (img) {
        ctx.save();
        if (pl.facing < 0) {
          ctx.translate(pl.x + pl.w, pl.y);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, pl.w, pl.h);
        } else {
          ctx.drawImage(img, pl.x, pl.y, pl.w, pl.h);
        }
        ctx.restore();
        return;
      }

      // 3) Placeholder: หุ่นยนต์ CYBO
      const w = pl.w, h = pl.h;
      const cx = pl.x + w / 2;
      const state = pl.animState;      // idle | run | jump | fall | correct | wrong
      const runT = pl.runCycle;
      const bob = state === 'idle' ? Math.sin(time * 3) * 2 : 0;
      const squash = pl.squash || 1;
      const top = pl.y + bob;

      ctx.save();
      ctx.translate(cx, top + h);
      ctx.scale(pl.facing < 0 ? -1 : 1, 1);
      ctx.scale(1 / squash, squash);      // ยืด/หดตอนกระโดดและลงพื้น
      ctx.translate(-cx, -(top + h));

      // ---- เงา ----
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(cx, top + h + 3, w * 0.42, 5, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();

      // ---- ขา ----
      const legSwing = (state === 'run') ? Math.sin(runT) * 9 : 0;
      const legLift = (state === 'run') ? Math.max(0, Math.cos(runT)) * 5 : 0;
      ctx.strokeStyle = '#2a3a7a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      const hipY = top + h * 0.72;
      const footY = top + h - 2;
      if (state === 'jump' || state === 'fall') {
        ctx.beginPath();
        ctx.moveTo(cx - 7, hipY); ctx.lineTo(cx - 12, footY - 8);
        ctx.moveTo(cx + 7, hipY); ctx.lineTo(cx + 11, footY - 3);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx - 6, hipY); ctx.lineTo(cx - 6 + legSwing, footY - legLift);
        ctx.moveTo(cx + 6, hipY); ctx.lineTo(cx + 6 - legSwing, footY - (5 - legLift));
        ctx.stroke();
      }
      // เท้า
      ctx.fillStyle = '#34e0ff';
      ctx.fillRect(cx - 12 + legSwing, footY - legLift - 3, 13, 5);
      ctx.fillRect(cx + 1 - legSwing, footY - (5 - legLift) - 3, 13, 5);

      // ---- แขน ----
      const armSwing = (state === 'run') ? -Math.sin(runT) * 11 : (state === 'correct' ? -16 : 4);
      ctx.strokeStyle = '#3550a8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.30, top + h * 0.44);
      ctx.lineTo(cx - w * 0.34 + armSwing * 0.5, top + h * 0.62 + (state === 'correct' ? -22 : 0));
      ctx.moveTo(cx + w * 0.30, top + h * 0.44);
      ctx.lineTo(cx + w * 0.34 - armSwing * 0.5, top + h * 0.62 + (state === 'correct' ? -22 : 0));
      ctx.stroke();

      // ---- ลำตัว ----
      const bodyY = top + h * 0.30;
      const bodyH = h * 0.44;
      const bodyW = w * 0.62;
      const bg = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
      bg.addColorStop(0, '#5c8dff');
      bg.addColorStop(1, '#2c47a8');
      ctx.fillStyle = bg;
      U.roundRect(ctx, cx - bodyW / 2, bodyY, bodyW, bodyH, 9);
      ctx.fill();
      ctx.strokeStyle = '#8fc4ff';
      ctx.lineWidth = 2;
      U.roundRect(ctx, cx - bodyW / 2, bodyY, bodyW, bodyH, 9);
      ctx.stroke();

      // แกนพลังงานบนอก
      const coreCol = state === 'correct' ? '#7dff5a' : (state === 'wrong' ? '#ff5b6e' : '#34e0ff');
      ctx.fillStyle = coreCol;
      ctx.shadowColor = coreCol;
      ctx.shadowBlur = 14 + Math.sin(time * 6) * 6;
      ctx.beginPath();
      ctx.arc(cx, bodyY + bodyH * 0.42, 6, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;

      // ---- หัว ----
      const headH = h * 0.34;
      const headW = w * 0.78;
      const headY = top + h * 0.30 - headH + 4;
      const hg = ctx.createLinearGradient(0, headY, 0, headY + headH);
      hg.addColorStop(0, '#eef5ff');
      hg.addColorStop(1, '#b9cdf0');
      ctx.fillStyle = hg;
      U.roundRect(ctx, cx - headW / 2, headY, headW, headH, 11);
      ctx.fill();
      ctx.strokeStyle = '#7fa3d8';
      ctx.lineWidth = 2;
      U.roundRect(ctx, cx - headW / 2, headY, headW, headH, 11);
      ctx.stroke();

      // ---- หน้ากาก/ตา ----
      const visorY = headY + headH * 0.26;
      const visorH = headH * 0.44;
      ctx.fillStyle = '#0d1740';
      U.roundRect(ctx, cx - headW * 0.36, visorY, headW * 0.72, visorH, 7);
      ctx.fill();

      let eyeCol = '#34e0ff';
      if (state === 'correct') eyeCol = '#7dff5a';
      if (state === 'wrong') eyeCol = '#ff5b6e';
      ctx.fillStyle = eyeCol;
      ctx.shadowColor = eyeCol;
      ctx.shadowBlur = 12;
      const eyeY = visorY + visorH / 2;
      const blink = (Math.sin(time * 1.7) > 0.985) ? 0.15 : 1;

      if (state === 'correct') {
        // ตาโค้งยิ้ม ^ ^
        ctx.strokeStyle = eyeCol;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx - 8, eyeY + 2, 5, Math.PI, 0);
        ctx.moveTo(cx + 13, eyeY + 2);
        ctx.arc(cx + 8, eyeY + 2, 5, Math.PI, 0);
        ctx.stroke();
      } else if (state === 'wrong') {
        // ตา > <
        ctx.strokeStyle = eyeCol;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 13, eyeY - 4); ctx.lineTo(cx - 5, eyeY); ctx.lineTo(cx - 13, eyeY + 4);
        ctx.moveTo(cx + 13, eyeY - 4); ctx.lineTo(cx + 5, eyeY); ctx.lineTo(cx + 13, eyeY + 4);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.ellipse(cx - 8, eyeY, 4.2, 5 * blink, 0, 0, 6.283);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 8, eyeY, 4.2, 5 * blink, 0, 0, 6.283);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ---- เสาอากาศ ----
      ctx.strokeStyle = '#7fa3d8';
      ctx.lineWidth = 2.5;
      const antX = cx + headW * 0.22;
      ctx.beginPath();
      ctx.moveTo(antX, headY + 2);
      ctx.lineTo(antX + 5, headY - 12);
      ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 12 + Math.sin(time * 7) * 5;
      ctx.beginPath();
      ctx.arc(antX + 5, headY - 14, 4, 0, 6.283);
      ctx.fill();
      ctx.shadowBlur = 0;

      // ---- ไอพ่นตอนกระโดด ----
      if (state === 'jump') {
        ctx.globalAlpha = 0.75;
        const fg = ctx.createLinearGradient(0, top + h, 0, top + h + 26);
        fg.addColorStop(0, 'rgba(255,210,63,0.9)');
        fg.addColorStop(1, 'rgba(255,79,216,0)');
        ctx.fillStyle = fg;
        ctx.beginPath();
        ctx.moveTo(cx - 9, top + h - 2);
        ctx.lineTo(cx + 9, top + h - 2);
        ctx.lineTo(cx, top + h + 22 + Math.sin(time * 30) * 5);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // ---- โล่กันกระแทกหลังโดนสิ่งกีดขวาง ----
      if (pl.invuln > 0) {
        ctx.globalAlpha = 0.30 + 0.25 * Math.sin(time * 22);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, top + h * 0.55, w * 0.72, 0, 6.283);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    },

    /* =====================================================
       BOSS — คอมพิวเตอร์ยักษ์
       ===================================================== */
    drawBoss(ctx, boss, time) {
      if (boss.anim && boss.anim.ready) {
        boss.anim.draw(ctx, boss.x, boss.y, boss.w, boss.h, false);
        return;
      }
      const img = CR.AssetLoader.img('boss');
      if (img) {
        ctx.drawImage(img, boss.x, boss.y, boss.w, boss.h);
        return;
      }

      const x = boss.x, y = boss.y + Math.sin(time * 1.6) * 8, w = boss.w, h = boss.h;
      const cx = x + w / 2;
      const hurt = boss.hurtFlash > 0;

      ctx.save();
      // ออร่า
      ctx.globalAlpha = 0.18 + 0.08 * Math.sin(time * 2.4);
      const ag = ctx.createRadialGradient(cx, y + h / 2, 20, cx, y + h / 2, w);
      ag.addColorStop(0, 'rgba(255,79,110,0.7)');
      ag.addColorStop(1, 'rgba(255,79,110,0)');
      ctx.fillStyle = ag;
      ctx.beginPath(); ctx.arc(cx, y + h / 2, w, 0, 6.283); ctx.fill();
      ctx.globalAlpha = 1;

      // ตัวเครื่อง
      ctx.fillStyle = hurt ? '#ffffff' : '#2b1a48';
      U.roundRect(ctx, x, y + h * 0.14, w, h * 0.78, 18); ctx.fill();
      ctx.strokeStyle = hurt ? '#ffffff' : '#ff4f6e';
      ctx.lineWidth = 4;
      U.roundRect(ctx, x, y + h * 0.14, w, h * 0.78, 18); ctx.stroke();

      // จอภาพ (ใบหน้า)
      const sx = x + w * 0.12, sy = y + h * 0.24, sw = w * 0.76, sh = h * 0.42;
      ctx.fillStyle = '#07040f';
      U.roundRect(ctx, sx, sy, sw, sh, 10); ctx.fill();

      const eyeCol = boss.angry ? '#ff2b4a' : '#ff8aa0';
      ctx.fillStyle = eyeCol;
      ctx.shadowColor = eyeCol; ctx.shadowBlur = 26;
      const ey = sy + sh * 0.4;
      const eyeW = sw * 0.17;
      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.16, ey - 12); ctx.lineTo(sx + sw * 0.16 + eyeW, ey + 2);
      ctx.lineTo(sx + sw * 0.16, ey + 14); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sx + sw * 0.84, ey - 12); ctx.lineTo(sx + sw * 0.84 - eyeW, ey + 2);
      ctx.lineTo(sx + sw * 0.84, ey + 14); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;

      // ปาก = แถบข้อมูลวิ่ง
      ctx.fillStyle = '#ffd23f';
      for (let i = 0; i < 9; i++) {
        const bh = 6 + Math.abs(Math.sin(time * 7 + i)) * 18;
        ctx.globalAlpha = 0.55 + 0.4 * Math.abs(Math.sin(time * 7 + i));
        ctx.fillRect(sx + sw * 0.2 + i * (sw * 0.07), sy + sh - 8 - bh, sw * 0.045, bh);
      }
      ctx.globalAlpha = 1;

      // เสาอากาศ + แขนกล
      ctx.strokeStyle = '#ff4f6e'; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.2, y + h * 0.14); ctx.lineTo(cx - w * 0.3, y - 4);
      ctx.moveTo(cx + w * 0.2, y + h * 0.14); ctx.lineTo(cx + w * 0.3, y - 4);
      ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(cx - w * 0.3, y - 6, 7, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + w * 0.3, y - 6, 7, 0, 6.283); ctx.fill();
      ctx.restore();
    },

    /**
     * หลอดพลังบอส — วาดด้วย "พิกัดหน้าจอ" (เรียกหลัง camera.restore)
     * จึงลอยอยู่ในชั้น HUD เสมอ ไม่ทับป้ายคำตอบ และไม่หลุดขอบจอไม่ว่ากล้องจะอยู่ตรงไหน
     */
    drawBossHud(ctx, boss, cam, time) {
      const w = Math.min(460, cam.w * 0.44);
      const x = cam.w / 2 - w / 2;
      const y = cam.h - 138;
      const ratio = Math.max(0, boss.hp / boss.maxHp);
      const hurt = boss.hurtFlash > 0;

      ctx.save();
      ctx.textAlign = 'center';

      // กรอบพื้นหลัง
      ctx.fillStyle = 'rgba(8,10,26,0.82)';
      U.roundRect(ctx, x - 12, y - 26, w + 24, 62, 12); ctx.fill();
      ctx.strokeStyle = hurt ? '#ffffff' : 'rgba(255,79,110,0.75)';
      ctx.lineWidth = 2;
      U.roundRect(ctx, x - 12, y - 26, w + 24, 62, 12); ctx.stroke();

      // ชื่อบอส + จำนวนพลังที่เหลือ
      ctx.fillStyle = hurt ? '#ffffff' : '#ff8fa3';
      ctx.font = '900 14px Orbitron, monospace';
      ctx.fillText(`COMPUTER BOSS   ${boss.hp} / ${boss.maxHp}`, cam.w / 2, y - 8);

      // รางหลอดพลัง
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      U.roundRect(ctx, x, y, w, 18, 9); ctx.fill();

      const g = ctx.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#ff4f6e'); g.addColorStop(1, '#ffd23f');
      ctx.fillStyle = g;
      ctx.shadowColor = '#ff4f6e';
      ctx.shadowBlur = 10 + (hurt ? 18 : 6 * Math.sin(time * 4));
      U.roundRect(ctx, x + 2, y + 2, Math.max(0, (w - 4) * ratio), 14, 7); ctx.fill();
      ctx.shadowBlur = 0;

      // ขีดแบ่งตามจำนวนคำถาม เพื่อให้เห็นว่าเหลืออีกกี่ข้อ
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2;
      for (let i = 1; i < boss.maxHp; i++) {
        const sx = x + (w * i) / boss.maxHp;
        ctx.beginPath();
        ctx.moveTo(sx, y + 2); ctx.lineTo(sx, y + 16); ctx.stroke();
      }

      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 1.5;
      U.roundRect(ctx, x, y, w, 18, 9); ctx.stroke();
      ctx.restore();
    },

    /* =====================================================
       ป้ายบอกทาง / ข้อความในโลกเกม
       ===================================================== */
    drawWorldSign(ctx, x, y, title, subtitle) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '900 26px Orbitron, monospace';
      ctx.fillStyle = 'rgba(52,224,255,0.9)';
      ctx.shadowColor = '#34e0ff';
      ctx.shadowBlur = 18;
      ctx.fillText(title, x, y);
      if (subtitle) {
        ctx.shadowBlur = 0;
        ctx.font = '600 16px Kanit, Tahoma, sans-serif';
        ctx.fillStyle = 'rgba(234,243,255,0.75)';
        ctx.fillText(subtitle, x, y + 26);
      }
      ctx.restore();
    },

    /** ลูกศรชี้เป้าหมายถัดไป (ช่วยเด็กเล็กไม่ให้หลง) */
    drawGuideArrow(ctx, cam, targetX, targetY, time) {
      const margin = 70;
      if (targetX > cam.x + margin && targetX < cam.x + cam.w - margin) return;
      const onRight = targetX >= cam.x + cam.w - margin;
      const x = onRight ? cam.x + cam.w - 44 : cam.x + 44;
      const y = U.clamp(targetY, cam.y + 110, cam.y + cam.h - 110) + Math.sin(time * 4) * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(onRight ? 0 : Math.PI);
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffd23f';
      ctx.shadowBlur = 20;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-10, -14); ctx.lineTo(-3, 0); ctx.lineTo(-10, 14);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  };

  CR.Renderer = Renderer;
})(window);

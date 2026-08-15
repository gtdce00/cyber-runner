/* =========================================================
   src/particles.js
   ---------------------------------------------------------
   ระบบอนุภาค/เอฟเฟกต์ทั้งหมดของเกม
   ประเภท: dot, spark, confetti, ring, text (คะแนนเด้ง), glyph (0/1)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const MAX_PARTICLES = 700;

  class ParticleSystem {
    constructor() { this.items = []; }

    clear() { this.items.length = 0; }

    add(p) {
      if (this.items.length >= MAX_PARTICLES) this.items.shift();
      p.life = p.life || 1;
      p.age = 0;
      p.vx = p.vx || 0;
      p.vy = p.vy || 0;
      p.g = p.g === undefined ? 900 : p.g;
      p.drag = p.drag === undefined ? 0.02 : p.drag;
      this.items.push(p);
      return p;
    }

    update(dt) {
      for (let i = this.items.length - 1; i >= 0; i--) {
        const p = this.items[i];
        p.age += dt;
        if (p.age >= p.life) { this.items.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.vx *= (1 - p.drag);
        p.vy *= (1 - p.drag * 0.4);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.rot !== undefined) p.rot += (p.spin || 0) * dt;
      }
    }

    draw(ctx) {
      for (const p of this.items) {
        const t = p.age / p.life;
        const alpha = p.fade === false ? 1 : Math.max(0, 1 - t * t);
        ctx.save();
        ctx.globalAlpha = alpha * (p.alpha === undefined ? 1 : p.alpha);

        switch (p.type) {
          case 'text': {
            const rise = p.rise === undefined ? 1 : p.rise;
            ctx.font = `900 ${p.size || 20}px Orbitron, Kanit, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 5;
            ctx.strokeStyle = 'rgba(0,0,0,0.65)';
            ctx.strokeText(p.text, p.x, p.y - t * 30 * rise);
            ctx.fillStyle = p.color;
            ctx.fillText(p.text, p.x, p.y - t * 30 * rise);
            break;
          }
          case 'ring': {
            const r = (p.r0 || 6) + (p.r1 || 70) * t;
            ctx.strokeStyle = p.color;
            ctx.lineWidth = (p.w || 4) * (1 - t);
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.stroke();
            break;
          }
          case 'confetti': {
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot || 0);
            ctx.fillStyle = p.color;
            const w = p.size || 8;
            ctx.fillRect(-w / 2, -w / 4, w, w / 2);
            break;
          }
          case 'spark': {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = p.size || 3;
            ctx.lineCap = 'round';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
            ctx.stroke();
            break;
          }
          case 'glyph': {
            ctx.font = `700 ${p.size || 16}px Orbitron, monospace`;
            ctx.fillStyle = p.color;
            ctx.textAlign = 'center';
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;
            ctx.fillText(p.text, p.x, p.y);
            break;
          }
          default: { // dot
            ctx.fillStyle = p.color;
            if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 12; }
            const s = (p.size || 4) * (1 - t * 0.6);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(0.5, s), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }

    /* ================= PRESET EMITTERS ================= */

    /** ฝุ่นตอนกระโดด / ลงพื้น */
    jumpDust(x, y, amount) {
      const n = amount || 8;
      for (let i = 0; i < n; i++) {
        this.add({
          type: 'dot', x: x + U.rand(-10, 10), y,
          vx: U.rand(-90, 90), vy: U.rand(-90, -20),
          g: 420, size: U.rand(2.5, 5.5), life: U.rand(0.3, 0.55),
          color: 'rgba(190,215,255,0.75)'
        });
      }
    }

    /** ประกายเหรียญ */
    coinSparkle(x, y) {
      for (let i = 0; i < 12; i++) {
        const a = U.rand(0, Math.PI * 2);
        const sp = U.rand(70, 210);
        this.add({
          type: 'spark', x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
          g: 300, size: U.rand(2, 4), life: U.rand(0.3, 0.6),
          color: i % 2 ? '#ffd23f' : '#fff6c9'
        });
      }
      this.add({ type: 'ring', x, y, r0: 4, r1: 46, w: 3, life: 0.42, g: 0, color: '#ffd23f' });
    }

    /** เอฟเฟกต์ตอบถูก (สีเขียว) */
    correctBurst(x, y) {
      this.add({ type: 'ring', x, y, r0: 10, r1: 150, w: 8, life: 0.65, g: 0, color: '#7dff5a' });
      this.add({ type: 'ring', x, y, r0: 4, r1: 90, w: 4, life: 0.45, g: 0, color: '#ffffff' });
      for (let i = 0; i < 40; i++) {
        const a = U.rand(0, Math.PI * 2);
        const sp = U.rand(110, 340);
        this.add({
          type: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
          g: 620, size: U.rand(3, 7), life: U.rand(0.5, 1.0), glow: true,
          color: U.pick(['#7dff5a', '#c8ff9e', '#ffffff', '#34e0ff'])
        });
      }
    }

    /** เอฟเฟกต์ตอบผิด (สีแดง) */
    wrongBurst(x, y) {
      this.add({ type: 'ring', x, y, r0: 10, r1: 110, w: 7, life: 0.5, g: 0, color: '#ff5b6e' });
      for (let i = 0; i < 22; i++) {
        const a = U.rand(0, Math.PI * 2);
        const sp = U.rand(60, 200);
        this.add({
          type: 'dot', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          g: 700, size: U.rand(3, 6), life: U.rand(0.4, 0.8), glow: true,
          color: U.pick(['#ff5b6e', '#ff9aa6', '#ffffff'])
        });
      }
    }

    /** ตัวเลขคะแนนเด้งขึ้น */
    scorePopup(x, y, text, color) {
      this.add({
        type: 'text', x, y, text,
        vx: U.rand(-16, 16), vy: -90, g: 60,
        size: 26, life: 1.1, color: color || '#ffd23f'
      });
    }

    /** ข้อความใหญ่กลางฉาก */
    bigText(x, y, text, color, size) {
      this.add({
        type: 'text', x, y, text, vx: 0, vy: -26, g: 0,
        size: size || 52, life: 1.5, rise: 0.4, color: color || '#ffffff'
      });
    }

    /** ฉลองผ่านด่าน */
    confetti(x, y, amount) {
      const n = amount || 70;
      const colors = ['#34e0ff', '#ff4fd8', '#7dff5a', '#ffd23f', '#8b5cff', '#ffffff'];
      for (let i = 0; i < n; i++) {
        this.add({
          type: 'confetti', x: x + U.rand(-260, 260), y: y + U.rand(-40, 40),
          vx: U.rand(-200, 200), vy: U.rand(-560, -180),
          g: 700, size: U.rand(7, 14), life: U.rand(1.2, 2.2),
          rot: U.rand(0, 6.28), spin: U.rand(-9, 9), drag: 0.012,
          color: U.pick(colors)
        });
      }
    }

    /** เส้นเร่งความเร็วด้านหลังผู้เล่น */
    speedBoost(x, y, dir) {
      this.add({
        type: 'spark', x, y: y + U.rand(-16, 16),
        vx: -dir * U.rand(200, 380), vy: U.rand(-30, 30),
        g: 0, drag: 0.05, size: U.rand(2, 3.5), life: 0.28,
        color: 'rgba(52,224,255,0.85)'
      });
    }

    /** เกล็ดพลังงานรอบพอร์ทัล/ประตูคำถาม */
    portalAura(x, y, color) {
      const a = U.rand(0, Math.PI * 2);
      const r = U.rand(20, 60);
      this.add({
        type: 'dot', x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
        vx: -Math.cos(a) * 42, vy: -Math.sin(a) * 42 - 20,
        g: -60, size: U.rand(2, 4.5), life: U.rand(0.5, 0.9), glow: true,
        color: color || '#8b5cff'
      });
    }

    /** เลข 0/1 ลอยขึ้น (ธีมดิจิทัล) */
    dataGlyph(x, y, color) {
      this.add({
        type: 'glyph', x, y, text: Math.random() < 0.5 ? '0' : '1',
        vx: U.rand(-14, 14), vy: U.rand(-70, -30),
        g: -14, size: U.rand(11, 19), life: U.rand(0.9, 1.7),
        color: color || 'rgba(52,224,255,0.85)'
      });
    }

    /** คลื่นกระแทกของบอส */
    bossShock(x, y, color) {
      this.add({ type: 'ring', x, y, r0: 16, r1: 260, w: 12, life: 0.8, g: 0, color: color || '#ff4fd8' });
      for (let i = 0; i < 26; i++) {
        const a = U.rand(0, Math.PI * 2);
        const sp = U.rand(150, 420);
        this.add({
          type: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          g: 240, size: U.rand(2, 5), life: U.rand(0.4, 0.9),
          color: color || '#ff4fd8'
        });
      }
    }
  }

  CR.ParticleSystem = ParticleSystem;
})(window);

/* =========================================================
   src/boss.js
   ---------------------------------------------------------
   COMPUTER BOSS — ด่านที่ 15
   บอสลอยตามผู้เล่นและ "เสียพลัง" เมื่อผู้เล่นตอบคำถามถูก
   การโจมตีของบอสเป็นเอฟเฟกต์ภาพ/แรงสั่นเท่านั้น
   ไม่ทำให้ผู้เล่นตายหรือจบเกม (ตามข้อกำหนดของกิจกรรม)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  class Boss {
    constructor(maxHp, groundY) {
      this.w = 230;
      this.h = 230;
      this.x = 900;
      this.y = groundY - 430;
      this.baseY = this.y;
      this.hp = maxHp;
      this.maxHp = maxHp;
      this.hurtFlash = 0;
      this.angry = false;
      this.attackTimer = 3.2;
      this.defeated = false;
      this.phase = 0;
      this.anim = new CR.Animator('bossIdle');
      this.taunt = '';
      this.tauntTimer = 0;
    }

    get centerX() { return this.x + this.w / 2; }
    get centerY() { return this.y + this.h / 2; }

    damage(amount, particles, camera) {
      this.hp = Math.max(0, this.hp - (amount || 1));
      this.hurtFlash = 0.35;
      this.angry = this.hp / this.maxHp <= 0.5;
      if (particles) particles.bossShock(this.centerX, this.centerY, '#7dff5a');
      if (camera) camera.shake(11, 0.4);
      this.say(this.hp <= 0 ? 'ระบบล่ม... ยอมแพ้แล้ว!' : 'อาร์ก! ข้อมูลของข้าเสียหาย!');
      if (this.hp <= 0) this.defeated = true;
      return this.defeated;
    }

    /** ตอบผิด — บอสฟื้นพลังใจ (เอฟเฟกต์ข่มขวัญ ไม่หักพลังผู้เล่น) */
    mock(particles, camera) {
      this.hurtFlash = 0;
      if (particles) particles.bossShock(this.centerX, this.centerY, '#ff4fd8');
      if (camera) camera.shake(7, 0.3);
      this.say('ฮ่า ๆ! ยังตอบไม่ถูกนะ');
    }

    say(text) { this.taunt = text; this.tauntTimer = 2.6; }

    update(dt, player, particles, camera, time) {
      if (this.hurtFlash > 0) this.hurtFlash -= dt;
      if (this.tauntTimer > 0) this.tauntTimer -= dt;
      this.phase += dt;

      // ลอยตามผู้เล่นแบบช้า ๆ อยู่ข้างหน้าเสมอ
      const targetX = player.x + 330;
      this.x = U.damp(this.x, targetX, this.angry ? 1.9 : 1.2, dt);
      this.y = this.baseY + Math.sin(this.phase * 1.3) * 22;

      // ปล่อยคลื่นข่มขวัญเป็นระยะ (ไม่ทำอันตราย)
      this.attackTimer -= dt;
      if (this.attackTimer <= 0 && !this.defeated) {
        this.attackTimer = this.angry ? 2.6 : 4.2;
        if (particles) particles.bossShock(this.centerX, this.centerY + 40, this.angry ? '#ff2b4a' : '#ff4fd8');
        if (camera) camera.shake(5, 0.25);
        CR.Sound.play('boss');
      }

      // ประกายข้อมูลรอบตัว
      if (particles && Math.random() < 0.5) {
        particles.dataGlyph(
          this.centerX + U.rand(-this.w / 2, this.w / 2),
          this.centerY + U.rand(-this.h / 2, this.h / 2),
          this.angry ? 'rgba(255,79,110,0.8)' : 'rgba(255,210,63,0.75)'
        );
      }

      this.anim.update(dt);
    }

    draw(ctx, time) {
      CR.Renderer.drawBoss(ctx, this, time);
    }

    /**
     * คำพูดเยาะเย้ยของบอส — วาดในพิกัดหน้าจอเหนือหลอดพลัง
     * (ถ้าวาดในพิกัดโลกจะไปทับป้ายคำตอบที่ลอยอยู่)
     */
    drawTaunt(ctx, cam) {
      if (this.tauntTimer <= 0 || !this.taunt) return;
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.tauntTimer);
      ctx.font = '700 18px Kanit, Tahoma, sans-serif';
      ctx.textAlign = 'center';
      const w = ctx.measureText(this.taunt).width + 30;
      const cx = cam.w / 2;
      const bx = cx - w / 2;
      const by = cam.h - 214;
      ctx.fillStyle = 'rgba(8,6,20,0.92)';
      U.roundRect(ctx, bx, by, w, 34, 10); ctx.fill();
      ctx.strokeStyle = '#ff4f6e'; ctx.lineWidth = 2;
      U.roundRect(ctx, bx, by, w, 34, 10); ctx.stroke();
      ctx.fillStyle = '#ffd8de';
      ctx.fillText(this.taunt, cx, by + 23);
      ctx.restore();
    }
  }

  CR.Boss = Boss;
})(window);

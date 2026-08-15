/* =========================================================
   src/sprite.js
   ---------------------------------------------------------
   ระบบ Sprite Sheet Animation
   อ่านค่าจาก CR.SPRITES (src/config/assets.js):
     frameWidth, frameHeight, frames, speed (fps), loop, row
   ถ้ายังไม่มีไฟล์ชีตจริง Animator จะรายงาน ready=false
   เพื่อให้ renderer วาด Placeholder แบบ Procedural แทน
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  class Animator {
    /**
     * @param {string} defaultKey ชื่อ animation เริ่มต้น (key ใน CR.SPRITES)
     */
    constructor(defaultKey) {
      this.key = defaultKey || null;
      this.frame = 0;
      this.time = 0;
      this.finished = false;
    }

    get def() { return this.key ? CR.AssetLoader.sprite(this.key) : null; }

    /** พร้อมวาดจากชีตจริงหรือไม่ */
    get ready() { return !!this.def; }

    /** เปลี่ยน animation (ไม่รีเซ็ตถ้าเป็นอันเดิม) */
    play(key, restart) {
      if (this.key === key && !restart) return;
      this.key = key;
      this.frame = 0;
      this.time = 0;
      this.finished = false;
    }

    update(dt) {
      const d = this.def;
      if (!d) return;
      if (this.finished) return;
      this.time += dt;
      const spf = 1 / (d.speed || 10);
      while (this.time >= spf) {
        this.time -= spf;
        this.frame++;
        if (this.frame >= d.frames) {
          if (d.loop) this.frame = 0;
          else { this.frame = d.frames - 1; this.finished = true; }
        }
      }
    }

    /**
     * วาดเฟรมปัจจุบัน
     * @param {boolean} flip กลับด้านซ้าย-ขวา
     * @returns {boolean} true ถ้าวาดสำเร็จจากชีตจริง
     */
    draw(ctx, x, y, w, h, flip) {
      const d = this.def;
      if (!d) return false;
      const sx = this.frame * d.frameWidth;
      const sy = (d.row || 0) * d.frameHeight;
      ctx.save();
      if (flip) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        ctx.drawImage(d.image, sx, sy, d.frameWidth, d.frameHeight, 0, 0, w, h);
      } else {
        ctx.drawImage(d.image, sx, sy, d.frameWidth, d.frameHeight, x, y, w, h);
      }
      ctx.restore();
      return true;
    }
  }

  CR.Animator = Animator;
})(window);

/* =========================================================
   src/camera.js — กล้องติดตามผู้เล่นแบบนุ่มนวล + แรงสั่น
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  class Camera {
    constructor(viewW, viewH) {
      this.x = 0; this.y = 0;
      this.w = viewW; this.h = viewH;
      this.bounds = { minX: 0, minY: -Infinity, maxX: Infinity, maxY: Infinity };
      this.shakeTime = 0;
      this.shakePower = 0;
      this.offsetX = 0; this.offsetY = 0;
      this.zoom = 1;
    }

    setBounds(minX, maxX, minY, maxY) {
      this.bounds = { minX, maxX, minY, maxY };
    }

    /** เล็งไปยังเป้าหมายทันที (ใช้ตอนเริ่มด่าน/เกิดใหม่) */
    snapTo(target) {
      this.x = target.x + target.w / 2 - this.w / 2 + this.w * 0.12;
      this.y = target.y + target.h / 2 - this.h / 2 - this.h * Camera.BIAS_Y;
      this._clamp();
    }

    follow(target, dt) {
      // มองไปข้างหน้าตามทิศที่วิ่ง ทำให้เห็นสิ่งกีดขวางล่วงหน้า
      const lead = U.clamp(target.vx * 0.28, -170, 220);
      const tx = target.x + target.w / 2 - this.w / 2 + lead + this.w * 0.06;
      // ดันภาพลงเล็กน้อย เพื่อเว้นพื้นที่ด้านบนไว้ให้ Question Panel
      const ty = target.y + target.h / 2 - this.h / 2 - this.h * Camera.BIAS_Y;

      this.x = U.damp(this.x, tx, 7, dt);
      this.y = U.damp(this.y, ty, 5, dt);
      this._clamp();

      if (this.shakeTime > 0) {
        this.shakeTime -= dt;
        const p = this.shakePower * Math.max(0, this.shakeTime);
        this.offsetX = U.rand(-p, p);
        this.offsetY = U.rand(-p, p);
      } else {
        this.offsetX = this.offsetY = 0;
      }
    }

    _clamp() {
      const b = this.bounds;
      this.x = U.clamp(this.x, b.minX, Math.max(b.minX, b.maxX - this.w));
      this.y = U.clamp(this.y, b.minY, Math.max(b.minY, b.maxY - this.h));
    }

    shake(power, time) {
      this.shakePower = Math.max(this.shakePower, power);
      this.shakeTime = Math.max(this.shakeTime, time);
    }

    /** ใช้ transform ของกล้องกับ context */
    apply(ctx) {
      ctx.save();
      ctx.translate(Math.round(-this.x + this.offsetX), Math.round(-this.y + this.offsetY));
    }

    restore(ctx) { ctx.restore(); }

    /** วัตถุอยู่ในกรอบภาพหรือไม่ (สำหรับ culling) */
    isVisible(x, y, w, h, pad) {
      const p = pad || 120;
      return x + w > this.x - p && x < this.x + this.w + p &&
             y + h > this.y - p && y < this.y + this.h + p;
    }
  }

  /** สัดส่วนที่กล้องเลื่อนขึ้นจากจุดกึ่งกลางผู้เล่น (0.14 = พื้นอยู่ราว 2 ใน 3 ของจอ) */
  Camera.BIAS_Y = 0.14;

  CR.Camera = Camera;
})(window);

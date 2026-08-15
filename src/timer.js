/* =========================================================
   src/timer.js
   ---------------------------------------------------------
   นาฬิกาจับเวลาแข่งขันแบบนับถอยหลัง
   - แจ้งเตือนที่ 5 นาที / 3 นาที / 1 นาที / 30 วินาที
   - นับถอยหลังเสียง 10 วินาทีสุดท้าย
   - การแจ้งเตือน "ไม่หยุดเกม" ตามข้อกำหนด
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const WARNINGS = [
    { at: 300, level: 'info',   text: 'เหลือเวลา 5 นาที' },
    { at: 180, level: 'info',   text: 'เหลือเวลา 3 นาที' },
    { at: 60,  level: 'warn',   text: 'เหลือเวลา 1 นาที!' },
    { at: 30,  level: 'danger', text: 'เหลือเวลา 30 วินาที!' }
  ];

  class Timer {
    constructor(seconds, callbacks) {
      this.total = seconds;
      this.remaining = seconds;
      this.running = false;
      this.finished = false;
      this.cb = callbacks || {};
      this._fired = new Set();
      this._lastWholeSecond = Math.ceil(seconds);
    }

    start() { this.running = true; this.finished = false; }
    pause() { this.running = false; }
    resume() { if (!this.finished) this.running = true; }

    reset(seconds) {
      this.total = seconds === undefined ? this.total : seconds;
      this.remaining = this.total;
      this.running = false;
      this.finished = false;
      this._fired.clear();
      this._lastWholeSecond = Math.ceil(this.total);
    }

    get elapsed() { return this.total - this.remaining; }
    get text() { return U.formatTime(this.remaining); }

    /** ระดับความเร่งด่วน สำหรับเปลี่ยนสี HUD */
    get urgency() {
      if (this.remaining <= 30) return 'danger';
      if (this.remaining <= 60) return 'warn';
      return 'normal';
    }

    update(dt) {
      if (!this.running || this.finished) return;
      this.remaining = Math.max(0, this.remaining - dt);

      // ---- แจ้งเตือนตามเวลาที่กำหนด ----
      for (const w of WARNINGS) {
        if (this.remaining <= w.at && !this._fired.has(w.at)) {
          this._fired.add(w.at);
          if (this.cb.onWarning) this.cb.onWarning(w);
        }
      }

      // ---- นับถอยหลัง 10 วินาทีสุดท้าย ----
      const whole = Math.ceil(this.remaining);
      if (whole !== this._lastWholeSecond) {
        this._lastWholeSecond = whole;
        if (whole > 0 && whole <= 10 && this.cb.onCountdown) this.cb.onCountdown(whole);
      }

      if (this.remaining <= 0) {
        this.remaining = 0;
        this.finished = true;
        this.running = false;
        if (this.cb.onFinish) this.cb.onFinish();
      }
    }
  }

  CR.Timer = Timer;
  CR.TIME_WARNINGS = WARNINGS;
})(window);

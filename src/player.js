/* =========================================================
   src/player.js
   ---------------------------------------------------------
   ผู้เล่น + ระบบควบคุม + ฟิสิกส์ 2D
   สถานะแอนิเมชัน: idle / run / jump / fall / correct / wrong
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  /* ============ INPUT ============ */
  const Input = {
    keys: Object.create(null),
    touch: { left: false, right: false, jump: false },
    _justPressed: Object.create(null),
    enabled: true,

    init() {
      window.addEventListener('keydown', (e) => {
        // กัน space/ลูกศรเลื่อนหน้าเว็บระหว่างเล่น
        if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          if (document.activeElement === document.body) e.preventDefault();
        }
        const k = e.key.toLowerCase();
        if (!this.keys[k]) this._justPressed[k] = true;
        this.keys[k] = true;
      });
      window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
      window.addEventListener('blur', () => { this.keys = Object.create(null); });

      // ปุ่มบนหน้าจอ
      U.$$('#touch-controls .tbtn').forEach((btn) => {
        const key = btn.dataset.key;
        const set = (v) => (e) => { e.preventDefault(); this.touch[key] = v; };
        btn.addEventListener('pointerdown', set(true));
        btn.addEventListener('pointerup', set(false));
        btn.addEventListener('pointerleave', set(false));
        btn.addEventListener('pointercancel', set(false));
      });
    },

    /** true เฉพาะเฟรมแรกที่กด */
    pressed(...keys) {
      for (const k of keys) if (this._justPressed[k]) return true;
      return false;
    },
    down(...keys) {
      for (const k of keys) if (this.keys[k]) return true;
      return false;
    },
    endFrame() { this._justPressed = Object.create(null); },
    clear() { this.keys = Object.create(null); this._justPressed = Object.create(null); this.touch = { left: false, right: false, jump: false }; },

    get left()  { return this.enabled && (this.down('arrowleft', 'a') || this.touch.left); },
    get right() { return this.enabled && (this.down('arrowright', 'd') || this.touch.right); },
    get sprint() { return this.enabled && this.down('shift'); },
    get jumpHeld() { return this.enabled && (this.down(' ', 'arrowup', 'w') || this.touch.jump); }
  };

  /* ============ PHYSICS CONSTANTS ============ */
  const PHY = {
    gravity: 2100,
    fallGravity: 2900,       // ตกเร็วขึ้นเล็กน้อย ทำให้กระโดดรู้สึกกระชับ
    maxFall: 1250,
    walkSpeed: 300,
    sprintSpeed: 430,
    accel: 2800,
    airAccel: 1900,
    friction: 3000,
    airFriction: 700,
    jumpVelocity: -850,
    doubleJumpVelocity: -700,
    coyoteTime: 0.11,        // ยังกระโดดได้แม้เพิ่งตกขอบ
    jumpBuffer: 0.13,        // กดกระโดดก่อนแตะพื้นเล็กน้อยก็ยังนับ
    variableJumpCut: 0.16,   // ปล่อยปุ่มเร็ว = กระโดดเตี้ยลง (เบา เพื่อให้เด็กกดแปะแล้วยังถึงแท่น)
    minJumpHold: 0.12        // ถือแรงกระโดดอย่างน้อยช่วงสั้น ๆ แม้ปล่อยปุ่มเร็ว
  };

  class Player {
    constructor(x, y) {
      this.w = 42;
      this.h = 56;
      this.reset(x, y);
      this.anim = new CR.Animator('playerIdle');
    }

    reset(x, y) {
      this.x = x; this.y = y;
      this.vx = 0; this.vy = 0;
      this.facing = 1;
      this.onGround = false;
      this.jumpsLeft = 2;
      this.coyote = 0;
      this.buffer = 0;
      this.animState = 'idle';
      this.runCycle = 0;
      this.squash = 1;
      this.invuln = 0;
      this.reactionTimer = 0;
      this.frozen = false;
      this._jumpHoldGrace = 0;
      this.dustTimer = 0;
      this.spawnX = x; this.spawnY = y;
    }

    get centerX() { return this.x + this.w / 2; }
    get centerY() { return this.y + this.h / 2; }

    /** แสดงท่าดีใจ/เสียใจหลังตอบคำถาม */
    react(kind, duration) {
      this.animState = kind;
      this.reactionTimer = duration || 1.2;
      this.anim.play(kind === 'correct' ? 'playerCorrect' : 'playerWrong', true);
    }

    /** ถูกสิ่งกีดขวางผลัก (ไม่มีการเสียพลังชีวิต) */
    knockback(fromX, particles) {
      if (this.invuln > 0) return false;
      const dir = this.centerX < fromX ? -1 : 1;
      this.vx = dir * 340;
      this.vy = -330;
      this.invuln = 1.4;
      this.squash = 1.18;
      if (particles) particles.wrongBurst(this.centerX, this.centerY);
      return true;
    }

    update(dt, level, particles) {
      if (this.reactionTimer > 0) {
        this.reactionTimer -= dt;
        if (this.reactionTimer <= 0) this.animState = 'idle';
      }
      if (this.invuln > 0) this.invuln -= dt;

      const canControl = !this.frozen && Input.enabled;
      const wantLeft = canControl && Input.left;
      const wantRight = canControl && Input.right;
      const sprint = canControl && Input.sprint;
      const maxSpeed = sprint ? PHY.sprintSpeed : PHY.walkSpeed;

      /* ---------- แนวนอน ---------- */
      const accel = this.onGround ? PHY.accel : PHY.airAccel;
      if (wantLeft && !wantRight) {
        this.vx -= accel * dt;
        this.facing = -1;
      } else if (wantRight && !wantLeft) {
        this.vx += accel * dt;
        this.facing = 1;
      } else {
        const fr = (this.onGround ? PHY.friction : PHY.airFriction) * dt;
        if (Math.abs(this.vx) <= fr) this.vx = 0;
        else this.vx -= Math.sign(this.vx) * fr;
      }
      this.vx = U.clamp(this.vx, -maxSpeed, maxSpeed);

      /* ---------- กระโดด ---------- */
      if (this.onGround) { this.coyote = PHY.coyoteTime; this.jumpsLeft = 2; }
      else if (this.coyote > 0) this.coyote -= dt;

      if (canControl && (Input.pressed(' ', 'arrowup', 'w') || this._touchJumpEdge())) {
        this.buffer = PHY.jumpBuffer;
      }
      if (this.buffer > 0) this.buffer -= dt;

      if (this.buffer > 0 && (this.coyote > 0 || this.jumpsLeft > 0)) {
        const isFirst = this.coyote > 0;
        this.vy = isFirst ? PHY.jumpVelocity : PHY.doubleJumpVelocity;
        this.jumpsLeft = isFirst ? 1 : this.jumpsLeft - 1;
        this.coyote = 0;
        this.buffer = 0;
        this.onGround = false;
        this.squash = 0.84;
        this._jumpHoldGrace = PHY.minJumpHold;
        CR.Sound.play('jump', { rate: isFirst ? 1 : 1.2 });
        if (particles) particles.jumpDust(this.centerX, this.y + this.h, isFirst ? 9 : 13);
      }

      if (this._jumpHoldGrace > 0) this._jumpHoldGrace -= dt;
      const holdingJump = Input.jumpHeld || this._jumpHoldGrace > 0;
      // ปล่อยปุ่มกลางอากาศ -> ตัดแรงกระโดด
      if (this.vy < 0 && !holdingJump) this.vy += Math.abs(PHY.jumpVelocity) * PHY.variableJumpCut * dt * 6;

      /* ---------- แรงโน้มถ่วง ---------- */
      const g = this.vy > 0 ? PHY.fallGravity : PHY.gravity;
      this.vy = Math.min(PHY.maxFall, this.vy + g * dt);

      /* ---------- ชน ---------- */
      const wasAir = !this.onGround;
      const res = CR.Collision.moveAndCollide(this, level.solids, dt);

      if (res.onGround && wasAir) {
        this.squash = 1.22;
        if (particles) particles.jumpDust(this.centerX, this.y + this.h, 7);
      }

      /* ---------- อนิเมชัน ---------- */
      this.squash = U.damp(this.squash, 1, 14, dt);
      const speed = Math.abs(this.vx);
      if (this.reactionTimer <= 0) {
        if (!this.onGround) this.animState = this.vy < -40 ? 'jump' : 'fall';
        else if (speed > 22) this.animState = 'run';
        else this.animState = 'idle';
      }
      if (this.animState === 'run') {
        this.runCycle += dt * (7 + speed * 0.028);
        this.dustTimer -= dt;
        if (speed > PHY.walkSpeed * 0.95 && this.dustTimer <= 0 && particles) {
          particles.speedBoost(this.centerX - this.facing * 14, this.y + this.h - 10, this.facing);
          this.dustTimer = 0.05;
        }
      }

      const animKey = {
        idle: 'playerIdle', run: 'playerRun', jump: 'playerJump',
        fall: 'playerFall', correct: 'playerCorrect', wrong: 'playerWrong'
      }[this.animState];
      this.anim.play(animKey);
      this.anim.update(dt);
    }

    _touchJumpEdge() {
      const now = Input.touch.jump;
      const edge = now && !this._prevTouchJump;
      this._prevTouchJump = now;
      return edge;
    }

    draw(ctx, time) { CR.Renderer.drawPlayer(ctx, this, time); }
  }

  CR.Input = Input;
  CR.Player = Player;
  CR.PHY = PHY;
})(window);

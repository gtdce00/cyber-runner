/* =========================================================
   src/level.js
   ---------------------------------------------------------
   สร้างด่านจากไฟล์ data/levels.json

   แต่ละด่านประกอบด้วย:
     Start Point, Platform, Background, Obstacles, Coins,
     Checkpoint, Question Zone (+ Answer A/B/C/D), Finish Point

   ใช้ Seeded RNG => ด่านเดียวกันหน้าตาเหมือนกันทุกครั้งที่เล่น
   ทำให้การแข่งขันยุติธรรมกับผู้เข้าแข่งขันทุกคน
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const GROUND_Y = 600;        // ระดับพื้นหลักในพิกัดโลก
  const GROUND_H = 240;
  const WORLD_TOP = -360;
  const WORLD_BOTTOM = 1150;   // ต่ำกว่านี้ = ตกเหว -> กลับไปเช็คพอยต์

  const SIGN_W = 200;
  const SIGN_H = 118;
  // ป้ายคำตอบทั้ง 4 ป้าย "ลอยอยู่เหนือทางวิ่ง" ที่ระดับเดียวกัน
  //   - ผู้เล่นวิ่งลอดใต้ป้ายได้ทุกป้าย จึงอ่านตัวเลือกครบก่อนตัดสินใจ
  //   - ตอบโดย "กระโดด" ชนป้ายที่เลือก จึงเป็นการตัดสินใจที่ตั้งใจจริง
  // ห้ามวางป้ายไว้ระดับพื้น เพราะผู้เล่นจะวิ่งไปชนป้ายแรกเสมอโดยไม่ได้ตั้งใจ
  const SIGN_Y = GROUND_Y - 215;          // ขอบล่างป้ายสูงกว่าหัวผู้เล่นราว 40px
  const SIGN_GAP_X = 270;                 // ระยะห่างจุดเริ่มของแต่ละป้าย (เว้นช่อง 70px)

  /* ---------- ชิ้นส่วนเส้นทาง (Run Segments) ---------- */
  const SEGMENTS = ['flat', 'gap', 'stairs', 'floaters', 'moving', 'hazard', 'enemy', 'tower'];

  class Level {
    constructor(def, index, opts) {
      this.def = def;
      this.index = index;                 // 0-based
      this.number = index + 1;            // 1-based (แสดงผล)
      this.name = def.name;
      this.theme = def.theme || 'computer';
      this.isBoss = !!def.boss;
      this.questionCount = opts.questionCount;

      this.platforms = [];
      this.coins = [];
      this.hazards = [];
      this.enemies = [];
      this.checkpoints = [];
      this.zones = [];
      this.decorations = [];
      this.finish = null;

      this.groundY = GROUND_Y;
      this.startX = 120;
      this.startY = GROUND_Y - 120;
      this.width = 0;
      this.top = WORLD_TOP;
      this.bottom = WORLD_BOTTOM;

      this._build(opts);

      // solids = ทุกอย่างที่ชนได้ (barrier ที่ยังไม่ถูกปลดล็อกรวมอยู่ด้วย)
      this.solids = this.platforms.concat(this.zones.map((z) => z.barrier));
    }

    /* ================= BUILD ================= */
    _build(opts) {
      const rng = U.makeRng((this.def.seed || 1000 + this.number * 37) >>> 0);
      const qCount = this.questionCount;
      let x = 0;

      // ---- พื้นที่เริ่มต้น ----
      this._ground(x, 760);
      this.decorations.push({ type: 'sign', x: 300, y: GROUND_Y - 200, title: `LEVEL ${String(this.number).padStart(2, '0')}`, sub: this.name });
      x += 760;

      const segPerZone = Math.max(1, this.def.segments || 2);

      for (let q = 0; q < qCount; q++) {
        // ---- ช่วงวิ่ง/กระโดด ก่อนถึงคำถาม ----
        for (let s = 0; s < segPerZone; s++) {
          x = this._segment(x, rng, q * segPerZone + s);
        }

        // ---- เช็คพอยต์ก่อนเข้าโซนคำถาม ----
        this._ground(x, 260);
        this.checkpoints.push({
          x: x + 90, y: GROUND_Y - 78, w: 30, h: 78, active: false, index: this.checkpoints.length
        });
        x += 260;

        // ---- โซนคำถาม ----
        x = this._questionZone(x, q);
      }

      // ---- ช่วงสุดท้าย + เส้นชัย ----
      this._ground(x, 620);
      this.finish = { x: x + 330, y: GROUND_Y - 190, w: 150, h: 190 };
      this._coinArc(x + 90, GROUND_Y - 110, 6, 34);
      x += 620;

      this.width = x;
    }

    /* ---------- พื้นดิน ---------- */
    _ground(x, w) {
      this.platforms.push({ x, y: GROUND_Y, w, h: GROUND_H, kind: 'ground' });
    }

    _plat(x, y, w, h, extra) {
      const p = Object.assign({ x, y, w, h: h || 22, kind: 'platform', oneWay: true }, extra || {});
      this.platforms.push(p);
      return p;
    }

    _coin(x, y) {
      this.coins.push({ x, y, w: 26, h: 30, taken: false, phase: Math.random() * 6.28 });
    }

    _coinRow(x, y, n, gap) {
      for (let i = 0; i < n; i++) this._coin(x + i * (gap || 44), y);
    }

    _coinArc(x, y, n, gap) {
      for (let i = 0; i < n; i++) {
        const t = i / Math.max(1, n - 1);
        this._coin(x + i * (gap || 44), y - Math.sin(t * Math.PI) * 78);
      }
    }

    /* ---------- ชิ้นส่วนเส้นทางแบบสุ่ม (seeded) ---------- */
    _segment(x, rng, idx) {
      const kinds = this.isBoss ? ['flat', 'floaters', 'gap'] : SEGMENTS;
      const kind = kinds[Math.floor(rng() * kinds.length)];
      const hard = this.number >= 8;

      switch (kind) {
        case 'gap': {
          const gapW = 150 + rng() * (hard ? 130 : 80);
          this._ground(x, 200);
          this._plat(x + 200 + gapW * 0.35, GROUND_Y - 120, 130);
          this._coinArc(x + 210 + gapW * 0.35, GROUND_Y - 170, 4, 32);
          const after = x + 200 + gapW + 130;
          this._ground(after, 300);
          return after + 300;
        }
        case 'stairs': {
          this._ground(x, 160);
          let sx = x + 190;
          for (let i = 0; i < 4; i++) {
            this._plat(sx, GROUND_Y - 90 - i * 74, 118);
            this._coin(sx + 46, GROUND_Y - 128 - i * 74);
            sx += 148;
          }
          this._ground(sx + 40, 320);
          return sx + 360;
        }
        case 'floaters': {
          this._ground(x, 150);
          let fx = x + 210;
          for (let i = 0; i < 3; i++) {
            const y = GROUND_Y - (100 + Math.floor(rng() * 3) * 62);
            this._plat(fx, y, 132);
            this._coinRow(fx + 30, y - 46, 2, 40);
            fx += 200;
          }
          this._ground(fx + 30, 300);
          return fx + 330;
        }
        case 'moving': {
          this._ground(x, 190);
          const travel = 250 + rng() * 130;
          this._plat(x + 250, GROUND_Y - 130, 150, 22, {
            moving: true, oneWay: false,
            baseX: x + 250, range: travel, speed: 70 + rng() * 50, dir: 1, phase: rng() * 6.28
          });
          this._coinRow(x + 300, GROUND_Y - 210, 3, 46);
          const after = x + 250 + travel + 190;
          this._ground(after, 280);
          return after + 280;
        }
        case 'hazard': {
          this._ground(x, 640);
          const hx = x + 250 + rng() * 130;
          this.hazards.push({ x: hx, y: GROUND_Y - 34, w: 74, h: 34 });
          this._coinArc(hx - 40, GROUND_Y - 96, 5, 38);
          this._plat(hx - 60, GROUND_Y - 150, 190);
          return x + 640;
        }
        case 'enemy': {
          this._ground(x, 660);
          const ex = x + 260;
          this.enemies.push({
            x: ex, y: GROUND_Y - 42, w: 42, h: 42, dir: 1,
            speed: 52 + rng() * 46, minX: x + 180, maxX: x + 560
          });
          this._coinRow(x + 200, GROUND_Y - 120, 5, 44);
          return x + 660;
        }
        case 'tower': {
          this._ground(x, 240);
          this._plat(x + 300, GROUND_Y - 110, 120);
          this._plat(x + 480, GROUND_Y - 210, 120);
          this._plat(x + 300, GROUND_Y - 310, 120);
          this._coin(x + 360, GROUND_Y - 360);
          this._coin(x + 540, GROUND_Y - 260);
          this._ground(x + 660, 300);
          return x + 960;
        }
        default: { // flat
          this._ground(x, 620);
          this._coinRow(x + 180, GROUND_Y - 96, 5, 48);
          if (rng() > 0.55) this._plat(x + 340, GROUND_Y - 160, 150);
          return x + 620;
        }
      }
    }

    /* ---------- โซนคำถาม (Question Zone) ---------- */
    _questionZone(x, qIndex) {
      const ZONE_W = 1500;
      this._ground(x, ZONE_W);

      const gate = { x: x + 40, y: GROUND_Y - 210, w: 90, h: 210, answered: false };

      // ป้ายคำตอบ 4 ช่อง ลอยเรียงกันเหนือทางวิ่งที่ระดับเท่ากันทุกป้าย
      // ทางวิ่งด้านล่างต้องโล่ง (ไม่มีแท่นหรือสิ่งกีดขวาง) ผู้เล่นจึงเลือกได้อิสระ
      const slots = [];
      for (let i = 0; i < 4; i++) {
        slots.push({ x: x + 180 + i * SIGN_GAP_X, y: SIGN_Y, w: SIGN_W, h: SIGN_H });
      }

      // เหรียญโบนัสวางในช่องว่างระหว่างป้าย ที่ระดับพื้น
      // (เก็บได้ด้วยการวิ่งผ่าน ไม่ต้องกระโดด จึงไม่เสี่ยงชนป้ายโดยไม่ตั้งใจ)
      for (let i = 0; i < 3; i++) {
        this._coin(slots[i].x + SIGN_W + 22, GROUND_Y - 62);
      }
      // เหรียญรางวัลหลังป้ายสุดท้าย — ช่วงนี้ไม่มีป้ายอยู่เหนือหัว กระโดดเก็บได้ปลอดภัย
      const afterSigns = slots[3].x + SIGN_W + 25;
      this._coinArc(afterSigns, GROUND_Y - 105, 3, 44);

      const barrier = {
        x: x + ZONE_W - 150, y: GROUND_Y - 330, w: 26, h: 330,
        disabled: false, isBarrier: true
      };

      const zone = {
        index: qIndex,
        x, w: ZONE_W,
        gate, barrier, slots,
        signs: [],
        question: null,
        state: 'pending',       // pending | active | answered
        answeredCorrect: null,
        triggerX: gate.x + gate.w * 0.5
      };
      this.zones.push(zone);
      return x + ZONE_W;
    }

    /* ================= RUNTIME ================= */
    update(dt, time) {
      // แพลตฟอร์มเคลื่อนที่
      for (const p of this.platforms) {
        if (!p.moving) continue;
        p.x += p.dir * p.speed * dt;
        p.vx = p.dir * p.speed;
        if (p.x > p.baseX + p.range) { p.x = p.baseX + p.range; p.dir = -1; }
        if (p.x < p.baseX) { p.x = p.baseX; p.dir = 1; }
      }

      // ศัตรูบั๊ก เดินไปมา
      for (const e of this.enemies) {
        e.x += e.dir * e.speed * dt;
        if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
        if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
      }
    }

    draw(ctx, cam, time) {
      const R = CR.Renderer;

      // แพลตฟอร์ม
      for (const p of this.platforms) {
        if (!cam.isVisible(p.x, p.y, p.w, p.h)) continue;
        R.drawPlatform(ctx, p, this.theme, time);
      }

      // ป้ายบอกด่าน
      for (const d of this.decorations) {
        if (!cam.isVisible(d.x - 200, d.y - 60, 400, 120)) continue;
        R.drawWorldSign(ctx, d.x, d.y, d.title, d.sub);
      }

      // สิ่งกีดขวาง / ศัตรู
      for (const hz of this.hazards) {
        if (cam.isVisible(hz.x, hz.y, hz.w, hz.h)) R.drawHazard(ctx, hz, time);
      }
      for (const e of this.enemies) {
        if (cam.isVisible(e.x, e.y, e.w, e.h)) R.drawBug(ctx, e, time);
      }

      // เหรียญ
      for (const c of this.coins) {
        if (c.taken) continue;
        if (cam.isVisible(c.x, c.y, c.w, c.h)) R.drawCoin(ctx, c, time);
      }

      // เช็คพอยต์
      for (const cp of this.checkpoints) {
        if (cam.isVisible(cp.x, cp.y, cp.w, cp.h)) R.drawCheckpoint(ctx, cp, time);
      }

      // โซนคำถาม
      for (const z of this.zones) {
        if (cam.isVisible(z.x, GROUND_Y - 400, z.w, 500)) {
          R.drawQuestionGate(ctx, z.gate, time);
          // แผ่นเรืองแสงบนพื้นใต้ป้าย บอกตำแหน่งที่ต้องยืนกระโดด
          if (z.state === 'active') {
            for (const s of z.signs) R.drawAnswerPad(ctx, s, GROUND_Y, time);
          }
          for (const s of z.signs) R.drawAnswerSign(ctx, s, time);
          R.drawBarrier(ctx, z.barrier, time);
        }
      }

      // เส้นชัย
      if (this.finish && cam.isVisible(this.finish.x, this.finish.y, this.finish.w, this.finish.h)) {
        R.drawFinish(ctx, this.finish, time);
      }
    }
  }

  /* ================= FACTORY ================= */
  const LevelBuilder = {
    GROUND_Y, WORLD_TOP, WORLD_BOTTOM, SIGN_W, SIGN_H, SIGN_Y, SIGN_GAP_X,

    /** ค่าสำรองถ้าโหลด levels.json ไม่ได้ */
    fallbackDefs() {
      const themes = ['computer', 'computer', 'computer', 'cyber', 'cyber', 'cyber',
        'coding', 'coding', 'coding', 'network', 'network', 'network', 'ai', 'ai', 'boss'];
      return themes.map((t, i) => ({
        id: i + 1, name: `Level ${i + 1}`, theme: t, seed: 1000 + i * 37,
        segments: 2, boss: i === 14
      }));
    },

    build(def, index, opts) {
      return new Level(def, index, opts || {});
    }
  };

  CR.Level = Level;
  CR.LevelBuilder = LevelBuilder;
})(window);

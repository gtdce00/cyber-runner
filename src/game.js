/* =========================================================
   src/game.js
   ---------------------------------------------------------
   หัวใจของเกม: game loop, การเปลี่ยนด่าน, การตรวจเหตุการณ์ต่าง ๆ
   และการเชื่อมทุกระบบเข้าด้วยกัน
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const VIEW_H = 720;                 // ความสูงของมุมมองในพิกัดโลก (คงที่เพื่อความยุติธรรม)
  const FEEDBACK_CORRECT = 2.6;       // วินาทีที่แสดงคำอธิบายเมื่อตอบถูก
  const FEEDBACK_WRONG = 4.0;         // ตอบผิดให้เวลาอ่านเฉลยนานกว่า
  const FREEZE_CORRECT = 0.7;
  const FREEZE_WRONG = 1.2;
  const LEVEL_TRANSITION = 2.0;

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.stage = document.getElementById('stage');

      this.state = 'menu';   // menu | playing | feedback | levelend | over
      this.time = 0;
      this.scale = 1;
      this.viewW = 1280;
      this.viewH = VIEW_H;

      this.camera = new CR.Camera(this.viewW, this.viewH);
      this.particles = new CR.ParticleSystem();
      this.player = new CR.Player(120, 300);

      this.levelDefs = [];
      this.level = null;
      this.levelIndex = 0;
      this.boss = null;

      this.profile = null;
      this.difficulty = 'normal';
      this.scoring = null;
      this.timer = null;

      this.zoneActive = null;
      this.feedbackTimer = 0;
      this.transitionTimer = 0;
      this.answeredInLevel = 0;
      this.spawnPoint = { x: 120, y: 300 };
      this.hintUsed = false;

      this._lastFrame = 0;
      this._accumulator = 0;
      this._rafId = 0;

      window.addEventListener('resize', () => this.resize());
      this.resize();
    }

    /* ================= SETUP ================= */
    setLevelDefs(defs) { this.levelDefs = defs; }

    resize() {
      const rect = this.stage.getBoundingClientRect();
      const w = Math.max(320, rect.width);
      const h = Math.max(240, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.scale = h / VIEW_H;
      this.viewW = w / this.scale;
      this.viewH = VIEW_H;
      this._dpr = dpr;

      this.camera.w = this.viewW;
      this.camera.h = this.viewH;
      if (this.level) this._applyCameraBounds();
    }

    _applyCameraBounds() {
      this.camera.setBounds(0, this.level.width, CR.LevelBuilder.WORLD_TOP, CR.LevelBuilder.WORLD_BOTTOM - 200);
    }

    /* ================= SESSION ================= */
    start(profile) {
      const s = CR.Settings.get();
      this.profile = profile;
      this.difficulty = CR.Settings.resolveDifficulty(profile.grade);

      this.scoring = new CR.Scoring(s);
      CR.QuestionBank.resetSession();

      this.levelTotal = U.clamp(s.levels.enabled, 1, this.levelDefs.length);
      this.levelIndex = 0;

      this.timer = new CR.Timer(Math.round(s.competition.minutes * 60), {
        onWarning: (w) => this._onTimeWarning(w),
        onCountdown: (n) => this._onCountdown(n),
        onFinish: () => this.endGame('หมดเวลาการแข่งขัน')
      });

      CR.UI.setProfile(profile);
      this.loadLevel(0);
      this.timer.start();
      this.state = 'playing';
      CR.Input.enabled = true;
      CR.Input.clear();
      CR.UI.show('game');
      CR.Sound.startMusic('normal');
      this._startLoop();
    }

    loadLevel(index) {
      const s = CR.Settings.get();
      const def = this.levelDefs[index] || this.levelDefs[this.levelDefs.length - 1];
      const isBoss = !!def.boss || index === this.levelTotal - 1 && def.theme === 'boss';

      const qCount = isBoss
        ? Math.max(5, s.levels.questionsPerLevel)      // Final Boss ต้องมีอย่างน้อย 5 ข้อ
        : s.levels.questionsPerLevel;

      this.level = CR.LevelBuilder.build(def, index, { questionCount: qCount });
      this.levelIndex = index;
      this.answeredInLevel = 0;
      this.zoneActive = null;
      this.hintUsed = false;

      this.spawnPoint = { x: this.level.startX, y: this.level.startY };
      this.player.reset(this.spawnPoint.x, this.spawnPoint.y);
      this.player.frozen = false;

      this.particles.clear();
      this._applyCameraBounds();
      this.camera.snapTo(this.player);

      this.boss = this.level.isBoss ? new CR.Boss(qCount, CR.LevelBuilder.GROUND_Y) : null;
      if (this.boss) {
        CR.Sound.startMusic('boss');
        CR.UI.toast('⚠ COMPUTER BOSS ปรากฏตัว! ตอบให้ถูกเพื่อทำลายระบบของมัน', 'danger', 4200);
      }

      CR.UI.hideQuestion();
      CR.UI.hideFeedback();
      this._syncHud();
    }

    /* ================= GAME LOOP ================= */
    _startLoop() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._lastFrame = performance.now();
      const step = (ts) => {
        this._rafId = requestAnimationFrame(step);
        let dt = (ts - this._lastFrame) / 1000;
        this._lastFrame = ts;
        // กันกระตุกเมื่อสลับแท็บ/หน้าต่างค้าง
        if (dt > 0.06) dt = 0.06;
        this.update(dt);
        this.render();
        CR.Input.endFrame();
      };
      this._rafId = requestAnimationFrame(step);
    }

    stopLoop() {
      if (this._rafId) cancelAnimationFrame(this._rafId);
      this._rafId = 0;
    }

    /* ================= UPDATE ================= */
    update(dt) {
      this.time += dt;

      if (this.state === 'menu' || this.state === 'over') {
        this.particles.update(dt);
        return;
      }

      this._handleGlobalKeys();

      if (this.state === 'paused') return;

      this.timer.update(dt);

      // ---- ช่วงรอเปลี่ยนด่าน ----
      if (this.state === 'levelend') {
        this.transitionTimer -= dt;
        this.particles.update(dt);
        this.camera.follow(this.player, dt);
        if (this.transitionTimer <= 0) this._advanceLevel();
        return;
      }

      // ---- ช่วงแสดงเฉลย ----
      if (this.state === 'feedback') {
        this.feedbackTimer -= dt;
        if (this.feedbackTimer <= this._unfreezeAt && this.player.frozen) {
          this.player.frozen = false;
        }
        if (this.feedbackTimer <= 0) {
          this.state = 'playing';
          this.player.frozen = false;
          CR.UI.hideQuestion();
        }
      }

      this.level.update(dt, this.time);
      this.player.update(dt, this.level, this.particles);
      if (this.boss) this.boss.update(dt, this.player, this.particles, this.camera, this.time);

      this._checkCoins();
      this._checkHazards();
      this._checkEnemies();
      this._checkCheckpoints();
      this._checkZones();
      this._checkFinish();
      this._checkPit();

      this.particles.update(dt);
      this.camera.follow(this.player, dt);
      this._ambientParticles(dt);
      this._syncHud();
    }

    _handleGlobalKeys() {
      const I = CR.Input;
      if (I.pressed('escape', 'p')) {
        if (this.state === 'paused') this.resume(); else this.pause();
        return;
      }
      if (this.state === 'paused') return;
      if (I.pressed('r')) this._respawn(false);
      if (I.pressed('h')) this._useHint();
    }

    /* ---------- เหตุการณ์ในโลกเกม ---------- */
    _checkCoins() {
      for (const c of this.level.coins) {
        if (c.taken) continue;
        if (!CR.Collision.aabb(this.player, c)) continue;
        c.taken = true;
        const gained = this.scoring.collectCoin();
        this.particles.coinSparkle(c.x + c.w / 2, c.y + c.h / 2);
        this.particles.scorePopup(c.x + c.w / 2, c.y, '+' + gained, '#ffd23f');
        CR.Sound.play('coin');
      }
    }

    _checkHazards() {
      for (const hz of this.level.hazards) {
        if (!CR.Collision.aabb(this.player, hz)) continue;
        if (this.player.knockback(hz.x + hz.w / 2, this.particles)) {
          CR.Sound.play('hurt');
          this.camera.shake(9, 0.3);
        }
      }
    }

    _checkEnemies() {
      for (const e of this.level.enemies) {
        if (!CR.Collision.aabb(this.player, e)) continue;
        if (this.player.knockback(e.x + e.w / 2, this.particles)) {
          CR.Sound.play('hurt');
          this.camera.shake(7, 0.25);
          e.dir *= -1;
        }
      }
    }

    _checkCheckpoints() {
      for (const cp of this.level.checkpoints) {
        if (cp.active) continue;
        if (!CR.Collision.aabb(this.player, cp)) continue;
        cp.active = true;
        this.spawnPoint = { x: cp.x - 20, y: cp.y - 40 };
        this.particles.correctBurst(cp.x + cp.w / 2, cp.y + cp.h / 2);
        this.particles.scorePopup(cp.x, cp.y - 20, 'CHECKPOINT', '#7dff5a');
        CR.Sound.play('checkpoint');
      }
    }

    _checkZones() {
      for (const z of this.level.zones) {
        // ---- เข้าโซน: สุ่มคำถามแล้วสร้างป้ายคำตอบ ----
        if (z.state === 'pending' && this.player.centerX > z.triggerX) {
          const q = CR.QuestionBank.pick(this.level.def.id || this.level.number, this.difficulty);
          if (!q) { z.state = 'answered'; z.barrier.disabled = true; z.gate.answered = true; continue; }
          CR.AnswerZone.attach(z, q);
          this.zoneActive = z;
          CR.UI.showQuestion(q, z.index + 1, this.level.zones.length, CR.Settings.get().accessibility.hint);
          CR.Sound.play('portal');
          this.camera.shake(4, 0.2);
          this.particles.bigText(z.gate.x + z.gate.w / 2, z.gate.y - 30, '?', '#ffd23f', 60);
        }

        // ---- อยู่ในโซน: ไฮไลต์ + ตรวจการชนป้าย ----
        if (z.state === 'active') {
          const near = CR.AnswerZone.updateProximity(z, this.player);
          CR.UI.highlightOption(near);
          const hit = CR.AnswerZone.hitTest(z, this.player);
          if (hit >= 0) this._answer(z, hit);
        }
      }
    }

    _answer(zone, chosenIndex) {
      const res = CR.AnswerZone.resolve(zone, chosenIndex);
      const sign = zone.signs[chosenIndex];
      const cx = sign.x + sign.w / 2;
      const cy = sign.y + sign.h / 2;

      this.answeredInLevel++;
      CR.UI.markOptions(res.correctIndex, chosenIndex);

      let delta;
      if (res.correct) {
        const gain = this.scoring.answerCorrect(zone.question);
        delta = gain.total;
        this.particles.correctBurst(cx, cy);
        this.particles.bigText(cx, cy - 70, 'CORRECT!', '#7dff5a', 46);
        this.particles.scorePopup(cx, cy - 20, '+' + gain.total, '#7dff5a');
        if (gain.comboBonus > 0) {
          this.particles.scorePopup(cx + 60, cy - 60, `COMBO x${gain.combo} +${gain.comboBonus}`, '#ff4fd8');
        }
        this.player.react('correct', 1.4);
        this.camera.shake(6, 0.25);
        CR.Sound.play('correct');
        if (this.boss) this._bossHit();
      } else {
        const loss = this.scoring.answerWrong(zone.question);
        delta = loss.total;
        this.particles.wrongBurst(cx, cy);
        this.particles.bigText(cx, cy - 70, 'ไม่ถูกต้อง', '#ff5b6e', 38);
        if (delta !== 0) this.particles.scorePopup(cx, cy - 20, String(delta), '#ff5b6e');
        this.player.react('wrong', 1.4);
        this.camera.shake(8, 0.3);
        CR.Sound.play('wrong');
        if (this.boss) this.boss.mock(this.particles, this.camera);
      }

      // เปิดทางเดินต่อ
      this.particles.bigText(zone.barrier.x, zone.barrier.y + 120, 'ทางเปิดแล้ว!', '#34e0ff', 26);

      const dur = res.correct ? FEEDBACK_CORRECT : FEEDBACK_WRONG;
      this._unfreezeAt = dur - (res.correct ? FREEZE_CORRECT : FREEZE_WRONG);
      this.feedbackTimer = dur;
      this.state = 'feedback';
      this.player.frozen = true;
      this.player.vx = 0;
      CR.UI.showFeedback(res, delta, dur);
      this.zoneActive = null;
    }

    _bossHit() {
      const dead = this.boss.damage(1, this.particles, this.camera);
      if (dead) {
        this.scoring.specialBonus('boss-defeated');
        this.particles.confetti(this.boss.centerX, this.boss.centerY, 110);
        this.particles.bigText(this.boss.centerX, this.boss.centerY, 'BOSS DEFEATED!', '#ffd23f', 52);
        CR.UI.toast('🏆 ทำลายระบบของ COMPUTER BOSS สำเร็จ! +' + CR.Settings.get().score.bonus + ' คะแนน', 'good', 4000);
        CR.Sound.play('levelComplete');
      }
    }

    _useHint() {
      const s = CR.Settings.get();
      if (!s.accessibility.hint) return;
      if (!this.zoneActive || this.zoneActive.state !== 'active') return;
      if (this.hintUsed === this.zoneActive) return;
      const q = this.zoneActive.question;
      if (!q || !q.hint) { CR.UI.toast('คำถามข้อนี้ไม่มีคำใบ้', 'info', 1600); return; }
      this.hintUsed = this.zoneActive;
      CR.UI.toast('💡 ' + q.hint, 'info', 4200);
      CR.Sound.play('button');
    }

    _checkFinish() {
      const f = this.level.finish;
      if (!f || this.state !== 'playing') return;
      if (!CR.Collision.aabb(this.player, f)) return;
      this._completeLevel();
    }

    _completeLevel() {
      const gained = this.scoring.clearLevel();
      this.particles.confetti(this.player.centerX, this.player.centerY - 60, 90);
      this.particles.bigText(this.player.centerX, this.player.centerY - 120, 'LEVEL CLEAR!', '#34e0ff', 50);
      this.particles.scorePopup(this.player.centerX, this.player.centerY - 40, '+' + gained, '#34e0ff');
      CR.Sound.play('levelComplete');
      this.camera.shake(6, 0.4);

      // ---- ภารกิจพิเศษ: ตอบถูกทุกข้อในด่าน ----
      const zones = this.level.zones;
      const allCorrect = zones.length > 0 && zones.every((z) => z.answeredCorrect === true);
      if (allCorrect) {
        const b = this.scoring.specialBonus('perfect-level');
        this.particles.scorePopup(this.player.centerX, this.player.centerY - 150, 'PERFECT +' + b, '#ffd23f');
        CR.UI.toast('⭐ ภารกิจพิเศษสำเร็จ: ตอบถูกทุกข้อในด่านนี้! +' + b, 'good', 3200);
      }
      // ---- ภารกิจพิเศษ: เก็บเหรียญครบทุกเหรียญ ----
      if (this.level.coins.length && this.level.coins.every((c) => c.taken)) {
        const b = this.scoring.specialBonus('all-coins');
        this.particles.scorePopup(this.player.centerX, this.player.centerY - 190, 'ALL COINS +' + b, '#ffd23f');
      }

      this.player.frozen = true;
      this.state = 'levelend';
      this.transitionTimer = LEVEL_TRANSITION;
      CR.UI.hideQuestion();
    }

    _advanceLevel() {
      const next = this.levelIndex + 1;
      if (next >= this.levelTotal) {
        this.endGame('พิชิตครบทุกด่านแล้ว! 🎉');
        return;
      }
      this.loadLevel(next);
      this.state = 'playing';
      this.player.frozen = false;
      CR.UI.toast(`เข้าสู่ด่าน ${next + 1}: ${this.level.name}`, 'info', 2600);
      if (!this.level.isBoss) CR.Sound.startMusic('normal');
    }

    _checkPit() {
      if (this.player.y > CR.LevelBuilder.WORLD_BOTTOM) this._respawn(true);
    }

    _respawn(fell) {
      this.player.reset(this.spawnPoint.x, this.spawnPoint.y);
      this.player.invuln = 1.0;
      this.camera.snapTo(this.player);
      this.particles.correctBurst(this.player.centerX, this.player.centerY);
      if (fell) CR.UI.toast('กลับไปที่จุดเช็คพอยต์', 'info', 1400);
      CR.Sound.play('portal', { rate: 0.8 });
    }

    _ambientParticles(dt) {
      // เกล็ดข้อมูลลอยรอบ ๆ ให้ฉากมีชีวิต
      if (Math.random() < dt * 8) {
        this.particles.dataGlyph(
          U.rand(this.camera.x, this.camera.x + this.camera.w),
          this.camera.y + this.camera.h - U.rand(0, 200),
          'rgba(52,224,255,0.45)'
        );
      }
      // ออร่ารอบประตูคำถามที่ยังไม่ตอบ
      for (const z of this.level.zones) {
        if (z.state !== 'pending') continue;
        if (!this.camera.isVisible(z.gate.x, z.gate.y, z.gate.w, z.gate.h)) continue;
        if (Math.random() < dt * 22) {
          this.particles.portalAura(z.gate.x + z.gate.w / 2, z.gate.y + z.gate.h / 2, '#8b5cff');
        }
      }
      const f = this.level.finish;
      if (f && this.camera.isVisible(f.x, f.y, f.w, f.h) && Math.random() < dt * 26) {
        this.particles.portalAura(f.x + f.w / 2, f.y + f.h / 2, '#34e0ff');
      }
    }

    /* ---------- เวลา ---------- */
    _onTimeWarning(w) {
      CR.UI.toast('⏰ ' + w.text, w.level, 2800);
      CR.Sound.play('timeWarning', { rate: w.level === 'danger' ? 1.25 : 1 });
      if (w.level === 'danger') this.camera.shake(5, 0.3);
    }

    _onCountdown(n) {
      CR.UI.bigCount(String(n));
      CR.Sound.play('tick', { rate: 1 + (10 - n) * 0.05 });
    }

    _syncHud() {
      CR.UI.updateHud({
        timeText: this.timer.text,
        urgency: this.timer.urgency,
        score: this.scoring.score,
        levelNumber: this.levelIndex + 1,
        levelTotal: this.levelTotal,
        levelName: this.level.name,
        coins: this.scoring.coins,
        combo: this.scoring.combo,
        progress: this.player.x / Math.max(1, this.level.width - 400)
      });
    }

    /* ================= PAUSE / END ================= */
    pause() {
      if (this.state === 'over' || this.state === 'menu') return;
      this._resumeState = this.state;
      this.state = 'paused';
      this.timer.pause();
      CR.Input.enabled = false;
      CR.Sound.pauseMusic();
      CR.UI.show('pause');
    }

    resume() {
      if (this.state !== 'paused') return;
      this.state = this._resumeState || 'playing';
      this.timer.resume();
      CR.Input.enabled = true;
      CR.Input.clear();
      CR.Sound.resumeMusic();
      CR.UI.show('game');
    }

    restartLevel() {
      this.loadLevel(this.levelIndex);
      this.state = 'playing';
      this.timer.resume();
      CR.Input.enabled = true;
      CR.Input.clear();
      CR.Sound.resumeMusic();
      CR.UI.show('game');
    }

    endGame(reason) {
      if (this.state === 'over') return;
      this.state = 'over';
      this.timer.pause();
      CR.Input.enabled = false;
      this.player.frozen = true;
      CR.Sound.stopMusic();
      CR.Sound.play('gameOver');

      const snap = this.scoring.snapshot();
      const totalQuestions = this.levelTotal * CR.Settings.get().levels.questionsPerLevel;
      const rank = this.scoring.rank(totalQuestions);
      const timeUsed = Math.round(this.timer.elapsed);

      const saved = CR.Leaderboard.add({
        name: this.profile.name,
        grade: this.profile.grade,
        room: this.profile.room,
        team: this.profile.team,
        score: snap.score,
        timeUsed,
        levels: snap.levelsCleared,
        correct: snap.correct,
        wrong: snap.wrong,
        coins: snap.coins,
        bestCombo: snap.bestCombo,
        rank: rank.letter,
        difficulty: this.difficulty
      });

      CR.UI.showResult({
        reason,
        score: snap.score,
        timeUsed,
        levelsCleared: snap.levelsCleared,
        levelTotal: this.levelTotal,
        correct: snap.correct,
        wrong: snap.wrong,
        coins: snap.coins,
        bestCombo: snap.bestCombo,
        accuracy: snap.accuracy,
        rank,
        position: saved.position,
        totalEntries: saved.list.length,
        entryId: saved.entry.id
      });

      // ส่งขึ้น Google Sheets — คะแนนถูกบันทึกลงเครื่องแล้วข้างบน
      // ถ้าส่งไม่สำเร็จจะเข้าคิวรอส่งใหม่ ผลของนักเรียนจึงไม่หายแน่นอน
      this._syncResult(snap, rank, timeUsed);
    }

    _syncResult(snap, rank, timeUsed) {
      if (!CR.Cloud || !CR.Cloud.enabled) return;
      CR.UI.setCloudStatus('sending');
      CR.Cloud.submitResult({
        studentId: this.profile.studentId || '',
        name: this.profile.name,
        grade: this.profile.grade,
        room: this.profile.room,
        team: this.profile.team,
        score: snap.score,
        correct: snap.correct,
        wrong: snap.wrong,
        accuracy: snap.accuracy,
        levels: snap.levelsCleared,
        coins: snap.coins,
        bestCombo: snap.bestCombo,
        timeUsed,
        rank: rank.letter,
        difficulty: this.difficulty,
        playedAt: Date.now(),
        categories: snap.categories
      }).then((r) => {
        if (r.sent) {
          CR.UI.setCloudStatus('sent');
        } else if (r.queued) {
          CR.UI.setCloudStatus('queued');
        } else {
          CR.UI.setCloudStatus('off');
        }
      }).catch(() => CR.UI.setCloudStatus('queued'));
    }

    quitToMenu() {
      this.stopLoop();
      this.state = 'menu';
      CR.Input.enabled = false;
      CR.Sound.stopMusic();
      CR.UI.hideQuestion();
      CR.UI.hideFeedback();
      CR.UI.show('home');
    }

    /* ================= RENDER ================= */
    render() {
      const ctx = this.ctx;
      const s = this._dpr * this.scale;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      ctx.imageSmoothingEnabled = true;

      if (!this.level) {
        ctx.fillStyle = '#0a0f26';
        ctx.fillRect(0, 0, this.viewW, this.viewH);
        return;
      }

      // ---- ฉากหลัง (พิกัดหน้าจอ) ----
      CR.Renderer.drawBackground(ctx, this.camera, this.level.theme, this.time);

      // ---- โลกเกม (พิกัดโลก) ----
      this.camera.apply(ctx);
      this.level.draw(ctx, this.camera, this.time);
      if (this.boss) this.boss.draw(ctx, this.time);
      this.player.draw(ctx, this.time);
      this.particles.draw(ctx);
      this._drawGuides(ctx);
      this.camera.restore(ctx);

      // ---- ชั้น HUD บนผืนผ้าใบ (พิกัดหน้าจอ) ----
      if (this.boss) {
        CR.Renderer.drawBossHud(ctx, this.boss, this.camera, this.time);
        this.boss.drawTaunt(ctx, this.camera);
      }

      // ---- เอฟเฟกต์ทับหน้าจอ ----
      this._drawVignette(ctx);
      if (this.state === 'paused') this._drawPauseTint(ctx);
    }

    _drawGuides(ctx) {
      // ลูกศรชี้เป้าหมายถัดไป (โซนคำถามที่ยังไม่ตอบ หรือเส้นชัย)
      let target = null;
      for (const z of this.level.zones) {
        if (z.state === 'pending') { target = { x: z.gate.x, y: z.gate.y + 60 }; break; }
        // กำลังตอบอยู่ในโซนนี้ — ไม่ต้องมีลูกศร ให้โฟกัสที่ป้ายคำตอบ
        if (z.state === 'active') return;
      }
      if (!target && this.level.finish) {
        target = { x: this.level.finish.x, y: this.level.finish.y + 60 };
      }
      if (target) CR.Renderer.drawGuideArrow(ctx, this.camera, target.x, target.y, this.time);
    }

    _drawVignette(ctx) {
      const g = ctx.createRadialGradient(
        this.viewW / 2, this.viewH / 2, this.viewH * 0.42,
        this.viewW / 2, this.viewH / 2, this.viewH * 0.86
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }

    _drawPauseTint(ctx) {
      ctx.fillStyle = 'rgba(4,6,15,0.55)';
      ctx.fillRect(0, 0, this.viewW, this.viewH);
    }
  }

  CR.Game = Game;
})(window);

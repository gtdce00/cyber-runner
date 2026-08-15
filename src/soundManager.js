/* =========================================================
   src/soundManager.js
   ---------------------------------------------------------
   ระบบเสียงของเกม (Web Audio API)

   ทำงาน 2 โหมดอัตโนมัติ:
     1) ถ้ามีไฟล์เสียงจริงใน /assets/sounds -> เล่นไฟล์นั้น
     2) ถ้าไม่มีไฟล์ -> สังเคราะห์เสียงด้วย Web Audio API
        (เกมมีเสียงครบตั้งแต่วันแรก และไม่มี error)

   เพลงประกอบ (BGM) ถ้าไม่มีไฟล์ จะเล่นทำนอง chiptune ที่สร้างด้วยโค้ด
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  /* ---------- สูตรเสียงสังเคราะห์ ----------
     type: waveform, notes: [[ความถี่Hz, เวลาเริ่ม(วิ), ความยาว(วิ)], ...] */
  const SYNTH = {
    jump:          { type: 'square',   gain: 0.28, notes: [[330, 0, 0.07], [520, 0.05, 0.10]] },
    coin:          { type: 'square',   gain: 0.22, notes: [[988, 0, 0.05], [1319, 0.05, 0.12]] },
    correct:       { type: 'triangle', gain: 0.30, notes: [[523, 0, 0.10], [659, 0.09, 0.10], [784, 0.18, 0.12], [1047, 0.27, 0.22]] },
    wrong:         { type: 'sawtooth', gain: 0.22, notes: [[311, 0, 0.16], [233, 0.15, 0.26]] },
    levelComplete: { type: 'triangle', gain: 0.30, notes: [[523, 0, 0.11], [659, 0.11, 0.11], [784, 0.22, 0.11], [1047, 0.33, 0.14], [784, 0.47, 0.10], [1047, 0.58, 0.34]] },
    button:        { type: 'square',   gain: 0.16, notes: [[660, 0, 0.045]] },
    boss:          { type: 'sawtooth', gain: 0.26, notes: [[110, 0, 0.30], [82, 0.28, 0.42]] },
    timeWarning:   { type: 'square',   gain: 0.26, notes: [[880, 0, 0.10], [880, 0.16, 0.10]] },
    checkpoint:    { type: 'triangle', gain: 0.24, notes: [[659, 0, 0.09], [988, 0.09, 0.18]] },
    hurt:          { type: 'square',   gain: 0.20, notes: [[196, 0, 0.09], [147, 0.08, 0.14]] },
    portal:        { type: 'sine',     gain: 0.24, notes: [[440, 0, 0.14], [660, 0.10, 0.14], [880, 0.20, 0.22]] },
    gameOver:      { type: 'triangle', gain: 0.28, notes: [[523, 0, 0.16], [440, 0.17, 0.16], [349, 0.34, 0.16], [262, 0.51, 0.5]] },
    tick:          { type: 'square',   gain: 0.18, notes: [[1200, 0, 0.035]] }
  };

  /* ---------- ทำนอง BGM (chiptune) เมื่อไม่มีไฟล์เพลง ---------- */
  const NOTE = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, R: 0 };
  const BGM_TRACKS = {
    normal: {
      bpm: 132,
      lead: ['C5','E5','G5','E5','A4','C5','E5','C5','F4','A4','C5','A4','G4','B4','D5','G4'],
      bass: ['C4','R','G4','R','A4','R','E4','R','F4','R','C4','R','G4','R','G4','R']
    },
    boss: {
      bpm: 152,
      lead: ['A4','C5','E5','A5','G5','E5','C5','E5','F4','A4','C5','F4','E4','G4','B4','E5'],
      bass: ['A4','R','A4','R','G4','R','G4','R','F4','R','F4','R','E4','R','E4','R']
    }
  };

  const SoundManager = {
    ctx: null,
    master: null,
    sfxGain: null,
    musicGain: null,
    enabledSfx: true,
    enabledMusic: true,
    sfxVolume: 0.7,
    musicVolume: 0.3,
    _unlocked: false,
    _musicTimer: null,
    _musicStep: 0,
    _musicTrack: 'normal',
    _htmlMusic: null,

    init(settings) {
      this.applySettings(settings);
      const unlock = () => this.unlock();
      ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
        window.addEventListener(ev, unlock, { once: false, passive: true })
      );
    },

    applySettings(s) {
      if (!s) return;
      this.enabledSfx = !!s.audio.sfx;
      this.enabledMusic = !!s.audio.music;
      this.sfxVolume = s.audio.sfxVolume;
      this.musicVolume = s.audio.musicVolume;
      if (this.sfxGain) this.sfxGain.gain.value = this.enabledSfx ? this.sfxVolume : 0;
      if (this.musicGain) this.musicGain.gain.value = this.enabledMusic ? this.musicVolume : 0;
      if (this._htmlMusic) this._htmlMusic.volume = this.enabledMusic ? this.musicVolume : 0;
      if (!this.enabledMusic) this.stopMusic();
    },

    /** AudioContext ต้องถูกปลดล็อกด้วย user gesture ตามนโยบายของเบราว์เซอร์ */
    unlock() {
      if (this._unlocked) {
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { this._unlocked = true; return; }
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.enabledSfx ? this.sfxVolume : 0;
        this.sfxGain.connect(this.master);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = this.enabledMusic ? this.musicVolume : 0;
        this.musicGain.connect(this.master);

        this._unlocked = true;
      } catch (e) {
        console.warn('[Sound] เริ่ม Web Audio ไม่สำเร็จ — เกมจะเล่นแบบไม่มีเสียง', e);
        this._unlocked = true;
      }
    },

    /** เล่นเอฟเฟกต์เสียงตามชื่อ (ดู CR.SOUNDS) */
    play(name, opts) {
      if (!this.enabledSfx) return;
      this.unlock();
      const file = CR.AssetLoader.audio[name];
      if (file) {
        try {
          const node = file.cloneNode();
          node.volume = Math.min(1, this.sfxVolume * ((opts && opts.volume) || 1));
          node.play().catch(() => this._synth(name, opts));
          return;
        } catch (e) { /* ตกไปใช้เสียงสังเคราะห์ */ }
      }
      this._synth(name, opts);
    },

    _synth(name, opts) {
      const rec = SYNTH[name];
      if (!rec || !this.ctx) return;
      const now = this.ctx.currentTime;
      const vol = (opts && opts.volume) || 1;
      const rate = (opts && opts.rate) || 1;

      for (const [freq, at, dur] of rec.notes) {
        if (!freq) continue;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = rec.type;
        osc.frequency.value = freq * rate;
        const t0 = now + at;
        const t1 = t0 + dur;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, rec.gain * vol), t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t1);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(t0);
        osc.stop(t1 + 0.02);
      }
    },

    /* ---------------- MUSIC ---------------- */
    startMusic(track) {
      this._musicTrack = track === 'boss' ? 'boss' : 'normal';
      if (!this.enabledMusic) return;
      this.unlock();

      const key = this._musicTrack === 'boss' ? 'bgmBoss' : 'bgm';
      const file = CR.AssetLoader.audio[key] || CR.AssetLoader.audio.bgm;
      this.stopMusic();

      if (file) {
        try {
          this._htmlMusic = file.cloneNode();
          this._htmlMusic.loop = true;
          this._htmlMusic.volume = this.musicVolume;
          this._htmlMusic.play().catch(() => { this._htmlMusic = null; this._startSynthMusic(); });
          return;
        } catch (e) { this._htmlMusic = null; }
      }
      this._startSynthMusic();
    },

    _startSynthMusic() {
      if (!this.ctx || !this.enabledMusic) return;
      const tr = BGM_TRACKS[this._musicTrack];
      const stepMs = (60 / tr.bpm) * 1000 / 2; // โน้ตเขบ็ต
      this._musicStep = 0;
      this._musicTimer = setInterval(() => this._musicTick(tr), stepMs);
    },

    _musicTick(tr) {
      if (!this.ctx || !this.enabledMusic) return;
      const i = this._musicStep % tr.lead.length;
      this._musicStep++;
      const t = this.ctx.currentTime;

      const voice = (freq, type, gain, dur) => {
        if (!freq) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g); g.connect(this.musicGain);
        osc.start(t); osc.stop(t + dur + 0.02);
      };

      voice(NOTE[tr.lead[i]], 'square', 0.10, 0.20);
      if (i % 2 === 0) voice(NOTE[tr.bass[i]] / 2, 'triangle', 0.16, 0.28);
    },

    stopMusic() {
      if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
      if (this._htmlMusic) { try { this._htmlMusic.pause(); } catch (e) { /* ignore */ } this._htmlMusic = null; }
    },

    pauseMusic() {
      if (this._htmlMusic) { try { this._htmlMusic.pause(); } catch (e) { /* ignore */ } }
      if (this._musicTimer) { clearInterval(this._musicTimer); this._musicTimer = null; }
    },

    resumeMusic() {
      if (!this.enabledMusic) return;
      if (this._htmlMusic) { this._htmlMusic.play().catch(() => {}); return; }
      if (!this._musicTimer) this._startSynthMusic();
    }
  };

  CR.Sound = SoundManager;
})(window);

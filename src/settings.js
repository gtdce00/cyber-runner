/* =========================================================
   src/settings.js
   ---------------------------------------------------------
   จัดการค่าตั้งต้นของเกม (ครู/ผู้ดูแลแก้ได้จากหน้า Settings)
   ลำดับความสำคัญ:  ค่าใน localStorage  >  data/settings.json  >  DEFAULTS
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const STORAGE_KEY = 'cyberrunner.settings.v1';

  /** ค่าสำรองสุดท้าย เผื่อโหลด settings.json ไม่ได้ */
  const DEFAULTS = {
    competition: { minutes: 15 },
    score: {
      correct: 100,
      wrong: -50,
      levelClear: 100,
      coin: 10,
      bonus: 200,
      comboStep: 25,
      comboMax: 8,
      allowNegative: false
    },
    levels: { enabled: 15, questionsPerLevel: 3 },
    difficulty: 'auto',
    audio: { sfx: true, sfxVolume: 0.7, music: true, musicVolume: 0.3 },
    accessibility: { hint: true, touchControls: false, highContrast: false, uiScale: 100 }
  };

  const Settings = {
    /** ค่าเริ่มต้นจากไฟล์ (ใช้เวลากดปุ่ม "คืนค่าเริ่มต้น") */
    fileDefaults: U.deepClone(DEFAULTS),
    current: U.deepClone(DEFAULTS),

    init(fromJson) {
      this.fileDefaults = U.mergeDefaults(DEFAULTS, fromJson || {});
      this.current = U.mergeDefaults(this.fileDefaults, this.readStorage());
      this.applyAccessibility();
      return this.current;
    },

    get() { return this.current; },

    readStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        console.warn('[Settings] อ่านค่าจาก localStorage ไม่ได้', e);
        return null;
      }
    },

    save(patch) {
      this.current = U.mergeDefaults(this.current, patch || {});
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.current));
      } catch (e) {
        console.warn('[Settings] บันทึกค่าไม่สำเร็จ (localStorage เต็มหรือถูกปิด)', e);
      }
      this.applyAccessibility();
      return this.current;
    },

    resetToDefaults() {
      this.current = U.deepClone(this.fileDefaults);
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
      this.applyAccessibility();
      return this.current;
    },

    /** ใช้ค่าที่มีผลกับหน้าตาเว็บทันที */
    applyAccessibility() {
      const a = this.current.accessibility;
      document.documentElement.style.setProperty('--ui-scale', (a.uiScale || 100) / 100);
      document.body.classList.toggle('high-contrast', !!a.highContrast);
      const touch = document.getElementById('touch-controls');
      if (touch) touch.classList.toggle('always-on', !!a.touchControls);
    },

    /**
     * แปลง "ชั้นเรียน" เป็นระดับความยาก เมื่อผู้ดูแลตั้งค่าเป็น AUTO
     *   ป.4–ป.6 -> easy / normal
     *   ม.1–ม.3 -> normal / hard
     */
    resolveDifficulty(grade) {
      const d = this.current.difficulty;
      if (d !== 'auto') return d;
      const g = String(grade || '');
      if (g === 'ป.4' || g === 'ป.5') return 'easy';
      if (g === 'ป.6' || g === 'ม.1') return 'normal';
      if (g === 'ม.2' || g === 'ม.3') return 'hard';
      return 'normal';
    },

    /** ชุดความยากที่ยอมให้สุ่มคำถาม (กว้างกว่าค่าเดียวเพื่อให้มีคำถามพอ) */
    difficultyPool(level) {
      switch (level) {
        case 'easy':   return ['easy', 'easy', 'normal'];
        case 'hard':   return ['hard', 'hard', 'normal'];
        default:       return ['normal', 'easy', 'hard'];
      }
    }
  };

  CR.Settings = Settings;
  CR.SETTINGS_DEFAULTS = DEFAULTS;
})(window);

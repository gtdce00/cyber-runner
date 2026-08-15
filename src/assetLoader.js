/* =========================================================
   src/assetLoader.js
   ---------------------------------------------------------
   โหลด Asset ทั้งหมดที่ประกาศไว้ใน src/config/assets.js
   - ไฟล์ที่ไม่มีอยู่จริงจะถูกข้ามไปเงียบ ๆ (ไม่ทำให้เกม error)
     แล้วระบบวาดภาพจะใช้ Placeholder แบบ Procedural แทน
   - ไม่โหลดไฟล์เดิมซ้ำ (cache ตาม path)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  const AssetLoader = {
    images: Object.create(null),   // key -> HTMLImageElement
    sprites: Object.create(null),  // key -> { image, frameWidth, ... }
    audio: Object.create(null),    // key -> HTMLAudioElement (ต้นฉบับสำหรับ clone)
    missing: [],                   // key ที่โหลดไม่ได้
    _byPath: Object.create(null),  // path -> Promise<HTMLImageElement|null>

    /** โหลดรูปเดี่ยว 1 ไฟล์ — คืน null ถ้าไม่มี (ไม่ throw) */
    loadImage(path) {
      if (this._byPath[path]) return this._byPath[path];
      const p = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img.naturalWidth > 0 ? img : null);
        img.onerror = () => resolve(null);
        img.src = path;
      });
      this._byPath[path] = p;
      return p;
    },

    loadAudio(path) {
      return new Promise((resolve) => {
        const a = new Audio();
        let settled = false;
        const done = (v) => { if (!settled) { settled = true; resolve(v); } };
        a.addEventListener('canplaythrough', () => done(a), { once: true });
        a.addEventListener('error', () => done(null), { once: true });
        // ถ้าไฟล์ไม่มีจริง บาง browser จะเงียบ — ตั้ง timeout กันค้าง
        setTimeout(() => done(a.readyState >= 2 ? a : null), 4000);
        a.preload = 'auto';
        a.src = path;
        a.load();
      });
    },

    /**
     * โหลดทุกอย่างตาม config
     * @param {(ratio:number, label:string)=>void} onProgress
     */
    async loadAll(onProgress) {
      const tasks = [];

      // --- รูปเดี่ยว ---
      for (const [key, path] of Object.entries(CR.ASSETS)) {
        tasks.push({
          label: key,
          run: async () => {
            const img = await this.loadImage(path);
            if (img) this.images[key] = img;
            else this.missing.push(key);
          }
        });
      }

      // --- sprite sheet ---
      for (const [key, cfg] of Object.entries(CR.SPRITES)) {
        tasks.push({
          label: key,
          run: async () => {
            const img = await this.loadImage(cfg.src);
            if (img) {
              this.sprites[key] = Object.assign({}, cfg, {
                image: img,
                frames: cfg.frames || Math.max(1, Math.floor(img.naturalWidth / cfg.frameWidth)),
                speed: cfg.speed || 10,
                loop: cfg.loop !== false,
                row: cfg.row || 0
              });
            } else {
              this.missing.push(key);
            }
          }
        });
      }

      // --- เสียง ---
      const soundEntries = Object.entries(CR.SOUNDS).concat(Object.entries(CR.MUSIC));
      for (const [key, path] of soundEntries) {
        tasks.push({
          label: key,
          run: async () => {
            const a = await this.loadAudio(path);
            if (a) this.audio[key] = a;
            else this.missing.push(key);
          }
        });
      }

      let done = 0;
      const total = tasks.length;
      // โหลดพร้อมกันเป็นชุด ๆ เพื่อไม่ให้เปิด connection พร้อมกันมากเกินไป
      const CHUNK = 8;
      for (let i = 0; i < tasks.length; i += CHUNK) {
        const chunk = tasks.slice(i, i + CHUNK);
        await Promise.all(chunk.map(async (t) => {
          try { await t.run(); } catch (e) { this.missing.push(t.label); }
          done++;
          if (onProgress) onProgress(done / total, t.label);
        }));
      }

      if (this.missing.length) {
        console.info(
          `[AssetLoader] ไม่พบไฟล์ Asset ${this.missing.length} รายการ — ` +
          'เกมจะใช้ภาพ/เสียง Placeholder ที่สร้างด้วยโค้ดแทน\n' +
          'เพิ่มไฟล์จริงลงใน /assets แล้วประกาศ path ใน src/config/assets.js ได้ทันที\n' +
          'รายการที่ยังไม่มี: ' + this.missing.join(', ')
        );
      }
      return { loaded: total - this.missing.length, total, missing: this.missing.slice() };
    },

    img(key) { return this.images[key] || null; },
    sprite(key) { return this.sprites[key] || null; },
    has(key) { return !!(this.images[key] || this.sprites[key] || this.audio[key]); }
  };

  CR.AssetLoader = AssetLoader;
})(window);

/* =========================================================
   src/dataLoader.js
   ---------------------------------------------------------
   โหลดไฟล์ข้อมูล JSON ใน /data
   - ถ้าเปิดผ่าน http:// (Live Server) จะ fetch ไฟล์ .json ตัวจริง
     => แก้ไฟล์ JSON แล้วรีเฟรชเห็นผลทันที
   - ถ้าเปิดผ่าน file:// (ดับเบิลคลิก index.html) เบราว์เซอร์จะบล็อก fetch
     => ใช้ข้อมูลสำรองจาก data/data-bundle.js แทนโดยอัตโนมัติ
     (สร้างใหม่ด้วยคำสั่ง: node tools/bundle-data.mjs)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  const FILES = {
    questions: 'data/questions.json',
    levels: 'data/levels.json',
    settings: 'data/settings.json'
  };

  const DataLoader = {
    /** แหล่งที่มาของข้อมูลล่าสุด: 'json' | 'bundle' */
    source: 'unknown',

    async loadAll(onProgress) {
      const keys = Object.keys(FILES);
      const out = {};
      let done = 0;
      let usedFallback = false;

      for (const key of keys) {
        let data = null;
        try {
          data = await this.fetchJson(FILES[key]);
        } catch (err) {
          data = this.fromBundle(key);
          usedFallback = true;
          if (!data) {
            console.error(`[DataLoader] โหลด ${key} ไม่สำเร็จ และไม่มีข้อมูลสำรอง`, err);
          }
        }
        out[key] = data;
        done++;
        if (onProgress) onProgress(done / keys.length, key);
      }

      this.source = usedFallback ? 'bundle' : 'json';
      if (usedFallback) {
        console.info('[DataLoader] ใช้ข้อมูลสำรองจาก data-bundle.js (เปิดผ่าน file://). ' +
          'ถ้าต้องการแก้ไฟล์ JSON แล้วเห็นผลทันที ให้เปิดเกมผ่าน Local Server');
      }
      return out;
    },

    async fetchJson(path) {
      // fetch() บน file:// จะโยน TypeError เสมอ — ข้ามไปใช้ bundle เลยเพื่อความเร็ว
      if (location.protocol === 'file:') throw new Error('file-protocol');
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} @ ${path}`);
      return res.json();
    },

    fromBundle(key) {
      const bundle = global.CR_DATA;
      if (bundle && bundle[key]) return CR.U.deepClone(bundle[key]);
      return null;
    }
  };

  CR.DataLoader = DataLoader;
})(window);

/* =========================================================
   src/cloud.js
   ---------------------------------------------------------
   ชั้นเชื่อมต่อ Google Sheets (ผ่าน Apps Script Web App)

   หลักการสำคัญ — OFFLINE FIRST
     คะแนนจะถูกบันทึกลง LocalStorage "ก่อนเสมอ" แล้วจึงส่งขึ้นคลาวด์
     ถ้าส่งไม่สำเร็จ (เน็ตล่ม / เซิร์ฟเวอร์ช้า) ผลจะเข้าคิวรอส่งใหม่
     อัตโนมัติเมื่อเน็ตกลับมา จึงไม่มีทางที่คะแนนนักเรียนจะหาย

   เรื่อง CORS
     Apps Script ไม่รองรับ preflight (OPTIONS) จึงต้องส่ง POST ด้วย
     Content-Type: text/plain แล้วแนบ JSON เป็นข้อความ วิธีนี้เบราว์เซอร์
     ถือเป็น "simple request" ไม่ต้อง preflight
     ส่วน GET ถ้า fetch ติดปัญหา CORS จะสลับไปใช้ JSONP ให้อัตโนมัติ
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  const QUEUE_KEY = 'cyberrunner.cloud.queue.v1';
  const ROSTER_KEY = 'cyberrunner.cloud.roster.v1';

  const Cloud = {
    /** 'off' = ไม่ได้ตั้งค่า | 'online' | 'offline' (ตั้งค่าแล้วแต่ติดต่อไม่ได้) */
    status: 'off',
    lastError: '',

    get cfg() { return CR.CLOUD || {}; },
    get enabled() { return !!(this.cfg.ENDPOINT && String(this.cfg.ENDPOINT).trim()); },

    /* ================= HTTP ================= */

    _url(params) {
      const u = new URL(this.cfg.ENDPOINT);
      Object.keys(params || {}).forEach((k) => u.searchParams.set(k, params[k]));
      return u.toString();
    },

    /** อ่านข้อมูล — ลอง fetch ก่อน ถ้าติด CORS ค่อยใช้ JSONP */
    async get(params) {
      if (!this.enabled) throw new Error('ยังไม่ได้ตั้งค่า ENDPOINT ใน src/config/cloud.js');
      try {
        const res = await this._withTimeout(fetch(this._url(params), {
          method: 'GET',
          redirect: 'follow'
        }));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        this.status = 'online';
        return data;
      } catch (err) {
        // เผื่อกรณีเบราว์เซอร์บล็อก CORS ของ Apps Script
        try {
          const data = await this._jsonp(params);
          this.status = 'online';
          return data;
        } catch (err2) {
          this.status = 'offline';
          this.lastError = String(err2.message || err2);
          throw err2;
        }
      }
    },

    /**
     * เขียนข้อมูล — Apps Script ถูกเบราว์เซอร์บล็อก CORS บ่อย
     * จึงลอง JSONP ก่อน แล้วค่อย POST แบบ no-cors ซึ่งส่งถึงชีตได้แม้จะอ่านคำตอบไม่ได้
     */
    async post(action, payload) {
      if (!this.enabled) throw new Error('ยังไม่ได้ตั้งค่า ENDPOINT ใน src/config/cloud.js');
      const packet = {
        action,
        key: this.cfg.TEACHER_KEY,
        event: this.cfg.EVENT,
        data: payload
      };

      try {
        const data = await this._jsonp({
          action,
          key: packet.key,
          event: packet.event,
          payload: JSON.stringify(payload || {})
        });
        if (data && data.ok === false) throw new Error(data.error || 'เซิร์ฟเวอร์ปฏิเสธคำขอ');
        const confirmed = data && data.ok === true && (
          (action === 'submitResult' && data.resultId) ||
          (action === 'addStudents' && typeof data.added === 'number') ||
          (action === 'removeStudent' && typeof data.removed === 'number')
        );
        if (confirmed) {
          this.status = 'online';
          return data;
        }
      } catch (err) {
        this.lastError = String(err.message || err);
      }

      try {
        const res = await this._withTimeout(fetch(this.cfg.ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(packet),
          redirect: 'follow'
        }));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (data && data.ok === false) throw new Error(data.error || 'เซิร์ฟเวอร์ปฏิเสธคำขอ');
        this.status = 'online';
        return data;
      } catch (err) {
        this.lastError = String(err.message || err);
      }

      await this._withTimeout(fetch(this.cfg.ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(packet)
      }));
      this.status = 'online';
      return { ok: true, via: 'no-cors' };
    },

    _withTimeout(promise) {
      const ms = this.cfg.TIMEOUT_MS || 12000;
      return Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error('หมดเวลารอเซิร์ฟเวอร์')), ms))
      ]);
    },

    _jsonp(params) {
      return new Promise((resolve, reject) => {
        const cbName = '__crJsonp' + Date.now() + Math.floor(Math.random() * 1e4);
        const s = document.createElement('script');
        const timer = setTimeout(() => { cleanup(); reject(new Error('JSONP หมดเวลา')); },
          this.cfg.TIMEOUT_MS || 12000);
        function cleanup() {
          clearTimeout(timer);
          delete global[cbName];
          if (s.parentNode) s.parentNode.removeChild(s);
        }
        global[cbName] = (data) => { cleanup(); resolve(data); };
        s.onerror = () => { cleanup(); reject(new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้')); };
        s.src = this._url(Object.assign({}, params, { callback: cbName }));
        document.head.appendChild(s);
      });
    },

    /* ================= รายชื่อนักเรียน ================= */

    /** รายชื่อที่แคชไว้ในเครื่อง (ใช้ตอนออฟไลน์) */
    cachedRoster() {
      try {
        const raw = localStorage.getItem(ROSTER_KEY);
        const obj = raw ? JSON.parse(raw) : null;
        return obj && Array.isArray(obj.students) ? obj : null;
      } catch (e) { return null; }
    },

    _cacheRoster(students) {
      if (!this.cfg.CACHE_ROSTER) return;
      try {
        localStorage.setItem(ROSTER_KEY, JSON.stringify({ students, at: Date.now() }));
      } catch (e) { /* พื้นที่เต็ม — ไม่เป็นไร */ }
    },

    /**
     * ดึงรายชื่อนักเรียน
     * คืนค่า { students, source } โดย source = 'cloud' | 'cache' | 'file' | 'none'
     */
    async fetchRoster() {
      if (this.enabled) {
        try {
          const res = await this.get({ action: 'roster' });
          const students = (res && res.students) || [];
          this._cacheRoster(students);
          return { students, source: 'cloud' };
        } catch (e) {
          const c = this.cachedRoster();
          if (c) return { students: c.students, source: 'cache', at: c.at };
        }
      } else {
        const c = this.cachedRoster();
        if (c) return { students: c.students, source: 'cache', at: c.at };
      }
      // สำรองสุดท้าย: ไฟล์รายชื่อในโปรเจกต์ (ใช้ได้แม้ไม่มีอินเทอร์เน็ตเลย)
      try {
        const local = await CR.DataLoader.fetchJson('data/students.json');
        const students = (local && local.students) || [];
        if (students.length) return { students, source: 'file' };
      } catch (e) { /* ไม่มีไฟล์ก็ไม่เป็นไร */ }
      return { students: [], source: 'none' };
    },

    async addStudents(students) {
      return this.post('addStudents', { students });
    },

    async removeStudent(studentId) {
      return this.post('removeStudent', { studentId });
    },

    /* ================= ผลการเล่น ================= */

    /**
     * ส่งผลการเล่น 1 รายการ — ถ้าส่งไม่สำเร็จจะเข้าคิวไว้ส่งใหม่
     * @returns {Promise<{sent:boolean, queued:boolean, error?:string}>}
     */
    async submitResult(result) {
      if (!this.enabled) return { sent: false, queued: false };
      try {
        await this.post('submitResult', result);
        return { sent: true, queued: false };
      } catch (e) {
        this._enqueue(result);
        this.status = 'offline';
        this.lastError = String(e.message || e);
        return { sent: false, queued: true, error: this.lastError };
      }
    },

    async fetchResults() {
      const res = await this.get({ action: 'results' });
      return (res && res.results) || [];
    },

    async fetchAll() {
      const res = await this.get({ action: 'all' });
      return {
        students: (res && res.students) || [],
        results: (res && res.results) || []
      };
    },

    /* ================= คิวรอส่ง ================= */

    queue() {
      try {
        const raw = localStorage.getItem(QUEUE_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) { return []; }
    },

    get pendingCount() { return this.queue().length; },

    _saveQueue(list) {
      try { localStorage.setItem(QUEUE_KEY, JSON.stringify(list)); }
      catch (e) { /* ไม่เป็นไร */ }
    },

    _enqueue(result) {
      const q = this.queue();
      q.push({ result, tries: 0, at: Date.now() });
      this._saveQueue(q);
    },

    /**
     * พยายามส่งผลที่ค้างในคิวทั้งหมด
     * @returns {Promise<{sent:number, left:number}>}
     */
    async flushQueue() {
      if (!this.enabled) return { sent: 0, left: 0 };
      const q = this.queue();
      if (!q.length) return { sent: 0, left: 0 };

      const left = [];
      let sent = 0;
      for (const item of q) {
        try {
          await this.post('submitResult', item.result);
          sent++;
        } catch (e) {
          item.tries = (item.tries || 0) + 1;
          left.push(item);
        }
      }
      this._saveQueue(left);
      return { sent, left: left.length };
    },

    /** เริ่มระบบ — ลองส่งของค้างเมื่อเน็ตกลับมา */
    init() {
      if (!this.enabled) { this.status = 'off'; return; }
      this.status = 'offline';
      const tryFlush = () => {
        this.flushQueue().then((r) => {
          if (r.sent > 0 && CR.UI && CR.UI.toast) {
            CR.UI.toast(`☁ ส่งคะแนนที่ค้างขึ้นระบบแล้ว ${r.sent} รายการ`, 'good', 3600);
          }
        }).catch(() => { /* เงียบไว้ ไม่รบกวนผู้เล่น */ });
      };
      global.addEventListener('online', tryFlush);
      setTimeout(tryFlush, 2500);
    }
  };

  CR.Cloud = Cloud;
})(window);

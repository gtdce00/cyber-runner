/* =========================================================
   src/utils.js — ฟังก์ชันช่วยเหลือทั่วไป
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  const U = {
    /* ---------- DOM ---------- */
    $(sel, root) { return (root || document).querySelector(sel); },
    $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },
    on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); },
    show(el) { if (el) el.classList.remove('hidden'); },
    hide(el) { if (el) el.classList.add('hidden'); },
    toggle(el, cond) { if (el) el.classList.toggle('hidden', !cond); },
    setText(el, txt) { if (el) el.textContent = txt; },

    /* ---------- Math ---------- */
    clamp(v, min, max) { return v < min ? min : (v > max ? max : v); },
    lerp(a, b, t) { return a + (b - a) * t; },
    /** เข้าใกล้ค่าเป้าหมายแบบไม่ขึ้นกับ framerate */
    damp(a, b, lambda, dt) { return U.lerp(a, b, 1 - Math.exp(-lambda * dt)); },
    rand(min, max) { return min + Math.random() * (max - min); },
    randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

    /** สับไพ่แบบ Fisher-Yates (คืนอาร์เรย์ใหม่) */
    shuffle(arr, rng) {
      const a = arr.slice();
      const r = rng || Math.random;
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },

    /**
     * Seeded RNG (mulberry32) — ทำให้ด่านเดิมมีหน้าตาเหมือนเดิมทุกครั้ง
     * ใช้กับการสร้างด่านแบบ Procedural เพื่อความยุติธรรมในการแข่งขัน
     */
    makeRng(seed) {
      let s = seed >>> 0 || 1;
      return function () {
        s |= 0; s = (s + 0x6D2B79F5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    hashString(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    },

    /* ---------- Format ---------- */
    /** วินาที -> MM:SS */
    formatTime(sec) {
      sec = Math.max(0, Math.ceil(sec));
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    },

    /** เติมศูนย์ข้างหน้าให้ตัวเลขคะแนน */
    padScore(n, len) {
      const neg = n < 0;
      const s = String(Math.abs(Math.round(n))).padStart(len || 6, '0');
      return (neg ? '-' : '') + s;
    },

    formatDateTH(ts) {
      const d = new Date(ts);
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    /* ---------- Canvas text ---------- */
    /** ตัดข้อความให้พอดีความกว้าง คืนค่าเป็นอาร์เรย์ของบรรทัด (รองรับภาษาไทยแบบไม่มีเว้นวรรค) */
    wrapText(ctx, text, maxWidth, maxLines) {
      const words = String(text).split(/(\s+)/);
      const lines = [];
      let line = '';
      const pushLine = (l) => { if (l.trim() !== '') lines.push(l.trim()); };

      for (const w of words) {
        const test = line + w;
        if (ctx.measureText(test).width > maxWidth && line !== '') {
          pushLine(line);
          line = w.trim() === '' ? '' : w;
        } else {
          line = test;
        }
        // คำเดี่ยวยาวเกิน (พบบ่อยในภาษาไทย) -> ตัดทีละอักขระ
        while (ctx.measureText(line).width > maxWidth && line.length > 1) {
          let cut = line.length - 1;
          while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxWidth) cut--;
          pushLine(line.slice(0, cut));
          line = line.slice(cut);
        }
      }
      pushLine(line);
      if (maxLines && lines.length > maxLines) {
        const out = lines.slice(0, maxLines);
        out[maxLines - 1] = out[maxLines - 1].replace(/.{2}$/, '…');
        return out;
      }
      return lines;
    },

    /** สี่เหลี่ยมมุมมน (รองรับเบราว์เซอร์ที่ไม่มี ctx.roundRect) */
    roundRect(ctx, x, y, w, h, r) {
      const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x, y, w, h, rr); return; }
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    },

    /* ---------- Misc ---------- */
    deepClone(obj) {
      if (typeof structuredClone === 'function') {
        try { return structuredClone(obj); } catch (e) { /* fallthrough */ }
      }
      return JSON.parse(JSON.stringify(obj));
    },

    /** รวมค่าเริ่มต้นกับค่าที่ผู้ใช้กำหนด (1 ระดับลึก + nested object) */
    mergeDefaults(defaults, override) {
      const out = U.deepClone(defaults);
      if (!override) return out;
      for (const k of Object.keys(override)) {
        const v = override[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
          out[k] = U.mergeDefaults(out[k], v);
        } else if (v !== undefined) {
          out[k] = v;
        }
      }
      return out;
    },

    escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
      ));
    }
  };

  CR.U = U;
})(window);

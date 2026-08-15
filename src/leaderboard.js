/* =========================================================
   src/leaderboard.js
   ---------------------------------------------------------
   กระดานคะแนนแบบ LocalStorage

   การจัดอันดับ: คะแนนมาก -> น้อย
   ถ้าคะแนนเท่ากันตัดสินตามลำดับ:
     1) ใช้เวลาน้อยกว่า
     2) ตอบถูกมากกว่า
     3) ผ่านด่านมากกว่า
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const KEY = 'cyberrunner.leaderboard.v1';
  const MAX_ENTRIES = 500;

  const Leaderboard = {
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        console.warn('[Leaderboard] อ่านข้อมูลไม่สำเร็จ', e);
        return [];
      }
    },

    saveAll(list) {
      try {
        localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
        return true;
      } catch (e) {
        console.warn('[Leaderboard] บันทึกไม่สำเร็จ', e);
        return false;
      }
    },

    /**
     * บันทึกผลการแข่งขัน 1 รายการ
     * @returns {{entry:object, position:number, list:Array}}
     */
    add(entry) {
      const list = this.load();
      const rec = {
        id: 'r' + Date.now() + '-' + Math.floor(Math.random() * 1e4),
        name: entry.name || 'ผู้เล่นนิรนาม',
        grade: entry.grade || '-',
        room: entry.room || '',
        team: entry.team || '',
        score: Math.round(entry.score || 0),
        timeUsed: Math.round(entry.timeUsed || 0),
        levels: entry.levels || 0,
        correct: entry.correct || 0,
        wrong: entry.wrong || 0,
        coins: entry.coins || 0,
        bestCombo: entry.bestCombo || 0,
        rank: entry.rank || '-',
        difficulty: entry.difficulty || '-',
        date: Date.now()
      };
      list.push(rec);
      const sorted = this.sort(list);
      this.saveAll(sorted);
      return {
        entry: rec,
        position: sorted.findIndex((r) => r.id === rec.id) + 1,
        list: sorted
      };
    },

    sort(list) {
      return list.slice().sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.timeUsed !== b.timeUsed) return a.timeUsed - b.timeUsed;
        if (b.correct !== a.correct) return b.correct - a.correct;
        if (b.levels !== a.levels) return b.levels - a.levels;
        return a.date - b.date;
      });
    },

    top(n) { return this.sort(this.load()).slice(0, n || 50); },

    clear() {
      try { localStorage.removeItem(KEY); return true; }
      catch (e) { return false; }
    },

    /** ส่งออกเป็น CSV (เปิดใน Excel ได้ — ใส่ BOM เพื่อให้อ่านภาษาไทยถูกต้อง) */
    toCsv() {
      const rows = this.sort(this.load());
      const head = ['อันดับ', 'ชื่อ-นามสกุล', 'ชั้น', 'ห้อง', 'ทีม', 'คะแนน', 'เกรด',
        'ด่านที่ผ่าน', 'ตอบถูก', 'ตอบผิด', 'เหรียญ', 'คอมโบสูงสุด', 'เวลาที่ใช้(วินาที)', 'ระดับความยาก', 'วันที่'];
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const lines = [head.map(esc).join(',')];
      rows.forEach((r, i) => {
        lines.push([
          i + 1, r.name, r.grade, r.room, r.team, r.score, r.rank,
          r.levels, r.correct, r.wrong, r.coins, r.bestCombo,
          r.timeUsed, r.difficulty, U.formatDateTH(r.date)
        ].map(esc).join(','));
      });
      return '\uFEFF' + lines.join('\r\n');
    },

    downloadCsv() {
      const blob = new Blob([this.toCsv()], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const d = new Date();
      a.href = url;
      a.download = `cyber-runner-leaderboard-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
  };

  CR.Leaderboard = Leaderboard;
})(window);

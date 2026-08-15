/* =========================================================
   src/question.js
   ---------------------------------------------------------
   Question Bank + Answer Zone
   - แยกคลังคำถาม (data/questions.json) ออกจาก Game Engine อย่างสมบูรณ์
   - สุ่มคำถามตามด่าน + ระดับความยาก
   - ห้ามถามซ้ำภายในรอบการแข่งขันเดียวกัน
   - สลับตำแหน่งตัวเลือก A/B/C/D ทุกครั้ง (กันการจำตำแหน่งคำตอบ)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const QuestionBank = {
    all: [],
    usedIds: new Set(),

    load(data) {
      const list = Array.isArray(data) ? data : (data && data.questions) || [];
      this.all = list.filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
      if (!this.all.length) console.error('[QuestionBank] ไม่พบคำถามในคลัง!');
      return this.all.length;
    },

    /** เริ่มรอบแข่งขันใหม่ — ล้างประวัติคำถามที่เคยถาม */
    resetSession() { this.usedIds.clear(); },

    countForLevel(level) { return this.all.filter((q) => q.level === level).length; },

    /**
     * สุ่มคำถาม 1 ข้อ
     * ลำดับการค้นหา:
     *   1) ด่านนี้ + ความยากที่ต้องการ + ยังไม่เคยถาม
     *   2) ด่านนี้ + ความยากใกล้เคียง + ยังไม่เคยถาม
     *   3) ด่านนี้ (ความยากใดก็ได้) + ยังไม่เคยถาม
     *   4) ด่านใดก็ได้ + ยังไม่เคยถาม
     *   5) ยอมถามซ้ำ (กรณีคลังคำถามหมดจริง ๆ)
     */
    pick(level, difficulty) {
      const pool = CR.Settings.difficultyPool(difficulty);
      const inLevel = this.all.filter((q) => q.level === level);

      const tries = [
        () => inLevel.filter((q) => q.difficulty === pool[0] && !this.usedIds.has(q.id)),
        () => inLevel.filter((q) => pool.includes(q.difficulty) && !this.usedIds.has(q.id)),
        () => inLevel.filter((q) => !this.usedIds.has(q.id)),
        () => this.all.filter((q) => !this.usedIds.has(q.id) && pool.includes(q.difficulty)),
        () => this.all.filter((q) => !this.usedIds.has(q.id)),
        () => inLevel.length ? inLevel : this.all
      ];

      for (const t of tries) {
        const cand = t();
        if (cand && cand.length) {
          const q = U.pick(cand);
          this.usedIds.add(q.id);
          return this.prepare(q);
        }
      }
      return null;
    },

    /** สลับตำแหน่งตัวเลือกและคำนวณ index ของคำตอบที่ถูกใหม่ */
    prepare(q) {
      const pairs = q.options.map((text, i) => ({ text, correct: i === q.correctAnswer }));
      const shuffled = U.shuffle(pairs);
      return {
        id: q.id,
        level: q.level,
        question: q.question,
        options: shuffled.map((p) => p.text),
        correctAnswer: shuffled.findIndex((p) => p.correct),
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'normal',
        category: q.category || 'general',
        image: q.image || null,
        hint: q.hint || ''
      };
    }
  };

  /* =========================================================
     ANSWER ZONE — ผูกคำถามเข้ากับป้ายในโลกเกม
     ========================================================= */
  const AnswerZone = {
    /** สร้างป้าย A/B/C/D ในโซน */
    attach(zone, question) {
      zone.question = question;
      zone.signs = question.options.slice(0, 4).map((text, i) => {
        const slot = zone.slots[i] || zone.slots[zone.slots.length - 1];
        return {
          index: i,
          text,
          x: slot.x, y: slot.y, w: slot.w, h: slot.h,
          near: false,
          state: null      // null | 'correct' | 'wrong'
        };
      });
      zone.state = 'active';
      zone.answeredCorrect = null;
    },

    /** ป้ายที่ผู้เล่นชนอยู่ (ถ้ามี) */
    hitTest(zone, player) {
      if (zone.state !== 'active') return -1;
      for (const s of zone.signs) {
        if (CR.Collision.aabb(player, s)) return s.index;
      }
      return -1;
    },

    /** อัปเดตสถานะ "อยู่ใกล้" เพื่อไฮไลต์ป้าย */
    updateProximity(zone, player) {
      if (zone.state !== 'active') return -1;
      let nearest = -1, best = 210;
      for (const s of zone.signs) {
        const d = CR.Collision.centerDistance(player, s);
        s.near = false;
        if (d < best) { best = d; nearest = s.index; }
      }
      if (nearest >= 0) zone.signs[nearest].near = true;
      return nearest;
    },

    /** เฉลย: ทำเครื่องหมายป้ายถูก/ผิด แล้วปลดกำแพง */
    resolve(zone, chosenIndex) {
      const q = zone.question;
      const correct = chosenIndex === q.correctAnswer;
      for (const s of zone.signs) {
        if (s.index === q.correctAnswer) s.state = 'correct';
        else if (s.index === chosenIndex) s.state = 'wrong';
      }
      zone.state = 'answered';
      zone.answeredCorrect = correct;
      zone.gate.answered = true;
      zone.barrier.disabled = true;
      return {
        correct,
        chosenIndex,
        correctIndex: q.correctAnswer,
        correctText: q.options[q.correctAnswer],
        explanation: q.explanation
      };
    }
  };

  CR.QuestionBank = QuestionBank;
  CR.AnswerZone = AnswerZone;
})(window);

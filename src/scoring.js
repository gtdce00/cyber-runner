/* =========================================================
   src/scoring.js
   ---------------------------------------------------------
   ระบบคะแนน — ค่าคะแนนทุกตัวมาจาก Settings
   (แก้ได้จากหน้า Admin โดยไม่ต้องแตะโค้ดหลัก)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  class Scoring {
    constructor(settings) {
      this.cfg = settings.score;
      this.reset();
    }

    reset() {
      this.score = 0;
      this.correct = 0;
      this.wrong = 0;
      this.coins = 0;
      this.levelsCleared = 0;
      this.bonuses = 0;
      this.combo = 0;
      this.bestCombo = 0;
      this.history = [];
      /** สถิติแยกตามหมวดความรู้ — ใช้หาจุดอ่อนรายบุคคลใน Dashboard */
      this.categories = Object.create(null);
      /** บันทึกทุกข้อที่ตอบ เพื่อดูว่าข้อไหนคนตอบผิดเยอะ */
      this.answers = [];
    }

    /** นับผลตอบรายหมวด (เรียกจาก answerCorrect / answerWrong) */
    _tally(question, isCorrect) {
      if (!question) return;
      const cat = question.category || 'general';
      const c = (this.categories[cat] = this.categories[cat] || { correct: 0, wrong: 0 });
      if (isCorrect) c.correct++; else c.wrong++;
      this.answers.push({
        qid: question.id,
        level: question.level,
        category: cat,
        difficulty: question.difficulty || 'normal',
        correct: !!isCorrect
      });
    }

    /** ปรับค่าคะแนน (เรียกเมื่อผู้ดูแลกด Save Settings) */
    applyConfig(settings) { this.cfg = settings.score; }

    _add(amount, label) {
      this.score += amount;
      if (!this.cfg.allowNegative && this.score < 0) this.score = 0;
      this.history.push({ label, amount, at: Date.now() });
      return amount;
    }

    /**
     * ตอบถูก — ได้คะแนนพื้นฐาน + โบนัสคอมโบ
     * @returns {{total:number, base:number, comboBonus:number, combo:number}}
     */
    answerCorrect(question) {
      this.correct++;
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      this._tally(question, true);

      const base = this.cfg.correct;
      const steps = Math.min(this.combo - 1, this.cfg.comboMax);
      const comboBonus = steps > 0 ? steps * this.cfg.comboStep : 0;

      this._add(base + comboBonus, 'correct');
      return { total: base + comboBonus, base, comboBonus, combo: this.combo };
    }

    /** ตอบผิด — หักคะแนน แต่ไม่ลดพลังชีวิต ไม่จบเกม */
    answerWrong(question) {
      this.wrong++;
      this.combo = 0;
      this._tally(question, false);
      const before = this.score;
      this._add(this.cfg.wrong, 'wrong');
      return { total: this.score - before };
    }

    collectCoin() {
      this.coins++;
      return this._add(this.cfg.coin, 'coin');
    }

    clearLevel() {
      this.levelsCleared++;
      return this._add(this.cfg.levelClear, 'levelClear');
    }

    /** ภารกิจพิเศษ เช่น ตอบถูกทุกข้อในด่าน / เก็บเหรียญครบ */
    specialBonus(reason) {
      this.bonuses++;
      return this._add(this.cfg.bonus, reason || 'bonus');
    }

    get accuracy() {
      const total = this.correct + this.wrong;
      return total ? Math.round((this.correct / total) * 100) : 0;
    }

    /** จัดอันดับ S/A/B/C/D จากคะแนนและความแม่นยำ */
    rank(totalQuestionsPossible) {
      const acc = this.accuracy;
      const answered = this.correct + this.wrong;
      const coverage = totalQuestionsPossible ? answered / totalQuestionsPossible : 0;
      const value = acc * 0.62 + coverage * 100 * 0.38;

      if (answered === 0) return { letter: 'D', msg: 'ยังไม่ได้ตอบคำถามเลย ลองใหม่อีกครั้งนะ!' };
      if (value >= 88 && acc >= 85) return { letter: 'S', msg: 'สุดยอดมาก! เซียนคอมพิวเตอร์ตัวจริง' };
      if (value >= 72) return { letter: 'A', msg: 'เยี่ยมมาก! ความรู้แน่นและวิ่งได้ไกล' };
      if (value >= 55) return { letter: 'B', msg: 'ดีมาก! อีกนิดเดียวก็ถึงระดับ A แล้ว' };
      if (value >= 35) return { letter: 'C', msg: 'ผ่านเกณฑ์! ทบทวนอีกหน่อยจะเก่งขึ้นแน่นอน' };
      return { letter: 'D', msg: 'ไม่เป็นไร! ลองอ่านคำอธิบายแล้วเล่นใหม่อีกครั้ง' };
    }

    snapshot() {
      return {
        score: this.score,
        correct: this.correct,
        wrong: this.wrong,
        coins: this.coins,
        levelsCleared: this.levelsCleared,
        bestCombo: this.bestCombo,
        accuracy: this.accuracy,
        categories: this.categories,
        answers: this.answers
      };
    }
  }

  CR.Scoring = Scoring;
})(window);

/* =========================================================
   src/main.js — จุดเริ่มต้นของโปรแกรม (Bootstrap)
   ลำดับการทำงาน:
     1) เตรียม UI
     2) โหลดข้อมูล (questions / levels / settings)
     3) ตั้งค่าระบบต่าง ๆ
     4) Preload Asset ทั้งหมด
     5) เข้าสู่หน้าเมนูหลัก
   ========================================================= */
(function (global) {
  'use strict';
  const CR = global.CR;
  const U = CR.U;

  let game = null;
  let lastProfile = null;

  const handlers = {
    startGame(profile) {
      lastProfile = profile;
      if (CR.Cloud && CR.Cloud.enabled) {
        CR.Cloud.addStudents([{
          name: profile.name,
          grade: profile.grade,
          room: profile.room,
          team: profile.team
        }]).catch(() => { /* ถ้าเน็ตล่ม ยังเล่นได้ คะแนนจะถูกส่งตอนจบเกม */ });
      }
      game.start(profile);
    },
    replay() {
      if (!lastProfile) { CR.UI.openProfile(); return; }
      game.start(lastProfile);
    },
    goHome() {
      if (game) game.quitToMenu();
      else CR.UI.show('home');
    },
    pause() { game && game.pause(); },
    resume() { game && game.resume(); },
    restartLevel() { game && game.restartLevel(); },
    quit() { game && game.endGame('ผู้เข้าแข่งขันจบการแข่งขันเอง'); },
    settingsChanged(s) {
      if (game && game.scoring) game.scoring.applyConfig(s);
      if (game) game.resize();
    }
  };

  async function boot() {
    const canvas = document.getElementById('game-canvas');
    CR.UI.init(handlers);
    CR.UI.setLoading(0.03, 'กำลังโหลดข้อมูลคำถาม…');

    /* ---------- 1) ข้อมูล ---------- */
    let data = { questions: null, levels: null, settings: null };
    try {
      data = await CR.DataLoader.loadAll((r, key) => {
        CR.UI.setLoading(0.03 + r * 0.22, `กำลังโหลดข้อมูล: ${key}`);
      });
    } catch (err) {
      console.error('[main] โหลดข้อมูลไม่สำเร็จ', err);
    }

    /* ---------- 2) การตั้งค่า ---------- */
    CR.Settings.init(data.settings);

    /* ---------- 3) คลังคำถาม ---------- */
    const qCount = CR.QuestionBank.load(data.questions);
    CR.UI.setLoading(0.3, `พร้อมใช้งานคำถาม ${qCount} ข้อ`);
    if (!qCount) {
      CR.UI.setLoading(1, '⚠ ไม่พบคลังคำถาม — โปรดเปิดเกมผ่าน Local Server (ดูวิธีใน README)');
      return;
    }

    /* ---------- 4) นิยามด่าน ---------- */
    let levelDefs = (data.levels && (data.levels.levels || data.levels)) || null;
    if (!Array.isArray(levelDefs) || !levelDefs.length) {
      console.warn('[main] ใช้ค่าด่านสำรอง เพราะโหลด levels.json ไม่ได้');
      levelDefs = CR.LevelBuilder.fallbackDefs();
    }

    /* ---------- 5) Asset ---------- */
    const report = await CR.AssetLoader.loadAll((r, label) => {
      CR.UI.setLoading(0.3 + r * 0.65, `กำลังเตรียมภาพและเสียง… (${label})`);
    });

    /* ---------- 6) ระบบเสียง + การควบคุม + คลาวด์ ---------- */
    CR.Sound.init(CR.Settings.get());
    CR.Input.init();
    if (CR.Cloud) CR.Cloud.init();

    /* ---------- 7) สร้างเกม ---------- */
    game = new CR.Game(canvas);
    game.setLevelDefs(levelDefs);
    CR.game = game;   // เผื่อไว้ debug ผ่าน console

    CR.UI.setLoading(1, report.loaded > 0
      ? `พร้อมแล้ว! (Asset ${report.loaded}/${report.total})`
      : 'พร้อมแล้ว! (ใช้ภาพและเสียง Placeholder ที่สร้างด้วยโค้ด)');

    setTimeout(() => CR.UI.show('home'), 350);

    /* ---------- 8) หยุดเกมอัตโนมัติเมื่อสลับแท็บ ---------- */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game && game.state === 'playing') game.pause();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);

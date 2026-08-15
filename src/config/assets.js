/* =========================================================
   src/config/assets.js
   ---------------------------------------------------------
   ศูนย์กลางของ Asset ทั้งหมดในเกม (Single Source of Truth)

   วิธีเพิ่ม Asset ใหม่:
     1) วางไฟล์ลงในโฟลเดอร์ /assets/... ตามหมวดหมู่
     2) เพิ่ม key + path ในออบเจ็กต์ด้านล่าง
     3) รีเฟรชหน้าเว็บ — เกมจะโหลดให้อัตโนมัติ

   * ทุก Asset เป็น OPTIONAL *
   ถ้าไฟล์ไม่มีอยู่จริง เกมจะไม่ error แต่จะวาดภาพ Placeholder
   แบบ Procedural (วาดด้วยโค้ด) ให้แทน จึงเล่นได้ทันทีตั้งแต่วันแรก
   ========================================================= */
(function (global) {
  'use strict';

  const CR = (global.CR = global.CR || {});

  /* ---------------------------------------------------------
     1) รูปภาพเดี่ยว (Static images)
     รองรับ .png .jpg .jpeg .webp .svg .gif
     --------------------------------------------------------- */
  const ASSETS = {
    // ----- ตัวละคร -----
    player:            'assets/characters/player.png',

    // ----- ฉากหลัง (1 ภาพต่อ 1 โลก) -----
    // โลกที่ 1: Computer World (ด่าน 1-3)
    bgComputer:        'assets/backgrounds/world-computer.png',
    // โลกที่ 2: Cyber / Logic World (ด่าน 4-6)
    bgCyber:           'assets/backgrounds/world-cyber.png',
    // โลกที่ 3: Coding World (ด่าน 7-9)
    bgCoding:          'assets/backgrounds/world-coding.png',
    // โลกที่ 4: Network / Digital World (ด่าน 10-12)
    bgNetwork:         'assets/backgrounds/world-network.png',
    // โลกที่ 5: AI / Future World (ด่าน 13-14)
    bgAI:              'assets/backgrounds/world-ai.png',
    // โลกที่ 6: Boss Arena (ด่าน 15)
    bgBoss:            'assets/backgrounds/world-boss.png',

    // ----- พื้น / แพลตฟอร์ม -----
    tileGround:        'assets/tiles/ground.png',
    tilePlatform:      'assets/tiles/platform.png',

    // ----- วัตถุในฉาก -----
    coin:              'assets/items/coin.png',
    checkpoint:        'assets/objects/checkpoint.png',
    portal:            'assets/objects/portal.png',
    questionGate:      'assets/objects/question-gate.png',
    answerSign:        'assets/objects/answer-sign.png',
    barrier:           'assets/objects/barrier.png',
    finishFlag:        'assets/objects/finish.png',
    spike:             'assets/objects/spike.png',

    // ----- ศัตรู / บอส -----
    boss:              'assets/enemies/boss.png',
    bugEnemy:          'assets/enemies/bug.png',

    // ----- เอฟเฟกต์ -----
    correctEffect:     'assets/effects/correct.png',
    wrongEffect:       'assets/effects/wrong.png',

    // ----- UI -----
    logo:              'assets/ui/logo.png'
  };

  /* ---------------------------------------------------------
     2) Sprite Sheet + Animation
     ---------------------------------------------------------
     ตัวอย่างการตั้งค่า:
       playerRun: {
         src: 'assets/characters/player-run.png',
         frameWidth: 64,      // ความกว้างของ 1 เฟรม (px)
         frameHeight: 64,     // ความสูงของ 1 เฟรม (px)
         frames: 8,           // จำนวนเฟรมทั้งหมด
         speed: 12,           // เฟรมต่อวินาที
         loop: true,          // เล่นวนหรือไม่
         row: 0               // (ถ้าชีตมีหลายแถว) แถวที่ใช้ เริ่มจาก 0
       }

     เปลี่ยนตัวละครทั้งเกมได้โดย "แก้เฉพาะไฟล์นี้" ไม่ต้องแตะ Game Engine
     --------------------------------------------------------- */
  const SPRITES = {
    playerIdle: {
      src: 'assets/characters/player-idle.png',
      frameWidth: 64, frameHeight: 64, frames: 4, speed: 6, loop: true, row: 0
    },
    playerRun: {
      src: 'assets/characters/player-run.png',
      frameWidth: 64, frameHeight: 64, frames: 8, speed: 14, loop: true, row: 0
    },
    playerJump: {
      src: 'assets/characters/player-jump.png',
      frameWidth: 64, frameHeight: 64, frames: 3, speed: 10, loop: false, row: 0
    },
    playerFall: {
      src: 'assets/characters/player-fall.png',
      frameWidth: 64, frameHeight: 64, frames: 2, speed: 8, loop: true, row: 0
    },
    playerCorrect: {
      src: 'assets/characters/player-correct.png',
      frameWidth: 64, frameHeight: 64, frames: 4, speed: 8, loop: false, row: 0
    },
    playerWrong: {
      src: 'assets/characters/player-wrong.png',
      frameWidth: 64, frameHeight: 64, frames: 4, speed: 8, loop: false, row: 0
    },
    coinSpin: {
      src: 'assets/items/coin-spin.png',
      frameWidth: 32, frameHeight: 32, frames: 6, speed: 12, loop: true, row: 0
    },
    portalSpin: {
      src: 'assets/objects/portal-spin.png',
      frameWidth: 96, frameHeight: 128, frames: 6, speed: 10, loop: true, row: 0
    },
    bossIdle: {
      src: 'assets/enemies/boss-idle.png',
      frameWidth: 192, frameHeight: 192, frames: 4, speed: 6, loop: true, row: 0
    }
  };

  /* ---------------------------------------------------------
     3) เสียง
     ---------------------------------------------------------
     ถ้าไม่มีไฟล์เสียง SoundManager จะสังเคราะห์เสียงด้วย
     Web Audio API ให้อัตโนมัติ (เกมไม่ error และมีเสียงเล่นได้)
     --------------------------------------------------------- */
  const SOUNDS = {
    jump:          'assets/sounds/jump.wav',
    coin:          'assets/sounds/coin.wav',
    correct:       'assets/sounds/correct.wav',
    wrong:         'assets/sounds/wrong.wav',
    levelComplete: 'assets/sounds/level-complete.wav',
    button:        'assets/sounds/button.wav',
    boss:          'assets/sounds/boss.wav',
    timeWarning:   'assets/sounds/time-warning.wav',
    checkpoint:    'assets/sounds/checkpoint.wav',
    hurt:          'assets/sounds/hurt.wav',
    portal:        'assets/sounds/portal.wav',
    gameOver:      'assets/sounds/game-over.wav'
  };

  const MUSIC = {
    bgm:     'assets/music/bgm.mp3',
    bgmBoss: 'assets/music/bgm-boss.mp3'
  };

  /* ---------------------------------------------------------
     4) แผนที่ธีม -> Asset ฉากหลัง
     ใช้โดย level.js / renderer.js
     --------------------------------------------------------- */
  const THEME_BACKGROUND = {
    computer: 'bgComputer',
    cyber:    'bgCyber',
    coding:   'bgCoding',
    network:  'bgNetwork',
    ai:       'bgAI',
    boss:     'bgBoss'
  };

  CR.ASSETS = ASSETS;
  CR.SPRITES = SPRITES;
  CR.SOUNDS = SOUNDS;
  CR.MUSIC = MUSIC;
  CR.THEME_BACKGROUND = THEME_BACKGROUND;
})(window);

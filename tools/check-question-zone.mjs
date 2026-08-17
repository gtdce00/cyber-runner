/* =========================================================
   tools/check-question-zone.mjs
   ---------------------------------------------------------
   ตรวจเรขาคณิตของโซนคำถามแบบไม่ต้องเปิดเบราว์เซอร์

   ตรวจว่า:
     1) วิ่งผ่านโซนได้โดยไม่ชนป้ายใดเลย  (บั๊ก "ชนข้อแรกเสมอ")
     2) ทางวิ่งใต้ป้ายโล่ง ไม่มีบล็อกทึบขวาง
     3) กระโดดถึงทุกป้าย และช่องว่างระหว่างป้ายกว้างพอให้ตัวละครลอด
     4) กระโดดข้ามกำแพงกั้นไม่ได้ (ต้องตอบก่อนจึงจะผ่าน)
     5) เหรียญทุกเหรียญเก็บได้โดยไม่ต้องพุ่งชนป้าย

   รัน:  node tools/check-question-zone.mjs
   ========================================================= */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---- โหลดโมดูลของเกมโดยจำลอง window ---- */
const win = { CR: {} };
globalThis.window = win;
for (const f of ['src/utils.js', 'src/level.js']) {
  // โมดูลเป็น IIFE ที่รับ window เข้าไป จึงรันตรงได้เลย
  new Function('window', readFileSync(join(ROOT, f), 'utf8'))(win);
}
const { LevelBuilder } = win.CR;
const { GROUND_Y, SIGN_W, SIGN_H, SIGN_Y, SIGN_GAP_X } = LevelBuilder;

/* ---- ค่าคงที่ของผู้เล่นและฟิสิกส์ (ตรงกับ src/player.js) ---- */
const P_W = 42, P_H = 56;
const GRAVITY = 2100, JUMP_V = 850, DOUBLE_V = 700;
const RISE_1 = (JUMP_V ** 2) / (2 * GRAVITY);            // กระโดดครั้งแรก
const RISE_2 = RISE_1 + (DOUBLE_V ** 2) / (2 * GRAVITY); // + กระโดดคู่

const STAND_TOP = GROUND_Y - P_H;   // ขอบบนของตัวละครขณะยืน/วิ่งบนพื้น

const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) { failed++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
  else console.log(`  ✓ ${label}${detail ? ' — ' + detail : ''}`);
};

console.log('ค่าฟิสิกส์: กระโดดเดี่ยวสูงสุด ' + RISE_1.toFixed(0) +
  'px, กระโดดคู่สูงสุด ' + RISE_2.toFixed(0) + 'px');
console.log('ป้ายคำตอบ: y=' + SIGN_Y + ' ถึง ' + (SIGN_Y + SIGN_H) +
  ' | หัวผู้เล่นขณะวิ่งอยู่ที่ y=' + STAND_TOP + '\n');

const defs = LevelBuilder.fallbackDefs();
for (const idx of [0, 7, 14]) {
  const lvl = LevelBuilder.build(defs[idx], idx, { questionCount: 3 });
  console.log(`--- ด่าน ${idx + 1} (${lvl.zones.length} โซนคำถาม) ---`);

  lvl.zones.forEach((z, zi) => {
    // สร้างป้ายจาก slots (ปกติ AnswerZone.attach ทำตอนเล่น)
    const signs = z.slots.map((s, i) => ({ ...s, index: i }));

    /* 1) กวาดตัวละครวิ่งผ่านโซนทั้งหมด ต้องไม่ชนป้ายใดเลย */
    let runHits = 0;
    for (let px = z.x; px <= z.x + z.w - P_W; px += 2) {
      const body = { x: px, y: STAND_TOP, w: P_W, h: P_H };
      for (const s of signs) if (overlap(body, s)) runHits++;
    }
    check(runHits === 0, `โซน ${zi + 1}: วิ่งผ่านทั้งโซนไม่ชนป้าย`,
      runHits ? `ชน ${runHits} จุด` : 'ทางโล่งตลอด');

    /* 2) ทางวิ่งใต้ป้ายต้องไม่มีบล็อกทึบ (เช่นแท่นยก) ขวาง */
    const blockers = lvl.platforms.filter((p) =>
      p.kind !== 'ground' && p.x < z.x + z.w && p.x + p.w > z.x &&
      p.y < GROUND_Y && p.y + p.h > STAND_TOP);
    check(blockers.length === 0, `โซน ${zi + 1}: ทางวิ่งใต้ป้ายโล่ง`,
      blockers.length ? `พบสิ่งกีดขวาง ${blockers.length} ชิ้น` : 'ไม่มีแท่นขวาง');

    /* 3) ทุกป้ายต้องกระโดดถึง และช่องว่างต้องกว้างพอให้ลอด */
    const rise = STAND_TOP - (SIGN_Y + SIGN_H);
    check(rise > 0 && rise < RISE_1,
      `โซน ${zi + 1}: กระโดดถึงป้ายทุกใบ`,
      `ต้องกระโดดสูง ${rise}px (ทำได้ ${RISE_1.toFixed(0)}px)`);

    let minGap = Infinity;
    for (let i = 1; i < signs.length; i++) {
      minGap = Math.min(minGap, signs[i].x - (signs[i - 1].x + signs[i - 1].w));
    }
    check(minGap >= P_W, `โซน ${zi + 1}: ช่องว่างระหว่างป้ายกว้างพอ`,
      `ช่องแคบสุด ${minGap}px (ตัวละครกว้าง ${P_W}px)`);

    /* 4) ต้องกระโดดข้ามกำแพงกั้นไม่ได้ */
    const needed = STAND_TOP - (z.barrier.y - P_H);
    check(needed > RISE_2, `โซน ${zi + 1}: กระโดดข้ามกำแพงไม่ได้`,
      `ต้องสูง ${needed}px แต่ทำได้แค่ ${RISE_2.toFixed(0)}px`);

    /* 5) เหรียญในโซนต้องไม่อยู่เหนือป้าย (เก็บแล้วไม่เผลอตอบ) */
    const risky = lvl.coins.filter((c) => {
      if (c.x + c.w < z.x || c.x > z.x + z.w) return false;
      const aboveSignBottom = c.y + c.h < SIGN_Y + SIGN_H;
      if (!aboveSignBottom) return false;
      return signs.some((s) => c.x < s.x + s.w && c.x + c.w > s.x);
    });
    check(risky.length === 0, `โซน ${zi + 1}: เหรียญไม่ล่อให้ชนป้าย`,
      risky.length ? `เหรียญเสี่ยง ${risky.length} เหรียญ` : 'เหรียญปลอดภัยทั้งหมด');
  });
  console.log('');
}

console.log(failed === 0
  ? '✅ ผ่านทุกข้อ — โซนคำถามเล่นได้ถูกต้อง'
  : `❌ ไม่ผ่าน ${failed} ข้อ`);
process.exit(failed === 0 ? 0 : 1);

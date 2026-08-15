/**
 * tools/bundle-data.mjs
 * ---------------------------------------------------------
 * รวมไฟล์ JSON ใน /data ให้เป็นไฟล์ JavaScript หนึ่งไฟล์
 * (data/data-bundle.js) เพื่อให้เกมเปิดเล่นได้จาก file://
 * โดยไม่ต้องติดตั้ง Local Server
 *
 * วิธีใช้ (ต้องมี Node.js):
 *     node tools/bundle-data.mjs
 *
 * ต้องรันคำสั่งนี้ใหม่ทุกครั้งที่แก้ไฟล์ JSON ใน /data
 * ถ้าเปิดเกมผ่าน Local Server อยู่แล้ว ไม่จำเป็นต้องรัน
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FILES = {
  questions: 'data/questions.json',
  levels: 'data/levels.json',
  settings: 'data/settings.json'
};

const bundle = {};
for (const [key, rel] of Object.entries(FILES)) {
  const raw = readFileSync(join(root, rel), 'utf8');
  try {
    bundle[key] = JSON.parse(raw);
  } catch (err) {
    console.error(`\n❌ ไฟล์ ${rel} มีรูปแบบ JSON ไม่ถูกต้อง:\n   ${err.message}\n`);
    process.exit(1);
  }
}

const qCount = (bundle.questions.questions || []).length;
const lvCount = (bundle.levels.levels || []).length;

const out = `/* =========================================================
   data/data-bundle.js  —  ไฟล์นี้ถูกสร้างโดยอัตโนมัติ ห้ามแก้ด้วยมือ
   ---------------------------------------------------------
   สร้างใหม่ด้วยคำสั่ง:  node tools/bundle-data.mjs
   สร้างเมื่อ: ${new Date().toISOString()}
   คำถาม ${qCount} ข้อ | ด่าน ${lvCount} ด่าน

   ไฟล์นี้เป็น "ข้อมูลสำรอง" ให้เกมทำงานได้เมื่อเปิดผ่าน file://
   (เบราว์เซอร์บล็อก fetch() ของไฟล์ JSON เมื่อเปิดแบบดับเบิลคลิก)
   เมื่อเปิดผ่าน Local Server เกมจะอ่านจากไฟล์ .json ตัวจริงเสมอ
   ========================================================= */
window.CR_DATA = ${JSON.stringify(bundle)};
`;

writeFileSync(join(root, 'data/data-bundle.js'), out, 'utf8');
console.log(`✅ สร้าง data/data-bundle.js สำเร็จ — คำถาม ${qCount} ข้อ, ด่าน ${lvCount} ด่าน`);

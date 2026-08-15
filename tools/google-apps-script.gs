/**
 * =========================================================
 * Cyber Runner — ระบบเก็บข้อมูลนักเรียนบน Google Sheets
 * ---------------------------------------------------------
 * วิธีติดตั้ง (ทำครั้งเดียว):
 *
 *  1) สร้าง Google Sheet ใหม่ (ตั้งชื่ออะไรก็ได้ เช่น "Cyber Runner 2569")
 *  2) เมนู  ส่วนขยาย (Extensions) > Apps Script
 *  3) ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดในไฟล์นี้ลงไป
 *  4) แก้ SECRET_KEY ด้านล่างให้เป็นข้อความที่เดายาก
 *     (ต้องตรงกับ TEACHER_KEY ใน src/config/cloud.js)
 *  5) กดบันทึก (ไอคอนแผ่นดิสก์)
 *  6) กด  Deploy > New deployment
 *       - เลือกชนิด (Select type)  =  Web app
 *       - Description               =  cyber runner
 *       - Execute as                =  Me
 *       - Who has access            =  Anyone          <-- สำคัญมาก
 *     แล้วกด Deploy และอนุญาตสิทธิ์ตามที่ระบบถาม
 *  7) คัดลอก "Web app URL" ที่ได้ ไปใส่ในตัวแปร ENDPOINT
 *     ของไฟล์ src/config/cloud.js
 *
 * หมายเหตุ: ถ้าแก้โค้ดนี้ภายหลัง ต้องกด Deploy > Manage deployments
 *          แล้วกดแก้ไข (ดินสอ) > Version: New version > Deploy
 *          ไม่งั้นระบบจะยังใช้โค้ดเวอร์ชันเดิม
 * =========================================================
 */

/** รหัสลับ — ต้องตรงกับ TEACHER_KEY ใน src/config/cloud.js */
var SECRET_KEY = 'cyber-runner-2569';

var SHEET_STUDENTS = 'Students';
var SHEET_RESULTS = 'Results';

var STUDENT_HEADERS = [
  'studentId', 'ชื่อ-นามสกุล', 'ชั้น', 'ห้อง', 'ทีม', 'ใช้งาน', 'เพิ่มเมื่อ'
];

var RESULT_HEADERS = [
  'resultId', 'studentId', 'ชื่อ-นามสกุล', 'ชั้น', 'ห้อง', 'ทีม', 'งาน',
  'คะแนน', 'ตอบถูก', 'ตอบผิด', 'ความแม่นยำ(%)', 'ด่านที่ผ่าน', 'เหรียญ',
  'คอมโบสูงสุด', 'เวลาที่ใช้(วินาที)', 'เกรด', 'ระดับความยาก',
  'เล่นเมื่อ', 'สถิติรายหมวด'
];

/* =========================================================
   อ่านข้อมูล (GET)
   ========================================================= */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || 'all';
  var out;

  try {
    if (action === 'roster') {
      out = { ok: true, students: readStudents() };
    } else if (action === 'results') {
      out = { ok: true, results: readResults() };
    } else if (action === 'ping') {
      out = { ok: true, version: 2, message: 'เชื่อมต่อสำเร็จ', at: new Date().toISOString() };
    } else if (action === 'submitResult' || action === 'addStudents' || action === 'removeStudent') {
      out = handleWrite(action, params.key, params.event, parsePayload(params.payload));
    } else {
      out = { ok: true, students: readStudents(), results: readResults() };
    }
  } catch (err) {
    out = { ok: false, error: String(err) };
  }

  return reply(out, params.callback);
}

/* =========================================================
   เขียนข้อมูล (POST)
   ---------------------------------------------------------
   เกมส่งมาเป็น text/plain เพื่อเลี่ยง CORS preflight
   ========================================================= */
function doPost(e) {
  var out;
  try {
    var body = parsePostBody(e);
    out = handleWrite(body.action, body.key, body.event, body.data || {});
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  return reply(out);
}

function parsePayload(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch (err) { return {}; }
}

function parsePostBody(e) {
  var raw = (e && e.postData && e.postData.contents) || '';
  if (raw) {
    try { return JSON.parse(raw); } catch (err) { /* อาจเป็นแบบฟอร์ม */ }
  }
  var p = (e && e.parameter) || {};
  return {
    action: p.action,
    key: p.key,
    event: p.event,
    data: parsePayload(p.payload || p.data)
  };
}

function handleWrite(action, key, eventName, data) {
  if (key !== SECRET_KEY) {
    return { ok: false, error: 'รหัสลับไม่ถูกต้อง (ตรวจ TEACHER_KEY ให้ตรงกับ SECRET_KEY)' };
  }
  data = data || {};
  if (action === 'submitResult') {
    return { ok: true, resultId: appendResult(data, eventName) };
  }
  if (action === 'addStudents') {
    return { ok: true, added: appendStudents(data.students || []) };
  }
  if (action === 'removeStudent') {
    return { ok: true, removed: deactivateStudent(data.studentId) };
  }
  return { ok: false, error: 'ไม่รู้จักคำสั่ง: ' + action };
}

/* =========================================================
   ตัวช่วย
   ========================================================= */

/** ตอบกลับเป็น JSON หรือ JSONP (ถ้ามี callback) */
function reply(obj, callback) {
  var json = JSON.stringify(obj);
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

/** หาชีต ถ้าไม่มีให้สร้างพร้อมหัวตาราง */
function getSheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1b2a5e')
      .setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readStudents() {
  var sh = getSheet(SHEET_STUDENTS, STUDENT_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, STUDENT_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[1]) continue;                       // ไม่มีชื่อ = ข้าม
    if (String(r[5]).toLowerCase() === 'no') continue;  // ปิดใช้งาน
    out.push({
      studentId: String(r[0] || ('s' + (i + 1))),
      name: String(r[1]).trim(),
      grade: String(r[2] || '').trim(),
      room: String(r[3] || '').trim(),
      team: String(r[4] || '').trim()
    });
  }
  return out;
}

function readResults() {
  var sh = getSheet(SHEET_RESULTS, RESULT_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return [];
  var rows = sh.getRange(2, 1, last - 1, RESULT_HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var cats = {};
    try { cats = r[18] ? JSON.parse(r[18]) : {}; } catch (err) { cats = {}; }
    out.push({
      resultId: String(r[0]),
      studentId: String(r[1] || ''),
      name: String(r[2] || ''),
      grade: String(r[3] || ''),
      room: String(r[4] || ''),
      team: String(r[5] || ''),
      event: String(r[6] || ''),
      score: Number(r[7]) || 0,
      correct: Number(r[8]) || 0,
      wrong: Number(r[9]) || 0,
      accuracy: Number(r[10]) || 0,
      levels: Number(r[11]) || 0,
      coins: Number(r[12]) || 0,
      bestCombo: Number(r[13]) || 0,
      timeUsed: Number(r[14]) || 0,
      rank: String(r[15] || ''),
      difficulty: String(r[16] || ''),
      playedAt: r[17] instanceof Date ? r[17].getTime() : Number(r[17]) || 0,
      categories: cats
    });
  }
  return out;
}

function appendResult(d, eventName) {
  var sh = getSheet(SHEET_RESULTS, RESULT_HEADERS);
  var id = 'r' + new Date().getTime() + '-' + Math.floor(Math.random() * 10000);
  var playedAt = d.playedAt ? new Date(d.playedAt) : new Date();

  // บันทึกชื่อผู้เล่นเข้าชีตรายชื่ออัตโนมัติ (ถ้ายังไม่มี)
  if (d.name) {
    appendStudents([{
      name: d.name,
      grade: d.grade,
      room: d.room,
      team: d.team
    }]);
  }

  sh.appendRow([
    id,
    d.studentId || '',
    d.name || '',
    d.grade || '',
    d.room || '',
    d.team || '',
    eventName || '',
    Number(d.score) || 0,
    Number(d.correct) || 0,
    Number(d.wrong) || 0,
    Number(d.accuracy) || 0,
    Number(d.levels) || 0,
    Number(d.coins) || 0,
    Number(d.bestCombo) || 0,
    Number(d.timeUsed) || 0,
    d.rank || '',
    d.difficulty || '',
    playedAt,
    JSON.stringify(d.categories || {})
  ]);
  return id;
}

function appendStudents(list) {
  var sh = getSheet(SHEET_STUDENTS, STUDENT_HEADERS);
  var existing = readStudents();
  var seen = {};
  for (var i = 0; i < existing.length; i++) {
    seen[keyOf(existing[i].name, existing[i].grade, existing[i].room)] = true;
  }

  var rows = [];
  var now = new Date();
  for (var j = 0; j < list.length; j++) {
    var s = list[j] || {};
    var name = String(s.name || '').trim();
    if (!name) continue;
    var k = keyOf(name, s.grade, s.room);
    if (seen[k]) continue;                 // กันชื่อซ้ำในห้องเดียวกัน
    seen[k] = true;
    rows.push([
      's' + now.getTime() + '-' + Math.floor(Math.random() * 10000) + '-' + j,
      name,
      String(s.grade || '').trim(),
      String(s.room || '').trim(),
      String(s.team || '').trim(),
      'yes',
      now
    ]);
  }
  if (rows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, STUDENT_HEADERS.length).setValues(rows);
  }
  return rows.length;
}

function keyOf(name, grade, room) {
  return String(name).trim().toLowerCase() + '|' +
         String(grade || '').trim() + '|' +
         String(room || '').trim();
}

/** ไม่ลบจริง แค่ตั้งเป็น no เพื่อเก็บประวัติผลเล่นไว้ */
function deactivateStudent(studentId) {
  if (!studentId) return 0;
  var sh = getSheet(SHEET_STUDENTS, STUDENT_HEADERS);
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(studentId)) {
      sh.getRange(i + 2, 6).setValue('no');
      return 1;
    }
  }
  return 0;
}

/* =========================================================
   เมนูช่วยเหลือในตัว Google Sheet
   ========================================================= */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Cyber Runner')
    .addItem('สร้างตารางเริ่มต้น', 'setupSheets')
    .addItem('ทดสอบระบบ', 'testSetup')
    .addToUi();
}

function setupSheets() {
  getSheet(SHEET_STUDENTS, STUDENT_HEADERS);
  getSheet(SHEET_RESULTS, RESULT_HEADERS);
  SpreadsheetApp.getUi().alert(
    'สร้างตารางเรียบร้อย\n\n' +
    'ชีต "Students" — พิมพ์รายชื่อนักเรียนที่นี่ (ชื่อ, ชั้น, ห้อง)\n' +
    'ชีต "Results" — ระบบจะบันทึกผลการเล่นให้อัตโนมัติ ไม่ต้องแก้เอง'
  );
}

function testSetup() {
  var s = readStudents();
  var r = readResults();
  SpreadsheetApp.getUi().alert(
    'ระบบพร้อมใช้งาน\n\n' +
    'รายชื่อนักเรียน: ' + s.length + ' คน\n' +
    'ผลการเล่นที่บันทึกไว้: ' + r.length + ' รายการ\n\n' +
    'ถ้ายังไม่ได้ Deploy ให้กด Deploy > New deployment > Web app\n' +
    'และตั้ง Who has access = Anyone'
  );
}

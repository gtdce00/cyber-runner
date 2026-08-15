/* =========================================================
   src/config/cloud.js
   ---------------------------------------------------------
   ตั้งค่าการเชื่อมต่อ Google Sheets (ผ่าน Google Apps Script)

   *** ไฟล์นี้เป็นไฟล์เดียวที่ต้องแก้เพื่อเชื่อมระบบเก็บข้อมูล ***

   วิธีตั้งค่า (ทำครั้งเดียว ดูขั้นตอนละเอียดใน README หัวข้อ 11):
     1) สร้าง Google Sheet ใหม่
     2) เมนู ส่วนขยาย > Apps Script
     3) วางโค้ดจากไฟล์ tools/google-apps-script.gs
     4) กด Deploy > New deployment > Web app
        - Execute as: Me
        - Who has access: Anyone
     5) คัดลอก Web app URL มาใส่ใน ENDPOINT ด้านล่าง
     6) ตั้ง TEACHER_KEY ให้ตรงกับ SECRET_KEY ในไฟล์ Apps Script

   ถ้า ENDPOINT ว่าง ("") เกมจะทำงานแบบออฟไลน์ล้วน
   (เก็บคะแนนในเครื่อง ใช้ Dashboard โดยนำเข้าไฟล์ CSV ได้)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  CR.CLOUD = {
    /**
     * URL ของ Apps Script Web App
     * ตัวอย่าง: 'https://script.google.com/macros/s/AKfycb.....xyz/exec'
     */
    ENDPOINT: 'https://script.google.com/macros/s/AKfycbw3QvrZVjANUrhGtyGbGrooxXXGRwa61gLa1y59xw6bhHGeq7qv54xc9uhydwDukYzKKQ/exec',

    /**
     * รหัสลับที่ใช้ยืนยันสิทธิ์เขียนข้อมูล
     * ต้องตรงกับ SECRET_KEY ในไฟล์ Apps Script
     * (เปลี่ยนเป็นข้อความอะไรก็ได้ที่เดายาก แต่อย่าใช้รหัสผ่านจริงของคุณ)
     */
    TEACHER_KEY: 'cyber-runner-2569',

    /**
     * ชื่องาน/รุ่นการแข่งขัน — ใช้แยกข้อมูลถ้าจัดหลายครั้งใน Sheet เดียว
     * เช่น 'วันวิทยาศาสตร์ 2569'
     */
    EVENT: 'วันวิทยาศาสตร์ 2569',

    /** หมดเวลารอเซิร์ฟเวอร์ (มิลลิวินาที) — เกินนี้ถือว่าออฟไลน์ */
    TIMEOUT_MS: 25000,

    /** ดึงรายชื่อนักเรียนมาเก็บในเครื่องไว้ใช้ตอนเน็ตล่ม */
    CACHE_ROSTER: true
  };
})(window);

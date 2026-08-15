/* =========================================================
   src/collision.js
   ---------------------------------------------------------
   ระบบตรวจการชนแบบ AABB + การชนกับแพลตฟอร์ม
   แยกแกน X และ Y เพื่อให้การเดินชนกำแพง/ยืนบนพื้นแม่นยำ
   รองรับ:
     - solid platform (ชนได้ทุกด้าน)
     - one-way platform (กระโดดทะลุขึ้นได้ เหยียบลงได้)
     - moving platform (พาผู้เล่นเคลื่อนที่ไปด้วย)
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});

  const Collision = {
    /** ตรวจสี่เหลี่ยมทับกัน */
    aabb(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x &&
             a.y < b.y + b.h && a.y + a.h > b.y;
    },

    rectPoint(r, px, py) {
      return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    },

    /** ระยะห่างระหว่างจุดกึ่งกลางของสองกล่อง */
    centerDistance(a, b) {
      const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
      const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
      return Math.hypot(dx, dy);
    },

    /**
     * ขยับ body ตามความเร็ว พร้อมแก้การชนกับ platforms
     * body ต้องมี: x, y, w, h, vx, vy
     * ผลลัพธ์จะตั้งค่า: body.onGround, body.hitWall, body.ridingPlatform
     */
    moveAndCollide(body, platforms, dt) {
      const result = { onGround: false, hitCeiling: false, hitWall: 0, ground: null };

      // ---------- แกน X ----------
      body.x += body.vx * dt;
      for (const p of platforms) {
        if (p.oneWay || p.disabled) continue;
        if (!this.aabb(body, p)) continue;
        if (body.vx > 0) {
          body.x = p.x - body.w;
          result.hitWall = 1;
        } else if (body.vx < 0) {
          body.x = p.x + p.w;
          result.hitWall = -1;
        }
        body.vx = 0;
      }

      // ---------- แกน Y ----------
      const prevBottom = body.y + body.h;
      body.y += body.vy * dt;

      for (const p of platforms) {
        if (p.disabled) continue;
        if (!this.aabb(body, p)) continue;

        if (p.oneWay) {
          // เหยียบได้เฉพาะตอนกำลังตกลงมา และก่อนหน้านี้อยู่เหนือแพลตฟอร์ม
          const tolerance = 8 + Math.abs(p.vy || 0) * dt;
          if (body.vy >= 0 && prevBottom <= p.y + tolerance) {
            body.y = p.y - body.h;
            body.vy = 0;
            result.onGround = true;
            result.ground = p;
          }
          continue;
        }

        if (body.vy > 0) {
          body.y = p.y - body.h;
          body.vy = 0;
          result.onGround = true;
          result.ground = p;
        } else if (body.vy < 0) {
          body.y = p.y + p.h;
          body.vy = 0;
          result.hitCeiling = true;
        }
      }

      // ---------- แพลตฟอร์มเคลื่อนที่: พาผู้เล่นไปด้วย ----------
      if (result.ground && (result.ground.vx || result.ground.vy)) {
        body.x += (result.ground.vx || 0) * dt;
      }

      body.onGround = result.onGround;
      body.ridingPlatform = result.ground;
      return result;
    }
  };

  CR.Collision = Collision;
})(window);

/* =========================================================
   src/dashboard.js — หน้า Dashboard ครู
   รายชื่อนักเรียน + คะแนนพัฒนาการ จาก Google Sheets
   ========================================================= */
(function (global) {
  'use strict';
  const U = CR.U;

  const CAT_TH = {
    hardware: 'ฮาร์ดแวร์', software: 'ซอฟต์แวร์', internet: 'อินเทอร์เน็ต',
    cybersecurity: 'ความปลอดภัย', logic: 'ตรรกะ', algorithm: 'อัลกอริทึม',
    coding: 'เขียนโค้ด', debugging: 'แก้บั๊ก', data: 'ข้อมูล',
    network: 'เครือข่าย', programming: 'โปรแกรม', digital: 'ดิจิทัล',
    ai: 'AI', technology: 'เทคโนโลยี', boss: 'บอส', general: 'ทั่วไป'
  };

  let students = [];
  let results = [];
  let selectedKey = null;

  function toast(text, cls) {
    const el = U.$('#toast');
    if (!el) return;
    el.textContent = text;
    el.className = 'toast ' + (cls || '');
    U.show(el);
    clearTimeout(toast._t);
    toast._t = setTimeout(() => U.hide(el), 3200);
  }

  function studentKey(s) {
    if (s.studentId) return 'id:' + s.studentId;
    return 'n:' + String(s.name || '').trim().toLowerCase() + '|' +
      String(s.grade || '') + '|' + String(s.room || '');
  }

  function resultKey(r) {
    if (r.studentId) return 'id:' + r.studentId;
    return 'n:' + String(r.name || '').trim().toLowerCase() + '|' +
      String(r.grade || '') + '|' + String(r.room || '');
  }

  function playsOf(key) {
    return results
      .filter((r) => resultKey(r) === key)
      .sort((a, b) => (a.playedAt || 0) - (b.playedAt || 0));
  }

  function setStatus(text, cls) {
    const el = U.$('#dash-status');
    el.textContent = text;
    el.className = 'cloud-strip ' + (cls || 'info');
  }

  async function loadAll() {
    if (!CR.Cloud.enabled) {
      setStatus('ยังไม่ได้ตั้งค่า ENDPOINT ใน src/config/cloud.js', 'warn');
      render();
      return;
    }
    setStatus('กำลังโหลดข้อมูลจาก Google Sheets…', 'info');
    try {
      const data = await CR.Cloud.fetchAll();
      students = data.students || [];
      results = data.results || [];
      CR.Cloud._cacheRoster(students);
      setStatus('เชื่อมต่อแล้ว • นักเรียน ' + students.length + ' คน • ผลเล่น ' + results.length + ' ครั้ง', 'good');
    } catch (err) {
      setStatus('เชื่อมต่อไม่ได้: ' + (err.message || err), 'warn');
      toast('โหลดข้อมูลไม่สำเร็จ — ตรวจ URL ของ Apps Script', 'warn');
    }
    fillFilters();
    render();
  }

  function fillFilters() {
    const grades = [...new Set(students.map((s) => s.grade).filter(Boolean))].sort();
    const rooms = [...new Set(students.map((s) => s.room).filter(Boolean))].sort();
    const gSel = U.$('#filter-grade');
    const rSel = U.$('#filter-room');
    const gNow = gSel.value, rNow = rSel.value;
    gSel.innerHTML = '<option value="">ทุกชั้น</option>' + grades.map((g) => `<option>${g}</option>`).join('');
    rSel.innerHTML = '<option value="">ทุกห้อง</option>' + rooms.map((r) => `<option>${r}</option>`).join('');
    gSel.value = gNow; rSel.value = rNow;
  }

  function filteredStudents() {
    const q = U.$('#filter-q').value.trim().toLowerCase();
    const g = U.$('#filter-grade').value;
    const r = U.$('#filter-room').value;
    return students.filter((s) => {
      if (g && s.grade !== g) return false;
      if (r && s.room !== r) return false;
      if (q && !(s.name + ' ' + (s.grade || '') + ' ' + (s.room || '')).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function render() {
    const list = filteredStudents();
    const latestScores = [];
    const latestAcc = [];
    let totalPlays = 0;

    list.forEach((s) => {
      const plays = playsOf(studentKey(s));
      totalPlays += plays.length;
      if (plays.length) {
        latestScores.push(plays[plays.length - 1].score || 0);
        latestAcc.push(plays[plays.length - 1].accuracy || 0);
      }
    });

    U.setText(U.$('#kpi-students'), String(list.length));
    U.setText(U.$('#kpi-plays'), String(totalPlays));
    U.setText(U.$('#kpi-avg'), latestScores.length
      ? String(Math.round(latestScores.reduce((a, b) => a + b, 0) / latestScores.length))
      : '0');
    U.setText(U.$('#kpi-acc'), latestAcc.length
      ? Math.round(latestAcc.reduce((a, b) => a + b, 0) / latestAcc.length) + '%'
      : '0%');

    const tbody = U.$('#student-body');
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="lb-empty">ยังไม่มีรายชื่อในตัวกรองนี้</td></tr>';
    } else {
      tbody.innerHTML = list.map((s, i) => {
        const key = studentKey(s);
        const plays = playsOf(key);
        const last = plays[plays.length - 1];
        const first = plays[0];
        const best = plays.reduce((m, p) => Math.max(m, p.score || 0), 0);
        let trend = '—';
        let trendCls = 'trend-flat';
        if (plays.length >= 2) {
          const d = (last.score || 0) - (first.score || 0);
          if (d > 0) { trend = '+' + d; trendCls = 'trend-up'; }
          else if (d < 0) { trend = String(d); trendCls = 'trend-down'; }
          else { trend = 'เท่าเดิม'; }
        } else if (plays.length === 1) {
          trend = 'เล่นครั้งแรก';
        }
        const cls = [s.grade, s.room].filter(Boolean).join('/');
        return `<tr data-key="${U.esc ? U.esc(key) : key.replace(/"/g, '')}" class="${selectedKey === key ? 'selected' : ''}">
          <td>${i + 1}</td>
          <td>${s.name}</td>
          <td>${cls || '—'}</td>
          <td>${plays.length}</td>
          <td>${last ? last.score : '—'}</td>
          <td>${plays.length ? best : '—'}</td>
          <td class="${trendCls}">${trend}</td>
          <td>${last ? last.accuracy + '%' : '—'}</td>
          <td>${last ? last.levels : '—'}</td>
        </tr>`;
      }).join('');
    }

    renderWeakness(list);
  }

  function renderWeakness(list) {
    const cats = Object.create(null);
    list.forEach((s) => {
      playsOf(studentKey(s)).forEach((p) => {
        const c = p.categories || {};
        Object.keys(c).forEach((k) => {
          const row = cats[k] || (cats[k] = { correct: 0, wrong: 0 });
          row.correct += Number(c[k].correct) || 0;
          row.wrong += Number(c[k].wrong) || 0;
        });
      });
    });
    const rows = Object.keys(cats).map((k) => {
      const t = cats[k].correct + cats[k].wrong;
      const wrongPct = t ? Math.round((cats[k].wrong / t) * 100) : 0;
      return { k, wrongPct, t };
    }).sort((a, b) => b.wrongPct - a.wrongPct);
    const box = U.$('#weak-bars');
    if (!rows.length) {
      box.innerHTML = '<p class="foot-note">ยังไม่มีข้อมูลการตอบคำถาม</p>';
      return;
    }
    box.innerHTML = rows.slice(0, 8).map((r) =>
      `<div class="weak-row"><span>${CAT_TH[r.k] || r.k}</span>
        <div class="weak-track"><div class="weak-fill" style="width:${r.wrongPct}%"></div></div>
        <b>${r.wrongPct}%</b></div>`
    ).join('');
  }

  function showProgress(key) {
    selectedKey = key;
    const s = students.find((x) => studentKey(x) === key);
    const plays = playsOf(key);
    const card = U.$('#progress-card');
    U.show(card);
    U.setText(U.$('#progress-title'), 'พัฒนาการของ ' + (s ? s.name : 'นักเรียน'));
    U.$('#history-body').innerHTML = plays.length
      ? plays.map((p, i) => `<tr>
          <td>${i + 1}</td>
          <td>${p.playedAt ? U.formatDateTH(p.playedAt) : '—'}</td>
          <td>${p.score}</td>
          <td>${p.correct} / ${p.wrong}</td>
          <td>${p.accuracy}%</td>
          <td>${p.levels}</td>
          <td>${p.rank || '—'}</td>
        </tr>`).join('')
      : '<tr><td colspan="7" class="lb-empty">ยังไม่เคยเล่น</td></tr>';
    drawChart(plays);
    render();
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function drawChart(plays) {
    const cv = U.$('#progress-chart');
    const ctx = cv.getContext('2d');
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(8,12,32,0.9)';
    ctx.fillRect(0, 0, w, h);
    if (plays.length < 1) {
      ctx.fillStyle = '#9fb2d8';
      ctx.font = '18px Kanit, sans-serif';
      ctx.fillText('ยังไม่มีคะแนนให้แสดงกราฟ', 24, h / 2);
      return;
    }
    const scores = plays.map((p) => Number(p.score) || 0);
    const max = Math.max(100, ...scores) * 1.1;
    const pad = { l: 50, r: 20, t: 24, b: 36 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.fillStyle = '#9fb2d8';
    ctx.font = '12px Orbitron, sans-serif';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + ih * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
      ctx.fillText(String(Math.round(max * i / 4)), 8, y + 4);
    }

    ctx.strokeStyle = '#34e0ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    scores.forEach((sc, i) => {
      const x = pad.l + (scores.length === 1 ? iw / 2 : (iw * i) / (scores.length - 1));
      const y = pad.t + ih * (1 - sc / max);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    scores.forEach((sc, i) => {
      const x = pad.l + (scores.length === 1 ? iw / 2 : (iw * i) / (scores.length - 1));
      const y = pad.t + ih * (1 - sc / max);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#eaf3ff';
      ctx.font = '12px Kanit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(sc), x, y - 10);
      ctx.fillText('ครั้ง ' + (i + 1), x, h - 12);
      ctx.textAlign = 'left';
    });
  }

  function parseBulk(text) {
    return String(text || '').split(/\r?\n/).map((line) => {
      const p = line.split(/[,|\t]/).map((x) => x.trim());
      if (!p[0]) return null;
      return { name: p[0], grade: p[1] || '', room: p[2] || '', team: p[3] || '' };
    }).filter(Boolean);
  }

  async function addStudents(list) {
    if (!list.length) { toast('ไม่มีรายชื่อที่จะเพิ่ม', 'warn'); return; }
    if (!CR.Cloud.enabled) { toast('ยังไม่ได้ตั้งค่า ENDPOINT', 'warn'); return; }
    try {
      const res = await CR.Cloud.addStudents(list);
      toast('เพิ่มรายชื่อแล้ว ' + (res.added || list.length) + ' คน', 'good');
      U.$('#add-name').value = '';
      U.$('#add-bulk').value = '';
      await loadAll();
    } catch (err) {
      toast('เพิ่มไม่สำเร็จ: ' + (err.message || err), 'warn');
    }
  }

  function exportCsv() {
    const list = filteredStudents();
    const head = ['ชื่อ', 'ชั้น', 'ห้อง', 'ทีม', 'ครั้งที่เล่น', 'คะแนนล่าสุด', 'คะแนนสูงสุด', 'พัฒนาการ', 'ความแม่นยำล่าสุด', 'ด่านล่าสุด'];
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [head.map(esc).join(',')];
    list.forEach((s) => {
      const plays = playsOf(studentKey(s));
      const last = plays[plays.length - 1];
      const first = plays[0];
      const best = plays.reduce((m, p) => Math.max(m, p.score || 0), 0);
      const delta = plays.length >= 2 ? (last.score || 0) - (first.score || 0) : '';
      lines.push([s.name, s.grade, s.room, s.team, plays.length,
        last ? last.score : '', plays.length ? best : '', delta,
        last ? last.accuracy : '', last ? last.levels : ''].map(esc).join(','));
    });
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cyber-runner-dashboard.csv';
    a.click();
  }

  function bind() {
    U.on(U.$('#btn-refresh'), 'click', () => loadAll());
    U.on(U.$('#btn-export'), 'click', exportCsv);
    U.on(U.$('#filter-q'), 'input', render);
    U.on(U.$('#filter-grade'), 'change', render);
    U.on(U.$('#filter-room'), 'change', render);
    U.on(U.$('#student-body'), 'click', (ev) => {
      const tr = ev.target.closest('tr[data-key]');
      if (tr) showProgress(tr.getAttribute('data-key'));
    });
    U.on(U.$('#add-form'), 'submit', (ev) => {
      ev.preventDefault();
      addStudents([{
        name: U.$('#add-name').value.trim(),
        grade: U.$('#add-grade').value,
        room: U.$('#add-room').value.trim(),
        team: U.$('#add-team').value.trim()
      }]);
    });
    U.on(U.$('#btn-bulk'), 'click', () => addStudents(parseBulk(U.$('#add-bulk').value)));
  }

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    loadAll();
  });
})(window);

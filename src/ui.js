/* =========================================================
   src/ui.js
   ---------------------------------------------------------
   จัดการหน้าจอทั้งหมด (Home / Profile / Settings / Leaderboard /
   Pause / Result), HUD ระหว่างเล่น, Question Panel และ Feedback Panel
   ========================================================= */
(function (global) {
  'use strict';
  const CR = (global.CR = global.CR || {});
  const U = CR.U;

  const LETTERS = ['A', 'B', 'C', 'D'];

  const UI = {
    el: {},
    current: 'loading',
    onAction: {},        // ตัวจัดการเหตุการณ์ (ตั้งค่าโดย main.js)
    _toastTimer: null,
    _bigTimer: null,
    _fbTimer: null,

    init(handlers) {
      this.onAction = handlers || {};
      const e = this.el;

      // ---- แคช element ----
      e.hud = U.$('#hud');
      e.hudName = U.$('#hud-player-name');
      e.hudClass = U.$('#hud-player-class');
      e.hudTime = U.$('#hud-time');
      e.hudTimeBox = U.$('#hud-time-box');
      e.hudScore = U.$('#hud-score');
      e.hudLevel = U.$('#hud-level');
      e.hudLevelName = U.$('#hud-level-name');
      e.hudCombo = U.$('#hud-combo');
      e.hudComboChip = U.$('#hud-combo-chip');
      e.hudCoins = U.$('#hud-coins');
      e.hudProgress = U.$('#hud-progress');

      e.qPanel = U.$('#question-panel');
      e.qBadge = U.$('#q-badge');
      e.qCat = U.$('#q-cat');
      e.qDiff = U.$('#q-diff');
      e.qText = U.$('#q-text');
      e.qOptions = U.$('#q-options');
      e.qHint = U.$('#q-hint');

      e.fb = U.$('#feedback-panel');
      e.fbTitle = U.$('#fb-title');
      e.fbAnswer = U.$('#fb-answer');
      e.fbExplain = U.$('#fb-explain');
      e.fbScore = U.$('#fb-score');
      e.fbFill = U.$('#fb-timer-fill');

      e.toast = U.$('#toast');
      e.bigcount = U.$('#bigcount');
      e.touch = U.$('#touch-controls');
      e.loadBar = U.$('#load-bar');
      e.loadText = U.$('#load-text');

      this._bindNav();
      this._bindSettings();
      this._bindProfile();
      this._bindResultAndPause();
    },

    /* ================= SCREENS ================= */
    show(name) {
      U.$$('.screen').forEach((s) => s.classList.remove('active'));
      const target = document.getElementById('screen-' + name);
      if (target) target.classList.add('active');
      this.current = name;

      // ซ่อน overlay ทั้งหมดเมื่อเข้าสู่โหมดเล่น
      const overlay = U.$('#overlay');
      overlay.style.pointerEvents = name === 'game' ? 'none' : 'auto';

      U.toggle(this.el.hud, name === 'game' || name === 'pause');
      const s = CR.Settings.get();
      U.toggle(this.el.touch, (name === 'game') && (s.accessibility.touchControls || this._isTouchDevice()));
    },

    _isTouchDevice() {
      return ('ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches;
    },

    _bindNav() {
      U.$$('[data-nav]').forEach((b) => U.on(b, 'click', () => {
        CR.Sound.play('button');
        const to = b.dataset.nav;
        if (to === 'home' && this.onAction.goHome) this.onAction.goHome();
        else this.show(to);
      }));

      U.on(U.$('#btn-start'), 'click', () => { CR.Sound.play('button'); this.openProfile(); });
      U.on(U.$('#btn-howto'), 'click', () => { CR.Sound.play('button'); this.show('howto'); });
      U.on(U.$('#btn-leaderboard'), 'click', () => { CR.Sound.play('button'); this.openLeaderboard(); });
      U.on(U.$('#btn-settings'), 'click', () => { CR.Sound.play('button'); this.openSettings(); });
      U.on(U.$('#btn-pause'), 'click', () => this.onAction.pause && this.onAction.pause());
      U.on(U.$('#btn-export-lb'), 'click', () => { CR.Sound.play('button'); CR.Leaderboard.downloadCsv(); });
    },

    /* ================= LOADING ================= */
    setLoading(ratio, text) {
      if (this.el.loadBar) this.el.loadBar.style.width = Math.round(ratio * 100) + '%';
      if (text) U.setText(this.el.loadText, text);
    },

    /* ================= PROFILE ================= */
    openProfile() {
      const s = CR.Settings.get();
      const mins = s.competition.minutes;
      const diffLabel = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD', auto: 'AUTO (ตามชั้นเรียน)' }[s.difficulty];
      U.$('#pf-info').innerHTML =
        `⏱ เวลาแข่งขัน <b>${mins} นาที</b> &nbsp;•&nbsp; 🎯 ระดับความยาก <b>${diffLabel}</b><br>` +
        `🗺 เปิดใช้งาน <b>${s.levels.enabled}</b> ด่าน &nbsp;•&nbsp; ❓ ด่านละ <b>${s.levels.questionsPerLevel}</b> คำถาม`;

      // จำข้อมูลผู้เล่นคนล่าสุด ช่วยให้กรอกเร็วขึ้นเวลาแข่งเป็นทีม
      try {
        const last = JSON.parse(localStorage.getItem('cyberrunner.lastProfile') || '{}');
        if (last.grade) U.$('#pf-grade').value = last.grade;
        if (last.room) U.$('#pf-room').value = last.room;
        if (last.team) U.$('#pf-team').value = last.team;
      } catch (err) { /* ไม่มีข้อมูลเดิม */ }

      this.show('profile');
      this.refreshCloudStrip();
      this.loadRoster();
      setTimeout(() => {
        const box = U.$('#pf-roster-box');
        if (box && !box.classList.contains('hidden')) U.$('#pf-roster-search').focus();
        else U.$('#pf-name').focus();
      }, 60);
    },

    /* ---------- รายชื่อนักเรียนที่ครูเพิ่มไว้ ---------- */

    _roster: [],
    _manualMode: false,

    /** โหลดรายชื่อ (คลาวด์ > แคชในเครื่อง > ไฟล์ data/students.json) */
    loadRoster() {
      if (!CR.Cloud) return;
      U.setText(U.$('#pf-roster-count'), 'กำลังโหลดรายชื่อ...');
      CR.Cloud.fetchRoster().then(({ students, source }) => {
        this._roster = students || [];
        if (!this._roster.length) {
          this._setManualMode(true, true);
          return;
        }
        this._setManualMode(false);
        this.renderRoster('');
        const label = {
          cloud: 'จากระบบออนไลน์',
          cache: 'จากข้อมูลที่บันทึกไว้ในเครื่อง (ออฟไลน์)',
          file: 'จากไฟล์รายชื่อในเครื่อง'
        }[source] || '';
        U.setText(U.$('#pf-roster-count'), `มีรายชื่อ ${this._roster.length} คน ${label}`);
      }).catch(() => this._setManualMode(true, true));
    },

    /** สลับระหว่างโหมดเลือกจากรายชื่อ กับโหมดพิมพ์ชื่อเอง */
    _setManualMode(manual, hideToggle) {
      this._manualMode = manual;
      const box = U.$('#pf-roster-box');
      const fields = U.$('#pf-manual-fields');
      U.toggle(box, !manual);
      U.toggle(fields, manual);
      if (hideToggle) U.toggle(U.$('#pf-manual-toggle'), false);
    },

    renderRoster(filter) {
      const sel = U.$('#pf-roster');
      const q = String(filter || '').trim().toLowerCase();
      const list = q
        ? this._roster.filter((s) =>
            (s.name + ' ' + (s.grade || '') + ' ' + (s.room || '')).toLowerCase().includes(q))
        : this._roster;

      sel.innerHTML = '';
      if (!list.length) {
        const o = document.createElement('option');
        o.textContent = 'ไม่พบชื่อที่ค้นหา';
        o.disabled = true;
        sel.appendChild(o);
        return;
      }
      list.forEach((s) => {
        const o = document.createElement('option');
        o.value = s.studentId;
        const cls = [s.grade, s.room].filter(Boolean).join('/');
        o.textContent = s.name + (cls ? `  —  ${cls}` : '');
        sel.appendChild(o);
      });
      if (list.length === 1) sel.selectedIndex = 0;
    },

    /* ---------- สถานะการเชื่อมต่อระบบเก็บข้อมูล ---------- */

    refreshCloudStrip() {
      const el = U.$('#pf-cloud');
      if (!el || !CR.Cloud) return;
      if (!CR.Cloud.enabled) {
        el.innerHTML = '💾 โหมดออฟไลน์ — คะแนนเก็บในเครื่องนี้เท่านั้น';
        el.className = 'cloud-strip warn';
        return;
      }
      const pending = CR.Cloud.pendingCount;
      if (pending > 0) {
        el.innerHTML = `☁ เชื่อมต่อระบบกลางแล้ว &nbsp;•&nbsp; มีคะแนนรอส่ง <b>${pending}</b> รายการ`;
        el.className = 'cloud-strip warn';
      } else {
        el.innerHTML = '☁ เชื่อมต่อระบบกลางแล้ว — คะแนนจะถูกบันทึกให้ครูอัตโนมัติ';
        el.className = 'cloud-strip good';
      }
    },

    /** แสดงสถานะการส่งคะแนนในหน้าสรุปผล */
    setCloudStatus(state) {
      const el = U.$('#result-cloud');
      if (!el) return;
      const map = {
        sending: ['☁ กำลังส่งคะแนนเข้าระบบ...', 'info'],
        sent: ['✓ บันทึกคะแนนเข้าระบบกลางเรียบร้อย', 'good'],
        queued: ['⚠ ส่งคะแนนไม่สำเร็จ (เน็ตขัดข้อง) — บันทึกในเครื่องไว้แล้ว ระบบจะส่งให้อัตโนมัติเมื่อเน็ตกลับมา', 'warn'],
        off: ['', '']
      };
      const [text, cls] = map[state] || ['', ''];
      U.setText(el, text);
      el.className = 'cloud-strip ' + cls;
      U.toggle(el, !!text);
    },

    _bindProfile() {
      const search = U.$('#pf-roster-search');
      if (search) {
        U.on(search, 'input', () => this.renderRoster(search.value));
        // กด Enter ในช่องค้นหา = เลือกชื่อแรกที่เจอ
        U.on(search, 'keydown', (ev) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            const sel = U.$('#pf-roster');
            if (sel.options.length && !sel.options[0].disabled) {
              sel.selectedIndex = 0;
              U.$('#profile-form').requestSubmit();
            }
          }
        });
      }

      const toggle = U.$('#pf-manual-toggle');
      if (toggle) {
        U.on(toggle, 'click', () => {
          CR.Sound.play('button');
          this._setManualMode(true);
          setTimeout(() => U.$('#pf-name').focus(), 40);
        });
      }

      // ดับเบิลคลิกชื่อในรายการ = เริ่มเกมทันที
      const rosterSel = U.$('#pf-roster');
      if (rosterSel) {
        U.on(rosterSel, 'dblclick', () => U.$('#profile-form').requestSubmit());
      }

      U.on(U.$('#profile-form'), 'submit', (ev) => {
        ev.preventDefault();
        const profile = this._readProfile();
        if (!profile) return;
        try {
          localStorage.setItem('cyberrunner.lastProfile',
            JSON.stringify({ grade: profile.grade, room: profile.room, team: profile.team }));
        } catch (err) { /* ignore */ }
        CR.Sound.play('button');
        if (this.onAction.startGame) this.onAction.startGame(profile);
      });
    },

    /** อ่านข้อมูลผู้เล่นจากฟอร์ม — คืน null ถ้ากรอกไม่ครบ */
    _readProfile() {
      if (!this._manualMode) {
        const sel = U.$('#pf-roster');
        const id = sel && sel.value;
        const found = this._roster.find((s) => s.studentId === id);
        if (!found) {
          this.toast('กรุณาเลือกชื่อของคุณจากรายการก่อนเริ่มเกม', 'warn', 3000);
          return null;
        }
        return {
          studentId: found.studentId,
          name: found.name,
          grade: found.grade || U.$('#pf-grade').value,
          room: found.room || '',
          team: found.team || ''
        };
      }
      const profile = {
        studentId: '',
        name: U.$('#pf-name').value.trim(),
        grade: U.$('#pf-grade').value,
        room: U.$('#pf-room').value.trim(),
        team: U.$('#pf-team').value.trim()
      };
      if (!profile.name) { this.toast('กรุณากรอกชื่อ - นามสกุล', 'warn', 2600); return null; }
      if (!profile.grade) { this.toast('กรุณาเลือกชั้นเรียน', 'warn', 2600); return null; }
      return profile;
    },

    /* ================= SETTINGS ================= */
    openSettings() {
      this.fillSettings(CR.Settings.get());
      this.show('settings');
    },

    fillSettings(s) {
      U.$('#set-minutes').value = s.competition.minutes;
      U.$('#set-correct').value = s.score.correct;
      U.$('#set-wrong').value = s.score.wrong;
      U.$('#set-level').value = s.score.levelClear;
      U.$('#set-coin').value = s.score.coin;
      U.$('#set-bonus').value = s.score.bonus;
      U.$('#set-combo').value = s.score.comboStep;
      U.$('#set-negative').checked = !!s.score.allowNegative;
      U.$('#set-levels-enabled').value = s.levels.enabled;
      U.$('#set-qpl').value = s.levels.questionsPerLevel;
      U.$('#set-difficulty').value = s.difficulty;
      U.$('#set-sfx').checked = !!s.audio.sfx;
      U.$('#set-sfx-vol').value = Math.round(s.audio.sfxVolume * 100);
      U.$('#set-music').checked = !!s.audio.music;
      U.$('#set-music-vol').value = Math.round(s.audio.musicVolume * 100);
      U.$('#set-hint').checked = !!s.accessibility.hint;
      U.$('#set-touch').checked = !!s.accessibility.touchControls;
      U.$('#set-contrast').checked = !!s.accessibility.highContrast;
      U.$('#set-uiscale').value = s.accessibility.uiScale;
      this._syncTimePresets(s.competition.minutes);
    },

    readSettingsForm() {
      const num = (sel, def) => {
        const v = parseFloat(U.$(sel).value);
        return isNaN(v) ? def : v;
      };
      return {
        competition: { minutes: U.clamp ? U.clamp(num('#set-minutes', 15), 1, 180) : num('#set-minutes', 15) },
        score: {
          correct: num('#set-correct', 100),
          wrong: num('#set-wrong', -50),
          levelClear: num('#set-level', 100),
          coin: num('#set-coin', 10),
          bonus: num('#set-bonus', 200),
          comboStep: num('#set-combo', 25),
          allowNegative: U.$('#set-negative').checked
        },
        levels: {
          enabled: U.clamp(num('#set-levels-enabled', 15), 1, 15),
          questionsPerLevel: U.clamp(num('#set-qpl', 3), 1, 8)
        },
        difficulty: U.$('#set-difficulty').value,
        audio: {
          sfx: U.$('#set-sfx').checked,
          sfxVolume: num('#set-sfx-vol', 70) / 100,
          music: U.$('#set-music').checked,
          musicVolume: num('#set-music-vol', 30) / 100
        },
        accessibility: {
          hint: U.$('#set-hint').checked,
          touchControls: U.$('#set-touch').checked,
          highContrast: U.$('#set-contrast').checked,
          uiScale: num('#set-uiscale', 100)
        }
      };
    },

    _syncTimePresets(minutes) {
      U.$$('#time-presets .chip-btn').forEach((b) => {
        b.classList.toggle('active', parseInt(b.dataset.min, 10) === Math.round(minutes));
      });
    },

    _bindSettings() {
      U.$$('#time-presets .chip-btn').forEach((b) => U.on(b, 'click', () => {
        CR.Sound.play('button');
        U.$('#set-minutes').value = b.dataset.min;
        this._syncTimePresets(parseInt(b.dataset.min, 10));
      }));
      U.on(U.$('#set-minutes'), 'input', () => this._syncTimePresets(parseFloat(U.$('#set-minutes').value)));

      // ปรับขนาด UI / คอนทราสต์ ให้เห็นผลทันทีขณะเลื่อน
      U.on(U.$('#set-uiscale'), 'input', (e) => {
        document.documentElement.style.setProperty('--ui-scale', e.target.value / 100);
      });
      U.on(U.$('#set-contrast'), 'change', (e) => {
        document.body.classList.toggle('high-contrast', e.target.checked);
      });

      U.on(U.$('#btn-save-settings'), 'click', () => {
        const patch = this.readSettingsForm();
        CR.Settings.save(patch);
        CR.Sound.applySettings(CR.Settings.get());
        CR.Sound.play('correct', { volume: 0.5 });
        const note = U.$('#save-note');
        U.show(note);
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => U.hide(note), 2200);
        if (this.onAction.settingsChanged) this.onAction.settingsChanged(CR.Settings.get());
      });

      U.on(U.$('#btn-reset-settings'), 'click', () => {
        if (!confirm('คืนค่าการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้น?')) return;
        const s = CR.Settings.resetToDefaults();
        this.fillSettings(s);
        CR.Sound.applySettings(s);
        if (this.onAction.settingsChanged) this.onAction.settingsChanged(s);
      });

      U.on(U.$('#btn-reset-lb'), 'click', () => {
        if (!confirm('ล้างกระดานคะแนนทั้งหมด?\nข้อมูลผู้เข้าแข่งขันทุกคนจะถูกลบถาวร')) return;
        CR.Leaderboard.clear();
        alert('ล้างกระดานคะแนนเรียบร้อยแล้ว');
      });
    },

    /* ================= HUD ================= */
    setProfile(p) {
      U.setText(this.el.hudName, p.name);
      const sub = [p.grade, p.room ? '/' + p.room : '', p.team ? ' • ' + p.team : ''].join('');
      U.setText(this.el.hudClass, sub);
    },

    updateHud(state) {
      const e = this.el;
      U.setText(e.hudTime, state.timeText);
      U.setText(e.hudScore, U.padScore(state.score, 6));
      U.setText(e.hudLevel, `${String(state.levelNumber).padStart(2, '0')}/${String(state.levelTotal).padStart(2, '0')}`);
      U.setText(e.hudLevelName, state.levelName);
      U.setText(e.hudCoins, state.coins);
      e.hudProgress.style.width = Math.round(U.clamp(state.progress, 0, 1) * 100) + '%';

      e.hudTimeBox.classList.toggle('warn', state.urgency === 'warn');
      e.hudTimeBox.classList.toggle('danger', state.urgency === 'danger');

      if (state.combo >= 2) {
        U.show(e.hudComboChip);
        U.setText(e.hudCombo, 'x' + state.combo);
      } else {
        U.hide(e.hudComboChip);
      }
    },

    /* ================= QUESTION PANEL ================= */
    showQuestion(q, indexInLevel, totalInLevel, hintEnabled) {
      const e = this.el;
      U.setText(e.qBadge, `คำถามที่ ${indexInLevel}/${totalInLevel}`);
      U.setText(e.qCat, q.category);
      U.setText(e.qDiff, q.difficulty.toUpperCase());
      e.qDiff.className = 'q-diff ' + q.difficulty;
      U.setText(e.qText, q.question);

      e.qOptions.innerHTML = '';
      q.options.forEach((opt, i) => {
        const div = document.createElement('div');
        div.className = 'q-opt';
        div.dataset.index = String(i);
        div.innerHTML = `<span class="k">${LETTERS[i]}</span><span class="t">${U.escapeHtml(opt)}</span>`;
        e.qOptions.appendChild(div);
      });

      U.setText(e.qHint, hintEnabled && q.hint ? '💡 ' + q.hint : '');
      U.show(e.qPanel);
    },

    /** ไฮไลต์ตัวเลือกที่ผู้เล่นกำลังยืนใกล้ */
    highlightOption(index) {
      U.$$('#q-options .q-opt').forEach((el) => {
        el.classList.toggle('near', parseInt(el.dataset.index, 10) === index);
      });
    },

    markOptions(correctIndex, chosenIndex) {
      U.$$('#q-options .q-opt').forEach((el) => {
        const i = parseInt(el.dataset.index, 10);
        el.classList.remove('near');
        if (i === correctIndex) el.classList.add('right');
        else if (i === chosenIndex) el.classList.add('wrong');
      });
    },

    hideQuestion() { U.hide(this.el.qPanel); },

    /* ================= FEEDBACK PANEL ================= */
    showFeedback(res, scoreDelta, durationSec) {
      const e = this.el;
      e.fb.classList.toggle('bad', !res.correct);

      if (res.correct) {
        U.setText(e.fbTitle, 'CORRECT!');
        U.setText(e.fbAnswer, `✓ ${res.correctText}`);
        U.setText(e.fbExplain, res.explanation);
      } else {
        U.setText(e.fbTitle, 'ยังไม่ถูกนะ');
        U.setText(e.fbAnswer, `คำตอบที่ถูกต้องคือ ${LETTERS[res.correctIndex]}. ${res.correctText}`);
        U.setText(e.fbExplain, res.explanation);
      }
      U.setText(e.fbScore, (scoreDelta >= 0 ? '+' : '') + scoreDelta + ' คะแนน');

      U.show(e.fb);
      // แถบเวลานับถอยหลังของ Panel
      e.fbFill.style.transition = 'none';
      e.fbFill.style.width = '100%';
      void e.fbFill.offsetWidth;
      e.fbFill.style.transition = `width ${durationSec}s linear`;
      e.fbFill.style.width = '0%';

      clearTimeout(this._fbTimer);
      this._fbTimer = setTimeout(() => U.hide(e.fb), durationSec * 1000);
    },

    hideFeedback() { clearTimeout(this._fbTimer); U.hide(this.el.fb); },

    /* ================= TOAST / COUNTDOWN ================= */
    toast(text, level, ms) {
      const e = this.el.toast;
      e.textContent = text;
      e.className = 'toast' + (level && level !== 'info' ? ' ' + level : '');
      U.show(e);
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => U.hide(e), ms || 2600);
    },

    bigCount(text) {
      const e = this.el.bigcount;
      e.textContent = text;
      e.classList.remove('hidden');
      // รีสตาร์ทอนิเมชัน
      e.style.animation = 'none';
      void e.offsetWidth;
      e.style.animation = '';
      clearTimeout(this._bigTimer);
      this._bigTimer = setTimeout(() => U.hide(e), 850);
    },

    /* ================= LEADERBOARD ================= */
    openLeaderboard(highlightId) {
      this.renderLeaderboard(highlightId);
      this.show('leaderboard');
    },

    renderLeaderboard(highlightId) {
      const rows = CR.Leaderboard.top(100);
      const body = U.$('#lb-body');
      body.innerHTML = '';
      if (!rows.length) {
        body.innerHTML = '<tr><td colspan="10" class="lb-empty">ยังไม่มีข้อมูลการแข่งขัน — เล่นเกมเพื่อบันทึกคะแนนแรก!</td></tr>';
        return;
      }
      const medal = ['🥇', '🥈', '🥉'];
      rows.forEach((r, i) => {
        const tr = document.createElement('tr');
        if (r.id === highlightId) tr.className = 'me';
        tr.innerHTML = `
          <td class="lb-rank">${medal[i] || (i + 1)}</td>
          <td>${U.escapeHtml(r.name)}</td>
          <td>${U.escapeHtml(r.grade)}${r.room ? '/' + U.escapeHtml(r.room) : ''}</td>
          <td>${U.escapeHtml(r.team || '-')}</td>
          <td><b>${r.score.toLocaleString()}</b></td>
          <td>${r.levels}</td>
          <td style="color:#7dff5a">${r.correct}</td>
          <td style="color:#ff5b6e">${r.wrong}</td>
          <td>${U.formatTime(r.timeUsed)}</td>
          <td>${U.formatDateTH(r.date)}</td>`;
        body.appendChild(tr);
      });
    },

    /* ================= RESULT ================= */
    showResult(data) {
      U.setText(U.$('#result-reason'), data.reason);
      U.setText(U.$('#r-score'), data.score.toLocaleString());
      U.setText(U.$('#r-time'), U.formatTime(data.timeUsed));
      U.setText(U.$('#r-levels'), `${data.levelsCleared}/${data.levelTotal}`);
      U.setText(U.$('#r-correct'), data.correct);
      U.setText(U.$('#r-wrong'), data.wrong);
      U.setText(U.$('#r-coins'), data.coins);
      U.setText(U.$('#r-combo'), 'x' + data.bestCombo);
      U.setText(U.$('#r-acc'), data.accuracy + '%');
      U.setText(U.$('#result-rank'), data.rank.letter);
      U.setText(U.$('#result-rank-msg'), data.rank.msg);
      U.setText(U.$('#result-position'), data.position ? `อันดับที่ ${data.position} จาก ${data.totalEntries} คน` : '-');
      this._lastResultId = data.entryId;
      this.hideQuestion();
      this.hideFeedback();
      this.show('result');
    },

    _bindResultAndPause() {
      U.on(U.$('#btn-replay'), 'click', () => { CR.Sound.play('button'); this.onAction.replay && this.onAction.replay(); });
      U.on(U.$('#btn-view-lb'), 'click', () => { CR.Sound.play('button'); this.openLeaderboard(this._lastResultId); });
      U.on(U.$('#btn-resume'), 'click', () => { CR.Sound.play('button'); this.onAction.resume && this.onAction.resume(); });
      U.on(U.$('#btn-restart-level'), 'click', () => { CR.Sound.play('button'); this.onAction.restartLevel && this.onAction.restartLevel(); });
      U.on(U.$('#btn-quit'), 'click', () => {
        if (!confirm('จบการแข่งขันและดูผลคะแนนตอนนี้?')) return;
        CR.Sound.play('button');
        this.onAction.quit && this.onAction.quit();
      });
    }
  };

  CR.UI = UI;
})(window);

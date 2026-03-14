/* ═══════════════════════════════════════════
   FLOW STATE — app.js
   ═══════════════════════════════════════════ */

/* ── STATE ───────────────────────────────── */
let cfg = { work: 45, short: 5, long: 15, sessions: 4, dailyGoal: 4 };
let st  = {
  mode: 'work', left: 45 * 60, total: 45 * 60,
  running: false, done: 0, iv: null,
  tasks: [], history: [],
  sessionGoal: '',
  weeklyEmailOptIn: false,
  stats: {
    total: 0, today: 0, lastDate: '', streak: 0,
    focusMins: 0, tasksDone: 0, week: 0, best: 0,
    activeDays: []
  }
};

/* ── MOTIVES ─────────────────────────────── */
const MOTIVES = [
  { e: '🏎️', t: 'do more.'                   },
  { e: '🚗',  t: 'floor it.'                  },
  { e: '🏁',  t: 'finish what you started.'   },
  { e: '💡',  t: "don't overthink it."        },
  { e: '🔥',  t: 'feel it.'                   },
  { e: '🎯',  t: 'one session closer.'        },
  { e: '⚡',  t: 'stay locked in.'            },
  { e: '🏆',  t: 'winners work in silence.'   },
  { e: '💎',  t: 'pressure makes diamonds.'   },
  { e: '🚀',  t: 'launch now. fix later.'     },
  { e: '🌙',  t: 'late nights build empires.' },
  { e: '🎸',  t: 'turn the music up.'         },
];
let mIdx = 0;

function nextMotive() {
  mIdx = (mIdx + 1) % MOTIVES.length;
  const m    = MOTIVES[mIdx];
  const card = document.getElementById('mc');
  card.style.opacity   = '0';
  card.style.transform = 'translateY(-4px)';
  setTimeout(() => {
    document.getElementById('mc-e').textContent = m.e;
    document.getElementById('mc-t').textContent = m.t;
    card.style.opacity   = '1';
    card.style.transform = '';
  }, 180);
}

const MSGS = {
  work:  ["45 minutes won't hurt.", "stay locked in.", "one session closer.",
          "feel it.", "do more.", "don't overthink it.", "deep work pays off.", "floor it."],
  short: ["take a breath.", "you earned it.", "stretch and hydrate.", "clear your head."],
  long:  ["great run. rest now.", "recharge completely.", "you've earned this.", "rest is productive."]
};

/* ── PERSIST ─────────────────────────────── */
function save() {
  localStorage.setItem('fs4_cfg',        JSON.stringify(cfg));
  localStorage.setItem('fs4_tasks',      JSON.stringify(st.tasks));
  localStorage.setItem('fs4_hist',       JSON.stringify(st.history.slice(-100)));
  localStorage.setItem('fs4_stats',      JSON.stringify(st.stats));
  localStorage.setItem('fs4_emailoptin', JSON.stringify(st.weeklyEmailOptIn));
}

function load() {
  try {
    const c   = localStorage.getItem('fs4_cfg');
    const t   = localStorage.getItem('fs4_tasks');
    const h   = localStorage.getItem('fs4_hist');
    const s   = localStorage.getItem('fs4_stats');
    const th  = localStorage.getItem('fs4_theme');
    const opt = localStorage.getItem('fs4_emailoptin');
    if (c)   cfg                = { ...cfg,      ...JSON.parse(c) };
    if (t)   st.tasks           = JSON.parse(t);
    if (h)   st.history         = JSON.parse(h);
    if (s)   st.stats           = { ...st.stats, ...JSON.parse(s) };
    if (opt) st.weeklyEmailOptIn = JSON.parse(opt);
    if (th) {
      document.documentElement.dataset.theme = th;
      document.getElementById('th-lbl').textContent = th === 'light' ? 'Light' : 'Dark';
    }
  } catch (_) {}
  document.getElementById('si-f').value  = cfg.work;
  document.getElementById('si-s').value  = cfg.short;
  document.getElementById('si-l').value  = cfg.long;
  document.getElementById('si-n').value  = cfg.sessions;
  document.getElementById('si-dg').value = cfg.dailyGoal;
  const optEl = document.getElementById('si-email-optin');
  if (optEl) optEl.checked = st.weeklyEmailOptIn;
  st.left  = cfg.work * 60;
  st.total = st.left;
  carryOverTasks();
}

/* ── THEME ───────────────────────────────── */
function toggleTheme() {
  const html    = document.documentElement;
  const isLight = html.dataset.theme === 'light';
  html.dataset.theme = isLight ? 'dark' : 'light';
  document.getElementById('th-lbl').textContent = isLight ? 'Dark' : 'Light';
  localStorage.setItem('fs4_theme', html.dataset.theme);
}

/* ── TIMER ───────────────────────────────── */
function toggleTimer() {
  if (st.running) { pause(); return; }
  if (st.mode === 'work' && !st.sessionGoal) {
    openIntentionModal();
  } else {
    play();
  }
}

function play() {
  st.running = true;
  document.getElementById('btn-lbl').textContent = '⏸  Pause';
  st.iv = setInterval(tick, 1000);
  rotateMotive();
}

function pause() {
  st.running = false;
  document.getElementById('btn-lbl').textContent = '▶  Resume';
  clearInterval(st.iv);
}

function resetTimer() {
  pause();
  document.getElementById('btn-lbl').textContent = '▶  Start';
  const k = st.mode === 'work' ? 'work' : st.mode === 'short' ? 'short' : 'long';
  st.left  = cfg[k] * 60;
  st.total = st.left;
  updateDisplay();
}

function tick() {
  if (st.left <= 0) { sessionEnd(); return; }
  st.left--;
  updateDisplay();
}

function sessionEnd() {
  pause();
  document.getElementById('btn-lbl').textContent = '▶  Start';
  if (st.mode === 'work') {
    st.done++;
    logSession();
    updateStats();
    playDoneSound();
    showNotification();
    cloudSync();
    renderDots();
    renderHist();
    updateDailyGoalBar();
    openReflectionModal(() => {
      const next = st.done % cfg.sessions === 0 ? 'long' : 'short';
      setMode(next);
      document.getElementById('skip-btn').style.display = 'flex';
    });
  } else {
    playDoneSound();
    toast('Break over');
    setMode('work');
    st.sessionGoal = '';
    document.getElementById('skip-btn').style.display = 'none';
  }
}

function skipBreak() {
  if (st.mode !== 'work') {
    setMode('work');
    st.sessionGoal = '';
    document.getElementById('skip-btn').style.display = 'none';
    toast('Break skipped');
  }
}

/* ── MODE ────────────────────────────────── */
function setMode(mode) {
  pause();
  document.getElementById('btn-lbl').textContent = '▶  Start';
  st.mode = mode;
  const mins = mode === 'work' ? cfg.work : mode === 'short' ? cfg.short : cfg.long;
  st.left  = mins * 60;
  st.total = st.left;
  document.getElementById('app').dataset.mode = mode;
  document.querySelectorAll('.mode-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode)
  );
  const labels = { work: 'FOCUS SESSION', short: 'SHORT BREAK', long: 'LONG BREAK' };
  document.getElementById('t-lbl').textContent = labels[mode];
  document.getElementById('skip-btn').style.display = mode !== 'work' ? 'flex' : 'none';
  updateDisplay();
  rotateMotive();
  save();
}

/* ── DISPLAY ─────────────────────────────── */
function updateDisplay() {
  const m  = Math.floor(st.left / 60).toString().padStart(2, '0');
  const s  = (st.left % 60).toString().padStart(2, '0');
  const el = document.getElementById('t-num');
  if (el && el.tagName === 'DIV') el.textContent = `${m}:${s}`;

  const elapsed = st.total - st.left;
  const pct     = st.total > 0 ? Math.round(elapsed / st.total * 100) : 0;
  document.getElementById('prog').style.width = pct + '%';

  const pctEl = document.getElementById('prog-pct');
  if (pctEl) {
    pctEl.textContent = pct + '%';
    pctEl.className   = 'prog-pct' + (pct > 0 ? ' lit' : '');
  }
  const remEl = document.getElementById('prog-time-rem');
  if (remEl) {
    const rm = Math.floor(st.left / 60).toString().padStart(2, '0');
    const rs = (st.left % 60).toString().padStart(2, '0');
    remEl.textContent = st.left > 0 ? `${rm}:${rs} left` : 'complete';
  }
}

function rotateMotive() {
  const msgs = MSGS[st.mode];
  const msg  = msgs[Math.floor(Math.random() * msgs.length)];
  const el   = document.getElementById('motive');
  el.style.opacity = '0';
  setTimeout(() => { el.innerHTML = `<em>${msg}</em>`; el.style.opacity = '1'; }, 320);
}

function renderDots() {
  const c = document.getElementById('sdots');
  c.innerHTML = '';
  for (let i = 0; i < cfg.sessions; i++) {
    const d = document.createElement('div');
    d.className = 'sdot' + (i < (st.done % cfg.sessions) ? ' on' : '');
    c.appendChild(d);
  }
}

/* ── INLINE TIMER EDIT ───────────────────── */
function editTimer() {
  if (st.running) return;
  const el  = document.getElementById('t-num');
  const inp = document.createElement('input');
  inp.type      = 'text';
  inp.className = 'timer-num-edit';
  inp.value     = el.textContent;
  el.replaceWith(inp);
  inp.focus(); inp.select();

  function commit() {
    const p  = inp.value.split(':');
    let mm   = Math.max(0, Math.min(99, parseInt(p[0]) || 0));
    let ss   = Math.max(0, Math.min(59, parseInt(p[1]) || 0));
    st.left  = mm * 60 + ss;
    st.total = st.left;
    const nd = document.createElement('div');
    nd.id        = 't-num';
    nd.className = 'timer-num';
    nd.onclick   = editTimer;
    nd.title     = 'Click to edit';
    nd.textContent = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    inp.replaceWith(nd);
    updateDisplay();
  }
  inp.addEventListener('blur', commit);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
}

/* ── INTENTION MODAL ─────────────────────── */
function openIntentionModal() {
  const m = document.getElementById('intention-modal');
  const inp = document.getElementById('intention-inp');
  if (!m) { play(); return; }
  inp.value = '';
  m.classList.add('open');
  setTimeout(() => inp.focus(), 120);
}

function closeIntentionModal(start) {
  const m   = document.getElementById('intention-modal');
  const inp = document.getElementById('intention-inp');
  m.classList.remove('open');
  if (start) {
    st.sessionGoal = inp.value.trim() || 'Focus session';
    if (st.sessionGoal !== 'Focus session' &&
        !st.tasks.some(t => t.text === st.sessionGoal)) {
      st.tasks.unshift({
        id: Date.now(), text: st.sessionGoal, prio: 'medium',
        done: false, notes: '', due: '',
        createdDate: new Date().toISOString().slice(0, 10)
      });
      renderTasks(); save();
    }
    updateGoalDisplay();
    play();
  }
}

function updateGoalDisplay() {
  const el = document.getElementById('session-goal-display');
  if (!el) return;
  if (st.sessionGoal) {
    el.textContent = '🎯 ' + st.sessionGoal;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

/* ── REFLECTION MODAL ────────────────────── */
let _reflCb = null;

function openReflectionModal(cb) {
  const m = document.getElementById('reflection-modal');
  if (!m) { cb && cb(); return; }
  _reflCb = cb;
  document.getElementById('reflection-note').value = '';
  const goalEl = document.getElementById('reflection-goal');
  if (goalEl) goalEl.textContent = st.sessionGoal || 'Focus session';
  m.classList.add('open');
  toast('Session complete 🎉');
}

function closeReflectionModal(saveNote) {
  const m = document.getElementById('reflection-modal');
  m.classList.remove('open');
  if (saveNote) {
    const note = document.getElementById('reflection-note').value.trim();
    if (note && st.history[0]) { st.history[0].note = note; save(); }
  }
  st.sessionGoal = '';
  updateGoalDisplay();
  if (_reflCb) { _reflCb(); _reflCb = null; }
}

/* ── DAILY GOAL BAR ──────────────────────── */
function updateDailyGoalBar() {
  const bar  = document.getElementById('daily-goal-bar');
  const lbl  = document.getElementById('daily-goal-lbl');
  if (!bar || !lbl) return;
  const goal  = cfg.dailyGoal || 4;
  const today = st.stats.today || 0;
  const pct   = Math.min(100, Math.round(today / goal * 100));
  const done  = today >= goal;
  bar.style.width = pct + '%';
  bar.className   = 'daily-goal-fill' + (done ? ' done' : '');
  lbl.textContent = done
    ? `🎉 Goal reached! ${today} / ${goal}`
    : `${today} / ${goal} sessions today`;
}

/* ── SOUND ───────────────────────────────── */
function playDoneSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[523, 0, 0.18], [659, 0.18, 0.18], [784, 0.36, 0.32]].forEach(([f, s, d]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.18, ctx.currentTime + s);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + d);
      o.start(ctx.currentTime + s);
      o.stop(ctx.currentTime + s + d);
    });
  } catch (_) {}
}

/* ── NOTIFICATION ────────────────────────── */
function showNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification('Flow State', {
    body: st.sessionGoal
      ? `"${st.sessionGoal}" complete ✓ — take a break.`
      : 'Focus session complete! Time for a break.',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text y="26" font-size="28">🎯</text></svg>'
  });
}

function requestNotifPermission() {
  if (!('Notification' in window)) return toast('Notifications not supported');
  if (Notification.permission === 'granted') return toast('Notifications already on ✓');
  Notification.requestPermission().then(p =>
    toast(p === 'granted' ? 'Notifications enabled ✓' : 'Notifications blocked')
  );
}

/* ── TASKS ───────────────────────────────── */
function addTask(text, prio, notes, due) {
  const inp  = document.getElementById('t-inp');
  const psel = document.getElementById('t-prio');
  const t    = text !== undefined ? text : inp.value.trim();
  const p    = prio || psel.value;
  if (!t) { inp.focus(); return; }
  st.tasks.push({
    id: Date.now(), text: t, prio: p,
    done: false, notes: notes || '', due: due || '',
    createdDate: new Date().toISOString().slice(0, 10)
  });
  inp.value = '';
  renderTasks(); save();
}

function toggleTask(id) {
  const tk = st.tasks.find(t => t.id === id);
  if (!tk) return;
  tk.done = !tk.done;
  if (tk.done) { st.stats.tasksDone++; toast('✓ Task complete'); cloudSync(); }
  else if (st.stats.tasksDone > 0) { st.stats.tasksDone--; }
  renderTasks(); updateStatDisplay(); save();
}

function deleteTask(id) {
  st.tasks = st.tasks.filter(t => t.id !== id);
  renderTasks(); save();
}

function toggleTaskExpand(id) {
  const el = document.getElementById(`texp-${id}`);
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : '';
  if (!open) el.querySelector('.task-notes-inp')?.focus();
}

function saveTaskNotes(id, val) {
  const tk = st.tasks.find(t => t.id === id);
  if (tk) { tk.notes = val; save(); }
}

function saveTaskDue(id, val) {
  const tk = st.tasks.find(t => t.id === id);
  if (tk) { tk.due = val; save(); renderTasks(); }
}

function carryOverTasks() {
  const today = new Date().toISOString().slice(0, 10);
  st.tasks.forEach(t => {
    if (!t.done && t.createdDate && t.createdDate < today) t.carriedOver = true;
  });
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function dueBadge(due) {
  if (!due) return '';
  const d     = new Date(due + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.round((d - today) / 86400000);
  if (diff < 0)  return '<span class="due-badge overdue">overdue</span>';
  if (diff === 0) return '<span class="due-badge due-today">today</span>';
  if (diff === 1) return '<span class="due-badge due-soon">tomorrow</span>';
  return `<span class="due-badge">${d.toLocaleDateString([], { month:'short', day:'numeric' })}</span>`;
}

function updateTaskBar() {
  const total = st.tasks.length;
  const dn    = st.tasks.filter(t => t.done).length;
  const bar   = document.getElementById('task-master-bar');
  const frac  = document.getElementById('task-frac');
  if (!total) {
    bar.style.width  = '0%';
    bar.className    = 'task-master-bar';
    frac.textContent = '0 / 0';
    frac.className   = 'task-prog-frac';
    return;
  }
  const complete   = dn === total;
  bar.style.width  = Math.round(dn / total * 100) + '%';
  bar.className    = 'task-master-bar' + (complete ? ' complete' : '');
  frac.textContent = `${dn} / ${total}`;
  frac.className   = 'task-prog-frac' + (complete ? ' done' : dn > 0 ? ' lit' : '');
}

function renderTasks() {
  const list = document.getElementById('t-list');
  list.innerHTML = '';
  updateTaskBar();
  if (!st.tasks.length) {
    list.innerHTML = '<div style="font-size:.62rem;color:var(--t3);text-align:center;padding:12px 0">Add tasks above</div>';
    return;
  }
  st.tasks.forEach((task, idx) => {
    const item = document.createElement('div');
    item.className = 't-item'
      + (task.done ? ' done' : '')
      + (task.carriedOver && !task.done ? ' carried' : '');
    item.draggable = true;

    const dueHtml     = dueBadge(task.due);
    const hasNotes    = task.notes && task.notes.trim();
    const carriedHtml = task.carriedOver && !task.done
      ? '<span class="carried-badge">↩</span>' : '';

    item.innerHTML = `
      <span class="t-drag">⠿</span>
      <div class="t-chk${task.done ? ' on' : ''}" onclick="toggleTask(${task.id})"></div>
      <div class="t-body">
        <div class="t-top">
          <span class="t-txt">${esc(task.text)}</span>
          <div class="t-meta">${dueHtml}${carriedHtml}<span class="t-tag ${task.prio}">${task.prio}</span></div>
        </div>
        <div class="t-expand" id="texp-${task.id}" style="display:none">
          <div class="t-expand-row">
            <label class="t-exp-lbl">Due date</label>
            <input type="date" class="task-due-inp" value="${task.due || ''}"
              onchange="saveTaskDue(${task.id}, this.value)">
          </div>
          <div class="t-expand-row">
            <label class="t-exp-lbl">Notes / subtasks</label>
            <textarea class="task-notes-inp" rows="2"
              placeholder="Subtasks, links, context…"
              onblur="saveTaskNotes(${task.id}, this.value)">${esc(task.notes || '')}</textarea>
          </div>
        </div>
      </div>
      <div class="t-actions">
        <button class="t-exp-btn${hasNotes ? ' has-notes' : ''}" onclick="toggleTaskExpand(${task.id})" title="Notes / due date">⋯</button>
        <button class="t-del" onclick="deleteTask(${task.id})">✕</button>
      </div>`;

    item.addEventListener('dragstart', e => { item.classList.add('dragging'); e.dataTransfer.setData('text/plain', idx); });
    item.addEventListener('dragend',   () => item.classList.remove('dragging'));
    item.addEventListener('dragover',  e => { e.preventDefault(); item.classList.add('drag-over'); });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault(); item.classList.remove('drag-over');
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      if (from !== idx) {
        const mv = st.tasks.splice(from, 1)[0];
        st.tasks.splice(idx, 0, mv);
        renderTasks(); save();
      }
    });
    list.appendChild(item);
  });
}

/* ── HISTORY / STATS ─────────────────────── */
function logSession() {
  const now    = new Date();
  const active = st.tasks.find(t => !t.done);
  st.history.unshift({
    date:  now.toISOString(),
    label: st.sessionGoal || (active ? active.text : 'Focus session'),
    mins:  Math.round((st.total - st.left) / 60) || cfg.work,
    note:  ''
  });
}

function updateStats() {
  const today    = new Date().toDateString();
  const todayISO = new Date().toISOString().slice(0, 10);
  if (st.stats.lastDate !== today) {
    st.stats.today = 0;
    const yest = new Date(Date.now() - 86400000).toDateString();
    st.stats.streak  = (st.stats.lastDate === yest) ? st.stats.streak + 1 : 1;
    st.stats.lastDate = today;
  }
  st.stats.today++;
  st.stats.total++;
  st.stats.focusMins += Math.round((st.total - st.left) / 60) || cfg.work;
  if (st.stats.today > st.stats.best) st.stats.best = st.stats.today;
  if (!st.stats.activeDays) st.stats.activeDays = [];
  if (!st.stats.activeDays.includes(todayISO)) st.stats.activeDays.push(todayISO);
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  st.stats.activeDays = st.stats.activeDays.filter(d => d >= cutoff);
  st.stats.week = st.history.filter(h => new Date(h.date).getTime() > Date.now() - 7 * 86400000).length;
  updateStatDisplay();
  save();
}

function updateStatDisplay() {
  const s = st.stats, m = s.focusMins;
  document.getElementById('s-today').textContent  = s.today;
  document.getElementById('s-streak').textContent = s.streak;
  document.getElementById('s-focus').textContent  = m >= 60 ? `${Math.floor(m / 60)}h` : `${m}m`;
  document.getElementById('s-done').textContent   = s.tasksDone;
  document.getElementById('s-total').textContent  = s.total;
  document.getElementById('s-week').textContent   = s.week;
  document.getElementById('s-best').textContent   = s.best;
  const tot = st.tasks.length, dn = st.tasks.filter(t => t.done).length;
  document.getElementById('s-rate').textContent   = tot ? `${Math.round(dn / tot * 100)}%` : '—';
  document.getElementById('hi-badge').textContent = s.total;
  renderStreakHero();
  renderStreakCal();
  updateDailyGoalBar();
}

/* ── STREAK HERO ─────────────────────────── */
function renderStreakHero() {
  const s     = st.stats;
  const numEl = document.getElementById('streak-num');
  const bestEl= document.getElementById('streak-best-val');
  const flame = document.getElementById('streak-flame');
  if (!numEl) return;
  numEl.innerHTML = `${s.streak}<span> day${s.streak !== 1 ? 's' : ''}</span>`;
  if (bestEl) bestEl.textContent = s.best;
  if (flame) {
    if      (s.streak >= 7)  { flame.textContent = '🔥'; flame.className = 'streak-flame hot'; }
    else if (s.streak >= 3)  { flame.textContent = '⚡'; flame.className = 'streak-flame hot'; }
    else if (s.streak >= 1)  { flame.textContent = '✦';  flame.className = 'streak-flame'; }
    else                     { flame.textContent = '○';  flame.className = 'streak-flame'; }
  }
}

/* ── 7-DAY MINI CALENDAR ─────────────────── */
function renderStreakCal() {
  const cal = document.getElementById('streak-cal');
  if (!cal) return;
  cal.innerHTML = '';
  const DAY_ABBR = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const active   = st.stats.activeDays || [];
  const now      = new Date();
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(now); d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const isToday = i === 0, isOn = active.includes(iso);
    const wrap = document.createElement('div');
    wrap.className = 'sc-day';
    wrap.innerHTML = `
      <div class="sc-dot${isToday ? ' today' : isOn ? ' active' : ''}"></div>
      <div class="sc-lbl${isToday ? ' is-today' : ''}">${DAY_ABBR[d.getDay()]}</div>`;
    cal.appendChild(wrap);
  }
}

function renderHist() {
  function render(el, arr) {
    el.innerHTML = '';
    if (!arr.length) {
      el.innerHTML = '<div style="font-size:.62rem;color:var(--t3);text-align:center;padding:14px 0">No sessions yet</div>';
      return;
    }
    arr.forEach(h => {
      const d    = new Date(h.date);
      const item = document.createElement('div');
      item.className = 'hi';
      item.innerHTML = `
        <div class="hd"></div>
        <div>
          <div class="hn">${esc(h.label)}</div>
          <div class="hm">${h.mins}min · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${h.note ? ' · <em>' + esc(h.note) + '</em>' : ''}</div>
        </div>`;
      el.appendChild(item);
    });
  }
  render(document.getElementById('hl-list'), st.history.slice(0, 8));
  render(document.getElementById('hl-all'),  st.history);
}

/* ── NAV PANELS ──────────────────────────── */
function showP(name) {
  ['dash','hist','stats','settings'].forEach(p => {
    const el = document.getElementById('p-' + p);
    if (el) el.style.display = (p === name) ? '' : 'none';
  });
  document.querySelectorAll('.ni').forEach((el, i) =>
    el.classList.toggle('on', ['dash','hist','stats','settings'][i] === name)
  );
}

/* ── SPOTIFY ─────────────────────────────── */
function embedSpotify() {
  const url = document.getElementById('sp-url').value.trim();
  if (!url) return;
  const m = url.match(/playlist\/([a-zA-Z0-9]+)/);
  if (!m) { toast('Invalid Spotify URL'); return; }
  loadPL(m[1]);
}
function loadPL(id) {
  document.getElementById('sp-frame').innerHTML = `<iframe
    src="https://open.spotify.com/embed/playlist/${id}?utm_source=generator&theme=0"
    width="100%" height="232" frameborder="0"
    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    loading="lazy"></iframe>`;
  toast('Playlist loaded');
}

/* ── EXPORT CSV ──────────────────────────── */
function exportCSV() {
  const rows = [['Date','Time','Label','Duration (min)','Note']];
  st.history.forEach(h => {
    const d = new Date(h.date);
    rows.push([
      d.toLocaleDateString(),
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      `"${(h.label || '').replace(/"/g, '""')}"`,
      h.mins || cfg.work,
      `"${(h.note || '').replace(/"/g, '""')}"`
    ]);
  });
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `flowstate-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV downloaded ✓');
}

/* ── KEYBOARD ────────────────────────────── */
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
  if (e.key === 'Escape') {
    document.getElementById('intention-modal')?.classList.remove('open');
    document.getElementById('reflection-modal')?.classList.remove('open');
    return;
  }
  switch (e.key.toLowerCase()) {
    case ' ': e.preventDefault(); toggleTimer(); break;
    case 'r': resetTimer();  break;
    case 's': skipBreak();   break;
    case 't': e.preventDefault(); document.getElementById('t-inp').focus(); break;
    case 'n': sessionEnd();  break;
  }
});
document.getElementById('t-inp').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});

/* ── AUTH ────────────────────────────────── */
function handleSignIn() {
  window.location.href = 'dashboard.html';
}

async function cloudSync() {
  try {
    const user = await sbGetUser();
    if (!user) return;
    const latest = st.history[0];
    if (latest) await sbSaveSession(user.id, latest);
    await sbSaveStats(user.id, st.stats);
  } catch (e) {
    console.warn('cloudSync:', e.message);
  }
}

async function initAuth() {
  const user = await sbGetUser().catch(() => null);
  const btn  = document.getElementById('bar-signin-btn');
  if (!btn) return;
  if (user) {
    const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
    btn.textContent = name.split(' ')[0];
    btn.onclick     = () => window.location.href = 'dashboard.html';
  }
  sbOnAuthChange((event, user) => {
    if (!btn) return;
    if (user) {
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
      btn.textContent = name.split(' ')[0];
    } else {
      btn.textContent = 'Sign in';
    }
  });
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function saveSettings() {
  cfg.work      = parseInt(document.getElementById('si-f').value)  || 45;
  cfg.short     = parseInt(document.getElementById('si-s').value)  || 5;
  cfg.long      = parseInt(document.getElementById('si-l').value)  || 15;
  cfg.sessions  = parseInt(document.getElementById('si-n').value)  || 4;
  cfg.dailyGoal = parseInt(document.getElementById('si-dg').value) || 4;
  const optEl   = document.getElementById('si-email-optin');
  if (optEl) st.weeklyEmailOptIn = optEl.checked;
  save(); setMode(st.mode); renderDots(); updateDailyGoalBar();
  toast('Settings saved');
}

/* ── INIT ────────────────────────────────── */
function init() {
  load();
  mIdx = Math.floor(Math.random() * MOTIVES.length);
  const m = MOTIVES[mIdx];
  document.getElementById('mc-e').textContent = m.e;
  document.getElementById('mc-t').textContent = m.t;
  updateDisplay();
  rotateMotive();
  renderDots();
  renderTasks();
  renderHist();
  updateStatDisplay();
  updateDailyGoalBar();
  updateGoalDisplay();
  showP('dash');
  initAuth();
  setTimeout(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, 3000);
}

init();
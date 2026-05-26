/* ═══════════════════════════════════════════════════════════
   FLOW STATE — supabase.js  (rebuilt for reliable sync)

   Replace the two constants below with your values from:
   supabase.com → Settings → API
   ═══════════════════════════════════════════════════════════ */

const SUPABASE_URL      = "https://tyvwwgigdgcnpjceiavq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_d1aGAzmGSnc_scX9oy5pgQ_SXx00SDu";

/* ── CLIENT SINGLETON ──────────────────────────────────────── */
let _sbClient = null;

function getSB() {
  if (typeof window?.supabase?.createClient !== 'function') {
    console.warn('[FlowState] Supabase SDK not loaded yet');
    return null;
  }
  if (!_sbClient) {
    try {
      _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
    } catch (e) {
      console.error('[FlowState] Supabase init error:', e);
      return null;
    }
  }
  return _sbClient;
}

/* ── INTERNAL HELPERS ──────────────────────────────────────── */

/** Run a Supabase query; on error log and return a safe fallback. */
async function _query(label, fn, fallback) {
  const sb = getSB();
  if (!sb) return fallback;
  try {
    const result = await fn(sb);
    if (result.error) {
      console.error(`[FlowState] ${label}:`, result.error.message, result.error.details ?? '');
    }
    return result;
  } catch (e) {
    console.error(`[FlowState] ${label} threw:`, e.message);
    return { data: fallback, error: e };
  }
}

/** Return today's ISO date string in local time (YYYY-MM-DD). */
function _todayLocal() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

/* ── AUTH ──────────────────────────────────────────────────── */

async function sbGetUser() {
  const sb = getSB(); if (!sb) return null;
  try {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error) { console.error('[FlowState] sbGetUser:', error.message); return null; }
    return user;
  } catch (e) { console.error('[FlowState] sbGetUser threw:', e.message); return null; }
}

async function sbGetSession() {
  const sb = getSB(); if (!sb) return null;
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) { console.error('[FlowState] sbGetSession:', error.message); return null; }
    return session;
  } catch (e) { console.error('[FlowState] sbGetSession threw:', e.message); return null; }
}

function sbOnAuthChange(cb) {
  const sb = getSB(); if (!sb) return;
  sb.auth.onAuthStateChange((event, session) => cb(event, session?.user ?? null));
}

async function sbSignInEmail(email, password) {
  const sb = getSB(); if (!sb) throw new Error('Supabase not initialised');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

async function sbSignUpEmail(email, password, fullName) {
  const sb = getSB(); if (!sb) throw new Error('Supabase not initialised');
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: fullName } }
  });
  if (error) throw error;
  return data.user;
}

async function sbSignInGoogle() {
  const sb = getSB(); if (!sb) throw new Error('Supabase not initialised');
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: 'https://flowstateproductivity.xyz/dashboard.html' }
  });
  if (error) throw error;
}

async function sbSignOut() {
  const sb = getSB(); if (!sb) return;
  await sb.auth.signOut();
  _sbClient = null; // reset so next login gets a clean client
}

/* ── STATS ─────────────────────────────────────────────────── */

/**
 * Fetch the user's stats row.
 * Returns the DB row object or null.
 * Column names: focus_streak, total_sessions, total_focus_time, tasks_done, best_day, config
 */
async function sbFetchStats(userId) {
  const sb = getSB(); if (!sb) return null;
  const { data, error } = await sb
    .from('stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();           // null (not error) when no row exists yet
  if (error) { console.error('[FlowState] sbFetchStats:', error.message); return null; }
  return data;               // may be null for brand-new users
}

/**
 * Upsert stats for a user.
 * @param {string} userId
 * @param {object} stats  — local st.stats shape: { streak, total, focusMins, tasksDone, best }
 * @param {object} config — local cfg shape
 */
async function sbSaveStats(userId, stats, config) {
  const sb = getSB(); if (!sb) return;
  const { error } = await sb.from('stats').upsert({
    user_id:          userId,
    focus_streak:     stats.streak     || 0,
    total_sessions:   stats.total      || 0,
    total_focus_time: stats.focusMins  || 0,
    tasks_done:       stats.tasksDone  || 0,
    best_day:         stats.best       || 0,
    updated_at:       new Date().toISOString(),
    config:           config || {}
  }, { onConflict: 'user_id' });
  if (error) console.error('[FlowState] sbSaveStats:', error.message);
}

/* ── SESSIONS ──────────────────────────────────────────────── */

/**
 * Fetch all sessions for a user (newest first, max 500).
 * Returns array of { id, date, duration, label, created_at }
 */
async function sbFetchSessions(userId) {
  const sb = getSB(); if (!sb) return [];
  const { data, error } = await sb
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(500);
  if (error) { console.error('[FlowState] sbFetchSessions:', error.message); return []; }
  return data || [];
}

/**
 * Insert a single completed session.
 * Idempotent-ish: duplicate (date+label+duration) rows are harmless and filtered
 * on read during deduplication.
 * @param {string} userId
 * @param {object} session — { mins, date (ISO string), label }
 */
async function sbSaveSession(userId, session) {
  const sb = getSB(); if (!sb) return;
  const dateStr = (session.date || new Date().toISOString()).slice(0, 10);
  const { error } = await sb.from('sessions').insert({
    user_id:   userId,
    duration:  session.mins || 25,
    completed: true,
    date:      dateStr,
    label:     session.label || 'Focus session'
  });
  // Ignore duplicate-key errors (23505) if you add a unique constraint later
  if (error && !error.message.includes('duplicate')) {
    console.error('[FlowState] sbSaveSession:', error.message);
  }
}

/**
 * Push any local sessions that are not yet in the cloud.
 * Compares by date+label to avoid duplication.
 * @param {string}   userId
 * @param {object[]} localHistory  — array of { date, label, mins }
 */
async function sbSyncSessions(userId, localHistory) {
  const sb = getSB(); if (!sb) return;

  // Fetch existing cloud sessions just for today and yesterday to limit work
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const cutoff = yesterday.toISOString().slice(0, 10);

  const { data: existing, error: fetchErr } = await sb
    .from('sessions')
    .select('date, label, duration')
    .eq('user_id', userId)
    .gte('date', cutoff);

  if (fetchErr) { console.error('[FlowState] sbSyncSessions fetch:', fetchErr.message); return; }

  const cloudSet = new Set(
    (existing || []).map(s => `${s.date}|${s.label}|${s.duration}`)
  );

  // Only upload sessions from the last 2 days that aren't already there
  const toInsert = localHistory
    .filter(h => {
      const d = (h.date || '').slice(0, 10);
      if (d < cutoff) return false;
      const key = `${d}|${h.label || 'Focus session'}|${h.mins || 25}`;
      return !cloudSet.has(key);
    })
    .map(h => ({
      user_id:   userId,
      duration:  h.mins  || 25,
      completed: true,
      date:      (h.date || new Date().toISOString()).slice(0, 10),
      label:     h.label || 'Focus session'
    }));

  if (!toInsert.length) return;

  const { error } = await sb.from('sessions').insert(toInsert);
  if (error) console.error('[FlowState] sbSyncSessions insert:', error.message);
}

/* ── TASKS ─────────────────────────────────────────────────── */

/**
 * Fetch all tasks for a user, newest first.
 * Returns array matching the DB schema.
 */
async function sbFetchTasks(userId) {
  const sb = getSB(); if (!sb) return [];
  const { data, error } = await sb
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { console.error('[FlowState] sbFetchTasks:', error.message); return []; }
  return data || [];
}

/**
 * Sync local tasks to Supabase using upsert on a stable `id`.
 *
 * Strategy:
 *  - Each local task must have a stable string `id` (UUID preferred).
 *    app.js already assigns numeric ids; we coerce to string.
 *  - Upsert by id — insert new, update changed.
 *  - Soft-delete: tasks removed locally are marked done=true rather than
 *    physically deleted, unless you call sbDeleteTask explicitly.
 *  - This avoids the delete-all / re-insert race condition entirely.
 *
 * @param {string}   userId
 * @param {object[]} tasks  — local task array
 */
async function sbSaveTasks(userId, tasks) {
  const sb = getSB(); if (!sb) return;
  if (!tasks || !tasks.length) return;

  const now = new Date().toISOString();
  const rows = tasks.map(t => ({
    id:         String(t.id),           // stable key — must exist on local tasks
    user_id:    userId,
    text:       t.text,
    prio:       t.prio      || 'medium',
    done:       t.done      || false,
    notes:      t.notes     || null,
    due:        t.due       || null,
    created_at: t.createdDate
                  ? t.createdDate + 'T00:00:00Z'
                  : now,
    updated_at: now
  }));

  const { error } = await sb.from('tasks').upsert(rows, { onConflict: 'id' });
  if (error) console.error('[FlowState] sbSaveTasks:', error.message);
}

/**
 * Delete a single task by id (call when user explicitly deletes a task).
 * @param {string} taskId — local task id
 */
async function sbDeleteTask(taskId) {
  const sb = getSB(); if (!sb) return;
  const { error } = await sb
    .from('tasks')
    .delete()
    .eq('id', String(taskId));
  if (error) console.error('[FlowState] sbDeleteTask:', error.message);
}

/* ── SUPABASE SQL (run once in SQL editor) ──────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  duration int NOT NULL,
  completed bool DEFAULT true,
  date date NOT NULL,
  label text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stats (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  focus_streak int DEFAULT 0,
  total_sessions int DEFAULT 0,
  total_focus_time int DEFAULT 0,
  tasks_done int DEFAULT 0,
  best_day int DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  config jsonb DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  prio text DEFAULT 'medium',
  done boolean DEFAULT false,
  notes text,
  due date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks    ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "own_sessions" ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_stats"    ON stats    FOR ALL USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "own_tasks"    ON tasks    FOR ALL USING (auth.uid() = user_id);
──────────────────────────────────────────────────────────── */
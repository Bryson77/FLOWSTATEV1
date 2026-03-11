/* ═══════════════════════════════════════════
   FLOW STATE — supabase.js
   Auth + cloud data sync.

   Replace the two constants below with your
   values from: supabase.com → Settings → API
   ═══════════════════════════════════════════ */

const SUPABASE_URL      = "https://tyvwwgigdgcnpjceiavq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_d1aGAzmGSnc_scX9oy5pgQ_SXx00SDu";

/* client singleton */
function getSB() {
  if (typeof window.supabase === 'undefined') return null;
  if (!window._sb) window._sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return window._sb;
}

/* ── AUTH ─────────────────────────────────── */
async function sbGetUser() {
  const sb = getSB(); if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function sbGetSession() {
  const sb = getSB(); if (!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  return session;
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
    options:  { redirectTo: window.location.origin + '/FLOWSTATEV1/dashboard.html' }
  });
  if (error) throw error;
}

async function sbSignOut() {
  const sb = getSB(); if (!sb) return;
  await sb.auth.signOut();
}

/* ── DATA ─────────────────────────────────── */
async function sbSaveSession(userId, session) {
  const sb = getSB(); if (!sb) return;
  const { error } = await sb.from('sessions').insert({
    user_id: userId, duration: session.mins, completed: true,
    date: session.date.slice(0, 10), label: session.label
  });
  if (error) console.error('sbSaveSession:', error.message);
}

async function sbSaveStats(userId, stats) {
  const sb = getSB(); if (!sb) return;
  const { error } = await sb.from('stats').upsert({
    user_id: userId,
    focus_streak: stats.streak, total_sessions: stats.total,
    total_focus_time: stats.focusMins, tasks_done: stats.tasksDone,
    best_day: stats.best, updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  if (error) console.error('sbSaveStats:', error.message);
}

async function sbFetchSessions(userId) {
  const sb = getSB(); if (!sb) return [];
  const { data, error } = await sb.from('sessions').select('*')
    .eq('user_id', userId).order('date', { ascending: false }).limit(500);
  if (error) { console.error('sbFetchSessions:', error.message); return []; }
  return data || [];
}

async function sbFetchStats(userId) {
  const sb = getSB(); if (!sb) return null;
  const { data, error } = await sb.from('stats').select('*')
    .eq('user_id', userId).single();
  return error ? null : data;
}

/* ── SUPABASE SQL (run once in SQL editor) ───
CREATE TABLE sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  duration int NOT NULL, completed bool DEFAULT true,
  date date NOT NULL, label text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE stats (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  focus_streak int DEFAULT 0, total_sessions int DEFAULT 0,
  total_focus_time int DEFAULT 0, tasks_done int DEFAULT 0,
  best_day int DEFAULT 0, updated_at timestamptz DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats    ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own" ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON stats    FOR ALL USING (auth.uid() = user_id);
─────────────────────────────────────────── */

-- ============================================================================
-- FlowState Study OS: Comprehensive Schema Migration
-- Unified Student OS (Courses, Timetable, Exams, Flashcards SM-2, Focus Sessions, Social)
-- + Backward Compatible Legacy Tables (sessions, stats, tasks)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles & Student Metadata
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    university TEXT,
    degree TEXT,
    study_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_study_date DATE,
    streak_freezes_available INTEGER DEFAULT 1,
    is_studying_now BOOLEAN DEFAULT FALSE,
    current_subject TEXT,
    session_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. Courses / Subjects (Root Grouping Entity)
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    target_hours_per_week NUMERIC(4, 1) DEFAULT 6.0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Timetable / Classes
CREATE TABLE IF NOT EXISTS timetable_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Mon, 7=Sun
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    venue TEXT,
    class_type TEXT DEFAULT 'lecture', -- 'lecture', 'tutorial', 'lab', 'workshop'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Exams & Assessments
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT CHECK (type IN ('exam', 'test', 'assignment', 'project', 'quiz')),
    due_date TIMESTAMPTZ NOT NULL,
    venue TEXT,
    weight_percentage NUMERIC(5, 2),
    target_study_hours NUMERIC(5, 1) DEFAULT 15.0,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Flashcard Decks & Cards (SM-2 Spaced Repetition)
CREATE TABLE IF NOT EXISTS flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES flashcard_decks(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    repetition_number INTEGER DEFAULT 0,
    interval_days INTEGER DEFAULT 0,
    ease_factor NUMERIC(4, 2) DEFAULT 2.50,
    due_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Study Sessions (Timer Logs linked to Courses)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
    duration_seconds INTEGER NOT NULL,
    mode TEXT CHECK (mode IN ('pomodoro', 'stopwatch')),
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- 7. Social / Friends / Squads
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    friend_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_members (
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(squad_id, user_id)
);

-- 8. Legacy Tables (for complete backward compatibility with existing V1 JS app)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    date DATE NOT NULL,
    label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    focus_streak INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_focus_time INTEGER DEFAULT 0,
    tasks_done INTEGER DEFAULT 0,
    best_day INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    prio TEXT DEFAULT 'medium',
    done BOOLEAN DEFAULT FALSE,
    notes TEXT,
    due DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Helper security functions for RLS
CREATE OR REPLACE FUNCTION public.get_my_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid();
$$;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view and edit their own profiles" ON profiles;
CREATE POLICY "Users can view and edit their own profiles" ON profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users manage their own courses" ON courses;
CREATE POLICY "Users manage their own courses" ON courses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own timetable" ON timetable_classes;
CREATE POLICY "Users manage their own timetable" ON timetable_classes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own assessments" ON assessments;
CREATE POLICY "Users manage their own assessments" ON assessments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their own decks" ON flashcard_decks;
CREATE POLICY "Users manage their own decks" ON flashcard_decks FOR ALL USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users manage their own flashcards" ON flashcards;
CREATE POLICY "Users manage their own flashcards" ON flashcards FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage their study sessions" ON study_sessions;
CREATE POLICY "Users manage their study sessions" ON study_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view their friendships" ON friendships;
CREATE POLICY "Users view their friendships" ON friendships FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users manage squads" ON squads;
CREATE POLICY "Users manage squads" ON squads FOR ALL USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members view their squad" ON squad_members;
CREATE POLICY "Members view their squad" ON squad_members FOR ALL USING (auth.uid() = user_id);

-- Legacy table policies
DROP POLICY IF EXISTS "own_sessions" ON sessions;
CREATE POLICY "own_sessions" ON sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_stats" ON stats;
CREATE POLICY "own_stats" ON stats FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_tasks" ON tasks;
CREATE POLICY "own_tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

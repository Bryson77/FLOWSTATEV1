-- Migration: Add task_id and assessment_id to study_sessions for tracking focused work per task or assessment
ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS task_id TEXT REFERENCES public.tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_sessions_task ON public.study_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_assessment ON public.study_sessions(assessment_id);

import { Hono } from "hono";
import { z } from "zod";
import { requireAuthMiddleware } from "../lib/supabase";
import type { AppContext } from "../types";

const studyRouter = new Hono<AppContext>();

// Enforce authentication on all study endpoints
studyRouter.use("*", requireAuthMiddleware);

// Get user courses (strictly scoped to authenticated student)
studyRouter.get("/courses", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");
  if (!supabase || !userId) {
    return c.json({ error: "Service temporarily unavailable. Please try again later." }, 503);
  }

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Courses fetch error:", error);
    return c.json({ error: "Unable to load courses. Something went wrong." }, 500);
  }

  return c.json({ courses: data });
});

// Get flashcard decks (user's own decks + public decks)
studyRouter.get("/decks", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");
  if (!supabase || !userId) {
    return c.json({ error: "Service temporarily unavailable. Please try again later." }, 503);
  }

  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*, flashcards(count)")
    .or(`user_id.eq.${userId},is_public.eq.true`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Decks fetch error:", error);
    return c.json({ error: "Unable to load flashcard decks. Something went wrong." }, 500);
  }

  return c.json({ decks: data });
});

// Record a completed study session
const sessionSchema = z.object({
  course_id: z.string().uuid().optional().nullable(),
  task_id: z.string().optional().nullable(),
  assessment_id: z.string().uuid().optional().nullable(),
  duration_seconds: z.number().int().positive().max(86400),
  mode: z.string().optional().default("pomodoro"),
  notes: z.string().max(1000).optional().nullable(),
});

studyRouter.post("/sessions", async (c) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");
  if (!supabase || !userId) {
    return c.json({ error: "Service temporarily unavailable. Please try again later." }, 503);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Fill this in: Please provide valid study session details." }, 400);
  }

  // Enforce session ownership to authenticated user id (prevention of BOLA / IDOR)
  const sessionRecord = {
    ...parsed.data,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("study_sessions")
    .insert(sessionRecord)
    .select()
    .single();

  if (error) {
    console.error("Session insert error:", error);
    return c.json({ error: "Unable to save study session. Something went wrong." }, 500);
  }

  return c.json({ success: true, session: data }, 201);
});

export default studyRouter;

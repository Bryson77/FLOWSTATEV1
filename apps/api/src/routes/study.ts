import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "../types";

const studyRouter = new Hono<AppContext>();

// Get user courses
studyRouter.get("/courses", async (c) => {
  const supabase = c.get("supabase");
  if (!supabase) {
    return c.json({ error: "Database client unavailable. Check environment bindings." }, 503);
  }

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ courses: data });
});

// Get flashcard decks
studyRouter.get("/decks", async (c) => {
  const supabase = c.get("supabase");
  if (!supabase) {
    return c.json({ error: "Database client unavailable. Check environment bindings." }, 503);
  }

  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*, flashcards(count)")
    .order("created_at", { ascending: false });

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ decks: data });
});

// Record a completed study session
const sessionSchema = z.object({
  course_id: z.string().uuid().optional().nullable(),
  duration_seconds: z.number().int().positive(),
  mode: z.string().optional().default("pomodoro"),
  notes: z.string().optional().nullable(),
  user_id: z.string().uuid(),
});

studyRouter.post("/sessions", async (c) => {
  const supabase = c.get("supabase");
  if (!supabase) {
    return c.json({ error: "Database client unavailable. Check environment bindings." }, 503);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid session payload", details: parsed.error.flatten() }, 400);
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return c.json({ error: error.message }, 500);
  }

  return c.json({ success: true, session: data }, 201);
});

export default studyRouter;

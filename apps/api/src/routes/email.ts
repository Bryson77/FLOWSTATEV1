import { Hono } from "hono";
import { z } from "zod";
import type { AppContext } from "../types";

const emailRouter = new Hono<AppContext>();

const emailPayloadSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  from: z.string().optional().default("Saktus <onboarding@resend.dev>"),
});

emailRouter.post("/send", async (c) => {
  // Prevent open mail relay: require valid user JWT or internal service key
  const authHeader = c.req.header("Authorization");
  const internalKey = c.req.header("X-Internal-Key") || c.req.header("X-API-Key");
  const expectedKey = c.env.INTERNAL_API_KEY;

  const isInternalAuthorized = expectedKey && internalKey && internalKey === expectedKey;

  let isUserAuthorized = false;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const supabase = c.get("supabase");
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) isUserAuthorized = true;
    }
  }

  if (!isInternalAuthorized && !isUserAuthorized) {
    return c.json({ error: "Unauthorized: Access denied." }, 401);
  }

  const apiKey = c.env.RESEND_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Email service is temporarily unavailable." }, 503);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = emailPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Fill this in: Please provide valid email details." }, 400);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: parsed.data.from,
        to: Array.isArray(parsed.data.to) ? parsed.data.to : [parsed.data.to],
        subject: parsed.data.subject,
        html: parsed.data.html,
        text: parsed.data.text,
      }),
    });

    const resData = await res.json();
    if (!res.ok) {
      console.error("Email provider error:", resData);
      return c.json({ error: "Failed to send email. Something went wrong." }, 502);
    }

    return c.json({ success: true, result: resData });
  } catch (err: any) {
    console.error("Email dispatch error:", err);
    return c.json({ error: "Failed to dispatch email. Something went wrong." }, 500);
  }
});

export default emailRouter;

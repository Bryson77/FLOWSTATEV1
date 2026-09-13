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
  const apiKey = c.env.RESEND_API_KEY;
  if (!apiKey) {
    return c.json({ error: "Resend API key not configured on Cloudflare Worker." }, 503);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = emailPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid email payload", details: parsed.error.flatten() }, 400);
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
      return c.json({ error: "Failed to send email via Resend", details: resData }, res.status as any);
    }

    return c.json({ success: true, result: resData });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to dispatch email" }, 500);
  }
});

export default emailRouter;

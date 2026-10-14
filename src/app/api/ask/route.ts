import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/guard";
import { ask } from "@/lib/agent";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

const Body = z.object({
  question: z.string().trim().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .max(10)
    .default([]),
});

export async function POST(req: Request) {
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!process.env.GROQ_API_KEY || !process.env.GROQ_CHAT_MODEL) {
    return NextResponse.json({ error: "The agent is not set up. Add GROQ_API_KEY and GROQ_CHAT_MODEL." }, { status: 503 });
  }
  if (!rateLimit("ask", 20, 60_000)) {
    return NextResponse.json({ error: "Too many questions. Wait a minute." }, { status: 429 });
  }
  try {
    return NextResponse.json({ answer: await ask(body.data.question, body.data.history) });
  } catch (e) {
    console.error("ask", e);
    return NextResponse.json({ error: "agent unavailable" }, { status: 502 });
  }
}

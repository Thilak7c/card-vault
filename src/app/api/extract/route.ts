import { NextResponse } from "next/server";
import { z } from "zod";
import { readJson } from "@/lib/guard";
import { normalizePhone, normalizeEmail, normalizeUrl } from "@/lib/normalize";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30; // must not exceed your Vercel plan's limit

const Body = z.object({
  images: z.array(z.string().startsWith("data:image/").max(3_000_000)).min(1).max(2),
});

const PROMPT = `Extract contact details from this business card. The images may be the front and back of one card.
Print only what is on the card and never guess. Use null for any missing field.
Keep names in their original language.
Return ONLY JSON with: fullName, jobTitle, company, phones (list), emails (list), website, address,
rawText (all text on the card), and confidence (0 to 1 for each of fullName, jobTitle, company, phones, emails, website, address).`;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const list = (v: unknown) =>
  (Array.isArray(v) ? v : typeof v === "string" ? [v] : []).map(str).filter(Boolean);

export async function POST(req: Request) {

  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!process.env.GROQ_API_KEY || !process.env.GROQ_VISION_MODEL) {
    return NextResponse.json({ error: "extraction not configured" }, { status: 503 });
  }
  if (!rateLimit("extract", 30, 60_000)) {
    return NextResponse.json({ error: "too many requests" }, { status: 429 });
  }

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_VISION_MODEL,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            ...parsed.data.images.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        }],
      }),
    });
  } catch {
    return NextResponse.json({ error: "groq unreachable" }, { status: 502 });
  }

  if (!res.ok) {
    console.error("groq extract", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: `groq ${res.status}` }, { status: 502 });
  }

  let raw: Record<string, unknown>;
  try {
    const json = await res.json();
    raw = JSON.parse(String(json.choices[0].message.content).replace(/```json|```/g, "").trim());
  } catch {
    return NextResponse.json({ error: "unreadable model output" }, { status: 502 });
  }

  const fields = {
    fullName: str(raw.fullName),
    jobTitle: str(raw.jobTitle),
    company: str(raw.company),
    phones: list(raw.phones).map(normalizePhone),
    emails: list(raw.emails).map(normalizeEmail),
    website: normalizeUrl(str(raw.website)),
    address: str(raw.address),
    rawText: str(raw.rawText),
  };
  const confidence: Record<string, number> = {};
  if (raw.confidence && typeof raw.confidence === "object") {
    for (const [k, v] of Object.entries(raw.confidence)) if (typeof v === "number") confidence[k] = v;
  }
  return NextResponse.json({ method: "groq", fields, confidence });
}

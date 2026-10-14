import { NextResponse } from "next/server";
import { readJson } from "@/lib/guard";
import { CardInput } from "@/lib/schemas";
import { countCards, saveCard, searchCards } from "@/lib/cards";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const opts = {
    q: p.get("q") ?? undefined,
    event: p.get("event") ?? undefined,
    tag: p.get("tag") ?? undefined,
    followUp: p.get("followUp") === "1",
    limit: Number(p.get("limit")) || 50,
    offset: Number(p.get("offset")) || 0,
  };
  const [list, total] = await Promise.all([searchCards(opts), countCards(opts)]);
  return NextResponse.json({ cards: list, total });
}

export async function POST(req: Request) {
  const parsed = CardInput.safeParse(await readJson(req));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad request" }, { status: 400 });
  }
  const id = await saveCard(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}

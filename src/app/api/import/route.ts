import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cardImages } from "@/db/schema";
import { readJson } from "@/lib/guard";
import { Backup, CardInput, type CardInputT } from "@/lib/schemas";
import { writeCard } from "@/lib/cards";

export const maxDuration = 60;

const BAD = "That file is not a Card Vault backup.";

export async function POST(req: Request) {

  const parsed = Backup.safeParse(await readJson(req));
  if (!parsed.success) return NextResponse.json({ error: BAD }, { status: 400 });

  // Validate every card before writing anything.
  const inputs: { id: string; createdAt?: number; input: CardInputT }[] = [];
  for (const c of parsed.data.cards) {
    const r = CardInput.safeParse({ ...c, event: c.event ?? "", thumb: c.thumb ?? undefined, images: {} });
    if (!r.success) return NextResponse.json({ error: BAD }, { status: 400 });
    inputs.push({ id: c.id, createdAt: c.createdAt, input: r.data });
  }
  const ids = new Set(inputs.map((i) => i.id));
  if (parsed.data.images.some((i) => !ids.has(i.cardId))) return NextResponse.json({ error: BAD }, { status: 400 });

  await db.transaction(async (tx) => {
    for (const { id, createdAt, input } of inputs) await writeCard(tx, input, id, createdAt);
    for (const img of parsed.data.images) {
      await tx.delete(cardImages).where(and(eq(cardImages.cardId, img.cardId), eq(cardImages.side, img.side)));
      await tx.insert(cardImages).values({ id: crypto.randomUUID(), ...img });
    }
  });

  return NextResponse.json({ imported: inputs.length });
}

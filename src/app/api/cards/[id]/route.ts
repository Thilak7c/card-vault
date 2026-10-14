import { NextResponse } from "next/server";
import { readJson } from "@/lib/guard";
import { CardInput } from "@/lib/schemas";
import { deleteCard, getCard, saveCard } from "@/lib/cards";

export async function GET(_req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  const card = await getCard(id);
  return card ? NextResponse.json(card) : NextResponse.json({ error: "not found" }, { status: 404 });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  const existing = await getCard(id, false);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await readJson(req);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  // Merge the partial body over the stored card, then validate the whole thing.
  const { thumb: _t, images: _i, ...base } = existing;
  const parsed = CardInput.safeParse({ ...base, thumb: undefined, images: {}, ...body });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad request" }, { status: 400 });
  }
  await saveCard(parsed.data, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/cards/[id]">) {
  const { id } = await ctx.params;
  await deleteCard(id);
  return NextResponse.json({ ok: true });
}

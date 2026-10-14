import "server-only";
import { and, desc, eq, isNotNull, like, or, sql, type SQL } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { cards, cardImages, cardTags, events, tags } from "@/db/schema";
import { buildSearchText, normalizeEmail, normalizePhone, normalizeUrl } from "./normalize";
import type { CardInputT } from "./schemas";

/** Write one card (insert or update) inside an existing transaction. */
export async function writeCard(tx: Tx, input: CardInputT, id: string, createdAt?: number) {
  const phones = [...new Set(input.phones.map(normalizePhone).filter(Boolean))];
  const emails = [...new Set(input.emails.map(normalizeEmail).filter(Boolean))];
  const website = normalizeUrl(input.website);
  const tagNames = [...new Set(input.tags)];
  const now = Date.now();

  let eventId: string | null = null;
  if (input.event) {
    const found = await tx.select().from(events).where(eq(events.name, input.event));
    eventId = found[0]?.id ?? crypto.randomUUID();
    if (!found[0]) await tx.insert(events).values({ id: eventId, name: input.event });
  }

  const row = {
    fullName: input.fullName, jobTitle: input.jobTitle, company: input.company,
    phones, emails, website, address: input.address, eventId, note: input.note,
    followUpAt: input.followUpAt ?? null, rawText: input.rawText,
    extractionMethod: input.extractionMethod, updatedAt: now,
    searchText: buildSearchText({ ...input, tags: tagNames, phones, emails, website }),
    ...(input.thumb ? { thumb: input.thumb } : {}),
  };

  const exists = await tx.select({ id: cards.id }).from(cards).where(eq(cards.id, id));
  if (exists.length) await tx.update(cards).set(row).where(eq(cards.id, id));
  else await tx.insert(cards).values({ id, createdAt: createdAt ?? now, ...row });

  // tags: replace links
  await tx.delete(cardTags).where(eq(cardTags.cardId, id));
  for (const name of tagNames) {
    const t = await tx.select().from(tags).where(eq(tags.name, name));
    const tagId = t[0]?.id ?? crypto.randomUUID();
    if (!t[0]) await tx.insert(tags).values({ id: tagId, name });
    await tx.insert(cardTags).values({ cardId: id, tagId }).onConflictDoNothing();
  }

  // images: replace only the sides provided
  for (const side of ["front", "back"] as const) {
    const url = input.images[side];
    if (!url) continue;
    await tx.delete(cardImages).where(and(eq(cardImages.cardId, id), eq(cardImages.side, side)));
    await tx.insert(cardImages).values({ id: crypto.randomUUID(), cardId: id, side, dataUrl: url });
  }
}

export async function saveCard(input: CardInputT, id: string = crypto.randomUUID()) {
  await db.transaction((tx) => writeCard(tx, input, id));
  return id;
}

export async function deleteCard(id: string) {
  // Delete children explicitly: SQLite only cascades when foreign_keys is on.
  await db.transaction(async (tx) => {
    await tx.delete(cardImages).where(eq(cardImages.cardId, id));
    await tx.delete(cardTags).where(eq(cardTags.cardId, id));
    await tx.delete(cards).where(eq(cards.id, id));
  });
}

export type SearchOpts = {
  q?: string; event?: string; tag?: string; followUp?: boolean; limit?: number; offset?: number;
};

function searchConds(opts: SearchOpts) {
  const words = (opts.q ?? "").toLowerCase().split(/\s+/).map((w) => w.replace(/[%_\\]/g, "")).filter(Boolean);
  const conds: SQL[] = words.map((w) => like(cards.searchText, `%${w}%`));
  if (opts.event) conds.push(sql`${cards.eventId} = (SELECT id FROM events WHERE name = ${opts.event})`);
  if (opts.tag) {
    conds.push(sql`EXISTS (SELECT 1 FROM card_tags ct JOIN tags t ON t.id = ct.tag_id
                           WHERE ct.card_id = "cards"."id" AND t.name = ${opts.tag})`);
  }
  if (opts.followUp) conds.push(isNotNull(cards.followUpAt));
  return conds.length ? and(...conds) : undefined;
}

// Correlated subqueries name "cards" explicitly: in a select list Drizzle renders
// columns unqualified, which would bind to the inner table's column of the same name.
const tagsOf = sql<string | null>`(SELECT group_concat(t.name, ',') FROM card_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.card_id = "cards"."id")`;
const eventOf = sql<string | null>`(SELECT e.name FROM events e WHERE e.id = "cards"."event_id")`;

export async function searchCards(opts: SearchOpts) {
  const where = searchConds(opts);
  const rows = await db
    .select({
      id: cards.id, fullName: cards.fullName, jobTitle: cards.jobTitle, company: cards.company,
      phones: cards.phones, emails: cards.emails, note: cards.note, thumb: cards.thumb,
      followUpAt: cards.followUpAt, createdAt: cards.createdAt,
      event: eventOf,
      tags: tagsOf,
    })
    .from(cards)
    .where(where)
    .orderBy(opts.followUp ? sql`${cards.followUpAt} ASC` : desc(cards.createdAt))
    .limit(Math.min(Math.max(opts.limit ?? 50, 1), 5000))
    .offset(Math.max(opts.offset ?? 0, 0));
  return rows.map((r) => ({ ...r, tags: r.tags ? r.tags.split(",").sort() : [] }));
}

export async function countCards(opts: SearchOpts) {
  const r = await db.select({ n: sql<number>`count(*)` }).from(cards).where(searchConds(opts));
  return Number(r[0]?.n ?? 0);
}

export async function getCard(id: string, withImages = true) {
  const r = await db
    .select({
      card: cards,
      event: eventOf,
      tags: tagsOf,
    })
    .from(cards)
    .where(eq(cards.id, id));
  if (!r[0]) return null;
  const { card, event, tags: t } = r[0];
  const imgs = withImages
    ? await db.select({ side: cardImages.side, dataUrl: cardImages.dataUrl }).from(cardImages).where(eq(cardImages.cardId, id))
    : [];
  const { searchText: _s, eventId: _e, ...rest } = card;
  return {
    ...rest,
    event: event ?? "",
    tags: t ? t.split(",").sort() : [],
    images: Object.fromEntries(imgs.map((i) => [i.side, i.dataUrl])) as { front?: string; back?: string },
  };
}

/** Cards that look like the same person: shared email/phone, or same name + company. */
export async function findDuplicates(c: { fullName?: string; company?: string; phones?: string[]; emails?: string[] }, excludeId?: string) {
  const conds: SQL[] = [];
  for (const e of (c.emails ?? []).map(normalizeEmail).filter(Boolean)) conds.push(like(cards.emails, `%"${e}"%`));
  for (const p of (c.phones ?? []).map(normalizePhone).filter(Boolean)) conds.push(like(cards.phones, `%"${p}"%`));
  const name = c.fullName?.trim().toLowerCase();
  const company = c.company?.trim().toLowerCase();
  if (name && company) conds.push(sql`(lower(${cards.fullName}) = ${name} AND lower(${cards.company}) = ${company})`);
  if (!conds.length) return [];
  const rows = await db
    .select({ id: cards.id, fullName: cards.fullName, jobTitle: cards.jobTitle, company: cards.company, thumb: cards.thumb })
    .from(cards)
    .where(or(...conds))
    .limit(5);
  return rows.filter((r) => r.id !== excludeId);
}

export async function listEvents() {
  return db.all<{ name: string; count: number }>(
    sql`SELECT e.name AS name, COUNT(c.id) AS count FROM events e LEFT JOIN cards c ON c.event_id = e.id
        GROUP BY e.id HAVING COUNT(c.id) > 0 ORDER BY MAX(c.created_at) DESC`
  );
}

export async function listTags() {
  return db.all<{ name: string; count: number }>(
    sql`SELECT t.name AS name, COUNT(ct.card_id) AS count FROM tags t JOIN card_tags ct ON ct.tag_id = t.id
        GROUP BY t.id ORDER BY count DESC, t.name`
  );
}

/** Everything, in the self-contained backup shape (event and tag names, not ids). */
export async function exportAll(withImages: boolean) {
  const all = await db
    .select({
      card: cards,
      event: eventOf,
      tags: tagsOf,
    })
    .from(cards)
    .orderBy(desc(cards.createdAt));
  const out = all.map(({ card, event, tags: t }) => {
    const { searchText: _s, eventId: _e, ...rest } = card;
    return { ...rest, event: event ?? "", tags: t ? t.split(",").sort() : [] };
  });
  const images = withImages
    ? await db.select({ cardId: cardImages.cardId, side: cardImages.side, dataUrl: cardImages.dataUrl }).from(cardImages)
    : [];
  return { version: 1 as const, exportedAt: new Date().toISOString(), cards: out, images };
}

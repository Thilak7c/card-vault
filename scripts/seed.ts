// Seed fake cards into the database named in .env.local (or local.db).
// Usage: npm run seed -- 2000
import { config } from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { buildSearchText } from "../src/lib/normalize";

config({ path: ".env.local" });

const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
if (url.startsWith("libsql://") && !process.argv.includes("--remote")) {
  console.error(`Refusing to seed remote database ${url}. Pass --remote if you mean it.`);
  process.exit(1);
}
const db = drizzle(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }), { schema });

const n = Number(process.argv[2]) || 50;
const first = ["Ahmad", "Siti", "Wei Ling", "Raj", "Nurul", "Daniel", "Priya", "Jason", "Aisyah", "Kumar", "Mei", "Farah", "Hafiz", "Grace", "Arjun"];
const last = ["Faiz", "Tan", "Lim", "Kumar", "Abdullah", "Wong", "Nair", "Lee", "Rahman", "Chong", "Ismail", "Ng"];
const roles = ["Head of Partnerships", "CTO", "Founder", "Product Manager", "Sales Director", "Software Engineer", "Head of Payments", "Logistics Manager", "Marketing Lead", "Investor"];
const companies = ["PayNest Sdn Bhd", "Kargo Logistics", "Billplz", "GrabPay", "Tiny Labs", "SEA Ventures", "Shipwise", "Fintrek", "CloudKL", "Lumen Health"];
const evs = ["KL Tech Meetup", "SEA Summit 2026", "Fintech Week KL", "Startup Grind KL"];
const tagPool = ["payments", "partner", "investor", "logistics", "hiring", "ai"];
const pick = <T,>(a: T[], i: number) => a[i % a.length];

async function main() {
  const eventIds = new Map<string, string>();
  for (const name of evs) {
    const found = await db.select().from(schema.events).where(eq(schema.events.name, name));
    const id = found[0]?.id ?? crypto.randomUUID();
    if (!found[0]) await db.insert(schema.events).values({ id, name });
    eventIds.set(name, id);
  }
  const tagIds = new Map<string, string>();
  for (const name of tagPool) {
    const found = await db.select().from(schema.tags).where(eq(schema.tags.name, name));
    const id = found[0]?.id ?? crypto.randomUUID();
    if (!found[0]) await db.insert(schema.tags).values({ id, name });
    tagIds.set(name, id);
  }

  const batch = 200;
  for (let start = 0; start < n; start += batch) {
    const rows: (typeof schema.cards.$inferInsert)[] = [];
    const links: (typeof schema.cardTags.$inferInsert)[] = [];
    for (let i = start; i < Math.min(n, start + batch); i++) {
      const id = crypto.randomUUID();
      const fullName = `${pick(first, i * 7)} ${pick(last, i * 3)}`;
      const company = pick(companies, i * 5);
      const jobTitle = pick(roles, i);
      const event = pick(evs, i * 11);
      const t = [pick(tagPool, i), ...(i % 3 ? [] : [pick(tagPool, i + 2)])];
      const phones = [`+6012${String(1000000 + i).slice(-7)}`];
      const emails = [`${fullName.split(" ")[0].toLowerCase()}${i}@${company.split(" ")[0].toLowerCase()}.my`];
      const website = `https://${company.split(" ")[0].toLowerCase()}.my`;
      const rawText = `${fullName}\n${jobTitle}\n${company}\n${phones[0]}\n${emails[0]}`;
      rows.push({
        id, fullName, jobTitle, company, phones, emails, website, address: "Kuala Lumpur",
        eventId: eventIds.get(event)!, note: "", rawText, extractionMethod: "manual",
        searchText: buildSearchText({ fullName, jobTitle, company, phones, emails, website, address: "Kuala Lumpur", event, tags: t, note: "", rawText }),
        createdAt: Date.now() - i * 60_000, updatedAt: Date.now(),
      });
      for (const name of new Set(t)) links.push({ cardId: id, tagId: tagIds.get(name)! });
    }
    await db.insert(schema.cards).values(rows);
    await db.insert(schema.cardTags).values(links).onConflictDoNothing();
  }
  console.log(`Seeded ${n} cards into ${url}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

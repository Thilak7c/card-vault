import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  date: text("date"),
  location: text("location"),
});

export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    fullName: text("full_name").notNull().default(""),
    jobTitle: text("job_title").notNull().default(""),
    company: text("company").notNull().default(""),
    phones: text("phones", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
    emails: text("emails", { mode: "json" }).$type<string[]>().notNull().$defaultFn(() => []),
    website: text("website").notNull().default(""),
    address: text("address").notNull().default(""),
    eventId: text("event_id").references(() => events.id, { onDelete: "set null" }),
    note: text("note").notNull().default(""),
    followUpAt: text("follow_up_at"),
    rawText: text("raw_text").notNull().default(""),
    searchText: text("search_text").notNull().default(""),
    thumb: text("thumb"), // small data URL for list rows
    extractionMethod: text("extraction_method").notNull().default("manual"), // groq | ocr | manual
    createdAt: integer("created_at").notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at").notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("cards_event_idx").on(t.eventId), index("cards_created_idx").on(t.createdAt)]
);

export const cardImages = sqliteTable(
  "card_images",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    side: text("side").notNull(), // front | back
    dataUrl: text("data_url").notNull(), // compressed JPEG data URL
  },
  (t) => [index("card_images_card_idx").on(t.cardId)]
);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const cardTags = sqliteTable(
  "card_tags",
  {
    cardId: text("card_id").notNull().references(() => cards.id, { onDelete: "cascade" }),
    tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.tagId] })]
);

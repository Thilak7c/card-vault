import { z } from "zod";

const dataImage = z.string().startsWith("data:image/").max(3_000_000);

export const CardBase = z.object({
  fullName: z.string().trim().default(""),
  jobTitle: z.string().trim().default(""),
  company: z.string().trim().default(""),
  phones: z.array(z.string().trim()).default([]).transform((a) => a.filter(Boolean)),
  emails: z.array(z.string().trim()).default([]).transform((a) => a.filter(Boolean)),
  website: z.string().default(""),
  address: z.string().default(""),
  event: z.string().trim().default(""),
  tags: z.array(z.string().trim().toLowerCase().min(1)).default([]),
  note: z.string().default(""),
  followUpAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  rawText: z.string().default(""),
  extractionMethod: z.enum(["groq", "ocr", "manual"]).default("manual"),
  thumb: dataImage.optional(),
  images: z
    .object({ front: dataImage.optional(), back: dataImage.optional() })
    .default({}),
});

export const CardInput = CardBase.refine(
  (c) => c.fullName || c.company || c.phones.length || c.emails.length,
  { message: "A card needs at least a name, company, phone or email" }
);

export type CardInputT = z.infer<typeof CardInput>;

/** Backup file format (version 1). */
export const Backup = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  cards: z.array(
    z.object({
      id: z.string().min(1),
      fullName: z.string().default(""),
      jobTitle: z.string().default(""),
      company: z.string().default(""),
      phones: z.array(z.string()).default([]),
      emails: z.array(z.string()).default([]),
      website: z.string().default(""),
      address: z.string().default(""),
      event: z.string().nullable().default(""),
      tags: z.array(z.string()).default([]),
      note: z.string().default(""),
      followUpAt: z.string().nullable().optional(),
      rawText: z.string().default(""),
      extractionMethod: z.enum(["groq", "ocr", "manual"]).default("manual"),
      thumb: z.string().nullable().optional(),
      createdAt: z.number().optional(),
    })
  ),
  images: z
    .array(z.object({ cardId: z.string(), side: z.enum(["front", "back"]), dataUrl: z.string().startsWith("data:image/") }))
    .default([]),
});

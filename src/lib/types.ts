export type CardRow = {
  id: string;
  fullName: string;
  jobTitle: string;
  company: string;
  phones: string[];
  emails: string[];
  note: string;
  thumb: string | null;
  followUpAt: string | null;
  createdAt: number;
  event: string | null;
  tags: string[];
};

export type CardDetail = {
  id: string;
  fullName: string;
  jobTitle: string;
  company: string;
  phones: string[];
  emails: string[];
  website: string;
  address: string;
  event: string;
  tags: string[];
  note: string;
  followUpAt: string | null;
  rawText: string;
  thumb: string | null;
  extractionMethod: "groq" | "ocr" | "manual";
  createdAt: number;
  updatedAt: number;
  images: { front?: string; back?: string };
};

export type ExtractedFields = {
  fullName: string;
  jobTitle: string;
  company: string;
  phones: string[];
  emails: string[];
  website: string;
  address: string;
  rawText: string;
};

export type Extraction = {
  method: "groq" | "ocr";
  fields: ExtractedFields;
  confidence: Partial<Record<keyof ExtractedFields, number>>;
};

/** What the card form edits and posts. */
export type CardDraft = ExtractedFields & {
  event: string;
  tags: string[];
  note: string;
  followUpAt: string | null;
  extractionMethod: "groq" | "ocr" | "manual";
};

export const emptyDraft = (): CardDraft => ({
  fullName: "", jobTitle: "", company: "", phones: [], emails: [], website: "", address: "",
  rawText: "", event: "", tags: [], note: "", followUpAt: null, extractionMethod: "manual",
});

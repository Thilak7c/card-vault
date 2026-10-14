// Browser only, lazy loaded.
import type { Extraction } from "./types";

export async function ocrCard(images: string[]): Promise<Extraction> {
  const { default: Tesseract } = await import("tesseract.js");
  let text = "";
  for (const img of images) text += (await Tesseract.recognize(img, "eng")).data.text + "\n";

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const plain = lines.filter((l) => !/@|\d{6,}|www\.|https?:|\+?\d[\d\s().-]{7,}/i.test(l));
  return {
    method: "ocr",
    fields: {
      fullName: plain[0] ?? "", jobTitle: plain[1] ?? "", company: plain[2] ?? "",
      phones: (text.match(/\+?\d[\d\s().-]{7,}\d/g) ?? []).map((p) => p.trim()),
      emails: text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [],
      website: (text.match(/(?:https?:\/\/)?www\.[^\s]+/i) ?? [""])[0],
      address: "", rawText: text.trim(),
    },
    confidence: { fullName: 0.4, jobTitle: 0.4, company: 0.4, phones: 0.6, emails: 0.8, website: 0.6, address: 0.4 },
  };
}

import { exportAll } from "@/lib/cards";

type Card = Awaited<ReturnType<typeof exportAll>>["cards"][number];

const vEsc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

function toVcard(cards: Card[]) {
  return cards
    .map((c) => {
      const parts = c.fullName.trim().split(/\s+/);
      const last = parts.length > 1 ? parts.pop()! : "";
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${vEsc(c.fullName || c.company || "Unknown")}`,
        `N:${vEsc(last)};${vEsc(parts.join(" "))};;;`,
        c.company && `ORG:${vEsc(c.company)}`,
        c.jobTitle && `TITLE:${vEsc(c.jobTitle)}`,
        ...c.phones.map((p) => `TEL;TYPE=CELL:${p}`),
        ...c.emails.map((e) => `EMAIL;TYPE=INTERNET:${e}`),
        c.website && `URL:${c.website}`,
        c.address && `ADR;TYPE=WORK:;;${vEsc(c.address)};;;;`,
        `NOTE:${vEsc([c.event && `Met at ${c.event}`, c.note].filter(Boolean).join(". "))}`,
        c.tags.length && `CATEGORIES:${c.tags.map(vEsc).join(",")}`,
        "END:VCARD",
      ];
      return lines.filter(Boolean).join("\r\n");
    })
    .join("\r\n");
}

const csvCell = (v: string) => {
  // Neutralise spreadsheet formulas, then quote.
  const s = /^[=+\-@]/.test(v) && !/^\+\d/.test(v) ? `'${v}` : v;
  return `"${s.replace(/"/g, '""')}"`;
};

function toCsv(cards: Card[]) {
  const head = ["Name", "Title", "Company", "Phones", "Emails", "Website", "Address", "Event", "Tags", "Note", "Follow-up", "Created"];
  const rows = cards.map((c) =>
    [c.fullName, c.jobTitle, c.company, c.phones.join("; "), c.emails.join("; "), c.website, c.address,
     c.event, c.tags.join("; "), c.note, c.followUpAt ?? "", new Date(c.createdAt).toISOString()].map(csvCell).join(",")
  );
  return "\uFEFF" + [head.join(","), ...rows].join("\r\n");
}

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const format = p.get("format") ?? "json";
  const data = await exportAll(format === "json" && p.get("images") === "1");
  const stamp = new Date().toISOString().slice(0, 10);

  const [body, type, ext] =
    format === "vcf" ? [toVcard(data.cards), "text/vcard; charset=utf-8", "vcf"]
    : format === "csv" ? [toCsv(data.cards), "text/csv; charset=utf-8", "csv"]
    : [JSON.stringify(data), "application/json", "json"];

  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="card-vault-${stamp}.${ext}"`,
      "Cache-Control": "no-store",
    },
  });
}

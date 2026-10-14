"use client";
import Link from "next/link";
import { use, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { CardDetail, CardDraft } from "@/lib/types";
import { CardForm } from "@/components/card-form";
import { CardThumb } from "@/components/avatar";
import { IconBack, IconGlobe, IconMail, IconMap, IconPhone, IconWhatsApp } from "@/components/icons";
import { Button, cx } from "@/components/ui";
import { useToast } from "@/components/toast";

const toDraft = (c: CardDetail): CardDraft => ({
  fullName: c.fullName, jobTitle: c.jobTitle, company: c.company, phones: c.phones, emails: c.emails,
  website: c.website, address: c.address, rawText: c.rawText, event: c.event, tags: c.tags, note: c.note,
  followUpAt: c.followUpAt, extractionMethod: c.extractionMethod,
});

export default function CardPage({ params }: PageProps<"/cards/[id]">) {
  const { id } = use(params);
  const router = useRouter();
  const qc = useQueryClient();
  const { toast, deleteWithUndo, pendingDeletes } = useToast();
  const [editing, setEditing] = useState<CardDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({ queryKey: ["card", id], queryFn: () => api<CardDetail>(`/api/cards/${id}`) });

  const back = (
    <Link href="/" className="-ml-2 inline-flex min-h-11 items-center gap-1 pr-3 text-[15px] font-semibold text-muted hover:text-fg">
      <IconBack /> Cards
    </Link>
  );

  if (q.isPending) {
    return <div className="pt-4">{back}<div className="mt-4 space-y-3"><div className="skeleton h-48 w-full" /><div className="skeleton h-7 w-1/2" /><div className="skeleton h-4 w-2/3" /></div></div>;
  }
  if (q.isError || pendingDeletes.has(id)) {
    return (
      <div className="pt-4">{back}
        <p className="py-16 text-center text-muted">{q.error instanceof ApiError && q.error.status === 404 || pendingDeletes.has(id) ? "This card no longer exists." : "Could not load this card."}</p>
      </div>
    );
  }
  const c = q.data;

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/cards/${id}`, {
        method: "PATCH",
        json: { ...editing, phones: editing.phones.filter((p) => p.trim()), emails: editing.emails.filter((e) => e.trim()) },
      });
      await qc.invalidateQueries();
      setEditing(null);
      toast("Card saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between pt-4">
          <h1 className="text-[22px] font-bold">Edit card</h1>
          <Button variant="ghost" onClick={() => { setEditing(null); setError(null); }}>Cancel</Button>
        </div>
        <div className="mt-3">
          <CardForm value={editing} onChange={setEditing} onSubmit={saveEdit} submitLabel="Save card" busy={saving} error={error} />
        </div>
      </div>
    );
  }

  const phone = c.phones[0];
  const images = [c.images.front, c.images.back].filter(Boolean) as string[];
  const actions: { label: string; href?: string; Icon: typeof IconPhone; external?: boolean }[] = [
    { label: "Call", href: phone && `tel:${phone}`, Icon: IconPhone },
    { label: "WhatsApp", href: phone && `https://wa.me/${phone.replace(/\D/g, "")}`, Icon: IconWhatsApp, external: true },
    { label: "Email", href: c.emails[0] && `mailto:${c.emails[0]}`, Icon: IconMail },
    { label: "Web", href: c.website || undefined, Icon: IconGlobe, external: true },
    { label: "Map", href: c.address && `https://www.google.com/maps/search/${encodeURIComponent(c.address)}`, Icon: IconMap, external: true },
  ];

  return (
    <div className="pb-6">
      <div className="pt-4">{back}</div>

      {images.length > 0 ? (
        <div className="no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4" aria-label="Card images">
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`${i ? "Back" : "Front"} of ${c.fullName || "the"} card`}
              className={cx("max-h-64 snap-center rounded-2xl border border-border object-contain", images.length > 1 ? "w-[85%]" : "w-full")} />
          ))}
        </div>
      ) : (
        <div className="mt-2"><CardThumb name={c.fullName} company={c.company} size="lg" /></div>
      )}

      <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-tight">{c.fullName || c.company || "Unnamed card"}</h1>
      {(c.jobTitle || c.company) && <p className="mt-1 text-[16px] text-muted">{[c.jobTitle, c.fullName ? c.company : ""].filter(Boolean).join(" at ")}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {c.event && <Link href={`/?event=${encodeURIComponent(c.event)}`} className="rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-semibold text-accent">{c.event}</Link>}
        {c.tags.map((t) => <Link key={t} href={`/?tag=${encodeURIComponent(t)}`} className="rounded-full border border-border px-2.5 py-1 text-[13px] font-medium">#{t}</Link>)}
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {actions.map(({ label, href, Icon, external }) =>
          href ? (
            <a key={label} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl bg-surface text-[12px] font-semibold text-accent ring-1 ring-border hover:bg-accent-soft">
              <Icon /> {label}
            </a>
          ) : (
            <span key={label} aria-disabled className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl text-[12px] font-semibold text-muted/50 ring-1 ring-border">
              <Icon /> {label}
            </span>
          )
        )}
      </div>

      <dl className="mt-6 divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
        <Row label="Phone">{c.phones.map((p) => <a key={p} href={`tel:${p}`} className="block text-accent">{p}</a>)}</Row>
        <Row label="Email">{c.emails.map((e) => <a key={e} href={`mailto:${e}`} className="block break-all text-accent">{e}</a>)}</Row>
        <Row label="Website">{c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="break-all text-accent">{c.website.replace(/^https?:\/\//, "")}</a>}</Row>
        <Row label="Address">{c.address && <span className="whitespace-pre-line">{c.address}</span>}</Row>
        <Row label="Follow up">{c.followUpAt}</Row>
        <Row label="Note">{c.note && <span className="whitespace-pre-line">{c.note}</span>}</Row>
      </dl>

      {c.rawText && (
        <details className="mt-4 rounded-2xl bg-surface p-4 ring-1 ring-border">
          <summary className="min-h-6 cursor-pointer text-[14px] font-semibold text-muted">All text on the card</summary>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-[14px]">{c.rawText}</pre>
        </details>
      )}

      <p className="mt-4 text-[12px] text-muted">
        Added {new Date(c.createdAt).toLocaleDateString()} · {c.extractionMethod === "groq" ? "Read by AI" : c.extractionMethod === "ocr" ? "Read on-device" : "Entered manually"}
      </p>

      <div className="mt-5 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setEditing(toDraft(c))}>Edit</Button>
        <Button variant="danger" className="flex-1" onClick={() => { deleteWithUndo(id); router.push("/"); }}>Delete</Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  const empty = !children || (Array.isArray(children) && children.length === 0);
  if (empty) return null;
  return (
    <div className="flex gap-4 px-4 py-3">
      <dt className="w-20 shrink-0 text-[13px] font-semibold text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px]">{children}</dd>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { shrink, thumbnail } from "@/lib/image";
import { getPref, setPref, usePrivateMode } from "@/lib/prefs";
import { emptyDraft, type CardDetail, type CardDraft, type Extraction } from "@/lib/types";
import { CardForm } from "@/components/card-form";
import { CardThumb } from "@/components/avatar";
import { ImageSlot } from "@/components/image-slot";
import { IconLock } from "@/components/icons";
import { Button, PageHeader } from "@/components/ui";
import { useToast } from "@/components/toast";

type Dup = { id: string; fullName: string; jobTitle: string; company: string; thumb: string | null };
type Phase = "capture" | "reading" | "review";

const uniq = (a: string[]) => [...new Set(a.map((x) => x.trim()).filter(Boolean))];

export default function ScanPage() {
  const privateMode = usePrivateMode();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("capture");
  const [front, setFront] = useState<string | null>(null);
  const [back, setBack] = useState<string | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [draft, setDraft] = useState<CardDraft>(emptyDraft);
  const [confidence, setConfidence] = useState<Extraction["confidence"]>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dups, setDups] = useState<Dup[] | null>(null);

  const addImage = async (side: "front" | "back", f: File) => {
    setError(null);
    try {
      const url = await shrink(f);
      if (side === "front") {
        setFront(url);
        setThumb(await thumbnail(f));
      } else setBack(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const startReview = (x?: Extraction) => {
    setDraft({
      ...emptyDraft(),
      ...(x?.fields ?? {}),
      extractionMethod: x?.method ?? "manual",
      event: getPref("lastEvent") ?? "",
    });
    setConfidence(x?.confidence ?? {});
    setPhase("review");
  };

  const runOcr = async (images: string[]) => {
    const { ocrCard } = await import("@/lib/ocr");
    return ocrCard(images);
  };

  const read = async () => {
    const images = [front, back].filter(Boolean) as string[];
    if (!images.length) return;
    setPhase("reading");
    setNotice(null);
    setError(null);
    if (privateMode) {
      try {
        startReview(await runOcr(images));
      } catch {
        setNotice("Could not read the card on this device. Enter the details manually.");
        startReview();
      }
      return;
    }
    try {
      startReview(await api<Extraction>("/api/extract", { method: "POST", json: { images } }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setNotice("Extraction is not set up. Enter the details manually.");
        startReview();
        return;
      }
      try {
        const x = await runOcr(images);
        setNotice("AI extraction failed. Read on-device instead, so check every field.");
        startReview(x);
      } catch {
        setNotice("Could not read the card. Enter the details manually.");
        startReview();
      }
    }
  };

  const reset = () => {
    setFront(null); setBack(null); setThumb(null);
    setDraft(emptyDraft()); setConfidence({}); setNotice(null); setError(null); setDups(null);
    setPhase("capture");
    window.scrollTo({ top: 0 });
  };

  const payload = () => ({
    ...draft,
    phones: uniq(draft.phones),
    emails: uniq(draft.emails),
    thumb: thumb ?? undefined,
    images: { front: front ?? undefined, back: back ?? undefined },
  });

  const finish = () => {
    if (draft.event.trim()) setPref("lastEvent", draft.event.trim());
    qc.invalidateQueries();
    toast("Card saved");
    reset();
  };

  const save = async (skipDupCheck = false) => {
    setError(null);
    const body = payload();
    if (!body.fullName.trim() && !body.company.trim() && !body.phones.length && !body.emails.length) {
      setError("A card needs at least a name, company, phone or email.");
      return;
    }
    setSaving(true);
    try {
      if (!skipDupCheck) {
        const { matches } = await api<{ matches: Dup[] }>("/api/cards/duplicates", { method: "POST", json: body });
        if (matches.length) {
          setDups(matches);
          return;
        }
      }
      await api("/api/cards", { method: "POST", json: body });
      finish();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const merge = async (target: Dup) => {
    setSaving(true);
    try {
      const old = await api<CardDetail>(`/api/cards/${target.id}`);
      const body = payload();
      const pick = (a: string, b: string) => a.trim() || b;
      await api(`/api/cards/${target.id}`, {
        method: "PATCH",
        json: {
          fullName: pick(body.fullName, old.fullName),
          jobTitle: pick(body.jobTitle, old.jobTitle),
          company: pick(body.company, old.company),
          phones: uniq([...old.phones, ...body.phones]),
          emails: uniq([...old.emails, ...body.emails]),
          website: pick(body.website, old.website),
          address: pick(body.address, old.address),
          event: pick(body.event, old.event),
          tags: uniq([...old.tags, ...body.tags]),
          note: [old.note, body.note].map((s) => s.trim()).filter(Boolean).join("\n\n"),
          followUpAt: body.followUpAt ?? old.followUpAt,
          rawText: [old.rawText, body.rawText].filter(Boolean).join("\n---\n"),
          ...(body.images.front ? { images: body.images, thumb: body.thumb } : {}),
        },
      });
      finish();
    } catch (e) {
      setError((e as Error).message);
      setDups(null);
    } finally {
      setSaving(false);
    }
  };

  if (phase === "capture" || phase === "reading") {
    const reading = phase === "reading";
    return (
      <div>
        <PageHeader title="Scan" />
        <div className="grid gap-3 sm:grid-cols-2">
          <ImageSlot label="Front" value={front} onFile={(f) => addImage("front", f)} onClear={() => { setFront(null); setThumb(null); }} />
          <ImageSlot label="Back" optional value={back} onFile={(f) => addImage("back", f)} onClear={() => setBack(null)} />
        </div>
        {error && <p role="alert" className="mt-3 text-[14px] font-medium text-danger">{error}</p>}

        {reading ? (
          <div className="mt-6 space-y-4" aria-busy aria-label="Reading card">
            <p className="text-center text-[15px] font-semibold text-muted">{privateMode ? "Reading on this device…" : "Reading card…"}</p>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="space-y-1.5"><div className="skeleton h-3 w-20" /><div className="skeleton h-11 w-full" /></div>
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={read} disabled={!front && !back} className="min-h-13 text-[16px]">Read card</Button>
            <Button variant="secondary" onClick={() => startReview()}>Enter manually</Button>
            <p className="mt-2 flex items-start justify-center gap-1.5 text-center text-[13px] text-muted">
              {privateMode && <IconLock width={15} height={15} className="mt-px shrink-0" />}
              {privateMode
                ? "Private mode is on: text is read on this device."
                : <>Images are sent to Groq to read the text. <Link href="/settings" className="underline">Private mode</Link></>}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Review">
        <Button variant="ghost" onClick={reset}>Start over</Button>
      </PageHeader>

      {(front || back) && (
        <div className="no-scrollbar -mx-4 mb-4 flex snap-x gap-2 overflow-x-auto px-4">
          {[front, back].filter(Boolean).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src!} alt={i ? "Back of the card" : "Front of the card"} className="h-40 snap-start rounded-xl border border-border object-cover" />
          ))}
        </div>
      )}

      {notice && (
        <p role="status" className="mb-4 rounded-xl border border-warn-ring/50 bg-warn-soft px-4 py-3 text-[14px] font-medium">{notice}</p>
      )}

      <CardForm
        value={draft}
        onChange={setDraft}
        confidence={confidence}
        onSubmit={() => save()}
        submitLabel="Save card"
        busy={saving}
        error={error}
      />

      {dups && (
        <div className="anim-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" role="dialog" aria-modal aria-labelledby="dup-title">
          <div className="anim-slide-up w-full max-w-md rounded-t-2xl bg-surface p-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:rounded-2xl">
            <h2 id="dup-title" className="text-[18px] font-bold">This may already be saved</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {dups.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border p-2">
                  <CardThumb thumb={d.thumb} name={d.fullName} company={d.company} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{d.fullName || d.company}</p>
                    <p className="truncate text-[13px] text-muted">{[d.jobTitle, d.company].filter(Boolean).join(" at ")}</p>
                  </div>
                  <Button variant="secondary" onClick={() => merge(d)} disabled={saving}>Merge</Button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setDups(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => { setDups(null); save(true); }} disabled={saving}>Keep both</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

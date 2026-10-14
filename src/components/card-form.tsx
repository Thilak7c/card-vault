"use client";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CardDraft, Extraction } from "@/lib/types";
import { Button, Field, Input, Textarea, cx, inputCls } from "./ui";
import { IconX } from "./icons";

type Props = {
  value: CardDraft;
  onChange: (v: CardDraft) => void;
  onSubmit: () => void;
  confidence?: Extraction["confidence"];
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  secondary?: ReactNode;
};

const LOW = 0.8;

export function CardForm({ value: v, onChange, onSubmit, confidence, submitLabel, busy, error, secondary }: Props) {
  const id = useId();
  const set = <K extends keyof CardDraft>(k: K, val: CardDraft[K]) => onChange({ ...v, [k]: val });
  const low = (k: keyof NonNullable<Props["confidence"]>) => {
    const c = confidence?.[k];
    return typeof c === "number" && c < LOW;
  };
  const [rawOpen, setRawOpen] = useState(false);

  const events = useQuery({ queryKey: ["events"], queryFn: () => api<{ events: { name: string }[] }>("/api/events") });
  const tags = useQuery({ queryKey: ["tags"], queryFn: () => api<{ tags: { name: string }[] }>("/api/tags") });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Name" htmlFor={`${id}-name`} warn={low("fullName")}>
        <Input id={`${id}-name`} value={v.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Role" htmlFor={`${id}-role`} warn={low("jobTitle")}>
        <Input id={`${id}-role`} value={v.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} autoComplete="off" />
      </Field>
      <Field label="Company" htmlFor={`${id}-company`} warn={low("company")}>
        <Input id={`${id}-company`} value={v.company} onChange={(e) => set("company", e.target.value)} autoComplete="off" />
      </Field>

      <ListField label="Phones" items={v.phones} onChange={(x) => set("phones", x)} warn={low("phones")} type="tel" addLabel="Add phone" />
      <ListField label="Emails" items={v.emails} onChange={(x) => set("emails", x)} warn={low("emails")} type="email" addLabel="Add email" />

      <Field label="Website" htmlFor={`${id}-web`} warn={low("website")}>
        <Input id={`${id}-web`} value={v.website} onChange={(e) => set("website", e.target.value)} inputMode="url" autoCapitalize="none" autoComplete="off" />
      </Field>
      <Field label="Address" htmlFor={`${id}-addr`} warn={low("address")}>
        <Textarea id={`${id}-addr`} rows={2} value={v.address} onChange={(e) => set("address", e.target.value)} />
      </Field>

      <div className="my-1 h-px bg-border" />

      <Field label="Event" htmlFor={`${id}-event`} hint="Where you met. Pick an earlier event or type a new one.">
        <Input id={`${id}-event`} list={`${id}-events`} value={v.event} onChange={(e) => set("event", e.target.value)} autoComplete="off" />
        <datalist id={`${id}-events`}>
          {events.data?.events.map((e) => <option key={e.name} value={e.name} />)}
        </datalist>
      </Field>

      <TagInput tags={v.tags} onChange={(t) => set("tags", t)} suggestions={tags.data?.tags.map((t) => t.name) ?? []} />

      <Field label="Note" htmlFor={`${id}-note`}>
        <Textarea id={`${id}-note`} rows={3} value={v.note} onChange={(e) => set("note", e.target.value)} placeholder="What did you talk about?" />
      </Field>

      <Field label="Follow up on" htmlFor={`${id}-fu`}>
        <div className="flex gap-2">
          <Input id={`${id}-fu`} type="date" value={v.followUpAt ?? ""} onChange={(e) => set("followUpAt", e.target.value || null)} />
          {v.followUpAt && <Button type="button" variant="ghost" onClick={() => set("followUpAt", null)} aria-label="Clear follow-up date"><IconX width={18} height={18} /></Button>}
        </div>
      </Field>

      <div>
        <button type="button" onClick={() => setRawOpen((o) => !o)} aria-expanded={rawOpen} className="min-h-11 text-[14px] font-semibold text-accent">
          {rawOpen ? "Hide" : "Show"} all text on the card
        </button>
        {rawOpen && (
          <Textarea aria-label="All text on the card" rows={6} value={v.rawText} onChange={(e) => set("rawText", e.target.value)} className="mt-1 font-mono text-[13px]" />
        )}
      </div>

      {error && <p role="alert" className="text-[14px] font-medium text-danger">{error}</p>}

      <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] z-10 -mx-4 flex gap-2 bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0">
        {secondary}
        <Button type="submit" disabled={busy} className="flex-1">{busy ? "Saving…" : submitLabel}</Button>
      </div>
    </form>
  );
}

function ListField({ label, items, onChange, warn, type, addLabel }: {
  label: string; items: string[]; onChange: (x: string[]) => void; warn?: boolean; type: string; addLabel: string;
}) {
  const id = useId();
  const shown = items.length ? items : [""];
  const update = (i: number, val: string) => onChange(shown.map((x, j) => (j === i ? val : x)));
  return (
    <Field label={label} htmlFor={`${id}-0`} warn={warn}>
      <div className="flex flex-col gap-2">
        {shown.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              id={`${id}-${i}`}
              aria-label={i ? `${label} ${i + 1}` : undefined}
              type={type}
              value={item}
              onChange={(e) => update(i, e.target.value)}
              autoCapitalize="none"
              autoComplete="off"
              className={inputCls}
            />
            {shown.length > 1 && (
              <Button type="button" variant="ghost" aria-label={`Remove ${item || "entry"}`} onClick={() => onChange(shown.filter((_, j) => j !== i))}>
                <IconX width={18} height={18} />
              </Button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => onChange([...shown, ""])} className="min-h-9 self-start text-[14px] font-semibold text-accent">
          + {addLabel}
        </button>
      </div>
    </Field>
  );
}

function TagInput({ tags, onChange, suggestions }: { tags: string[]; onChange: (t: string[]) => void; suggestions: string[] }) {
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, "");
    if (t && !tags.includes(t)) onChange([...tags, t]);
    setDraft("");
  };
  const unused = suggestions.filter((s) => !tags.includes(s)).slice(0, 8);
  return (
    <Field label="Tags" htmlFor={id}>
      <div className={cx(inputCls, "flex flex-wrap items-center gap-1.5 py-1.5")}>
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-[14px] font-medium text-accent">
            #{t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-accent/15">
              <IconX width={14} height={14} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => (e.target.value.endsWith(",") ? add(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(draft); }
            if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={tags.length ? "" : "payments, partner"}
          autoCapitalize="none"
          autoComplete="off"
          className="min-h-8 min-w-24 flex-1 bg-transparent text-[16px] focus:outline-none"
        />
      </div>
      {unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="min-h-8 rounded-full border border-border px-2.5 text-[13px] text-muted hover:bg-surface-2">
              #{s}
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

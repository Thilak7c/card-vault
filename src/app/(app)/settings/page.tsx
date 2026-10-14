"use client";
import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { setPref, usePref, usePrivateMode } from "@/lib/prefs";
import { Button, PageHeader } from "@/components/ui";
import { useToast } from "@/components/toast";

export default function SettingsPage() {
  const privateMode = usePrivateMode();
  const lastExport = usePref("lastExport");
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const exportLink = (href: string, label: string, primary = false) => (
    <a
      href={href}
      download
      onClick={() => setPref("lastExport", String(Date.now()))}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-[15px] font-semibold ${primary ? "bg-accent text-accent-fg hover:bg-accent-hover" : "bg-surface ring-1 ring-border hover:bg-surface-2"}`}
    >
      {label}
    </a>
  );

  const onImport = async (file: File) => {
    setImporting(true);
    try {
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        throw new Error("That file is not a Card Vault backup.");
      }
      const { imported } = await api<{ imported: number }>("/api/import", { method: "POST", json: data });
      await qc.invalidateQueries();
      toast(`Imported ${imported} ${imported === 1 ? "card" : "cards"}`);
    } catch (e) {
      toast((e as Error).message, { tone: "error", duration: 5000 });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <PageHeader title="Settings" />

      <Section title="Private mode">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4">
          <span className="text-[15px]">
            Read cards on this device instead of sending images to Groq. Less accurate, and Ask is turned off.
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={privateMode}
            onChange={(e) => setPref("privateMode", e.target.checked ? "1" : null)}
            className="peer sr-only"
          />
          <span aria-hidden className="relative h-7 w-12 shrink-0 rounded-full bg-surface-2 ring-1 ring-border transition-colors peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>
        <p className="mt-2 text-[13px] text-muted">This setting is saved on this device only.</p>
      </Section>

      <Section title="Back up">
        <p className="text-[14px] text-muted">
          {lastExport ? `Last export on this device: ${new Date(Number(lastExport)).toLocaleDateString()}` : "You have not exported from this device yet."}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {exportLink("/api/export?images=1", "Export with images", true)}
          {exportLink("/api/export?images=0", "Export without images")}
          {exportLink("/api/export?format=vcf", "Contacts (vCard)")}
          {exportLink("/api/export?format=csv", "Spreadsheet (CSV)")}
        </div>
      </Section>

      <Section title="Restore">
        <p className="text-[14px] text-muted">Import a Card Vault JSON backup. Cards with the same id are updated; nothing is deleted.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
        <Button variant="secondary" className="mt-3 w-full sm:w-auto" disabled={importing} onClick={() => fileRef.current?.click()}>
          {importing ? "Importing…" : "Import backup"}
        </Button>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-surface p-4 ring-1 ring-border">
      <h2 className="mb-2 text-[16px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

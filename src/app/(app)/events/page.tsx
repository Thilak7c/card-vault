"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { IconChevron, IconEvents } from "@/components/icons";
import { PageHeader } from "@/components/ui";

export default function EventsPage() {
  const q = useQuery({ queryKey: ["events"], queryFn: () => api<{ events: { name: string; count: number }[] }>("/api/events") });
  return (
    <div>
      <PageHeader title="Events" />
      {q.isPending ? (
        <div className="space-y-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-14 w-full" />)}</div>
      ) : !q.data?.events.length ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconEvents width={30} height={30} /></div>
          <p className="text-[16px] text-muted">Events appear here when you tag a card with where you met.</p>
          <Link href="/scan" className="font-semibold text-accent">Scan a card</Link>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl bg-surface ring-1 ring-border">
          {q.data.events.map((e) => (
            <li key={e.name}>
              <Link href={`/?event=${encodeURIComponent(e.name)}`} className="flex min-h-14 items-center gap-3 px-4 hover:bg-surface-2">
                <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{e.name}</span>
                <span className="text-[14px] text-muted">{e.count} {e.count === 1 ? "card" : "cards"}</span>
                <IconChevron width={18} height={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

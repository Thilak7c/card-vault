"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CardRow as Row } from "@/lib/types";
import { usePref } from "@/lib/prefs";
import { CardRow } from "@/components/card-row";
import { IconScan, IconSearch, IconX } from "@/components/icons";
import { Button, Chip, PageHeader } from "@/components/ui";
import { useToast } from "@/components/toast";

const PAGE = 50;

export function CardsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const event = params.get("event") ?? "";
  const tag = params.get("tag") ?? "";
  const followUp = params.get("followUp") === "1";
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const { pendingDeletes } = useToast();
  const lastExport = usePref("lastExport");
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 200);
    return () => clearTimeout(t);
  }, [q]);

  const setFilter = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value);
    else p.delete(key);
    router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
  };

  const list = useInfiniteQuery({
    queryKey: ["cards", { q: debounced, event, tag, followUp }],
    queryFn: ({ pageParam }) => {
      const p = new URLSearchParams({ limit: String(PAGE), offset: String(pageParam) });
      if (debounced) p.set("q", debounced);
      if (event) p.set("event", event);
      if (tag) p.set("tag", tag);
      if (followUp) p.set("followUp", "1");
      return api<{ cards: Row[]; total: number }>(`/api/cards?${p}`);
    },
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const loaded = pages.reduce((n, pg) => n + pg.cards.length, 0);
      return loaded < last.total ? loaded : undefined;
    },
    placeholderData: keepPreviousData,
  });

  const events = useQuery({ queryKey: ["events"], queryFn: () => api<{ events: { name: string; count: number }[] }>("/api/events") });
  const tags = useQuery({ queryKey: ["tags"], queryFn: () => api<{ tags: { name: string; count: number }[] }>("/api/tags") });

  const rows = (list.data?.pages.flatMap((p) => p.cards) ?? []).filter((c) => !pendingDeletes.has(c.id));
  const total = list.data?.pages[0]?.total ?? 0;
  const filtered = !!(debounced || event || tag || followUp);
  const stale = lastExport ? now - Number(lastExport) > 30 * 86400_000 : true;

  return (
    <div>
      <PageHeader title="Cards">
        {total > 0 && <span className="text-[14px] text-muted">{total} {total === 1 ? "card" : "cards"}</span>}
      </PageHeader>

      {stale && total > 0 && !filtered && (
        <Link href="/settings" className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-warn-ring/50 bg-warn-soft px-4 py-3 text-[14px] font-medium">
          Back up your cards in Settings.
          <span className="font-bold text-warn">Back up</span>
        </Link>
      )}

      <div className="sticky top-0 z-20 -mx-4 bg-bg/95 px-4 pb-2 pt-1 backdrop-blur">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={20} height={20} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, company, role, anything"
            aria-label="Search cards"
            className="min-h-12 w-full rounded-xl border border-border bg-surface pl-10 pr-10 text-[16px] placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-fg">
              <IconX width={18} height={18} />
            </button>
          )}
        </div>

        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filters">
          <Chip active={!event && !tag && !followUp} onClick={() => router.replace(pathname, { scroll: false })}>All</Chip>
          <Chip active={followUp} onClick={() => setFilter("followUp", followUp ? "" : "1")}>Follow-up</Chip>
          {events.data?.events.map((e) => (
            <Chip key={e.name} active={event === e.name} onClick={() => setFilter("event", event === e.name ? "" : e.name)}>
              {e.name}
            </Chip>
          ))}
          {tags.data?.tags.map((t) => (
            <Chip key={`#${t.name}`} active={tag === t.name} onClick={() => setFilter("tag", tag === t.name ? "" : t.name)}>
              #{t.name}
            </Chip>
          ))}
        </div>
      </div>

      {list.isPending ? (
        <ul className="mt-2 flex flex-col gap-2" aria-busy>
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-2 py-2">
              <div className="skeleton h-11 w-16" />
              <div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/5" /><div className="skeleton h-3 w-3/5" /></div>
            </li>
          ))}
        </ul>
      ) : list.isError ? (
        <div className="py-16 text-center">
          <p className="text-muted">Could not load cards.</p>
          <Button variant="secondary" className="mt-3" onClick={() => list.refetch()}>Try again</Button>
        </div>
      ) : rows.length === 0 ? (
        filtered ? (
          <p className="py-16 text-center text-[16px] text-muted">No matches</p>
        ) : (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent"><IconScan width={30} height={30} /></div>
            <p className="text-[18px] font-bold">Scan your first card</p>
            <Link href="/scan" className="inline-flex min-h-11 items-center rounded-xl bg-accent px-5 font-semibold text-accent-fg hover:bg-accent-hover">Scan a card</Link>
          </div>
        )
      ) : (
        <>
          <ul className={`mt-1 flex flex-col divide-y divide-border transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}>
            {rows.map((c) => <CardRow key={c.id} card={c} />)}
          </ul>
          {list.hasNextPage && (
            <div className="flex justify-center py-4">
              <Button variant="secondary" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                {list.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

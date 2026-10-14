import Link from "next/link";
import type { CardRow as Row } from "@/lib/types";
import { CardThumb } from "./avatar";

export function CardRow({ card }: { card: Row }) {
  const sub = [card.jobTitle, card.company].filter(Boolean).join(" at ");
  const title = card.fullName || card.company || card.emails[0] || card.phones[0] || "Unnamed card";
  return (
    <li>
      <Link
        href={`/cards/${card.id}`}
        className="flex min-h-16 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
      >
        <CardThumb thumb={card.thumb} name={card.fullName} company={card.company} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold">{title}</p>
          {sub && <p className="truncate text-[14px] text-muted">{sub}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {card.event && (
            <span className="max-w-[9rem] truncate rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-semibold text-accent">
              {card.event}
            </span>
          )}
          {card.followUpAt && <span className="text-[12px] font-medium text-warn">Follow up {card.followUpAt}</span>}
        </div>
      </Link>
    </li>
  );
}

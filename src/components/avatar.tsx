import { cx } from "./ui";

function hue(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function initials(name: string, company: string) {
  const src = name.trim() || company.trim() || "?";
  const parts = src.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Card-shaped thumbnail, or initials on a colour derived from the company. */
export function CardThumb({ thumb, name, company, size = "md" }: { thumb?: string | null; name: string; company: string; size?: "md" | "lg" }) {
  const dims = size === "lg" ? "h-16 w-24 text-xl" : "h-11 w-16 text-[15px]";
  if (thumb) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={thumb} alt="" className={cx(dims, "shrink-0 rounded-lg border border-border object-cover")} />;
  }
  const h = hue(company || name);
  return (
    <div
      aria-hidden
      className={cx(dims, "flex shrink-0 items-center justify-center rounded-lg font-bold text-white")}
      style={{ background: `hsl(${h} 55% 42%)` }}
    >
      {initials(name, company)}
    </div>
  );
}

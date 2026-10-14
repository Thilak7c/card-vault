import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "bg-surface text-fg border border-border hover:bg-surface-2",
  ghost: "text-fg hover:bg-surface-2",
  danger: "bg-surface text-danger border border-border hover:bg-surface-2",
};

export function Button({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
    />
  );
}

export const inputCls =
  "w-full min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-[16px] text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, p.className)} />;
}

export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(inputCls, "min-h-20 resize-y", p.className)} />;
}

export function Field({ label, htmlFor, warn, children, hint }: { label: string; htmlFor?: string; warn?: boolean; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className={cx("rounded-xl", warn && "bg-warn-soft p-2 -mx-2 ring-2 ring-warn-ring")}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-muted">{label}</label>
        {warn && <span className="text-[12px] font-semibold text-warn">Check this</span>}
      </div>
      {children}
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function Chip({ active, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...p}
      aria-pressed={active}
      className={cx(
        "inline-flex min-h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-[14px] font-medium transition-colors",
        active ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg hover:bg-surface-2",
        className
      )}
    />
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3 pt-4">
      <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
      {children}
    </div>
  );
}

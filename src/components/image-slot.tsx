"use client";
import { useId, useRef } from "react";
import { IconCamera, IconX } from "./icons";
import { cx } from "./ui";

export function ImageSlot({ label, value, onFile, onClear, optional }: {
  label: string; value: string | null; onFile: (f: File) => void; onClear: () => void; optional?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <input
        ref={ref}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        className={cx(
          "flex aspect-[1.75] w-full cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 text-center transition-colors",
          value ? "border-border" : "border-dashed border-border bg-surface hover:border-accent hover:bg-accent-soft"
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={`${label} of the card`} className="h-full w-full object-cover" />
        ) : (
          <>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent"><IconCamera /></span>
            <span className="text-[15px] font-semibold">{label}</span>
            <span className="text-[13px] text-muted">{optional ? "Optional. Tap to add" : "Tap to take a photo"}</span>
          </>
        )}
      </label>
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${label.toLowerCase()} photo`}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white"
        >
          <IconX width={18} height={18} />
        </button>
      )}
    </div>
  );
}

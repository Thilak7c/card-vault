"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

type Toast = { id: number; message: string; action?: { label: string; run: () => void }; tone?: "error" };
type Ctx = {
  toast: (message: string, opts?: { action?: Toast["action"]; duration?: number; tone?: "error"; onExpire?: () => void }) => void;
  pendingDeletes: Set<string>;
  deleteWithUndo: (id: string) => void;
};

const ToastCtx = createContext<Ctx | null>(null);
export const useToast = () => useContext(ToastCtx)!;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingDeletes, setPending] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<number, { t: ReturnType<typeof setTimeout>; onExpire?: () => void }>());
  const seq = useRef(0);
  const qc = useQueryClient();

  const dismiss = useCallback((id: number, expired: boolean) => {
    const entry = timers.current.get(id);
    if (entry) {
      clearTimeout(entry.t);
      timers.current.delete(id);
      if (expired) entry.onExpire?.();
    }
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const toast: Ctx["toast"] = useCallback((message, opts = {}) => {
    const id = ++seq.current;
    const action = opts.action && {
      label: opts.action.label,
      run: () => {
        const entry = timers.current.get(id);
        if (entry) clearTimeout(entry.t);
        timers.current.delete(id);
        opts.action!.run();
        setToasts((ts) => ts.filter((t) => t.id !== id));
      },
    };
    setToasts((ts) => [...ts.slice(-2), { id, message, action, tone: opts.tone }]);
    const t = setTimeout(() => dismiss(id, true), opts.duration ?? 3000);
    timers.current.set(id, { t, onExpire: opts.onExpire });
  }, [dismiss]);

  // Flush pending deletes if the tab is closed before the Undo window ends.
  useEffect(() => {
    const flush = () => {
      for (const [, e] of timers.current) e.onExpire?.();
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  const deleteWithUndo = useCallback((cardId: string) => {
    setPending((s) => new Set(s).add(cardId));
    const release = () => setPending((s) => { const n = new Set(s); n.delete(cardId); return n; });
    let done = false;
    toast("Card deleted", {
      duration: 6000,
      action: { label: "Undo", run: () => { done = true; release(); } },
      onExpire: () => {
        if (done) return;
        done = true;
        fetch(`/api/cards/${cardId}`, { method: "DELETE", keepalive: true })
          .then((r) => { if (!r.ok) throw new Error(); })
          .then(() => qc.invalidateQueries())
          .catch(() => toast("Delete failed. The card is still saved.", { tone: "error" }))
          .finally(release);
      },
    });
  }, [toast, qc]);

  return (
    <ToastCtx.Provider value={{ toast, pendingDeletes, deleteWithUndo }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`anim-slide-up pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-lg ${t.tone === "error" ? "bg-danger text-white" : "bg-fg text-bg"}`}
          >
            <span className="text-[15px] font-medium">{t.message}</span>
            {t.action && (
              <button onClick={t.action.run} className="min-h-11 rounded-lg px-3 text-[15px] font-bold underline-offset-2 hover:underline">
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}


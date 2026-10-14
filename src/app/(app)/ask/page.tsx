"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { usePrivateMode } from "@/lib/prefs";
import { Markdown } from "@/components/chat-message";
import { IconLock, IconSend } from "@/components/icons";
import { Chip, PageHeader, cx } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string; error?: boolean };

export default function AskPage() {
  const privateMode = usePrivateMode();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const events = useQuery({ queryKey: ["events"], queryFn: () => api<{ events: { name: string }[] }>("/api/events"), enabled: !privateMode });

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [messages, busy]);

  const suggestions = [
    events.data?.events[0] && `Who did I meet at ${events.data.events[0].name}?`,
    "Who works in payments?",
    "Who should I follow up with?",
    "Which events did I go to?",
  ].filter(Boolean) as string[];

  const send = async (question: string) => {
    const qText = question.trim();
    if (!qText || busy) return;
    const history = messages.filter((m) => !m.error).slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: qText }]);
    setInput("");
    setBusy(true);
    try {
      const { answer } = await api<{ answer: string }>("/api/ask", { method: "POST", json: { question: qText, history } });
      setMessages((m) => [...m, { role: "assistant", content: answer || "I couldn't find anyone matching that in your cards." }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: (e as Error).message, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  if (privateMode) {
    return (
      <div>
        <PageHeader title="Ask" />
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-2 text-muted"><IconLock width={28} height={28} /></div>
          <p className="max-w-xs text-[15px] text-muted">Ask is off in Private mode, because questions and matching card text are sent to Groq.</p>
          <Link href="/settings" className="font-semibold text-accent">Settings</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-110px)] flex-col md:min-h-[calc(100dvh-20px)]">
      <PageHeader title="Ask">
        {messages.length > 0 && <button onClick={() => setMessages([])} className="min-h-11 px-2 text-[14px] font-semibold text-muted hover:text-fg">Clear</button>}
      </PageHeader>

      <div className="flex-1 space-y-3" aria-live="polite">
        {messages.length === 0 && (
          <div className="py-6">
            <p className="text-[15px] text-muted">Ask about the people in your cards. Answers come only from what you saved.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {suggestions.map((s) => <Chip key={s} onClick={() => send(s)}>{s}</Chip>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cx(
                "anim-fade-in max-w-[88%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                m.role === "user" ? "rounded-br-md bg-accent text-accent-fg" : m.error ? "rounded-bl-md bg-surface text-danger ring-1 ring-border" : "rounded-bl-md bg-surface ring-1 ring-border"
              )}
            >
              {m.role === "assistant" && !m.error ? <Markdown text={m.content} /> : m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start" aria-label="Thinking">
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-4 ring-1 ring-border">
              {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] -mx-4 mt-3 flex gap-2 bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0">
        <label htmlFor="ask-input" className="sr-only">Your question</label>
        <input
          id="ask-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Who did I meet at…"
          autoComplete="off"
          className="min-h-12 flex-1 rounded-xl border border-border bg-surface px-3 text-[16px] placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-fg hover:bg-accent-hover disabled:opacity-50">
          <IconSend width={20} height={20} />
        </button>
      </form>
    </div>
  );
}

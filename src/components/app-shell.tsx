"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { IconAsk, IconCards, IconEvents, IconScan, IconSettings } from "./icons";
import { cx } from "./ui";

const tabs = [
  { href: "/", label: "Cards", Icon: IconCards },
  { href: "/events", label: "Events", Icon: IconEvents },
  { href: "/scan", label: "Scan", Icon: IconScan, primary: true },
  { href: "/ask", label: "Ask", Icon: IconAsk },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

const isActive = (path: string, href: string) =>
  href === "/" ? path === "/" || path.startsWith("/cards") : path.startsWith(href);

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <Suspense fallback={<Sidebar path="" />}>
        <WithPath render={(p) => <Sidebar path={p} />} />
      </Suspense>

      <main className="mx-auto w-full max-w-2xl px-4 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-10">{children}</main>

      <Suspense fallback={<TabBar path="" />}>
        <WithPath render={(p) => <TabBar path={p} />} />
      </Suspense>
    </div>
  );
}

function WithPath({ render }: { render: (path: string) => ReactNode }) {
  return render(usePathname());
}

function Sidebar({ path }: { path: string }) {
  return (
    <>
      {/* Laptop sidebar */}
      <nav aria-label="Main" className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2 pt-2 text-[19px] font-bold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" className="h-7 w-7" /> Card Vault
        </div>
        {tabs.map(({ href, label, Icon, primary }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(path, href) ? "page" : undefined}
            className={cx(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors",
              primary
                ? "my-2 bg-accent text-accent-fg hover:bg-accent-hover"
                : isActive(path, href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
            )}
          >
            <Icon /> {primary ? "Scan a card" : label}
          </Link>
        ))}
      </nav>
    </>
  );
}

function TabBar({ path }: { path: string }) {
  return (
    <>
      {/* Mobile tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {tabs.map(({ href, label, Icon, primary }) => {
            const active = isActive(path, href);
            return (
              <li key={href} className="flex justify-center">
                {primary ? (
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className="-mt-6 mb-1 flex flex-col items-center gap-0.5 text-[11px] font-semibold text-accent"
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg ring-4 ring-bg">
                      <Icon width={26} height={26} />
                    </span>
                    {label}
                  </Link>
                ) : (
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cx("flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-semibold", active ? "text-accent" : "text-muted")}
                  >
                    <Icon />
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

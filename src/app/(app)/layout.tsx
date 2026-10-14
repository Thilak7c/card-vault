import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Providers>
      <AppShell>
        <Suspense>{children}</Suspense>
      </AppShell>
    </Providers>
  );
}

"use client";

import Link from "next/link";
import { RequireAuth } from "@/components/RequireAuth";
import { Logo, pill } from "@/components/ui";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      {() => (
        <>
          <header className="border-b border-hairline bg-surface">
            <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
              <Link href="/app" aria-label="Back to Signalboard">
                <Logo />
              </Link>
              <span className={`${pill} border-warning/40 bg-warning/[0.08] text-warning-ink`}>Test mode</span>
              <Link href="/app/billing" className="ml-auto text-muted hover:text-ink">
                Back to billing
              </Link>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
        </>
      )}
    </RequireAuth>
  );
}

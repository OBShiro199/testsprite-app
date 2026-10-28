"use client";

import Link from "next/link";
import { getContext } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { Logo, btnPrimary } from "./ui";

export function SiteHeader() {
  const ready = useStore();
  const ctx = ready ? getContext() : null;
  return (
    <header className="sticky top-0 z-[92] border-b border-hairline bg-surface">
      <div className="mx-auto flex h-12 max-w-[1180px] items-center gap-3 px-4">
        <Link href="/" aria-label="Signalboard home">
          <Logo />
        </Link>
        <nav aria-label="Site" className="ml-auto flex items-center gap-1">
          <Link
            href="/pricing"
            className="flex h-8 items-center rounded-md px-2.5 text-muted hover:bg-hover hover:text-ink"
          >
            Pricing
          </Link>
          {ctx ? (
            <Link href="/app" className={btnPrimary}>
              Open app
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="flex h-8 items-center rounded-md px-2.5 text-muted hover:bg-hover hover:text-ink"
              >
                Log in
              </Link>
              <Link href="/signup" className={btnPrimary}>
                Start free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Only allow redirects to paths on this site (never "//evil.com"). */
export function safeNext(next: string | null, fallback = "/app"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  return next;
}

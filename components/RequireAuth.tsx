"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getContext, logOut, type Context } from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { Loading, btnSecondary } from "./ui";

let leaving = false;

/** Logs out and goes to /login as a full page load, so Back re-runs this guard. */
export function logOutAndLeave() {
  leaving = true;
  logOut();
  window.location.assign("/login");
}

/**
 * Renders children only when someone is logged in. Otherwise sends them to
 * /login?next=<current path>. Runs on every render, so pressing Back after
 * logging out re-checks the session and never shows app data.
 */
export function RequireAuth({ children }: { children: (ctx: Context) => React.ReactNode }) {
  const ready = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const ctx = ready ? getContext() : null;

  useEffect(() => {
    if (ready && !ctx && !leaving) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/login?next=${encodeURIComponent(pathname + search)}`);
    }
  }, [ready, ctx, router, pathname]);

  if (!ready || !ctx) return <Loading />;

  if (!ctx.workspace) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1>You&apos;re not part of a workspace</h1>
        <p className="mt-2 text-muted">Ask a workspace owner for a new invite link.</p>
        <button type="button" className={`${btnSecondary} mt-6`} onClick={logOutAndLeave}>
          Log out
        </button>
      </main>
    );
  }

  return <>{children(ctx)}</>;
}

/** Shown on owner-only pages when a member visits them. */
export function OwnersOnly({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1>{message}</h1>
      <p className="mt-2 text-muted">Ask the workspace owner if you need something changed.</p>
    </div>
  );
}

"use client";

import { RequireAuth } from "@/components/RequireAuth";
import { TopBar } from "@/components/TopBar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      {(ctx) => (
        <>
          <TopBar ctx={ctx} />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        </>
      )}
    </RequireAuth>
  );
}

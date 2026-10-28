"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ConfirmDialog, btnDanger, btnSecondary, card } from "@/components/ui";
import { resetDemoData } from "@/lib/store";

export default function ResetPage() {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-12">
        <h1>Reset demo data</h1>
        <p className="mt-2 text-muted">
          Signalboard keeps everything in this browser. Resetting wipes every account, request, vote and invoice stored
          here and loads the demo workspaces (Acme and Northwind) again. You&apos;ll be logged out.
        </p>
        <div className={`${card} mt-6 p-5`}>
          {done ? (
            <div role="status">
              <p className="font-medium">Demo data has been reset.</p>
              <div className="mt-4 flex gap-2">
                <Link href="/login" className={btnSecondary}>
                  Log in
                </Link>
                <Link href="/b/acme" className={btnSecondary}>
                  Open Acme&apos;s board
                </Link>
              </div>
            </div>
          ) : (
            <button type="button" className={btnDanger} onClick={() => setConfirming(true)}>
              Reset demo data
            </button>
          )}
        </div>
      </main>
      <ConfirmDialog
        open={confirming}
        title="Reset all demo data?"
        message="Everything stored in this browser will be replaced with the demo seed. This can't be undone."
        confirmLabel="Yes, reset everything"
        danger
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          resetDemoData();
          setConfirming(false);
          setDone(true);
        }}
      />
    </>
  );
}

"use client";

import Link from "next/link";
import { OwnersOnly } from "@/components/RequireAuth";
import { btnPrimary, btnSecondary, card } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { getContext, workspaceInvoices } from "@/lib/store";
import { useStore } from "@/lib/useStore";

export default function CheckoutSuccessPage() {
  useStore();
  const ctx = getContext()!;
  const workspace = ctx.workspace!;
  if (ctx.role !== "owner") return <OwnersOnly message="Only the workspace owner can manage billing." />;

  const sub = workspace.subscription;
  if (workspace.plan !== "pro" || !sub) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1>{workspace.name} isn&apos;t on Pro yet</h1>
        <Link href="/checkout?interval=month" className={`${btnSecondary} mt-6`}>
          Go to checkout
        </Link>
      </div>
    );
  }
  const latest = workspaceInvoices(workspace.id)[0];

  return (
    <div className={`${card} mx-auto flex max-w-lg flex-col gap-5 p-8 text-center`} role="status">
      <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-success/40 bg-success/[0.08] text-success">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1>{workspace.name} is on Pro</h1>
      <dl className="tabular flex flex-col gap-2 text-left">
        <div className="flex justify-between gap-4 border-b border-divider pb-2">
          <dt className="text-muted">Plan</dt>
          <dd className="text-ink">Pro, {sub.interval === "month" ? "monthly" : "yearly"}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-divider pb-2">
          <dt className="text-muted">Amount paid</dt>
          <dd className="font-medium text-ink" data-testid="amount-paid">
            {latest ? formatMoney(latest.amountCents) : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Renews on</dt>
          <dd className="text-ink" data-testid="renewal-date">
            {formatDate(sub.currentPeriodEnd)}
          </dd>
        </div>
      </dl>
      <Link href="/app" className={btnPrimary}>
        Go to your inbox
      </Link>
    </div>
  );
}

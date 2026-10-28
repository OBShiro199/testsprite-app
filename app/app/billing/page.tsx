"use client";

import Link from "next/link";
import { useState } from "react";
import { OwnersOnly } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { ConfirmDialog, FieldError, Meter, btnDanger, btnPrimary, btnSecondary, card } from "@/components/ui";
import { formatDate, formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import {
  cancelSubscription,
  FREE_REQUEST_LIMIT,
  getContext,
  PRICES,
  requestsUsed,
  resumeSubscription,
  seatLimit,
  seatsUsed,
  workspaceInvoices,
} from "@/lib/store";
import { useStore } from "@/lib/useStore";

export default function BillingPage() {
  useStore();
  const toast = useToast();
  const ctx = getContext()!;
  const workspace = ctx.workspace!;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");

  // Enforced on the page, not just by hiding the link.
  if (ctx.role !== "owner") return <OwnersOnly message="Only the workspace owner can manage billing." />;

  const sub = workspace.subscription;
  const isPro = workspace.plan === "pro" && sub;
  const invoices = workspaceInvoices(workspace.id);
  const seats = seatsUsed(workspace.id);
  const seatMax = seatLimit(workspace);
  const requests = requestsUsed(workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Billing</h1>
        <p className="mt-1 text-muted">Your plan, usage and invoices for {workspace.name}.</p>
      </div>

      <section className={`${card} flex flex-col gap-4 p-5`} aria-labelledby="plan-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="plan-heading" className="!text-base">
              Current plan
            </h2>
            <p className="mt-1 text-lg font-medium text-ink" data-testid="current-plan">
              {isPro ? `Pro (${sub.interval === "month" ? "monthly" : "yearly"})` : "Free"}
            </p>
            {isPro ? (
              <p className="tabular mt-1 text-muted">
                {formatMoney(PRICES[sub.interval])} per {sub.interval === "month" ? "month" : "year"}
              </p>
            ) : (
              <p className="mt-1 text-muted">2 seats and 50 requests.</p>
            )}
          </div>
          {!isPro && (
            <Link href="/pricing" className={btnPrimary}>
              Upgrade to Pro
            </Link>
          )}
        </div>

        {isPro && (
          <dl className="tabular grid gap-3 border-t border-divider pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-faint">{sub.status === "cancelling" ? "Pro until" : "Renews on"}</dt>
              <dd className="text-ink" data-testid="renewal-date">
                {formatDate(sub.currentPeriodEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-faint">Card on file</dt>
              <dd className="text-ink" data-testid="card-on-file">
                {sub.cardBrand} ending {sub.cardLast4}
              </dd>
            </div>
          </dl>
        )}

        {isPro && sub.status === "cancelling" && (
          <div
            role="status"
            className="rounded-md border border-warning/40 bg-warning/[0.06] px-3 py-2 text-warning-ink"
            data-testid="cancelling-notice"
          >
            Pro until {formatDate(sub.currentPeriodEnd)}. You&apos;ll move to Free after that.
          </div>
        )}

        {isPro && (
          <div>
            {sub.status === "active" ? (
              <button type="button" className={btnDanger} onClick={() => setConfirmCancel(true)}>
                Cancel subscription
              </button>
            ) : (
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  const result = resumeSubscription();
                  if (result.ok) toast("Subscription resumed");
                  else setError(result.errors.form);
                }}
              >
                Resume subscription
              </button>
            )}
            <FieldError message={error} />
          </div>
        )}
      </section>

      <section className={`${card} grid gap-5 p-5 sm:grid-cols-2`} aria-labelledby="usage-heading">
        <h2 id="usage-heading" className="!text-base sm:col-span-2">
          Usage
        </h2>
        <div className="flex flex-col gap-2">
          <p className="tabular text-ink" data-testid="seat-usage">
            {seats} of {seatMax} seats used
          </p>
          <Meter used={seats} limit={seatMax} label="Seats used" />
        </div>
        <div className="flex flex-col gap-2">
          {workspace.plan === "pro" ? (
            <p className="tabular text-ink" data-testid="request-count">
              {requests} requests (unlimited on Pro)
            </p>
          ) : (
            <>
              <p className="tabular text-ink" data-testid="request-count">
                {requests} of {FREE_REQUEST_LIMIT} requests used
              </p>
              <Meter used={requests} limit={FREE_REQUEST_LIMIT} label="Requests used" />
            </>
          )}
        </div>
      </section>

      <section className={`${card} overflow-hidden`} aria-labelledby="invoices-heading">
        <h2 id="invoices-heading" className="border-b border-hairline px-4 py-3 !text-base">
          Invoices
        </h2>
        {invoices.length === 0 ? (
          <p className="px-4 py-6 text-faint">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tabular w-full min-w-[520px] text-left" data-testid="invoice-table">
              <thead>
                <tr className="h-9 border-b border-hairline text-faint">
                  <th scope="col" className="px-4 font-normal">
                    Date
                  </th>
                  <th scope="col" className="px-4 font-normal">
                    Description
                  </th>
                  <th scope="col" className="px-4 text-right font-normal">
                    Amount
                  </th>
                  <th scope="col" className="px-4 font-normal">
                    Card
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="h-12" data-testid="invoice-row">
                    <td className="px-4 text-muted">{formatShortDate(inv.date)}</td>
                    <td className="px-4 text-ink">{inv.description}</td>
                    <td className="px-4 text-right font-medium text-ink" data-testid="invoice-amount">
                      {formatMoney(inv.amountCents)}
                    </td>
                    <td className="px-4 text-muted">•••• {inv.cardLast4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel subscription"
        message={
          sub ? `${workspace.name} will stay on Pro until ${formatDate(sub.currentPeriodEnd)}, then move to Free.` : ""
        }
        confirmLabel="Cancel subscription"
        cancelLabel="Keep subscription"
        danger
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          const result = cancelSubscription();
          if (result.ok) toast("Subscription cancelled");
          else setError(result.errors.form);
        }}
      />
    </div>
  );
}

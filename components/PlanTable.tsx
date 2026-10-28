"use client";

import Link from "next/link";
import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { PRICES, type Interval } from "@/lib/store";
import { btnPrimary, btnSecondary, card } from "./ui";

const FEATURES: { label: string; free: string; pro: string }[] = [
  { label: "Team seats", free: "2", pro: "10" },
  { label: "Requests", free: "50", pro: "Unlimited" },
  { label: "Board accent colour", free: "No", pro: "Yes" },
  { label: "Public board and roadmap", free: "Yes", pro: "Yes" },
];

export function IntervalToggle({ interval, onChange }: { interval: Interval; onChange: (i: Interval) => void }) {
  return (
    <div role="group" aria-label="Billing interval" className="inline-flex h-9 rounded-md border border-btn-edge p-0.5">
      {(["month", "year"] as const).map((i) => (
        <button
          key={i}
          type="button"
          aria-pressed={interval === i}
          data-testid={`interval-${i}`}
          onClick={() => onChange(i)}
          className={`rounded px-3 ${interval === i ? "bg-accent-soft font-medium text-ink" : "text-muted hover:text-ink"}`}
        >
          {i === "month" ? "Monthly" : "Yearly"}
        </button>
      ))}
    </div>
  );
}

export function PlanTable({ compact = false }: { compact?: boolean }) {
  const [interval, setInterval] = useState<Interval>("month");
  const proPrice = interval === "month" ? `${formatMoney(PRICES.month)} a month` : `${formatMoney(PRICES.year)} a year`;

  return (
    <div className="flex flex-col items-center gap-6">
      <IntervalToggle interval={interval} onChange={setInterval} />
      <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
        <section className={`${card} flex flex-col gap-4 p-6`} aria-labelledby="plan-free">
          <div>
            <h2 id="plan-free">Free</h2>
            <p className="tabular mt-2 text-2xl font-medium text-ink">$0</p>
            <p className="text-muted">For trying it out with a small team.</p>
          </div>
          <dl className="flex flex-col divide-y divide-divider border-y border-divider">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex justify-between py-2">
                <dt className="text-muted">{f.label}</dt>
                <dd className="tabular font-medium text-ink">{f.free}</dd>
              </div>
            ))}
          </dl>
          <Link href="/signup" className={`${btnSecondary} mt-auto`}>
            Start free
          </Link>
        </section>
        <section className={`${card} flex flex-col gap-4 border-accent-edge p-6`} aria-labelledby="plan-pro">
          <div>
            <h2 id="plan-pro">Pro</h2>
            <p className="tabular mt-2 text-2xl font-medium text-ink" data-testid="pro-price">
              {proPrice}
            </p>
            <p className="text-muted">
              {interval === "year" ? "2 months free compared with monthly." : "Billed monthly. Cancel any time."}
            </p>
          </div>
          <dl className="flex flex-col divide-y divide-divider border-y border-divider">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex justify-between py-2">
                <dt className="text-muted">{f.label}</dt>
                <dd className="tabular font-medium text-ink">{f.pro}</dd>
              </div>
            ))}
          </dl>
          <Link href={`/checkout?interval=${interval}`} className={`${btnPrimary} mt-auto`}>
            Upgrade to Pro
          </Link>
          {!compact && interval === "month" && (
            <p className="text-faint">Launch offer: use code LAUNCH50 for 50% off your first month.</p>
          )}
        </section>
      </div>
    </div>
  );
}

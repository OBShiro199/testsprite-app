"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { OwnersOnly } from "@/components/RequireAuth";
import { IntervalToggle } from "@/components/PlanTable";
import {
  Field,
  FormError,
  Loading,
  TextInput,
  btnPrimary,
  btnSecondary,
  card,
  inputClass,
  linkClass,
} from "@/components/ui";
import { formatCardNumber, formatExpiry } from "@/lib/card";
import { formatMoney } from "@/lib/money";
import {
  getContext,
  normalisePromo,
  pay,
  quote,
  validateCard,
  type CardInput,
  type Errors,
  type Interval,
} from "@/lib/store";
import { useStore } from "@/lib/useStore";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Ireland",
  "Netherlands",
  "Spain",
  "Sweden",
  "India",
  "Japan",
  "Other",
];

const PROCESSING_MS = 1500;

function Checkout() {
  useStore();
  const router = useRouter();
  const params = useSearchParams();
  const ctx = getContext()!;
  const workspace = ctx.workspace!;
  const interval: Interval = params.get("interval") === "year" ? "year" : "month";

  const [codeInput, setCodeInput] = useState("");
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState("");
  const [cardInput, setCardInput] = useState<CardInput>({ name: "", number: "", expiry: "", cvc: "", country: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const inFlight = useRef(false);

  if (ctx.role !== "owner") return <OwnersOnly message="Only the workspace owner can manage billing." />;
  if (paid) return <Loading />;
  if (workspace.plan === "pro") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1>You&apos;re already on Pro</h1>
        <p className="mt-2 text-muted">{workspace.name} already has a Pro subscription.</p>
        <Link href="/app/billing" className={`${btnSecondary} mt-6`}>
          Go to billing
        </Link>
      </div>
    );
  }

  // Switching interval re-checks the applied code against the new interval.
  const q = quote(interval, appliedCode);
  const shownCodeError = appliedCode ? (q.promoError ?? "") : codeError;
  const set = (key: keyof CardInput) => (value: string) => setCardInput((c) => ({ ...c, [key]: value }));

  function changeInterval(next: Interval) {
    router.replace(`/checkout?interval=${next}`);
  }

  function applyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!codeInput.trim()) {
      setCodeError("Enter a promo code.");
      return;
    }
    const check = quote(interval, codeInput);
    if (check.promoError === "That code isn't valid.") {
      setCodeError(check.promoError);
      return;
    }
    // Known code: keep it applied even if it doesn't fit this interval, so it re-checks on switch.
    setAppliedCode(normalisePromo(codeInput));
    setCodeError("");
    setCodeInput("");
  }

  function onPay(e: React.FormEvent) {
    e.preventDefault();
    if (inFlight.current) return; // a second click while processing does nothing
    const fieldErrors = validateCard(cardInput);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) return;
    inFlight.current = true;
    setProcessing(true);
    setTimeout(() => {
      const result = pay(interval, appliedCode, cardInput);
      if (result.ok) {
        setPaid(true);
        router.push("/checkout/success");
        return;
      }
      setErrors(result.errors);
      setProcessing(false);
      inFlight.current = false;
    }, PROCESSING_MS);
  }

  const then =
    interval === "month" ? `Then ${formatMoney(q.baseCents)} per month` : `Then ${formatMoney(q.baseCents)} per year`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-6">
        <div>
          <h1>Upgrade {workspace.name} to Pro</h1>
          <p className="mt-2 text-muted">10 seats, unlimited requests and your own board colour.</p>
        </div>

        <div
          role="note"
          className="rounded-md border border-warning/40 bg-warning/[0.06] px-4 py-3 text-body"
          data-testid="test-mode-note"
        >
          <p className="font-medium text-ink">Test mode: no real money moves.</p>
          <ul className="tabular mt-1 flex flex-col gap-0.5">
            <li>4242 4242 4242 4242 succeeds</li>
            <li>4000 0000 0000 0002 is declined</li>
            <li>4000 0000 0000 9995 has insufficient funds</li>
            <li>Use any future expiry date and any 3-digit CVC.</li>
          </ul>
        </div>

        <form onSubmit={onPay} noValidate className={`${card} flex flex-col gap-1 p-5`} aria-labelledby="card-heading">
          <h2 id="card-heading" className="mb-3">
            Payment details
          </h2>
          <FormError message={errors.card ?? errors.form} />
          <TextInput
            label="Name on card"
            autoComplete="cc-name"
            value={cardInput.name}
            onChange={(e) => set("name")(e.target.value)}
            error={errors.name}
          />
          <TextInput
            label="Card number"
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            value={cardInput.number}
            onChange={(e) => set("number")(formatCardNumber(e.target.value))}
            error={errors.number}
            data-testid="card-number"
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Expiry (MM/YY)"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              value={cardInput.expiry}
              onChange={(e) => set("expiry")(formatExpiry(e.target.value))}
              error={errors.expiry}
              data-testid="card-expiry"
            />
            <TextInput
              label="CVC"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="123"
              maxLength={4}
              value={cardInput.cvc}
              onChange={(e) => set("cvc")(e.target.value.replace(/\D/g, ""))}
              error={errors.cvc}
              data-testid="card-cvc"
            />
          </div>
          <Field label="Billing country" htmlFor="country" error={errors.country}>
            <select
              id="country"
              autoComplete="country-name"
              value={cardInput.country}
              onChange={(e) => set("country")(e.target.value)}
              className={inputClass}
              aria-invalid={errors.country ? true : undefined}
            >
              <option value="">Choose a country</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="submit"
            disabled={processing}
            aria-busy={processing}
            className={`${btnPrimary} mt-2 h-11 w-full`}
            data-testid="pay-button"
          >
            {processing ? "Processing payment…" : `Pay ${formatMoney(q.dueCents)}`}
          </button>
        </form>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <section className={`${card} flex flex-col gap-4 p-5`} aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="!text-base">
            Order summary
          </h2>
          <IntervalToggle interval={interval} onChange={changeInterval} />
          <dl className="tabular flex flex-col gap-2">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Plan</dt>
              <dd className="text-ink" data-testid="summary-plan">
                Signalboard Pro, {interval === "month" ? "monthly" : "yearly"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Price</dt>
              <dd className="text-ink">
                {formatMoney(q.baseCents)} / {interval === "month" ? "month" : "year"}
              </dd>
            </div>
            {q.promo && (
              <div className="flex justify-between gap-4" data-testid="discount-line">
                <dt className="text-muted">{q.promo} · 50% off first month</dt>
                <dd className="text-success">−{formatMoney(q.discountCents)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 border-t border-hairline pt-3">
              <dt className="font-medium text-ink">Due today</dt>
              <dd className="text-base font-medium text-ink" data-testid="checkout-total">
                {formatMoney(q.dueCents)}
              </dd>
            </div>
            <p className="text-faint" data-testid="then-line">
              {then}
            </p>
          </dl>
        </section>

        <section className={`${card} flex flex-col gap-2 p-5`} aria-labelledby="promo-heading">
          <h2 id="promo-heading" className="!text-base">
            Promo code
          </h2>
          {appliedCode ? (
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-ink" data-testid="applied-code">
                {appliedCode}
                {q.promo ? " applied" : ""}
              </span>
              <button
                type="button"
                className={linkClass}
                onClick={() => {
                  setAppliedCode(null);
                  setCodeError("");
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <form onSubmit={applyCode} noValidate className="flex gap-2">
              <label htmlFor="promo" className="sr-only">
                Promo code
              </label>
              <input
                id="promo"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder="Promo code"
                className={inputClass}
                data-testid="promo-input"
                aria-invalid={codeError ? true : undefined}
                aria-describedby="promo-error"
              />
              <button type="submit" className={btnSecondary}>
                Apply
              </button>
            </form>
          )}
          <p
            id="promo-error"
            role="alert"
            aria-live="polite"
            className="min-h-4.5 text-danger-ink"
            data-testid="promo-error"
          >
            {shownCodeError}
          </p>
        </section>
      </aside>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Checkout />
    </Suspense>
  );
}

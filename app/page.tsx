"use client";

import Link from "next/link";
import { PlanTable } from "@/components/PlanTable";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo, btnPrimary, btnSecondary, pill } from "@/components/ui";

const STEPS = [
  {
    title: "Collect",
    body: "Share your board link. Customers post feature requests and upvote the ones they want, one vote per email.",
  },
  {
    title: "Prioritise",
    body: "Your team sees every request ranked by votes, replies in public, and merges duplicates without double-counting.",
  },
  {
    title: "Show progress",
    body: "Move requests to Planned, In progress and Shipped. Your public roadmap updates the moment you do.",
  },
];

const PREVIEW = [
  {
    title: "Slack notifications for new requests",
    status: "In progress",
    votes: 40,
    tone: "border-accent-edge bg-accent-soft text-[#3559b0]",
  },
  { title: "Dark mode", status: "Shipped", votes: 37, tone: "border-success/35 bg-success/[0.08] text-[#1b7a31]" },
  {
    title: "API access",
    status: "Planned",
    votes: 31,
    tone: "border-tag-violet/35 bg-tag-violet/[0.08] text-[#5b3fb0]",
  },
  { title: "Export to CSV", status: "Open", votes: 24, tone: "border-hairline bg-hover text-muted" },
];

/** A static picture of a board, so visitors see what their customers will see. */
function BoardPreview() {
  return (
    <div className="border border-hairline bg-surface shadow-float" aria-label="Example feedback board" role="img">
      <div className="flex h-10 items-center gap-2 border-b border-hairline px-4">
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="font-semibold text-ink">Acme</span>
        <span className="ml-auto text-faint">Requests · Roadmap</span>
      </div>
      <ul className="divide-y divide-divider">
        {PREVIEW.map((p) => (
          <li key={p.title} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink">{p.title}</span>
              <span className={`${pill} mt-1 ${p.tone}`}>{p.status}</span>
            </span>
            <span className="tabular w-10 text-right font-medium text-ink">{p.votes}</span>
            <span className="flex h-8 items-center rounded-md border border-body px-2.5 font-medium text-ink">
              Upvote
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1180px] border-x border-hairline">
        <section className="grid items-center gap-12 px-4 py-14 md:px-10 md:py-20 lg:grid-cols-2">
          <div className="min-w-0">
            <h1 className="!text-[clamp(32px,5vw,48px)] !leading-[1.04] !tracking-[-0.045em]">
              Hear what your customers want, then show them you&apos;re building it
            </h1>
            <p className="mt-5 max-w-[52ch] text-base leading-6 text-muted">
              Signalboard gives your SaaS a public feedback board and roadmap. Customers post and vote on ideas; your
              team sees what matters most and shows its progress.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className={`${btnPrimary} h-11 px-5`}>
                Start free
              </Link>
              <Link href="/b/acme" className={`${btnSecondary} h-11 px-5`}>
                See a live board
              </Link>
            </div>
          </div>
          <div className="min-w-0">
            <BoardPreview />
          </div>
        </section>

        <section className="border-t border-hairline px-4 py-14 md:px-10 md:py-20" aria-labelledby="how-heading">
          <h2 id="how-heading" className="!text-2xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-px border border-hairline bg-hairline md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="bg-surface p-6">
                <span className="tabular text-faint">0{i + 1}</span>
                <h3 className="mt-2 text-xl">{s.title}</h3>
                <p className="mt-2 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-t border-hairline px-4 py-14 md:px-10 md:py-20" aria-labelledby="pricing-heading">
          <div className="mb-8 text-center">
            <h2 id="pricing-heading" className="!text-2xl">
              Pricing
            </h2>
            <p className="mt-2 text-muted">Free for small teams. Pro when you outgrow it.</p>
          </div>
          <PlanTable compact />
        </section>
      </main>
      <footer className="border-t border-hairline">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-4 px-4 py-6 text-faint md:px-10">
          <Logo />
          <span>Demo app. All data stays in this browser.</span>
          <Link href="/pricing" className="hover:text-ink">
            Pricing
          </Link>
          <Link href="/reset" className="ml-auto hover:text-ink" data-testid="reset-link">
            Reset demo data
          </Link>
        </div>
      </footer>
    </>
  );
}

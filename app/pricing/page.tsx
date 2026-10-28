"use client";

import { PlanTable } from "@/components/PlanTable";
import { SiteHeader } from "@/components/SiteHeader";

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1180px] px-4 py-14">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <h1>Simple pricing</h1>
          <p className="mt-3 text-muted">Start free. Upgrade when your team or your board outgrows it.</p>
        </div>
        <PlanTable />
      </main>
    </>
  );
}

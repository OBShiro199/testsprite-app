"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { btnPrimary } from "@/components/ui";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1>Hear what your customers want, then show them you&apos;re building it</h1>
        <Link href="/signup" className={`${btnPrimary} mt-8`}>
          Start free
        </Link>
        <p className="mt-16">
          <Link href="/reset" className="text-muted underline">
            Reset demo data
          </Link>
        </p>
      </main>
    </>
  );
}

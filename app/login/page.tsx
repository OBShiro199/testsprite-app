"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader, safeNext } from "@/components/SiteHeader";
import { FormError, Loading, TextInput, btnPrimary, card, linkClass } from "@/components/ui";
import { getContext, logIn } from "@/lib/store";
import { useStore } from "@/lib/useStore";

function LoginForm() {
  const ready = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const loggedIn = ready && !!getContext();

  useEffect(() => {
    if (loggedIn && !busy) router.replace(next);
  }, [loggedIn, busy, next, router]);

  if (!ready || loggedIn) return <Loading />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const result = await logIn(email, password);
    if (!result.ok) {
      setError(result.errors.form);
      setBusy(false);
      return;
    }
    router.replace(next);
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1>Log in to Signalboard</h1>
      <p className="mt-1 text-muted">
        New here?{" "}
        <Link href="/signup" className={linkClass}>
          Create an account
        </Link>
      </p>
      <form onSubmit={onSubmit} noValidate className={`${card} mt-6 space-y-4 p-5`}>
        <FormError message={error} />
        <TextInput
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextInput
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<Loading />}>
        <LoginForm />
      </Suspense>
    </>
  );
}

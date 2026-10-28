"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Loading, TextInput, btnPrimary, card, linkClass } from "@/components/ui";
import { getContext, signUp, type Errors } from "@/lib/store";
import { useStore } from "@/lib/useStore";

export default function SignupPage() {
  const ready = useStore();
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", workspaceName: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const loggedIn = ready && !!getContext();

  useEffect(() => {
    if (loggedIn && !busy) router.replace("/app");
  }, [loggedIn, busy, router]);

  if (!ready || loggedIn) {
    return (
      <>
        <SiteHeader />
        <Loading />
      </>
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const result = await signUp(form);
    if (!result.ok) {
      setErrors(result.errors);
      setBusy(false);
      return;
    }
    router.replace("/app");
  }

  const emailExists = errors.email?.startsWith("An account with this email already exists");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-sm px-4 py-12">
        <h1>Create your feedback board</h1>
        <p className="mt-1 text-muted">
          Free for up to 2 teammates and 50 requests. Already have an account?{" "}
          <Link href="/login" className={linkClass}>
            Log in
          </Link>
        </p>
        <form onSubmit={onSubmit} noValidate className={`${card} mt-6 space-y-4 p-5`}>
          <TextInput
            label="Your name"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={set("name")}
            error={errors.name}
          />
          <TextInput
            label="Work email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
            errorAction={
              emailExists ? (
                <Link href="/login" className={linkClass}>
                  Go to log in
                </Link>
              ) : undefined
            }
          />
          <TextInput
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            hint="At least 8 characters, including a letter and a number."
          />
          <TextInput
            label="Workspace name"
            name="workspaceName"
            placeholder="Acme"
            value={form.workspaceName}
            onChange={set("workspaceName")}
            error={errors.workspaceName}
            hint="Your public board will live at /b/your-workspace."
          />
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? "Creating your board…" : "Create account"}
          </button>
        </form>
      </main>
    </>
  );
}

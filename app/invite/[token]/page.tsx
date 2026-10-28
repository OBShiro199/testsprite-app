"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { FormError, Loading, TextInput, btnPrimary, btnSecondary, card, linkClass } from "@/components/ui";
import {
  acceptInvite,
  getContext,
  getInvite,
  logOut,
  normaliseEmail,
  signUpWithInvite,
  type Errors,
} from "@/lib/store";
import { useStore } from "@/lib/useStore";

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1>{title}</h1>
      {children}
    </main>
  );
}

function InviteSignup({
  token,
  email,
  workspaceName,
  onJoined,
}: {
  token: string;
  email: string;
  workspaceName: string;
  onJoined: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  return (
    <form
      noValidate
      className={`${card} mt-6 flex flex-col gap-1 p-5`}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const result = await signUpWithInvite(token, name, password);
        if (!result.ok) {
          setErrors(result.errors);
          setBusy(false);
          return;
        }
        onJoined();
        router.replace("/app");
      }}
    >
      <h2 className="mb-2 !text-base">Create your account</h2>
      <FormError message={errors.form} />
      <TextInput
        label="Your name"
        autoComplete="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <TextInput
        label="Work email"
        type="email"
        value={email}
        readOnly
        aria-readonly="true"
        error={errors.email}
        errorAction={
          errors.email ? (
            <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={linkClass}>
              Go to log in
            </Link>
          ) : undefined
        }
        hint="Locked to the invited email."
      />
      <TextInput
        label="Password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint="At least 8 characters, including a letter and a number."
      />
      <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
        {busy ? "Joining…" : `Join ${workspaceName}`}
      </button>
    </form>
  );
}

export default function InvitePage() {
  const ready = useStore();
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const accepting = useRef(false);

  const lookup = ready ? getInvite(token) : null;
  const ctx = ready ? getContext() : null;
  const emailMatches = lookup?.state === "pending" && ctx && normaliseEmail(ctx.user.email) === lookup.invite.email;

  // Logged in with the invited email: join straight away.
  useEffect(() => {
    if (!emailMatches || accepting.current) return;
    accepting.current = true;
    const result = acceptInvite(token);
    if (result.ok) {
      setJoined(true);
      router.replace("/app");
    } else setError(result.errors.form);
  }, [emailMatches, token, router]);

  let body: React.ReactNode;
  if (!lookup || joined) body = <Loading />;
  else if (lookup.state === "invalid") body = <Message title="This invite isn't valid any more." />;
  else if (lookup.state === "used") body = <Message title="This invite has already been used." />;
  else if (error) body = <Message title={error} />;
  else if (emailMatches) body = <Loading />;
  else if (ctx) {
    body = (
      <Message title={`Join ${lookup.workspace.name} on Signalboard`}>
        <p role="alert" className="mt-3 text-danger-ink" data-testid="invite-wrong-email">
          This invite was sent to {lookup.invite.email}. Log out and sign in with that email to accept it.
        </p>
        <button type="button" className={`${btnSecondary} mt-6`} onClick={logOut}>
          Log out
        </button>
      </Message>
    );
  } else {
    body = (
      <Message title={`Join ${lookup.workspace.name} on Signalboard`}>
        <p className="mt-2 text-muted">
          You&apos;ve been invited to help manage {lookup.workspace.name}&apos;s feedback board.
        </p>
        <InviteSignup
          token={token}
          email={lookup.invite.email}
          workspaceName={lookup.workspace.name}
          onJoined={() => setJoined(true)}
        />
        <p className="mt-4 text-muted">
          Already have an account?{" "}
          <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className={linkClass}>
            Log in to accept
          </Link>
        </p>
      </Message>
    );
  }

  return (
    <>
      <SiteHeader />
      {body}
    </>
  );
}

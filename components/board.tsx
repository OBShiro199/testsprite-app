"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useState } from "react";
import {
  effectiveAccent,
  getVoterEmail,
  getWorkspaceBySlug,
  hasVoted,
  removeVote,
  setVoterEmail,
  vote,
  voteCount,
  type Workspace,
} from "@/lib/store";
import { useStore } from "@/lib/useStore";
import { useToast } from "./Toast";
import { Dialog, FieldError, Loading, Logo, NotFound, TextInput, btn, btnCompact, btnSecondary, linkClass } from "./ui";

/** Style for the board's primary buttons: the Pro accent colour as a firm edge, otherwise the default. */
export function accentButton(accent: string | null): { className: string; style?: React.CSSProperties } {
  if (!accent) return { className: `${btn} border-body text-ink hover:bg-hover` };
  return { className: `${btn} hover:bg-hover font-medium`, style: { borderColor: accent, color: accent } };
}

/** Loads the board for /b/[slug] and passes it down, or shows the 404. */
export function BoardShell({
  children,
}: {
  children: (workspace: Workspace, accent: string | null) => React.ReactNode;
}) {
  const ready = useStore();
  const params = useParams<{ slug: string }>();
  const pathname = usePathname();
  if (!ready) return <Loading />;
  const workspace = getWorkspaceBySlug(params.slug);
  if (!workspace)
    return (
      <NotFound title="This board doesn't exist." message="Check the link, or ask the team for their board address." />
    );
  const accent = effectiveAccent(workspace);
  const base = `/b/${workspace.slug}`;
  const onRoadmap = pathname.endsWith("/roadmap");

  return (
    <div className="min-h-screen" data-accent={accent ?? undefined}>
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-12 max-w-4xl items-center gap-3 px-4">
          <Link href={base} className="flex items-center gap-2 font-semibold text-ink">
            <span
              aria-hidden="true"
              className="inline-block size-2.5 rounded-full"
              style={{ backgroundColor: accent ?? "var(--accent)" }}
            />
            <span data-testid="board-name">{workspace.name}</span>
          </Link>
          <nav aria-label="Board" className="ml-auto flex items-center gap-0.5">
            <Link
              href={base}
              aria-current={!onRoadmap && pathname === base ? "page" : undefined}
              className={`flex h-8 items-center rounded-md px-2.5 ${!onRoadmap ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover hover:text-ink"}`}
            >
              Requests
            </Link>
            <Link
              href={`${base}/roadmap`}
              aria-current={onRoadmap ? "page" : undefined}
              className={`flex h-8 items-center rounded-md px-2.5 ${onRoadmap ? "bg-hover font-medium text-ink" : "text-muted hover:bg-hover hover:text-ink"}`}
            >
              Roadmap
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children(workspace, accent)}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-10 text-faint">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-muted">
          Powered by <Logo />
        </Link>
      </footer>
    </div>
  );
}

/** Shows who this browser is voting as, with a "Not you?" link to change it. */
export function VoterIdentity() {
  const email = getVoterEmail();
  if (!email) return null;
  return (
    <p className="text-muted" data-testid="voter-identity">
      Voting as <span className="font-medium text-ink">{email}</span>.{" "}
      <button type="button" className={linkClass} onClick={() => setVoterEmail(null)}>
        Not you?
      </button>
    </p>
  );
}

/** Vote count with Upvote and Remove my vote. Asks for an email the first time. */
export function VoteControl({ requestId, accent, title }: { requestId: string; accent: string | null; title: string }) {
  const toast = useToast();
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const voter = getVoterEmail();
  const voted = hasVoted(requestId, voter);
  const count = voteCount(requestId);
  const primary = accentButton(accent);

  function castVote(email: string): boolean {
    const result = vote(requestId, email);
    if (!result.ok) {
      if (result.errors.email) {
        setEmailError(result.errors.email);
        return false;
      }
      setVoterEmail(email);
      setError(result.errors.form);
      return true;
    }
    setVoterEmail(email);
    setError("");
    toast("Vote added");
    return true;
  }

  return (
    <div className="flex w-full flex-col gap-1 sm:w-44 sm:items-end">
      <div className="flex items-center gap-3">
        <span className="flex w-16 items-baseline gap-1 sm:justify-end">
          <span data-testid="vote-count" className="tabular text-base font-medium text-ink">
            {count}
          </span>
          <span className="text-faint">{count === 1 ? "vote" : "votes"}</span>
        </span>
        <button
          type="button"
          aria-label={`Upvote ${title}`}
          className={`${primary.className} ${btnCompact} w-20`}
          style={primary.style}
          onClick={() => {
            setError("");
            if (voter) castVote(voter);
            else {
              setEmailInput("");
              setEmailError("");
              setAsking(true);
            }
          }}
        >
          Upvote
        </button>
      </div>
      {/* Kept in the layout (just hidden) so rows don't jump when a vote is added. */}
      <button
        type="button"
        aria-label={`Remove my vote from ${title}`}
        className={`${linkClass} min-h-4.5 text-muted ${voted ? "" : "invisible"}`}
        tabIndex={voted ? 0 : -1}
        aria-hidden={voted ? undefined : true}
        onClick={() => {
          const result = removeVote(requestId, voter ?? "");
          if (result.ok) {
            setError("");
            toast("Vote removed");
          } else setError(result.errors.form);
        }}
      >
        Remove my vote
      </button>
      {error && <FieldError message={error} />}

      <Dialog open={asking} onClose={() => setAsking(false)} title="Upvote this request">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (castVote(emailInput)) setAsking(false);
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-muted">
            Enter your email so the team can count your vote. We&apos;ll remember it on this device.
          </p>
          <TextInput
            label="Your email"
            type="email"
            autoComplete="email"
            autoFocus
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            error={emailError}
          />
          <div className="flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={() => setAsking(false)}>
              Cancel
            </button>
            <button type="submit" className={primary.className} style={primary.style}>
              Upvote
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

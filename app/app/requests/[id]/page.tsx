"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import {
  ConfirmDialog,
  Field,
  FieldError,
  NotFound,
  StatusBadge,
  btnPrimary,
  btnSecondary,
  card,
  inputClass,
  linkClass,
  pill,
  textareaClass,
} from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { useStore } from "@/lib/useStore";
import {
  addReply,
  getContext,
  getRequest,
  mergeRequest,
  mergeTargets,
  mergedFrom,
  repliesFor,
  setStatus,
  STATUSES,
  STATUS_LABELS,
  votesFor,
  type Request,
  type Status,
} from "@/lib/store";

function MergePanel({ request, onMerged }: { request: Request; onMerged: (target: Request) => void }) {
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const targets = mergeTargets(request.id, search);
  const target = targetId ? getRequest(targetId) : null;

  return (
    <section aria-labelledby="merge-heading" className={`${card} flex flex-col gap-3 p-5`}>
      <div>
        <h2 id="merge-heading">Merge into another request</h2>
        <p className="mt-1 text-muted">
          Use this for duplicates. Votes move to the other request (each person counts once) and this one disappears
          from lists.
        </p>
      </div>
      <label>
        <span className="sr-only">Search requests to merge into</span>
        <input
          type="search"
          placeholder="Search requests"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
          data-testid="merge-search"
        />
      </label>
      <ul
        role="listbox"
        aria-label="Merge target"
        className="max-h-64 divide-y divide-divider overflow-y-auto rounded-md border border-hairline"
      >
        {targets.length === 0 && <li className="px-3 py-4 text-faint">No matching requests.</li>}
        {targets.map(({ request: t, votes }) => (
          <li
            key={t.id}
            role="option"
            aria-selected={targetId === t.id}
            tabIndex={0}
            onClick={() => setTargetId(t.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setTargetId(t.id);
              }
            }}
            className={`flex cursor-pointer items-center gap-3 px-3 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${targetId === t.id ? "bg-accent-soft" : "hover:bg-row-hover"}`}
          >
            <span className="min-w-0 flex-1 truncate text-ink">{t.title}</span>
            <span className="tabular text-faint">{votes} votes</span>
          </li>
        ))}
      </ul>
      <FieldError message={error} />
      <div>
        <button type="button" className={btnSecondary} disabled={!target} onClick={() => setConfirming(true)}>
          {target ? "Merge into selected request" : "Pick a request to merge into"}
        </button>
      </div>
      <ConfirmDialog
        open={confirming && !!target}
        title="Merge requests"
        message={`Merge into ${target?.title}? This can't be undone.`}
        confirmLabel="Merge"
        danger
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          if (!target) return;
          const result = mergeRequest(request.id, target.id);
          if (!result.ok) setError(result.errors.target ?? result.errors.form);
          else onMerged(target);
        }}
      />
    </section>
  );
}

export default function TeamRequestPage() {
  useStore();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const ctx = getContext()!;
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState("");
  const request = getRequest(id);

  if (!request || request.workspaceId !== ctx.workspace!.id) return <NotFound title="This request doesn't exist." />;

  const votes = votesFor(request.id);
  const replies = repliesFor(request.id);
  const merged = mergedFrom(request.id);
  const mergedInto = request.mergedInto ? getRequest(request.mergedInto) : null;
  const publicUrl = `/b/${ctx.workspace!.slug}/requests/${request.id}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/app" className={`${linkClass} self-start`}>
        ← Inbox
      </Link>

      {mergedInto && (
        <div role="status" className="rounded-md border border-accent-edge bg-accent-soft px-4 py-3 text-ink">
          This request was merged into{" "}
          <Link href={`/app/requests/${mergedInto.id}`} className={linkClass}>
            {mergedInto.title}
          </Link>
          .
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <article className={`${card} p-5`}>
            <div className="flex flex-wrap items-center gap-2 text-faint">
              <StatusBadge status={request.status} />
              <span>
                Posted {formatShortDate(request.createdAt)} by {request.authorEmail}
              </span>
            </div>
            <h1 className="mt-3">{request.title}</h1>
            {request.description ? (
              <p className="mt-3 max-w-[65ch] whitespace-pre-line">{request.description}</p>
            ) : (
              <p className="mt-3 text-faint">No description.</p>
            )}
            {merged.length > 0 && (
              <p className="mt-4 text-muted" data-testid="merged-from">
                Merged from: {merged.map((m) => m.title).join(", ")}
              </p>
            )}
            {!mergedInto && (
              <a href={publicUrl} target="_blank" rel="noopener" className={`${linkClass} mt-4 inline-block`}>
                View on public board
              </a>
            )}
          </article>

          <section aria-labelledby="replies-heading" className="flex flex-col gap-3">
            <h2 id="replies-heading">
              Replies <span className="tabular text-faint">{replies.length}</span>
            </h2>
            {replies.length === 0 && <p className="text-faint">No replies yet.</p>}
            {replies.map(({ reply: r, author }) => (
              <div key={r.id} className={`${card} p-4`} data-testid="reply">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{author?.name ?? "Team member"}</span>
                  <span className={`${pill} border-accent-edge bg-accent-soft text-[#3559b0]`} data-testid="team-badge">
                    Team
                  </span>
                  <span className="text-faint">{formatShortDate(r.createdAt)}</span>
                </div>
                <p className="mt-2 max-w-[65ch] whitespace-pre-line">{r.body}</p>
              </div>
            ))}
            {!mergedInto && (
              <form
                noValidate
                className={`${card} flex flex-col gap-2 p-4`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const result = addReply(request.id, reply);
                  if (!result.ok) {
                    setReplyError(result.errors.body ?? result.errors.form);
                    return;
                  }
                  setReply("");
                  setReplyError("");
                  toast("Reply posted");
                }}
              >
                <Field
                  label="Reply as the team"
                  htmlFor="reply"
                  error={replyError}
                  hint="Shown publicly with a Team badge."
                >
                  <textarea
                    id="reply"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className={textareaClass}
                    aria-invalid={replyError ? true : undefined}
                  />
                </Field>
                <div>
                  <button type="submit" className={btnPrimary}>
                    Post reply
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className={`${card} flex flex-col gap-2 p-5`} aria-labelledby="status-heading">
            <h2 id="status-heading" className="!text-base">
              Status
            </h2>
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <select
              id="status"
              data-testid="status-select"
              aria-label="Status"
              value={request.status}
              disabled={!!mergedInto}
              onChange={(e) => {
                const next = e.target.value as Status;
                if (setStatus(request.id, next).ok) toast(`Moved to ${STATUS_LABELS[next]}`);
              }}
              className={inputClass}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="text-faint">Updates the public board and roadmap straight away.</p>
          </section>

          <section className={`${card} flex flex-col gap-2 p-5`} aria-labelledby="votes-heading">
            <h2 id="votes-heading" className="!text-base">
              Votes{" "}
              <span className="tabular text-muted" data-testid="vote-count">
                {votes.length}
              </span>
            </h2>
            {votes.length === 0 ? (
              <p className="text-faint">No votes yet.</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto" data-testid="voter-list">
                {votes.map((v) => (
                  <li key={v.id} className="truncate py-0.5 text-muted">
                    {v.voterEmail}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {!mergedInto && (
        <MergePanel
          request={request}
          onMerged={(target) => {
            toast(`Merged into ${target.title}`);
            router.push(`/app/requests/${target.id}`);
          }}
        />
      )}
    </div>
  );
}

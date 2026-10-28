"use client";

import Link from "next/link";
import { useState } from "react";
import { BoardShell, VoteControl, VoterIdentity, accentButton } from "@/components/board";
import { useToast } from "@/components/Toast";
import { Field, FormError, StatusBadge, TextInput, card, inputClass, linkClass, textareaClass } from "@/components/ui";
import {
  getVoterEmail,
  listRequests,
  postRequest,
  setVoterEmail,
  STATUSES,
  STATUS_LABELS,
  type Errors,
  type Sort,
  type Status,
  type Workspace,
} from "@/lib/store";

function PostRequestForm({ workspace, accent }: { workspace: Workspace; accent: string | null }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(() => getVoterEmail() ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const primary = accentButton(accent);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = postRequest(workspace.slug, { title, description, email });
    if (!result.ok) {
      setErrors(result.errors);
      setDuplicateId(result.duplicateId ?? null);
      return;
    }
    setVoterEmail(email);
    setErrors({});
    setDuplicateId(null);
    setTitle("");
    setDescription("");
    toast("Request posted");
  }

  return (
    <form onSubmit={onSubmit} noValidate className={`${card} flex flex-col gap-1 p-5`} aria-labelledby="post-heading">
      <h2 id="post-heading">Post a request</h2>
      <p className="mb-3 text-muted">Tell the {workspace.name} team what would make the product better for you.</p>
      <FormError message={errors.form} />
      <TextInput
        label="Title"
        name="title"
        value={title}
        maxLength={120}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        errorAction={
          duplicateId ? (
            <Link href={`/b/${workspace.slug}/requests/${duplicateId}`} className={linkClass}>
              View the existing request
            </Link>
          ) : undefined
        }
        hint="5 to 80 characters."
      />
      <Field
        label="Description (optional)"
        htmlFor="description"
        error={errors.description}
        hint="Up to 1,000 characters."
      >
        <textarea
          id="description"
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={textareaClass}
          aria-invalid={errors.description ? true : undefined}
        />
      </Field>
      <TextInput
        label="Your email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />
      <div>
        <button type="submit" className={primary.className} style={primary.style}>
          Post request
        </button>
      </div>
    </form>
  );
}

function RequestList({ workspace, accent }: { workspace: Workspace; accent: string | null }) {
  const [sort, setSort] = useState<Sort>("top");
  const [status, setStatus] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const rows = listRequests(workspace.id, { sort, status, search });

  return (
    <section aria-labelledby="requests-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <h2 id="requests-heading" className="mr-auto">
          Feature requests
        </h2>
        <div role="group" aria-label="Sort" className="flex h-9 rounded-md border border-btn-edge p-0.5">
          {(["top", "new"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => setSort(s)}
              className={`rounded px-3 ${sort === s ? "bg-accent-soft font-medium text-ink" : "text-muted hover:text-ink"}`}
            >
              {s === "top" ? "Top" : "New"}
            </button>
          ))}
        </div>
        <label className="flex flex-col">
          <span className="sr-only">Filter by status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "all")}
            className={`${inputClass} w-36`}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span className="sr-only">Search requests</span>
        <input
          type="search"
          placeholder="Search requests"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={inputClass}
        />
      </label>
      <VoterIdentity />
      <p className="tabular text-faint" aria-live="polite">
        {rows.length} {rows.length === 1 ? "request" : "requests"}
      </p>
      {rows.length === 0 ? (
        <div className={`${card} px-5 py-10 text-center text-muted`}>
          {search || status !== "all"
            ? "No requests match your filters."
            : "No requests yet. Be the first to post one."}
        </div>
      ) : (
        <ul className={`${card} divide-y divide-divider`} data-testid="request-list">
          {rows.map(({ request, replies }) => (
            <li
              key={request.id}
              data-testid="request-item"
              className="flex flex-col gap-3 px-4 py-4 hover:bg-row-hover sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/b/${workspace.slug}/requests/${request.id}`}
                  className="font-medium text-ink hover:underline"
                  data-testid="request-title"
                >
                  {request.title}
                </Link>
                {request.description && <p className="mt-1 line-clamp-2 text-muted">{request.description}</p>}
                <div className="mt-2 flex items-center gap-3 text-faint">
                  <StatusBadge status={request.status} accent={accent} />
                  <span className="tabular" data-testid="reply-count">
                    {replies} {replies === 1 ? "reply" : "replies"}
                  </span>
                </div>
              </div>
              <VoteControl requestId={request.id} accent={accent} title={request.title} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function BoardPage() {
  return (
    <BoardShell>
      {(workspace, accent) => (
        <div className="flex flex-col gap-8">
          <div>
            <h1>{workspace.name} feedback</h1>
            <p className="mt-2 text-muted">
              Suggest features, vote for the ones you want most, and follow what&apos;s planned on the{" "}
              <Link href={`/b/${workspace.slug}/roadmap`} className={linkClass}>
                roadmap
              </Link>
              .
            </p>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <RequestList workspace={workspace} accent={accent} />
            <div className="lg:sticky lg:top-6 lg:self-start">
              <PostRequestForm workspace={workspace} accent={accent} />
            </div>
          </div>
        </div>
      )}
    </BoardShell>
  );
}

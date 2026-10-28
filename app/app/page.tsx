"use client";

import Link from "next/link";
import { useState } from "react";
import { RequestUsage } from "@/components/RequestUsage";
import { StatusBadge, card, inputClass } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { useStore } from "@/lib/useStore";
import { getContext, listRequests, STATUSES, STATUS_LABELS, type Sort, type Status } from "@/lib/store";

const SORTS: { value: Sort; label: string }[] = [
  { value: "activity", label: "Recent activity" },
  { value: "top", label: "Top" },
  { value: "new", label: "New" },
];

export default function InboxPage() {
  useStore();
  const ctx = getContext()!;
  const workspace = ctx.workspace!;
  const [sort, setSort] = useState<Sort>("activity");
  const [status, setStatus] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const rows = listRequests(workspace.id, { sort, status, search });
  const total = listRequests(workspace.id).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Inbox</h1>
          <p className="mt-1 text-muted">Every request on {workspace.name}&apos;s board.</p>
        </div>
      </div>

      <RequestUsage workspace={workspace} role={ctx.role!} />

      <div role="toolbar" aria-label="Filter requests" className="flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1 basis-56">
          <span className="sr-only">Search requests</span>
          <input
            type="search"
            placeholder="Search titles and descriptions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass}
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status | "all")}
            className={`${inputClass} w-40`}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={`${inputClass} w-44`}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="hidden h-9 items-center gap-4 border-b border-hairline px-4 text-faint sm:flex">
          <span className="flex-1">Request</span>
          <span className="w-28">Status</span>
          <span className="w-16 text-right">Votes</span>
          <span className="w-16 text-right">Replies</span>
          <span className="w-28 text-right">Last activity</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-muted">
            {total === 0
              ? "No requests yet. Share your public board to start collecting feedback."
              : "No requests match your filters."}
          </p>
        ) : (
          <ul className="divide-y divide-divider" data-testid="inbox-list">
            {rows.map(({ request, votes, replies }) => (
              <li key={request.id} data-testid="inbox-item">
                <Link
                  href={`/app/requests/${request.id}`}
                  className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 hover:bg-row-hover focus-visible:bg-row-hover focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1 basis-full truncate font-medium text-ink sm:basis-0">
                    {request.title}
                  </span>
                  <span className="sm:w-28">
                    <StatusBadge status={request.status} />
                  </span>
                  <span className="tabular text-muted sm:w-16 sm:text-right">
                    <span data-testid="vote-count">{votes}</span>
                    <span className="sm:sr-only"> votes</span>
                  </span>
                  <span className="tabular text-muted sm:w-16 sm:text-right">
                    {replies}
                    <span className="sm:sr-only"> replies</span>
                  </span>
                  <span className="tabular text-faint sm:w-28 sm:text-right">{formatShortDate(request.updatedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="tabular text-faint" aria-live="polite">
        Showing {rows.length} of {total} {total === 1 ? "request" : "requests"}
      </p>
    </div>
  );
}

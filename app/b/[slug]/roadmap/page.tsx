"use client";

import Link from "next/link";
import { BoardShell } from "@/components/board";
import { StatusBadge, card } from "@/components/ui";
import { roadmap, STATUS_LABELS } from "@/lib/store";

const COLUMNS = ["planned", "in_progress", "shipped"] as const;

export default function RoadmapPage() {
  return (
    <BoardShell>
      {(workspace, accent) => {
        const columns = roadmap(workspace.id);
        return (
          <div className="flex flex-col gap-6">
            <div>
              <h1>{workspace.name} roadmap</h1>
              <p className="mt-2 text-muted">What the team is planning, building and has shipped, ordered by votes.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {COLUMNS.map((status) => (
                <section
                  key={status}
                  aria-labelledby={`col-${status}`}
                  data-testid={`roadmap-${status}`}
                  className={`${card} min-w-0`}
                >
                  <div className="flex h-11 items-center justify-between border-b border-hairline px-4">
                    <h2 id={`col-${status}`} className="!text-base">
                      {STATUS_LABELS[status]}
                    </h2>
                    <span className="tabular text-faint">{columns[status].length}</span>
                  </div>
                  {columns[status].length === 0 ? (
                    <p className="px-4 py-6 text-faint">Nothing here yet.</p>
                  ) : (
                    <ul className="divide-y divide-divider">
                      {columns[status].map(({ request, votes }) => (
                        <li key={request.id} data-testid="roadmap-item" className="flex flex-col gap-1.5 px-4 py-3">
                          <Link
                            href={`/b/${workspace.slug}/requests/${request.id}`}
                            className="font-medium text-ink hover:underline"
                          >
                            {request.title}
                          </Link>
                          <div className="flex items-center gap-2 text-faint">
                            <StatusBadge status={request.status} accent={accent} />
                            <span className="tabular" data-testid="vote-count">
                              {votes}
                            </span>
                            <span>{votes === 1 ? "vote" : "votes"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        );
      }}
    </BoardShell>
  );
}

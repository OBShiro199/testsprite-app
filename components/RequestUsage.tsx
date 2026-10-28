"use client";

import Link from "next/link";
import { FREE_REQUEST_LIMIT, requestsUsed, type Role, type Workspace } from "@/lib/store";
import { Meter, card, linkClass } from "./ui";

/** "48 of 50 requests used" on Free; turns amber when the board is full. */
export function RequestUsage({ workspace, role }: { workspace: Workspace; role: Role }) {
  if (workspace.plan !== "free") return null;
  const used = requestsUsed(workspace.id);
  const full = used >= FREE_REQUEST_LIMIT;
  return (
    <div
      className={`${card} flex flex-col gap-2 px-4 py-3 ${full ? "border-warning/40 bg-warning/[0.06]" : ""}`}
      data-testid="request-usage"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p data-testid="request-count" className={`tabular font-medium ${full ? "text-warning-ink" : "text-ink"}`}>
          {used} of {FREE_REQUEST_LIMIT} requests used
        </p>
        {full && (
          <p className="text-warning-ink">
            Board is full. Upgrade to Pro for unlimited requests.{" "}
            {role === "owner" && (
              <Link href="/pricing" className={linkClass}>
                See plans
              </Link>
            )}
          </p>
        )}
      </div>
      <Meter used={used} limit={FREE_REQUEST_LIMIT} label="Requests used" />
    </div>
  );
}

"use client";

import { getContext } from "@/lib/store";

export default function InboxPage() {
  const ctx = getContext()!;
  return (
    <div>
      <h1>Inbox</h1>
      <p className="mt-2 text-muted">
        Welcome, {ctx.user.name}. Requests for {ctx.workspace!.name} will appear here.
      </p>
    </div>
  );
}

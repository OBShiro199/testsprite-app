"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BoardShell, VoteControl, VoterIdentity } from "@/components/board";
import { Loading, NotFound, StatusBadge, card, linkClass, pill } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { getRequest, mergedFrom, repliesFor, resolveMerged, type Workspace } from "@/lib/store";

function PublicRequest({ workspace, accent }: { workspace: Workspace; accent: string | null }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const request = getRequest(id);
  const belongs = request && request.workspaceId === workspace.id;
  const target = belongs && request.mergedInto ? resolveMerged(request.id) : null;

  // A merged request's link sends people on to the request it was merged into.
  useEffect(() => {
    if (target) router.replace(`/b/${workspace.slug}/requests/${target.id}`);
  }, [target, router, workspace.slug]);

  if (!belongs) return <NotFound title="This request doesn't exist." />;
  if (target) return <Loading />;

  const merged = mergedFrom(request.id);
  const replies = repliesFor(request.id);

  return (
    <article className="flex flex-col gap-6">
      <Link href={`/b/${workspace.slug}`} className={`${linkClass} self-start`}>
        ← All requests
      </Link>
      <div className={`${card} flex flex-col gap-5 p-5 sm:flex-row`}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} accent={accent} />
            <span className="text-faint">Posted {formatShortDate(request.createdAt)}</span>
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
        </div>
        <VoteControl requestId={request.id} accent={accent} title={request.title} />
      </div>
      <VoterIdentity />

      <section aria-labelledby="replies-heading" className="flex flex-col gap-3">
        <h2 id="replies-heading">
          Replies <span className="tabular text-faint">{replies.length}</span>
        </h2>
        {replies.length === 0 ? (
          <p className="text-faint">The team hasn&apos;t replied yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {replies.map(({ reply, author }) => (
              <li key={reply.id} className={`${card} p-4`} data-testid="reply">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{author?.name ?? "Team member"}</span>
                  <span className={`${pill} border-accent-edge bg-accent-soft text-[#3559b0]`} data-testid="team-badge">
                    Team
                  </span>
                  <span className="text-faint">{formatShortDate(reply.createdAt)}</span>
                </div>
                <p className="mt-2 max-w-[65ch] whitespace-pre-line">{reply.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}

export default function PublicRequestPage() {
  return <BoardShell>{(workspace, accent) => <PublicRequest workspace={workspace} accent={accent} />}</BoardShell>;
}

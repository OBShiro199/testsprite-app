"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import {
  ConfirmDialog,
  CopyButton,
  FieldError,
  Meter,
  btnDanger,
  btnPrimary,
  btnSecondary,
  btnCompact,
  card,
  inputClass,
  pill,
} from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import {
  getContext,
  inviteTeammate,
  listTeam,
  removeMember,
  revokeInvite,
  seatLimit,
  seatsUsed,
  type Invite,
} from "@/lib/store";
import { useStore } from "@/lib/useStore";

function inviteUrl(invite: Invite) {
  return `${window.location.origin}/invite/${invite.token}`;
}

export default function TeamPage() {
  useStore();
  const toast = useToast();
  const ctx = getContext()!;
  const workspace = ctx.workspace!;
  const isOwner = ctx.role === "owner";
  const { members, invites } = listTeam(workspace.id);
  const used = seatsUsed(workspace.id);
  const limit = seatLimit(workspace);

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [seatError, setSeatError] = useState("");
  const [lastInvite, setLastInvite] = useState<Invite | null>(null);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);
  const [formError, setFormError] = useState("");

  function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setSeatError("");
    const result = inviteTeammate(email);
    if (!result.ok) {
      setEmailError(result.errors.email ?? "");
      setSeatError(result.errors.seats ?? "");
      return;
    }
    setLastInvite(result.invite);
    setEmail("");
    toast(`Invite sent to ${result.invite.email}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1>Team</h1>
        <p className="mt-1 text-muted">People who can manage {workspace.name}&apos;s requests.</p>
      </div>

      <section className={`${card} flex flex-col gap-2 px-4 py-3`} aria-label="Seats">
        <div className="flex items-center justify-between gap-2">
          <p data-testid="seat-usage" className="tabular font-medium text-ink">
            {used} of {limit} seats used
          </p>
          <span className="text-faint">{workspace.plan === "pro" ? "Pro plan" : "Free plan"}</span>
        </div>
        <Meter used={used} limit={limit} label="Seats used" />
        <p className="text-faint">Members and pending invites both use a seat.</p>
      </section>

      {isOwner && (
        <section className={`${card} flex flex-col gap-3 p-5`} aria-labelledby="invite-heading">
          <h2 id="invite-heading">Invite a teammate</h2>
          <form onSubmit={onInvite} noValidate className="flex flex-col gap-1">
            <label htmlFor="invite-email" className="font-medium text-ink">
              Email
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="invite-email"
                type="email"
                autoComplete="off"
                placeholder="sam@acme.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? true : undefined}
                aria-describedby="invite-email-error"
                className={inputClass}
                data-testid="invite-email"
              />
              <button type="submit" className={btnPrimary}>
                Invite teammate
              </button>
            </div>
            <FieldError id="invite-email-error" message={emailError} />
          </form>
          {seatError && (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-3 rounded-md border border-warning/40 bg-warning/[0.06] px-3 py-2 text-warning-ink"
              data-testid="seat-limit-error"
            >
              <span className="flex-1">{seatError}</span>
              {workspace.plan === "free" && (
                <Link href="/pricing" className={`${btnSecondary} ${btnCompact}`}>
                  Upgrade
                </Link>
              )}
            </div>
          )}
          {lastInvite && (
            <div className="flex flex-col gap-2 rounded-md border border-accent-edge bg-accent-soft p-3" role="status">
              <p className="text-ink">
                Share this link with <span className="font-medium">{lastInvite.email}</span>. No email is sent in this
                demo.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  aria-label="Invite link"
                  value={inviteUrl(lastInvite)}
                  className={inputClass}
                  data-testid="invite-link"
                  onFocus={(e) => e.target.select()}
                />
                <CopyButton text={inviteUrl(lastInvite)} onCopied={() => toast("Invite link copied")} />
              </div>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="members-heading" className={`${card} overflow-hidden`}>
        <h2 id="members-heading" className="border-b border-hairline px-4 py-3 !text-base">
          Members <span className="tabular text-faint">{members.length}</span>
        </h2>
        <ul className="divide-y divide-divider" data-testid="member-list">
          {members.map(({ membership, user }) => {
            const canRemove = isOwner && membership.userId !== ctx.user.id && membership.role !== "owner";
            return (
              <li key={membership.id} className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-ink">{user.name}</span>
                  {user.id === ctx.user.id && <span className="text-faint"> (you)</span>}
                  <span className="block truncate text-muted">{user.email}</span>
                </span>
                <span className={`${pill} border-hairline bg-hover text-muted`}>
                  {membership.role === "owner" ? "Owner" : "Member"}
                </span>
                {isOwner && (
                  <span className="w-24 text-right">
                    {canRemove && (
                      <button
                        type="button"
                        className={`${btnDanger} ${btnCompact}`}
                        onClick={() => setRemoving({ id: membership.id, name: user.name })}
                      >
                        Remove
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="invites-heading" className={`${card} overflow-hidden`}>
        <h2 id="invites-heading" className="border-b border-hairline px-4 py-3 !text-base">
          Pending invites <span className="tabular text-faint">{invites.length}</span>
        </h2>
        {invites.length === 0 ? (
          <p className="px-4 py-6 text-faint">No pending invites.</p>
        ) : (
          <ul className="divide-y divide-divider" data-testid="invite-list">
            {invites.map((invite) => (
              <li key={invite.id} className="flex min-h-12 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-ink">{invite.email}</span>
                <span className="tabular text-faint">Sent {formatShortDate(invite.createdAt)}</span>
                {isOwner && (
                  <span className="flex gap-2">
                    <CopyButton
                      text={inviteUrl(invite)}
                      label="Copy link"
                      onCopied={() => toast("Invite link copied")}
                    />
                    <button
                      type="button"
                      className={btnDanger}
                      onClick={() => {
                        if (revokeInvite(invite.id).ok) {
                          if (lastInvite?.id === invite.id) setLastInvite(null);
                          setSeatError("");
                          toast(`Invite to ${invite.email} revoked`);
                        }
                      }}
                    >
                      Revoke
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <FieldError message={formError} />

      <ConfirmDialog
        open={!!removing}
        title="Remove teammate"
        message={`Remove ${removing?.name} from ${workspace.name}? They'll lose access straight away.`}
        confirmLabel="Remove"
        danger
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (!removing) return;
          const result = removeMember(removing.id);
          if (result.ok) {
            toast(`${removing.name} removed`);
            setFormError("");
          } else setFormError(result.errors.form);
          setRemoving(null);
        }}
      />
    </div>
  );
}

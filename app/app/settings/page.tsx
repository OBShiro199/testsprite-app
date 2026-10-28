"use client";

import Link from "next/link";
import { useState } from "react";
import { OwnersOnly } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import {
  CopyButton,
  FieldError,
  TextInput,
  btnPrimary,
  btnSecondary,
  card,
  inputClass,
  linkClass,
} from "@/components/ui";
import { getContext, renameWorkspace, setAccentColour } from "@/lib/store";
import { useStore } from "@/lib/useStore";

export default function SettingsPage() {
  useStore();
  const toast = useToast();
  const ctx = getContext()!;
  const workspace = ctx.workspace!;
  const [name, setName] = useState(workspace.name);
  const [nameError, setNameError] = useState("");
  const [accent, setAccent] = useState(workspace.accentColour ?? "#5F86E0");
  const [accentError, setAccentError] = useState("");

  if (ctx.role !== "owner") return <OwnersOnly message="Only the workspace owner can change settings." />;

  const isPro = workspace.plan === "pro";
  const boardUrl =
    typeof window !== "undefined" ? `${window.location.origin}/b/${workspace.slug}` : `/b/${workspace.slug}`;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1>Settings</h1>
        <p className="mt-1 text-muted">Your workspace and public board.</p>
      </div>

      <form
        noValidate
        className={`${card} flex flex-col gap-1 p-5`}
        onSubmit={(e) => {
          e.preventDefault();
          const result = renameWorkspace(name);
          if (!result.ok) setNameError(result.errors.name);
          else {
            setNameError("");
            toast("Workspace name saved");
          }
        }}
      >
        <h2 className="mb-3 !text-base">Workspace</h2>
        <TextInput
          label="Workspace name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
          hint="Changing the name doesn't change your board address."
        />
        <div>
          <button type="submit" className={btnPrimary}>
            Save name
          </button>
        </div>
      </form>

      <section className={`${card} flex flex-col gap-2 p-5`} aria-labelledby="board-heading">
        <h2 id="board-heading" className="!text-base">
          Public board
        </h2>
        <label htmlFor="board-url" className="font-medium text-ink">
          Board URL
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="board-url" readOnly value={boardUrl} className={inputClass} onFocus={(e) => e.target.select()} />
          <CopyButton text={boardUrl} onCopied={() => toast("Board URL copied")} />
        </div>
      </section>

      <section className={`${card} flex flex-col gap-3 p-5`} aria-labelledby="accent-heading">
        <h2 id="accent-heading" className="!text-base">
          Board accent colour
        </h2>
        {isPro ? (
          <>
            <p className="text-muted">Used on your public board&apos;s buttons and status badges.</p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="accent" className="sr-only">
                Accent colour
              </label>
              <input
                id="accent"
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-btn-edge bg-surface p-1"
                data-testid="accent-picker"
              />
              <span className="tabular text-muted">{accent.toUpperCase()}</span>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  const result = setAccentColour(accent);
                  if (!result.ok) setAccentError(result.errors.accent);
                  else {
                    setAccentError("");
                    toast("Accent colour saved");
                  }
                }}
              >
                Save colour
              </button>
              {workspace.accentColour && (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    if (setAccentColour(null).ok) toast("Accent colour removed");
                  }}
                >
                  Use default
                </button>
              )}
            </div>
            <FieldError message={accentError} />
          </>
        ) : (
          <div
            className="flex flex-wrap items-center gap-3 rounded-md border border-hairline bg-hover px-3 py-3"
            data-testid="accent-locked"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-muted">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 11V8a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <span className="flex-1 text-muted">Upgrade to Pro to customise your board</span>
            <Link href="/pricing" className={linkClass}>
              See plans
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

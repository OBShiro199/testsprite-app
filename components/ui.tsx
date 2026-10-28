"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { STATUS_LABELS, type Status } from "@/lib/types";

// Quiet Precision: every button is white with a light edge; the primary has a
// firmer edge, never a fill. Controls share a 36px height so rows align.
export const btn =
  "qp-press inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-surface px-3 font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60";
export const btnPrimary = `${btn} border-body text-ink hover:bg-hover`;
export const btnSecondary = `${btn} border-btn-edge text-ink hover:bg-hover`;
export const btnDanger = `${btn} border-btn-edge text-danger-ink hover:bg-hover`;
export const btnCompact = "h-8 px-2.5";
export const linkClass = "font-medium text-ink underline decoration-ghost underline-offset-2 hover:decoration-ink";
export const inputClass =
  "block h-9 w-full rounded-md border border-btn-edge bg-surface px-3 text-ink placeholder:text-ghost transition-shadow duration-150 focus:border-body focus:shadow-[0_0_0_3px_rgba(8,9,10,0.08)] focus:outline-none disabled:bg-hover disabled:text-muted aria-[invalid=true]:border-danger";
export const textareaClass = inputClass.replace("h-9", "min-h-24 py-2");
export const card = "rounded-md border border-hairline bg-surface";
export const label = "mb-1.5 block font-medium text-ink";

export function FieldError({ id, message, action }: { id?: string; message?: string; action?: React.ReactNode }) {
  return (
    <p id={id} role="alert" aria-live="polite" className="mt-1 min-h-4.5 text-danger-ink">
      {message ?? ""}
      {message && action ? <> {action}</> : null}
    </p>
  );
}

export function Field({
  label: text,
  error,
  errorAction,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  errorAction?: React.ReactNode;
  hint?: React.ReactNode;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={label}>
        {text}
      </label>
      {children}
      {hint && <p className="mt-1 text-faint">{hint}</p>}
      <FieldError id={`${htmlFor}-error`} message={error} action={errorAction} />
    </div>
  );
}

export function TextInput({
  label: text,
  error,
  errorAction,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  errorAction?: React.ReactNode;
  hint?: React.ReactNode;
}) {
  const autoId = useId();
  const id = props.id ?? autoId;
  return (
    <Field label={text} error={error} errorAction={errorAction} hint={hint} htmlFor={id}>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={inputClass}
      />
    </Field>
  );
}

export function FormError({ message, children }: { message?: string; children?: React.ReactNode }) {
  return (
    <div role="alert" aria-live="assertive">
      {message && (
        <div
          data-testid="form-error"
          className="rounded-md border border-danger/30 bg-danger/[0.06] px-3 py-2 text-danger-ink"
        >
          {message} {children}
        </div>
      )}
    </div>
  );
}

/** Pastel fill at low opacity, a darker edge of the same hue, readable ink. */
const STATUS_STYLES: Record<Status, string> = {
  open: "border-hairline bg-hover text-muted",
  planned: "border-tag-violet/35 bg-tag-violet/[0.08] text-[#5b3fb0]",
  in_progress: "border-accent-edge bg-accent-soft text-[#3559b0]",
  shipped: "border-success/35 bg-success/[0.08] text-[#1b7a31]",
};

export const pill = "inline-flex items-center whitespace-nowrap rounded border px-1.5 py-px text-xs font-medium";

export function StatusBadge({ status, accent }: { status: Status; accent?: string | null }) {
  if (accent && status !== "open") {
    return (
      <span
        data-testid="status-badge"
        className={pill}
        style={{ borderColor: `${accent}59`, backgroundColor: `${accent}14`, color: accent }}
      >
        {STATUS_LABELS[status]}
      </span>
    );
  }
  return (
    <span data-testid="status-badge" className={`${pill} ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/** A modal dialog built on <dialog>: traps focus, closes with Escape, opens 10% from the top. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="mx-auto mt-[10vh] w-[calc(100%-2rem)] max-w-[520px] rounded-md border border-hairline bg-surface p-0 text-body shadow-float"
    >
      {open && (
        <div className="p-6">
          <h2 id={titleId}>{title}</h2>
          <div className="mt-3">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <p className="text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className={btnSecondary} onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className={danger ? btnDanger : btnPrimary} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
      <p className="text-faint">Loading…</p>
    </div>
  );
}

export function NotFound({ title, message }: { title: string; message?: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-medium text-faint">404</p>
      <h1 className="mt-2">{title}</h1>
      {message && <p className="mt-2 text-muted">{message}</p>}
      <Link href="/" className={`${btnSecondary} mt-6`}>
        Go to Signalboard
      </Link>
    </main>
  );
}

export function CopyButton({
  text,
  label: text2 = "Copy",
  onCopied,
}: {
  text: string;
  label?: string;
  onCopied?: () => void;
}) {
  return (
    <button
      type="button"
      className={btnSecondary}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Clipboard blocked: the text is still visible to copy by hand.
        }
        onCopied?.();
      }}
    >
      {text2}
    </button>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-ink">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <rect width="24" height="24" rx="6" fill="#5f86e0" />
        <path
          d="M6 15l4-4 3 3 5-6"
          stroke="white"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Signalboard
    </span>
  );
}

/** A thin usage meter: blue, then amber when nearly or completely full. */
export function Meter({
  used,
  limit,
  testId,
  label: text,
}: {
  used: number;
  limit: number;
  testId?: string;
  label: string;
}) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = used >= limit ? "bg-warning" : "bg-accent";
  return (
    <div
      role="progressbar"
      aria-label={text}
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={used}
      data-testid={testId}
      className="h-1.5 w-full overflow-hidden rounded bg-divider"
    >
      <div
        className={`h-full ${tone} transition-[width] duration-500 ease-[var(--ease-morph)]`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

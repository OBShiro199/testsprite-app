// The one data layer. Every read and write of app data goes through this file,
// and every business rule is enforced here (not only in the UI), so calling a
// page directly by URL still hits the same checks.

import { addMinutes, now, nowIso } from "./dates";
import { buildSeed } from "./seed";
import type { Db, Membership, Role, Session, User, Workspace } from "./types";

export * from "./types";

const DB_KEY = "signalboard:v1";
const SESSION_KEY = "signalboard:session";
const VOTER_EMAIL_KEY = "signalboard:voter-email";
const CHANGE_EVENT = "signalboard:change";

export type Errors = Record<string, string>;
export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; errors: Errors };

const fail = (field: string, message: string): { ok: false; errors: Errors } => ({
  ok: false,
  errors: { [field]: message },
});

// ---------------------------------------------------------------------------
// Loading, saving and syncing
// ---------------------------------------------------------------------------

let cache: Db | null = null;
let version = 0;
let listening = false;

const isBrowser = () => typeof window !== "undefined";

function isValidDb(value: unknown): value is Db {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.schemaVersion === 1 &&
    ["users", "workspaces", "memberships", "invites", "requests", "votes", "replies", "invoices"].every((k) =>
      Array.isArray(v[k]),
    )
  );
}

function readFromStorage(): Db {
  let parsed: unknown = null;
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (isValidDb(parsed)) {
    if (!parsed.loginAttempts || typeof parsed.loginAttempts !== "object") parsed.loginAttempts = {};
    return parsed;
  }
  // Missing or unreadable: re-seed instead of crashing.
  const seeded = buildSeed();
  writeToStorage(seeded);
  return seeded;
}

function writeToStorage(db: Db) {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Storage full or blocked: keep working from memory.
  }
}

function notify() {
  version++;
  if (isBrowser()) window.dispatchEvent(new Event(CHANGE_EVENT));
}

function startListening() {
  if (listening || !isBrowser()) return;
  listening = true;
  // Another tab changed something: reload and re-render.
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key === DB_KEY || e.key === SESSION_KEY || e.key === VOTER_EMAIL_KEY) {
      cache = null;
      notify();
    }
  });
  // Coming back via the Back button from the bfcache: re-check everything (session included).
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      cache = null;
      notify();
    }
  });
}

function db(): Db {
  if (!isBrowser()) throw new Error("The Signalboard store only runs in the browser.");
  startListening();
  if (!cache) {
    cache = readFromStorage();
    if (runLifecycle(cache)) writeToStorage(cache);
  }
  return cache;
}

/** Saves the whole object, then tells open pages to re-render. */
function commit(next: Db) {
  cache = next;
  writeToStorage(next);
  notify();
}

/** Applies a change to a copy of the data and saves it. */
function mutate(fn: (draft: Db) => void) {
  const draft = structuredClone(db());
  fn(draft);
  commit(draft);
}

// Hooks for useStore.
export function subscribe(callback: () => void): () => void {
  startListening();
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

export function getVersion(): number {
  db();
  return version;
}

/** Wipes everything and loads the demo seed again. */
export function resetDemoData() {
  try {
    window.localStorage.removeItem(DB_KEY);
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(VOTER_EMAIL_KEY);
  } catch {
    // ignore
  }
  const seeded = buildSeed();
  commit(seeded);
}

// Placeholder so db() can call it; billing (milestone 5) fills this in.
function runLifecycle(_data: Db): boolean {
  return false;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
}

const RESERVED_SLUGS = ["app", "login", "signup", "b", "billing", "checkout", "invite", "api", "pricing"];

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(data: Db, name: string): string {
  const base = slugify(name) || "workspace";
  const taken = new Set(data.workspaces.map((w) => w.slug.toLowerCase()));
  const isFree = (s: string) => !taken.has(s) && !RESERVED_SLUGS.includes(s);
  if (isFree(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (isFree(candidate)) return candidate;
  }
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && typeof s.userId === "string" && typeof s.workspaceId === "string") return s;
  } catch {
    // fall through
  }
  return null;
}

function writeSession(session: Session | null) {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  notify();
}

export interface Context {
  user: User;
  workspace: Workspace | null;
  membership: Membership | null;
  role: Role | null;
  memberships: { membership: Membership; workspace: Workspace }[];
}

/** The logged-in user and their current workspace, or null when logged out. */
export function getContext(): Context | null {
  const data = db();
  const session = readSession();
  if (!session) return null;
  const user = data.users.find((u) => u.id === session.userId);
  if (!user) return null;
  const memberships = data.memberships
    .filter((m) => m.userId === user.id)
    .map((membership) => ({ membership, workspace: data.workspaces.find((w) => w.id === membership.workspaceId)! }))
    .filter((m) => m.workspace);
  const current = memberships.find((m) => m.workspace.id === session.workspaceId) ?? memberships[0] ?? null;
  return {
    user,
    workspace: current?.workspace ?? null,
    membership: current?.membership ?? null,
    role: current?.membership.role ?? null,
    memberships,
  };
}

/** Context for actions that need a logged-in user with a workspace. */
function requireContext(): Context & { workspace: Workspace; membership: Membership; role: Role } {
  const ctx = getContext();
  if (!ctx || !ctx.workspace || !ctx.membership || !ctx.role) throw new Error("You need to log in first.");
  return ctx as Context & { workspace: Workspace; membership: Membership; role: Role };
}

function requireOwner() {
  const ctx = requireContext();
  if (ctx.role !== "owner") throw new Error("Only the workspace owner can do that.");
  return ctx;
}

export function switchWorkspace(workspaceId: string): Result {
  const ctx = getContext();
  if (!ctx) return fail("form", "You need to log in first.");
  if (!ctx.memberships.some((m) => m.workspace.id === workspaceId))
    return fail("form", "You're not a member of that workspace.");
  writeSession({ userId: ctx.user.id, workspaceId });
  return { ok: true };
}

export function logOut() {
  writeSession(null);
}

// ---------------------------------------------------------------------------
// Sign-up and log-in
// ---------------------------------------------------------------------------

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
}

export async function signUp(input: SignUpInput): Promise<Result> {
  const errors: Errors = {};
  const name = input.name.trim();
  const email = normaliseEmail(input.email);
  const workspaceName = input.workspaceName.trim();

  if (!name) errors.name = "Enter your name.";
  if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  else if (db().users.some((u) => normaliseEmail(u.email) === email))
    errors.email = "An account with this email already exists. Log in instead.";
  if (!isValidPassword(input.password)) errors.password = "Use at least 8 characters, including a letter and a number.";
  if (workspaceName.length < 2 || workspaceName.length > 40)
    errors.workspaceName = "Workspace name must be 2 to 40 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const passwordHash = await hashPassword(input.password);
  // Re-check after the await in case another tab registered the same email.
  if (db().users.some((u) => normaliseEmail(u.email) === email))
    return fail("email", "An account with this email already exists. Log in instead.");

  const createdAt = nowIso();
  const user: User = { id: crypto.randomUUID(), name, email, passwordHash, createdAt };
  let workspaceId = "";
  mutate((d) => {
    const workspace: Workspace = {
      id: crypto.randomUUID(),
      name: workspaceName,
      slug: uniqueSlug(d, workspaceName),
      plan: "free",
      accentColour: null,
      subscription: null,
      createdAt,
    };
    workspaceId = workspace.id;
    d.users.push(user);
    d.workspaces.push(workspace);
    d.memberships.push({
      id: crypto.randomUUID(),
      workspaceId: workspace.id,
      userId: user.id,
      role: "owner",
      createdAt,
    });
  });
  writeSession({ userId: user.id, workspaceId });
  return { ok: true };
}

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 10;
const LOCKED_MESSAGE = "Too many attempts. Try again in 10 minutes.";

export async function logIn(emailInput: string, password: string): Promise<Result> {
  const email = normaliseEmail(emailInput);
  if (!email || !password) return fail("form", "Wrong email or password.");

  const attempts = db().loginAttempts[email];
  if (attempts?.lockedUntil && new Date(attempts.lockedUntil) > now()) return fail("form", LOCKED_MESSAGE);

  const passwordHash = await hashPassword(password);
  const user = db().users.find((u) => normaliseEmail(u.email) === email);

  if (!user || user.passwordHash !== passwordHash) {
    let locked = false;
    mutate((d) => {
      const cutoff = addMinutes(now(), -LOCKOUT_MINUTES);
      const previous = d.loginAttempts[email];
      const failures = (previous?.failures ?? []).filter((t) => new Date(t) > cutoff);
      failures.push(nowIso());
      if (failures.length >= MAX_FAILED_LOGINS) {
        locked = true;
        d.loginAttempts[email] = { failures: [], lockedUntil: addMinutes(now(), LOCKOUT_MINUTES).toISOString() };
      } else {
        d.loginAttempts[email] = { failures, lockedUntil: null };
      }
    });
    return fail("form", locked ? LOCKED_MESSAGE : "Wrong email or password.");
  }

  const data = db();
  if (data.loginAttempts[email]) mutate((d) => void delete d.loginAttempts[email]);
  const membership = data.memberships.find((m) => m.userId === user.id);
  writeSession({ userId: user.id, workspaceId: membership?.workspaceId ?? "" });
  return { ok: true };
}

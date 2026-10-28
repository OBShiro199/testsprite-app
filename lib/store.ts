// The one data layer. Every read and write of app data goes through this file,
// and every business rule is enforced here (not only in the UI), so calling a
// page directly by URL still hits the same checks.

import { addMinutes, addMonths, addYears, isExpiryCurrentOrFuture, now, nowIso } from "./dates";
import { DECLINED_CARDS, cardBrand, digitsOnly, isAmex, passesLuhn } from "./card";
import { buildSeed } from "./seed";
import type {
  Db,
  Interval,
  Invite,
  Invoice,
  Membership,
  Request,
  Role,
  Session,
  Status,
  User,
  Vote,
  Workspace,
} from "./types";

export * from "./types";

const DB_KEY = "signalboard:v1";
const SESSION_KEY = "signalboard:session";
const VOTER_EMAIL_KEY = "signalboard:voter-email";
const CHANGE_EVENT = "signalboard:change";

export type Errors = Record<string, string>;
export type Failure = { ok: false; errors: Errors; duplicateId?: string };
export type Result<T extends object = object> = ({ ok: true } & T) | Failure;

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

/**
 * Runs every time the app loads. Renews active subscriptions whose period has
 * ended (adding a full-price invoice), and moves cancelled ones back to Free.
 * Returns true if anything changed.
 */
function runLifecycle(data: Db): boolean {
  const current = now();
  let changed = false;
  for (const workspace of data.workspaces) {
    const sub = workspace.subscription;
    if (!sub) continue;
    // Guard against an endless loop if dates are ever corrupted.
    for (let i = 0; i < 1000 && new Date(sub.currentPeriodEnd) <= current; i++) {
      changed = true;
      if (sub.status === "cancelling") {
        // Back to Free. The accent colour stays stored, but only shows on Pro.
        workspace.plan = "free";
        workspace.subscription = null;
        break;
      }
      const start = new Date(sub.currentPeriodEnd);
      sub.currentPeriodStart = start.toISOString();
      sub.currentPeriodEnd = (sub.interval === "month" ? addMonths(start, 1) : addYears(start, 1)).toISOString();
      data.invoices.push({
        id: crypto.randomUUID(),
        workspaceId: workspace.id,
        date: start.toISOString(),
        description: `Signalboard Pro (${sub.interval === "month" ? "monthly" : "yearly"}) renewal`,
        amountCents: PRICES[sub.interval],
        cardLast4: sub.cardLast4,
      });
    }
  }
  return changed;
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

// ---------------------------------------------------------------------------
// Public board: requests, votes and the roadmap
// ---------------------------------------------------------------------------

export const FREE_REQUEST_LIMIT = 50;
export const BOARD_FULL_MESSAGE = "This board isn't taking new requests right now.";

export function getWorkspaceBySlug(slug: string): Workspace | null {
  const wanted = slug.toLowerCase();
  return db().workspaces.find((w) => w.slug.toLowerCase() === wanted) ?? null;
}

export function getWorkspace(id: string): Workspace | null {
  return db().workspaces.find((w) => w.id === id) ?? null;
}

/** The board's accent colour, which only shows while the workspace is on Pro. */
export function effectiveAccent(workspace: Workspace): string | null {
  return workspace.plan === "pro" ? workspace.accentColour : null;
}

/** Requests that count toward the Free limit (merged ones don't). */
export function requestsUsed(workspaceId: string): number {
  return db().requests.filter((r) => r.workspaceId === workspaceId && !r.mergedInto).length;
}

export function requestLimit(workspace: Workspace): number | null {
  return workspace.plan === "pro" ? null : FREE_REQUEST_LIMIT;
}

export function isBoardFull(workspace: Workspace): boolean {
  const limit = requestLimit(workspace);
  return limit !== null && requestsUsed(workspace.id) >= limit;
}

export function getRequest(id: string): Request | null {
  return db().requests.find((r) => r.id === id) ?? null;
}

export function votesFor(requestId: string): Vote[] {
  return db().votes.filter((v) => v.requestId === requestId);
}

export function voteCount(requestId: string): number {
  return votesFor(requestId).length;
}

export function replyCount(requestId: string): number {
  return db().replies.filter((r) => r.requestId === requestId).length;
}

export function hasVoted(requestId: string, email: string | null): boolean {
  if (!email) return false;
  const e = normaliseEmail(email);
  return db().votes.some((v) => v.requestId === requestId && v.voterEmail === e);
}

export type Sort = "top" | "new" | "activity";

export interface RequestRow {
  request: Request;
  votes: number;
  replies: number;
}

export function listRequests(
  workspaceId: string,
  options: { sort?: Sort; status?: Status | "all"; search?: string } = {},
): RequestRow[] {
  const { sort = "top", status = "all", search = "" } = options;
  const q = search.trim().toLowerCase();
  const rows = db()
    .requests.filter((r) => r.workspaceId === workspaceId && !r.mergedInto)
    .filter((r) => status === "all" || r.status === status)
    .filter((r) => !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
    .map((request) => ({ request, votes: voteCount(request.id), replies: replyCount(request.id) }));
  const newest = (a: RequestRow, b: RequestRow) => b.request.createdAt.localeCompare(a.request.createdAt);
  if (sort === "new") rows.sort(newest);
  else if (sort === "activity") rows.sort((a, b) => b.request.updatedAt.localeCompare(a.request.updatedAt));
  else rows.sort((a, b) => b.votes - a.votes || newest(a, b));
  return rows;
}

/** Planned, In progress and Shipped columns, each sorted by votes. */
export function roadmap(workspaceId: string): Record<"planned" | "in_progress" | "shipped", RequestRow[]> {
  return {
    planned: listRequests(workspaceId, { status: "planned", sort: "top" }),
    in_progress: listRequests(workspaceId, { status: "in_progress", sort: "top" }),
    shipped: listRequests(workspaceId, { status: "shipped", sort: "top" }),
  };
}

/** Follows merges to the request that is still live. */
export function resolveMerged(id: string): Request | null {
  let req = getRequest(id);
  const seen = new Set<string>();
  while (req?.mergedInto && !seen.has(req.id)) {
    seen.add(req.id);
    req = getRequest(req.mergedInto);
  }
  return req;
}

export function mergedFrom(requestId: string): Request[] {
  return db().requests.filter((r) => r.mergedInto === requestId);
}

export interface PostRequestInput {
  title: string;
  description: string;
  email: string;
}

export function postRequest(slug: string, input: PostRequestInput): Result<{ request: Request }> {
  const workspace = getWorkspaceBySlug(slug);
  if (!workspace) return fail("form", "This board doesn't exist.");

  const title = input.title.trim();
  const description = input.description.trim();
  const email = normaliseEmail(input.email);
  const errors: Errors = {};
  if (title.length < 5 || title.length > 80) errors.title = "Title must be 5 to 80 characters.";
  if (description.length > 1000) errors.description = "Description can be up to 1,000 characters.";
  if (!email) errors.email = "Enter your email.";
  else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const duplicate = db().requests.find(
    (r) =>
      r.workspaceId === workspace.id &&
      !r.mergedInto &&
      r.status !== "shipped" &&
      r.title.trim().toLowerCase() === title.toLowerCase(),
  );
  if (duplicate)
    return { ok: false, errors: { title: "A request with this title already exists" }, duplicateId: duplicate.id };

  if (isBoardFull(workspace)) return fail("form", BOARD_FULL_MESSAGE);

  const createdAt = nowIso();
  const request: Request = {
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    title,
    description,
    authorEmail: email,
    status: "open",
    mergedInto: null,
    createdAt,
    updatedAt: createdAt,
  };
  mutate((d) => {
    d.requests.push(request);
    // The author automatically votes for their own request.
    d.votes.push({ id: crypto.randomUUID(), requestId: request.id, voterEmail: email, createdAt });
  });
  return { ok: true, request };
}

export function vote(requestId: string, emailInput: string): Result {
  const email = normaliseEmail(emailInput);
  if (!isValidEmail(email)) return fail("email", "Enter a valid email address.");
  const request = getRequest(requestId);
  if (!request || request.mergedInto) return fail("form", "This request isn't taking votes.");
  if (hasVoted(requestId, email)) return fail("form", "You've already voted for this.");
  mutate((d) => {
    d.votes.push({ id: crypto.randomUUID(), requestId, voterEmail: email, createdAt: nowIso() });
  });
  return { ok: true };
}

export function removeVote(requestId: string, emailInput: string): Result {
  const email = normaliseEmail(emailInput);
  if (!hasVoted(requestId, email)) return fail("form", "You haven't voted for this.");
  mutate((d) => {
    d.votes = d.votes.filter((v) => !(v.requestId === requestId && v.voterEmail === email));
  });
  return { ok: true };
}

/** The email this browser votes with, remembered after the first vote. */
export function getVoterEmail(): string | null {
  try {
    return window.localStorage.getItem(VOTER_EMAIL_KEY);
  } catch {
    return null;
  }
}

export function setVoterEmail(email: string | null) {
  try {
    if (email) window.localStorage.setItem(VOTER_EMAIL_KEY, normaliseEmail(email));
    else window.localStorage.removeItem(VOTER_EMAIL_KEY);
  } catch {
    // ignore
  }
  notify();
}

export function repliesFor(requestId: string) {
  const data = db();
  return data.replies
    .filter((r) => r.requestId === requestId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((reply) => ({ reply, author: data.users.find((u) => u.id === reply.userId) ?? null }));
}

// ---------------------------------------------------------------------------
// Team app: status changes, replies and merging
// ---------------------------------------------------------------------------

/** A request in the current workspace, or an error if it isn't one. */
function requireOwnRequest(requestId: string) {
  const ctx = requireContext();
  const request = getRequest(requestId);
  if (!request || request.workspaceId !== ctx.workspace.id) throw new Error("That request isn't in your workspace.");
  return { ctx, request };
}

export function setStatus(requestId: string, status: Status): Result {
  const { request } = requireOwnRequest(requestId);
  if (request.mergedInto) return fail("form", "Merged requests can't change status.");
  if (!(["open", "planned", "in_progress", "shipped"] as Status[]).includes(status))
    return fail("status", "Pick a valid status.");
  mutate((d) => {
    const r = d.requests.find((x) => x.id === requestId)!;
    r.status = status;
    r.updatedAt = nowIso();
  });
  return { ok: true };
}

export function addReply(requestId: string, bodyInput: string): Result {
  const { ctx } = requireOwnRequest(requestId);
  const body = bodyInput.trim();
  if (body.length < 1 || body.length > 2000) return fail("body", "Replies must be 1 to 2,000 characters.");
  mutate((d) => {
    const createdAt = nowIso();
    d.replies.push({ id: crypto.randomUUID(), requestId, userId: ctx.user.id, body, createdAt });
    d.requests.find((x) => x.id === requestId)!.updatedAt = createdAt;
  });
  return { ok: true };
}

/** Requests this one could be merged into: same workspace, not itself, not already merged. */
export function mergeTargets(sourceId: string, search = ""): RequestRow[] {
  const source = getRequest(sourceId);
  if (!source) return [];
  const q = search.trim().toLowerCase();
  return listRequests(source.workspaceId, { sort: "top" }).filter(
    (row) => row.request.id !== sourceId && (!q || row.request.title.toLowerCase().includes(q)),
  );
}

/**
 * Merges source into target. Votes move across, but anyone who voted for both
 * keeps a single vote, so the target ends up with one vote per unique voter.
 * Replies stay with the source. Can't be undone.
 */
export function mergeRequest(sourceId: string, targetId: string): Result {
  const { request: source } = requireOwnRequest(sourceId);
  const target = getRequest(targetId);
  if (!target || target.workspaceId !== source.workspaceId) return fail("target", "Pick a request from this board.");
  if (targetId === sourceId) return fail("target", "A request can't be merged into itself.");
  if (source.mergedInto) return fail("target", "This request has already been merged.");
  if (target.mergedInto) return fail("target", "That request has already been merged into another one.");

  mutate((d) => {
    const targetVoters = new Set(d.votes.filter((v) => v.requestId === targetId).map((v) => v.voterEmail));
    d.votes = d.votes.flatMap((v) => {
      if (v.requestId !== sourceId) return [v];
      if (targetVoters.has(v.voterEmail)) return []; // already counted on the target
      targetVoters.add(v.voterEmail);
      return [{ ...v, requestId: targetId }];
    });
    const now = nowIso();
    const s = d.requests.find((x) => x.id === sourceId)!;
    s.mergedInto = targetId;
    s.updatedAt = now;
    d.requests.find((x) => x.id === targetId)!.updatedAt = now;
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Team and seats
// ---------------------------------------------------------------------------

export function seatLimit(workspace: Workspace): number {
  return workspace.plan === "pro" ? 10 : 2;
}

/** Seats used = members + pending invites. */
export function seatsUsed(workspaceId: string): number {
  const data = db();
  return (
    data.memberships.filter((m) => m.workspaceId === workspaceId).length +
    data.invites.filter((i) => i.workspaceId === workspaceId && i.status === "pending").length
  );
}

export function seatsFullMessage(workspace: Workspace): string {
  return workspace.plan === "pro"
    ? `You've used all ${seatLimit(workspace)} seats on the Pro plan.`
    : `You've used all ${seatLimit(workspace)} seats on the Free plan. Upgrade to Pro to add more.`;
}

export function listTeam(workspaceId: string) {
  const data = db();
  const members = data.memberships
    .filter((m) => m.workspaceId === workspaceId)
    .map((membership) => ({ membership, user: data.users.find((u) => u.id === membership.userId)! }))
    .filter((m) => m.user)
    .sort((a, b) =>
      a.membership.role === b.membership.role
        ? a.user.name.localeCompare(b.user.name)
        : a.membership.role === "owner"
          ? -1
          : 1,
    );
  const invites = data.invites
    .filter((i) => i.workspaceId === workspaceId && i.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { members, invites };
}

export function inviteTeammate(emailInput: string): Result<{ invite: Invite }> {
  const ctx = requireOwner();
  const workspace = ctx.workspace;
  const email = normaliseEmail(emailInput);
  if (!isValidEmail(email)) return fail("email", "Enter a valid email address.");

  const data = db();
  const isMember = data.memberships.some(
    (m) =>
      m.workspaceId === workspace.id &&
      normaliseEmail(data.users.find((u) => u.id === m.userId)?.email ?? "") === email,
  );
  if (isMember) return fail("email", "That person is already on your team.");
  if (data.invites.some((i) => i.workspaceId === workspace.id && i.status === "pending" && i.email === email))
    return fail("email", "You've already invited that email.");
  if (seatsUsed(workspace.id) >= seatLimit(workspace)) return fail("seats", seatsFullMessage(workspace));

  const invite: Invite = {
    id: crypto.randomUUID(),
    workspaceId: workspace.id,
    email,
    token: crypto.randomUUID().replace(/-/g, ""),
    status: "pending",
    createdAt: nowIso(),
  };
  mutate((d) => void d.invites.push(invite));
  return { ok: true, invite };
}

export function revokeInvite(inviteId: string): Result {
  const ctx = requireOwner();
  const invite = db().invites.find((i) => i.id === inviteId);
  if (!invite || invite.workspaceId !== ctx.workspace.id || invite.status !== "pending")
    return fail("form", "That invite isn't pending any more.");
  mutate((d) => {
    d.invites.find((i) => i.id === inviteId)!.status = "revoked";
  });
  return { ok: true };
}

export function removeMember(membershipId: string): Result {
  const ctx = requireOwner();
  const data = db();
  const membership = data.memberships.find((m) => m.id === membershipId);
  if (!membership || membership.workspaceId !== ctx.workspace.id)
    return fail("form", "That person isn't on your team.");
  if (membership.userId === ctx.user.id) return fail("form", "You can't remove yourself.");
  const owners = data.memberships.filter((m) => m.workspaceId === ctx.workspace.id && m.role === "owner");
  if (membership.role === "owner" && owners.length <= 1) return fail("form", "You can't remove the last owner.");
  mutate((d) => {
    d.memberships = d.memberships.filter((m) => m.id !== membershipId);
  });
  return { ok: true };
}

export type InviteLookup =
  | { state: "invalid" }
  | { state: "used"; workspace: Workspace }
  | { state: "pending"; invite: Invite; workspace: Workspace };

export function getInvite(token: string): InviteLookup {
  const data = db();
  const invite = data.invites.find((i) => i.token === token);
  const workspace = invite ? data.workspaces.find((w) => w.id === invite.workspaceId) : null;
  if (!invite || !workspace || invite.status === "revoked") return { state: "invalid" };
  if (invite.status === "accepted") return { state: "used", workspace };
  return { state: "pending", invite, workspace };
}

function joinWorkspace(d: Db, invite: Invite, userId: string) {
  const already = d.memberships.some((m) => m.workspaceId === invite.workspaceId && m.userId === userId);
  if (!already)
    d.memberships.push({
      id: crypto.randomUUID(),
      workspaceId: invite.workspaceId,
      userId,
      role: "member",
      createdAt: nowIso(),
    });
  d.invites.find((i) => i.id === invite.id)!.status = "accepted";
}

export function acceptInvite(token: string): Result {
  const lookup = getInvite(token);
  if (lookup.state === "invalid") return fail("form", "This invite isn't valid any more.");
  if (lookup.state === "used") return fail("form", "This invite has already been used.");
  const ctx = getContext();
  if (!ctx) return fail("form", "Log in to accept this invite.");
  if (normaliseEmail(ctx.user.email) !== lookup.invite.email)
    return fail(
      "form",
      `This invite was sent to ${lookup.invite.email}. Log out and sign in with that email to accept it.`,
    );
  mutate((d) => joinWorkspace(d, lookup.invite, ctx.user.id));
  writeSession({ userId: ctx.user.id, workspaceId: lookup.workspace.id });
  return { ok: true };
}

/** Sign-up from an invite link: the email is fixed to the invited address and no new workspace is made. */
export async function signUpWithInvite(token: string, nameInput: string, password: string): Promise<Result> {
  const lookup = getInvite(token);
  if (lookup.state === "invalid") return fail("form", "This invite isn't valid any more.");
  if (lookup.state === "used") return fail("form", "This invite has already been used.");
  const email = lookup.invite.email;
  const name = nameInput.trim();
  const errors: Errors = {};
  if (!name) errors.name = "Enter your name.";
  if (db().users.some((u) => normaliseEmail(u.email) === email))
    errors.email = "An account with this email already exists. Log in instead.";
  if (!isValidPassword(password)) errors.password = "Use at least 8 characters, including a letter and a number.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const passwordHash = await hashPassword(password);
  const user: User = { id: crypto.randomUUID(), name, email, passwordHash, createdAt: nowIso() };
  mutate((d) => {
    d.users.push(user);
    joinWorkspace(d, lookup.invite, user.id);
  });
  writeSession({ userId: user.id, workspaceId: lookup.workspace.id });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Plans, promo codes and the simulated checkout
// ---------------------------------------------------------------------------

export const PRICES: Record<Interval, number> = { month: 2900, year: 29000 };
const PROMO_CODE = "LAUNCH50";

export interface Quote {
  interval: Interval;
  baseCents: number;
  discountCents: number;
  dueCents: number;
  /** The code that's applied and valid for this interval, if any. */
  promo: string | null;
  promoError: string | null;
}

/** Codes match after trimming and ignoring case. */
export function normalisePromo(code: string): string {
  return code.trim().toUpperCase();
}

export function promoError(code: string, interval: Interval): string | null {
  const c = normalisePromo(code);
  if (c !== PROMO_CODE) return "That code isn't valid.";
  if (interval !== "month") return "This code only works on the monthly plan.";
  return null;
}

/** Prices a checkout. LAUNCH50 takes 50% off the first month of the monthly plan only. */
export function quote(interval: Interval, code: string | null): Quote {
  const baseCents = PRICES[interval];
  const error = code ? promoError(code, interval) : null;
  const valid = !!code && !error;
  const discountCents = valid ? Math.round(baseCents / 2) : 0;
  return {
    interval,
    baseCents,
    discountCents,
    dueCents: baseCents - discountCents,
    promo: valid ? normalisePromo(code!) : null,
    promoError: error,
  };
}

export interface CardInput {
  name: string;
  number: string;
  expiry: string;
  cvc: string;
  country: string;
}

export function validateCard(card: CardInput): Errors {
  const errors: Errors = {};
  const number = digitsOnly(card.number);
  if (!card.name.trim()) errors.name = "Enter the name on the card.";

  if (!number) errors.number = "Enter your card number.";
  else if (!passesLuhn(number)) errors.number = "Your card number is invalid.";

  const expiry = card.expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!card.expiry.trim()) errors.expiry = "Enter the expiry date.";
  else if (!expiry || Number(expiry[1]) < 1 || Number(expiry[1]) > 12)
    errors.expiry = "Enter the expiry date as MM/YY.";
  else if (!isExpiryCurrentOrFuture(Number(expiry[1]), Number(expiry[2]))) errors.expiry = "Your card has expired.";

  const cvc = card.cvc.trim();
  const cvcLength = isAmex(number) ? 4 : 3;
  if (!cvc) errors.cvc = "Enter the security code.";
  else if (!new RegExp(`^\\d{${cvcLength}}$`).test(cvc)) errors.cvc = "Your card's security code is invalid.";

  if (!card.country) errors.country = "Choose your billing country.";
  return errors;
}

export function workspaceInvoices(workspaceId: string): Invoice[] {
  return db()
    .invoices.filter((i) => i.workspaceId === workspaceId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Takes a (simulated) payment and moves the workspace to Pro. Refuses if the
 * workspace is already on Pro, so a double-click can never create a second
 * subscription or invoice.
 */
export function pay(interval: Interval, promoCode: string | null, card: CardInput): Result<{ invoice: Invoice }> {
  const ctx = getContext();
  if (!ctx || !ctx.workspace) return fail("form", "You need to log in first.");
  if (ctx.role !== "owner") return fail("form", "Only the workspace owner can manage billing.");
  if (interval !== "month" && interval !== "year") return fail("form", "Pick monthly or yearly.");
  if (ctx.workspace.plan === "pro") return fail("form", "You're already on Pro.");

  const errors = validateCard(card);
  if (Object.keys(errors).length) return { ok: false, errors };

  const number = digitsOnly(card.number);
  const declined = DECLINED_CARDS[number];
  if (declined) return fail("card", declined);

  const q = quote(interval, promoCode);
  const workspaceId = ctx.workspace.id;
  const start = now();
  const invoice: Invoice = {
    id: crypto.randomUUID(),
    workspaceId,
    date: start.toISOString(),
    description: `Signalboard Pro (${interval === "month" ? "monthly" : "yearly"})${q.promo ? ` · ${q.promo}` : ""}`,
    amountCents: q.dueCents,
    cardLast4: number.slice(-4),
  };
  let alreadyPro = false;
  mutate((d) => {
    const ws = d.workspaces.find((w) => w.id === workspaceId)!;
    if (ws.plan === "pro") {
      alreadyPro = true;
      return;
    }
    ws.plan = "pro";
    ws.subscription = {
      interval,
      status: "active",
      currentPeriodStart: start.toISOString(),
      currentPeriodEnd: (interval === "month" ? addMonths(start, 1) : addYears(start, 1)).toISOString(),
      cardLast4: number.slice(-4),
      cardBrand: cardBrand(number),
      promoApplied: !!q.promo,
    };
    d.invoices.push(invoice);
  });
  if (alreadyPro) return fail("form", "You're already on Pro.");
  return { ok: true, invoice };
}

export function cancelSubscription(): Result {
  const ctx = requireOwner();
  if (!ctx.workspace.subscription) return fail("form", "There's no subscription to cancel.");
  mutate((d) => {
    d.workspaces.find((w) => w.id === ctx.workspace.id)!.subscription!.status = "cancelling";
  });
  return { ok: true };
}

export function resumeSubscription(): Result {
  const ctx = requireOwner();
  const sub = ctx.workspace.subscription;
  if (!sub || sub.status !== "cancelling") return fail("form", "There's nothing to resume.");
  if (new Date(sub.currentPeriodEnd) <= now()) return fail("form", "This subscription has already ended.");
  mutate((d) => {
    d.workspaces.find((w) => w.id === ctx.workspace.id)!.subscription!.status = "active";
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export function renameWorkspace(nameInput: string): Result {
  const ctx = requireOwner();
  const name = nameInput.trim();
  if (name.length < 2 || name.length > 40) return fail("name", "Workspace name must be 2 to 40 characters.");
  mutate((d) => {
    d.workspaces.find((w) => w.id === ctx.workspace.id)!.name = name;
  });
  return { ok: true };
}

export function setAccentColour(colour: string | null): Result {
  const ctx = requireOwner();
  if (ctx.workspace.plan !== "pro") return fail("accent", "Upgrade to Pro to customise your board.");
  if (colour !== null && !/^#[0-9a-fA-F]{6}$/.test(colour)) return fail("accent", "Pick a colour like #0E9F6E.");
  mutate((d) => {
    d.workspaces.find((w) => w.id === ctx.workspace.id)!.accentColour = colour ? colour.toUpperCase() : null;
  });
  return { ok: true };
}

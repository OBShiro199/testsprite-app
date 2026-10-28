export type Plan = "free" | "pro";
export type Interval = "month" | "year";
export type Role = "owner" | "member";
export type Status = "open" | "planned" | "in_progress" | "shipped";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Subscription {
  interval: Interval;
  status: "active" | "cancelling";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cardLast4: string;
  /** Card network shown on billing ("Visa ending 4242"). */
  cardBrand: string;
  promoApplied: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  accentColour: string | null;
  subscription: Subscription | null;
  createdAt: string;
}

export interface Membership {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
  createdAt: string;
}

export interface Invite {
  id: string;
  workspaceId: string;
  email: string;
  token: string;
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
}

export interface Request {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  authorEmail: string;
  status: Status;
  mergedInto: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  requestId: string;
  voterEmail: string;
  createdAt: string;
}

export interface Reply {
  id: string;
  requestId: string;
  userId: string;
  body: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  workspaceId: string;
  date: string;
  description: string;
  amountCents: number;
  cardLast4: string;
}

export interface Session {
  userId: string;
  workspaceId: string;
}

export interface LoginAttempts {
  failures: string[];
  lockedUntil: string | null;
}

export interface Db {
  schemaVersion: 1;
  users: User[];
  workspaces: Workspace[];
  memberships: Membership[];
  invites: Invite[];
  requests: Request[];
  votes: Vote[];
  replies: Reply[];
  invoices: Invoice[];
  /** Failed log-in attempts, keyed by normalised email. */
  loginAttempts: Record<string, LoginAttempts>;
}

export const STATUS_LABELS: Record<Status, string> = {
  open: "Open",
  planned: "Planned",
  in_progress: "In progress",
  shipped: "Shipped",
};

export const STATUSES: Status[] = ["open", "planned", "in_progress", "shipped"];

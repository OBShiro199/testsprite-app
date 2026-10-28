import { addDays, addMonths, now } from "./dates";
import type { Db, Reply, Request, Status, Vote } from "./types";

// SHA-256 of "Signal123!" (the demo password for every seed account).
const SEED_PASSWORD_HASH = "54b017b26896298fc0d6a79a876db6cdb84ab37a7548f425ab4e4fc252a5e31c";

const id = () => crypto.randomUUID();

type SeedRequest = { title: string; status: Status; votes: number; description?: string };

const ACME_REQUESTS: SeedRequest[] = [
  {
    title: "Slack notifications for new requests",
    status: "in_progress",
    votes: 40,
    description:
      "Post a message to a Slack channel whenever a customer submits a new request, so the product team sees it straight away.",
  },
  {
    title: "Export to CSV",
    status: "open",
    votes: 24,
    description:
      "Download every request with its votes and status as a CSV file so we can analyse it in a spreadsheet.",
  },
  {
    title: "CSV export",
    status: "open",
    votes: 9,
    description: "We need to get our feedback data out into Excel. A CSV download would do it.",
  },
  {
    title: "Dark mode",
    status: "shipped",
    votes: 37,
    description: "A dark theme for the team app. Our support team works late and the white background is harsh.",
  },
  {
    title: "SSO with Google Workspace",
    status: "in_progress",
    votes: 33,
    description: "Let our team sign in with their Google Workspace accounts instead of separate passwords.",
  },
  { title: "Jira integration", status: "in_progress", votes: 29 },
  {
    title: "Custom domains for the public board",
    status: "planned",
    votes: 27,
    description: "Host the board at feedback.ourcompany.com instead of a Signalboard address.",
  },
  { title: "Email digest of top requests", status: "planned", votes: 18 },
  { title: "Tag requests by product area", status: "planned", votes: 21 },
  { title: "Bulk change status", status: "planned", votes: 12 },
  { title: "Zapier integration", status: "planned", votes: 16 },
  {
    title: "Embed the board in our app",
    status: "open",
    votes: 22,
    description: "A widget we can drop into our product so customers can vote without leaving it.",
  },
  { title: "Private boards for internal feedback", status: "open", votes: 14 },
  { title: "Comment threads for customers", status: "open", votes: 19 },
  { title: "Linear integration", status: "open", votes: 26 },
  { title: "Webhooks for status changes", status: "in_progress", votes: 11 },
  { title: "Mobile app", status: "open", votes: 8 },
  {
    title: "API access",
    status: "planned",
    votes: 31,
    description: "A REST API to read and create requests from our own tools.",
  },
  { title: "Attach screenshots to requests", status: "open", votes: 17 },
  { title: "Notify voters when a request ships", status: "in_progress", votes: 35 },
  { title: "SAML SSO", status: "open", votes: 10 },
  { title: "Changelog page", status: "in_progress", votes: 20 },
  { title: "Custom fields on requests", status: "open", votes: 7 },
  { title: "Intercom integration", status: "open", votes: 15 },
  { title: "HubSpot sync", status: "open", votes: 13 },
  { title: "Filter by customer revenue", status: "open", votes: 23 },
  { title: "Multiple boards per workspace", status: "open", votes: 28 },
  { title: "Translate the board into Spanish", status: "open", votes: 4 },
  { title: "Keyboard shortcuts", status: "shipped", votes: 9 },
  { title: "Audit log", status: "planned", votes: 6 },
  { title: "Two-factor authentication", status: "planned", votes: 25 },
  { title: "Roadmap ETA dates", status: "open", votes: 12 },
  { title: "Hide vote counts from the public", status: "open", votes: 3 },
  { title: "Anonymous posting", status: "open", votes: 5 },
  { title: "Salesforce integration", status: "open", votes: 11 },
  { title: "Request templates", status: "open", votes: 2 },
  { title: "Weekly analytics report", status: "open", votes: 8 },
  { title: "Microsoft Teams notifications", status: "open", votes: 14 },
  { title: "Duplicate detection suggestions", status: "open", votes: 6 },
  { title: "Pin requests to the top", status: "open", votes: 1 },
  { title: "Custom CSS for the board", status: "open", votes: 5 },
  { title: "GitHub issues sync", status: "open", votes: 18 },
  { title: "Segment voters by plan", status: "open", votes: 9 },
  { title: "Merge votes from support tickets", status: "open", votes: 3 },
  { title: "Board search improvements", status: "shipped", votes: 7 },
  { title: "Markdown in descriptions", status: "shipped", votes: 12 },
  { title: "Approve requests before they go public", status: "open", votes: 4 },
  { title: "Data residency in the EU", status: "open", votes: 2 },
];

const NORTHWIND_REQUESTS: SeedRequest[] = [
  {
    title: "Bulk order import",
    status: "planned",
    votes: 14,
    description: "Upload a spreadsheet of orders instead of entering them one by one.",
  },
  { title: "Live delivery tracking map", status: "in_progress", votes: 22 },
  { title: "Invoice PDFs in our branding", status: "open", votes: 9 },
  { title: "Supplier ratings", status: "open", votes: 6 },
  { title: "Low stock alerts by SMS", status: "shipped", votes: 18 },
  { title: "QuickBooks sync", status: "planned", votes: 12 },
  { title: "Barcode scanning on mobile", status: "open", votes: 11 },
  { title: "Multi-warehouse inventory", status: "open", votes: 8 },
  { title: "Customer portal for reorders", status: "open", votes: 5 },
  { title: "Role-based permissions", status: "open", votes: 3 },
];

const REPLY_BODIES: Record<string, string> = {
  "Slack notifications for new requests":
    "We're building this now. It will post to any channel you pick, with a link back to the request.",
  "Dark mode": "Dark mode is live for everyone. Switch it on from your profile menu.",
  "SSO with Google Workspace": "Good news: this is in progress and should land next month.",
  "Export to CSV": "Thanks for all the votes. We're looking at this alongside the API work.",
  "API access": "Planned for next quarter. We'll share the docs here first.",
};

function buildRequests(
  workspaceId: string,
  defs: SeedRequest[],
  baseDate: Date,
  voterFor: (def: SeedRequest, index: number) => string[],
): { requests: Request[]; votes: Vote[] } {
  const requests: Request[] = [];
  const votes: Vote[] = [];
  defs.forEach((def, i) => {
    const created = addDays(baseDate, -(i * 2 + 1) - (i % 3));
    const updated = def.status === "open" ? created : addDays(created, 1);
    const voters = voterFor(def, i);
    const req: Request = {
      id: id(),
      workspaceId,
      title: def.title,
      description: def.description ?? "",
      authorEmail: voters[i % voters.length],
      status: def.status,
      mergedInto: null,
      createdAt: created.toISOString(),
      updatedAt: updated.toISOString(),
    };
    requests.push(req);
    voters.forEach((email, v) => {
      votes.push({ id: id(), requestId: req.id, voterEmail: email, createdAt: addDays(created, v % 5).toISOString() });
    });
  });
  return { requests, votes };
}

const customers = (from: number, count: number) =>
  Array.from({ length: count }, (_, k) => `customer${from + k}@example.com`);

export function buildSeed(): Db {
  const today = now();
  const created = addDays(today, -120).toISOString();

  const ava = {
    id: id(),
    name: "Ava Owner",
    email: "owner@acme.test",
    passwordHash: SEED_PASSWORD_HASH,
    createdAt: created,
  };
  const nora = {
    id: id(),
    name: "Nora Owner",
    email: "owner@northwind.test",
    passwordHash: SEED_PASSWORD_HASH,
    createdAt: created,
  };
  const max = {
    id: id(),
    name: "Max Member",
    email: "member@northwind.test",
    passwordHash: SEED_PASSWORD_HASH,
    createdAt: created,
  };

  const acme = {
    id: id(),
    name: "Acme",
    slug: "acme",
    plan: "free" as const,
    accentColour: null,
    subscription: null,
    createdAt: created,
  };

  // Northwind's monthly period started 10 days ago.
  const periodStart = addDays(today, -10);
  const northwind = {
    id: id(),
    name: "Northwind",
    slug: "northwind",
    plan: "pro" as const,
    accentColour: "#0E9F6E",
    subscription: {
      interval: "month" as const,
      status: "active" as const,
      currentPeriodStart: periodStart.toISOString(),
      currentPeriodEnd: addMonths(periodStart, 1).toISOString(),
      cardLast4: "4242",
      cardBrand: "Visa",
      promoApplied: false,
    },
    createdAt: created,
  };

  // "CSV export" is voted for by customer3 (who also voted for "Export to CSV")
  // plus eight customers who did not, so a merge has one overlapping voter.
  const acmeData = buildRequests(acme.id, ACME_REQUESTS, today, (def) =>
    def.title === "CSV export" ? ["customer3@example.com", ...customers(41, def.votes - 1)] : customers(1, def.votes),
  );
  const northwindData = buildRequests(northwind.id, NORTHWIND_REQUESTS, today, (def) => customers(1, def.votes));

  const replies: Reply[] = acmeData.requests
    .filter((r) => REPLY_BODIES[r.title])
    .map((r) => ({
      id: id(),
      requestId: r.id,
      userId: ava.id,
      body: REPLY_BODIES[r.title],
      createdAt: addDays(new Date(r.createdAt), 2).toISOString(),
    }));

  return {
    schemaVersion: 1,
    users: [ava, nora, max],
    workspaces: [acme, northwind],
    memberships: [
      { id: id(), workspaceId: acme.id, userId: ava.id, role: "owner", createdAt: created },
      { id: id(), workspaceId: northwind.id, userId: nora.id, role: "owner", createdAt: created },
      { id: id(), workspaceId: northwind.id, userId: max.id, role: "member", createdAt: created },
    ],
    invites: [],
    requests: [...acmeData.requests, ...northwindData.requests],
    votes: [...acmeData.votes, ...northwindData.votes],
    replies,
    invoices: [
      {
        id: id(),
        workspaceId: northwind.id,
        date: periodStart.toISOString(),
        description: "Signalboard Pro (monthly)",
        amountCents: 2900,
        cardLast4: "4242",
      },
    ],
    loginAttempts: {},
  };
}

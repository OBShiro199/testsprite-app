# Signalboard

A demo B2B SaaS for collecting customer feedback. A company gets a public board where customers post and upvote feature requests, a team inbox to sort them, a public roadmap, and Free/Pro plans with a simulated checkout.

**This is a demo for a video.** There is no backend, no database and no real payment provider. All data lives in the browser's `localStorage`, so every visitor (and every TestSprite browser) gets their own copy of the seed data.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm run build` type-checks and builds for production.

## Seed logins

The app seeds itself the first time it loads in a browser. Every seed account uses the password **`Signal123!`**.

| Email | Workspace | Role | Plan |
|---|---|---|---|
| `owner@acme.test` (Ava Owner) | Acme (`/b/acme`) | Owner | Free: 48 of 50 requests, 1 of 2 seats |
| `owner@northwind.test` (Nora Owner) | Northwind (`/b/northwind`) | Owner | Pro monthly, accent `#0E9F6E` |
| `member@northwind.test` (Max Member) | Northwind | Member | Can't open billing or checkout |

Acme's board has "Export to CSV" and "CSV export" as duplicates; `customer3@example.com` voted for both.

To start again, use **Reset demo data** in the landing page footer, or go to `/reset`.

## Test cards (simulated checkout)

| Card number | Result |
|---|---|
| `4242 4242 4242 4242` | Succeeds |
| `4000 0000 0000 0002` | "Your card was declined." |
| `4000 0000 0000 9995` | "Your card has insufficient funds." |
| Any other Luhn-valid number | Succeeds |

Use any expiry from this month onwards and any 3-digit CVC (4 digits for numbers starting 34 or 37). Promo code **LAUNCH50** (any case) takes 50% off the first month of the monthly plan.

## How it's built

- Next.js (App Router), TypeScript and Tailwind CSS. Every page is a client component.
- `lib/store.ts` is the only code that reads or writes app data. Every rule (email matching, seats, votes, merges, promo codes, card checks, plan changes) is enforced there, not just in the UI, so typing a URL directly still hits the same checks.
- Data is stored as one JSON object under `signalboard:v1` (`schemaVersion: 1`); the session is under `signalboard:session`. Open tabs stay in sync through the browser's `storage` event. Missing or unreadable data is re-seeded instead of crashing.
- `lib/dates.ts` answers every "what time is it?" question. Month arithmetic clamps to the end of the month (31 January + 1 month = 28 or 29 February).
- Money is stored in cents and formatted with `Intl.NumberFormat`.
- UI follows the Quiet Precision design system: Geist, white surfaces with hairlines, one pastel blue accent, white buttons with a firm edge.

### Faking "now" in development

In `npm run dev` you can move the clock to test renewals and cancellations. In the browser console:

```js
localStorage.setItem("signalboard:now", "2026-12-01T12:00:00.000Z"); location.reload();
// back to the real clock:
localStorage.removeItem("signalboard:now"); location.reload();
```

This is ignored in production builds.

## Security note

Passwords are hashed with SHA-256 through `crypto.subtle` **for demo purposes only**. A real product would use a slow, salted password hash on a server. Nothing in this app is secret, and there are no environment variables.

See [TESTING.md](TESTING.md) for step-by-step test flows.

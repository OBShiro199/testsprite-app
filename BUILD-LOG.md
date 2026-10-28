# Signalboard build log

Plain-English updates after each milestone.

## MILESTONE 1 - What we've done

**In plain English:** we built the skeleton of the house and the front door with a lock.

- **The notebook (`lib/store.ts`).** There's no server, so the app keeps everything in one notebook inside your browser (localStorage, under `signalboard:v1`). Every page has to ask the notebook. No page writes in it directly. That means rules like "no duplicate emails" live in one place, and nobody can skip them by typing a URL.
- **Pre-filled demo data.** The first time the app opens, it fills the notebook with two companies. **Acme** is on Free with 48 requests. **Northwind** is on Pro.
- **Sign-up and log-in.** Emails are trimmed and lower-cased everywhere, so " Owner@ACME.test " logs in fine and "OWNER@acme.test" can't sign up twice. A wrong password says "Wrong email or password." and never says which one was wrong. 5 wrong tries lock that email for 10 minutes.
- **The lock on `/app`.** Logged out? You're sent to `/login?next=/app`, and you land back there after logging in. Log out, press Back, and the page checks again and sends you away (tested ✅).
- **Your design system is applied.** Quiet Precision: Geist font, white surfaces with thin grey lines, pastel blue for "selected", white buttons with a firm edge, and toasts bottom-left.
- `/reset` wipes the notebook and reloads the demo data.

## MILESTONE 2 - What we've done

**In plain English:** we built the public suggestion box customers see at `/b/acme`.

- **Customers post ideas.** Each idea has a title (5 to 80 characters), an optional description (up to 1,000 characters) and an email. The poster automatically gets one vote.
- **No copycats.** "  export to CSV " counts as the same as "Export to CSV". The error links to the existing request instead of creating a duplicate (tested ✅).
- **A size limit on Free.** Acme has 48 requests. Two more posts make 50, and the 51st gets "This board isn't taking new requests right now." (tested ✅).
- **One vote per person.** The first Upvote asks for an email, and the browser remembers it ("Voting as … Not you?"). Voting again, even in different capitals, says "You've already voted for this." and the count doesn't change (tested ✅). "Remove my vote" takes it back.
- **Sorting and finding.** Top or New, a status filter, and search.
- **Each request has its own page,** with team replies and their "Team" badge. The roadmap (`/b/acme/roadmap`) has Planned, In progress and Shipped columns. A board that doesn't exist shows "This board doesn't exist."

## MILESTONE 3 - What we've done

**In plain English:** we built the team's back office, where Acme's staff sort the suggestions.

- **The inbox (`/app`)** lists every request with its status, votes, replies and last activity. You can search, filter, and sort by Recent activity, Top or New.
- **The usage bar on Free** says "48 of 50 requests used". At 50 it turns amber: "Board is full. Upgrade to Pro for unlimited requests."
- **The request page.** The team can:
  - Change the status (it shows publicly at once, tested ✅).
  - See every voter's email.
  - Reply as the team (it shows publicly with a "Team" badge, tested ✅).
- **Merging duplicates.** Search for the target, pick it, and confirm "Merge into Export to CSV? This can't be undone." People who voted for both count once. "CSV export" (9) merged into "Export to CSV" (24) gave **32**, because customer3 voted for both (tested ✅). The old link redirects to the merged request, which shows "Merged from: CSV export".

## MILESTONE 4 - What we've done

**In plain English:** we built the guest list for the team, with a limited number of chairs.

- **Seats = members + pending invites.** Free has 2 chairs and Pro has 10. Acme starts at "1 of 2 seats used" (just Ava).
- **Inviting someone** (owners only) creates an invite link you can copy (no real email is sent). Inviting " Sam@Acme.test" made it "2 of 2" (tested ✅).
- **Guest-list rules:**
  - Inviting "SAM@acme.test" again says "You've already invited that email." (tested ✅).
  - Inviting an existing member says "That person is already on your team."
  - A third invite on Free is blocked: "You've used all 2 seats on the Free plan. Upgrade to Pro to add more." with an Upgrade button (tested ✅).
  - Revoking a pending invite frees its chair straight away.
- **Accepting an invite (`/invite/…`):**
  - Logged in as the wrong person, you see "This invite was sent to sam@acme.test. Log out and sign in with that email to accept it." (tested ✅).
  - Logged out, you see "Join Acme on Signalboard" with a sign-up form whose email is locked to the invited address. Sam signed up and landed in Acme's inbox as a Member (tested ✅).
  - Reusing the link says "This invite has already been used." A fake link says "This invite isn't valid any more." (tested ✅).
- **Members vs owners.** Members manage requests and see the team list read-only. They don't get Settings, Billing or the invite tools. Owners can remove members (with a confirm step), but can never remove themselves or the last owner.

## MILESTONE 5 - What we've done

**In plain English:** we built the shop till. It's pretend money, but it follows every real-shop rule.

- **Pricing page (`/pricing`).** Free vs Pro, with a Monthly/Yearly switch ($29 a month or $290 a year).
- **Checkout (`/checkout`), owners only.** It looks like a hosted checkout: an order summary, a promo-code box, a card form and a "Test mode" note listing the test cards.
- **Promo codes:**
  - " launch50 " in any capitals gives "LAUNCH50 · 50% off first month −$14.50", "Due today $14.50", "Then $29.00 per month" (tested ✅).
  - On Yearly it says "This code only works on the monthly plan." with no discount. Switch back to Monthly and the discount returns (tested ✅).
  - An unknown code says "That code isn't valid." (tested ✅).
  - One code at a time, with a Remove link.
- **Card checks, shown next to each field:**
  - A wrong number fails the Luhn check (the maths check every real card number passes): "Your card number is invalid."
  - Last month's date: "Your card has expired." **This month's date is accepted.**
  - A bad CVC: "Your card's security code is invalid." (all tested ✅).
- **Test cards.** 4000…0002 says "Your card was declined." and 4000…9995 says "Your card has insufficient funds." (tested ✅). 4242… succeeds.
- **The Pay button.** It says "Pay $14.50", then disables and shows "Processing payment…" for 1.5 seconds. **I clicked it three times fast and got exactly one subscription and one invoice** (tested ✅).
- **Success page.** "Acme is on Pro", $14.50 paid, renews November 28, 2026. 31 January + 1 month = end of February (checked with leap years too ✅).
- **Billing (`/app/billing`).**
  - Shows the plan, renewal date, "Visa ending 4242", seats and requests used, and invoices (newest first).
  - Members get "Only the workspace owner can manage billing." even when typing the URL directly. The same goes for `/checkout` (tested ✅).
- **Cancel, resume and downgrade:**
  - Cancelling shows "Pro until November 28, 2026. You'll move to Free after that." and the workspace stays Pro (tested ✅).
  - I fast-forwarded the clock (a development-only switch) past that date. Acme dropped back to Free and the board colour switched off, but stayed saved for next time (tested ✅).
  - Active subscriptions renew automatically at the full $29.00 (Northwind renewed, tested ✅).
- **Settings (`/app/settings`).**
  - The workspace name can change, but the board address doesn't.
  - There's a board URL with a Copy button.
  - Pro workspaces get an accent colour picker. Orange showed on Acme's public buttons and badges (tested ✅). On Free it's locked: "Upgrade to Pro to customise your board".

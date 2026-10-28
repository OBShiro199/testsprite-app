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

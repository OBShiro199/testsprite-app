# Testing Signalboard

Signalboard keeps all data in the browser's localStorage and seeds itself on first load, so every fresh browser starts with the same demo data. To start over in the same browser, open `/reset` and click **Reset demo data**, then **Yes, reset everything**.

## Seed logins

All seed accounts use the password **`Signal123!`**.

- `owner@acme.test`: owner of **Acme** (Free plan, 48 of 50 requests, 1 of 2 seats). Public board: `/b/acme`
- `owner@northwind.test`: owner of **Northwind** (Pro monthly). Public board: `/b/northwind`
- `member@northwind.test`: member of **Northwind** (not an owner)

## Test cards

- `4242 4242 4242 4242`: succeeds
- `4000 0000 0000 0002`: declined, "Your card was declined."
- `4000 0000 0000 9995`: declined, "Your card has insufficient funds."
- Any other Luhn-valid number: succeeds
- Expiry: any month from the current month onwards, as MM/YY. CVC: any 3 digits.
- Promo code: `LAUNCH50` (any case), 50% off the first month of the monthly plan only.

## Flows

### 1. Sign up, log out, log back in

1. Go to `/signup`.
2. Enter name `Fay Founder`, work email `fay@founder.test`, password `testpass1`, workspace name `Founder Co`.
3. Click **Create account**. You land on `/app` (the Inbox) with "Founder Co" and a **Free** plan badge in the top bar.
4. Click **Log out** in the top bar. You land on `/login`.
5. Log in with ` FAY@Founder.test ` (capitals and spaces) and `testpass1`. You land on `/app` again.

### 2. Wrong password message

1. Go to `/login`.
2. Enter `owner@acme.test` and password `wrongpass1`, then click **Log in**.
3. Check the message is exactly "Wrong email or password." and does not say which field was wrong.
4. Enter an email that doesn't exist (`nobody@acme.test`) with any password. The message is the same.
5. (Optional) After 5 failed attempts for the same email within 10 minutes, the message becomes "Too many attempts. Try again in 10 minutes." and even the correct password is refused.

### 3. Post a request and vote on Acme's board

1. Go to `/b/acme` (no login needed).
2. In **Post a request**, enter title `Webhook retries`, email `fan@example.com`, and click **Post request**. The request appears in the list with **1** vote.
3. On another request (for example "Dark mode"), click **Upvote**. When asked, enter `voter@example.com` and click **Upvote**. Its vote count goes up by 1, and "Remove my vote" appears.
4. Click **Upvote** on the same request again. "You've already voted for this." appears and the count doesn't change.
5. Click **Not you?**, click **Upvote** on the same request, and enter `VOTER@Example.com`. "You've already voted for this." appears and the count doesn't change.
6. Click **Remove my vote**. The count goes down by 1.
7. Try posting a request titled ` export to csv ` (any email). You see "A request with this title already exists" with a link to the existing request.

### 4. Fill the board to 50 and check the 51st is refused

1. Reset demo data. Acme has 48 requests.
2. On `/b/acme`, post two new requests with different titles (for example `Request forty nine` and `Request fifty`) and any valid email.
3. Post a third (`Request fifty one`). You see "This board isn't taking new requests right now." and the list still shows 50 requests.
4. Log in as `owner@acme.test`. The Inbox shows "50 of 50 requests used" in amber and "Board is full. Upgrade to Pro for unlimited requests."

### 5. Move a request to Planned and see it on the roadmap

1. Log in as `owner@acme.test` and open the Inbox (`/app`).
2. Click any **Open** request (for example "Multiple boards per workspace").
3. In **Status**, choose **Planned**.
4. Open `/b/acme/roadmap`. The request appears in the **Planned** column.

### 6. Merge duplicates and check the vote count

1. Reset demo data. Log in as `owner@acme.test`.
2. In the Inbox, note "Export to CSV" has **24** votes and "CSV export" has **9**. `customer3@example.com` voted for both.
3. Open **CSV export**. Under **Merge into another request**, search `export to`, select **Export to CSV**, click **Merge into selected request**, then **Merge** in the confirmation ("Merge into Export to CSV? This can't be undone.").
4. You land on **Export to CSV**, which now has **32** votes (24 + 9 − 1 shared voter) and shows "Merged from: CSV export".
5. "CSV export" no longer appears in the Inbox or on `/b/acme`. Its old public link redirects to "Export to CSV".

### 7. Seat limit on Free

1. Reset demo data. Log in as `owner@acme.test` and open **Team** (`/app/team`). It shows "1 of 2 seats used".
2. Invite `sam@acme.test`. "Invite sent to sam@acme.test" appears with an invite link, and seats show "2 of 2 seats used".
3. Invite `third@acme.test`. You see "You've used all 2 seats on the Free plan. Upgrade to Pro to add more." with an **Upgrade** button.
4. Invite `SAM@acme.test` again. You see "You've already invited that email."
5. Click **Revoke** next to sam@acme.test. Seats show "1 of 2 seats used".
6. Invite `third@acme.test`. It succeeds.

### 8. Upgrade Acme with LAUNCH50

1. Reset demo data. Log in as `owner@acme.test`.
2. Go to `/pricing` and click **Upgrade to Pro** (Monthly), or go to `/checkout?interval=month`.
3. In **Promo code**, type `launch50` (lower case) and click **Apply**. The summary shows "LAUNCH50 · 50% off first month −$14.50", "Due today $14.50" and "Then $29.00 per month".
4. Fill the card form: name `Ava Owner`, card `4242 4242 4242 4242`, expiry 12/30, CVC `123`, country `United States`.
5. Click **Pay $14.50**. It shows "Processing payment…" for about 1.5 seconds, then goes to `/checkout/success` with "Acme is on Pro" and amount paid $14.50.
6. The top bar badge says **Pro**. `/app/billing` shows one invoice of **$14.50** and "Visa ending 4242".

### 9. Promo code rules

1. As an owner on a Free workspace, open `/checkout?interval=year`.
2. Apply `LAUNCH50`. You see "This code only works on the monthly plan." and Due today stays $290.00.
3. Click **Monthly**. The discount applies ($14.50 due). Click **Remove** to take it off ($29.00 due).
4. Apply `NOTACODE`. You see "That code isn't valid."

### 10. Card errors

On `/checkout?interval=month` as Acme's owner (before upgrading), with name, CVC and country filled in:

1. Card `4000 0000 0000 0002`, expiry 12/30, then **Pay**. After processing: "Your card was declined."
2. Card `4000 0000 0000 9995`. After processing: "Your card has insufficient funds."
3. Card `4242 4242 4242 4242` with an expiry in last month (MM/YY). "Your card has expired." next to the expiry field.
4. Card `4242 4242 4242 4242` with the **current** month as expiry. This is accepted, not shown as expired.
5. Card `4242 4242 4242 4241`. "Your card number is invalid."
6. CVC `12`. "Your card's security code is invalid."

### 11. After upgrading: third seat and accent colour

1. After flow 8, open **Team**. It shows "1 of 10 seats used". Invite `sam@acme.test` and `third@acme.test`. Both succeed.
2. Open **Settings** (`/app/settings`). Pick a colour in **Board accent colour** and click **Save colour**.
3. Open `/b/acme`. The Upvote buttons and status badges use the new colour.

### 12. Members can't open billing or checkout

1. Log in as `member@northwind.test`. The top bar has no Settings or Billing links.
2. Type `/app/billing` into the address bar. You see "Only the workspace owner can manage billing." and no billing details.
3. Type `/checkout?interval=month`. You see "Only the workspace owner can manage billing." and no Pay button.

### 13. Cancel Northwind's subscription

1. Log in as `owner@northwind.test` and open **Billing**.
2. Note the renewal date, then click **Cancel subscription** and confirm with **Cancel subscription**.
3. The page shows "Pro until [that date]. You'll move to Free after that." The badge still says **Pro**.
4. Click **Resume subscription**. The notice disappears and the plan renews normally.

### 14. Log out and press Back

1. Log in as `owner@acme.test` and open `/app`.
2. Click **Log out**. You land on `/login`.
3. Press the browser's Back button. You are sent back to `/login` and no inbox data is shown.

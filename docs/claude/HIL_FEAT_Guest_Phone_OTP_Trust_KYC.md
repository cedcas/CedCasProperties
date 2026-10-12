# HIL Feature Brief — Guest Verification Code, Trusted Guest Registry & Auto Mode

**Status:** Design approved by the Owner 2026-10-09. **Implementation not yet authorized** — no code, migration, vendor setup or deploy until the Owner says go.
**Sequence:** Step 3 of 3 (Owner-approved order, 2026-10-09). Step 1: [Same-Day Booking](HIL_FEAT_Same_Day_Booking_Advance_Notice.md). Step 2: [Instant Booking](HIL_FEAT_Instant_Booking_Modes_Trusted_Guests.md).
**Estimate:** 4 sessions.
**SMS vendor:** Owner is leaning to **PhilSMS** (2026-10-09), which is also the candidate for HIL's marketing-campaign project. Not final until Sender ID registration and a delivery test are done.
**History:** first drafted 2026-10-09; rewritten the same day after a review against the code on `dev` (`977c8fa`).

## 1. What this delivers

1. **A verification code at checkout.** Every guest confirms a contact with a one-time code before they can pay, book or submit a request.
2. **A Trusted Guest Registry.** The Owner keeps a list of guests who may book without approval.
3. **Auto mode.** With both in place, the third Instant Booking mode is switched on: a verified guest who matches a trusted record books instantly; everyone else needs approval.

The booking lifecycle (requests, approval, payment link, date holds) is specified in the Instant Booking brief and is not repeated here.

**Why this is last:** on its own the code adds a step and an SMS cost to every booking and enables nothing. Its payoff is Auto mode, which needs Step 2's approval path to exist.

**Start now, in parallel:** Sender ID registration with the SMS vendor is paperwork with its own lead time. It can begin before any code.

## 2. Owner decisions (2026-10-09)

1. A verification code is required before completing any booking or request, for every payment method.
2. **Channel by number:** a Philippine (+63) number gets the code by SMS. Any other number gets it by email. International SMS is a later upgrade, so the design must allow adding a channel without rework.
3. Imported guests from Airbnb and other channels are repeat guests and personal friends the Owner knows. **The Owner is the privacy check** for adding them and may add them directly as trusted.
4. No identity documents or KYC in this work.
5. Retrofitting permission checks onto existing admin routes (Next #17) is not a blocker now; the new routes here use `checkPermission` from the start.

## 3. Three separate things

1. **Contact verified** — a fresh code proves the guest controls that phone or email right now. It says nothing about identity or history.
2. **Trusted guest** — the Owner has put this person on the registry. Only this unlocks instant booking in Auto mode, and only together with a fresh verification.
3. **Identity verified** — a future third-party check. Not built.

| Guest state | In Auto mode |
|---|---|
| No valid code | Cannot pay, book or request |
| Verified, not on the registry | May submit a request for approval |
| Verified, and the verified contact matches an active trusted record | Books instantly, subject to all other checks |
| Marked blocked | Never instant (see §9, decision 3) |

## 4. Verification design

### Flow
1. Guest enters name, phone, email and stay details.
2. Guest asks for a code. The server normalizes the phone (`src/lib/phone.ts`, already E.164) and picks the channel.
3. Guest enters the code. The server returns a short-lived verification token bound to that exact contact.
4. Every gated route requires a valid token whose contact matches the request. Changing the phone or email invalidates it.

### Channels
- **SMS** for +63 numbers.
- **Email** for other numbers, sent through the existing mailer (`src/lib/email.ts`).
- **Email as fallback** for a +63 guest whose SMS does not arrive ("send it to my email instead"), so a vendor outage does not stop all bookings.
- One interface, `sendVerificationCode(channel, destination, code)`, so international SMS is added later as one more channel.

### Routes that must be gated
The check belongs on all of these, because the card is charged and guest details are stored before the booking route runs:

- `src/app/api/checkout-attempts/route.ts`
- `src/app/api/stripe/payment-intent/route.ts` (booking kind only; not additional charges)
- `src/app/api/bookings/route.ts`, for both instant bookings and requests

The payment link from Step 2 needs no second code: the guest verified when requesting, and the link's token is the credential.

### Data
A `ContactVerification` table: channel, destination, keyed hash of the code (never the code), expiry, attempt count, verified time, hashed token, IP, created time. Rows are purged on a schedule, like `CheckoutAttempt`.

### Abuse controls
There is no rate-limiting infrastructure in the app today. The one limiter, in `src/app/api/security-alert/route.ts`, is in-memory and does not work across serverless instances. Build limits on the database:

- Sends per destination and per IP, with a cooldown between sends.
- Guess attempts per code; the code is single-use and short-lived.
- A daily cap on total SMS, with an Owner alert and automatic fall-back to email when reached. A public form that sends paid SMS is a known fraud target.
- Identical responses whether or not a contact is on the registry, so the form cannot be used to find out who is trusted.
- No code and no full phone number in logs.

Proposed starting values, for the Owner to confirm: 6-digit code, 10-minute expiry, 5 guesses, 3 sends per 15 minutes, token valid 30 minutes, verification required for each booking.

### SMS driver
- `src/lib/sms.ts` is the dormant Twilio driver. Add the chosen vendor behind the same `sendSms` function with a provider switch; do not remove Twilio.
- **Gotcha:** `sms.ts` decides "dev mode" from `NODE_ENV`, which is `production` on Vercel Preview builds too. Without a `VERCEL_ENV` check, `dev.haveninlipa.com` would send real, paid SMS. Fix this before wiring the code in.
- Confirm with the vendor whether a sandbox exists. The design does not depend on one.

### No real SMS outside Production (Owner-approved 2026-10-09)
Three independent controls:

1. **Environment gate.** The driver calls the vendor only when `VERCEL_ENV` is `production`. Anywhere else it refuses.
2. **No vendor key outside Production.** The vendor credentials are set in Vercel for the Production environment only, as with the Stripe live keys. A bug in the gate then still cannot send.
3. **Codes by email when testing.** On Preview and local, an SMS-channel code is delivered by email instead, so the flow stays testable.

Optional: an allowlist of the Owner's own numbers that may receive real SMS from Preview, for testing delivery end to end. It needs a vendor key in Preview, so add it only if wanted.

- Also confirm with the vendor: that codes go by a transactional route, that the same Sender ID can serve codes and marketing, delivery to all Philippine networks, and pricing.

## 5. Trusted Guest Registry

### Record
Display name, phone (E.164) and/or email (normalized), state (`pending_review`, `trusted`, `blocked`), source (`hil`, `airbnb`, `other`), optional reference and notes, who created it and when.

### Matching rule
A guest matches a record only on the contact they verified in this booking: the phone for an SMS code, the email for an email code. Typing a trusted person's details without passing the code gains nothing.

**Never match through the derived customer clusters.** `src/lib/customers.ts` groups bookings by email *or* phone, transitively, and compares only the last 10 digits of a phone. That is fine for the admin Customers list and unsafe as a trust test.

### Admin
- A Trusted Guests screen: search, add, edit, trust, revoke, block.
- An "add to trusted guests" action on the existing customer pages (`src/app/admin/customers/`), prefilled from that customer.
- Promotion is manual. No guest becomes trusted automatically after a stay.
- Every change is written to `AdminLog`. New routes enforce `checkPermission`.
- No ID photos, ID numbers, biometrics or Airbnb credentials are stored.

## 6. Auto mode

- Step 2 already stores `auto` as a mode value. This step offers it in the admin UI and teaches the policy function (`src/lib/booking-policy.ts`) the rule: in Auto, a verified contact with an active trusted record is `ok`; anyone else is `requires_approval`.
- A trusted guest still passes availability, advance notice, capacity and payment checks.
- Trust is recognized across all listings; the mode is set per listing.

## 7. Sessions

| Session | Deliverable |
|---|---|
| 1 | `ContactVerification` migration; start/check routes; database rate limits; SMS driver switch and the Preview-environment fix; email channel; tests for replay, expiry and guessing |
| 2 | Code step in the booking form; token enforced on the three gated routes; failure and fallback messages |
| 3 | Registry migration and admin screens; customer-page action; Auto mode in the policy function and admin UI |
| 4 | End-to-end acceptance on `dev.haveninlipa.com` for each payment method and both channels; release and production verification; layered docs and decision entry |

## 8. Acceptance criteria

- No booking, request, payment intent or checkout attempt is created without a valid token for the exact contact submitted, including by direct API call.
- A token cannot be reused for a different contact, replayed after expiry, or brute-forced.
- A +63 number receives SMS; a foreign number receives email; a +63 guest can fall back to email.
- Hitting the SMS cap alerts the Owner and bookings continue by email.
- Preview and local environments send no real SMS.
- In Auto mode, only a verified contact with an active trusted record books instantly; revoking trust takes effect on the next booking.
- The Owner can add an imported guest as trusted, and that guest still needs a code to use it.
- Responses do not reveal whether a contact is on the registry.
- The existing booking, payment, email and inventory tests pass.

## 9. Open Owner decisions

1. Confirm PhilSMS after Sender ID registration and a delivery test; approve the SMS budget and daily cap.
2. Confirm the starting values in §4.
3. What "blocked" means. Recommendation: the guest always goes to approval and the Owner sees a flag. An outright refusal would tell the guest they are blocked.
4. Whether a guest who verified by email fallback on a +63 number can be matched as trusted on that email. Recommendation: yes, since the registry holds both contacts.
5. Whether to send a short notice to a trusted guest's contact when their trusted status is used.

## 10. Later, not in this work

- International SMS as a third channel.
- Reusing a verification across bookings for a returning browser.
- Third-party identity verification. If pursued, it needs its own brief, vendor assessment and privacy review, and it would be an extra signal, not a substitute for the registry.

## 11. Kickoff checklist

1. Steps 1 and 2 are live.
2. Sender ID is registered and the vendor's delivery test passed.
3. Read `docs/HIL_PROJECT_STATUS.md` (including the shelved SMS reactivation item), `docs/HIL_DECISIONS.md` and `docs/HIL_MIGRATION_RUNBOOK.md`.
4. Re-verify the file references; the code may have moved since `977c8fa`.
5. Confirm Owner authorization and the answers to §9.

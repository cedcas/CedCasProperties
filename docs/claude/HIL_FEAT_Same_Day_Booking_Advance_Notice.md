# HIL Feature Brief — Same-Day Booking & Advance Notice

**Status:** Design approved by the Owner 2026-10-09. **Implementation authorized 2026-10-12.** Session 1 built on `feature/same-day-booking-advance-notice-101226` (not merged, migration not applied). Owner decisions 2026-10-12: per-listing settings; 30-minute grace. Still open: §7 items 1 and 3 (needed for Session 2). Decision record: DEC-027.
**Sequence:** Step 1 of 3 (Owner-approved order, 2026-10-09). Step 2: [Instant Booking](HIL_FEAT_Instant_Booking_Modes_Trusted_Guests.md). Step 3: [Phone OTP & Trusted Guests](HIL_FEAT_Guest_Phone_OTP_Trust_KYC.md).
**Estimate:** 2 sessions.
**History:** first drafted 2026-10-09 from the Owner's Airbnb screenshots; rewritten the same day after a review against the code on `dev` (`977c8fa`).

## 1. What this delivers

Two things, in this order:

1. **A "today" floor.** The server refuses a check-in date earlier than today in Lipa. This is a fix to current behaviour and is the foundation for everything else here.
2. **Advance-notice settings per listing.** The Owner can require notice (same day, 1, 2, 3 or 7 days) and, for same day, set a time after which tonight can no longer be booked.

These are rules for direct bookings on haveninlipa.com only. Airbnb's own advance-notice settings are configured in Airbnb; the iCal feeds carry dates, never policies.

## 2. The gap being fixed (verified in code)

- `src/lib/booking-quote.ts` checks only that check-out is after check-in. A request with a past check-in is priced, charged if paid by card, and saved, provided the nights are free.
- The only guard is the date picker, and it uses the UTC date: `src/components/booking/BookingForm.tsx:295` and `src/components/ui/BookingCard.tsx:41` both compute `new Date().toISOString().split("T")[0]`. Manila is UTC+8, so from 12:00 AM to 7:59 AM in Lipa the earliest selectable date is yesterday.
- There is no same-day cutoff of any kind: tonight can be booked at 11:30 PM.

## 3. The rule

All times are `Asia/Manila`, whatever the server or browser timezone. `todayInManila()` already exists in `src/lib/dates.ts`.

- `advanceNoticeDays` = N (0, 1, 2, 3 or 7). Earliest check-in is today + N days.
- `sameDayCutoffMinutes` = minutes after Manila midnight, or null for no cutoff. It applies only when N = 0: once the cutoff has passed, the earliest check-in becomes tomorrow.
- Defaults are N = 0 and no cutoff, so after release the only behaviour change is the today floor. The Owner then sets a cutoff per listing in admin.

## 4. Design

### Data
Two typed columns on `Property`, added by one additive migration (DEC-026: applied by the operator to dev, then production, before the code merges):

- `advanceNoticeDays Int @default(0)`
- `sameDayCutoffMinutes Int?`

Not in the `housePolicies` JSON: that field is free text used for display and schema markup, and this rule must be validated and queried.

### Policy function
New `src/lib/booking-policy.ts`, pure and unit-testable with an injected `now`:

- `earliestCheckIn(now, policy)` returns the earliest bookable check-in date.
- `assertBookingPolicy(...)` returns a typed outcome. Today the outcomes are `ok` and `too_soon`. Step 2 adds `requires_approval`, so this is the shared policy layer the other two briefs plug into.

### Where it is enforced
The three guest routes call `assertBookingPolicy` next to their existing `computeBookingQuote` call:

- `src/app/api/stripe/payment-intent/route.ts` (booking kind only)
- `src/app/api/checkout-attempts/route.ts`
- `src/app/api/bookings/route.ts`

**Do not put the rule inside `computeBookingQuote` or `src/lib/availability.ts`.** `computeBookingQuote` is also called by `src/lib/booking-amendment.ts:590` for the admin reference quote, and the availability service backs admin amendments, reactivation of cancelled bookings and the iCal export. Admin actions must not be subject to guest advance notice.

### Guest-facing
- Both date pickers use the Manila date and the listing's earliest check-in for `min`.
- The earliest check-in is time-dependent, so it must not be baked into a cached page (DEC-005). Return it from `/api/availability/[slug]` as an additive field, or compute it in the browser from the two policy values.
- A refused attempt gets a plain message that names the earliest available check-in.

### Grace at final submission
A guest can reach the payment screen before the cutoff and finish after it. Refusing at that point strands a payment (card already charged; GCash/BPI already sent). So:

- The quote, payment-intent and checkout-attempt calls enforce the rule strictly.
- The final `POST /api/bookings` allows a short grace window after the cutoff. For card, measure from the verified PaymentIntent's creation time; for GCash/BPI, from the linked `CheckoutAttempt`.
- The today floor itself has no grace.

### Admin
A "Booking settings" section on the property edit form (`src/components/admin/PropertyForm.tsx`): notice dropdown, cutoff dropdown (shown only for same day), and an "apply to the other listings in this house" helper. Settings are stored per listing. Changes are written to `AdminLog`.

## 5. Sessions

| Session | Deliverable |
|---|---|
| 1 | Today floor on server and both pickers; migration; `booking-policy.ts`; enforcement in the three routes; grace rule; unit tests for midnight, the cutoff minute and UTC offsets |
| 2 | Admin settings UI; picker and error-message polish; acceptance on `dev.haveninlipa.com`; release and production verification (DEC-006); layered docs |

## 6. Acceptance criteria

- A check-in before today in Manila is refused by the server for every payment method, including a direct API call.
- Between 12:00 AM and 7:59 AM Manila, neither picker offers yesterday.
- With defaults, every booking that is valid today (check-in today or later) still succeeds.
- With a cutoff set, a same-day booking before the cutoff succeeds and one after it is refused, with the earliest check-in named.
- With 1, 2, 3 or 7 days' notice, earlier arrivals are refused on client and server.
- A guest who reached the payment screen before the cutoff and submits within the grace window is not refused.
- Admin amendments, cancelled-booking reactivation and the iCal export are unaffected by the rule.
- Changing one listing's settings changes no other listing, and shared-inventory blocking is unchanged.
- Tests are deterministic (injected clock) and the existing suite passes.

## 7. Open Owner decisions

1. Cutoff for each of the five listings. 10:00 AM was suggested in the first draft and is not approved.
2. Length of the grace window. Proposal: 30 minutes.
3. The list of cutoff choices. Proposal: hourly from 6:00 AM to 2:00 PM, plus "no cutoff".
4. Whether the two houses should each use one shared setting. The design stores per listing with a copy helper; say if a house-level setting is preferred.

## 8. Out of scope

- Same-day reservation *requests* (the old Phase 2). A request that needs approval is the Instant Booking workflow and is built once, in Step 2. After Step 2, "past the cutoff" can become "request instead of refuse" by returning `requires_approval` from the policy function.
- Any change to Airbnb settings.
- Any change to existing bookings.

## 9. Kickoff checklist

1. Read `docs/HIL_PROJECT_STATUS.md`, `docs/HIL_DECISIONS.md` (DEC-002, DEC-005, DEC-020, DEC-024, DEC-026) and `docs/HIL_MIGRATION_RUNBOOK.md`.
2. Re-verify the file references in §2 and §4; the code may have moved since `977c8fa`.
3. Confirm Owner authorization and the answers to §7.
4. On approval, record the decision in `docs/HIL_DECISIONS.md`; log shipped work in the completion log only after it is verified live.

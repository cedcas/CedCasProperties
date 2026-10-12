# HIL Feature Brief — Correct a Booking and Charge the Difference

**Status:** Idea approved by the Owner 2026-10-09. **Implementation not yet authorized** — no code or deploy until the Owner says go.
**Sequence:** Independent of the three-step sequence ([Same-Day](HIL_FEAT_Same_Day_Booking_Advance_Notice.md), [Instant Booking](HIL_FEAT_Instant_Booking_Modes_Trusted_Guests.md), [OTP & Trusted Guests](HIL_FEAT_Guest_Phone_OTP_Trust_KYC.md)). It can ship at any time.
**Estimate:** 1 session. No schema change expected.

## 1. The problem

A guest agrees one thing with the Owner on Messenger and books another, most often by declaring fewer guests to lower the total. It has happened once. The booking arrives as `pending` with the lower amount already paid by GCash/BPI, or as `confirmed` if paid by card. The Owner had no quick remedy and confirmed the booking as it was.

The site cannot detect this. The Owner spots it by checking the booking against the conversation. This feature makes the fix quick once it is spotted.

## 2. What exists today

The remedy is possible now, in three separate manual steps:

1. **Admin Guest & Stay Edit** (`src/components/admin/GuestStayEditor.tsx`, `src/lib/booking-amendment.ts`) changes the guest count on a pending or confirmed booking. Under DEC-024 it keeps the stored total and shows a reference difference only.
2. **Additional Charges** (`src/app/api/admin/charges/route.ts`) creates a charge with a description and amount typed by hand. The guest is sent a `/pay/<token>` link and pays by GCash, BPI or card.
3. The Owner confirms the booking when they choose. The booking holds its dates throughout.

The friction: two screens, and the amount is retyped by hand.

## 3. What this delivers

One action in the stay editor: **save the correction and charge the difference.**

- Shown at the review step when the corrected stay prices higher than the stored total.
- Prefilled with a server-computed amount and a description, both editable by the Owner before sending.
- On confirm: the amendment is saved, one `AdditionalCharge` is created for the difference, and the guest is sent the payment link through the existing charge message.
- The existing "save without charging" choice stays, for cases the Owner settles another way.

## 4. Design

### Price is still preserved on the booking
The amendment continues to write no financial field on `Booking`, so the stored total remains what the guest originally paid. The difference is a separate `AdditionalCharge`. This keeps DEC-024's reason intact (never misstate what was paid) while lifting its first-release policy 1, which deferred "any recording of extra amounts". **That is a policy change and needs a new decision entry amending DEC-024.**

### Computing the amount
- **Guest count only:** charge the change in the extra-guest fee for the stay's nights, using `calcExtraGuestFee` and the listing's current fee. Do not use the full reference quote, which is priced "at today's rates" and would fold in any rate change since the booking was made.
- **Dates or listing changed:** fall back to the reference quote's difference, shown with its breakdown.
- The amount is the base difference. The 6% card fee is not included, because the charge payment route already adds it when the guest pays by card.
- The Owner can edit the amount and description before sending. The server validates that the amount is positive.

### Transaction and messaging
- The charge row is created inside the amendment transaction, so the correction and the charge commit or roll back together.
- The guest message is sent **after** commit. Work inside `withInventoryLock` must be database-only because a deadlock retry can run it twice.
- The combined action lives on the amend route, which already enforces `checkPermission("bookings")`.

### Scope limits
- Increases only. A correction that prices lower creates no refund or credit; that stays manual.
- Eligibility follows the existing amendment rules: upcoming and in-progress stays can have the guest count changed; past and cancelled cannot.
- No automatic confirmation or cancellation depending on whether the charge is paid. The Owner decides.

## 5. Acceptance criteria

- From the stay editor, one confirmation saves a higher guest count and creates exactly one charge for the difference, and the guest receives the payment link.
- The booking's stored total is unchanged; the charge appears in the booking's Additional Charges with the correct amount.
- For a guest-count-only change, the amount equals extra guests × fee × nights and is unaffected by rate changes since booking.
- If the amendment fails (for example, over capacity), no charge is created and no message is sent.
- A deadlock retry does not create two charges or send two messages.
- "Save without charging" still works exactly as today.
- The amendment and the charge are both in `AdminLog`.
- Tested on the dev database for GCash/BPI and card, never with a real guest.

## 6. Open Owner decisions

1. Default wording of the charge description the guest sees. It must follow the payment-terminology rules in `SEO-DEC-013`–`018`.
2. Whether a pending booking should show a reminder that a difference is still unpaid when the Owner goes to confirm it.

## 7. Kickoff checklist

1. Read DEC-024 and DEC-014 in `docs/HIL_DECISIONS.md` and the amendment section of the Website spec.
2. Re-verify the file references; written against `dev` at `977c8fa`.
3. Confirm Owner authorization and the answers to §6.
4. Record the DEC-024 amendment as a new decision when it ships.

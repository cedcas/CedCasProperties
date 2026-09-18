# Claude Code Brief — Reduce Booking Friction (HavenInLipa website repo)

## Context
`haveninlipa.com` is a **direct-booking vacation-rental site** (Lipa, Batangas) — Next.js/React, server-rendered, with DB-driven property data and fees (e.g. the extra-guest fee is already DB-driven and server-rendered on property pages and cards like `PropertyCard.tsx`).

**Problem to solve:** organic traffic is strong (~244 clicks/month, climbing) but bookings are low (~0.8% conversion). Analysis pinned the gap to **booking friction on the discovery → property → book path**, not traffic. This brief covers 4 UX/clarity fixes to reduce that friction.

**Hard constraint — payment model is FIXED:** full payment at booking, matching OTA norms. **Do NOT add deposit / partial-payment / "reserve for X%"** anything — explicitly out of scope. These changes are about *discovery, clarity, and clicks-to-book*, never payment terms.

## What I need from you (plan first, then build)
1. **First, produce a short implementation plan** for all 4 changes: the exact components/files you'll touch, your approach for each, and acceptance criteria. Pause for review.
2. Then implement (passes are fine, as before). Keep everything **DB-driven + server-rendered**; no hardcoded prices/fees.

---

## The 4 changes

### 1. Property-card CTA: "View Details" → "Check Availability"
- On the property cards (`PropertyCard.tsx` and any card variants), change the CTA label from **"View Details"** to **"Check Availability"**.
- On click, land on the property page **with the booking/availability widget in view** — scroll to / focus the date picker (e.g. anchor `#book` or programmatic scroll), rather than the top of a long page.
- **Acceptance:** every card shows "Check Availability"; clicking lands on the property page at the booking widget.

### 2. Surface availability earlier (fewer clicks/scrolls to the calendar)
- The property page already has a booking widget with check-in/check-out. Make it **discoverable sooner**:
  - Ensure the booking widget (with the date picker) is **above the fold** on the property page on both mobile and desktop.
  - Ideally, let the card **carry dates forward**: if a lightweight date selection exists on the card, pass `checkin`/`checkout` as query params and pre-fill the property-page widget. (If that's too much for v1, just guarantee above-the-fold placement + the scroll-to behavior from #1.)
- **Acceptance:** a visitor can see/reach the availability calendar within one interaction and without hunting; if dates are chosen on the card, they pre-fill on the property page.

### 3. Clear, itemized "what's included / fees" at the decision point
- Near the booking widget, show a **clear, DB-driven breakdown** so there are no surprises: base nightly rate, **what the base covers** (e.g. "covers N guests"), the **extra-guest fee** (₱X/guest/night beyond base — already in the DB), any cleaning/other fees, and a plain-language **"no hidden fees — full total shown at booking."**
- **Audit for and replace vague copy**: remove any remaining ambiguous strings like "additional charges may apply" (there was per-listing house-rules DB text with vague charge wording) — replace with the itemized, DB-sourced values.
- **Acceptance:** every property page shows an itemized, DB-driven fee summary at/near the booking widget; no vague "additional charges" language remains.

### 4. Sticky booking CTA on property pages
- Add a **persistent/sticky booking CTA** so booking is always one tap away:
  - **Mobile:** a sticky bottom bar showing `From ₱{rate}/night · Check Availability` that stays visible on scroll and opens/scrolls to the booking widget.
  - **Desktop:** a sticky side booking card (common pattern) or a sticky "Check Availability" button.
- Must not obscure content or the footer; dismissible-safe; accessible.
- **Acceptance:** on a long property page, the booking CTA remains reachable at all scroll positions on mobile and desktop.

---

## Cross-cutting constraints
- **No payment-model changes** (see above). Full payment at booking stays.
- **DB-driven + SSR** — reuse the existing patterns that render the extra-guest fee. No hardcoded prices/fees/occupancy.
- **Brand:** coral `#FF5371` + forest green `#3B5323`; reuse existing component styles/tokens.
- **Mobile-first** — cards and pages are viewed largely on mobile; tap targets ≥ 44px.
- **Do not regress SEO:** preserve existing `VacationRental` + `Offer` JSON-LD on property pages; keep the `/book` endpoints `noindex,follow` + self-canonical; don't change canonical/title behavior.
- **Accessibility:** proper button semantics, aria labels on the sticky bar and date picker, keyboard-navigable.

## Instrument for analytics (small, do it inline)
We're standing up GA4 conversion tracking separately. To make it plug-and-play, add **stable hooks** on the new/changed CTAs so events can attach without re-touching the code later:
- `data-analytics="check_availability"` on the card CTA and sticky bar.
- `data-analytics="book_click"` on the final booking-submit button.
- Include `data-property` (slug or id) on those elements so conversions can be attributed per property.

## Verify before done
- Test on a real property page (e.g. `mickey-in-lipa--full-family-house--sleeps-15`) at **mobile and desktop** widths.
- Confirm: label change live; calendar reachable in one interaction; itemized fees render from the DB; sticky CTA works at all scroll positions; JSON-LD still validates (Rich Results Test); `/book` still `noindex`.
- Note anything that needs a content/DB edit vs. a code change.
```

Paste the above into Claude Code inside the website repo. It will plan first; review the plan, then let it build.

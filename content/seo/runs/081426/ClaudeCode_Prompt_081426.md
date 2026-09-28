# Claude Code Prompt — HIL, 2026-08-14

- This was executed by Claude Code on 8/15/26.  I pasted all 3 task at the same time including the "Explicitly NOT in scope" section.


> Paste everything below the line into Claude Code in the HAVENINLIPA repo.
> Three tasks, independent, safe to do in any order. Task 1 is the substantial one.

---

Read these first and follow their conventions — do not restate or duplicate what they already cover:
- `About HIL/HIL Website Technical Specification.md` (Database Schema → Property; GA4 Analytics Events; Security → CSP; File Structure)
- `About HIL/HIL SEO Technical Specification.md`
- `About HIL/HIL Blog Technical Specification.md` (the Footer.tsx ↔ WP REST integration — Task 1 is the mirror image of it)

Update `About HIL/HIL Commits.md` and the relevant spec for anything you ship.

---

## Task 1 — Public property feed: `GET /api/properties.json`

**Why:** the WordPress blog is about to render contextual property recommendations inside articles ("Stay Match" — separate brief coming). It has no access to the DB, so it needs a public read-only feed. This also permanently kills a live bug class: ~29 blog articles hardcode prices and slugs, and articles #1/#3/#7 are currently showing **₱7,000** for the sleeps-15 house against a DB value of **₱6,500**. `normalizePricingProse()` already protects the main site from this; the blog is the unprotected surface.

**Route:** `src/app/api/properties.json/route.ts` (or `/api/properties/route.ts` — your call on naming; the blog will be told the final URL).

**Behaviour:**
- `Property` where `isActive: true` only.
- Public, unauthenticated — same posture as `api/calendar/[slug]`. Expose nothing that isn't already on the public property page.
- `export const revalidate = 3600` — mirrors the Footer's ISR cadence.
- Add `Access-Control-Allow-Origin: https://blog.haveninlipa.com`. WordPress will fetch server-side (so CORS is not strictly required), but this future-proofs a client-side variant without touching CSP.

**Shape** — per property:

| Field | Source |
|---|---|
| `slug`, `name`, `type`, `location` | `Property` |
| `url` | `https://haveninlipa.com/properties/{slug}` |
| `bookUrl` | `{url}/book` |
| `pricePerNight`, `includedGuests`, `maxGuests`, `extraGuestFeePerNight` | `Property` — numbers, not formatted strings |
| `priceFrom` | boolean — reuse `extraGuestFeeApplies()` from `src/lib/occupancy.ts` |
| `bedrooms`, `bathrooms`, `featuredImage`, `amenities` | `Property` |
| `tagline`, `heroSummary`, `bestForSegments` | `Property` SEO columns |

Two things to get right:

1. **`priceFrom` must come from the existing predicate, not a new one.** `PropertyCard.tsx` prefixes "From" only when `extraGuestFeeApplies()` is true (commit `57ab099`) so flat-price listings don't imply an increase that can't happen. The blog must inherit that rule rather than reimplement it — exporting the boolean is how.
2. **Run any prose you expose through `normalizePricingProse()`** (`src/lib/occupancy.ts`), exactly as `generateMetadata` does. `tagline`/`heroSummary` can carry stale seeded numbers; the feed must not re-export drift it exists to prevent.

Emit raw numbers, not display strings — the blog formats. `bestForSegments` is included because it is the audience-fit data the recommendation engine will score against.

**Done when:** `curl -s https://haveninlipa.com/api/properties.json | jq` returns all 5 active listings, sleeps-15 reads `6500`, `priceFrom` matches what each card renders today, and no seeded prose contradicts `pricePerNight`.

---

## Task 2 — Fix the 1 GSC "Redirect error"

GSC Indexing reports exactly **1** page under **Redirect error** (validation state: Started). Everything else in the not-indexed bucket is intentional or benign — 14 `noindex`, 2 `Page with redirect`, 4 `Discovered`, 18 `Crawled – currently not indexed`.

Find the URL via GSC → Indexing → Pages → Redirect error → export the sample, then trace the chain. Likely candidates given this codebase: a redirect loop, a chain longer than one hop, or a redirect to a 404. Fix at the source (`next.config.ts` redirects, middleware, or the Hostinger/Vercel domain config — check which layer owns it before editing).

**Done when:** the chain resolves in one hop to a 200, and validation is re-requested in GSC.

---

## Task 3 — Real reviews for the Mickey listings

`prisma/seed-property-seo-mickey.ts` deliberately sets `aggregateReviewCount`/`aggregateReviewRating` for **no** listing, because those listings had zero testimonials and faking review schema is a policy violation. That's no longer the situation — as of 2026-08-09 the three Mickey pages carry real guest reviews (3 / 4 / 3).

1. Add the real testimonials via admin (`Testimonial`: propertyId, name, location, rating, message, isActive) — **Cedric's step, real content only.**
2. Then update the aggregate constants in the Mickey seed to the true count/average and re-run it (idempotent).

**Calibrate the expectation:** this will **not** produce star ratings in search results. Per the SEO spec, the VacationRental rich result is EAP-gated and will never render for this site, and self-serving first-party reviews don't earn review snippets. The payoff is GSC hygiene (it clears the outstanding `review`/`aggregateRating` warnings) and AI/LLM-search signal. Worth doing for those reasons, not for SERP stars.

**Done when:** the seed re-runs clean, Rich Results Test still validates 0 critical, and the `review`/`aggregateRating` warnings clear.

---

## Explicitly NOT in scope

- **The Stay Match component itself.** Its intent taxonomy depends on strategy decisions from the 2026-08-15 audit. Task 1 is its only prerequisite and is safe to build now.
- **GA4 event work.** All four events (`booking_confirmed`, `generate_lead`, `book_click`, `check_availability`) already shipped. `book_click`/`check_availability` are intentionally not key events.
- **The `www.haveninlipa.com/sitemap.xml` submission.** Redundant, but it's a GSC console removal — Cedric's, not code.

# Haven in Lipa — Completion Log

> Concise historical record of completed work packages/phases, newest first — answers "was this already implemented, and what was the outcome?" without rereading old chats or the full commit log. GitHub remains authoritative for granular commit history ([HIL Commits.md](HIL%20Commits.md)); this file groups commits into features. Not every commit gets an entry — see [HIL_DECISIONS.md](HIL_DECISIONS.md) for the durable *why* behind any of these, and [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md) for what's still open.

---

## 2026-09-27 — Analytics tracking fixes: GA4 production/admin gate, internal-traffic tagging, Stay Match landing confirmation

Area: Website / SEO / Analytics

Status: **Committed on branch `fix/analytics-tracking`; PR against `dev` to be opened. Not merged, not deployed.** The Stay Match v1.0.2 plugin is an artifact only and needs an Owner upload to WordPress.

- **Why:** the 2026-09-27 GA4 review found admin sessions (52 "Organic Search" landings on `/admin/*`/`/pay/*`), dev/preview/local-host sessions (7), and 4 test `booking_confirmed` events (2026-08-09) in the reports. It also found `stay_match_click` at 0 and `generate_lead` not marked as a key event.
- **What:** GA4 loads and sends only on `haveninlipa.com`/`www.` (runtime hostname allowlist, not a preview build), never on `/admin/*`, including after SPA navigation (`ga-disable-G-2SV2PXYB7T`). `track()` is a no-op otherwise. Owner/staff devices get `traffic_type: internal`. `/pay/[token]` stays tracked with the token redacted from `page_location`. DebugView opt-in via `?ga_debug=1`. New `stay_match_arrival` landing event, fed by non-UTM `?hil_sm=&hil_sm_post=` params that plugin v1.0.2 appends (`content/seo/runs/092726/`). `generate_lead` confirmed as the only lead event (contact form) and given `lead_source`. Decision: [DEC-021](HIL_DECISIONS.md). How it works: [Website spec → GA4 Analytics Events](HIL%20Website%20Technical%20Specification.md).
- **`stay_match_click` finding:** no defect in v1.0.1 that would suppress real readers' clicks. With ~14 real viewers, 0 clicks is plausible. The pagePath-`/` views/clicks are inferred (not proven) to be editor previews. The measurement is unverifiable from the blog alone, hence the landing-side event. Detail: [HIL_SEO_SPECIFICATION.md §13](HIL_SEO_SPECIFICATION.md).
- **Tests:** suite 651 → 867 (new `analytics-config`, `analytics-track`, `analytics-component` (jsdom), `stay-match-arrival`). `npm run lint`, `tsc --noEmit` and `npm test` clean. `npm run build:app` not run in this session. **No schema change.** `Booking.isTest` is proposed in DEC-021, pending Owner approval.
- **Owner steps (GA4 UI / WordPress):** set the Internal Traffic and Developer data filters Active; mark `generate_lead` as a key event; upload Stay Match v1.0.2; decide on the `Booking.isTest` proposal.

## 2026-09-27 — Stripe payment verification: server-side pricing + PaymentIntent checks (PR #23)

Area: Website

Status: **Complete — merged 2026-09-27 18:45 CT and deployed to production. One Owner check pending (below).**

- **What shipped:** [PR #23](https://github.com/cedcas/CedCasProperties/pull/23) (`fb3933b`, merge `480053f`). Stays and additional charges are priced on the server (`src/lib/booking-quote.ts` → `computeBookingQuote`), and a card booking/charge is confirmed only after the retrieved PaymentIntent passes `verifyPaymentIntent` (`src/lib/stripe-payment.ts`: succeeded, PHP, exact amount, matching metadata) plus a not-reused check — in `/api/stripe/payment-intent`, `/api/bookings` and `/api/charges/[token]/pay`. Responses: 402 not succeeded, 400 currency/amount/metadata mismatch, 409 intent already used. GCash/BPI bookings stay `pending` with the server-computed price. Decision: [DEC-020](HIL_DECISIONS.md); how it works: [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md) → Payment Verification.
- **Why:** `/api/bookings` previously auto-confirmed on any client-sent `stripePaymentIntentId` without asking Stripe, `/api/stripe/payment-intent` charged a client-sent amount, and promo discounts used client-sent totals.
- **Size / tests:** 9 files, +952/−130. Test suite 651 → 786 (new `stripe-payment.test.ts` and `stripe-payment-routes.test.ts`, mocked Stripe/Prisma). **No schema change.**
- **Deployment evidence:** Vercel production deploy succeeded; CI on `main` green; homepage returned 200 after deploy (DEC-006). Rollback: `git revert -m 1 480053f`.
- **Pending (Owner):** check the Stripe dashboard for any card payment made around 18:45–18:50 CT on 2026-09-27 (the switchover window) that has no matching booking.
- **Follow-ups (not done):** unique constraint on `stripePaymentIntentId` (schema change — needs Owner approval; would reach production via the Vercel-build `prisma db push`); Stripe webhook; weekend-rate guard uses server-local time (harmless on Vercel, which runs in UTC).

## 2026-09-27 — Read-only GSC / GA4 access for the analytics service account

Area: SEO / Analytics

Status: **Complete — read-only access granted and working.**

- **What:** the analytics service account `grokbot-analytics-reader@grokbot-510000.iam.gserviceaccount.com` has **read-only** access to Google Search Console and GA4 for HIL, for reporting and the early-October re-baseline (SEO-DEC-006 / SEO-DEC-027).

## 2026-09-25 — Blog articles #38–41 created and scheduled as `future` (one-time SEO-DEC-010 exception)

Area: Blog / SEO content

Status: **Complete — four posts scheduled, none published. Verified by re-fetch and by the authenticated `hil-seo` preview endpoint.**

- **What shipped:** editorial #38–41 are WordPress posts **847–850** on `blog.haveninlipa.com` (editorial numbers are HIL sequence numbers, not post IDs). Status `future`, scheduled 08:00 `Asia/Manila` (UTC+8) on 2026-11-02 / 11-09 / 11-16 / 11-23 (`date_gmt` 00:00). Slugs: `milestone-birthday-staycation-lipa`, `business-trip-accommodation-lipa-lima-estate`, `sports-team-accommodation-lipa-2027-raam`, `group-accommodation-lipa-booking-checklist`. All nine supplied `hil_*` SEO fields were written through the plugin's registered REST meta; `hil_canonical_url` left unset.
- **SEO-DEC-010 exception (Owner-authorized, one time, this batch only):** the Editor credential (`haven`, id 3) was used to create the posts directly with status `future`. This is a deliberate exception to "creating a post is always saved as a draft"; the Owner authorized it explicitly for these four posts. `WP_ALLOW_PUBLISH=false` **remained set** and was not modified; user roles, capabilities, plugins, plugin code and site settings were **not changed**. The Editor role already holds `publish_posts`, so WordPress itself permitted the schedule. SEO-DEC-010 otherwise stands unchanged: future posts still start as drafts by default.
- **Terms (Owner decisions):** no "Staycation" category and no "Accommodation" tag exist, and none were created (category count 9 and tag total 150 unchanged before/after). Categories: #38 Booking Tips (5) + Lipa City Guide (2); #39 Work & Extended Stays (7); #40 Lipa City Guide (2) + Travel & Itineraries (3); #41 Booking Tips (5). Tags on all four: Lipa City (10) + staycation (15).
- **Featured images:** the four featured images carry HIL branding (recolored logo + "HavenInLipa.com", soft dark vignette, anchored bottom-center to keep faces clear), following `blog/articles/HIL Featured Image Branding Reference.png`. Branded media IDs 851/853/855/857 are the featured images; the original unbranded uploads (839/841/843/845) remain in the media library, unattached. In-body images (840/842/844/846) are unbranded by design.
- **#40 fact check:** the DepEd Lipa City news page lists the RAAM 2027 coordination-meeting item as **August 3, 2026** (draft said "July 2026"; corrected to "August 2026"). No official source reachable confirms RAAM dates, venues or arrangements, so none were added; the article keeps its explicit uncertainty. The full announcement lives on Facebook and could not be read.
- **Gotchas:** (1) The `hil-seo` preview shows `canonical: …/?p=<id>` while a post is `future` — expected; it becomes the slug URL on publish (recheck after publishing). (2) The literal front-end render of a scheduled post can't be checked with an Application Password (front end needs a cookie login; unauthenticated requests correctly 404), so render was verified via REST `content.rendered` and the preview endpoint. (3) Body `<h1>` omitted from these posts because the theme already renders the post title as the H1.
- **Publication-time steps (not done):** purge LiteSpeed and the Hostinger CDN cache at publish time; recheck each post's live URL, canonical and sitemap entry after it publishes.

## 2026-09-25 — DEF closed: Admin Messages booking dates one day early

- **Status: CLOSED — Owner acceptance confirmed 2026-09-25** on all three surfaces. A Sep 28–30, 2026 booking reads `9/28–9/30` in both the Messages list and the thread header in America/Chicago on: the PR Preview, `dev.haveninlipa.com` (verified in an incognito window; it is served by the Vercel Preview environment), and Production `haveninlipa.com`.
- **Cause:** `GuestMessageThreads.shortDate` and `ThreadDetail.fmtShortDate` formatted UTC-midnight `checkIn`/`checkOut` (API serializes Prisma DateTime as `…T00:00:00.000Z`) with a timezone-less `toLocaleDateString`, so viewers west of UTC saw the previous day. Display-only; stored data, pricing and availability untouched. Message timestamps (`relTime`/`fmtTime`) are instants and unchanged.
- **Fix:** both views use new `formatStayRangeShort` (`src/lib/dates.ts`, wraps `formatStayDate`). Tests: `messages-stay-dates.test.ts` (helper, month/year/DST boundaries) and `messages-render.test.ts` (real components in jsdom with mocked API; fails on unfixed code under Chicago with `9/27–9/29`). New `tz-utc` vitest project; `jsdom` devDependency.
- **Deployment evidence:**

| Surface | Branch | SHA | Deployment |
|---|---|---|---|
| PR Preview `ced-cas-properties-b24xghzms-…` | `fix/messages-booking-date-utc` | `cb02295` | success |
| `dev.haveninlipa.com` | `dev` (Preview env) | `57f0a10` (fix + tests cherry-picked; `dev` not merged to `main`) | Preview `ireki6a3b`, success |
| `haveninlipa.com` | `main` | `c4f6345` (PR #22 merge; `git revert -m 1 c4f6345` to roll back) | Production `8ea1ihhgo`, success, SHA matches (DEC-006) |

  CI on PR #22: Lint, Type Check, Unit Tests, Build all passed; no protection bypassed. Local: typecheck, lint, 651 tests, DB-free `build:app`.
- **Acceptance history:** the Owner's first acceptance test failed (`9/27–9/29`) on `dev.haveninlipa.com`, per the Owner's clarification; that domain still ran pre-fix `dev` @ `47af155` (exact deployment ID at test time not independently proven). The PR Preview passed; after the fix reached `dev`, the dev domain passed, then Production. Failed-test screenshot retained in `About HIL/HIL Testing/Messages Booking Date Defect 092526/`; no separate pass screenshot was supplied — the pass is recorded on the Owner's confirmation.
- **Not part of this defect:** any broader dev/main environment-gap review (`dev` still holds unmerged SEO workspace content).

## 2026-09-17 — Manual booking corrections (guest A property move, guest B date extension)

Area: Website

Status: **Complete — both bookings confirmed corrected on production, temp route removed.**

### Outcome
Two Owner-requested direct-data corrections applied to production bookings that the
admin panel has no UI for editing (property/dates are not editable fields there —
[HIL Website Technical Specification.md](HIL%20Website%20Technical%20Specification.md)):
- Booking #130 (guest A) moved from Cozy 1-BR to Mickey Sleeps 7 — same dates,
  `totalPrice` left untouched (already paid).
- Booking #136 (guest B) extended checkOut 9/18/26 → 9/19/26 — `totalPrice` ₱1,500 → ₱3,000,
  `nightlyTotal` +₱1,500 (a second payment the Owner had collected separately, outside the
  normal booking flow).

### How it was done
Followed the [DEC-012](HIL_DECISIONS.md) pattern (temp admin-gated route, not raw SQL)
because a naive UPDATE would have left pricing fields and shared-inventory
`AvailabilityBlock` rows stale. Full sequence: [HIL Commits.md](HIL%20Commits.md)
`25864d0`→`9ff8ebc`.

### Gotcha worth remembering
guest B's property and Cozy 1-BR share an inventory group. Checking both corrections
against **one** up-front DB snapshot silently flagged guest B's extra night as
conflicting with guest A's own current stay (its derived block on guest B's listing) —
a false conflict that only exists because guest A hadn't moved *yet*. The route had to
apply guest A's move and reconcile derived blocks first, then re-check guest B fresh
against the post-move state. Any future manual fix touching two bookings on
inventory-grouped properties should check this: **sequence the writes, don't
snapshot-check them together.**

---

## 2026-09-17 — HIL web/application and SEO workspace governance consolidated

Area: Website | SEO | Blog | Cross-Workstream

Status: **Complete — documentation and governance change only, no production/CMS/DNS action.** See [DEC-018](HIL_DECISIONS.md).

### Outcome
This repository is now the single authoritative workspace for HIL's web/application,
WordPress/blog, SEO governance, content, accessibility/QA, security/privacy/compliance,
deployment, and documentation — coordinated as roles in `CLAUDE.md` rather than split
across this repo and the separate shared `/VSCode/seo/content for HavenInLipa/` workspace.
Mirrors the same-day consolidation done for AMC, NetCore, and TribeMedSpa.

### Material changes
- Migrated 218 files (~14MB: 13 dated run folders, standing research guides, the live
  keyword/SEO tracker, draft featured images, and 40 superseded report/tracker backups)
  from the shared SEO workspace into `content/seo/` (`runs/`, `research/`, `drafts/`,
  `analytics/`, `archive/`), each of the 4 original governance documents preserved
  verbatim with a supersession notice.
- Migrated 25 HIL-specific Python SEO tooling scripts into `tools/seo/`.
- Created `docs/HIL_SEO_SPECIFICATION.md` — a focused SEO governance spec separating
  verified facts, decisions, planned/deferred work, assumptions, open questions, owner
  actions, and approval gates from the existing "how it works" technical spec.
- Added `DEC-018` and a "Migrated SEO Decisions" section to `HIL_DECISIONS.md`, folding in
  all 25 `SEO-DEC-###` identifiers verbatim (not renumbered) as a summary table.
- Rewrote `CLAUDE.md`'s role model into 9 coordinated roles plus a mandatory
  cross-dimension impact review (see `CLAUDE.md` → "Unified Role Model").
- Created `content for HavenInLipa/MIGRATED_TO_HIL_WORKSPACE.md` in the shared workspace,
  and narrowly updated `/VSCode/seo/SEO_PROJECT_INDEX.md` and `/VSCode/seo/CLAUDE.md` to
  mark HIL migrated (mirroring the AMC/NCS/TMS entries added the same day) — the shared
  folder's original contents were left in place, unmodified, as the pre-migration record.

### Verification
`git status`/`git diff --check` run against the HIL repository before staging; the shared
SEO folder is not a git repository, so no git operation applies there. No `npm run build`,
`prisma db push`, WordPress action, DNS change, or Vercel deploy was performed or required
by this work — it is documentation-only.

### Discrepancy found, then confirmed resolved by the Owner same day
The consolidation brief's premise that "the Airbnb sibling cross-link risk is closed"
initially conflicted with `HIL_PROJECT_STATUS.md`'s own Active Gate, which recorded it
open since 2026-08-08 with no logged closure. Flagged rather than silently resolved at
the time. **The Owner subsequently confirmed the same day (2026-09-17) that the unlink is
in fact complete** — `HIL_PROJECT_STATUS.md`'s Active Gate is now closed (see its
Recently Completed), and `docs/HIL_SEO_SPECIFICATION.md` §19–20 updated accordingly. The
Owner also confirmed the PinasBNB customer-zero/`haven-in-lipa.pinasbnb.pro` relationship
flagged as an unverified assumption in the original migration — now recorded as
[DEC-019](HIL_DECISIONS.md). Neither confirmation reopens or reinterprets this migration's
own scope; they are Owner-supplied facts recorded where they belong.

### Not touched by this work
Nothing in this entry closes, advances, or reinterprets: the `hil-seo`/Yoast cutover sequence, the article #6 redirect, the unconfirmed
`stay_match_click` event, `main`'s missing branch protection, or any other item already
open in `HIL_PROJECT_STATUS.md` before this session.

---

## 2026-09-07 — GitHub Actions "Build" and "Lint" CI checks repaired, merged, and verified live

Area: Website/Application | Cross-Workstream

Status: **Complete and independently verified live.** PR [#18](https://github.com/cedcas/CedCasProperties/pull/18) merged to `main` (merge commit `77e31af685d4d05210eaeca557b25e662ffc573f`), Vercel Production deployment confirmed via deployments API (id `6311803597`, sha matches the merge commit exactly, state `success`) per [DEC-006](HIL_DECISIONS.md). No production database was read or written by this work at any point.

### Outcome
Both "Build" and "Lint" GitHub Actions checks had failed on every PR for months for reasons unrelated to the PRs' own content (confirmed identical on #16 and #17, both already merged before this repair). Root-caused and fixed rather than bypassed — see [DEC-017](HIL_DECISIONS.md) for the durable architecture decision and the Website Technical Specification's Build & Deployment → CI section for the current mechanics.

### Material changes (PR #18, merged to `main` as `77e31af`)
- **Build fix**: `/sitemap.xml` and the layout-mounted `getChatTree()` both queried Prisma unguarded at static-export time, crashing any statically-prerendered page (including the shared `/_not-found`) against CI's placeholder database. `/sitemap.xml` now reads through the existing cached `getPublicListings()` helper with `export const dynamic = "force-dynamic"` (same precedent as `/about`/`/properties`). `getChatTree()` now falls back to the generic chat tree if its property query throws, instead of crashing the page — this also hardens production against a transient DB outage at build time.
- **Lint fix**: 9 real pre-existing errors, none introduced by #16/#17 — a CommonJS script converted to real ESM (`scripts/generate-qr-hash.js` → `.mjs`), a shadowed `module` global renamed, and 5 instances of the new `react-hooks/set-state-in-effect` rule (shipped with `eslint-config-next` 16). 2 were rewritten to remove the effect entirely on admin-only surfaces (`AdminLayoutClient` via `useSyncExternalStore`, `GuestMessageThreads`' page-reset via React's documented "adjust state during render" pattern); the remaining 3, on guest-facing/payment-adjacent code (`ChatWidget`, `useQrIntegrity`, `GuestMessageThreads`' error-reset), got one narrow, justified `eslint-disable-next-line` each rather than a rewrite that risked a behavior change out of scope for a CI repair. 3 pre-existing unused-var warnings also cleaned up.
- **CI/production build separation formalized**: new `build:app` script (`prisma generate && next build`, no `db push`) is what the CI Build job runs; the production `build` script (which still runs `prisma db push`) is untouched and remains exclusively Vercel's.
- **Workflow hardening**: explicit `permissions: contents: read`, and a `concurrency` group that cancels superseded runs for the same ref.

### Verification
Local: clean `npm ci`, typecheck (0 errors), full test suite (394/394 passing), lint (0 errors/warnings), `npm run build:app` (exit 0) — all against a placeholder `DATABASE_URL`, never a real one. Trustworthiness confirmed via uncommitted, immediately-reverted fixtures: a real lint error, type error, failing test, and invalid syntax each correctly failed their respective gate.

GitHub Actions on PR #18 itself (not just local reproduction): Lint, Type Check, Unit Tests, and Build all green on both the `dev`-push-triggered and PR-triggered runs.

Post-merge production verification (this session, against `haveninlipa.com` directly, not inferred from the merge or CI alone):
- Deployment sha `77e31af685d4d05210eaeca557b25e662ffc573f` == the merge commit exactly, environment `Production`, status `success`.
- `/sitemap.xml` — HTTP 200, live/dynamic (lastmod values reflect real per-property `updatedAt` from the database, confirming the `force-dynamic` + cached-helper fix works with a real DB, not just the CI placeholder).
- Chatbot — homepage HTML contains DB-backed property nodes (`property-cozy-1-bedroom`, `property-spacious-2-bedroom`, correct per-property guest counts), confirming `getChatTree()` uses live data (not its new fallback) when the database is reachable.
- Booking flow — `/properties/cozy-1-bedroom/book` (HTTP 200), `/api/availability/cozy-1-bedroom` (HTTP 200).
- Admin — `/admin/login` (HTTP 200), `/admin/dashboard` unauthenticated (HTTP 307 redirect, confirming middleware protection intact).
- QR-integrity — both `/qr/gcash.jpg` and `/qr/bpi.png` reachable (HTTP 200); the `NEXT_PUBLIC_QR_HASH_GCASH`/`_BPI` values baked into the production client bundle were extracted and independently re-hashed against the live images with `openssl dgst -sha256` — both match exactly, confirming `useQrIntegrity` will report "verified" for both payment methods.

### Owner action still required (tracked in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md), not closed by this entry)
- Add branch protection on `main` requiring the `Lint`, `Type Check`, `Unit Tests`, `Build` checks — confirmed via the GitHub API that **none exists today** (no branch protection, no rulesets). Exact steps handed to the Owner separately; not enabled automatically, per explicit instruction.
- A new high-priority item: remove `prisma db push` from the Vercel production build and replace it with an explicit, controlled migration process — this repair intentionally left the production `build` script untouched (per PR #18's scope) and does not implement that change.

---

## 2026-09-06 → 2026-09-07 — Post-FAQ-audit follow-up package: terminology, hourly fee, Owner content corrections, Payment Methods admin field

Area: Website/Application | Cross-Workstream

Status: **Complete and independently verified live**, across two merged/deployed PRs and one Owner-authorized direct production database update. One follow-up action from this work package remains open and is tracked in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md), not here — the hourly-fee workflow test (blocked on a missing safe test booking). This entry does not claim that one is done.

### Outcome
A separate follow-up package from the closed 2026-09-06 FAQ audit above, spanning several Owner-approved rounds: neutral payment terminology, a metered admin fee, a manual FAQ content review, a durable admin field for a previously-unfixable stale field, and (unusually for this log) an entire prepared-then-corrected-then-executed production database correction, done transactionally with an independent verification pass rather than through the normal seed/admin flow.

### Material changes — Code (PR #16, merged to `main` as `9684ed0`)
- **Customer-facing Stripe → Credit/Debit Card**: `/about`, `/staycation`, `/properties`, `/properties/[slug]`, `/weddings-accommodation`, the guest booking-confirmation email, and property SEO seed files. `/privacy` intentionally unchanged (data-processor disclosure, not checkout branding).
- **Manila travel-time made fully consistent** at "about one hour": chatbot (`chat-tree.ts`), the homepage `DiscoverLipa` map graphic, and `/staycation`'s intro paragraph — existing traffic qualifiers preserved, the unrelated "an hour from Alabang" claim left alone.
- **₱200/hr Early Check-In / Late Checkout wired into the existing `AdditionalCharge` model** as a new creation mode (DEC-014) — no schema migration. `src/lib/hourly-fee.ts` is the single source of truth for the rate; the server always computes the total, never trusting a client-supplied amount; whole-hours-only validation on both client and server.
- **Five Owner-approved FAQ corrections**, applied everywhere they apply (not just `/faq`): Mt. Maculot removed (trail closed since the pandemic, no replacement invented), payment-verification timing corrected to "within a few minutes," the SMS arrival-instructions promise replaced with "by email and/or FB Messenger" (the only public SMS promise anywhere in the codebase — all internal SMS scaffolding untouched), parking wording corrected to the Fortuner/Vios/street-parking facts with the "never had a parking incident" guarantee removed everywhere, internet-speed wording corrected to "up to 340 Mbps" (B34) / "up to 520 Mbps" (B38) plus a new backup-internet-connection fact.
- **Payment Methods admin field (DEC-015)**: a narrow, single-key addition to `PropertyForm.tsx` with a server-side JSON merge (`src/lib/pricing-notes.ts`) that can never clobber sibling `pricingNotes` values (rate, discounts, deposit, cancellation) — deployed and available in the admin panel for any future edit. The 5 known-stale values were fixed directly instead (see "Direct production database update," below), not through this field, per Owner instruction.
- **Production content-correction maintenance script (DEC-016)**: `scripts/fix-property-content.ts` + `src/lib/property-content-fixes.ts`, dry-run-by-default, `--execute`-gated, transactional, self-verifying, idempotent. Content objects for both seed scripts (`seed-property-seo.ts`, `seed-property-seo-mickey.ts`) were extracted into Prisma-free data modules (`prisma/property-content/{b34,mickey}-content.ts`) so this and future scripts can reuse them without risking an accidental write — see the incident below.

### Material changes — Code (PR #17, merged to `main` as `5e5e62810e63d5e0ae2c00215fc6a5abcb5da344`)
- **FAQ #2 direct booking links**: "How many guests can each unit accommodate?" now links each of the 5 property names directly to `/properties/<slug>#book` instead of only "Cozy 1-Bedroom" to the generic `/#properties`. Approved capacities, the "two separate houses" explanation, and the 24-combined-guest fact are unchanged.
- **FAQ #12 + #13 consolidated**: "What are the check-in and checkout times?" and "Are check-in times different for B34 and B38?" merged into one Owner-approved answer, removing the "see the next question" deferral. **FAQ count: 24 → 23** — the homepage's "See all N FAQs" derives from `faqs.length` (not hardcoded), so it updated automatically. The chatbot's `info-checkin` node had already consolidated this same content in an earlier round; no orphaned node/option/reference existed to remove.
- **Pre-existing bug found and fixed**, via a new regression test: the "Is the WiFi fast enough for remote work?" FAQ carried a dead `links` entry for "Spacious 2-Bedroom" — a phrase no longer present in its (already-corrected) answer text. `src/lib/__tests__/faqs.test.ts` (9 tests) now guards against any FAQ link pointing at nonexistent text, in addition to asserting the exact count and the specific content facts above.
- **`scripts/set-payment-methods.ts`**: the one-off maintenance script used for the direct production database update below — checked in for the audit trail, following the same pre-flight-assert/transaction/post-verify pattern as DEC-016's script.

### Incident during development, fully resolved (preserved for the record — do not remove)
Building the content-correction script, an early version imported the seed files' content objects directly. Both seed files called their own `main()` unconditionally at module scope, so the import also triggered their full seed-and-write routine as an unintended side effect, reaching production before the script's own dry-run safety checks ran. A read-only re-audit confirmed **zero content actually changed** — every field still held the old stale text; only `Property.updatedAt` moved for `cozy-1-bedroom` and `spacious-2-bedroom`, most likely because the accidental write raced the script's own `process.exit(1)` and never completed. Root-caused and fixed: content extracted into Prisma-free data modules, both seed scripts gained a `require.main === module` guard (DEC-016).

### Owner review caught 3 issues in the proposed correction before it ran (round 3.1)
Reviewing the full dry-run table directly: (1) Cozy 1BR's `seoDescription`/`heroSummary`/`pricingNotes.rate` source still said stale `₱2,000` — a prior session had deliberately corrected the *live DB* to `₱1,800`, but the seed source was never updated, so executing as originally proposed would have reverted that price; found via a systematic number-token diff across all 35 proposed changes, fixed, no other property affected. (2) Spacious 2BR's proposed content carried leftover "so the car is safe" / "(car is safe)" guarantee language, plus "secure" as a safety-implying modifier on "garage parking" in two B38 fields — removed; factual descriptors ("gated subdivision," "24-hour village security") kept. (3) B34's property-specific WiFi FAQ answers were missing the backup-internet fact B38's already had — added.

### DEC-012 connectivity investigated (preserved — remains an open follow-up, not resolved)
This session had direct TCP:3306 connectivity to the production database from outside Vercel — confirmed independent of Prisma (`nc -zv [redacted: DB host, stored in Vercel env] 3306` succeeds) and confirmed the target was genuinely production (a DB read matched the live public site on a field with no server-side normalization). This contradicts DEC-012's documented firewall behavior. Root cause is **unconfirmed** — recorded as an update to DEC-012, not a new blanket assumption. **Tracked as a standing security/operations follow-up in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md)** until understood; do not treat future sessions as having this access by default.

### Verification — pre-deploy
`npm run typecheck` clean throughout every round. `npm run test` — 394/394 passing at final merge (66 new tests this package: `hourly-fee`, `pricing-notes`, `property-content-fixes`, `faqs`, all fixture/synthetic data — none touch production content or the database). `npm run lint` clean on every touched file (the repo-wide `npm run lint`/CI "Lint" and "Build" checks fail for pre-existing, unrelated reasons — see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md) → Blocked; confirmed identical failure set on the already-merged-and-deployed PR #16, so not a regression from this work). `next build` clean throughout.

### Deployment
- PR [#16](https://github.com/cedcas/CedCasProperties/pull/16) merged to `main` (merge commit `9684ed0b1d803b8086a66e8a42a6350c3e8f2e95`). Vercel Production deployment confirmed via the GitHub deployments API per DEC-006 — deployment id `6309859383`, environment `Production`, sha matches the merge commit exactly, status `success`.
- PR [#17](https://github.com/cedcas/CedCasProperties/pull/17) merged to `main` (merge commit `5e5e62810e63d5e0ae2c00215fc6a5abcb5da344`). Deployment id `6310351609`, environment `Production`, sha matches exactly, status `success`.

### Production content correction — executed and independently verified (2026-09-07, before the PR #16 merge)
With explicit, staged Owner approval (a dry-run table reviewed in full, corrected per the 3 issues above, re-verified, then executed), `scripts/fix-property-content.ts --execute` committed one transaction updating all 5 properties — 35 field-level changes across `description`/`seoTitle`/`seoDescription`/`tagline`/`heroSummary`/`bestForSegments`/`amenityDetails`/`neighborhoodPlaces`/`propertyFaqs`/`imageAlts`. All 5 rows share one `updatedAt` (`2026-09-07T13:21:21.776Z`). Independent read-only verification (a separate script from the maintenance script's own self-check): 50/50 field values match the approved target byte-for-byte; zero remaining stale patterns; `pricingNotes` (both `paymentMethods` and `rate`, including Cozy 1BR's correct `₱1,800`) confirmed completely untouched by this write; exactly 5 property rows exist in the table. A second dry run immediately after reports 0 changes — idempotency confirmed.

### Direct production database update — Payment Methods, executed and independently verified (2026-09-07, before the PR #17 merge)
With explicit Owner authorization to bypass the (already-deployed) admin UI for this one-time fix, `scripts/set-payment-methods.ts` ran a pre-flight-checked, transactional update against production. Pre-flight (would have aborted on any mismatch): confirmed database name `[redacted: production DB name]`; confirmed exactly 5 `Property` records; confirmed every current `pricingNotes.paymentMethods` contained the expected stale `"Stripe / credit card"` text. Write: one `prisma.$transaction` set all 5 records' `paymentMethods` to `"GCash, BPI InstaPay (no fees), Credit/Debit Card (6% processing fee applies)"` via `mergePricingNotesPaymentMethods()` — the same function the admin UI's own `PUT /api/admin/properties/[id]` route uses, so this write and the admin field can never conflict. Post-write: all 5 verified `MATCH` on the new value; every sibling `pricingNotes` key (`rate`, `weeklyDiscount`, `monthlyDiscount`, `deposit`, `cancellation`) verified `PRESERVED` on all 5; idempotency check confirmed 0 of 5 would need further change; all 5 rows share `updatedAt: 2026-09-07T14:01:13.185Z`.

### Verification — post-deploy, live against `haveninlipa.com` (final pass, after both PRs deployed)
Re-fetched the live production site directly and confirmed: `/faq` — **23** `FAQPage` JSON-LD questions (matches the visible page exactly), zero Maculot/Stripe/SMS/"car is safe"/"secure parking," all Owner corrections present verbatim, all 5 new `#book` links present and pointing at the correct property, the consolidated check-in/checkout answer states both times with no "next question" text, homepage renders "See all 23 FAQs." `/about`, `/staycation`, `/properties`, homepage `DiscoverLipa` badge — Manila travel time consistently "about one hour"/"roughly an hour," zero Stripe, "Credit/Debit Card" present. `/privacy` — Stripe still correctly named (unchanged by design). All 5 property pages — **zero "Stripe / credit card" anywhere** (confirmed fixed by the direct database update above), the approved payment text renders correctly, zero Maculot, zero stale Mbps, zero parking-safety-guarantee language, correct `up to 340/520 Mbps` + backup-internet wording, correct SUV/Vios garage facts, Cozy 1BR's `pricingNotes.rate` still `₱1,800 per night`.

### Explicitly not done (tracked separately, not this entry)
- The hourly-fee workflow was **not** tested end-to-end — 0 of 8 real production bookings have an Owner/developer-controlled guest email, so none was safe to send a real charge-notification email to. Needs a designated or freshly-created test booking. See [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).
- Manual browser verification of `/faq` (visual readability, horizontal scroll, keyboard focus-visible, chatbot FAB obstruction on mobile, console errors) — no browser tool available this session; verified structurally (HTTP/JSON-LD) only.
- The pre-existing GitHub Actions "Build"/"Lint" CI failures (unrelated to this work — see Verification, above) were not fixed; noted as a separate, non-blocking cleanup item.

---

## 2026-09-06 → 2026-09-07 — Remaining approved FAQ audit recommendations implemented (SEO-DEC-013 through SEO-DEC-017)

Area: Website/Application | Cross-Workstream (SEO handoff)
Status: **Complete.** Merged to `main` and independently verified live against `haveninlipa.com` (not inferred from merge status alone, per DEC-006). SEO-DEC-018 (free-rebooking removal, previous entry below) was completed and verified live separately — do not conflate the two. This entry covers the *other* five approved items from the same 2026-09-06 FAQ audit (`090626/FAQ_Audit_and_Recommendations.md`). **With this, the entire 2026-09-06 FAQ audit is closed — every approved recommendation (SEO-DEC-013 through SEO-DEC-018) is implemented and verified live.**

### Outcome
Ran a full gap analysis of all 24 items in the approved FAQ audit against the live site (code + production, via the public `/api/properties.json` feed and direct fetches of `/faq` and `/terms` — not code inspection alone, per DEC-006). Implemented every Group A item (exact wording or figures already approved by a durable SEO-DEC or the audit's Section 5): B38/"Mickey in Lipa" coverage added to the public FAQ for the first time, the B34 (2:00 PM) vs. B38 (3:00 PM) check-in split and the new ₱200/hour early-check-in/late-checkout policy, the Cozy 1-Bedroom capacity correction (4 → 5), "Stripe" removed from all guest-facing copy touched by this change in favor of "Credit/Debit Card," and the FAQ restructured content-wise into the audit's 7 categories (order only — no accordion/H2 redesign, since that was explicitly flagged as optional/non-blocking in the audit).

### Material Changes — Code (`dev` branch)
- `src/lib/faqs.ts` — full content replacement: 14 items → 24 items per the audit's Section 5 approved wording (adapted from the audit's markdown/bullet formatting to the plain-prose format `FaqAnswer`/`FAQPage` JSON-LD actually render, with no factual change). Adds full B34/B38 comparison, group-size guidance, both-houses-for-events answer, B34/B38 check-in split + fee, per-house parking/WiFi detail, parties/visitors policy. Removes "Stripe" naming (2 mentions) and the stale "1BR sleeps up to 4" (now 5, matching the live `maxGuests` value confirmed via the production properties feed).
- `src/lib/chat/chat-tree.ts` — `booking-how` and `booking-payment` nodes no longer name "Stripe" (SEO-DEC-015). `info-checkin` node rewritten from a blanket "check-in is at 2:00 PM" to the B34/B38 split plus the ₱200/hour early/late policy (SEO-DEC-013), matching the FAQ.
- `src/app/terms/page.tsx` — §2 and §3 (Booking & Confirmation, Payment Terms) no longer name "Stripe," matching guest-facing terminology elsewhere. §5 (Check-in & Check-out) corrected from a blanket "2:00 PM onwards" (confirmed stale — conflicted with both properties' own `housePolicies.checkInTime` records) to the B34 2:00 PM / B38 3:00 PM split, and now states the ₱200/hour early/late fee and its conditions (subject to availability, cleaning schedule, adjacent reservations, advance approval) — this fee did not appear anywhere on the live site before this change. "Last updated" date bumped.
- `src/app/faq/page.tsx` — meta description extended to mention the two-property comparison, per the audit's Section 8 recommendation now that B38 content exists.

### Explicitly not done (by design, matching audit scope)
- No accordion conversion or H2 category headers on `/faq` — audit Section 8 called both "open implementation choices... not blocking," and the task scope was content accuracy, not a redesign. `faqs.ts` item order follows the audit's 7 categories so a future accordion pass has no reordering to do.
- The ₱200/hour fee was **not** wired into the `AdditionalCharge` admin flow — the audit only says the Web Work Stream "should consider" this; it's a new architectural/business-process decision, not a content correction, and is left as a follow-up.
- `src/app/api/bookings/route.ts` was **not** touched — it has two "Stripe" mentions, but one is in an admin-only internal notification email (SEO-DEC-015 permits "Stripe" in admin-only screens) and the other (`pmLabel`) is only reachable in a non-Stripe-payment code branch, so it never actually renders "Stripe" to a guest today. Editing payment-flow code for a label that's effectively dead in the guest-facing path was judged higher risk than benefit.
- `src/app/privacy/page.tsx`, `src/app/about/page.tsx`, `src/app/staycation/page.tsx`, `src/app/properties/page.tsx`, `src/app/properties/[slug]/page.tsx`, and `src/app/weddings-accommodation/page.tsx` all still name "Stripe" in guest-facing copy. These pages were outside the FAQ audit's inspected-sources list and outside its concrete Web Work Stream dependency (which named only `src/lib/faqs.ts`); SEO-DEC-015's own Implications note this should be "applied consistently when it eventually updates" those pages, not as an immediate mandate. Flagged as a follow-up, not fixed here — see Remaining risks.
- The chatbot's `lipa` node ("about 1.5 hours from Metro Manila") was **not** corrected to match the "about 1 hour" figure everywhere else — the audit explicitly flags this as "outside this deliverable's scope... doesn't block anything in this document." Left alone per "do not modify unrelated content."

### Verification — pre-deploy
`npm run typecheck` clean. `npm run test` — 318/318 passing (no test references FAQ/chatbot content). `npm run lint` — pre-existing unrelated errors/warnings only (`GuestMessageThreads.tsx`, `ChatWidget.tsx`, `useQrIntegrity.ts`, `BookingForm.tsx` warnings), none in the 4 edited files. `npx prisma generate && npx next build` — production build succeeds, `/faq` and `/terms` both build as static pages. A standalone script confirmed no duplicate chatbot node IDs, no broken chatbot option targets, all 24 FAQ `links` phrases exist verbatim in their answer text, and no stray markdown leaked into any answer. Dev-server curl checks against `/faq` and `/terms` confirmed: 24 `Question` entries in the `FAQPage` JSON-LD, zero "Stripe" occurrences on either page, zero stale "sleeps up to 4," and the B34/B38 check-in split rendering correctly on `/terms`. No headless-browser tooling was available in this environment to click through the chatbot UI directly — chatbot verification relied on the structural/content checks above plus a clean production build, not a live click-through.

### Deployment
PR [#15](https://github.com/cedcas/CedCasProperties/pull/15) merged to `main` by the Owner (merge commit `cc3e83d`). Vercel Production deployment confirmed via the GitHub deployments API per DEC-006 — deployment id `6300670822`, environment `Production`, sha `cc3e83d` (matches the merge commit exactly), status `success` ("Deployment has completed").

### Verification — post-deploy, live against `haveninlipa.com`
Re-fetched the live production site directly (not the dev server, not the DB) and confirmed:
- `/faq` — 24 `Question` entries in the `FAQPage` JSON-LD (matches source exactly); zero "Stripe" occurrences; zero stale "sleeps up to 4"; "Mickey in Lipa" content present (53 hits); "sleeps up to 5" present; the B34 (2:00 PM)/B38 (3:00 PM) check-in split renders correctly; the ₱200/hour fee wording present; all recommended internal links (`/#properties`, `/#contact`, `/about`, `/properties/spacious-2-bedroom`, `/staycation`, `/terms`, `/weddings-accommodation`) resolve to real hrefs in the rendered page.
- Homepage FAQ teaser — "See all 24 FAQs" renders correctly (confirms `faqs.length` is live, not cached from the old 14-item array); first 5 teaser items are the new Category 1 (Choosing a Property) questions.
- `/terms` — zero "Stripe" occurrences; §5 states "2:00 PM onwards for B34... 3:00 PM onwards for B38"; the ₱200/hour fee wording present (3 occurrences); "Credit/Debit Card" wording present (4 occurrences); "Last updated: September 6, 2026" reflects the edit.
- Chatbot (checked via the embedded chat-tree payload on the homepage, same method used for the SEO-DEC-018 verification) — zero "Stripe" occurrences; the `info-checkin` node's new "Check-in time depends on the house" / B34-2PM / B38-3PM / ₱200-per-hour content is present; the `booking-payment` node's "Credit / Debit Card" wording (no "(Stripe)" suffix) is present; the old blanket "Check-in is at 2:00 PM" string is gone.
- Live production `/api/properties.json` — `cozy-1-bedroom` confirms `maxGuests: 5` (matches the FAQ's corrected figure); all other properties' capacities unchanged (9, 7, 11, 15).
- No stray template/serialization artifacts in the rendered FAQ content — the handful of `$undefined` matches found are Next.js's own React Server Component flight-protocol markers, unrelated to page content.

### References
SEO-DEC-013, SEO-DEC-014, SEO-DEC-015, SEO-DEC-016, SEO-DEC-017 — `content for HavenInLipa/SEO_DECISIONS.md`. Audit: `content for HavenInLipa/090626/FAQ_Audit_and_Recommendations.md`. `1fe3d76` (dev), `cc3e83d` (main, merge commit) — PR [#15](https://github.com/cedcas/CedCasProperties/pull/15), merged.

---

## 2026-09-06 → 2026-09-07 — Free-rebooking offer removed from public FAQ, chatbot, and property house rules (SEO-DEC-018)

Area: Website/Application | Cross-Workstream (SEO handoff)
Status: **Complete.** Database fix and code fix both live on production, both independently verified against `haveninlipa.com` post-deploy.

### Outcome
Per SEO-DEC-018 (approved 2026-09-06) and the Owner's Option A approval (remove only, no replacement wording), the "free rebooking within 14 days" offer is removed from every guest-facing surface that stated it as a public policy: the public FAQ, the chatbot, and — a finding surfaced mid-implementation — the property House Rules text guests must agree to before booking. The approved 100%/50%/0% cancellation/refund tiers are unchanged everywhere.

### Material Changes — Code (`dev` branch, commit `f34fed1`, PR [#14](https://github.com/cedcas/CedCasProperties/pull/14))
- `src/lib/faqs.ts` — cancellation-policy FAQ answer: deleted the trailing sentence "We also offer one free rebooking when requested at least 14 days before your original check-in date." Refund-tier wording (100%/50%/0%) untouched.
- `src/lib/chat/chat-tree.ts` — `booking-cancel` node: deleted the bullet "**Free rebooking** if requested at least 14 days before your original check-in date." No replacement wording added.

### Material Changes — Production database (executed directly, Owner-approved after a read-only audit)
A read-only audit found `Property.propertyRules` (free text, admin-authored via `/admin/properties/[id]`, not seeded from any tracked file) carried a formal "Rebooking policy" clause — *"One-time rebooking free if 14+ days before original check-in date. For 7-13 days before the original check-in date, 50% penalty per night. No rebooking <7 days."* — on **2 of 5 properties**: `cozy-1-bedroom` (id 1) and `spacious-2-bedroom` (id 2). The three Mickey/B38 configs (ids 3–5) never had this clause in their own field — an earlier same-day note overstated this as "all 5," corrected here after querying every record directly. The clause was rendered on those 2 properties' page House Rules section, their booking-form guest-agreement text, and — because the site-wide chatbot payload embeds all properties' rules on every route via the root layout — was technically present (though not visibly rendered) in every page's HTML/JS payload site-wide.

Owner approved Option A (delete the clause, add nothing back) on 2026-09-06. Executed as a single-field Prisma update (`Property.propertyRules` only) wrapped in a transaction covering exactly ids 1 and 2 — the same write path the admin API itself uses. Before writing: captured current values for both rows, computed the new value programmatically (regex-isolated the clause, verified the removed segment matched the known offer text, verified the new value was a byte-exact prefix of the old value so items 1–10 could not have changed, verified no rebooking/reschedule/date-change wording remained). After writing: re-queried both rows and confirmed all of the above held against the actual stored values, not just the intended ones. No other property, field, or table touched.

### Verification — pre-deploy
`npm run typecheck` clean; `npm run test` — 318/318 passing (no test references this content); `npm run lint` — pre-existing unrelated warnings/errors only, none in the two edited files; `npx prisma generate && npx next build` — production build succeeds. Database: pre-write and post-write assertions both passed programmatically — items 1–10 confirmed byte-identical before/after for both rows, item 11 confirmed absent after, no forbidden wording (rebook/reschedule/14+ days/7-13 days/no rebooking/date-change) found in either row post-write.

### Deployment
PR #14 merged to `main` by the Owner 2026-09-07 (merge commit `3e26d4a`). Vercel Production deployment confirmed via the GitHub deployments API per DEC-006 (deployment id `6300438233`, environment `Production`, status `success`, sha `3e26d4a`) — merge-to-`main` was independently verified as actually live, not assumed from merge status alone.

### Verification — post-deploy, live against `haveninlipa.com`
Re-fetched and grepped the live production site directly (not the DB, not local dev) for the exact offer phrasing (`rebooking policy`, `14+ days before`, `7-13 days before`, `no rebooking`, `free rebooking`, `one-time rebooking`) — **zero matches anywhere on the site.** Specifically confirmed clean:
- `/faq` — cancellation-policy answer and its `FAQPage` JSON-LD both read as the 100%/50%/0% tiers only.
- `/properties/cozy-1-bedroom` and `/properties/spacious-2-bedroom` — House Rules section renders items 1–10 and ends cleanly at item 10 (no orphaned numbering).
- Both properties' inline booking-card agreement and their dedicated `/book` page agreement — same clean text.
- Chatbot `booking-cancel` node (checked via the embedded payload on the home page) — reads "7+ days before check-in — Partial refund available" straight into "Late cancellations may not be eligible for a refund," no rebooking bullet, no formatting artifact.
- Chatbot House Rules payload for all 5 properties (all 3 Mickey configs plus both B34 units) — clean.
- `/terms`, `/privacy`, `/ambassadors` (the ISR-cached pages sharing the site-wide chat payload) — clean; by the time of this check the post-deploy rebuild had already superseded the old ISR cache, so no residual lag was observed.

A broader keyword sweep for bare "rebook" (not the policy phrasing) turned up 3 live hits, all confirmed unrelated to SEO-DEC-018 and correctly left alone: two instances of pre-existing marketing copy about repeat guests ("...they just rebook for the next month," "This is the unit guests rebook") from `prisma/seed-property-seo.ts` hero copy, and one guest testimonial on Mickey Sleeps 7 ("...will definitely recommend and rebook!"). None describe a cancellation-alternative offer.

### References
`f34fed1` (dev), `3e26d4a` (main, merge commit) — PR [#14](https://github.com/cedcas/CedCasProperties/pull/14), merged.

---

## 2026-08-30 → 2026-09-02 — Guest-messaging reliability fixes

Area: Website/Application
Status: Complete

### Outcome
Two silent-failure bugs in Guest Messaging closed, both found via real reports rather than tests.

### Material Changes
- `POST /api/bookings` now materializes scheduled messages for Stripe bookings too — previously only the admin `pending → confirmed` transition did, so Stripe bookings (created already `confirmed`) got zero scheduled messages with no error anywhere.
- `GuestMessageThreads.tsx`'s fetch effect no longer swallows every rejection in a bare `.catch()` — real failures now show an error + "Try again" instead of an infinite "Loading threads…".

### Verification
Both merged to `main` and verified live on production (PR #11 merged 2026-08-31; thread-list fix merged as `5b1a422` 2026-09-02).

### References
`6f6f0f7`, `fde9b3d` (PR #11); `953d54c`, `5b1a422` (PR #13)

---

## 2026-08-26 → 2026-08-31 — `/staycation` landing page + Stay Match WordPress plugin

Area: SEO | Blog
Status: Complete (with one open follow-up — see Project Status)

### Outcome
Two SEO/Blog deliverables from the August audit shipped: a money page for cluster C1 (short-term rental cost intent), and a WordPress plugin that recommends a specific listing inline in blog posts instead of a static CTA.

### Material Changes
- `/staycation` live — rate table, capacity, check-in/checkout and the solar claim all DB-derived, not hardcoded (see DEC-007).
- In-repo repoint of blog article #6 to `/staycation` landed in the same commit (footer fallback, `/about`, property-page CTA) — see DEC-010 for why this had to happen before any redirect.
- Stay Match plugin (`hil-stay-match.php`) installed live on `blog.haveninlipa.com`; enrolled on post #27 (`"barkada of 9"` → confidence 1.0 → `spacious-2-bedroom`, verified). Posts #28/#29 deliberately left unenrolled (hub articles, not single-intent).
- `v1.0.1` patch fixed `stay_match_click` being lost to page-teardown-before-beacon-send on non-SPA navigation.

### Verification
`/staycation` verified 200 on production; zero references to article #6 remain in rendered output. Stay Match confidence scoring verified against the live feed. `stay_match_click` **still unconfirmed after the v1.0.1 patch** — open item, see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).

### References
`6fc4b60`, `dfeb239` (PR #12); Stay Match brief `081526/Stay_Match_Engine_ClaudeCode.md`

---

## 2026-08-15 → 2026-08-17 — SEO money pages: `/properties`, `/about` fix, `/contact` redirect, `/weddings-accommodation`

Area: SEO | Website
Status: Complete

### Outcome
Closed four SEO gaps from the August audit: two hard-404'd paths that looked like real URLs and were linked externally, a homepage claiming "two properties" three months after five went live, and a net-new money page for the wedding-party segment.

### Material Changes
- `/properties` inventory index — new route, Prisma-direct, `force-dynamic`, `ItemList` + `BreadcrumbList` schema.
- `/about` rewritten to render all 5 homes from the DB (was hardcoded to 2, including in the `Person` JSON-LD description).
- `/contact` → `/#contact` permanent (308) redirect.
- `/weddings-accommodation` — new route, `FAQPage`-only schema (DEC-008), capacity derived via `deriveHouses()` (DEC-001).
- `src/lib/listings.ts` extracted as the shared home for all of the above (`PUBLIC_LISTING_GATE`, `getPublicListings`, `deriveHouses`, etc.).
- Discovered and fixed: an App Router page cannot set its own `Cache-Control` on Vercel — caching moved from a `next.config.ts` header to `unstable_cache` on the query (DEC-005).
- Public property feed `GET /api/properties.json` shipped for the blog; robots.txt `/admin`/`/api` prefix bug fixed; review aggregates converted from hardcoded to DB-derived.
- Blog content audit: 7 dead internal slugs / 12 links / 6 articles fixed; stale hardcoded rates found in 21 of 24 posts.

### Verification
All four routes verified 200 on production; Rich Results Test clean; review aggregates verified live in JSON-LD on the three Mickey listings.

### References
`9a8e47c`, `b64ce9a`, `6a0da20`, `7fa3421`, `c2c5e6b`, `f66295e`, `2dc488b`, `f2535a8`, `95cc36e`

---

## 2026-08-06 → 2026-08-08 — Shared Inventory Groups go-live; GA4 conversion tracking

Area: Website/Application
Status: Complete (one operational follow-up still open — see Project Status)

### Outcome
Closed a live double-booking hole (booking one of two configurations of the same physical unit left siblings openly bookable, including on Airbnb) and, separately, closed the conversion-measurement loop past the click.

### Material Changes
- `InventoryGroup` / `InventoryGroupMember` / `AvailabilityBlock` / `ExternalCalendarEvent` / `ExternalCalendarSyncState` models added.
- `src/lib/availability.ts` centralizes all conflict logic (DEC-002); `src/lib/inventory-groups.ts` implements propagation as a pure planner + impure applier; echo suppression added after an infinite-loop incident on go-live day (DEC-003).
- `/admin/calendar` — month grid, 6-marker legend, manual block CRUD, sync health, "Sync now" button.
- GA4 events `booking_confirmed`, `generate_lead`, `book_click`, `check_availability`; itemized fee breakdown, sticky booking bar, occupancy notes on the property page.
- CSP `connect-src` fixed to allow all four GA4 collection hosts — GA4 had collected **nothing** before this fix.

### Verification
Validated end-to-end on production data: an Airbnb-side block cleared 8 Aug 2026 was correctly retracted with siblings reopened, no manual intervention. 210 vitest assertions (105 × 2 timezones) cover the planner, echo suppression, and date math — DB-backed testing is impossible (Hostinger blocks CI/laptop DB access, DEC-012).

### Still outstanding
Airbnb sibling cross-links not yet unlinked on any of the 5 listings — see [HIL_PROJECT_STATUS.md → Active Gate](HIL_PROJECT_STATUS.md#active-gate).

### References
`3c9d3fb` (merge), `5ed7c1f`, `4e5cf70` (merge, PR #8), `d1a98ef`, `d829b24`, `a22830d`, `0c0133e`

---

## 2026-07-01 → 2026-07-04 — Admin comments/mobile drawer; extra-guest-fee public surfacing

Area: Website/Application
Status: Complete

### Material Changes
- Editable internal comments on bookings/customers; mobile sidebar drawer for admin.
- Extra-guest-fee occupancy note surfaced on the property page and card (previously booking-flow-only); base rate and included-guest count normalized to live DB values at render (`normalizePricingProse`, DEC-007); Cozy 1BR's stored prose corrected to match its actual rate.

### References
`97bc3fc`, `b893f9c`, `2d9fa1f`, `9e62bb6`, `57ab099`

---

## 2026-06-24 → 2026-06-29 — Admin booking detail; Ambassador Program; Additional Charges

Area: Website/Application
Status: Complete

### Outcome
Three independent features landed in the same window: deeper admin booking tooling, a referral program, and a way to bill guests after booking without Airbnb's Resolution Center.

### Material Changes
- Admin booking detail view + Customers page.
- Ambassador Program — public `/ambassadors` page, application flow, admin review, tiered cash rewards per completed booking (payouts are entirely manual — nothing in code counts bookings per ambassador).
- Additional Charges (pay-by-link) — `AdditionalCharge` model, public `/pay/[token]` page (GCash/BPI/Stripe), admin manager UI, SMS-by-copy-paste (no Twilio).
- Multi-property "Applies To" scoping generalized across `QuickReply` and `DiscountCode` (`scopeAppliesToProperty` in `src/lib/promo.ts`).

### References
`5aad1a0`, `658ea07`, `8d5fed3`, `b190204`, `f689262` (PR #6)

---

## 2026-06-14 → 2026-06-18 — Extra-guest-fee system; 3 "Mickey in Lipa" listings launch

Area: Website/Application | SEO
Status: Complete

### Outcome
Pricing model gained a real extra-guest fee (mirroring Airbnb's), and the property count went from 2 to 5 with the launch of the Mickey house's three configurations.

### Material Changes
- `Property.includedGuests` / `extraGuestFeePerNight`; `calcExtraGuestFee()`; server-authoritative composition in `POST /api/bookings`; `maxGuests` hard cap enforced server-side.
- 3 Mickey listings created in admin + SEO content seeded (`prisma/seed-property-seo-mickey.ts`); VacationRental JSON-LD extended.
- Calendar-date rendering fixed to format as UTC calendar dates, not viewer-local instants (a booking could display shifted by a day for anyone west of UTC).

### References
`df91988`, `b89aa03`, `0b284fc`, `c44b5d0`

---

## 2026-06-02 → 2026-06-07 — Pricing "From" prefix; discount code scoping; international phone validation

Area: Website/Application
Status: Complete

### Material Changes
- `Property.pricePerNight` established as the weekday/base rate; every advertised nightly rate prefixed "From" wherever `isPricingComplete()` gates on a base + weekend rate both existing.
- `DiscountCode.propertyIds` — codes can scope to specific properties, not just global.
- Booking-form phone field internationalized (was PH-only) via `libphonenumber-js`, with a country-code select defaulting to PH; validated on blur/change/submit before "Continue to Payment."

### References
`2a38d08`, `360048d`, `95cd6f6`, `66897c0`, `7367cb8`, `1408071`

---

## 2026-05-26 → 2026-05-31 — Homepage performance & accessibility pass

Area: Website/Application | SEO
Status: Complete

### Outcome
Addressed a PageSpeed Insights audit — Mobile Perf had been in the 70s, driven by font/icon bandwidth contention with the Hero LCP element.

### Material Changes
- Hero's 7 above-the-fold icons moved from Font Awesome `<i>` glyphs to inline SVG (`HeroIcons.tsx`) — removed ~289 KB of woff2 competing with Montserrat during the LCP window.
- Font Awesome given a non-blocking `media="print"` + onload-swap load pattern.
- Montserrat set to `display: "swap"` (an `"optional"` attempt regressed LCP on Slow 4G and was reverted).
- `.reveal` scroll animation gating fixed to avoid mixed read/write DOM passes (~500ms forced reflow).
- Offer schema, FAQ internal links, area-level property map added (SEO).

### References
`3dbfe23`, `cb6e404`, `0663de1`, `d4be460`, `b022081`, `918c5e5`, `a65ef16`, `4b300b1`

---

## 2026-05-08 → 2026-05-21 — May 8 SEO audit implementation; blog dynamic footer

Area: SEO | Blog
Status: Complete

### Outcome
Implemented the first full external SEO audit (NetCoreSolutions, 2026-05-08): structured data, on-page content, and image alt text for the original two listings, plus a live blog-to-app integration.

### Material Changes
- VacationRental JSON-LD built to pass Google's Rich Results Test (`src/lib/property-schema.ts`); `additionalType` Catch-22 resolved using Google's own enum strings.
- Long-form SEO content seeded for `spacious-2-bedroom` / `cozy-1-bedroom` (`prisma/seed-property-seo.ts`); descriptive image alt text replacing "photo 1, photo 2".
- Blog footer's "Plan Your Trip" column pulls the latest 5 posts live from WordPress's REST API (Yoast focus-keyphrase labels via the custom `hil-expose-focuskw` plugin), replacing a static list.
- Admin Guest Messages / Contact pagination.

### References
`338d0f2`, `54da1a8`, `98444ec`, `02f6bf5`, `2c8dd6a`, `e229de7`

---

## 2026-05-02 → 2026-05-07 — Guest Messaging Phase 2: SMS attempted, email-only 2-way shipped

Area: Website/Application
Status: Complete (SMS path dormant, not removed)

### Outcome
Built full 2-way SMS via Twilio, then discovered PH carrier routing (Globe/Smart/DITO) structurally rejects US-long-code Twilio traffic both directions. Rather than pay for a PH-local Twilio number ($120/mo + 1–3 weeks NTC paperwork) for uncertain value, shipped 2-way **email** reply threading instead — the code for SMS stays in the repo, dormant, for future revival.

### Material Changes
- SMS driver (`src/lib/sms.ts`), inbound webhook, quiet-hours deferral, opt-out handling — all built, left dormant (env vars unset in production).
- Email-only 2-way: IMAP poller (`src/lib/imap.ts`) + threading router (`src/lib/emailReply.ts`) — In-Reply-To/References match → From-email fallback → ContactMessage. `ContactMessage → GuestMessage` promotion on booking creation.
- Every-15-min GitHub Actions poll cron.

### Verification
Manual test-plan workbooks (`HavenInLipa_GuestMessaging_*_Test_Plan_v1.2.xlsx`) cover both directions.

### References
`7ebf107`, `fc63197`, `06e6eba`, provider-switch documented inline in Website spec

---

## 2026-04-25 — Guest Messaging Phase 1 (outbound email)

Area: Website/Application
Status: Complete

### Outcome
First version of Airbnb-style guest messaging: template-driven, one-way (admin → guest), tied to confirmed bookings.

### Material Changes
- `QuickReply` (manual/auto templates, anchor + offset scheduling) and `ScheduledMessage` models.
- Materialization on booking confirmation; hourly cron flush (`/api/cron/send-scheduled-messages`) — replaced the prior daily check-in-reminder cron.
- Admin thread UI with hybrid composer (template picker or free-text).

### References
`ab329f9`, `ad8c7cd`

---

## 2026-04-01 → 2026-04-13 — Payment/pricing Phase 1; admin hardening; SEO foundation; analytics

Area: Website/Application | SEO
Status: Complete

### Outcome
The first major post-launch feature wave: a third payment method, admin RBAC, the SEO technical foundation, and initial analytics/chatbot.

### Material Changes
- **Stripe** as a 3rd payment method (auto-confirms bookings), **Discount Codes**, **Daily Rate Flexibility** (weekday/weekend/date overrides) — the Phase 1 roadmap items.
- Admin: collapsible sidebar, multi-domain auth, user management with Admin/Manager roles + granular `AdminPermission`, audit event log.
- Migrated transactional email from Resend to Hostinger SMTP (Resend was domain-locked to the old `cedcasproperties.com`).
- SEO Technical Foundation Pack (NET-93) + homepage/property SEO copy (NET-97).
- Google Analytics tag added; QR code SRI integrity protection; Haven chatbot Phase 0 (rule-based); Messenger handoff.

### References
`c59e190` (Phase 1), `5066dce`, `6a8bfba`, `650e3c0`, `4374247`, `57cbaaa`, `41aaab6`, `03db795`, `3d230a8`

---

## 2026-03-31 — HavenInLipa rebrand

Area: Website/Application | SEO
Status: Complete

### Outcome
Full rebrand from "CedCas Properties" / `cedcasproperties.com` to "Haven in Lipa" / `haveninlipa.com` — new palette, logo, copy, and every domain reference.

### References
`d014411`, `ed2e884`, `e322649`, `983ce5d`, `c058779`

---

## 2026-03-08 → 2026-03-12 — Initial platform build & launch prep

Area: Website/Application
Status: Complete

### Outcome
The original build: Next.js + Prisma + MySQL rental platform with an admin panel, booking flow, Airbnb iCal sync, and QR-based manual-verification payments — as CedCas Properties, before the HavenInLipa rebrand.

### Material Changes
- Migrated to Next.js 15 + Prisma 5 + MySQL; admin panel with NextAuth.
- Property image gallery, public details page, full booking flow with date pickers and QR payment (GCash/BPI, later simplified to one generic QR per method).
- Airbnb iCal export + import sync.
- Per-property testimonials (moved from site-wide); Discover Lipa City homepage section; booking/contact acknowledgment emails.

### References
`26bb243`, `25a6d51`, `2f9c151`, `152d745`, `1e5ff4d`, `f7590e0`

---

*Entries before 2026-03-08 (the "Create Next App" scaffold) are not separately logged — see `git log` for the full record if needed.*

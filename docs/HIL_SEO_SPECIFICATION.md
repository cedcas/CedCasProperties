# Haven in Lipa — SEO Specification

> **Last updated:** 2026-09-17 (created — SEO/content governance consolidation, see
> [DEC-018](../About%20HIL/HIL_DECISIONS.md) and [content/seo/README.md](../content/seo/README.md))
>
> **This is a focused governance document** — it separates verified facts from decisions,
> plans, assumptions, and open questions, and states approval gates explicitly. It is
> **not** a duplicate of [HIL SEO Technical Specification.md](../About%20HIL/HIL%20SEO%20Technical%20Specification.md)
> (the "how the implementation works" spec, in `About HIL/`) — read both; they answer
> different questions. Current whole-product status is
> [HIL_PROJECT_STATUS.md](../About%20HIL/HIL_PROJECT_STATUS.md); durable decisions
> (`DEC-###` and the migrated `SEO-DEC-###` series) are in
> [HIL_DECISIONS.md](../About%20HIL/HIL_DECISIONS.md).
>
> **⚠️ This document's creation does not authorize new SEO implementation, publishing,
> Yoast changes, cache purges, or production changes of any kind.** It records the state
> as of the 2026-09-17 consolidation and reconciles it against source documents — it does
> not close, resolve, or reinterpret any open gate.

---

## 1. Property ownership and boundaries

### Verified facts
- **`haveninlipa.com`** — the live production HIL website. Next.js 16 / React 19 app, this
  repository (`github.com/cedcas/CedCasProperties`), Vercel-hosted, MySQL on Hostinger.
  Owns booking, payments, admin, and all SEO/structured-data implementation for the
  rental app itself (sitemap, canonicals, JSON-LD — see
  [HIL SEO Technical Specification.md](../About%20HIL/HIL%20SEO%20Technical%20Specification.md)).
- **`blog.haveninlipa.com`** — WordPress 7.0.4, Yoast SEO (free, mid-cutover — see §3),
  LiteSpeed Cache, Site Kit by Google, EWWW Image Optimizer, YARPP, Redirection,
  Hostinger-hosted. WordPress core/uploads/DB are **not** in this repository; only custom
  plugin *source* is (`blog/plugin/hil-expose-focuskw.php`, `hil-stay-match.php`, and the
  `hil-seo` cutover plugin's `.zip` build artifacts, tracked in `content/seo/runs/`) —
  `blog/` itself is gitignored (deployed separately, per `.gitignore`). The two sites
  integrate **only through public REST APIs** (`GET /api/properties.json` on the main
  site; WordPress's own REST API for content operations) — [DEC-011](../About%20HIL/HIL_DECISIONS.md).
- **`haven-in-lipa.pinasbnb.pro`** — a PinasBNB comparison/pilot application. **Not found
  anywhere in HIL's own pre-existing documentation** (`About HIL/`, `HIL_DECISIONS.md`,
  the technical specs) as of this migration — its existence and relationship to HIL is
  asserted by the 2026-09-17 consolidation mandate, not by HIL's own historical record.

### Assumptions (flagged — not independently verified from this repo)
- That `haven-in-lipa.pinasbnb.pro` is a PinasBNB-owned comparison/pilot property, and
  that HIL is described as PinasBNB's "customer-zero/living-demo" property. **Owner should
  confirm and, if accurate, this should get its own `DEC-###` entry** — right now it exists
  only in this migration's mandate, not as a documented product decision.

### Durable decision (this migration)
- **Domain/booking/comparison boundaries are preserved exactly as they were before this
  consolidation.** No DNS change, no merge of HIL into PinasBNB, no alteration to the
  booking system. HIL is not to be presented as an independent external customer of
  PinasBNB if the relationship above is confirmed — see `DEC-018`.

### Open questions
- What specifically is compared on `haven-in-lipa.pinasbnb.pro`, who maintains it, and
  what (if anything) it reads from `haveninlipa.com`'s public APIs — unknown from this
  repo; ask the Owner or locate that project's own documentation before any HIL work
  assumes an integration exists.

---

## 2. URL and permalink preservation

### Verified facts
- Main-site routes are enumerated in `src/app/sitemap.ts` and are stable; recent additions
  (`/properties`, `/staycation`, `/weddings-accommodation`) followed the
  build → repoint → redirect sequencing rule ([DEC-010](../About%20HIL/HIL_DECISIONS.md)).
- Blog permalinks have **not** always been stable historically — the 2026-08-15 blog
  content audit found 7 dead slugs across 6 articles from prior unlogged renames (full
  slug map in [HIL Blog Technical Specification.md](../About%20HIL/HIL%20Blog%20Technical%20Specification.md)
  → Blog content audit). The Redirection plugin is now installed specifically to prevent
  recurrence.

### Planned / in progress
- Article #6 → `/staycation` consolidation ([SEO-DEC-007](../About%20HIL/HIL_DECISIONS.md)):
  build and in-repo repoint done; WordPress-side repoint of the remaining linking posts and
  the 301 redirect itself are **still open** as of the last recorded status — see
  [HIL_PROJECT_STATUS.md](../About%20HIL/HIL_PROJECT_STATUS.md) Active Gate/In Progress.
  This migration does not advance or close that item.

### Deferred / not authorized by this migration
- Any further permalink change on either site.

---

## 3. Yoast ownership and closeout sequence

### Verified facts (as recorded in the migrated `SEO-DEC-019`–`SEO-DEC-025`, `content/seo/archive/SEO_DECISIONS.md`)
- A custom `hil-seo` WordPress plugin is replacing Yoast, built and owned end-to-end by
  the SEO Analyst directly (no Web Work Stream handoff — `SEO-DEC-024`).
- As of the last recorded status (2026-09-07): all 6 output modules (meta, title,
  canonical, robots, schema, sitemap) are live via an Administrator-only cutover screen;
  the 34-post metadata backfill and 18-post author reassignment are complete and verified;
  a robots.txt defect (stale `Sitemap:` line) was found and fixed same-day, packaged as
  `v1.1.1` (`content/seo/runs/090726/hil-seo-plugin.zip`), **pending Cedric's manual
  re-upload** — not yet confirmed applied as of this migration.
- **Yoast remains active throughout the entire cutover** — nothing above deactivates it.

### Approved sequence (durable, per `SEO-DEC-020`, `SEO-DEC-025`, and the project mandate)
1. Upload `hil-seo` `v1.1.1`.
2. Verify `robots.txt`'s `Sitemap:` line (cache-busted) reads `/wp-sitemap.xml`, no duplicate.
3. Confirm the 301 from the retired Yoast sitemap URL (`/sitemap_index.xml`) in Redirection.
4. GSC resubmission.
5. Full cache-busted verification pass across all posts.
6. LiteSpeed cache purge.
7. Yoast deactivation — **last step, not yet reached**.

### Deferred / not authorized by this migration
- Steps 1–7 above. **This migration does not perform, advance, or verify any of them.**
  Do not treat "the plugin is packaged" as "the fix is live," and do not deactivate Yoast
  without independently confirming steps 1–6 first.

### Owner actions required
- Re-upload `v1.1.1`, then execute the on-screen instructions in **WP Admin → HIL SEO**
  for the remaining steps.

---

## 4. Custom SEO workflow and analyst/owner permissions

### Verified facts
- SEO Analyst WordPress role: **Editor**, not Administrator (`SEO-DEC-019`) — cannot
  install plugins, change settings, or flip the `hil-seo` cutover flags, which are
  Administrator-gated by design (`SEO-DEC-025`).
- Direct WordPress content editing is permitted under a firm rule (`SEO-DEC-010`,
  `SEO-DEC-009`): **modifying** an existing published post is allowed via REST API using a
  dedicated Editor Application Password; **creating** a new post is **always** saved as a
  draft — `WP_ALLOW_PUBLISH=false` is enforced in config. Analysts never publish; the Owner
  adds images, removes placeholders, reviews, schedules, and publishes.
- The Analyst (Claude, in the SEO Analyst role) never edits, deploys to, or otherwise
  touches either codebase directly through a repository (`SEO-DEC-009`) — the one
  exception is the content-operations REST API access above, which is not codebase access.

### Durable decision (this migration)
- The above permission model is **unchanged** by this consolidation. Analysts still never
  publish; `WP_ALLOW_PUBLISH=false` remains enforced and documented.

---

## 5. Titles and meta descriptions

### Verified facts
- **Main site:** seeded `seoTitle`/`seoDescription` per property, rewritten at render time
  by `normalizePricingProse()` inside `generateMetadata` so the rendered `<meta>` always
  reflects live pricing — seeded text and rendered output can legitimately differ; diff
  against View Source, not the DB row (see
  [HIL SEO Technical Specification.md](../About%20HIL/HIL%20SEO%20Technical%20Specification.md)).
- **Blog:** title/meta description now render from the `hil-seo` plugin's meta module
  once turned on (§3), not from Yoast, for all 34 backfilled posts. Meta description
  matched Yoast exactly pre-cutover for 17/34 posts; the other 14 differ only by the
  plugin's proven length-trim behavior (not a defect) — `SEO-DEC-019`–`SEO-DEC-025` region.
- Three meta descriptions had an unsupported "1 hour from Manila" claim removed and
  replaced with approved non-numeric wording (`SEO-DEC-023`).

---

## 6. Canonicals

### Verified facts
- Root layout default: `metadata.alternates.canonical = "/"`. Explicit absolute canonicals
  (via `metadataBase`) on `/privacy`, `/terms`, `/faq`, `/about`, `/properties`, and each
  property page.
- **Known gotcha:** page-level metadata does not cascade to nested route segments without
  an intervening `layout.tsx` — bit the `/book` segment previously (fixed 2026-07-04,
  self-canonical + `noindex,follow`). Watch for this on any future nested route.
- Blog canonicals now render from `hil-seo`'s canonical module once on; parity-verified
  exact match against Yoast for all 34 posts pre-cutover.

---

## 7. Robots and sitemap behavior

### Verified facts
- Main site `robots.ts` disallows `/admin` and `/api` (prefix form, fixed 2026-08-15 —
  previously trailing-slash forms left the bare `/admin` path crawlable).
- Main site sitemap (`src/app/sitemap.ts`) covers homepage, `/properties`, `/staycation`,
  active properties, `/weddings-accommodation`, `/faq`, `/about`, `/privacy`, `/terms`.
  Blog articles live on the blog's own sitemap, not this one.
- Blog: `hil-seo`'s sitemap module uses **WordPress core's own sitemap**
  (`/wp-sitemap.xml`), not a plugin-generated one — Yoast's sitemap is retired with a
  redirect once cutover completes (`SEO-DEC-020`). The sitemap module's noindex-exclusion
  filters are active on core's sitemap as of the last recorded status.
- Thin auto-generated archive pages (tag/author/category with no unique content) get
  `noindex, follow` (`SEO-DEC-008`) — re-verified live on all 7 flagged/flagged-again
  archives as of 2026-09-07 per `SEO_PROJECT_STATUS.md`; the remaining open item is GSC
  catching up, not a live regression, as of that status snapshot.

### Open items (not closed by this migration)
- Robots.txt's `Sitemap:` line still needs post-`v1.1.1` verification (§3).
- 5 newly-discovered category archives pending a noindex decision as of the last recorded
  status — see archived `SEO_PROJECT_STATUS.md`.

---

## 8. Redirects and redirect verification

### Verified facts
- Redirection plugin is installed on the blog (superseding the 2026-08-15 finding that it
  was absent) and is the mechanism used for the pending `/sitemap_index.xml` → `/wp-sitemap.xml`
  redirect and the pending article #6 301.
- Main-site redirects follow build → repoint → redirect sequencing (`DEC-010`) —
  `/contact` → `/#contact` is a shipped example.

### Deferred / not authorized by this migration
- Adding, changing, or verifying any redirect. The article #6 301 and the Yoast-sitemap
  redirect remain **open, Owner/Analyst-executed** items (§2, §3).

---

## 9. Schema ownership

### Verified facts
- Main-site JSON-LD is owned entirely by `src/lib/property-schema.ts` and the per-page
  builders documented in
  [HIL SEO Technical Specification.md](../About%20HIL/HIL%20SEO%20Technical%20Specification.md)
  — `VacationRental`/`FAQPage`/`LocalBusiness`/`ItemList`/`Person`, deliberately no
  `Offer`/`EventVenue`/`Event` (see [DEC-008](../About%20HIL/HIL_DECISIONS.md),
  [DEC-009](../About%20HIL/HIL_DECISIONS.md)).
- `/weddings-accommodation` and `/staycation` carry `FAQPage` schema only, by durable
  decision (`DEC-008`) — no venue-implying schema, matching the page's positioning as
  accommodation for a wedding party, not a venue (`SEO-DEC-003`).
- VacationRental rich results are EAP-gated and will not render regardless of markup
  quality (`DEC-009`) — investment here targets GSC hygiene, not a rich card.
- Blog schema now renders from `hil-seo`'s schema module once on; not independently
  detailed beyond the parity-check summary in §5.

### Durable decision (this migration)
- Schema ownership boundaries above are **unchanged**. `content/seo/schema/` (new, empty
  at migration) is for evidence/proposals only — it must never become a competing
  implementation to `property-schema.ts` or the `hil-seo` plugin.

---

## 10. Headings and internal links

### Verified facts
- Blog internal-linking conventions are documented in `About HIL/Internal Linking Guide.md`
  (unchanged by this migration, already resident in this repository).
- Anchor-text naming drift exists on 36 repointed `/staycation` links ("vs. Airbnb"
  phrasing vs. current page copy) — flagged, low priority, not fixed as of the last
  recorded status.
- Cross-surface link auditing gap: the `mt-maculot` dead-slug case was only caught because
  it was referenced from the *main app's* `bestForSegments` copy, not from any blog
  article — a purely blog-side audit would have missed it. Any future link audit should
  check both surfaces.

---

## 11. Image alt text and placeholder handling

### Verified facts
- Main site: `PropertyGallery` accepts optional `imageAlts[]`, falling back to a
  descriptive pattern (`"{name} vacation rental in {location}, Batangas — image {i+1}"`)
  when not seeded.
- Migrated `content/seo/drafts/Featured Images/` holds pending featured images for
  draft/queued blog articles — **not yet placed** in any WordPress post as of migration.
  Placeholder removal and final image placement remain Owner actions per this project's
  standing rule (analysts draft, Owner adds images and publishes).

---

## 12. Booking-intent SEO

### Verified facts
- Strategy pivot from discovery-volume content to high-intent money pages
  (`SEO-DEC-005`), operationalized as a standing "where to eat → where to stay" content
  lens (`SEO-DEC-011`).
- Keyword-to-URL mapping rule for transactional/Mickey-adjacent terms: configuration-rental
  queries map to the relevant booking/property page; branded/franchise-adjacent terms map
  to the launch content hub, not a property page directly (`SEO-DEC-012`).
- Content freeze on new articles (#30+) takes effect 2026-09-15 (`SEO-DEC-006`) —
  measurement window, not a new gate, timed to read whether main-domain click share (1.9%
  at last recorded status) and the #1 refresh moved.

---

## 13. Blog → property → booking measurement

### Verified facts
- `GET /api/properties.json` (main site, added 2026-08-15) is the only sanctioned feed the
  blog reads from — cached, 1h `s-maxage`, `robots`-disallowed but consumed server-side
  (WordPress doesn't consult robots.txt for this).
- Stay Match plugin (blog-side, live since 2026-08-26) consumes that feed to recommend a
  specific property inline in enrolled articles, replacing a static CTA. Enrollment is
  explicit per-post (`_hil_stay_intent` meta field) — empty means unenrolled, page renders
  as before. Currently enrolled: article #27 only; #28/#29 deliberately left unenrolled
  (multi-audience hub articles).
- Funnel: `stay_match_view` → `stay_match_click` (destination: property|book) →
  `check_availability` → `book_click` → `booking_confirmed` (main site). `booking_confirmed`
  carries `value`/`currency`/`transaction_id`/`property` (Listing dimension), so revenue
  attributes per property landing page.

### Open items (not closed by this migration)
- **`stay_match_click` is unconfirmed as of the last recorded diagnostic session
  (2026-08-26)**, even after a `v1.0.1` navigation-timing fix. Two console diagnostics were
  handed off and not yet run/reported — see
  [HIL Blog Technical Specification.md](../About%20HIL/HIL%20Blog%20Technical%20Specification.md)
  → Stay Match. **This migration does not run, validate, or resolve this.**
- Confidence-gate thresholds (≥0.7/≥0.4) are an untuned first pass, expected to be retuned
  after ~1 month of click-by-confidence-band data — not due until after #28/#29 accrue data.

---

## 14. GA4, Clarity, GTM, and `stay_match_click`

### Verified facts
- GA4 collected **nothing** before 2026-08-09 due to a CSP `connect-src` gap
  (`next.config.ts` allowed only one of GA4's four hosts). **Any GA4 figure predating the
  2026-08-09 deploy is void** — treat post-deploy data as a fresh baseline.
- GSC was unaffected by the CSP gap (server-side collection).
- `booking_confirmed` and `generate_lead` exist as GA4 events but were not yet confirmed
  marked as GA4 "key events," and the Developer-Traffic filter was not yet confirmed
  Active, as of the last recorded Product Owner Watch Items list.
- GA4 collection on the apex domain (`haveninlipa.com`, not `dev.`) has **only ever been
  confirmed on `dev.haveninlipa.com`** as of the last recorded status — not independently
  re-verified by this migration.
- Blog-side `gtag` uses the same Measurement ID (`G-2SV2PXYB7T`) as the main site, via Site
  Kit.
- No mention of Clarity or GTM was found anywhere in HIL's existing documentation as of
  this migration — **flagged as an open question**, not a verified fact, unlike the task
  mandate's framing.

### Open questions
- Is Clarity or GTM actually deployed anywhere on HIL? Not found in `About HIL/` or the
  migrated SEO artifacts. Confirm with the Owner before assuming either exists.
- Confirm GA4 events in DebugView; mark `booking_confirmed` + `generate_lead` as key
  events; flip the Developer-Traffic filter Active; verify apex-domain collection — all
  still open Product Owner Watch Items as of the last recorded status.

---

## 15. GSC resubmission and verification

### Verified facts
- 2026-05-08 GSC baseline: 2 clicks / 66 impressions / 3% CTR / 8.5 avg position — the
  reference point for all subsequent diffs.
- Standing post-deploy verification cadence: URL Inspection + Request Indexing for new/
  changed URLs; 30/90-day GSC re-pulls diffed against baseline.
- GSC resubmission (post-`hil-seo`-cutover) is queued behind steps 1–3 of the Yoast
  closeout sequence (§3) — **not yet performed**.
- Redundant `www.haveninlipa.com/sitemap.xml` GSC submission flagged for removal, not yet
  actioned as of the last recorded Product Owner Watch Items list.

---

## 16. GBP and local SEO boundaries

### Verified facts
- GBP data pulls (numbers for the KPI dashboard) are an Owner action, historically
  supplied manually and sometimes delayed (e.g., August GBP numbers still blank as of the
  last recorded status).
- No GBP-side implementation work (listing edits, review responses, Q&A) is documented
  anywhere in HIL's existing record — this appears to be entirely an Owner-manual
  workstream, not something this codebase or plugin touches.

### Open questions
- Confirm whether GBP management is fully Owner-manual or partially tool-assisted; not
  established either way in existing documentation.

---

## 17. Performance, mobile, and accessibility

### Verified facts
- A mobile sticky booking bar (fixed-position overlay) shipped 2026-08-08 — flagged for a
  CLS re-check on the next PSI pull, not yet confirmed done.
- Manual browser verification of `/faq` (visual readability, horizontal-scroll, keyboard
  focus-visible styling, chatbot FAB obstruction on small viewports, console errors)
  remains open as of the last recorded status — verified only via HTTP/JSON-LD, not in an
  actual browser.
- A React hydration error (#418) on `/properties/spacious-2-bedroom/book`, surfaced
  2026-08-26 during Stay Match debugging, was not yet investigated as of the last recorded
  status.

### Deferred / not authorized by this migration
- Investigating or fixing either open item above.

---

## 18. Compliance-sensitive wording

### Verified facts (durable decisions, `SEO-DEC-013`–`SEO-DEC-018`, folded into `HIL_DECISIONS.md`)
- Guest-facing card payments say "Credit/Debit Card," never "Stripe."
- No public security-deposit or ID/KYC questions until a formal policy exists.
- Public FAQ/Quick Reply must never publish arrival procedures, lockbox/access
  instructions, door/gate codes, or Wi-Fi credentials.
- The "free rebooking 14+ days out" offer is removed from all guest-facing content, with
  no replacement wording promising case-by-case rebooking.
- B34 check-in 2:00 PM / B38 check-in 3:00 PM / checkout 12:00 PM noon are the only
  correct figures; B34 Cozy 1-Bedroom capacity is 5 guests.

### Durable decision (this migration)
- All of the above remain in force, unchanged, and are now discoverable from
  `HIL_DECISIONS.md`'s "Migrated SEO Decisions" section as well as the original archived
  source.

---

## 19. Testing, approval, rollback, and production-release gates

### Verified facts
- Production releases follow: local development → GitHub feature branch → PR → merge to
  `main` → Vercel auto-deploy. **A merge to `main` is not a deploy** — verify the live URL
  and the Vercel deployments API independently ([DEC-006](../About%20HIL/HIL_DECISIONS.md)).
- CI (`Lint`, `Type Check`, `Unit Tests`, `Build`) runs on every PR as of the 2026-09-07
  repair (PR #18) — confirmed green on that PR, both push- and PR-triggered.
- `main` has **no branch protection or rulesets** as of the last recorded status — a
  regression could merge without any check passing until the Owner adds one. **Not
  resolved by this migration.**
- Blog-side rollback: the `hil-seo` plugin's Administrator screen includes an Emergency
  Rollback control, and the robots.txt fix auto-reverts if its module is disabled or
  rollback is used.
- `WP_ALLOW_PUBLISH=false` remains enforced — analysts cannot publish under any
  circumstance this spec is aware of.

### Approval gates currently open (none closed by this migration)
1. Airbnb sibling cross-link unlink — the single Active Gate in `HIL_PROJECT_STATUS.md`,
   **open since 2026-08-08**. See the note under §20 — this migration explicitly does not
   treat it as closed, despite the consolidation mandate's premise that it was.
2. `hil-seo` v1.1.1 upload → verification → GSC resubmission → cache purge → Yoast
   deactivation (§3).
3. Article #6 WordPress-side repoint + 301 (§2, §8).
4. `stay_match_click` diagnosis (§13, §14).
5. `main` branch protection (this section).

### Deferred / not authorized by this migration
Everything in this section beyond documenting current state. No implementation, no
Yoast change, no cache purge, no publishing, no production change.

---

## 20. Reconciliation notes — discrepancies found during this migration

**The consolidation mandate stated "the Airbnb sibling cross-link risk is closed."**
HIL's own current-status document (`About HIL/HIL_PROJECT_STATUS.md`, last updated
2026-09-07) lists it as the **single Active Gate**, open since 2026-08-08, with no
recorded closure. This specification follows the verified current document, not the
mandate's premise — **the item is treated as open**, consistent with this migration's own
rule not to convert open items into completed work by virtue of documentation
consolidation. The Owner should confirm which is actually true (has it been unlinked on
Airbnb's dashboard since 2026-09-07 without the doc being updated, or is the mandate's
premise simply stale) and correct `HIL_PROJECT_STATUS.md` accordingly — **not done as part
of this migration**, since that would be resolving an open item based on an unverified
external claim rather than evidence.

No other discrepancy of this kind was found between the mandate and HIL's existing record,
though §1, §14, and §16 above flag facts asserted by the mandate that could not be
independently verified from this repository's existing documentation.

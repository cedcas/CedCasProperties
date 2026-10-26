# Haven in Lipa — Decision Log

> Authoritative record of **why** the current architecture intentionally works the way it does — not a duplicate of the technical specs (which describe **how**). Consult this before re-litigating something that looks odd; it may already have been decided on purpose. New entries get the next `DEC-NNN` id, newest at the bottom of each area is not required — ids are stable, order here is by topic. See [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md) for current state and [HIL_COMPLETION_LOG.md](HIL_COMPLETION_LOG.md) for when things shipped.

---

## DEC-001 — Five public listings are two physical houses; capacity claims must sum per house

Date: 2026-08-17
Status: Active
Area: Website | Cross-Workstream

### Decision
The five `Property` rows map to two physical buildings: Block 34 (`cozy-1-bedroom` **or** `spacious-2-bedroom`) and Block 38 (Mickey `sleeps-7` **or** `sleeps-11` **or** `sleeps-15`). Only one configuration per building can be occupied at a time. Any public claim about simultaneous capacity must be summed **per house** (24), never per listing (47).

### Reason
Booking one configuration left its siblings openly bookable both on-site and, through the exported iCal feed, on Airbnb — a live double-booking hole. The physical layout was confirmed with the owner while building `/weddings-accommodation`.

### Implications
- `InventoryGroup` / `InventoryGroupMember` (`propertyId` is `@unique`) enforces one group per property at the DB level.
- `deriveHouses()` / `totalHouseCapacity()` in `src/lib/listings.ts` is the sole authority for any capacity figure in prose — pure functions, unit-tested, because Hostinger blocks DB access from laptops and CI.
- Marketing copy must never say "5 listings" or "47 guests" in a simultaneous-capacity context.

### Supersedes
None

---

## DEC-002 — Availability is centralized in one service; blocking statuses are `pending` + `confirmed`

Date: 2026-08-06
Status: Active — amended by DEC-028 (2026-10-12): `pending` now means a submitted GCash/BPI payment awaiting verification; an unpaid request is `requested`/`approved` and does not block
Area: Website

### Decision
`src/lib/availability.ts` is the single source of truth for date conflicts: HIL bookings in a blocking status, active manual blocks, active system-generated inventory blocks, and active persisted external calendar events. `BLOCKING_BOOKING_STATUSES = ["pending", "confirmed"]` lives in its own module (`src/lib/booking-status.ts`).

### Reason
The rule was previously hardcoded independently in three route handlers with no shared constant, plus a duplicated inline iCal parser. Because `pending` blocks, an **unpaid** booking request also blocks sibling inventory and pushes that block to Airbnb — this is intentional (favors over-blocking over double-booking) but is a real business cost worth knowing before "fixing" it.

### Implications
Any new booking-adjacent route must call into `availability.ts`, never reimplement conflict logic. Narrowing propagation to confirmed-only bookings is a one-line constant change — but it is a business-behavior change, not a refactor, and should not be made without sign-off.

### Supersedes
None

---

## DEC-003 — Echo suppression: an imported event fully covered by a HIL record never propagates

Date: 2026-08-06
Status: Active
Area: Website

### Decision
An imported external-calendar event does not derive a sibling block when its date range is **fully** contained by a HIL-originated booking or manual block on the same property (partial overlap must still propagate).

### Reason
Bidirectional sync with Airbnb (HIL exports → Airbnb imports → Airbnb re-exports) created an infinite echo loop observed 2026-08-06 that could permanently lock all siblings in a group with no traceable cause.

### Implications
This is defense-in-depth, not the primary fix — the primary fix is operational: each Airbnb listing must import only its own HIL feed, never a sibling's or another channel's. See [HIL_PROJECT_STATUS.md → Active Gate](HIL_PROJECT_STATUS.md#active-gate) for the still-open operational half of this.

### Supersedes
None

---

## DEC-004 — Public pages read Prisma directly; the app never self-fetches its own feed route

Date: 2026-08-16
Status: Active
Area: Website | SEO

### Decision
Public informational pages (`/properties`, `/about`, `/weddings-accommodation`, `/staycation`) query the database directly through cached helpers in `src/lib/listings.ts`, rather than fetching `/api/properties.json` server-side.

### Reason
`/api/properties.json` exists specifically to cross the origin boundary for the WordPress blog. Having the Next.js app fetch its own route over the network buys a hop and a failure mode for no benefit.

### Implications
Any new internal page needing listing data imports from `listings.ts`. The feed route stays the integration point for external consumers only (WordPress today).

### Supersedes
None

---

## DEC-005 — Cache the query, not the response; a page cannot set its own Cache-Control on Vercel

Date: 2026-08-16
Status: Active
Area: Website

### Decision
Public-page caching is implemented at the data layer (`unstable_cache`, 1h, tagged `public-listings` in `src/lib/listings.ts`), not via `next.config.ts` response headers on the page route.

### Reason
Production verification showed `/properties` and `/about` serving `cache-control: private, no-store` with `x-vercel-cache: MISS` on every request despite a configured `s-maxage` header — invisible under local `next start` testing, which is exactly what made it a false positive pre-deploy. A Route Handler can set its own headers on Vercel; an App Router page cannot.

### Implications
Future "make this page faster" work reaches for `unstable_cache` / `revalidateTag` on the query. Verify any caching claim against production, never a local production build.

### Supersedes
None

---

## DEC-006 — A merge to `main` is not a deploy; verify the live URL and the deployments API

Date: 2026-08-17
Status: Active
Area: Cross-Workstream

### Decision
Treat "merged to `main`" and "live on production" as two separate facts requiring separate verification: check both the live URL and `gh api repos/.../deployments`, not CI status alone.

### Reason
A push to `main` once produced zero Vercel deployment records (no Production, no Preview) for 25 minutes while GitHub Actions stayed green throughout — every signal except the live URL looked healthy.

### Implications
Session wrap-up / deploy-verification steps must confirm the live site, not just "PR merged" or "checks passed." The `environment` field on a deployment record is keyed off the commit SHA, not the branch — a `dev` push whose head equals `main`'s can read as "Production."

### Supersedes
None

---

## DEC-007 — Marketing/SEO prose is number-free or DB-derived; never a hardcoded rate, fee, or count

Date: 2026-07-04 (extra-guest fee); reinforced 2026-08-15 (blog audit) and 2026-08-31 (staycation)
Status: Active
Area: Website | SEO | Cross-Workstream

### Decision
Rates, extra-guest fees, home counts, and capacity figures in any rendered prose — property pages, `/properties`, `/about`, `/staycation`, `/weddings-accommodation`, JSON-LD, the WordPress feed — are pulled live from the database or rewritten at render time (`normalizePricingProse()`, `sanitizeChargeProse()`). They are never authored as literals in seed files or admin free text.

### Reason
Seeded prose drifted from live DB values repeatedly (multiple listings, multiple times within weeks); the 2026-08-15 blog audit found stale hardcoded rates in 21 of 24 published posts.

### Implications
Any new content — a blog CTA, a new listing, a new landing page — sourcing a price, fee, or guest count derives it from `Property` fields or the `/api/properties.json` feed. Never type a literal peso amount or listing count into prose.

### Supersedes
None

---

## DEC-008 — `/weddings-accommodation` and `/staycation` carry `FAQPage` schema only

Date: 2026-08-17
Status: Active
Area: SEO

### Decision
These pages emit exactly one JSON-LD block (`FAQPage`) — never `EventVenue`, `Event`, `LodgingBusiness`, `BreadcrumbList`, or `Offer`/`makesOffer`/`priceSpecification` on any property/VacationRental schema either.

### Reason
HIL is not a wedding venue (no ceremonies, receptions, catering, or function rooms) — a venue-implying schema type would be a machine-readable claim it cannot support, and would compete for a SERP term dedicated venues rightly own. Separately, `Offer`/`priceSpecification` on the VacationRental schema previously triggered Google Rich Results critical errors — Google's own spec carries no on-page `Offer`; price is `priceRange` text only.

### Implications
Any future page in the Occasions & Groups (C7) cluster, or any change to property-page schema, keeps to this rule. A second JSON-LD block on these pages is a regression, not an enhancement.

### Supersedes
None

---

## DEC-009 — VacationRental rich results are EAP-gated; JSON-LD investment targets GSC hygiene, not a rich card

Date: 2026-06-25
Status: Active
Area: SEO

### Decision
Structured-data work on property pages is justified by GSC "Page can be indexed" health and AI/LLM-search machine-readability — not by an expectation of a Google rich snippet.

### Reason
The Vacation Rental rich result requires Google's invite-only Early Adopters Program (Hotel Center + a Technical Account Manager). HIL's enrollment attempt 404'd; re-checked 2026-06-25, acceptance odds for a 5-listing direct-booking site remain low. VacationRental warnings in GSC are enhancement-only and have never blocked indexing.

### Implications
Don't scope future JSON-LD polish around a rich-result payoff. The real ROI is crawl hygiene and structured-data correctness for AI-search citation, which is worth doing regardless.

### Supersedes
None

---

## DEC-010 — Content consolidation always goes build → repoint → redirect, in that order

Date: 2026-08-31
Status: Active
Area: SEO | Cross-Workstream

### Decision
When a new page absorbs or replaces an existing URL's intent (e.g. `/staycation` absorbing blog article #6), the sequence is strictly: (1) build and verify the new page live, (2) repoint every in-repo and in-CMS link to it, (3) only then add the permanent redirect from the old URL.

### Reason
Article #6 was linked in-body from 22 of 26 published blog posts (33 occurrences). A redirect added before repointing turns every one of those links into an extra hop, and risks redirect chains before the target is fully wired.

### Implications
Website Developer owns step 1 and any in-repo link updates, landed in the same commit as the new page. SEO Analyst owns steps 2 (WordPress-side) and 3. Never add a redirect/301 as the first step of a future consolidation — see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md) for the current in-progress instance of this sequence.

### Supersedes
None

---

## DEC-011 — `haveninlipa.com` and `blog.haveninlipa.com` integrate only through public REST APIs

Date: 2026-05-21 (footer integration); 2026-08-15 (reverse feed)
Status: Active
Area: Cross-Workstream

### Decision
The WordPress blog is a fully separate site on Hostinger, outside this repo. Integration goes through public REST endpoints only in both directions — blog → app via WordPress's own REST API (dynamic footer links), app → blog via `GET /api/properties.json` (a purpose-built public feed). Never a shared database connection or shared deploy pipeline.

### Reason
Keeps the two platforms independently deployable; a WordPress plugin failure cannot break the Next.js build, and vice versa.

### Implications
Any future WordPress-side feature needing live app data (e.g. Stay Match) is built as a WP plugin consuming the feed, with a graceful, price-free hardcoded fallback for when the feed is unreachable. Any app-side feature needing blog data reads WordPress's public REST API with its own fallback.

### Supersedes
None

---

## DEC-012 — Hostinger blocks direct DB access from outside Vercel; one-off prod scripts run via a temporary admin-gated route

Date: 2026-04-25 (first observed and worked around)
Status: Active
Area: Website

### Decision
When a one-time backfill or migration script must run against the production database, it is deployed temporarily as an admin-gated POST route under `src/app/api/admin/dev/...`, triggered from an authenticated browser session, then reverted.

### Reason
Hostinger's shared-hosting firewall silently drops TCP to port 3306 from non-allowlisted IPs — including developer laptops and CI/agent sandboxes — regardless of the "Remote MySQL" allowlist UI. `prisma db push`, Prisma Studio, and any local script using `DATABASE_URL` fail with "Can't reach database server" from any non-Vercel IP.

### Implications
Never assume a local or CI script can reach the production DB. This also means DB-backed automated tests are impossible in CI — test coverage instead relies on pure-function unit tests (`planDerivedBlocks`, `deriveHouses`, etc.) plus a manual test-plan protocol for anything that needs the database.

**⚠️ Update, 2026-09-06 — observed contradiction, cause unconfirmed.** During a Claude Code session (same day as DEC-015), `npm run dev` from this repo's working directory successfully read live data from the production database (`[redacted: production DB name]`) — the active `DATABASE_URL` in `.env` points at prod, not `DEV_DATABASE_URL`. This was a **read only** — no write, migration, or seed script was run, and no write was authorized. Cause is unknown: could mean Hostinger's allowlist changed, this specific harness's egress IP differs from whatever environment this decision was originally written against, or something else entirely. **Do not treat this as "DB access is now reliably available"** — the original reasoning (silent TCP drop from non-allowlisted IPs) may still hold in other environments or for write paths specifically. Any session that finds itself with apparent DB access should still get explicit Owner authorization before running anything beyond a read-only query, and should flag it the same way rather than assuming it's now the norm. Investigating *why* this happened is an open item — see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).

**Update, 2026-10-06 ([DEC-026](#dec-026--deployments-never-change-the-schema-migrations-are-version-controlled-applied-by-an-operator-and-enforced-by-a-read-only-release-gate)).** Direct access from the Owner's Mac was observed again on 2026-10-05/06: TCP 3306 reachable, and read-only queries succeeded against both the production and dev databases (each identified by asking the server, not by variable name). Both database users are granted from any host (`@%`), so the remaining control is Hostinger's network filter, whose behaviour is still not understood. Schema migrations are therefore run from an operator machine after a reachability check ([runbook](HIL_MIGRATION_RUNBOOK.md)); reach from GitHub-hosted runners was **not** tested. This decision's temporary-admin-route pattern still applies to one-off data scripts when no operator machine can connect; it must not be used for schema migrations.

2026-09-27: `manual-fix` route (`src/app/api/admin/dev/manual-fix/route.ts`) also removed from `dev` (it had been deleted on `main` 2026-09-17 via PR #21 but survived on `dev`).

### Supersedes
None

---

## DEC-013 — Dev and production use separate Hostinger databases; SMTP/Stripe/Blob stay shared

Date: 2026-08-06
Status: Active
Area: Website

### Decision
Vercel Preview/Development builds point `DATABASE_URL` at a dedicated dev database (`[redacted: dev DB name]`), never production's. SMTP, Stripe, and Vercel Blob credentials remain intentionally shared with production.

### Reason
Before the split, dev's `prisma db push` ran against the production database, creating tables `main`'s schema didn't declare and blocking every production deploy behind a data-loss guard until `dev` was merged to `main` to realign the schema.

### Implications
A dev booking still sends a real email from `customerservice@haveninlipa.com` and can trigger a real Stripe charge — dev testing of payment flows must stay test-safe by convention, not by environment isolation. Never add `--accept-data-loss` to the build command to work around a schema-drift error; the guard is correct and the drift is the thing to fix. *(2026-10-06: the build no longer runs `prisma db push` at all — [DEC-026](#dec-026--deployments-never-change-the-schema-migrations-are-version-controlled-applied-by-an-operator-and-enforced-by-a-read-only-release-gate). `--accept-data-loss` remains forbidden everywhere.)*

### Supersedes
None

---

## DEC-014 — A metered fee (₱200/hr early check-in / late checkout) rides the existing AdditionalCharge model as a creation mode, not new columns

Date: 2026-09-06
Status: Active
Area: Website

### Decision
The published ₱200/hour early-check-in and late-checkout fee is implemented as a specialized `POST /api/admin/charges` request shape (`{ feeType, hours }`) that the server resolves into the model's existing `description` (free text) and `amount` (flat `Decimal`) fields — computing `amount = hours × 200` and the description string itself, never trusting a client-supplied total. No `chargeType`/`quantity`/`unitRate` columns were added to `AdditionalCharge`, and hours are whole numbers only (`src/lib/hourly-fee.ts`).

### Reason
`AdditionalCharge` had zero quantity/rate concept before this — just a flat amount an admin typed in — and no fractional-quantity precedent exists anywhere else in the codebase's pricing logic (nights and guests are always whole numbers). A schema migration to add structured fee-type/quantity/rate columns was considered and rejected: it would require a production `prisma db push`, which per [DEC-012](#dec-012--hostinger-blocks-direct-db-access-from-outside-vercel-one-off-prod-scripts-run-via-a-temporary-admin-gated-route) cannot run from a dev sandbox and would need the temporary admin-gated route pattern, for a benefit (queryable fee-type reporting) nothing in the requirements asked for. Encoding the computed fee into the existing free-text `description` gets every downstream behavior — token, guest email, admin log, PATCH/DELETE, the `/pay/[token]` guest payment flow, the duplicate-payment guard — for free, unmodified.

### Implications
A future feature that genuinely needs to query fees by type/quantity (e.g. "total early-check-in revenue this quarter") will need the schema migration this decision deferred — `chargeType`/`quantity`/`unitRate` columns, run via the DEC-012 temporary-route pattern. Until then, don't parse `AdditionalCharge.description` to recover structured fee data; treat it as display text. Any new metered/hourly fee type should extend `src/lib/hourly-fee.ts` rather than duplicating the rate constant or validation logic.

### Supersedes
None

---

## DEC-015 — A single stale field inside a seed-only JSON blob gets a narrow admin editor with a server-side merge, not a general JSON editor

Date: 2026-09-06
Status: Active
Area: Website

### Decision
`Property.pricingNotes` (and siblings `bestForSegments`, `neighborhoodPlaces`, `propertyFaqs`, `amenityDetails`, `housePolicies`) are JSON-blob text columns with no admin UI — written once by `npm run seed:property-seo` and otherwise immutable outside a direct DB edit. When one specific key inside such a blob needs to become admin-editable (here: `pricingNotes.paymentMethods`, which had drifted to stale "Stripe" wording on all 5 live properties), the fix is: (1) a narrow form field for that one key only, (2) a pure merge function (`src/lib/pricing-notes.ts`) that reads the current blob, overwrites only the target key, and re-serializes, (3) the API route calls that function server-side — the client never sends, and the route never accepts, the full JSON object.

### Reason
Accepting a client-supplied full `pricingNotes` object would let a stale browser tab silently revert every other key (`rate`, `weeklyDiscount`, `monthlyDiscount`, `deposit`, `cancellation`) to whatever the form happened to be holding when the admin saved — the exact class of bug DEC-007 already exists to prevent for rendered prose. A general-purpose raw-JSON editor was explicitly rejected (task instruction, and consistent with this codebase's pattern of typed fields over free-form blobs everywhere else in the admin).

### Implications
The other keys inside `pricingNotes`, and all of `bestForSegments`/`neighborhoodPlaces`/`propertyFaqs`/etc., remain seed-file-only — fixing stale content in *those* still requires either extending this same narrow-field-plus-merge pattern per field, or a one-off DB correction via the DEC-012 temporary-route pattern. Do not build a generic "edit any JSON field" admin screen; add fields one at a time, each with its own merge function, following this precedent.

### Supersedes
None

---

## DEC-016 — Content shared between a seed script and any other script lives in a Prisma-free data module; seed scripts guard their own `main()`

Date: 2026-09-06
Status: Active
Area: Website

### Decision
`prisma/seed-property-seo.ts` and `prisma/seed-property-seo-mickey.ts` no longer declare their content objects (`TWO_BR`/`ONE_BR`, `SLEEPS_7`/`SLEEPS_11`/`SLEEPS_15`) inline. That content now lives in `prisma/property-content/b34-content.ts` and `prisma/property-content/mickey-content.ts` — plain data modules with no `PrismaClient` import and no top-level function calls. The seed scripts import from there, and so does any other script that needs the same content (e.g. `scripts/fix-property-content.ts`). Both seed scripts also now guard their invocation: `if (require.main === module) { main()... }`, so executing them directly still seeds as before, but merely `import`-ing them for a named export no longer does.

### Reason
While building `scripts/fix-property-content.ts` to read the (already Owner-approved, already-corrected) seed content as the target values for a production dry-run, importing `TWO_BR`/`ONE_BR` from the *old* single-file `seed-property-seo.ts` also executed that file's unconditional `main().catch(...).finally(...)` at the bottom of the file — because requiring a CommonJS module runs its entire top level, including a call to an async function whose returned Promise nobody awaits. This actually ran `applySeo()` against production for `cozy-1-bedroom` and `spacious-2-bedroom` (confirmed via `updatedAt` moving to the moment of the `require`) before the maintenance script's own safety assertions even got a chance to run and abort. No content ended up changing (verified field-by-field, read-only, no writes made in response) — the write appears to have been interrupted by the maintenance script's own `process.exit(1)` before the seed script's `console.log("✓ Updated…")` could fire — but the *mechanism* was real and dangerous: an import statement silently wrote to production, bypassing a dry-run flow built specifically to prevent exactly that.

### Implications
Never give a script that's meant to run standalone (`node script.ts`) an unconditional top-level side effect — gate it behind `require.main === module` (or, in an ESM-only file, the `import.meta.url === ...` equivalent) even if "nothing else imports this today." If a future script needs data that currently lives inside a seed/backfill/migration script, extract that data into its own side-effect-free module rather than importing the operational script directly, even for "just its exports."

**Extension, 2026-09-27 — later corrections are targeted substring replacements, self-contained in `src/lib`.** The SM Lipa / Casa Marikit drive-time correction (`src/lib/drive-time-fixes.ts`, a second pass in `scripts/fix-property-content.ts`) does **not** overwrite whole fields from the seed modules the way the 2026-09-07 pass did. It applies a hardcoded, reviewed table of exact old → new substrings (JSON fields edited on the parsed value, re-serialized with `JSON.stringify`, abort if the stored text doesn't round-trip). Anything the table doesn't cover that still looks stale aborts the run for a human to fix by hand. Two reasons: (1) since DEC-015 some fields can be edited in admin, so a whole-field overwrite could silently revert an Owner edit; (2) `dev` and `main` carry different versions of `prisma/property-content/*`, so a correction that reads its targets from those modules would write different text depending on which branch was deployed. Future one-off content corrections should follow this pattern: targets live in the lib, not in the content modules. Keep the {id, slug} assertions, the unexpected-content abort, dry run by default, one transaction, the post-write re-scan and idempotency. On production, run via a temporary DEC-012 route that uses the same pure functions (GET = plan + `planHash`; POST needs an explicit confirm string plus the reviewed `planHash`), then delete the route.

**Addendum, 2026-09-28 — the drive-time route was used once and removed.** `/api/admin/dev/fix-drive-times` went live with release PR #30 (`41d666a`). The Owner ran it once on production at 2026-09-28 00:11 CT: GET dry run, planHash `db895ae4f17708a6`, 20 fields across 5 properties, then POST `success: true`, 20 written, and the re-check passed. The Owner verified all 5 live listings. The route was deleted in the follow-up PR. `src/lib/drive-time-fixes.ts` and the CLI pass in `scripts/fix-property-content.ts` stay; the route-only POST gate (`checkApplyRequest`, `DRIVE_TIME_CONFIRM`) was removed with it. A future run needs a new temporary route, following the pattern above.

### Supersedes
None

---

## DEC-017 — CI's Build job compiles the app only; database sync stays Vercel-only, and every route-tree code path must tolerate a build-time DB outage

Date: 2026-09-07
Status: Active
Area: Website | Cross-Workstream

### Decision
`.github/workflows/ci.yml`'s `Build` job runs `npm run build:app` (`prisma generate && next build`), a new script that is a strict subset of the production `build` script (`prisma db push --skip-generate && prisma generate && next build`). No CI job ever runs `build`, `prisma db push`, a migration, or a seed script — those remain exclusively Vercel's, using real production credentials Vercel alone holds. Separately, any code that runs unconditionally on every route (mounted in the root layout, e.g. `getChatTree()` via `ChatWidgetServer`) must catch its own database errors and degrade to a static fallback rather than throw — because Next.js may statically prerender that route at build time, and a thrown error there fails the *entire* build, not just one page.

### Reason
GitHub Actions' "Build" and "Lint" checks failed on every PR for months (confirmed identical failures on PR #16 and #17, unrelated to either PR's content — see `HIL_PROJECT_STATUS.md`'s prior "known broken, not blocking" entry). Root cause: `/sitemap.xml` and `getChatTree()` both queried Prisma directly at static-export time with no error handling, so they crashed against CI's intentionally-unreachable placeholder `DATABASE_URL` — and, less obviously, would have crashed a production build too during any transient DB outage at deploy time, since `getChatTree()` sits in the root layout and therefore executes for every statically-generated page, not just chat-widget-specific ones.

### Implications
- Never point a CI validation job at a real database, and never add `prisma db push` (or any write path) to a script a CI job runs — `build:app` exists specifically so `build` (Vercel-only) doesn't have to be touched or duplicated with drift risk.
- Any new server component or helper mounted in `src/app/layout.tsx` (or another shared layout) that reads the database must handle a failed query gracefully — it runs on literally every route, static or dynamic, and an unguarded throw there is a site-wide build/render failure, not a contained one. `getChatTree()`'s try/catch-and-fall-back-to-the-static-tree is the reference pattern.
- A public *page* that needs live DB data (as opposed to a layout-level component) uses the existing `export const dynamic = "force-dynamic"` + `unstable_cache`-wrapped-query pattern from [DEC-004](#dec-004--public-pages-read-prisma-directly-the-app-never-self-fetches-its-own-feed-route)/[DEC-005](#dec-005--cache-the-query-not-the-response-a-page-cannot-set-its-own-cache-control-on-vercel) instead — that pattern alone does not help a *layout*-level component, since making the whole root layout dynamic would force every route in the app to skip static generation.

**⚠️ Amended 2026-10-06 by [DEC-026](#dec-026--deployments-never-change-the-schema-migrations-are-version-controlled-applied-by-an-operator-and-enforced-by-a-read-only-release-gate).** The "database sync stays Vercel-only" half of this decision is obsolete: Vercel no longer syncs the schema either. `build` is now `npm run build:app`, and `prisma db push` runs nowhere. What stands unchanged: CI validation never touches a hosted database or receives its credentials, the four check names (`Lint`, `Type Check`, `Unit Tests`, `Build`) are stable, and layout-level code must tolerate a build-time database outage. The added `Migrations` check keeps to the same rule — it uses a throwaway MariaDB container on the runner.

### Supersedes
None

---

## DEC-018 — Unify HIL web/application and SEO workspace governance into this repository

Date: 2026-09-17
Status: Active
Area: Website | SEO | Blog | Cross-Workstream

### Decision
This repository (`/Volumes/Files and Cloud/Dropbox/VSCode/haveninlipa`) becomes the single
authoritative workspace for HIL's web/application, WordPress/blog, SEO governance, content
workflows, accessibility/QA, security/privacy/compliance, deployment, and technical
documentation — coordinated as roles in `CLAUDE.md` (see its "Unified Role Model" section),
not separate agents or workspaces. The SEO workstream's artifacts, decisions, and
completion history are migrated from the shared `/Volumes/Files and Cloud/Dropbox/VSCode/seo/content for HavenInLipa/`
workspace into `content/seo/` and `docs/HIL_SEO_SPECIFICATION.md`; that shared folder is
retired for active HIL work (see its own `MIGRATED_TO_HIL_WORKSPACE.md` marker).

### Reason
SEO governance for a live, revenue-generating property had drifted into a separate shared
multi-client workspace with its own status/decision/completion-log trio
(`SEO_PROJECT_STATUS.md`/`SEO_DECISIONS.md`/`SEO_COMPLETION_LOG.md`), already carefully
cross-referencing this repository's `HIL_DECISIONS.md`/`HIL_PROJECT_STATUS.md` by hand.
Splitting the two meant neither could see the other's open gates without a human manually
reconciling them — exactly the drift this decision log exists to prevent for the product
side alone. Three sibling client projects (AMC, NetCore, TribeMedSpa) underwent the same
consolidation the same day, for the same reason.

### Implications
- `content/seo/` (git-tracked, by explicit choice — see the folder's own `README.md` for
  why this differs from `About HIL/`'s gitignored posture) holds migrated `runs/`,
  standing `research/`, and `archive/` (the four original governance documents, each with
  a supersession notice prepended, preserved verbatim).
- `docs/HIL_SEO_SPECIFICATION.md` (also git-tracked) is the new focused SEO governance
  spec — facts/decisions/planned/deferred/assumptions/open questions/gates. It is
  distinct from `About HIL/HIL SEO Technical Specification.md` (moved to `docs/` 2026-09-27), which describes *how* the
  implementation works, not governance state.
- **This decision does not close, resolve, or reinterpret any open gate it inherits** —
  the `hil-seo`/Yoast cutover sequence, the article #6 redirect, the unconfirmed
  `stay_match_click` event, or any other item recorded as open in the migrated documents
  or `docs/HIL_SEO_SPECIFICATION.md` §19–20. It only relocates where they are tracked,
  into one place. (The Airbnb sibling cross-link risk, flagged during this migration as a
  discrepancy between the migration brief and `HIL_PROJECT_STATUS.md`'s then-current Active
  Gate, was separately confirmed complete by the Owner the same day, 2026-09-17 — see that
  document's Recently Completed. Recorded as closed by Owner confirmation, not by this
  decision or by the migration itself.)
- No DNS change, no merge with `pinasbnb-pro`, no booking-system change, and no WordPress
  production change (plugin install/activation, Yoast deactivation, cache purge, role
  change) resulted from this decision — it is a documentation and governance change only.
- The 25 pre-existing `SEO-DEC-###` identifiers are preserved exactly, not renumbered —
  see "Migrated SEO Decisions" below.

### Supersedes
None

---

## DEC-019 — HIL is PinasBNB's customer-zero/living-demo property; `haven-in-lipa.pinasbnb.pro` is a distinct comparison/pilot boundary

Date: 2026-09-17
Status: Active
Area: Cross-Workstream

### Decision
Haven in Lipa (`haveninlipa.com` / `blog.haveninlipa.com`) is PinasBNB's customer-zero /
living-demo property. `haven-in-lipa.pinasbnb.pro` is a separate, PinasBNB-owned
comparison/pilot application. Owner-confirmed 2026-09-17 (raised as an unverified
assumption during the DEC-018 workspace consolidation, since neither relationship had
appeared anywhere in HIL's own prior documentation).

### Reason
The 2026-09-17 workspace-consolidation task asserted this relationship as a premise;
nothing in `About HIL/` corroborated it independently, so it was recorded as a flagged
assumption pending confirmation rather than treated as fact. The Owner confirmed it the
same day.

### Implications
- HIL's identity as a real, independently operating rental business is preserved — it is
  not to be presented as an independent external PinasBNB customer, but transparent
  ownership (HIL as PinasBNB's own demo property) is fine to state plainly.
- No merge of HIL into `pinasbnb-pro`, no DNS cutover, and no change to
  `haveninlipa.com`'s booking system follows from this decision — the three properties
  (`haveninlipa.com`, `blog.haveninlipa.com`, `haven-in-lipa.pinasbnb.pro`) remain
  distinct and operational, per the 2026-09-17 consolidation's own constraint.
- Any future work that touches `haven-in-lipa.pinasbnb.pro`'s relationship to real HIL
  data (e.g., reading `GET /api/properties.json`) should be evaluated against this
  boundary and against [DEC-011](#dec-011--haveninlipacom-and-blogaveninlipacom-integrate-only-through-public-rest-apis)'s public-API-only integration pattern, not assumed to
  inherit it automatically — no such integration is confirmed to exist as of this
  decision.
- See `docs/HIL_SEO_SPECIFICATION.md` §1, updated to reflect this as a verified fact
  rather than an open assumption.

### Supersedes
None

---

## DEC-020 — Bookings are confirmed only after server-side pricing and Stripe PaymentIntent verification; the client never sets the amount

Date: 2026-09-27
Status: Active
Area: Website

### Decision
Every amount the guest pays is computed on the server. A card booking (or a guest-paid
additional charge) is confirmed/marked paid only after the server retrieves the Stripe
PaymentIntent and verifies it: `succeeded`, currency PHP, amount (and `amount_received`)
equal to the server-computed total, metadata matching the booking/charge it was created
for, and not already used by another booking/charge. The client says *what* it is paying
for, never *how much*. Implemented in [PR #23](https://github.com/cedcas/CedCasProperties/pull/23)
(merge `480053f`, deployed 2026-09-27) — `src/lib/booking-quote.ts` and
`src/lib/stripe-payment.ts`.

### Reason
A code review on 2026-09-27 found that `/api/bookings` auto-confirmed a card booking on
any client-sent `stripePaymentIntentId` string without asking Stripe, that
`/api/stripe/payment-intent` charged a client-sent amount, and that promo discounts were
computed from client-sent totals. Any of these let a tampered request produce a
confirmed booking that was underpaid or not paid at all.

### Implications
- Pricing logic has one home (`computeBookingQuote`); the PaymentIntent route and the
  booking route both call it, so the charged amount and the verified amount cannot drift.
- GCash/BPI bookings are unaffected in flow — they stay `pending` for manual admin
  verification — but are now stored with the server-computed price.
- Any new payment path (e.g. a future Stripe webhook or a new charge type) must use the
  same verifier and metadata builders rather than trusting client input.
- Residual gap until approved: no DB unique constraint on `stripePaymentIntentId` (a
  concurrent-request race remains; schema change needs Owner approval and would ship via
  the Vercel-build `prisma db push`), and no Stripe webhook. See
  [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md) → Payment Verification.

### Supersedes
The earlier implicit behavior "a Stripe booking with a PaymentIntent id is auto-confirmed"
(Website spec, Key Features → Public Site) — auto-confirmation now requires verification.

---

## DEC-021 — GA4 runs only on the production hostname and never on admin routes; owner devices are tagged internal, not excluded

Date: 2026-09-27
Status: Active — merged into `dev` (PR #25), released to `main` via PR #30 (`41d666a`), **live on production** 2026-09-28
Area: Website | SEO | Cross-Workstream

### Decision
On `haveninlipa.com` (this repo), GA4 (`G-2SV2PXYB7T`) loads and sends only when:
(1) the browser's `location.hostname` is on an exact allowlist (`haveninlipa.com`,
`www.haveninlipa.com`), checked at runtime, and not a Vercel preview build
(`NEXT_PUBLIC_VERCEL_ENV !== "preview"`, a secondary check); and (2) the path is not
`/admin` or anything under it (or `/api`). gtag.js is not even fetched on admin page
loads, and `window['ga-disable-G-2SV2PXYB7T']` covers client-side navigation into admin.
`track()` is a no-op otherwise. A device that renders a signed-in admin page is marked
(`localStorage.hil_internal`) and its public-page hits carry `traffic_type: "internal"`.
It is tagged, not blocked. `/pay/[token]` stays tracked, with the token redacted. The only
way to send from a non-production host is an explicit `?ga_debug=1` (DebugView, flagged
`debug_mode`). Rules: `src/lib/analytics-config.ts`; wiring: `src/components/Analytics.tsx`,
`src/lib/analytics.ts`.

### Reason
The 2026-09-27 GA4 review found admin sessions (52 "Organic Search" sessions landing on
`/admin/*`/`/pay/*`), dev/preview/local hosts (7 sessions), and 4 test `booking_confirmed`
events (2026-08-09, `dev.` + a local machine) in the reports. The previous design sent
from every host and only stamped `debug_mode` on custom events off-production, which
relied on a GA4 Developer filter that was never Active and never covered automatic
`page_view`s. Why a hostname allowlist rather than `NEXT_PUBLIC_VERCEL_ENV === "production"`
alone: `dev.haveninlipa.com` is a Vercel Preview deployment on a custom subdomain, and
the env var depends on Vercel exposing system env vars to the client bundle. A hostname
check in the browser is correct even when env vars are missing or wrong. Why tag the owner
instead of disabling GA for them: GA4's Internal Traffic filter can be switched on, off or
into Testing in the UI, while hits that were never sent can't be recovered.

### Implications
- Owner GA4-UI steps (not code): set the **Internal Traffic** and **Developer** data
  filters Active (**done — Owner-confirmed Active 2026-10-04**); mark `generate_lead`
  (and `booking_confirmed`) as key events (**done — both report as key events in GA4,
  checked 2026-10-04**).
- Any new production hostname must be added to `ANALYTICS_HOSTS`, or GA silently goes dark
  there. Any new owner-only route tree must be added to `isTrackedPath`.
- GA4 data between 2026-08-09 and this deploy still contains admin/dev/test traffic.
  Segment by hostname/page path when reading it.
- `blog.haveninlipa.com` (WordPress) is outside this repo and this decision. Stay Match
  v1.0.2 applies the same tag-don't-drop idea to editor previews there.
- **Test bookings stay unlabeled in the DB — by Owner decision.** The Owner runs test
  bookings on `dev.haveninlipa.com` (a Vercel Preview deployment with its own database,
  DEC-013), so they never reach the production DB, and the hostname allowlist above means
  that host sends no GA4 events either. Any owner test booking made on production is still
  tagged `traffic_type: internal` via the admin-device marker. No `test_booking` event
  param was added.

### Proposal declined — `Booking.isTest` (Declined by Owner 2026-09-27; NOT implemented)
- **Was proposed:** an `isTest Boolean @default(false)` column on `Booking`, set by an
  admin-only toggle, to exclude test bookings from revenue/customer figures.
- **Why declined:** test bookings are made on `dev.haveninlipa.com`, whose separate
  database keeps them out of production data, and after this decision that host sends
  nothing to GA4, so a DB flag isn't needed. No schema change.

### Supersedes
The 2026-08-08 `track()` behaviour ("send from every host; stamp `debug_mode` off
`PROD_HOSTS` and rely on the Developer filter") in the Website spec → GA4 Analytics Events.

---

## DEC-022 — Unfinished checkouts are recorded before the booking exists and alerted after 10 minutes via Vercel Cron; `add_payment_info` is a funnel step, not a key event

Date: 2026-09-28
Status: Active — PR #32 (`cbfd123`), **live on production** 2026-09-28
Area: Website | Analytics

### Decision
When a guest reaches the payment screen (any method), the site writes a `CheckoutAttempt` (guest contact, stay, method, server-quoted total). `/api/bookings` links it to the booking it produced. An attempt with no booking after **10 minutes of inactivity** triggers **one** admin email per guest/stay. It is only an alert: **no dates are held** and no booking is created. The trigger is **Vercel Cron every 5 minutes** (`vercel.json`); GitHub Actions is a backstop only. GA4 gets `add_payment_info` on the same screen, as a funnel step. **It is not marked as a key event.**

### Reason
Booking #140 (2026-09-27): the guest paid by GCash at 11:15 AM PHT but tapped "I Paid" 53 minutes later. For that hour the Owner had a payment with no booking, no guest identity and no held dates. **Alert only after 10 minutes, not on every QR view (Owner choice):** normal bookings stay quiet. **Why not hold dates at the QR screen:** abandoned checkouts would block inventory and need expiry logic. The Owner chose the alert-only option. **Why Vercel Cron:** the repo's GitHub schedules deliver ~12% of `*/15` slots, with gaps of up to 3.5 h (see `sync-external-calendars.yml`). The Owner now has a paid Vercel plan that allows 5-minute schedules. **Why not a key event:** a key event counts as a conversion, so every abandoned checkout would inflate conversions. Abandonment is the *gap* between `add_payment_info` and `booking_confirmed`. The GA4 funnel starts at the `/book` page view, not at `book_click`, which also fires on the "I've Paid" button.

### Implications
- `CheckoutAttempt` holds guest PII: 30-day purge, no PII sent to GA4. Alert recipient is `customerservice@haveninlipa.com`.
- New time-sensitive cron jobs should use Vercel Cron in `vercel.json`. The three existing jobs still run on GitHub Actions / cron-job.org and could migrate later. That is not done.
- Keep `dev` merged up with `main`: building a branch that lacks the model makes the production-style `prisma db push` fail, rather than drop the table. *(Obsolete since [DEC-026](#dec-026--deployments-never-change-the-schema-migrations-are-version-controlled-applied-by-an-operator-and-enforced-by-a-read-only-release-gate): builds no longer push the schema, and a branch that is behind the dev database still builds.)*
- Possible later upgrade (not built): hold dates at the QR screen with a short expiry, if alerts prove insufficient.

### Supersedes
None

---

## DEC-023 — Blog front-end loading: one image lazy-loader (EWWW), Font Awesome off the critical path via a small plugin, theme untouched

Date: 2026-09-30
Status: Active — Owner-configured and uploaded 2026-09-30, **live** on `blog.haveninlipa.com` (blog post PageSpeed mobile 65 → 89)
Area: Blog | SEO

### Decision
- **One image lazy-loader:** **EWWW Image Optimizer** is the blog's only image lazy-loader. LiteSpeed "Lazy Load Images" is **OFF**. The post hero image is excluded from EWWW lazy load by class `size-haveninlipa-featured`.
- **CSS:** LiteSpeed **CSS Minify + CSS Combine ON**. "Load CSS Asynchronously" and UCSS stay **OFF**, because they can break layout and depend on QUIC.cloud.
- **Font Awesome:** the theme's full Font Awesome CSS is kept off the render-blocking path by the repo-owned **HIL Performance** plugin (`content/seo/runs/093026/hil-performance/`). It drops the theme's `<link>` at print time and loads the same file through a non-blocking loader. The theme's code is not modified.

### Reason
- **Single lazy-loader:** with two lazy-loaders active, excluding the LCP hero in one just handed it to the other. The placeholder stayed, and the score didn't move.
- **CSS Combine:** it cut four render-blocking first-party stylesheet requests to one.
- **Font Awesome:** it was the largest render-blocking request, about 1 s on slow 4G, for about 14 icons. Under CSS Combine it gets folded into the bundle unless its tag is removed outright.
- **Plugin rather than theme edit:** the theme source isn't in this repo. A plugin is versioned here, independently reversible (deactivate), and survives theme updates.

### Implications
- Any new above-the-fold image pattern needs its class added to EWWW's lazy-load exclusions, not LiteSpeed's.
- If the theme renames the `font-awesome` handle, the plugin silently does nothing. Re-check this after theme updates; the combined-CSS filename-hash test is in the Blog spec.
- Don't re-enable LiteSpeed lazy load, and don't add a `<noscript>` stylesheet fallback; LiteSpeed combines those.
- Further gains would need theme changes: trim the 8 Google Font styles, self-host fonts, or subset Font Awesome. That would be a separate, planned change.

### Supersedes
None

---

## DEC-024 — Every write that claims nights takes the inventory lock; a booking amendment is one transaction and keeps the agreed price

Date: 2026-10-01
Status: Active — released via PR #43. **Owner acceptance testing passed on `dev.haveninlipa.com` on 2026-10-01** (dev build `9eb9f76`, Preview environment, dev database). **Live on production since 2026-10-02** (merge `6aa5729`, deployment success, signed-out smoke checks passed; no logged-in amendment has been run on production). **The Owner approved the first-release policies on 2026-10-02** (section below); the released code already matched them, so approval changed no behaviour.
Area: Website

### Decision
- **Inventory lock.** Any write that claims nights — a new booking (`POST /api/bookings`) or an amendment — first takes `SELECT … FOR UPDATE` on the `Property` rows of the listing and all members of its inventory group (`src/lib/inventory-lock.ts`), then re-checks availability and writes inside that transaction. The check reads sibling bookings directly, not only their derived blocks.
- **Amendments are atomic.** The booking update, its sibling-block reconciliation, the unsent scheduled messages and the audit entry commit or roll back together. Only the booking and its own derived blocks are excluded from the availability check.
- **Price is preserved.** An amendment writes no financial field, makes no charge or refund, and creates no `AdditionalCharge`. A reference quote is shown for comparison only.
- **Eligibility.** Upcoming: all fields. In progress: contact, guests, check-out. Past: contact only. Cancelled: none.

### Approved first-release policies (Owner, 2026-10-02)
1. **Price:** the agreed price is preserved. Re-pricing and any recording of extra amounts or refunds are deferred — not built, not scheduled.
2. **Notification:** an amendment does not notify the guest automatically.
3. **Overdue reminders:** a reminder whose send time an amendment moves into the past is held, not sent. "Held" means the row is marked `skipped` with a reason and listed at review; staff send it by hand from the thread if still needed. It is not queued for later release.
4. **Eligibility:** as in the Decision above (upcoming / in progress / past / cancelled).
5. **Card charged but booking not saved:** handled manually. The guest gets the notice with the payment reference and the admin gets one alert. No automatic refund and no promised deadline.

**One known exception to policy 3.** A reminder the sending worker has already claimed when the amendment commits cannot be held. If its amended time is already due, it is sent. The amendment reports it as "being sent right now". Tracked as a follow-up in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).

### Reason
- **Lock:** booking creation was check-then-insert with no lock. Two requests could both pass the check, and a transaction alone does not prevent that. A database test without the lock double-books every time.
- **Row locks rather than `GET_LOCK`:** row locks release on commit, rollback or connection loss. A named lock would stay held on a pooled connection.
- **One transaction for amendments:** the existing reconciler is safe on failure because it over-blocks. An amendment also *releases* nights, and a suppressed channel event must resume blocking them. Doing that after the commit would leave a window where it had not happened yet.
- **Preserve price:** the two 2026-09-17 precedents differ (#130 kept its paid total; #136 was increased after a separately collected payment), and no policy has been approved. Keeping the stored figures is the only option that cannot misstate what was paid.

### Implications
- New code that inserts or moves a booking must go through `withInventoryLock`. Work inside it must be database-only, because a deadlock retry can run it more than once.
- Deadlocks (InnoDB 1213) between the lock and a post-commit derived-block insert are expected and retried (`src/lib/db-retry.ts`): deadlocks only, 3 attempts, database-only work. Do not remove the retry or widen it to other errors. Verified against the production engine, MariaDB 11.8.9 / InnoDB.
- A card booking that loses the race after payment now gets a 409 with its payment reference, an `AdminLog` entry and one admin alert email (`src/lib/paid-unavailable.ts`), instead of a double booking.
- After a date change the stored `nightlyTotal` no longer equals nights × rate.
- Moving a cancelled booking back to pending/confirmed (`PUT /api/admin/bookings/[id]`) takes the same lock and check; it is refused with 409 if the dates are gone. Other status transitions are unchanged.
- A reminder is too late to stop once the sending worker has claimed it and re-read the booking. Amendments report such a reminder as in flight; they do not promise it was stopped.
- Scheduled-message delivery is now at-most-once: an interrupted send is marked `failed`, not re-sent.
- A card payment whose booking could not be saved is handled by hand (policy 5). Refund timing and the 6% card fee are settled case by case; the site only records it and alerts the admin.

### Supersedes
None

---

## DEC-025 — Footer credit brand standard: Powered by NetCoreSolutions.com, no GeneratePress branding

Date: 2026-09-29
Renumbered: was DEC-023 on `dev` until 2026-10-02. It clashed with the blog-loading decision already recorded as DEC-023 on `main`, so this one took the next free number. Commit `18bcdc4` and PR #37 still say DEC-023 in their titles.
Status: Active. **Main site: LIVE on production 2026-10-06.** PR #37 merged into `dev` 2026-09-30 (`6083e7f`); released to `main` by PR #63 (merge `2ffacaa`, Production deployment `6886658355` success, live footer verified on haveninlipa.com). **Blog: LIVE 2026-10-06.** Applied on the live blog 2026-10-06 by direct edit of the live theme files over SSH: `footer.php` credit line, `main.css` (0.875rem + `a.footer-credit` rules), `style.css` Version 1.0.1. A pre-change backup of the three files (with checksums) is kept on the hosting account outside the web root; location is in the Owner's notes, not this repo. `php -l` clean; LiteSpeed purged and object cache flushed; verified over HTTP on the blog home, a post and the 404 page (one credit link each, no GeneratePress, new CSS served). Not visually checked in a browser; Hostinger CDN not separately flushed.
Area: Website | Blog | Brand

### Decision
Owner brand standard for all of Cedric's sites, effective 2026-09-29: every site carries a subtle footer credit, "Powered by NetCoreSolutions.com", written as one word with no spaces. No GeneratePress branding anywhere: footer, theme metadata or visible UI.

**Reference: the live footer on https://tribemedspa.com, as fetched 2026-09-29, HTML plus its theme CSS.** Copy it exactly, except for colour, where each site uses its own muted footer gray. What the live TMS footer does:
- **Markup:** `<div class="tms-footer__legal"><div class="tms-footer__credit">© 2026 Tribe Med Spa<br><a href="https://netcoresolutions.com">Powered by NetCoreSolutions.com</a></div><nav class="tms-legal-nav">Privacy Policy · Terms & Conditions</nav></div>`.
- **Link scope:** the **whole phrase** "Powered by NetCoreSolutions.com" is the link, with no `target`/`rel`.
- **Size:** the whole legal row is `font-size: 0.875rem` (14px): copyright, credit and legal links.
- **Colour and hover:** text and link share the muted footer colour (TMS `#4a4a4a`), with `text-decoration: none`. On `:hover` and `:focus-visible` the link turns the stronger text colour (TMS `#1a1a1a`) and gets `text-decoration: underline`.
- **Placement:** last row of the footer, under a 1px top border. `display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem`. The credit block (copyright, then the credit on a second line) is on the left and the legal nav on the right.
- **Mobile (`max-width: 768px`):** the row becomes `flex-direction: column; text-align: center`, and the legal list is centred.

The original Owner brief linked only the domain. The live TMS footer, now the authoritative reference, links the whole phrase, so HIL follows TMS.

### Reason
A consistent, low-key attribution across every property the Owner runs, without competing with the site's own brand or conversion elements.

### Implications
- **Main site:** `src/components/layout/Footer.tsx`, bottom legal row.
  - The row is `flex flex-wrap items-center justify-between gap-4 text-[14px] text-white/55 max-[768px]:flex-col max-[768px]:text-center`, i.e. stacked and centred at ≤768px.
  - Left block: copyright, `<br />`, then `<a href="https://netcoresolutions.com">Powered by NetCoreSolutions.com</a>`.
  - The link inherits white/55 and is `no-underline`. On hover/focus-visible it becomes `text-white/85` (HIL's footer hover colour) plus underline.
  - Privacy/Terms stay on the right and are now 14px, since the whole row is 14px as on TMS (was 12.5px). Their hover is unchanged.
  - `NETCORE_CREDIT_URL` is guarded by `src/lib/__tests__/footer-credit.test.ts`.
- **Main-site coverage:** every public page that renders `<Footer />` has the credit. It is deliberately **not** on `/admin/*` (Owner-only UI) or on `/pay/[token]` (a noindex, single-purpose payment screen with no site footer).
- **Blog (`haveninlipa-blog` theme):**
  - `footer.php` gets `<br><a class="footer-credit" href="https://netcoresolutions.com">Powered by NetCoreSolutions.com</a>` inside the `.footer-bottom` copyright `<p>`.
  - `assets/css/main.css` gets `.footer-bottom { font-size: 0.875rem }`, plus `a.footer-credit` in the blog's muted footer gray `rgba(255,255,255,0.5)` with no underline. On hover/focus it becomes `var(--color-primary-light)` plus underline.
  - Mobile stacking and centring at ≤768px already exists in the theme.
  - The live `footer.php` has drifted from the Dropbox source, so apply via Theme File Editor rather than reinstalling the old source.
- **GeneratePress:** as of 2026-09-29 there is no GeneratePress branding in the repo. The only old mention was a `CLAUDE.md` note, now reworded; the remaining mentions are these decision records and a test that asserts its absence. There is none on the live blog either, and `/wp-content/themes/generatepress/` returns 404. Structural references (e.g. a `Template: generatepress` child theme, class names) would be acceptable on other sites, but HIL has none. Re-check whenever a theme changes.
- A new site, or a footer rewrite, must keep this credit. Do not make it more prominent (no logo, no larger type, no accent colour at rest) without an Owner decision.
## DEC-026 — Deployments never change the schema; migrations are version-controlled, applied by an operator, and enforced by a read-only release gate

Date: 2026-10-06
Status: Active — **complete and live on production since 2026-10-06** (PR #57, merge `3798482`). Dev baselined 09:50 UTC and production 10:17 UTC the same day, both metadata-only; Owner acceptance on `dev.haveninlipa.com` (build `09f04b9`) passed before the merge
Area: Website | Cross-Workstream


### Decision
- **Builds do not write.** `npm run build` is `npm run build:app` (`prisma generate && next build`). `prisma db push` is removed from every automatic path and is not replaced by `prisma migrate deploy` in the build.
- **Schema changes are migrations.** `prisma/migrations/` is the history. `20261005000000_baseline` reproduces the schema as it stood on production on 2026-10-05; the existing dev and production databases are *marked* as having it (`prisma migrate resolve --applied`, a metadata write), never re-created from it.
- **Migrations are applied by a person, on purpose.** `scripts/db-migrate.mjs` is the only entry point: it confirms the database with the server, requires the reviewed commit, lists pending migrations and applies only those named, compares the real schema with one built from the migrations before and after, records the run, and stops on any failure without marking anything applied. It runs on an operator machine that can reach Hostinger. There is no migration workflow and no migration endpoint.
- **Order is enforced by a gate, not by timing.** Vercel's build runs `vercel-build`, which adds `scripts/migration-gate.mjs`: a read-only check that every migration in the commit is applied to that environment's database. If not, the build fails and the previous deployment keeps serving. So the release order is: review → migrate → merge.
- **Schema changes are backward compatible** (expand, then contract in a later release), because old code runs against the new schema between "migrate" and "merge".

Runbook: [HIL_MIGRATION_RUNBOOK.md](HIL_MIGRATION_RUNBOOK.md).

### Reason
- `db push` on every deploy made each release a schema operation against production, with no review of the SQL, no history, and a data-loss prompt as the only guard ([DEC-013](#dec-013--dev-and-production-use-separate-hostinger-databases-smtpstripeblob-stay-shared)'s incident).
- It was not the no-op it was believed to be. `GuestMessage.messageId` is `VARCHAR(998)` with an index; InnoDB caps index keys at 3072 bytes, so MariaDB stores a 768-character prefix index. `schema.prisma` did not declare the prefix, so Prisma saw a difference on every run and **dropped and recreated that index on every deployment**, on production and dev. Found 2026-10-05 by diffing both databases against the schema; fixed by declaring `@@index([messageId(length: 768)])` — a schema-file correction with no database change.
- A GitHub job and a Vercel build triggered by the same merge run independently, so "run the migration in CI on merge" does not order the release. Failing the build until the migration is applied does.
- GitHub-hosted runners were not adopted as the migration host: their reach to Hostinger is unverified ([DEC-012](#dec-012--hostinger-blocks-direct-db-access-from-outside-vercel-one-off-prod-scripts-run-via-a-temporary-admin-gated-route)) and it would put the production database credential in a public repository's secret store. A workflow that might not work was not left behind.
- The baseline was put in production's physical column and index order (columns added by `db push` over time sit at the end of their tables), so a database built from migrations dumps byte-identical to production. Prisma ignores column order; future tooling may not.

### Implications
- Never add a schema-writing command to an install hook, `build`, `build:app`, `vercel-build`, `vercel.json`, or any workflow. `src/lib/__tests__/build-safety.test.ts` fails if one appears. The Vercel dashboard's Build/Install Command overrides must stay off — an override would bypass the gate.
- **Current builds are safe; old commits are not.** Builds of `3798482` or any later commit are safe: they run only the read-only gate. Rebuilding a commit **older than `3798482`** still runs `prisma db push` (a push to a stale branch → dev database; Vercel's Redeploy on an old Production deployment → production).
- **Rollback means reusing an existing deployment** (Vercel Instant Rollback / Promote), which rebuilds nothing. Never roll back by rebuilding an old commit, and never by restoring `db push`.
- **Reverting the PR that introduced this restores `db push` on every deploy.** To disable the gate in an emergency, set `vercel-build` to `npm run build:app` in a new commit instead.
- A new environment or database must be baselined (or built with `prisma migrate deploy`) before a Vercel build can succeed against it.
- Never edit an applied migration — the gate compares checksums and blocks. The baseline's checksum is pinned in the guardrail test.
- `prisma migrate status`/`deploy` compare history rows only. Schema equivalence is checked separately (`db-migrate.mjs`'s drift check; CI's **Migrations** job for `schema.prisma` vs migrations).
- An index on a long string column must declare its prefix length in `schema.prisma`.
- Local `.env` (changed 2026-10-06): `DATABASE_URL` is the dev database; production is under `PRODUCTION_DATABASE_URL`, read only by the operator command when named explicitly. Bare `prisma migrate dev` / `db push` / `migrate reset` are still not to be run — they would alter the shared dev database. Use `npm run db:migrate -- new` (loopback only).
- The **Migrations** CI check uses a throwaway MariaDB container and is a required check on `main` since 2026-10-06, alongside the original four.
- **`_prisma_migrations` is permanent.** Dropping it, restoring a production dump, or putting `db push` back into a build are not routine rollbacks; each needs explicit Owner approval.
- Operational follow-ups, not part of this decision's completion: migrations run from the Owner's Mac only (single point of dependence), and the DEC-012 connectivity question is still open.
- MariaDB DDL is not transactional: a failed migration can be partly applied, and rolling the application back does not undo a migration. Recovery is manual and documented in the runbook.

### Supersedes
Amends [DEC-017](#dec-017--cis-build-job-compiles-the-app-only-database-sync-stays-vercel-only-and-every-route-tree-code-path-must-tolerate-a-build-time-db-outage) (its "database sync stays Vercel-only" half — the CI-isolation half stands). Updates the build-command guidance in [DEC-013](#dec-013--dev-and-production-use-separate-hostinger-databases-smtpstripeblob-stay-shared) and [DEC-022](#dec-022--unfinished-checkouts-are-recorded-before-the-booking-exists-and-alerted-after-10-minutes-via-vercel-cron-add_payment_info-is-a-funnel-step-not-a-key-event).

## DEC-027 — Guest advance notice is a separate policy layer, set per listing, in Manila time; a short grace applies only at final submission

Date: 2026-10-12
Status: Active — **Owner-approved 2026-10-12; complete and live on production the same day** (PR #74 `a372f1a`: rule, migration on dev and production; PR #76 `bc3bd40`: admin Booking Settings and picker `min`). All 5 listings are set to same day with an 11:30 PM cutoff.
Area: Website

### Decision
- **Today floor.** The server refuses a guest check-in earlier than today in `Asia/Manila`, for every payment method. Both date pickers use the Manila date.
- **Per-listing settings.** `Property.advanceNoticeDays` (0, 1, 2, 3 or 7; default 0) and `Property.sameDayCutoffMinutes` (minutes after Manila midnight, null = none; applies only when notice is 0). The Owner chose per listing over one setting per house (2026-10-12). Defaults change nothing except the today floor.
- **Where the rule lives.** `src/lib/booking-policy.ts`, pure and clock-injected. It is called by the three guest routes (`/api/stripe/payment-intent`, `/api/checkout-attempts`, `/api/bookings`) and the public `/api/availability/[slug]`. It is **not** in `computeBookingQuote` or `src/lib/availability.ts`.
- **Grace.** Payment-intent and checkout-attempt calls enforce strictly. The final `POST /api/bookings` lets a guest through who reached the payment screen before a deadline and submits within 30 minutes of it (Owner-approved length), measured from the verified PaymentIntent's creation (card) or the linked `CheckoutAttempt` (GCash/BPI). The today floor has no grace.
- **Card paid outside the grace window** follows DEC-024 policy 5: no booking, guest gets the payment reference, admin gets one alert, no automatic refund.

### Reason
- The only guard against a past check-in was the date picker, and it used the UTC date, so from 12:00 AM to 7:59 AM in Lipa it offered yesterday; the server accepted any date whose nights were free.
- `computeBookingQuote` also prices the admin reference quote, and the availability service backs admin amendments, reactivation of cancelled bookings and the iCal export. An admin action must never be subject to guest advance notice.
- A guest can reach payment before a cutoff and finish after it. Refusing then strands a payment already made.
- The earliest check-in depends on the time of day, so it is served by a route and never baked into a cached page ([DEC-005](#dec-005--cache-the-query-not-the-response-a-page-cannot-set-its-own-cache-control-on-vercel)).

### Implications
- These are rules for direct bookings only. Airbnb's advance notice is configured in Airbnb; iCal feeds carry dates, never policies.
- Any new guest route that prices or saves a stay must call `assertBookingPolicy`. Admin routes must not.
- `assertBookingPolicy` returns a typed outcome (`ok` / `too_soon`). Instant Booking adds `requires_approval` there; callers switch on `code`.
- Settings are edited in Admin → Edit Property → Booking Settings and validated by `parseBookingPolicyInput`: notice 0/1/2/3/7 days; cutoff every half hour from 6:00 AM to 11:30 PM or none (the Owner's first choice, 11:30 PM, set the range). The copy-to-house helper writes the same two values to the other listings in the inventory group; each changed listing gets an `AdminLog` entry.
- The cutoff minute itself is already too late (a 10:00 cutoff closes tonight at 10:00). The grace window also covers a notice period rolling over at midnight.
- Route tests that post a stay must pin the clock; a fixed past date is now refused.
- Schema change ships migrate-first ([DEC-026](#dec-026--deployments-never-change-the-schema-migrations-are-version-controlled-applied-by-an-operator-and-enforced-by-a-read-only-release-gate)): `20261012184848_add_property_advance_notice`, additive.

### Supersedes
None

---

## DEC-028 — Instant Booking is per listing; a booking request holds no dates until it is paid, and is paid through a link after approval

Date: 2026-10-12
Status: Active — Owner-approved 2026-10-09 (design) and 2026-10-12 (open decisions). **Live on production since 2026-10-13 00:49 UTC** (PR #78, merge `206dbde`; migration on dev and production). All 5 listings are On. Owner acceptance test not yet run; no listing has been switched to Off.
Area: Website

### Decision
- **Mode per listing.** `Property.instantBookingMode`: `on` (default; the site's behaviour until now), `off` (every booking is a request the Owner approves first), `auto` (instant for trusted guests only; stored but not offered until guest verification exists).
- **Seven statuses.** `requested`, `approved`, `pending`, `confirmed`, `declined`, `expired`, `cancelled`. `BLOCKING_BOOKING_STATUSES` stays `["pending", "confirmed"]`: a request (`requested`/`approved`) never blocks the calendar, sibling listings or the Airbnb export.
- **Approval is permission to pay, not a hold.** Approving re-checks availability and emails a payment link. Dates are claimed, under the inventory lock ([DEC-024](#dec-024--every-write-that-claims-nights-takes-the-inventory-lock-a-booking-amendment-is-one-transaction-and-keeps-the-agreed-price)), only when the guest pays: GCash/BPI "I've Paid" → `pending`; verified card → `confirmed`.
- **Time limits.** A request waits 24 hours for a decision; a payment link is valid 24 hours. Both end sooner at the listing's booking deadline for that check-in ([DEC-027](#dec-027--guest-advance-notice-is-a-separate-policy-layer-set-per-listing-in-manila-time-a-short-grace-applies-only-at-final-submission)). Advance notice applies to a request exactly as to a booking.
- **Unverified payment.** A GCash/BPI booking still `pending` 24 hours after "I've Paid" raises one admin alert. Nothing is released automatically.
- **No confirmation without payment.** The admin status control cannot approve, decline, or move an approved request to `pending`/`confirmed`. `declined` and `expired` are final.
- **Correct, then approve.** An unapproved request may have its guests, dates or listing changed, and its total is re-quoted. A booking that already holds dates still keeps its agreed price (DEC-024 unchanged).
- **Refund for a lost race.** Card: existing paid-but-unavailable handling. GCash/BPI: refused, guest told, `AdminLog`, one alert; the Owner refunds by hand.

### Reason
- The Owner wants to vet some stays before taking money, without blocking the calendar for guests who never pay. A request that held dates would let anyone block a house for free.
- A submitted GCash/BPI payment must hold dates, or a guest who has paid could lose them to someone else while the payment waits to be verified (the booking #140 situation, [DEC-022](#dec-022--unfinished-checkouts-are-recorded-before-the-booking-exists-and-alerted-after-10-minutes-via-vercel-cron-add_payment_info-is-a-funnel-step-not-a-key-event)).
- A payment link, not a card hold at request time: a hold works only for cards, ties up money for a request that may be declined, and would change payment verification for every card booking. Additional charges already use pay-by-link.
- `Booking.status` is a string and the blocking list is an allowlist, so the new statuses needed no change to existing rows and are non-blocking by default.

### Implications
- **Amends [DEC-002](#dec-002--availability-is-centralized-in-one-service-blocking-statuses-are-pending--confirmed):** `pending` now means "GCash/BPI payment submitted, awaiting verification", never "unpaid request". The blocking list itself is unchanged.
- Code that reads `Booking.status` must not treat "not cancelled" as "a real booking". Use `bookingBlocksAvailability`, `isOpenRequest` or `isClosedBooking` from `src/lib/booking-status.ts`.
- The guest payment routes (`/api/stripe/payment-intent`, `/api/checkout-attempts`) refuse a listing that requires approval, so approval cannot be bypassed by calling them directly. A card intent for an approved request is created only from its payment token (`kind: "booking_payment"`).
- A request's stored total excludes the card fee; the payment link adds it. A promo code's use is counted when the request is paid.
- GA4: a request fires `booking_request` (not a key event). `booking_confirmed` and `purchase` fire on the payment-link page. `/pay/booking/<token>` is redacted from `page_location`.
- New admin routes enforce `checkPermission("bookings")`. The older admin routes still check only for a session (Next #17).
- `Booking.stripePaymentIntentId` is now unique, closing the residual race in [DEC-020](#dec-020--bookings-are-confirmed-only-after-server-side-pricing-and-stripe-paymentintent-verification-the-client-never-sets-the-amount).
- A listing switched while a guest is mid-checkout: On → Off still takes a verified card payment, or a GCash/BPI guest who reached the payment screen within 2 hours, as an instant booking. Off → On refuses a request from a stale form and sends the guest to payment.
- Migration `20261012223750_add_instant_booking_requests`, additive, migrate-first ([DEC-026](#dec-026--deployments-never-change-the-schema-migrations-are-version-controlled-applied-by-an-operator-and-enforced-by-a-read-only-release-gate)).

### Supersedes
None. Amends DEC-002 (meaning of `pending`).

---

## DEC-029 — Haven AI answers only from tool results, ships flag-off by default, and is capped and killable

Date: 2026-10-14
Status: Active — built on `feature/haven-ai-h1-101426`, `HAVEN_AI_ENABLED` unset in every environment at merge time (default OFF). Implementation refined 2026-10-14 on `fix/haven-ai-polish-101426` and again on `fix/haven-ai-guardrails-101426`, 2026-10-15 on `fix/haven-ai-freetext-reset-101526`, 2026-10-16 on `fix/haven-ai-checkout-date-101626`, 2026-10-22 on `hil-pm/haven-property-list-102226`, 2026-10-23 on `hil-pm/haven-listing-grouping-102326` and `hil-pm/haven-sikat-102326`, 2026-10-23 on `hil-pm/haven-wording-102326`, and 2026-10-26 on `hil-pm/haven-socials-102626` (not new decisions — see notes below).
Area: Website

### Implementation note (2026-10-26 "social links" fix — addendum)
Production incident, same day: asked "San ang mga social medias nyo", Haven only pointed to
Messenger — the system prompt had never told her about any other official channel, so
Messenger (the one URL she's always allowed to write out) was the only thing she *could*
offer. Separately, the owner also saw a reply render literally as `**Messenger**` in the
admin transcript viewer. Closed without changing the decision itself, same tool-only-facts
philosophy — a prompt instruction plus an independent post-processing backstop:
- **The social-profile list is sourced from the footer's own config, not duplicated.**
  `system-prompt.ts`'s new `SOCIAL_LINKS_RULE` imports `SOCIAL_LINKS` from
  `src/lib/social-links.ts` — the exact same config `Footer.tsx`, the homepage CTA row, and
  the `LodgingBusiness`/Person `sameAs` schema already read from ([DEC-030](#dec-030--no-individual-airbnb-listing-link-anywhere-footer-social-row-is-facebookinstagramtiktokyoutube-only-the-blogs-broken-airbnb-vanity-link-repoints-to-direct-booking))
  — so the chat assistant can never drift from the footer's list, and Airbnb (deliberately
  absent from that config) is excluded here too. The rule tells the model to list EVERY
  profile plainly with its exact URL, in the guest's language, whenever asked about socials
  or a named platform (Facebook/Instagram/TikTok/YouTube/Messenger/etc.) — never only
  Messenger, never an invented account or URL.
- **The literal-URL ban now has a second exception.** `system-prompt.ts`'s existing "never
  write a URL in your reply text" rule previously carved out only the Messenger handoff; it
  now also exempts the official social links rule, since stating "San ang mga social
  medias nyo" plainly with real URLs requires writing them out.
- **The link guard would have silently defeated this anyway — now it doesn't.**
  `post-process.ts`'s `isAllowedHref` (markdown-link allowlist) and `stripBareUrls`'s bare-URL
  exemption (previously Messenger-only) both gained `isOfficialSocialUrl()`, matching a
  social URL loosely (scheme/`www.`/trailing-slash-insensitive) against the same
  `SOCIAL_LINK_URLS`. Without this, every social URL except Messenger was being stripped out
  of the reply as an unrecognized bare URL even if the model correctly named all four — this,
  not a missing fact, was the dominant cause of the reported bug. A new
  `ensureSocialLinkButtons()` (same pattern as `ensureHandoffLink`) adds a button for any
  platform the reply names, wired into `chat-service.ts` right before `ensureHandoffLink`.
- **Rendering finding: the live chat bubble already renders `**bold**` correctly; the admin
  transcript viewer didn't.** `ChatMessage.tsx` (the guest-facing bubble, used for both
  static-tree and AI-mode replies) already had a correct `**bold**` → `<strong>` parser —
  investigation found no path where it mis-renders a well-formed bold run. The actual literal
  `**Messenger**` the owner saw was in a *different* component: the admin transcript viewer
  (`src/app/admin/haven-chats/[sessionId]/page.tsx`) rendered stored `HavenChatTranscript`
  content as a raw text node by explicit design ("Plain text only... never HTML"), so any
  `**bold**` in a stored reply showed as literal asterisks there. Fix: extracted the chat
  bubble's existing parser into a shared `src/lib/chat/render-markdown-bold.tsx`
  (`renderMarkdownBold`) and reused it in the transcript viewer too — chosen over stripping
  `**` in post-processing, since the masked, stored transcript content is meant to reflect
  what the model actually said, and the existing parser only ever builds `<strong>`/`<br/>`
  React elements (never `dangerouslySetInnerHTML`), so reusing it adds no HTML-injection
  surface.
- Tests: `social-links.test.ts`/`isOfficialSocialUrl`/`isAllowedHref`/`stripBareUrls`
  (every owner-approved URL survives, an unrelated "facebook-looking" URL doesn't, Airbnb
  rejected), `ensureSocialLinkButtons` (button per named platform, no duplicate, no Airbnb),
  `system-prompt.test.ts` (rule lists every `SOCIAL_LINKS` entry, Airbnb absent from the rule
  text, Messenger framed as one-of-several), and a new `render-markdown-bold.test.ts`
  covering the exact failing shape (a bulleted social list with bold headings) plus the
  no-HTML-injection guarantee. Full suite green (213 files, 4,458 tests, 20 new); `tsc
  --noEmit` and `eslint` clean on every changed file.

### Implementation note (2026-10-23 "5 listings"/"titingnan"/"kasya hanggang N tao" wording pass — addendum)
Owner correction, same day (Cedric): three small guest-facing wording issues bundled into
one pass, same tool-only-facts philosophy, same prompt-instruction-plus-independent-backstop
pattern as the "sikat sa inyo" and Bella Vita notes above — closed without changing the
decision itself:
- **"5 listings," never "5 properties."** Haven's own `PROPERTY_OVERVIEW_RULE` already used
  "listings" almost everywhere, but nothing explicitly banned the model saying "5
  properties"/"five properties" instead — now banned outright, in English and Tagalog/
  Batangueño alike. **`system-prompt.ts`:** `PROPERTY_OVERVIEW_RULE` gained a trailing
  sentence naming the rule. **`post-process.ts`:** new `fixFivePropertiesWording()` — a
  case-insensitive `/\b(5|five)\s+properties\b/` swap to "5 listings"/"five listings" (the
  number token is left as written; only "properties" → "listings" swaps, case preserved).
- **"Titingnan," never the typo "titigingan."** Haven generated "titigingan" — a misspelling
  of "titingnan" (will look at/check) that doesn't appear anywhere in this prompt's own
  Tagalog/Batangueño text (including the few-shot block), so it's a model-generated typo, not
  something learned from here. **`system-prompt.ts`:** new `TITINGNAN_SPELLING_RULE`.
  **`post-process.ts`:** new `fixTitiginganTypo()`, a straight word-level swap preserving
  capitalization.
- **"Kasya hanggang N tao," never "umabot sa/ng N guests/tao."** Haven stated a listing's max
  capacity as "umabot sa 15 guests" — "umabot" means "to reach/arrive at," so the phrase
  misreads as how many guests have already arrived rather than how many the listing can
  hold. **`system-prompt.ts`:** new `MAX_GUESTS_PHRASING_RULE` naming "kasya hanggang N tao"
  (fits up to N people) as the correct phrasing. **`post-process.ts`:** new
  `fixUmabotGuestsPhrasing()` — matches `/\bumabot\s+(?:sa|ng)\s+(\d+)\s+(?:guests?|tao)\b/`
  and rewrites to "kasya hanggang N tao," keeping the captured number and preserving
  capitalization.
- **`chat-service.ts`:** all three wired into the post-process chain right after
  `fixBellaVitaMiscount()`, in the order above, before the access-leak scrub.
- Tests: `post-process.test.ts` (one `describe` block per backstop — EN/Tagalog phrasing,
  capitalization preserved, no-op on already-correct text, unrelated numbers/words left
  alone), `system-prompt.test.ts` (prompt bans each phrasing and names the replacement,
  few-shot block carries none of the three). Full suite green (51 files, 1,953 tests);
  `tsc --noEmit` clean. Committed, not pushed, no PR (task constraint for this session).

### Implementation note (2026-10-23 "sikat sa inyo" ban — addendum to the 2026-10-16 plain-Tagalog pass)
Owner incident (Cedric, 2026-10-23): Haven asked "Anong sikat sa inyo, o ilang guests ang
dadalhan ninyo?" — "sikat sa inyo" (and the "sikat sa iyo"/"sikat sa'yo" variants), meaning
"what appeals to you"/"which do you like," is not a real Tagalog/Batangueño idiom a local
host would use. Same philosophy as the 2026-10-16 plain-language pass below (tutuklasin):
a prompt instruction plus an independent post-process backstop, closed without changing the
decision itself. "Tinutulungan kita mamili" (a legitimate existing phrase) and a standalone
"sikat" (e.g. "sikat na kainan," a popular restaurant) are unaffected; no greeting/opener
text was touched.
- **`system-prompt.ts`:** `PLAIN_LANGUAGE_RULE` gained a clause banning "sikat sa
  inyo"/"sikat sa iyo"/"sikat sa'yo" for "what appeals to you," naming "Ano ang type
  ninyo?"/"Alin ang gusto ninyo?" as the plain replacements, right next to the existing
  tutuklasin ban.
- **`post-process.ts`:** new `replaceSikatSaInyo()` — the "anong"/"ano ang" + "sikat sa
  inyo/iyo/'yo" question form (the exact incident phrasing) maps to "ano ang type ninyo";
  any other "sikat sa inyo/iyo/'yo" occurrence maps to "gusto ninyo." Both regexes require
  "sikat sa" immediately before the pronoun, so a bare "sikat" never matches.
- **`chat-service.ts`:** wired right after `replaceTuklasinFamily()`, before
  `simplifyDeepTagalogWords()`, same post-process chain position as the other plain-language
  backstops.
- Tests: `post-process.test.ts` (exact owner sentence, the "ano ang"/"anong" question form,
  the generic fallback, "sikat na kainan" and "Tinutulungan kita mamili" left untouched),
  `system-prompt.test.ts` (prompt bans the phrase and names both replacements, few-shot block
  carries no "sikat sa"). Full suite green (210 files, 4,326 tests); `tsc --noEmit` and
  `eslint` clean. Committed, not pushed, no PR (task constraint for this session).

### Implementation note (2026-10-23 Bella Vita grouping correction)
Owner correction, same day (Cedric): the 2026-10-22 property-overview fix's own
"two-building" color fact — "Block 34 (Cozy 1BR + Spacious 2BR)" and "Block 38 'Mickey in
Lipa'" — led Haven to say things like "2 Bella Vita properties" or "two in the Bella Vita
subdivision," wrongly implying only some of the 5 listings share that subdivision. **All 5
listings are in the Bella Vita subdivision.** Corrected the grouping Haven uses in every
overview answer and in the per-turn listings note, without changing the underlying
inventory/physical-house model ([DEC-001](#dec-001--five-public-listings-are-two-physical-houses-capacity-claims-must-sum-per-house)
is unchanged — this is wording only):
- **New guest-facing grouping.** Both houses are now named "3 Mickey in Lipa listings" (the
  three `mickey-in-lipa-*` Sleeps-7/11/15 configurations) and "2 Original Haven in Lipa
  listings" (`cozy-1-bedroom`, `spacious-2-bedroom`) — short forms "Mickey in Lipa
  listings"/"Original Haven in Lipa listings" are fine. `system-prompt.ts`'s
  `PROPERTY_OVERVIEW_RULE` now states plainly that ALL 5 are in Bella Vita, bans ever
  implying only some/2 are there, bans calling either group (or any subset) "Bella Vita
  properties," and tells the model to prefer the new group names over "Block 34"/"Block 38"
  labels in a guest-facing reply — those block numbers aren't needed. The persona line at
  the top of the prompt also now names the subdivision ("two houses in the Bella Vita
  subdivision, Lipa City"). Tagalog/Batangueño keeps the same two group names (e.g. "3
  Mickey in Lipa listings at 2 Original Haven in Lipa listings, lahat nasa Bella Vita
  subdivision") — the Tagalog greeting/opener text itself was not touched.
- **The per-turn listings note is now grouped, not a flat list.** `chat-service.ts`'s
  `listingsContextNote()` splits the fetched `publicListings` by slug prefix
  (`mickey-in-lipa` vs. everything else) into two headed sub-lists — "Mickey in Lipa
  listings (3):" / "Original Haven in Lipa listings (2):" — and opens with "ALL of these
  are in the Bella Vita subdivision... never call either group... 'Bella Vita properties'."
  Per-listing lines (shortName, slug, bedrooms, maxGuests, "from ₱X/night") are unchanged.
- **A narrow, independent post-process backstop.** `post-process.ts`'s new
  `fixBellaVitaMiscount()` is a cheap substring swap (not a sentence drop) for exactly the
  two miscounted phrasings the Owner flagged — `/(?:2|two|dalawang)\s+(?:Bella\s+Vita\s+
  (?:properties|houses|listings)|in\s+the\s+Bella\s+Vita\s+subdivision)/gi` — rewritten to
  "listings in the Bella Vita subdivision." Wired into `chat-service.ts`'s post-process
  chain right after `stripSystemMentions()`. Deliberately narrow per the task's own
  instruction ("rewrite minimally — only if simple and safe") — it does not attempt to
  catch every possible miscount phrasing, only the two literal ones reported.
- `tools.ts`/`welcome-book.ts`/`owner-facts.ts` were checked for the same "Bella Vita =
  only some listings" implication — none found; their B34/B38 scoping language (house
  rules/how-tos/check-out steps staying B34-only) is about which listings have a detailed
  house manual, not about which share the subdivision, and was left unchanged as internal
  scoping, not guest-facing miscount.
- Regression tests: `system-prompt.test.ts` (grouping + all-in-Bella-Vita + no "two Bella
  Vita" + prefers group names over Block 34/38), `chat-service.test.ts` (listings note
  grouped under the two headings, all in Bella Vita, no miscount phrase), `post-process.test.ts`
  (`fixBellaVitaMiscount` — EN/Tagalog miscount phrasings rewritten, correct "all 5" and
  unrelated "two years" phrasing left untouched). Full suite green (210 files, 4,299 tests,
  27 new); `tsc --noEmit` and `eslint` clean. Committed, **not pushed, no PR** (explicit
  task constraint for this session).

### Implementation note (2026-10-22 property-overview fix)
Production incident, same day: asked "Hi, what properties do you have?", Haven ~50% of the
time skipped `list_properties` and invented an answer — only the two B34 units (Cozy 1BR
Haven, Spacious 2BR Getaway), with wrong capacities (2/4 or 4/6 instead of the real 5/9), and
once an invented price that the price guard then correctly replaced with
`FALLBACK_FEE_TEXT` ("For that fee, please ask us via Messenger") — but **inside a property
bullet**, where that fallback reads wrong. Root cause: the system prompt never required a
`list_properties` call for an overview question, `tool_choice` stayed `"auto"`, and
`publicListings` (already fetched every turn in `chat-service.ts` for property-name
pre-resolution) was never put into the model's context — only used for name resolution.
Closed without changing the decision itself, same tool-only-facts philosophy:
- **A per-turn listings context note.** `chat-service.ts`'s new `listingsContextNote()`
  builds a compact "Context (public listings, authoritative — already fetched this turn...)"
  system-prompt block from the `publicListings` already fetched that turn — one line per
  listing with `shortName`, slug, bedrooms, `maxGuests`, and "from ₱X/night". When the fetch
  failed or returned empty, the note says so plainly and instructs the model to call
  `list_properties` itself rather than guess.
- **A system-prompt rule.** `system-prompt.ts`'s new `PROPERTY_OVERVIEW_RULE`: never name,
  count, or describe properties/inventory from memory; always use the listings note or call
  `list_properties`; for any overview question (English or Tagalog/Batangueño) name every
  listing from that data, never only some; the two-building fact (Block 34 = Cozy 1BR +
  Spacious 2BR, Block 38 "Mickey in Lipa" = the three Sleeps-7/11/15 configurations) may be
  stated as true, owner-approved color, but never as a substitute for naming all 5 listings
  individually; never let a hallucinated/unverified price inside a property-listing bullet
  turn into the generic Messenger-fee fallback.
- **A forced tool call on round 0, for this one question.** A new `src/lib/haven/
  overview-intent.ts` (`isPropertyOverviewMessage()`) detects a plain property-overview
  question in the guest's latest message (EN: "what properties do you have", "list your
  properties", "how many properties"; TL/Batangueño: "anong property/properties meron kayo",
  "ano (ang) (mga) bahay ninyo", "ilang bahay/property meron kayo"). When it fires,
  `chat-service.ts`'s `runToolLoop()` passes a new `forceToolName: "list_properties"` to
  `provider.chat()` on round 0 only (never forced again on a later round, so the model can
  still finish normally once it has the real data). `provider.ts`'s `ChatRequest` gained
  `forceToolName?: string`, mapped to a single named `tool_choice` both providers support
  cleanly — Anthropic `{type: "tool", name}`, OpenAI `{type: "function", function: {name}}`
  — falling back to each provider's normal `"auto"` behavior when unset.
- **The price guard no longer clobbers a real base rate.** Two complementary fixes in
  `post-process.ts`/`chat-service.ts`: (1) `basePricesFromListings()` folds every fetched
  listing's own `pricePerNight` into both the price guard's `allowedAmounts` and
  `ensureFromPrefix()`'s `basePrices` set, so a reply built from the context note's data
  (rather than an actual `list_properties` tool call this turn) states the identical
  server-fetched price and is never wrongly treated as unverified. (2) `enforcePriceClaims()`
  now tells apart a property-listing rundown bullet from a true fee/total bullet via a new
  `RATE_CONTEXT` regex (`/night`, `/day`, `/guest` — moved out of `FEE_CONTEXT`, which now
  only matches `/hour`/`/hr`/"fee"/"charge"). A disallowed amount on a `RATE_CONTEXT` bullet
  with no fee/hourly wording drops just the price (`dropPriceFromBullet()`) instead of
  replacing the whole bullet with the Messenger-fee fallback, so the rest of the bullet (the
  property's name/capacity) still reaches the guest even when a hallucinated price can't be
  verified. An explicit "fee"/"charge" bullet, or an hourly one, is unaffected.
- Regression tests: `overview-intent.test.ts` (new, EN/TL detection), `provider.test.ts`
  (`forceToolName` → `tool_choice` mapping, both providers), `post-process.test.ts`
  (bullet price-drop vs. full-line fallback), `system-prompt.test.ts`, and
  `chat-service.test.ts` (listings note content, forced tool on round 0 only, an overview
  reply naming all 5 listings' real rates survives the guard, a hallucinated bullet price is
  dropped not fallback-replaced). Full suite green (4,185 tests, 44 new); `tsc --noEmit` and
  `eslint` clean.

### Implementation note (2026-10-15 owner-guardrails pass)
Cedric (the Owner) approved two more guardrails, closed without changing the decision
itself — same philosophy as the 2026-10-14 pass below: a prompt instruction alone is
guidance, not an enforcement boundary, so each gets an independent post-processing check
too:
- **Base/listing rates always read "from ₱X/night."** Whenever Haven states a base or
  listing nightly rate — a property's own `pricePerNight`, from `list_properties`, or a
  property rundown — it must say "from ₱X/night" (Tagalog/Batangueño: "simula ₱X kada
  gabi"), never a bare number, because rates can change. `system-prompt.ts` carries the
  rule; `post-process.ts`'s new `ensureFromPrefix()` is the independent backstop, using
  `collectBasePrices()` (every `pricePerNight` value in this turn's tool results) and
  `collectDatedQuoteAmounts()` (every other tool-result number) to tell a bare base rate
  apart from an exact `get_quote`/`find_stay` quote line that happens to equal it — the
  latter is always left exactly as the tool returned it, never prefixed.
- **Local places / how things work point to the printed Welcome Book.** For restaurants,
  food, groceries, nearby places, or how an appliance/house thing works, Haven points the
  guest to the printed "Welcome Book" in each house rather than answering from general
  knowledge — she never looks up or invents a named place online, though a tool result's
  own `neighborhoodPlaces` data may still be used when present. `owner-facts.ts` gained a
  dated fact bullet (Cedric, 2026-10-15) with two fixed facts Haven may state directly: an
  Alfamart right outside the subdivision, plus minimarts around the property.

### Implementation note (2026-10-15 owner-guardrails pass, part 2)
Cedric (the Owner) approved three more guardrails on the same `fix/haven-ai-freetext-reset-101526`
branch, closed without changing the decision itself:
- **Banned "can you afford it" phrasing → booking nudge.** Haven must never ask or imply
  anything that reads as questioning whether a guest can afford a stay — "Kaya mo na ba?",
  "Kaya n'yo ba?", "Can you afford it?", "within your budget", "kaya ba ng budget", and
  reorderings of the same Tagalog idiom are banned. `system-prompt.ts` carries the rule and
  names the required close after a quote: "Want me to help you book it?" (Tagalog: "Gusto
  n'yo na bang i-book?"; Batangueño: "Gusto n'yo na ga i-book?"). `owner-facts.ts`'s new
  `replaceBannedAffordPhrasing()` is the independent backstop, replacing a whole matching
  sentence/bullet with the booking nudge in the active language rather than leaving it in
  or silently dropping it — it runs in `chat-service.ts` BEFORE `stripBudgetQuestions()`,
  since "within your budget"/"kaya ba ng budget" would otherwise also match that guard's
  broader `budget` regex and get dropped instead of replaced.
- **B34 Welcome Book, scoped per property.** An owner-provided, already-sanitized excerpt
  of the B34 house manual ("BV-B34L21 House Manual v020325") is now a typed server-only
  module, `src/lib/haven/welcome-book.ts`, keyed by slug and returning content ONLY for the
  two B34 listings — Cozy 1BR Haven (`cozy-1-bedroom`) and Spacious 2BR Getaway
  (`spacious-2-bedroom`) — never the Mickey in Lipa (B38) listings. It's exposed read-only
  via `get_property_details`'s new `welcomeBook` field and a new `get_local_guide(slug?)`
  tool (`tools.ts`); both resolve an informal property name through the existing fuzzy
  fallback and never block the conversation on an unresolved slug. **Owner decision,
  2026-10-15:** Haven may recommend the Welcome Book's 10 restaurants and 13 attractions by
  name to B34 guests — a narrower exception to the 2026-10-14 "never invent a place" rule
  above, not a repeal of it; Haven still never looks up or invents a place beyond this
  fixed list, and the excerpt's own exclusions stay out of what Haven can ever say: no
  address, staff phone numbers/emails, the host family bio, the dialect page, or the bars
  list. For a B38 listing, or when no property is known yet, Haven still only points to the
  printed Welcome Book in each house plus the Alfamart/minimart owner facts, and must never
  generalize the B34 list to B38.
- **Wi-Fi and physical-access guard.** Haven must never share a Wi-Fi name/password, or a
  door/gate/lock/keybox code or other access detail, under any circumstance — even asked
  directly, even if one somehow appeared in a tool result or the model's own text.
  `src/lib/haven/access-guard.ts` is two independent layers, same tool-only-facts
  philosophy as the rest of this decision: (1) `isWifiOrAccessRequest` detects a direct
  ask in the guest's latest message (English, Tagalog, and Batangueño wording, e.g. "susi"
  for key) and `chat-service.ts` returns a deterministic safe reply with a Messenger button
  — the same skip-the-model pattern as the 24+ guest handoff — without ever calling the
  model; (2) `scrubAccessLeak` is a post-generation backstop that replaces any whole
  sentence reading like a leaked SSID/password/door-code with the same safe sentence,
  regardless of how it got into the model's reply, and forces the Messenger button on when
  it fires. `system-prompt.ts` and `owner-facts.ts` both carry the prompt-level rule too.
  `welcome-book.test.ts` and `access-guard.test.ts` assert the welcome-book content and
  every guarded tool output stay free of "wifi", "password", phone numbers, and emails.

### Implementation note (2026-10-15 owner-guardrails pass, part 3 — amends part 2's Welcome Book scoping)
Later the same day, Cedric (the Owner) overrode the Welcome Book scoping decided in part 2
above — same day, same branch, closed without changing the decision itself:
- **Restaurants and things-to-do are now global, not B34-only.** The Welcome Book's 10
  restaurants and 13 attractions apply to EVERY public listing, including the Mickey in
  Lipa (B38) houses — Haven says these are "from our Welcome Book" and may combine them
  with a listing's own `neighborhoodPlaces` tool data when present. `welcome-book.ts`'s
  `getWelcomeBook(slug)` now always returns these two lists, for any slug (even one that
  doesn't resolve), instead of returning `null` outside the B34 pair.
- **House rules, how-tos, and check-out steps stay B34-only.** These three fields remain
  `null` for every listing except the two B34 slugs (`cozy-1-bedroom`, `spacious-2-bedroom`)
  — never generalized to a B38/Mickey listing or any other property, per the excerpt's own
  scope. `get_local_guide`'s messaging and `owner-facts.ts`'s prompt bullet were both
  updated to state the lists/house-info split explicitly; the excerpt's exclusions (no
  address, phone numbers, emails, bars list, dialect page) are unchanged.

### Implementation note (2026-10-14 owner-guardrails pass)
Cedric (the Owner) reviewed H1's live behavior and approved a set of additional facts and
guardrails, closed without changing the decision itself — see `src/lib/haven/owner-facts.ts`
for the single server-side source of these facts, sourced and dated "Cedric, 2026-10-14":
- **Never ask the guest's budget.** Prompt rule plus `stripBudgetQuestions()` drops any
  sentence asking it regardless.
- **Capacity is 24 guests combined, across both houses, and counts adults.** There is no
  documented age policy for kids/babies — Haven must never claim they're free or don't
  count, and must never promise flexibility for a 24+ guest group, squeezing in extra
  people, or an extra bed/mattress. `needsCapacityHandoff()`/`ensureCapacityHandoffLink()`
  force the Messenger button on for any of those triggers, independent of the model's own
  wording; `removeKidsFreeClaims()` replaces a wrongful "kids are free/uncounted" claim
  with a Messenger-confirmation sentence.
- **Full payment is due at booking** — no half payment, no deposit-to-reserve. Stated
  directly from the owner-facts prompt block, the same tool-only-facts exception the price
  guard now carries for exactly one other number (below).
- **Early check-in/late checkout is ₱200/hour, every listing, subject to availability.**
  `OWNER_FACT_ALLOWED_AMOUNTS` (`{200}`) is merged into the price guard's allowlist in
  `chat-service.ts` so this fact can be stated even without a tool call this turn. A new
  read-only tool, `check_early_late(slug, date, kind)`, answers a date-specific question
  from `getInventoryScopeConflicts()` — the same commit-time availability check the
  booking flow uses — returning `likely_possible`/`not_possible`/`unknown`; Haven is
  instructed to never treat `likely_possible` as a promise.
- **Quiet hours (10 PM–8 AM) and the other house rules that are identical everywhere** (no
  pets, no smoking inside, no parties/events without approval) get a direct general answer
  instead of "which house?" — only a genuinely differing rule (e.g. check-in time) still
  names the difference per listing.
- **Karaoke/equipment questions answer only from `amenities`/`amenityDetails`** — marketing
  copy (e.g. "a karaoke-and-lechon dinner" in `bestForSegments`, which `get_property_details`
  never exposes to the model) must never be read as a confirmed-equipment claim.
- Two Tagalog/Batangueño language fixes: never ask "ilang guests ang dadalaw" (dadalaw =
  "to visit", confusing for a staying headcount) — `fixDadalawPhrasing()` rewrites it to
  "Ilang guests kayo?"/"Ilan ga kayo?" — and an English reply must never mix in a stray
  Tagalog word (`isEnglishContext()`/`stripTagalogWordsInEnglish()`).
- Two reply-quality fixes carried over from the same review: `shortenPropertyNamesInText()`
  applies the existing link-label name shortener to reply **text**, not just link labels;
  `firstResolvedDateRange()`/`ensureDatesStated()` make an English reply state its resolved
  dates explicitly even when the model's own prose omits them.

### Implementation note (2026-10-14 polish pass)
Live dev testing of H0+H1 surfaced three implementation gaps in the guardrails this decision
already calls for, closed without changing the decision itself:
- `enforcePriceClaims()` (`src/lib/haven/post-process.ts`) now replaces the **whole sentence
  or bullet line** containing an unverified ₱/PHP amount, not just the number — the old
  substring replacement could leave a grammatically broken fragment (e.g. a dangling
  "/hour"). The replacement text is now fee-vs-total aware: a rate/fee context ("/hour",
  "fee", "charge") gets "For that fee, please ask us via Messenger (m.me/haveninlipa)."; a
  stay total gets the original "You'll see the exact total at checkout." `get_quote` and
  `get_property_details` (`src/lib/haven/tools.ts`) were extended with `name` and a
  structured `fees` object respectively so a real fee number is traceable through the same
  allowlist whenever one exists.
- Booking links a tool actually produced (`get_quote`, `find_stay`) are now always returned
  as link buttons (`collectBookingLinks()`), independent of whether the model formatted one
  as a markdown link in its prose — the prior implementation only ever surfaced a link the
  model itself wrote out. Same with the Messenger handoff (`ensureHandoffLink()`): any
  mention of m.me/haveninlipa, however phrased, now always produces a button.
- `system-prompt.ts`'s Batangueño (`btg`) mode gained a placeholder-only few-shot block
  (no real prices/dates, so an example can never leak as a fact) and the hard rules gained
  explicit-date, neutral-address, and "provisional"-once instructions, the last backed by a
  post-process dedupe (`limitToOneProvisional()`).

### Decision
- **Off by default, two independent switches.** `HAVEN_AI_ENABLED` must read exactly `"true"` to turn Haven's AI mode on anywhere; anything else (unset, `"false"`, a typo) is OFF and the chat widget behaves exactly as it did before this decision — the static `chat-tree.ts` flow, unchanged. `HAVEN_AI_KILL=true` forces static even when enabled, for an incident with no deploy. Both are read in `src/lib/haven/config.ts`.
- **Tool-only facts.** The model (`src/lib/haven/system-prompt.ts`) is instructed to state a price, date, or availability only from a tool result returned that same turn, and two independent server-side checks enforce it regardless of what the model actually says: `src/lib/haven/post-process.ts` replaces any ₱/PHP amount not present in that turn's tool outputs with "You'll see the exact total at checkout," and strips any link that isn't a relative site path, `haveninlipa.com`, or `m.me/haveninlipa`. Every tool in `src/lib/haven/tools.ts` calls an existing service (`computeBookingQuote`, `getPropertyConflicts`, `getPublicListings`, …) — nothing in the AI path computes a price or availability decision itself, so it can never drift from the booking path ([DEC-020](#dec-020--bookings-are-confirmed-only-after-server-side-pricing-and-stripe-paymentintent-verification-the-client-never-sets-the-amount)).
- **Provider adapter, not a hard Anthropic dependency.** `src/lib/haven/provider.ts` is a small `fetch`-based adapter (no SDK dependency) behind `HAVEN_AI_PROVIDER` (`anthropic` default, `openai` alternative) and `HAVEN_AI_MODEL` (defaults to a current Claude Haiku model — cheap enough that the per-guest-message cost stays well under the rate limits below).
- **Spend cap and durable rate limits, enforced in the database, not in memory.** `HavenChatUsage` holds one row per guest message (summed across any internal tool-call rounds), so a plain row count under a window IS the message count the limiter checks: 20/10 min and 100/day per hashed IP, 600/hour globally (`src/lib/haven/rate-limit.ts`). A running monthly total (Asia/Manila calendar month) against `HAVEN_AI_MONTHLY_CAP_USD` (default $20) falls back to static with `reason: "cap"` once exceeded, and sends **at most one** admin alert per month (a zero-cost marker row prevents a resend without a second table).
- **Transcripts are masked before they are ever written, and expire.** `HavenChatTranscript` stores the guest/Haven turns for product improvement, but `src/lib/haven/masking.ts` strips emails, PH phone numbers, and card-like digit runs from the text *before* the `INSERT` — the raw guest message never reaches the database. `/api/cron/haven-retention` (daily, Vercel Cron) deletes transcripts older than 90 days and usage rows older than 13 months.
- **Language is explicit, not inferred from the request's `Accept-Language`.** The guest (or `auto`, mirroring their own words including Taglish) picks `en` / `tl` / `btg` from a toggle in the widget; `btg` is Tagalog with Batangueño expressions, not a separate translation pipeline.
- **The route never 500s to the guest.** `POST /api/haven/chat` degrades to `{mode: "static"}` (optionally with a `reason`) on a disabled flag, a validation failure, a rate limit, the monthly cap, a provider error, or a timeout — the widget's existing static tree is always a safe fallback, never an error state the guest sees.

### Reason
Adding a free-text LLM surface to a live booking site risks three distinct failure modes if left unconstrained: a hallucinated price or date reaching a guest, an unbounded API bill, and guest PII sitting in a database indefinitely. Each got its own independent, server-side control rather than relying on prompting alone — a system prompt is guidance, not an enforcement boundary, and the post-processing/rate-limit/masking layers in this decision hold even if the model ignores its instructions. Haiku (not a larger model) was chosen because this is a chat-widget FAQ/availability surface, not a reasoning-heavy task, and the cost difference compounds directly against the monthly cap. `fetch` over either vendor SDK was chosen so one file covers both wire formats without taking on two SDKs' update cadence for a flag that defaults off.

### Implications
- Any future Haven AI tool must call an existing service function, never compute a number itself — extending `src/lib/haven/tools.ts` means adding a thin, zod-validated wrapper, not new pricing/availability logic.
- A new payment, booking-creation, Stripe, or admin write path must never be exposed as a tool — H1 is read-only by design; see Next steps below for the planned H2 scope.
- Changing the default model or provider is an env var change (`HAVEN_AI_MODEL`, `HAVEN_AI_PROVIDER`), not a code change, but the per-model price map in `src/lib/haven/config.ts` must be kept current or the monthly cap accounting silently uses the wrong rate.
- `HavenChatUsage`/`HavenChatTranscript` are additive tables (migration `20261014120000_add_haven_chat_ai`) — ships migrate-first per [DEC-026](#dec-026--deployments-never-change-the-schema-migrations-are-version-controlled-applied-by-an-operator-and-enforced-by-a-read-only-release-gate). The Vercel build's release gate fails until an operator applies it (see the runbook).
- Turning the feature on in production is an Owner action: set `HAVEN_AI_ENABLED=true` plus the provider's API key in Vercel env vars. `HAVEN_AI_KILL=true` is the fastest incident response — no deploy, just an env var flip (Vercel env changes still need a redeploy to take effect for this Node-runtime route, so this is "fast," not "instant").

### Supersedes
None

---

## DEC-030 — No individual Airbnb listing link anywhere; footer social row is Facebook/Instagram/TikTok/YouTube only; the blog's broken Airbnb vanity link repoints to direct booking

Date: 2026-10-22
Status: Active. **`hil-seo` 1.1.10 deployed live to `blog.haveninlipa.com` on 2026-10-22 (~7:40 AM CT) via Hostinger** — the theme's broken `https://airbnb.com/h/haveninlipa` anchor now points to `https://haveninlipa.com/properties`. **Same-day follow-up (below) closes the "known remaining inconsistency" this entry originally flagged.**
Area: Website | Blog

### Decision
On `haveninlipa.com`: a site-wide footer social row (every page, via `src/components/layout/Footer.tsx`) lists exactly the four owner-approved profiles from `src/lib/social-links.ts` — Facebook, Instagram, TikTok, YouTube — never Airbnb. The homepage "Find Us Online" row (`src/components/sections/ContactForm.tsx`) drops its previously-hardcoded Airbnb icon. The `LodgingBusiness` JSON-LD `sameAs` (`src/lib/local-business-schema.ts`) is exactly those same four URLs, with no Airbnb entry. No individual Airbnb listing link (e.g. a specific `/rooms/<id>` or `/h/<vanity>` URL) is added anywhere on `haveninlipa.com`, full stop — this was raised as an open question in the 2026-10-10 marketing-measurement session (see `HIL_PROJECT_STATUS.md`'s then-current In Progress entry) and is now decided against.

On `blog.haveninlipa.com`: the theme's hardcoded Airbnb anchor (CTA section + footer `.social-links` block), `https://airbnb.com/h/haveninlipa`, is corrected via `hil-seo` 1.1.10's `includes/social-links.php` to point at `https://haveninlipa.com/properties` instead of a real Airbnb listing — chosen over fixing the vanity link to point at an actual listing (e.g. `https://www.airbnb.com/rooms/1132697739115508822`), consistent with "direct booking, not an Airbnb redirect" and with the main-site decision above.

### Reason
`https://airbnb.com/h/haveninlipa` is not a valid vanity link — resolving it (2026-10-22) shows it redirects to Airbnb's generic `https://www.airbnb.com/s/homes` search page, not any Haven in Lipa listing. It had been live, broken, on both the blog's CTA section and footer. Separately, the main site's `LodgingBusiness` `sameAs` had carried a single hardcoded Airbnb listing URL (`https://airbnb.com/h/fullhousebellavita`) since 2026-10-10 pending exactly this decision — HIL's whole product thesis is direct booking over OTA fees (DEC-007's "Airbnb alternative" framing, the BookingForm Airbnb-savings comparison), so routing any of the site's own social/schema surfaces back toward Airbnb, even a correctly-resolving one, cuts against that.

### Implications
- `src/lib/social-links.ts`'s `SOCIAL_LINKS`/`SOCIAL_LINK_URLS` remain the single source of truth for the four owner-approved profiles and deliberately exclude Airbnb (unchanged from their original 2026-10-16 design) — any new social-row or `sameAs` call site should read from there, never hardcode a fifth entry.
- ~~**Known remaining inconsistency, flagged for Cedric, not resolved by this decision:** the homepage "Ready to Experience Our Comfort?" CTA block (`src/app/page.tsx`) and the about-page Person JSON-LD `sameAs` (`src/app/about/page.tsx`) still hardcode `https://airbnb.com/h/fullhousebellavita` independently of `SOCIAL_LINKS`.~~ **Closed same day (2026-10-22 addendum below).**
- `hil-seo`'s Organization schema (`includes/schema.php`) has never included an Airbnb `sameAs` entry, so nothing changes there — only the two hardcoded theme anchors (CTA + footer) go through the `includes/social-links.php` rewrite.
- A future Airbnb-listing-link request (anywhere on either site) should be checked against this decision before implementing — it is a deliberate "never," not an oversight to "finish."

### Addendum, 2026-10-22 (same day, Owner-approved) — the two remaining hardcoded links closed
- **Homepage CTA block (`src/app/page.tsx`):** the hardcoded `fa-airbnb` icon linking to `https://airbnb.com/h/fullhousebellavita` is **dropped, not replaced** with an on-site icon. The block already carries two on-site CTAs immediately above the icon row ("Book Your Stay Today" → `/#properties`, "Browse Properties" → `#properties`), and every other social-icon row in the app (`Footer.tsx`, `ContactForm.tsx`) is `SOCIAL_LINKS`-only with no on-site entry mixed in — adding a fifth, non-social icon here would have been the inconsistent choice, not the fix. The row now reads `SOCIAL_LINKS.map(...)` directly, same as the other two call sites.
- **About page (`src/app/about/page.tsx`):** the Person JSON-LD `sameAs` array drops the hardcoded Airbnb URL; it is now `[...SOCIAL_LINK_URLS]`, matching `LodgingBusiness`'s `sameAs`. The "Airbnb Superhost" prose mention is unchanged — this decision (and DEC-030 generally) is about links/schema, not prose.
- Verified by grep: no `airbnb.com` href/URL remains anywhere in `src/` except (a) the admin `airbnbIcsUrl` calendar-import field placeholder (a functional iCal feature, not a marketing link) and (b) test fixtures asserting that Airbnb domains are *rejected* (Haven AI's link allowlist tests, the footer/CTA/about regression tests themselves).
- Tests: `src/lib/__tests__/social-links.test.ts` (source-text assertions for both files), `src/lib/__tests__/homepage-cta-social-links.test.ts` (new — renders the real `Home` page and asserts the icon row).

### Supersedes
The implicit gap left open by the 2026-10-10 marketing-measurement session ("Airbnb `sameAs` entry needs an Owner decision," `HIL_PROJECT_STATUS.md`) — now resolved as "no."

---

## Migrated SEO Decisions

Folded in verbatim (summary form; full text preserved) from the shared `/VSCode/seo`
workspace's `SEO_DECISIONS.md` on 2026-09-17, per `DEC-018` above. **Original identifiers
(`SEO-DEC-001`–`SEO-DEC-028`) are preserved exactly, not renumbered**, and kept in their
own section rather than merged into the `DEC-###` sequence above — they are SEO/content
decisions, not product/engineering architecture decisions, and mixing the two numbering
systems would make neither a reliable index. The full archived source is preserved at
[content/seo/archive/SEO_DECISIONS.md](../content/seo/archive/SEO_DECISIONS.md); this table
is a summary only.

| # | Status | Decision |
|---|---|---|
| **SEO-DEC-001** | Superseded (by SEO-DEC-005) | Strategic continuity for the 2026-05-31 audit: keep the existing 6-cluster tracker, no net-new strategy. |
| **SEO-DEC-002** | Active | Lodging competitor set redefined to OTAs (Airbnb, Agoda-type), not local accommodation operators. |
| **SEO-DEC-003** | Active | `/weddings-accommodation` positioned as accommodation for a wedding party, not a venue — no `EventVenue`/`Event` schema (schema owned at product level, [DEC-008](#dec-008--weddings-accommodation-and-staycation-carry-faqpage-schema-only)). |
| **SEO-DEC-004** | Active (C7) / Cluster 5 retired | New keyword cluster "C7 — Occasions & Groups" added for wedding/group/reunion content; Cluster 5 retired. |
| **SEO-DEC-005** | Active | Strategy pivot: high-intent money pages (wedding/staycation) added alongside the discovery content engine, which stops being expected to produce bookings directly. |
| **SEO-DEC-006** | Active | Content freeze on new blog articles (#30+) from 2026-09-15 — a measurement window, not a new approval gate. *(Expanded 2026-09-27:)* New articles #30+ are paused so the window can show whether the August 2026 booking-intent changes raise main-site click share (1.9% baseline). Edits to existing posts and to already-scheduled posts are not blocked. Articles #38–41 (posts 847–850, scheduled 2026-09-25) were a one-time Owner authorisation and did **not** lift the freeze. No end date: Cedric decides at the early-October 2026 re-baseline, after GSC monitoring ends 2026-10-03 (SEO-DEC-027). |
| **SEO-DEC-007** | Active | Article #6 consolidated into `/staycation` via redirect rather than left as a competing page (execution order per [DEC-010](#dec-010--content-consolidation-always-goes-build--repoint--redirect-in-that-order)). |
| **SEO-DEC-008** | Active | Thin auto-generated archive pages (tag/author/category with no unique content) get `noindex, follow`. |
| **SEO-DEC-009** | Active | The SEO Analyst never edits or deploys to either codebase directly through a repository; the one exception (direct WordPress content editing) is content operations, not codebase access. |
| **SEO-DEC-010** | Active — Amended by SEO-DEC-029 (2026-09-27) | Direct WordPress content editing: modifying an existing published post is allowed via REST API; creating a post is always saved as a draft (`WP_ALLOW_PUBLISH=false`). |
| **SEO-DEC-011** | Active | Standing content lens: "where to eat" → "where to stay," operationalizing SEO-DEC-005 as an ongoing weekly discipline. |
| **SEO-DEC-012** | Active | Keyword-to-URL mapping rule: configuration-rental transactional queries map to the property/booking page; branded/franchise-adjacent terms map to the content hub, not a property page. |
| **SEO-DEC-013** | Active | B34 check-in 2:00 PM / B38 "Mickey" check-in 3:00 PM; checkout 12:00 PM (noon) at both; ₱200/hr early-check-in/late-checkout policy confirmed for guest-facing copy. |
| **SEO-DEC-014** | Active | B34 Cozy 1-Bedroom capacity corrected to 5 guests for all guest-facing content. |
| **SEO-DEC-015** | Active | Guest-facing payment copy says "Credit/Debit Card," never "Stripe." |
| **SEO-DEC-016** | Active | Public FAQ omits security-deposit and ID/KYC questions until a formal policy exists — states neither that a deposit is required nor that none is. |
| **SEO-DEC-017** | Active | Public FAQ/Quick Reply content boundary: never publishes arrival procedures, lockbox/access instructions, door/gate codes, or Wi-Fi credentials. |
| **SEO-DEC-018** | Active | The "free rebooking 14+ days out" offer is removed from all guest-facing content (FAQ, chatbot), with no replacement wording promising case-by-case rebooking. |
| **SEO-DEC-019** | Complete — executed and verified live | SEO Analyst's WordPress account upgraded from Author to Editor role only (Administrator explicitly withheld). |
| **SEO-DEC-020** | Complete 2026-09-19 (corrected earlier the same day) | Custom `hil-seo` plugin uses WordPress core's own sitemap (`/wp-sitemap.xml`); Yoast's sitemap is retired with a redirect at cutover. The 2026-09-07 "Executed" status was premature (a live redirect loop was found 2026-09-19); the transition was completed correctly on 2026-09-19 — see SEO-DEC-026. |
| **SEO-DEC-021** | Complete — executed and verified live | 18 articles misattributed to legacy user "Cassandra Kim" reassigned to the "Haven" author account; only the `author` field changes (URLs/dates/content preserved). |
| **SEO-DEC-022** | Complete — executed this session | Keyword Master synced with 3 previously-untracked live articles (#30, #36, #37), also explaining the 34-live-vs-#1–35-numbering gap (#6 consolidated per SEO-DEC-007). |
| **SEO-DEC-023** | Complete 2026-09-19 | Unsupported "1 hour from Manila" claim removed from 3 meta descriptions; approved wording is in `hil-seo`'s tag, Yoast is now deactivated and the two approved strings truncated by the 158-char trim were replaced (verified 27/27 posts, 2026-09-19). |
| **SEO-DEC-024** | Active | SEO Analyst owns the complete `hil-seo` (Yoast-replacement) implementation directly on `blog.haveninlipa.com` — no Web Work Stream handoff for this project. |
| **SEO-DEC-025** | Resolved and executed | Cutover-flag flip (and everything downstream) requires Administrator — a third WordPress-imposed permission exception found during execution; resolved via an Administrator-only cutover screen Cedric operates directly. |
| **SEO-DEC-026** | Executed 2026-09-19 — Yoast deactivated, not deleted | Sitemap/robots cutover order corrected to a loop-free sequence (Redirection rule off → Yoast XML sitemaps off → verify `/wp-sitemap.xml` → rule on → purge → GSC → deactivate Yoast, never delete); `hil-seo` v1.1.2 supersedes the never-installed v1.1.1; Yoast deletion deferred (`Footer.tsx` reads `_yoast_wpseo_focuskw`). |
| **SEO-DEC-027** | Active (2026-09-19) | Owner decisions after the production verification: technical cutover formally closed; 11 truncated meta descriptions rewritten (150–158 chars, no ellipsis); revised archive-title format accepted; no OG/Twitter on noindex archives; Yoast stays installed but inactive (deletion needs separate Owner approval); monitoring until GSC shows `wp-sitemap.xml` Success and one clean crawl cycle; a verification checkpoint after each of the six scheduled posts publishes. |
| **SEO-DEC-028** | Decided 2026-09-19 (edits in one owner batch) | Blog claim-durability rules for posts 75/205/552: wrong or contradicted figures (400/500 Mbps vs the listings' 340, 1-hour/2-hour travel times, obsolete Mickey 5/9/13) removed or corrected; volatile hard-coded rates and fares made number-free; current capacities (Cozy 5, Spacious 9, Mickey 7/11/15), policy windows and the cost-per-head math retained; post 75 description rewritten; post 763 handled by checkpoint, not reopened. |
| **SEO-DEC-029** | Active (2026-09-27, decided by Cedric; new — not part of the 2026-09-17 migration) | Publishing of Owner-approved batches: after Cedric approves each batch, new articles are scheduled as WordPress `future` posts at 08:00 `Asia/Manila` and verified via REST (publish date, category, SEO fields). Amends SEO-DEC-010 for approved batches only — anything not approved still defaults to draft. The SEO-DEC-006 content freeze still applies separately. |
| **SEO-DEC-030** | Active (2026-09-27; task approved by Cedric; new — not part of the 2026-09-17 migration) | Venue/destination-intent queries (`wedding destination in lipa`, `wedding venue in lipa`, `intimate wedding venue lipa`) are targeted from `/weddings-accommodation` by answering the couple's real question — Lipa as a wedding destination, where the churches/venues are relative to the homes, and where the wedding party and guests stay — **never** by claiming to be a venue. Title/meta may use "wedding destination" and "venue(s)" only in a locational or negating sense ("near Lipa's churches and venues", "we're not the venue"); the page states plainly that HIL is not a venue; schema stays `FAQPage`-only (DEC-008, SEO-DEC-003 unchanged). Venue names and drive times come only from owner-verified data already in the repo. |
| **SEO-DEC-031** | Active (2026-09-30, decided by Cedric) | Blog `<title>` keeps the " - Haven in Lipa Blog" suffix only when the full title fits in 60 characters; otherwise the suffix is dropped, including from `hil_seo_title` overrides. Implemented in `hil-seo` 1.1.6 (`hil_seo_fit_title()`, filterable via `hil_seo_title_max_length`), live 2026-09-30. Post titles still over 60 characters on their own are an editorial follow-up (shorter SEO title per post), not a plugin change. |
| **SEO-DEC-032** | Active (2026-09-30, decided by Cedric) | The main site **keeps** "about one hour from Manila" (property descriptions, `src/lib/faqs.ts`, `/about`, chatbot, DiscoverLipa), although the blog removed numeric Manila travel times (SEO-DEC-023/028). This cross-site inconsistency is **accepted**: don't "fix" either side without a new Owner decision. |

**Status of the underlying SEO workstream, as of the 2026-09-17 migration:** see
`docs/HIL_SEO_SPECIFICATION.md` for the reconciled current state — several items above
(the `hil-seo`/Yoast cutover sequence, article #6's redirect, `stay_match_click`) remain
open and are **not** closed by this migration.

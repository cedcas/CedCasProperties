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
Status: Active
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
A dev booking still sends a real email from `customerservice@haveninlipa.com` and can trigger a real Stripe charge — dev testing of payment flows must stay test-safe by convention, not by environment isolation. Never add `--accept-data-loss` to the build command to work around a schema-drift error; the guard is correct and the drift is the thing to fix.

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
Status: Active — implemented on branch `fix/analytics-tracking` (PR against `dev`); **not yet merged or deployed**
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
  filters Active; mark `generate_lead` (and `booking_confirmed`) as key events.
- Any new production hostname must be added to `ANALYTICS_HOSTS`, or GA silently goes dark
  there. Any new owner-only route tree must be added to `isTrackedPath`.
- GA4 data between 2026-08-09 and this deploy still contains admin/dev/test traffic.
  Segment by hostname/page path when reading it.
- `blog.haveninlipa.com` (WordPress) is outside this repo and this decision. Stay Match
  v1.0.2 applies the same tag-don't-drop idea to editor previews there.
- **Test bookings stay unlabeled in the DB.** Non-production test bookings are now out of
  GA4 automatically, and owner tests on production carry `traffic_type: internal`. No
  `test_booking` event param was added, because no explicit non-schema signal exists at
  booking time beyond the same internal marker. Proper labeling needs a schema change,
  proposed below.

### Open proposal — `Booking.isTest` (needs Owner approval; NOT implemented)
- **Field:** `isTest Boolean @default(false)` on `Booking`. No index needed at current volume.
- **Default / backfill:** `false`, so every existing booking stays "real". No automatic
  backfill. The Owner flags known test bookings by hand.
- **Where set:** an Admin-only "Test booking" toggle on `/admin/bookings/[id]`, saved
  through the existing `PATCH /api/admin/bookings/[id]`. Deliberately no heuristics
  (guest name/email patterns).
- **What it excludes:** revenue/lifetime-value figures (`src/lib/customers.ts`, the
  customer pages, booking-list totals) and any future revenue or ambassador-reward report
  (rewards are not computed in code today). It does **not** change availability: a pending/confirmed test booking still
  blocks dates until cancelled, for double-booking safety (DEC-002). Emails and SMS
  behave as for any booking.
- **Migration:** additive, non-destructive column. It would reach production through the
  Vercel-build `prisma db push` (still the only path — see the open "remove `prisma db
  push` from the production build" item) and reach the dev DB separately (DEC-013). It would
  also give the pending hourly-fee workflow test a clean way to mark its throwaway booking.

### Supersedes
The 2026-08-08 `track()` behaviour ("send from every host; stamp `debug_mode` off
`PROD_HOSTS` and rely on the Developer filter") in the Website spec → GA4 Analytics Events.

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

**Status of the underlying SEO workstream, as of the 2026-09-17 migration:** see
`docs/HIL_SEO_SPECIFICATION.md` for the reconciled current state — several items above
(the `hil-seo`/Yoast cutover sequence, article #6's redirect, `stay_match_click`) remain
open and are **not** closed by this migration.

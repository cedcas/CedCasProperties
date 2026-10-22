# Haven in Lipa — Completion Log

> Concise historical record of completed work packages/phases, newest first — answers "was this already implemented, and what was the outcome?" without rereading old chats or the full commit log. GitHub remains authoritative for granular commit history ([HIL Commits.md](HIL%20Commits.md)); this file groups commits into features. Not every commit gets an entry — see [HIL_DECISIONS.md](HIL_DECISIONS.md) for the durable *why* behind any of these, and [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md) for what's still open.

---

## 2026-10-22, latest — Haven AI property-overview fix: forced `list_properties`, a per-turn listings context note, and a price-guard bullet fix (hil-pm/haven-property-list-102226)

Area: Website

Status: Built and tested on branch `hil-pm/haven-property-list-102226` (from `dev`,
recreated from `main` at `84dbd1a` after PR #93's release auto-deleted the prior `dev`);
targets `dev`. Lint (`npm run lint`), typecheck (`npx tsc --noEmit`), and the full
`npx vitest run` suite are clean (207 test files / 4,185 tests, all three timezone
projects — 44 new tests). `npm run build` was not run (forbidden for this task); no
database was touched; no `.env` file was read or printed.

### Outcome
Fixes a production incident (Oct 22 2026): asked "Hi, what properties do you have?",
Haven ~50% of the time skipped `list_properties` and invented an answer — only the two
B34 units (Cozy 1BR Haven, Spacious 2BR Getaway) with wrong capacities (2/4 or 4/6 instead
of the real 5/9), and once an invented price that the price guard correctly caught but
replaced with the generic Messenger-fee fallback **inside a property bullet**, where that
wording reads wrong. Full root-cause and fix recorded as an "Implementation note
(2026-10-22 property-overview fix)" under [DEC-029](HIL_DECISIONS.md) — not a new decision.

### Material Changes
- **`src/lib/haven/overview-intent.ts` (new)** — `isPropertyOverviewMessage()`, a pure
  regex detector for a plain property-overview question in English ("what properties do
  you have", "list your properties", "how many properties") and Tagalog/Batangueño
  ("anong property/properties meron kayo", "ano (ang) (mga) bahay ninyo", "ilang
  bahay/property meron kayo").
- **`src/lib/haven/chat-service.ts`** — `listingsContextNote()` builds a compact "Context
  (public listings, authoritative...)" system-prompt block every turn from the
  `publicListings` already fetched for property pre-resolution (one line per listing:
  `shortName`, slug, bedrooms, `maxGuests`, "from ₱X/night"; a plain "fetch
  failed/empty — call list_properties yourself" note otherwise). `basePricesFromListings()`
  folds every fetched listing's own `pricePerNight` into the price guard's `allowedAmounts`
  and `ensureFromPrefix()`'s `basePrices`. `runToolLoop()` passes
  `forceToolName: "list_properties"` to `provider.chat()` on round 0 only when
  `isPropertyOverviewMessage()` fires.
- **`src/lib/haven/provider.ts`** — `ChatRequest` gained `forceToolName?: string`, mapped
  to Anthropic's `tool_choice: {type: "tool", name}` and OpenAI's
  `tool_choice: {type: "function", function: {name}}`; omitted/unset falls back to each
  provider's normal `"auto"`.
- **`src/lib/haven/system-prompt.ts`** — new `PROPERTY_OVERVIEW_RULE`: never
  name/count/describe properties from memory; use the listings note or call
  `list_properties`; name every listing for an overview question, never only some; the
  two-building fact (Block 34 = Cozy 1BR + Spacious 2BR, Block 38 "Mickey in Lipa" = the
  three Sleeps-7/11/15 configurations) is owner-approved color, never a substitute for the
  full per-listing list; never let a hallucinated price inside a property bullet become the
  generic Messenger-fee fallback.
- **`src/lib/haven/post-process.ts`** — `enforcePriceClaims()`'s bullet-line branch gained a
  `RATE_CONTEXT` regex (`/night`, `/day`, `/guest`) distinct from `FEE_CONTEXT` (now only
  `/hour`/`/hr`/"fee"/"charge"); a disallowed amount on a `RATE_CONTEXT` bullet with no
  fee/hourly wording drops just the price (`dropPriceFromBullet()`) instead of replacing the
  whole bullet, so the property's name/capacity still reaches the guest. An explicit
  "fee"/"charge" or hourly bullet is unaffected — still the full-line fallback.
- **Tests (44 new):** `overview-intent.test.ts` (new); `provider.test.ts` (`forceToolName`
  → `tool_choice` mapping, both providers); `post-process.test.ts` (bullet price-drop vs.
  full-line fallback); `system-prompt.test.ts` (`PROPERTY_OVERVIEW_RULE`); `chat-service.test.ts`
  (listings note content incl. a fetch-failure fallback, forced tool on round 0 only, an
  overview reply naming all 5 listings' real rates survives the guard untouched, a
  hallucinated bullet price is dropped rather than fallback-replaced).
- **Not done this session:** merge, push, or deploy (explicit task constraint — commit
  only, no PR); the Owner has not yet reviewed or merged this branch, so the fix is not
  live. See [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).

---

## 2026-10-22, later — Last two hardcoded Airbnb links removed: homepage CTA block + about-page Person `sameAs` (hil-pm/remove-airbnb-cta-about-102226)

Area: Website

Status: Built and tested on branch `hil-pm/remove-airbnb-cta-about-102226` (based on
`dev`, fast-forwarded to pick up PR #91/DEC-030 first since this branch started from an
older `dev` snapshot; targets `dev`); committed, **not pushed, no PR opened** (explicit
constraint on this task). `npm run lint`, `npx tsc --noEmit`, and the full `npx vitest run`
suite are clean (204 test files / 4,059 tests, all three timezone projects). `npm run
build` was not run (forbidden for this task); no database was touched; no `.env` file was
read.

### Outcome
Cedric's same-day follow-up (2026-10-22) to [DEC-030](HIL_DECISIONS.md), which had
deliberately left two call sites untouched because they don't read from the shared
`src/lib/social-links.ts` list: the homepage CTA block's hardcoded Airbnb icon and the
about-page Person JSON-LD's hardcoded Airbnb `sameAs` entry. Both are now removed, closing
DEC-030's "known remaining inconsistency." No individual Airbnb listing link remains
anywhere on `haveninlipa.com`.

### Material Changes
- **`src/app/page.tsx`** — the "Ready to Experience Our Comfort?" CTA block's social icon
  row no longer appends a hardcoded `fa-airbnb` icon (`https://airbnb.com/h/fullhousebellavita`).
  **Dropped, not replaced** with an on-site icon: the block already has two on-site CTAs
  ("Book Your Stay Today" → `/#properties`, "Browse Properties" → `#properties`)
  immediately above the icon row, and every other social-icon row in the app
  (`Footer.tsx`, `ContactForm.tsx`) is `SOCIAL_LINKS`-only with no on-site entry mixed in —
  adding a fifth icon here for `/properties` would have been the inconsistent choice. The
  row's array-of-arrays indirection (needed only to splice in the one-off Airbnb entry) is
  simplified to a direct `SOCIAL_LINKS.map(...)`.
- **`src/app/about/page.tsx`** — the Person JSON-LD `sameAs` drops the hardcoded Airbnb
  URL; now `sameAs: [...SOCIAL_LINK_URLS]`, matching `LodgingBusiness`'s `sameAs`. The
  "Airbnb Superhost" prose mentions (lines ~49, ~172) are unchanged — this is a links/schema
  change only, per DEC-030's own scope.
- **Verified by grep:** no `airbnb.com` href/URL remains anywhere in `src/` except (a) the
  admin `airbnbIcsUrl` calendar-import field placeholder (`PropertyForm.tsx`) — a
  functional iCal-sync feature, not a marketing link — and (b) test fixtures that assert
  Airbnb domains are *rejected* (Haven AI's link allowlist tests, and the new/updated
  regression tests below).
- **Tests:** `src/lib/__tests__/social-links.test.ts` — updated the about-page source-text
  assertion (was pinned to the old Airbnb-plus-spread pattern; now asserts
  `sameAs: [...SOCIAL_LINK_URLS]` and the absence of the Airbnb URL) and added an
  equivalent source-text assertion for the homepage CTA block.
  `src/lib/__tests__/homepage-cta-social-links.test.ts` (new) — renders the real `Home`
  page component (mocking Prisma and the heavy child sections) and asserts the icon row
  renders exactly the four owner-approved icons with no `fa-airbnb`/`airbnb.com`, and that
  the two on-site CTA links are still present. `footer-social-links.test.ts`'s header
  comment updated to stop describing these two spots as "flagged, not touched."
- **Blog, recorded here for completeness (not built this session):** Cedric deployed
  `hil-seo` 1.1.10 (built in the prior DEC-030 session, PR #91) live to
  `blog.haveninlipa.com` via Hostinger on 2026-10-22 at approximately 7:40 AM CT. The
  theme's Airbnb icon now points to `https://haveninlipa.com/properties` on the live blog.

---

## 2026-10-22 — Footer social links (site-wide) + Airbnb icon removed from homepage + blog Airbnb link fixed (hil-seo 1.1.10) (hil-pm/footer-social-airbnb-102226)

Area: Website | Blog

Status: Built and tested on branch `hil-pm/footer-social-airbnb-102226` (based on `main`,
targets `dev`); committed, **not pushed, no PR opened** (explicit constraint on this task).
`npm run lint`, `npx tsc --noEmit`, and the full `npx vitest run` suite are clean (201
test files / 4,050 tests, all three timezone projects). `php -l` clean on every plugin
file; the plugin's standalone PHP test (`content/seo/runs/102226/tests/test-social-links.php`)
passes all 26 assertions. `npm run build` was not run (forbidden for this task — it runs
`prisma db push`); no database was touched.

### Outcome
Cedric's decision (2026-10-22, recorded in [DEC-030](HIL_DECISIONS.md)): add a site-wide
footer social row (Facebook/Instagram/TikTok/YouTube, no Airbnb) on `haveninlipa.com`;
remove the Airbnb icon from the homepage "Find Us Online" row; keep the `LodgingBusiness`
JSON-LD `sameAs` to exactly those four URLs (no individual Airbnb listing link); and fix
the blog's dead Airbnb vanity link (`https://airbnb.com/h/haveninlipa`, confirmed to
redirect to Airbnb's generic `/s/homes` search page, not a HIL listing) to point at direct
booking (`https://haveninlipa.com/properties`) instead of a real listing.

### Material Changes
- **`src/components/layout/Footer.tsx`** — new social icon row (Facebook, Instagram,
  TikTok, YouTube) in the Brand column, sourced from `src/lib/social-links.ts`
  (`SOCIAL_LINKS`, the existing shared constant from PR #87's social-profile work).
  Each anchor: `target="_blank"`, `rel="noopener noreferrer"`,
  `aria-label="Haven in Lipa on <Network>"`, styled to match the existing dark-background
  pill icons already used in the homepage CTA block (`fa-brands` Font Awesome). No Airbnb
  icon added — the footer previously had no social row at all.
- **`src/components/sections/ContactForm.tsx`** — removed the hardcoded Airbnb icon
  (`fa-airbnb`, `https://airbnb.com/h/fullhousebellavita`) from the homepage "Find Us
  Online" row. The other four icons (sourced from `SOCIAL_LINKS`) are unchanged.
- **`src/lib/local-business-schema.ts`** — `BUSINESS_SAME_AS` no longer appends the Airbnb
  listing link; it is now exactly `SOCIAL_LINK_URLS` (the four owner-approved profiles).
  Comment updated to record the 2026-10-22 decision in place of the prior "pending Owner
  decision" note.
- **Flagged, not changed** (per the task's own scope — "report, don't touch unless fed by
  the shared social list"): the homepage "Ready to Experience Our Comfort?" CTA block
  (`src/app/page.tsx`) still renders its own hardcoded Airbnb icon
  (`https://airbnb.com/h/fullhousebellavita`), and the about page's Person JSON-LD
  (`src/app/about/page.tsx`) still lists the same Airbnb URL in `sameAs`. Neither reads
  from `SOCIAL_LINKS`/`SOCIAL_LINK_URLS` (Airbnb is deliberately excluded from that shared
  list), so removing it from the list does not touch these two call sites. Left for Cedric
  to decide — see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).
- **`content/seo/runs/102226/hil-seo-plugin/`** (copied from the 1.1.9 artifact built
  2026-10-16, `content/seo/runs/101626/` — **never uploaded**; the live site was still on
  1.1.8, so this upload goes straight from 1.1.8 to **v1.1.10**, carrying 1.1.9's changes
  forward): `includes/social-links.php` gains
  `hil_seo_rewrite_airbnb_href()`, called from the existing `hil_seo_rewrite_social_links()`
  output-buffer rewrite. Matches `href="https?://(?:www\.)?airbnb\.com/h/haveninlipa/?"`
  (case-insensitive, any scheme/`www` variant, optional trailing slash) and rewrites it to
  `href="https://haveninlipa.com/properties"`. `target`/`rel`/`aria-label`/icon class are
  untouched — link-destination fix only. Plugin header/version bumped to 1.1.10 in
  `hil-seo.php`; `readme.txt` stable tag and changelog updated.
  `content/seo/runs/102226/tests/test-social-links.php` extended with Airbnb-rewrite
  assertions (CTA + footer snippets, idempotency, six scheme/`www`/trailing-slash
  variants) — all pass. Deploy note:
  [`content/seo/runs/102226/HIL_SEO_v1.1.10_Deploy_Note.md`](../content/seo/runs/102226/HIL_SEO_v1.1.10_Deploy_Note.md).
  Zip built at `content/seo/runs/102226/hil-seo-v1.1.10.zip`, also copied to
  `/workspace/hil-blog-social/hil-seo-v1.1.10.zip`. **Not uploaded to WordPress** — this
  task is plugin-source-only, no live WordPress REST/admin change.
- **New test coverage:** `src/lib/__tests__/footer-social-links.test.ts` — Footer renders
  exactly the 4 owner URLs with correct `target`/`rel`/`aria-label` and no Airbnb; no
  duplicate rendering; ContactForm's "Find Us Online" row has no Airbnb icon/link;
  `BUSINESS_SAME_AS` equals the 4 owner URLs exactly.

### Still open (Owner decision needed)
1. Whether to also remove the Airbnb icon from the homepage CTA block
   (`src/app/page.tsx`) and the about-page Person `sameAs` (`src/app/about/page.tsx`), for
   full consistency with the footer/Find-Us-Online/`LodgingBusiness`-schema removal.
2. Review and (if approved) merge this branch into `dev`, then release to `main` per the
   normal flow — **not done by this task** (no push, no PR opened, per explicit
   instruction).
3. Upload `hil-seo` 1.1.10 to WordPress per the deploy note — **not done by this task**
   (plugin-source change only; live WordPress untouched).

---

## 2026-10-19 — Haven AI: numeric month-first dates, always-on today's-date context, single-date 1-night nudge, redefined "next weekend" (fix/haven-ai-numeric-dates-101926)

Area: Website / Haven AI Chat

Status: Shipped — `npm run lint`, `npx tsc --noEmit`, `npx vitest run` all clean (full repo
suite, 3993 tests across `tz-chicago`/`tz-utc`/`tz-manila`).

### Outcome
Live bug, production, 2026-10-19 (Batangueño mode): a guest asked to book "10/24, this
coming Saturday" (Oct 24, 2026 — genuinely a Saturday, so the numeric date and the weekday
already agreed) and Haven replied asking whether "10/24" meant "taong ito, o next year"
and whether "Oktubre 24, 2024 ba, o 2025 na?", then separately re-asked to confirm the
1-night default ("kung 1 night lang... check-in sabado at check-out linggo, tama ba?").
Root cause: `dates.ts`'s `resolveDates()` had no numeric-date (`M/D`) parsing at all, and
nothing ever told the model today's actual date — only a per-turn context note that fired
only when a date phrase was independently detected.

### Material Changes
- **`src/lib/haven/dates.ts`:** numeric month-first date parsing (Owner convention —
  `M/D`/`MM/DD`/`M/D/YY`/`M/D/YYYY`, never day-first), including ranges
  (`10/24-10/26`/`10/24 to 10/26`/`10/24 hanggang 10/26`/`10/24-26` shorthand), guarded
  against a guest-count phrase like "4/5 guests". New relative-weekday phrasing ("this
  coming Saturday"/"this Saturday"/"sa Sabado"/"ngayong Sabado"/"sa darating na Sabado" —
  nearest occurrence including today; "bukas" as "tomorrow"; "sa makalawa" as the day
  after tomorrow). "Next weekend" redefined (Owner rule) to the Saturday after the coming
  one, 1 night Sat→Sun — not an extra Friday-to-Sunday span a week further out. New result
  fields `nights` and `singleDateDefault`. New exports `todayContextNote(now)` and
  `manilaYear(now)`.
- **`src/lib/haven/chat-service.ts`:** prepends `todayContextNote(now)` to the system
  prompt on every request, unconditionally; passes `manilaYear(now)` into
  `dropWhatYearQuestions()`; runs the new `ensureSingleNightNudge()` in the post-process
  pipeline.
- **`src/lib/haven/post-process.ts`:** `dropWhatYearQuestions()` gained an optional
  `currentYear` parameter (backward-compatible) that dynamically drops any sentence naming
  a past calendar year, plus two static phrases ("this year or next", "taong ito ... o
  next year"). `dropDateReconfirmationQuestions()` gained three more patterns for the
  1-night-default re-confirmation mistake. New `ensureSingleNightNudge()`.
- **`src/lib/haven/system-prompt.ts`:** new hard rules `NUMERIC_DATE_RULE`,
  `SINGLE_DATE_NIGHT_RULE`, `NEXT_WEEKEND_RULE`; `NO_YEAR_QUESTION_RULE` extended to ban
  offering/mentioning a past year.
- **Tests:** the exact bad reply as a backstop fixture (`post-process.test.ts`,
  `chat-service.test.ts`); resolver cases for every new numeric/relative-date form pinned
  to today = 2026-10-19 Manila (`dates.test.ts`); an end-to-end `chat-service.test.ts` case
  for the live btg message, asserting a 2026-10-24→25 quote context and no year/night
  question.
- **Docs:** [HIL Website Technical Specification.md](HIL%20Website%20Technical%20Specification.md)'s
  Haven AI Chat section updated (`dates.ts`/`post-process.ts`/`system-prompt.ts`
  sub-sections, pipeline-order note).

### Follow-up: bare-URL leak past the link allowlist (same branch, 2026-10-19)
Preview retest found a second live bug: a Batangueño reply ended "...Ari ang link:
https://haven.com.ph/properties/spacious-2-bedroom/book?checkIn=2026-10-24&checkOut=2026-10-26&guests=4"
— `extractAllowedLinks`'s markdown-link allowlist (`isAllowedHref`) never ran, because the
URL wasn't written as a markdown link, and `haven.com.ph` isn't even a real HIL domain.
New `stripBareUrls()` in `src/lib/haven/post-process.ts` removes any bare `http(s)://`,
`www.`, or `domain.tld/path` URL from the reply text — allowlisted or not, since a
legitimate link already has its own button — together with a lead-in phrase ("Ari ang
link:", "Here's the link:", "Heto ang link:", "Eto po ang link:"), with one exception: the
Messenger handoff URL (`m.me/haveninlipa`) is left in place, since `ensureHandoffLink`'s
button safety-net and the fixed owner-facts.ts fallback sentences both depend on the guest
seeing that literal text. Wired into `chat-service.ts`'s post-process pipeline right after
`extractAllowedLinks`. `system-prompt.ts` gained a new hard rule telling the model never to
write a URL in reply text (booking buttons are automatic), carving out the existing
Messenger-handoff instruction as the one exception. Tests added for the exact bad string,
EN/TL/btg lead-in variants, and an allowlisted-URL case (`post-process.test.ts`).

### Deploy note
Committed to `fix/haven-ai-numeric-dates-101926` (cut from `main` @ 69af104); not merged —
the base branch is being restored by the Owner first. Not yet live; no schema change, no
migration involved.

---

## 2026-10-19 — Haven AI H1: production launch (release commit 649784d, PR #89 → main @ 69af104)

Area: Website / Haven AI Chat — Deployment

Status: Live in production.

### Outcome
Haven AI's H1 milestone shipped to production. Migration
`20261014120000_add_haven_chat_ai` was applied by the Owner (per the migration-gate
runbook — Claude never runs this) from release commit 649784d: "Applied 1 migration(s).
Schema verified.", **NO DRIFT** across all 4 checked states. Run record kept on the
Owner's Mac: `.migration-runs/2026-10-19T12-04-11-360Z-production-deploy.json`. PR #89
merged into `main` as `69af104`. Vercel production deployment
`ced-cas-properties-5foyxb3qi` reached **Ready**; the `vercel-build` release gate reported
"OK — every migration in this commit is applied". Production smoke test: 4/4 checks
passing.

### Material Changes
- No code change in this entry — deployment/release record only. See
  [HIL_DECISIONS.md](HIL_DECISIONS.md) DEC-029 for the feature's own architecture and
  flag-off-by-default posture, and the migration runbook
  ([HIL_MIGRATION_RUNBOOK.md](HIL_MIGRATION_RUNBOOK.md)) for the applied-migration
  procedure this release followed.

### Deploy note
Confirmed live per DEC-006 (a merge to `main` is not itself a deploy) — the Vercel
deployment above and the passing smoke test are the actual live-confirmation evidence,
not just the merge.

---

## 2026-10-16 — `hil-seo` 1.1.9 built: social `sameAs` + blog theme social-link fix (content/hil-seo-1.1.9-social-101626)

Area: Blog / SEO

Status: Artifact built, `php -l` clean, standalone PHP test passing. **Not yet uploaded to
WordPress** — this is a plugin artifact in the repo, per the standing rule that Claude
never calls the WordPress API or touches the live blog directly (SEO-DEC-009).

### Outcome
Owner-approved (Cedric, 2026-10-16): built on the live v1.1.8 source
(`content/seo/runs/100426/hil-seo-plugin/`), copied to
`content/seo/runs/101626/hil-seo-plugin/` with the plugin folder/slug unchanged so
WordPress can upgrade in place. Two independent fixes, both about the same four social
profiles: (1) the Organization schema's `sameAs` had a TikTok handle that was never live
and no YouTube entry; (2) the `haveninlipa-blog` theme's own hardcoded CTA/footer social
icons had three wrong hrefs and no YouTube icon at all (confirmed against a live capture
of the blog homepage, `/workspace/hil-blog-social/live-home.html`).

### Material Changes
- **`includes/schema.php`:** Organization `sameAs` is now `facebook.com/haveninlipa`,
  `instagram.com/haven_inlipa`, `tiktok.com/@haven.in.lipa` (corrected from
  `@haven_inlipa`), `youtube.com/@Haven-in-Lipa` (new), `haveninlipa.com` (unchanged
  position, after the socials).
- **New file, `includes/social-links.php`:** front-end-only output-buffer module
  (`template_redirect`, HTML responses only; skips `wp-admin`, REST, AJAX, cron, feeds),
  gated by its own filter (`hil_seo_fix_social_links`, default on, independent of the
  Yoast-cutover flags). Corrects the theme's hardcoded Instagram/TikTok/Facebook hrefs and
  inserts a YouTube anchor immediately after each TikTok anchor, cloned from that anchor's
  own markup (picks up the footer's `class="social-link"` without needing to know which
  container it's in). Idempotent — a non-greedy-regex bug that let a second pass triple the
  YouTube icon was caught by the test harness and fixed with a tempered-greedy-token
  pattern before shipping.
- **Version bump:** plugin header, `HIL_SEO_VERSION`, and `readme.txt` stable tag/changelog
  all to 1.1.9; module load order in `hil-seo.php` gains `social-links`.
- **Test harness:** `content/seo/runs/101626/tests/test-social-links.php` — standalone PHP
  script (no WordPress required; stubs `add_action`/`apply_filters`/`is_admin`/`is_feed`)
  asserting the rewrite against the two live markup snippets (CTA section + footer),
  including idempotency on a second pass. All 18 assertions pass.
- **Build artifacts:** `content/seo/runs/101626/hil-seo-plugin.zip` (folder `hil-seo-plugin/`
  at the zip root, matching the v1.1.8 layout) and a copy at
  `/workspace/hil-blog-social/hil-seo-1.1.9.zip`.
- **Known, documented gap (not fixed here):** the main app's `src/lib/local-business-schema.ts`
  still carries the old TikTok URL and no YouTube entry — already flagged there as not
  fully aligned with the blog's Organization graph (Airbnb-entry gap, see this file's
  2026-10-10 entry below). This build widens that gap by one more field; fixing it is a
  separate, Owner-approved app-side change.

### Deploy note
`content/seo/runs/101626/HIL_SEO_v1.1.9_Deploy_Note.md` — upload steps, verification
checklist, and rollback (re-upload the 1.1.8 zip in `runs/100426/`).

---

## 2026-10-16 — Social links consolidated into one constant; YouTube added, TikTok URL fixed (content/social-links-youtube-101626)

Area: Website | SEO

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 198 files / 3,675 tests). Not yet merged.

### Outcome
Owner-approved (Cedric, 2026-10-16) the four official social profiles: Facebook, Instagram,
TikTok (`@haven.in.lipa` — the code had carried the wrong handle, `@haven_inlipa`, since the
page was first built), and a new YouTube channel (`@Haven-in-Lipa`). All four now live in one
place, `src/lib/social-links.ts` (`SOCIAL_LINKS` / `SOCIAL_LINK_URLS`), and every surface that
renders a social icon or link reads from it instead of repeating the URLs.

### Material Changes
- **New:** `src/lib/social-links.ts` — the shared constant (name, url, Font Awesome
  `fa-brands` icon class per platform).
- **`src/lib/local-business-schema.ts`:** `BUSINESS_SAME_AS` now spreads
  `SOCIAL_LINK_URLS` plus the pre-existing Airbnb listing link (kept as-is — Airbnb is not
  one of the owner's four confirmed social profiles, and its `sameAs` inclusion was already
  a separate open question, see the 2026-10-10 entry below).
- **`src/app/about/page.tsx`:** the `Person` JSON-LD `sameAs` now spreads
  `SOCIAL_LINK_URLS` (previously missing TikTok entirely); the "Messenger" contact link
  now sources its URL from `SOCIAL_LINKS` instead of a hardcoded string.
- **`src/app/page.tsx` / `src/components/sections/ContactForm.tsx`:** the social-icon rows
  now map over `SOCIAL_LINKS` (plus Airbnb, appended separately since it isn't in the
  constant); `aria-label` changed from the bare platform name to `"Haven in Lipa on
  {Platform}"` for the four owner-approved profiles (Airbnb's `aria-label` left unchanged).
- **`src/lib/chat/chat-tree.ts`:** the `contact-social` chat-tree node gained a YouTube
  line and the TikTok handle was corrected to `@haven.in.lipa`.
- **Not changed:** `src/components/layout/Footer.tsx` has no existing social-icon area (only
  address/phone/email under "Get in Touch"), so none was added — out of scope for a link-URL
  fix. `src/lib/faqs.ts`'s FAQ answer only names Facebook (not a multi-platform list), so it
  was left as-is.
- **Blog NOT updated by this change** — the `hil-seo` plugin's own `Organization` `sameAs`
  (`content/seo/runs/.../hil-seo-plugin/includes/schema.php`) is a separate WordPress-side
  artifact that still needs its own update to add YouTube and fix the TikTok handle; it does
  not read from this repo's constant.

Tests: `src/lib/__tests__/local-business-schema.test.ts` updated (TikTok URL, +YouTube).
New `src/lib/__tests__/social-links.test.ts` pins `SOCIAL_LINK_URLS`/`SOCIAL_LINKS` names,
checks `BUSINESS_SAME_AS` and the about-page `sameAs` wiring, and scans `src/` to confirm no
stale `tiktok.com/@haven_inlipa` URL remains.

### References
Branch `content/social-links-youtube-101626`, PR pending against `dev`.

---

## 2026-10-16 — Haven AI: plain-language pass banning deep/literary Tagalog (fix/haven-ai-checkout-date-101626)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,873 tests).

### Outcome
Same branch as the entry below, later the same day. Owner incident (Cedric): Haven
qualified a quote as "(provisional lang — tutuklasin ng tama sa checkout)" —
"tutuklasin" ("will be discovered") is deep, literary Tagalog no real local host would
use for "we'll confirm it." Haven must always speak plain, conversational Tagalog/
Batangueño — everyday Taglish is fine, never deep or literary vocabulary. "Tutuklasin"
and every other word on the "tuklas" root (tuklasin, matutuklasan, tinuklasan, …) are
banned entirely — the standard quote/checkout caveat is now fixed per language: EN "This
is provisional — confirmed at checkout.", TL/BTG "Provisional lang ito, kukumpirmahin sa
checkout."

Reviewing Haven's own fixed scripts and few-shot blocks (`system-prompt.ts`'s
`BATANGUENO_FEWSHOT`, `owner-facts.ts`, `access-guard.ts`, `welcome-book.ts`, `dates.ts`)
turned up no other instance of "tutuklasin" or the other deep words the Owner asked to
be reviewed for ("sukatin", "manatili", "nawa", "datapwat", "subalit", "marapat",
"pagsapit", "tunay na", "maaari") — they already used "pwede" and plain phrasing
throughout. The guard below exists as a backstop against the model generating these
words at runtime (what produced the Owner's live incident), not a fix to existing fixed
text.

### Material Changes
- **`system-prompt.ts`:** new `PLAIN_LANGUAGE_RULE` instructs plain, conversational
  Tagalog/Batangueño and bans the "tuklas" root entirely (say "kukumpirmahin" instead) plus
  the other deep words, each with its plain replacement:
  sukatin→tingnan, manatili→mag-stay, nawa→sana, datapwat/subalit→pero, marapat→dapat,
  pagsapit→pagdating, tunay na→talagang, maaari/maaaring→pwede/pwedeng. The "provisional"
  hard rule now states the standard caveat explicitly per language.
- **`post-process.ts`:** `PROVISIONAL_CAVEAT_EN`/`PROVISIONAL_CAVEAT_TL` (the single source
  of truth both the prompt and the backstop use — defined here, not `system-prompt.ts`, to
  avoid a module import cycle through `owner-facts.ts`); `replaceTuklasinFamily(text,
  isEnglish)` matches the whole "tuklas" root and swaps the WHOLE sentence/bullet line for
  the standard caveat (never just the word, since every live occurrence of this root was
  this exact checkout caveat); `simplifyDeepTagalogWords(text)` is a word-level,
  capitalization-preserving swap for the rest of the banned words.
- **`chat-service.ts`:** both run right after `fixDadalawPhrasing()`, before
  `stripSystemMentions()`.

Tests: `post-process.test.ts` (the exact Owner string → plain caveat, English-language
variant, other "tuklas"-root inflections, each banned word replaced, no-op cases),
`system-prompt.test.ts` (prompt states the per-language caveat and bans "tutuklasin" by
name, lists the other banned words, and the Batangueño few-shot block contains none of
them).

### References
Branch `fix/haven-ai-checkout-date-101626`, PR #86.

---

## 2026-10-16 — Haven AI: never re-question a resolved date range, bare day-of-month ranges, follow-up-turn property/date resolution (fix/haven-ai-checkout-date-101626)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,840 tests).

### Outcome
Same branch as the two entries below, later the same day — three Owner rules (Cedric,
2026-10-16), using the Owner's own dev screenshot as a test fixture:
1. **Never re-question a resolved date range:** guest said "Nobyembre 19 hanggang 21, 4
   kami" and Haven asked whether that meant 1 night (Nov 19–20) or 2 nights (Nov 19–21) —
   contradicting the range it had just correctly parsed. A parsed range always means
   check-in the first date, check-out the second; Haven must never ask the guest to
   confirm the number of nights, re-ask which dates were meant, or contradict the range.
2. **Never ask what year:** always the current year in Asia/Manila, or next year if that
   date already passed. Also: a bare day-of-month range with no month attached ("19 to
   21", "19-21") now resolves against a month named earlier in the conversation, or the
   next upcoming occurrence of that day otherwise.
3. **Follow-up-turn resolution:** a message carrying only dates/guest count ("Nobyembre 19
   hanggang 21, 4 kami"), sent after an earlier message naming a property ("Magkano ga ang
   Spacious 2BR?") or after Haven listed options, now resolves the property from recent
   history instead of asking again.

### Material Changes
- **`dates.ts`:** `resolveDates()` gained a third optional `context` parameter and a bare
  day-of-month-range fallback (lowest priority, guarded against a guest-count phrase like
  "4 to 5 guests" via a trailing people-noun exclusion); new `findContextMonth(context)`
  export returns the last month name mentioned in recent history, English or
  Tagalog/Batangueño.
- **`owner-facts.ts`:** `parseGuestCount()` gained the number-leading "4 kami"/"4 na kami"
  idiom (alongside the existing "kami ay 4"), needed to parse the Owner's exact fixture.
- **`property-resolver.ts`:** new `resolveGuestPropertyMentionAcrossTurns(latestMessage,
  listings, recentHistory)` — tries the latest message first, then scans the last 6 prior
  turns (either role), most recent first, only when the latest message names no property.
- **`post-process.ts`:** new `dropDateReconfirmationQuestions()` (drops any
  nights/date-reconfirmation sentence in English or Tagalog/Batangueño whenever a range
  was resolved this turn; falls back to restating `stayLabel` with a booking nudge if
  dropping would leave the reply empty) and `dropWhatYearQuestions()` (unconditional
  "what year"/"anong taon" drop).
- **`system-prompt.ts`:** two new hard rules matching the backstops above.
- **`chat-service.ts`:** new `recentHistoryMessages()` (last 6 prior turns) feeds both
  `resolveGuestPropertyMentionAcrossTurns()` and `resolveDates()`'s `context` argument;
  `dateContextNote()` no longer re-runs `resolveDates()` itself, taking the already-
  resolved object instead so it's computed once and shared with the property note and the
  new post-process guards, which run right after `fixStayRangeEndDate()`.

Tests: `dates.test.ts` (bare day-range cases incl. year rollover, history month context,
guest-count false-positive guard, `findContextMonth`), `owner-facts.test.ts` ("4 kami"/"4
na kami"), `property-resolver.test.ts` (`resolveGuestPropertyMentionAcrossTurns`),
`post-process.test.ts` (the exact Owner screenshot fixture, English/Tagalog/Batangueño
re-question phrasings, the "did you mean" property-disambiguation carve-out,
`dropWhatYearQuestions`), `chat-service.test.ts` (2-turn property+dates/guests flow, btg
and English), `system-prompt.test.ts` (new hard-rule text).

### References
Branch `fix/haven-ai-checkout-date-101626`, PR #86 into `dev`.

---

## 2026-10-16 — Haven AI: `hanggang`/`until` date-range regression, doubled date header, "the system" guard (fix/haven-ai-checkout-date-101626)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,744 tests).

### Outcome
Same branch as the stay-range entry below, later the same day — three more live-preview
bugs fixed:
1. **Date-range regression:** "Magkano ga ang Spacious 2BR sa Nobyembre 19 hanggang 21
   para sa 4?" (and any other "X hanggang Y"/"X until Y" phrasing) wasn't recognized as a
   date range at all — `dates.ts`'s separator (previously only `-`/`to`/`–`/`through`)
   didn't include "hanggang"/"until", so the expression fell through to the single-date
   pattern and silently resolved to a 1-night stay (Nov 19 → Nov 20) instead of the
   intended 2-night range (Nov 19 → Nov 21), with Haven then asking the guest to confirm
   the wrong, pre-resolved dates.
2. **Doubled date header:** an English reply already correctly stating a stay's range via
   `stayLabel` (e.g. "Thu, Nov 19 → Sat, Nov 21, 2026 (check-out) · 2 nights") still got a
   redundant "For Thursday, November 19 → Saturday, November 21, 2026:" header prepended
   on top — `ensureDatesStated()`'s "already stated?" check only recognized the full month
   name ("November 19"), never the abbreviated form `stayLabel` actually uses ("Nov 19").
3. **"The system" leak:** Haven must never tell a guest she's checking "the system"/"ang
   system"/"sa system"/"our system" — it reads as a bot describing its own backend. The
   `BATANGUENO_FEWSHOT` prompt example itself used to say "...sa system, tapos
   sasabihin..." — fixed alongside the new rule/backstop, since the example was teaching
   the model the exact phrase being banned.

### Material Changes
- **`dates.ts`:** new `RANGE_SEP` constant (`-`/`to`/`–`/`through`/`until`/`hanggang`) used
  by all three range regexes (ISO, weekday, month-day) — single source of truth for every
  word/symbol that joins a check-in phrase to a check-out phrase.
- **`post-process.ts`:** `ensureDatesStated()` now takes `stayLabel` as a parameter and
  checks `text.includes(stayLabel.en)` FIRST, before the existing full-month-name
  fallback. New `stripSystemMentions()` drops any sentence/bullet line matching
  `the|our system` / `ang system` / `sa system` (article/possessive required immediately
  before "system", so "the sound system" is never caught).
- **`system-prompt.ts`:** new hard rule banning "the system"/"ang system"/"sa
  system"/"our system"; `BATANGUENO_FEWSHOT`'s example reply no longer says "sa system".
- **`chat-service.ts`:** wires `stripSystemMentions()` into the post-process pipeline and
  passes `stayLabel` into `ensureDatesStated()`. The internal "Context (already
  resolved/detected by the system...)" note headers (`chat-service.ts`, `owner-facts.ts`,
  `property-resolver.ts`) were also reworded to "...already resolved/detected here..." to
  avoid teaching the model this phrasing in the first place — defense in depth alongside
  the backstop.

Tests: `dates.test.ts` (the exact live-bug message, "Nov 19 to 21", "November 19-21",
"mula Nobyembre 19 hanggang 21", "Dec 30 to Jan 2" year rollover, "Nov 19 until 21"),
`post-process.test.ts` (`ensureDatesStated` no-double-header case; `stripSystemMentions`
— English/Tagalog/Batangueño phrasings, bullet lines, and the "sound system" false-positive
guard), `system-prompt.test.ts` (updated for the reworded context-note phrasing).

### References
Branch `fix/haven-ai-checkout-date-101626`, PR #86 into `dev`.

---

## 2026-10-16 — Haven AI: stay ranges now always end on the check-out date (fix/haven-ai-checkout-date-101626)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,702 tests).

### Outcome
Live bug: Haven stated a Thu check-in/Sat check-out, 2-night stay as "Thursday, November
19 hanggang Friday, November 20, 2026 (2 nights)" — reading the last occupied NIGHT
(Friday) as the range's end instead of the check-out date (Saturday). Fixed with a single
source of truth for how a stay's range is worded, enforced at three independent layers
(DEC-029's usual pattern: a tool-surfaced fact, a prompt rule, and an independent
post-generation backstop).

### Material Changes
- **`dates.ts`:** new `buildStayLabel(checkIn, checkOut)` returns `{en, tl, btg}` (`btg`
  identical to `tl`) — e.g. EN "Thu, Nov 19 → Sat, Nov 21, 2026 (check-out) · 2 nights",
  TL/BTG "Huwebes, Nob 19 → Sabado, Nob 21, 2026 (check-out) · 2 gabi". The end date is
  always `checkOut`; nights is always `checkOut − checkIn`. `resolveDates()`'s own result
  now carries a `stayLabel`.
- **`tools.ts`:** `check_availability`, `get_quote`, and `find_stay` each return a
  `stayLabel` for the exact dates they were called with (`find_stay` once at the top
  level, shared by every option).
- **`chat-service.ts`:** `dateContextNote()`'s pre-resolution system-prompt note now
  states the resolved range's `stayLabel` (en/tl) alongside the ISO dates.
- **`system-prompt.ts`:** new hard rule — a stay's range always ends on the check-out
  date, never the last occupied night; copy the `stayLabel` matching the reply language
  verbatim instead of composing the range.
- **`post-process.ts`:** new `fixStayRangeEndDate()` — the independent backstop. Whatever
  English-worded date range the model composed itself, if its start matches this turn's
  resolved/quoted stay's `checkIn` and its end matches the last occupied night
  (`checkOut − 1`), the WHOLE matched range (plus any trailing "(N nights)"/"(N gabi)"
  note) is replaced with the correct `stayLabel` — never just the end date. A correct
  range and a per-night breakdown line are both left untouched.

Tests: `dates.test.ts` (`buildStayLabel` — check-out end date, singular "night", month
rollover, invalid/inverted range, parity with `resolveDates()`), `tools.test.ts`
(`stayLabel` on `check_availability`/`get_quote`/`find_stay`), `post-process.test.ts`
(`fixStayRangeEndDate` — the exact bad Batangueño/mixed string, an English variant, a
correct range left untouched, a single-night stay, a month rollover, and a per-night
breakdown line left untouched), `system-prompt.test.ts` (the new hard rule's wording).

### References
Branch `fix/haven-ai-checkout-date-101626`, PR into `dev`.

---

## 2026-10-15 — Haven AI: Welcome Book restaurants/things-to-do widened to global (fix/haven-ai-freetext-reset-101526)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,660 tests).

### Outcome
Same day as the B34 Welcome Book entry below, Cedric amended that decision's scoping:
the Welcome Book's 10 restaurants and 13 things-to-do now apply to EVERY public listing,
including the Mickey in Lipa (B38) houses — Haven says they're "from our Welcome Book" and
may combine them with a listing's own `neighborhoodPlaces` tool data when present. House
rules, how-tos, and check-out steps are unchanged — still scoped ONLY to the two B34
listings (`cozy-1-bedroom`, `spacious-2-bedroom`), never generalized to a B38/Mickey
listing or any other property. The excerpt's own exclusions (no address, phone numbers,
emails, bars list, dialect page) are unchanged.

### Material Changes
- **`welcome-book.ts`:** `getWelcomeBook(slug)` now always returns `restaurants`/
  `thingsToDo` (non-null for any slug, including one that doesn't resolve); `houseRules`/
  `howTos`/`checkOutSteps` remain `null` outside the two B34 slugs.
- **`tools.ts`:** `get_property_details`'s `welcomeBook` field is now non-null for every
  property; `get_local_guide` returns the global lists even with no slug or an unresolved
  one, and only attaches house-specific fields for a resolved B34 slug. Messaging updated
  to say "from our Welcome Book" instead of "listed in the B34 Welcome Book."
- **`owner-facts.ts`:** the dated Welcome Book prompt bullet rewritten to state the
  lists-are-global / house-info-is-B34-only split explicitly.

Tests: `welcome-book.test.ts`, `tools.test.ts`, `owner-facts.test.ts` updated — new cases
assert a Mickey (B38) slug gets the global restaurants/things-to-do but `null`
houseRules/howTos/checkOutSteps.

### References
Branch `fix/haven-ai-freetext-reset-101526`, PR #85 (into `dev`). Amends the entry below.

---

## 2026-10-15 — Haven AI: banned "afford" phrasing → booking nudge, B34 Welcome Book, Wi-Fi/access guard (fix/haven-ai-freetext-reset-101526)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,654 tests).

### Outcome
Three more Owner-approved guardrails (Cedric, 2026-10-15), each with the same
tool-only-facts enforcement philosophy as the rest of DEC-029 — a prompt instruction alone
is guidance, not a boundary, so each also gets an independent server-side backstop:
1. **Banned "can you afford it" phrasing.** Haven must never ask or imply anything that
   reads as questioning whether a guest can afford a stay — "Kaya mo na ba?", "Kaya n'yo
   ba?", "Can you afford it?", "within your budget", "kaya ba ng budget" are all banned.
   After stating a quote, she now closes with a booking nudge instead ("Want me to help
   you book it?"/"Gusto n'yo na bang i-book?"/"Gusto n'yo na ga i-book?").
2. **B34 Welcome Book.** An owner-provided, already-sanitized excerpt of the B34 house
   manual ("BV-B34L21 House Manual v020325") is now available to Haven, scoped ONLY to the
   two B34 listings (Cozy 1BR Haven, Spacious 2BR Getaway) — never the Mickey in Lipa
   (B38) listings. Owner decision the same day: Haven may recommend the Welcome Book's 10
   restaurants and 13 attractions **by name** to B34 guests (a narrower exception to the
   2026-10-14 "never invent a place" guardrail, not a repeal of it); the bars list, dialect
   page, address, and staff contact details stay excluded exactly as the owner excerpt
   excludes them.
3. **Wi-Fi and physical-access guard.** Haven must never share a Wi-Fi name/password or a
   door/gate/lock/keybox code, under any circumstance — a direct ask is answered with a
   fixed safe reply pointing to the printed in-house Wi-Fi details or Messenger, skipping
   the model entirely; an independent post-generation scrub catches any such detail that
   somehow appears in the model's own reply.

### Material Changes
- **`owner-facts.ts`:** new `replaceBannedAffordPhrasing()`, run in `chat-service.ts`
  BEFORE `stripBudgetQuestions()` so "within your budget"/"kaya ba ng budget" is replaced
  with the booking nudge rather than silently dropped by that guard's broader `budget`
  regex; new owner-facts prompt bullets for the Welcome Book scoping and the Wi-Fi/access
  rule.
- **`welcome-book.ts`** (new): typed server-only module, `getWelcomeBook(slug)` /
  `isWelcomeBookSlug(slug)`, returning restaurants/things-to-do/house-rules/how-tos/
  check-out-steps ONLY for `cozy-1-bedroom`/`spacious-2-bedroom`, `null` otherwise.
- **`access-guard.ts`** (new): `isWifiOrAccessRequest()` + `buildAccessGuardReply()` (the
  model-skipping direct-ask path) and `containsAccessLeak()`/`scrubAccessLeak()`/
  `ensureAccessHandoffLink()` (the post-generation backstop), in English/Tagalog/
  Batangueño.
- **`tools.ts`:** `get_property_details` gained a `welcomeBook` field; new
  `get_local_guide(slug?)` tool returns the B34 Welcome Book directly (resolving an
  informal name through the existing fuzzy fallback) or a non-B34/no-property pointer
  message.
- **`chat-service.ts`:** `runToolLoop()` checks `isWifiOrAccessRequest()` right after the
  24+ guest handoff check, before property-name pre-resolution; the post-process pipeline
  runs `replaceBannedAffordPhrasing()` and `scrubAccessLeak()`/`ensureAccessHandoffLink()`
  on every model reply.
- **`system-prompt.ts`:** hard rules for both the banned-phrasing/booking-nudge rule and
  the Wi-Fi/access rule.

Tests: `owner-facts.test.ts`, `system-prompt.test.ts`, `welcome-book.test.ts` (new),
`access-guard.test.ts` (new) — including assertions that the Welcome Book content and
every guarded tool output stay free of "wifi", "password", phone numbers, and emails —
plus `chat-service.test.ts`/`tools.test.ts` integration cases.

### References
Branch `fix/haven-ai-freetext-reset-101526`, PR #85 (into `dev`).

---

## 2026-10-15 — Haven AI: server-side property-name pre-resolution, shortName on every property tool result (fix/haven-ai-freetext-reset-101526)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,468 tests).

### Outcome
Live retest on the preview surfaced two failures the existing fuzzy property-name
resolver (`property-resolver.ts`, `resolveSlugFallback` in `tools.ts`) never caught,
because that resolver only ever runs AFTER a model tool call already missed a slug — on a
turn where Haiku answers free-text with no tool call at all, nothing resolved the guest's
wording:
1. Batangueño, after some history, "Mickey in lipa" → Haven replied "hindi ko alam ang
   property na 'yan" (claimed the property didn't exist).
2. "Magkano ga ang yung malaking bahay ng Mickey sa Nobyembre 14 para sa 10?" → Haven
   asked for the exact property name instead of recognizing "malaking bahay" ("the big
   house") as the full-family-house listing.

Both are fixed by pre-resolving the guest's latest message server-side, BEFORE the model
is called — the same pattern `chat-service.ts` already used for dates
(`dateContextNote`) and the 24+ guest capacity note (`buildCapacityContextNote`). A
second, independent gap: a property's `shortName` (e.g. "Mickey in Lipa — Full Family
House", not the raw "Mickey in Lipa | Full Family House•Sleeps 15") was only ever computed
from whatever was mentioned in a single turn's tool exchanges — looking up ONE Mickey
configuration alone couldn't tell it apart from its siblings, since there was nothing else
in the turn to disambiguate against.

### Material Changes
- **`property-resolver.ts`:** three new pure functions reusing the existing
  `resolvePropertyMatch`/`shortPropertyLabels`: `resolveGuestPropertyMention()` (resolves
  the guest's latest message against the full public-listing set — unique, ambiguous, or
  none), `buildPropertyContextNote()` (the system-prompt note: a unique match names the
  slug and short name and forbids asking for the name again, additionally instructing an
  immediate `get_quote` call when dates and a guest count are ALSO already known this
  turn; an ambiguous match lists every candidate's short name and capacity and tells the
  model to ask which one), and `dropUnknownPropertyClaims()` (the independent
  post-process backstop — replaces any "hindi ko alam ang property"/"not in our
  system"/"isn't coming up"/"don't recognize" sentence with a "did you mean ...?"
  question whenever the server itself already found a match or ambiguity list).
- **`chat-service.ts`:** `runToolLoop` now fetches the public listings once per turn,
  resolves the guest's property mention, appends `buildPropertyContextNote()` to the
  system prompt alongside the existing date/capacity notes, and runs
  `dropUnknownPropertyClaims()` right after the existing `shortenPropertyNamesInText()`
  step in the post-process pipeline.
- **`tools.ts`:** `list_properties` and `get_property_details` now both return a
  `shortName` field, computed against the FULL public-listing set (a new `shortNameFor()`
  helper re-fetches listings for `get_property_details`'s single-property case) — always
  correctly disambiguated even when only one of several same-base-name listings is being
  looked up.
- **`post-process.ts`:** `shortPropertyLabels()` is now exported and accepts an optional
  per-pair `shortName`, which always wins over the turn-scoped computed fallback;
  `collectPropertyNamePairs()` carries a tool result's own `shortName` through (for
  `list_properties`/`get_property_details`) so `shortenPropertyNamesInText()` picks it up
  automatically.
- **`system-prompt.ts`:** two new hard rules — always use a property's `shortName`, never
  its raw `name`; and trust a "Context (already resolved/detected by the system...)"
  property note when present, never claiming a property is unknown while one exists.

Tests: `property-resolver.test.ts` (both exact live-failure messages, plus
`buildPropertyContextNote`'s get_quote-trigger and no-get_quote-without-a-guest-count
cases, plus `dropUnknownPropertyClaims`), `tools.test.ts` (`shortName` on both tools,
including the single-Mickey-configuration disambiguation case), `post-process.test.ts`
(an explicit tool-provided `shortName` winning over the computed fallback), `system-prompt.test.ts`,
and `chat-service.test.ts` (both exact live messages end-to-end, plus the get_quote-trigger
and no-match-found-is-a-no-op cases).

### References
Branch `fix/haven-ai-freetext-reset-101526`, PR #85 (into `dev`).

---

## 2026-10-15 — Haven AI: base-rate "from"/"simula" prefix, local-places Welcome Book guardrail (fix/haven-ai-freetext-reset-101526)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,405 tests).

### Outcome
Two new Owner guardrails (Cedric, 2026-10-15), each enforced in the system prompt AND
independently in post-processing (the standing DEC-029 philosophy: a prompt instruction
alone is guidance, not an enforcement boundary):

1. **Base/listing rates always read "from ₱X/night".** Whenever Haven states a base or
   listing nightly rate — a property's own `pricePerNight`, from `list_properties`, or a
   quick property rundown — it must say "from ₱X/night" (Tagalog/Batangueño: "simula ₱X
   kada gabi"), never a bare number, because rates can change. An exact dated
   `get_quote`/`find_stay` quote line (a specific per-night breakdown or total for the
   guest's own `checkIn`/`checkOut`) is unaffected — stated exactly as the tool returned
   it, even if the number happens to equal the base rate (e.g. a single night with no
   extra fees).
2. **Local places / how things work point to the printed Welcome Book.** A restaurant/
   food/groceries/nearby-place/appliance-or-house-thing question is answered by pointing
   the guest to the printed "Welcome Book" in each house, never by looking up or inventing
   a named place online or from general knowledge — a tool's own `neighborhoodPlaces` data
   may still be used when present. Two fixed facts Haven may state directly: an Alfamart
   right outside the subdivision, plus minimarts around the property.

### Material Changes
- **`post-process.ts`:** new `collectBasePrices()` (every `pricePerNight` value in this
  turn's tool results) and `collectDatedQuoteAmounts()` (every other tool-result number)
  let the new `ensureFromPrefix()` tell a bare base rate apart from an exact dated-quote
  figure that happens to equal it. `ensureFromPrefix()` inserts "from "/"simula " directly
  before a matching, unprefixed ₱ amount, skipping one already preceded by "from"/
  "simula"/"starting at".
- **`chat-service.ts`:** wires `collectBasePrices()`/`collectDatedQuoteAmounts()`/
  `ensureFromPrefix()` into the existing post-processing pipeline, right after the
  price-claims guard.
- **`system-prompt.ts`:** a new hard rule spells out the "from ₱X/night"/"simula ₱X kada
  gabi" requirement and the dated-quote-line exception.
- **`owner-facts.ts`:** a new dated fact bullet (Cedric, 2026-10-15) covers local places —
  the Welcome Book pointer, the never-invent-a-place rule, and the Alfamart/minimarts
  facts.

Tests: `post-process.test.ts` (`collectBasePrices`/`collectDatedQuoteAmounts`/
`ensureFromPrefix`, incl. the dated-quote-line exception and the no-double-prefix case),
`system-prompt.test.ts` and `owner-facts.test.ts` (both guardrails' prompt text),
`chat-service.test.ts` (the "Mickey in Lipa — ₱6,500/night" → "from ₱6,500/night"
end-to-end case, and a dated `get_quote` total left untouched even when it numerically
equals the base rate).

### References
Branch `fix/haven-ai-freetext-reset-101526`, PR #85 (into `dev`).

---

## 2026-10-15 — Haven AI: free-text reset-to-greeting fix, long-history validation, "malaking bahay" mapping (fix/haven-ai-freetext-reset-101526)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,360 tests).

### Outcome
Owner-reported live bug: in Batangueño mode, right after Haven replied with a 4-option
list, the guest typed "Mickey in lipa" and the widget reset to the static English root
greeting — mid-conversation, in a non-English chat.

**Root cause:** `ChatWidget.tsx` sends the last 12 messages as history, including Haven's
own previous replies (`assistant` role). `chatRequestSchema` in `chat-service.ts` capped
*every* message, regardless of role, at `MAX_MESSAGE_CHARS` (600) — Haven's multi-option
replies routinely exceed that. The oversized `assistant` history turn failed validation,
so the **entire request** was rejected (`{mode: "static", reason: "error"}`), and the
client's `fallbackToTree()` unconditionally appended `tree.root.message` — the English
welcome text — wiping the guest's language and conversation context.

### Material Changes
- **Server (`chat-service.ts`):** `chatRequestSchema`'s message schema is now a zod
  discriminated union on `role` — `user` content still caps at 600 chars, `assistant`
  history caps at a new `MAX_ASSISTANT_MESSAGE_CHARS` (1500, `config.ts`).
  `normalizeIncomingMessages()` runs before validation: trims history to the most recent
  `MAX_MESSAGES` (12) turns and truncates an over-long `assistant` message to its last
  1500 characters, instead of rejecting the whole request. A genuinely oversized
  **latest guest** message (>600 chars) no longer falls back to static either — it gets a
  deterministic, localized (en/tl/btg) "please shorten that" `{mode: "ai"}` reply with the
  Messenger button, skipping the model (`outcome: "handoff"`, `reason:
  "oversized_message"`, reusing the existing free-text columns — no schema change).
- **Client (`ChatWidget.tsx`):** `fallbackToTree()` no longer injects the static tree's
  root greeting on a mid-conversation static/cap/kill/error response. It now appends a
  short, localized apology (`buildAiFallbackMessage()`, en/tl/btg) with a "Message us on
  Messenger" link button, leaving `messages`/`lang`/`currentNodeId`/`lastMode` and the
  free-text input untouched. The root greeting is now shown only on first load or an
  explicit Reset. Outgoing `assistant`-role history is also clamped client-side to 1500
  chars (`CLIENT_MAX_ASSISTANT_MESSAGE_CHARS`) as defense in depth.
- **`property-resolver.ts`:** the largest-capacity listing's (Mickey Full Family House,
  sleeps 15) alias table gained "biggest"/"largest"/"big" (English — "house" is itself a
  filler token, so "big house" already reduces to "big") and "pinakamalaking" (Tagalog),
  alongside the existing "pinakamalaki"/"malaki"/"malaking". Confirmed (no code change
  needed): a bare "Mickey"/"Mickey in Lipa" with no size/capacity detail already resolved
  `ambiguous` — every Mickey slug contains "mickey"/"in"/"lipa" — which `tools.ts`/
  `system-prompt.ts` already turn into a short clarifying question naming the three
  Mickey listings, never "isn't in our system".

Tests: `chat-service.test.ts` (long `assistant` history accepted and truncated; >12-turn
history trimmed to the most recent 12 instead of rejected; an oversized latest `user`
message gets the friendly AI reply with no provider call; the exact repro sequence
stays in AI mode), `property-resolver.test.ts` (the new English/Tagalog size aliases;
"Mickey in Lipa" ambiguous), `ChatWidget.test.ts` (a mid-conversation static fallback
does not duplicate the root greeting, keeps the selected language pill active, and
leaves the input enabled).

### References
Branch `fix/haven-ai-freetext-reset-101526`, PR pending.

---

## 2026-10-14 — Haven AI live bug fixes: fuzzy property-name resolution, deterministic 24+ guest handoff (fix/haven-ai-guardrails-101426, PR #84, DEC-029)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,333 tests),
committed on `fix/haven-ai-guardrails-101426`.

### Outcome
Two more live bugs fixed in `src/lib/haven/*`, on the same branch as the preview-retest
pass below:

1. **A plausible informal property name got "isn't coming up in our system."** A guest
   asked "Can we check in early at 9am … at the Mickey Full Family House?" and Haven
   wrongly said the property wasn't in the system — every slug-taking tool
   (`get_property_details`, `check_availability`, `get_quote`, `check_early_late`) only
   ever did an exact-slug `WHERE` lookup, so informal/partial names the model passed
   through never matched. Added `src/lib/haven/property-resolver.ts`: a pure,
   DB-free `resolvePropertyMatch(query, listings)` that normalizes case/accents/
   punctuation, strips a `[...]` bracket prefix and a `" | "`/`"•"` suffix, drops filler
   tokens ("house", "bahay", "yung", "sa", "ang", "the"), and scores every public listing
   by token overlap plus a capacity-number bonus (a bare number in the query that matches
   a listing's `maxGuests` outscores a same-named sibling). A small owner-confirmed alias
   table (same pattern as `owner-facts.ts`) covers names that don't appear in any DB
   column at all — "B34"/"B38" block numbers, "Mickey", "pinakamalaki"/"malaki" ("the
   biggest"), "studio" for the Cozy 1BR, etc. Two or more listings tied at the top score
   (e.g. a bare "B38" or "Mickey" — all three configurations qualify equally) come back
   `ambiguous` with a candidate list instead of guessing; `tools.ts`'s new
   `resolveSlugFallback()` is called by each tool only *after* its existing exact-slug
   lookup misses, so a model that already got the slug right (the common case) never
   touches this path at all. `system-prompt.ts` now tells the model to turn an
   `ambiguous: true` tool result into a short clarifying question naming the candidates,
   and to never claim a property isn't in the system when a tool result doesn't say so.
2. **24+ guest handoff wording drifted even with the Messenger link forced on** — the
   model's own clarifying questions and "exactly max"/"might fit" hedging survived the
   existing guardrails because they only ever forced the *link*, never the *text*. The
   model is now skipped entirely for this case: `owner-facts.ts` gained
   `isLargeGroupMessage()`/`isLargeGroupToolCall()` (the same detection
   `needsCapacityHandoff()` already used, pulled out into reusable checks) and a fixed,
   warm `buildLargeGroupHandoffReply()` script in English/Tagalog/Batangueño (`auto` picks
   English vs. Tagalog the same way `isEnglishContext()` already does — there's no
   reliable way to detect Batangueño from the guest's own text, so `auto` never produces
   the `btg` script). `chat-service.ts`'s `runToolLoop()` checks the guest's latest
   message *before* calling the provider at all (zero tokens, zero cost, logged as
   `outcome: "handoff"` — a new, additive value in `HavenChatUsage.outcome`, no schema
   change) and also mid-loop after any tool call, in case a 24+ `find_stay`/`get_quote`
   call happens without the raw message itself parsing to a number.

Tests: `property-resolver.test.ts` (new — exact-slug fast path, "Mickey Full Family
House", "mickey 15", the Tagalog "yung malaking bahay ng Mickey", "spacious 2 bedroom",
"the 1BR", ambiguous "B38"/"Mickey", garbage), `tools.test.ts` (fuzzy fallback for all
four slug-taking tools, ambiguous-candidates shape, fallback never retried on ambiguity),
`owner-facts.test.ts` (`isLargeGroupMessage`, `isLargeGroupToolCall`,
`buildLargeGroupHandoffReply` per language incl. `auto`), `chat-service.test.ts`
(provider never called for a 24+ message in any language incl. "8 adults + 16 kids", mid-
loop handoff on a 24+ `find_stay` call, `outcome: "handoff"` logged with zero cost, a
sub-24 group still reaches the model normally).

---

## 2026-10-14 — Haven AI preview-retest fixes: 24+ handoff parser, early/late fee guard, amenity search, Tagalog-mode Batangueño leak, pricing-arithmetic guard (fix/haven-ai-guardrails-101426, PR #84, DEC-029)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean, 3,219 tests),
committed on `fix/haven-ai-guardrails-101426`.

### Outcome
Five bugs found in a preview retest of the H1 AI chat mode, all fixed in `src/lib/haven/*`:

1. **24+ group handoff didn't fire without a tool call.** `Kami ay 24 na tao sa ikalawang
   Sabado ng Nobyembre. Saan kami pwede?` got a "how many nights?" follow-up instead of a
   handoff — `needsCapacityHandoff()` only checked `find_stay`/`get_quote` tool-call
   arguments, never the guest's own wording. Added `parseGuestCount()` (owner-facts.ts): a
   language-agnostic parser recognizing "24 people/pax/guests/adults", "kami ay 24", "24 na
   tao", "24 katao", and a split group like "8 adults + 4 kids" (summed) — scoped to a
   number sitting next to a people-noun, so a date/time/price number is never picked up.
   `needsCapacityHandoff()` now also checks the parsed count; a new `buildCapacityContextNote()`
   injects a server-resolved instruction into the system prompt (same pattern as
   `dateContextNote`) telling the model to hand off immediately rather than ask for more
   details, with the Messenger button still forced on independently either way.
2. **Price guard swallowed the approved early-check-in/late-checkout fee.** A reply with a
   hallucinated per-hour total (the model computing a specific hours × ₱200 figure instead
   of stating the flat rate) got its whole sentence replaced with the generic "ask us via
   Messenger" fallback — including the correct ₱200/hour fact that was in the same
   sentence. Added `FALLBACK_HOURLY_FEE_TEXT` (post-process.ts): any disallowed amount in
   an early-check-in/late-checkout context now falls back to restating the real ₱200/hour
   rate instead of deflecting to Messenger. `PESO_AMOUNT_SOURCE` broadened to also
   recognize "P200" and "200 pesos" phrasing (not just ₱/PHP), and the system prompt now
   explicitly forbids computing an hours × rate total — state the flat rate only.
3. **Amenity questions (e.g. "Do you have karaoke?") asked which house first**, because the
   model only had `get_property_details` (one property at a time). Added a new `find_amenity`
   tool (tools.ts) that searches every public property's `amenities`/`amenityDetails` for a
   term and reports which propert(y/ies) have it, or `found: false` if none do — read-only,
   no write tools exposed. A new `needsAmenityHandoff()` independently forces the Messenger
   button on whenever `find_amenity` comes back empty.
4. **Tagalog mode (`lang: "tl"`) leaked Batangueño particles** — "ga"/"baga" as a question
   particle, "ari"/"ire" as "this/here" — that should be confined to `btg` mode. Added
   `stripBatanguenoFromTagalog()`, applied whenever the effective reply language is plain
   Tagalog (`tl` always, or `auto` mirroring a Tagalog-speaking guest): converts "ga"/"baga"
   → "ba" and "ari"/"ire" → "ito", preserving capitalization. Leaves the "Oo ga" bare-
   affirmation misuse alone (same carve-out as the btg-mode marker check), and is a no-op
   for `btg`/`en`.
5. **HIGH priority — a Thu→Sat quote read as nights × one night's rate**, undercounting a
   weekend-rate stay (owner report: looked like 2 × ₱2,800 instead of ₱2,800 + ₱3,500 =
   ₱6,300). `computeBookingQuote`/`getDailyRates` were confirmed correct — every `get_quote`/
   `find_stay` call already passes the exact full `checkIn`/`checkOut`; the risk was the
   model doing its own multiplication in prose. Fixed three ways: the system prompt now
   explicitly bans multiplying/summing a rate itself (a `pricePerNight` "from" figure may
   only be stated as "from ₱X/night", and the only total/nightlyTotal Haven may state is the
   one `get_quote`/`find_stay` returned this turn); `get_quote` and `find_stay` now also
   return a `perNight` breakdown (date, weekday, rate) so Haven can show the nightly split
   without recomputing it; and a new `PRICE_ARITHMETIC_RE` check in the price guard rejects
   any "₱2,800 × 2 = ₱5,600"-style arithmetic in the reply outright, even if every number
   involved happens to be individually valid.

Tests: `owner-facts.test.ts` (`parseGuestCount`, `buildCapacityContextNote`, updated
`needsCapacityHandoff`), `post-process.test.ts` (hourly-fee fallback reclassification,
broadened amount formats, `PRICE_ARITHMETIC_RE`, `needsAmenityHandoff`,
`stripBatanguenoFromTagalog`), `tools.test.ts` (`find_amenity`, `get_quote`'s `perNight`
breakdown on a Thu→Sat weekend-rate stay), `system-prompt.test.ts` (arithmetic ban, early/
late fee rule), and `chat-service.test.ts` end-to-end coverage of the exact field-reported
24-guest sentence, the amenity handoff, and the Tagalog-mode particle leak.

---

## 2026-10-14 — Haven AI chat-widget bug fix: topic chips expanded on the welcome screen (fix/haven-ai-guardrails-101426, PR #84)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean), committed on
`fix/haven-ai-guardrails-101426`.

### Outcome
Owner screenshot on `dev` (after PR #83 merged) showed that with the AI flag on, the
welcome screen still rendered all 7 topic chips expanded, pushing the conversation down —
the collapse was gated on `aiModeActive = aiEnabled && lastMode === "ai"`, but the welcome
message always comes from the static tree (`lastMode: "tree"`), so chips started expanded
on first render and stayed expanded after any static-tree turn. Fixed in
`ChatWidget.tsx`: the topic-chip collapse-behind-"Topics"-toggle and the persistent "Talk
to a Human" (`m.me/haveninlipa`) link now gate on `aiEnabled` alone, not `lastMode` —
collapsed by default from the very first render (including a restored `sessionStorage`
session), regardless of whether the latest reply was AI-generated or static. Topics
re-collapse after a chip tap (already did) and now also after the guest sends a free-text
message (`setTopicsOpen(false)` added to `handleFreeTextSubmit`). `aiModeActive` is
unchanged and still gates the AI-reply scroll-to-top-of-message behavior, which is
specifically about "did the latest message come from the AI" rather than "is AI mode on."
Flag-off (`aiEnabled` false) is untouched — renders exactly as before.

Tests: `ChatWidget.test.ts` extended — AI mode now asserts the Topics toggle and no chip
buttons on first render (before any message) with the Messenger link present, that tapping
Topics expands all 7, that chips collapse again after a guest message with the AI bubble
still rendering correctly, and that a static-fallback turn mid-conversation keeps the root
7 chips collapsed with the Messenger link still present (previously asserted the opposite).

---

## 2026-10-14 — Haven AI owner guardrails and facts: capacity, payment, early-check-in/late-checkout fee, quiet hours, karaoke, plus dadalaw/English/name/date-statement fixes (fix/haven-ai-guardrails-101426, DEC-029)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean), committed on `fix/haven-ai-guardrails-101426`, PR open against `dev`. Flag still off by default — no behavior change for any guest until an Owner sets `HAVEN_AI_ENABLED`.

### Outcome
Cedric (the Owner) reviewed H1's live behavior and approved a batch of additional facts and
guardrails, all sourced in a new single-source-of-truth module, `src/lib/haven/owner-facts.ts`
(dated "Cedric, 2026-10-14"):
- **Never ask the guest's budget** — prompt rule plus `stripBudgetQuestions()` drops the
  sentence regardless of what the model says.
- **Capacity is 24 guests combined, across both houses, and counts adults** — there is no
  documented age policy for kids/babies, so Haven must never claim they're free or
  uncounted, and must never promise flexibility for a 24+ guest group, squeezing in extra
  people, or an extra bed/mattress. `needsCapacityHandoff()`/`ensureCapacityHandoffLink()`
  force the Messenger button on for any of those triggers independent of the model's own
  wording; `removeKidsFreeClaims()` replaces a wrongful "kids are free/uncounted" claim
  with a Messenger-confirmation sentence.
- **Full payment is due at booking** — no half payment, no deposit-to-reserve — stated
  directly from the owner-facts prompt block.
- **Early check-in/late checkout is ₱200/hour, every listing, subject to availability** —
  `OWNER_FACT_ALLOWED_AMOUNTS` (`{200}`) is merged into the price guard's allowlist so this
  fact can be stated without a tool call. A new read-only tool, `check_early_late(slug,
  date, kind)`, answers a date-specific question from `getInventoryScopeConflicts()` (the
  same commit-time check the booking flow uses, covering bookings, manual blocks, iCal
  events, and shared-inventory siblings), returning `likely_possible`/`not_possible`/
  `unknown` — never a promise.
- **Quiet hours (10 PM–8 AM) and the other identical-everywhere house rules** (no pets, no
  smoking inside, no parties/events without approval) get a direct general answer instead
  of "which house?" — only a genuinely differing rule (e.g. check-in time) still names the
  difference.
- **Karaoke/equipment answers only from `amenities`/`amenityDetails`** — marketing copy
  (e.g. "a karaoke-and-lechon dinner") is never read as a confirmed-equipment claim.
- **Leftover fixes bundled into the same PR**: `shortenPropertyNamesInText()` applies the
  existing bracket/pipe name shortener to reply text, not just link labels;
  `ensureDatesStated()`/`firstResolvedDateRange()` make an English reply state its resolved
  dates explicitly even when the model's prose omits them; `isEnglishContext()`/
  `stripTagalogWordsInEnglish()` strip a stray Tagalog word from an English reply;
  `fixDadalawPhrasing()` rewrites "ilang guests ang dadalaw" (confusing — "dadalaw" means
  "to visit") to "Ilang guests kayo?"/"Ilan ga kayo?".

New/updated tests: `owner-facts.test.ts` (new), `tools.test.ts` (`check_early_late`'s three
outcomes, a shared-inventory-sibling conflict, an imported-iCal-event conflict),
`post-process.test.ts` (the six new text-level guardrails), `system-prompt.test.ts` (scoped
the few-shot-only price-free assertion now that the owner-facts block legitimately states
₱200), and nine new `chat-service.test.ts` end-to-end cases.

---

## 2026-10-14 — Haven AI terms-of-address pass: provisional-dedupe punctuation cleanup, per-option booking-link dedup, single-offer labels, gendered/neutral address terms, "ga"/"baga" question-only guidance (fix/haven-ai-polish-101426, DEC-029)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean), committed on `fix/haven-ai-polish-101426`, not yet merged to `dev`. Flag still off by default — no behavior change for any guest until an Owner sets `HAVEN_AI_ENABLED`.

### Outcome
A further bug-fix/polish round on `src/lib/haven/post-process.ts`, `system-prompt.ts`, and `chat-service.ts`:
- **Provisional-dedupe punctuation debris** — removing a repeated "provisional" could leave punctuation litter behind (e.g. "(provisional total: ₱10,525)" → "( total: ₱10,525)"). A new `cleanupStrippedPunctuation()` pass collapses a stray "( " to "(", removes a fully empty "()"/"( )" (and a leading space before it), strips a stray leading separator (",", ";", ":", "-", "—") left right after an opening paren, and collapses double spaces.
- **Booking-link dedup scope** — `collectBookingLinks()` used to dedupe by href globally, which incorrectly collapsed a property appearing under two different `find_stay` combo options (e.g. a property that fits both a 2-property and a 3-property combo) into one. Dedup is now scoped to within a single option only; the cap rose from 6 to 8. `chat-service.ts`'s final link assembly was updated to match — it dedupes the model's own prose links against `collectBookingLinks()`'s output and against each other, but no longer globally dedupes `collectBookingLinks()`'s own entries (which would silently re-collapse the intentional cross-option repeats).
- **Single-offer booking-link labels** — a `find_stay` reply with exactly one option and one property (a single property, no combo, no alternatives) now labels its button "Book <name> (<guests> guests)" instead of "Option 1: <name> (<guests> guests)" — there's nothing to number.
- **Terms of address** — the system prompt's existing "no pare/bro/sis/dude" rule is now explicit: also bans "partner", allows the word only if the guest used it first, and gates "parekoy"/"marekoy" (friendly male/female terms) on a clear gender cue — self-identification or a strongly gendered name (prompt examples: "Ako si Maria" → marekoy, "Ako si Juan" → parekoy, "Ako si Toni" → stays neutral). Otherwise the model defaults to "kabayan"/"kaibigan"/"ka-Haven". A new independent post-process check, `enforceTermsOfAddress()`, backs this: any of the five banned terms found in the reply that the guest never used themselves earlier in the conversation gets substituted with "kaibigan" (or "friend" in English mode), preserving capitalization.
- **Batangueño "ga"/"baga" question-only guidance** — the `btg` system prompt now explicitly states "ga"/"baga" are a yes/no question particle ONLY, with a worked example of the common misuse ("Oo ga, may bakante" is WRONG; "Aba'y oo, may bakante!" is the fix), and documents "ire" alongside "ari"/"are". `ensureBatanguenoMarker()`'s regex was updated to match: a negative lookbehind excludes a bare "Oo ga"/"Oo baga" affirmation from counting as a genuine marker, while still recognizing "ire" and a correctly-used "baga". The prompt also gained a vetted list of further natural, respectful Batangueño and Filipino-courtesy expressions (e.g. "kapeng barako", "Tuloy po kayo", "Mabuhay") to use at most 1–2 per reply.

New/updated tests: `post-process.test.ts` (the exact reported "( total: ₱10,525)" cleanup case, empty-parens removal, per-option booking-link dedup vs. cross-option repeats, the 8-link cap, single-offer vs. multi-offer labels, `ensureBatanguenoMarker`'s "ire"/"baga" recognition and "Oo ga"/"Oo baga" misuse exclusion, `enforceTermsOfAddress`), `system-prompt.test.ts` (terms-of-address rule content, the "ga"/"baga" question-only + misuse example, the vetted expression list), `chat-service.test.ts` (end-to-end banned-term substitution and guest-used-it-first exemption).

---

## 2026-10-14 — Haven AI live-test bug-fix pass: Messenger link scheme, provisional-dedupe artifact, Tagalog/Batangueño dates, booking-link labels, Batangueño markers (fix/haven-ai-polish-101426, DEC-029)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean), committed on `fix/haven-ai-polish-101426`, not yet merged to `dev`. Flag still off by default — no behavior change for any guest until an Owner sets `HAVEN_AI_ENABLED`.

### Outcome
A further round of live dev testing of H0+H1 surfaced five bugs, all fixed in `src/lib/haven/dates.ts`, `post-process.ts`, `system-prompt.ts`, and `chat-service.ts` (no widget change needed — the widget already rendered whatever href it was given verbatim):
- **Messenger link scheme** — the handoff link was sometimes emitted as the scheme-less `m.me/haveninlipa`, which `ChatWidget.tsx` renders as a broken *relative* link (no `/` prefix, not `haveninlipa.com`, so it resolves against the current page path). `post-process.ts` now has a single canonical `MESSENGER_HREF = "https://m.me/haveninlipa"` constant; `normalizeHref()` rewrites any scheme-less form to it wherever a link passes through `extractAllowedLinks()`; `ensureHandoffLink()`, `FALLBACK_FEE_TEXT`, `system-prompt.ts`'s hard rules, and `chat-service.ts`'s `NO_ANSWER_FALLBACK` all now say the `https://` form.
- **"Provisional" dedupe artifact** — `limitToOneProvisional()` used to strip only the bare word, leaving a repeat's own markdown emphasis behind empty (e.g. "**Option 2** — ** total ₱10,525"). It now matches `**provisional**`/`*provisional*`/`__provisional__`/`_provisional_` as one atomic unit before falling back to the bare word, so a repeat's emphasis markers are removed with it.
- **Date resolution skipping to "what year"** — the model sometimes skipped its own `resolve_dates` tool call and asked the guest "2024 o 2025?". `dates.ts`'s weekday/month/ordinal vocabularies gained Tagalog and Batangueño forms (`Linggo`–`Sabado`, `Enero`–`Disyembre`, `ikalawang`/`una`/…, "ng" alongside "of"/"in", "susunod na" alongside "next"), and `chat-service.ts` now runs this same resolver on the guest's latest message *before* calling the model at all, injecting a system context note with the resolved dates (ISO + human form) and an explicit "never ask what year" instruction when a phrase is detected.
- **Booking-link labels** — `collectBookingLinks()` used to label a button with the raw `Property.name` (which can carry a dev-DB bracket tag or an SEO `"Name | descriptor"` suffix). It now strips a leading `[...]` bracket tag and cuts at the first `" | "` or `"•"` (`stripToBaseName()`), reusing `buildShortNames()` (`src/lib/listings.ts`) to keep a distinguishing second segment for properties sharing a base name (e.g. the three "Mickey in Lipa" configurations). `find_stay` options are now labeled and grouped "Option N: \<name\> (\<guests\> guests)" in the same order the options array (and therefore the reply prose) lists them, and the cap rose from 5 to 6.
- **Batangueño markers** — `system-prompt.ts`'s `btg` guidance had loose/partly-inaccurate marker glosses; rewritten with correct usage notes for each of "ala eh", "aba'y", "ga", "nga", "ari"/"are", plus a longer (6–8 line) placeholder-only few-shot block. A new server-side check, `ensureBatanguenoMarker()`, prepends a short natural opener ("Ala eh, ") to any `btg` reply that landed with none of these markers, so the mode never silently degrades to plain Tagalog.

New/updated tests: `dates.test.ts` (Tagalog weekday/month/ordinal resolution, the exact "ikalawang Sabado ng Nobyembre" live-test phrase, "susunod na Sabado"), `post-process.test.ts` (`normalizeHref`, the exact reported provisional-dedupe regression, the new booking-link label format, `ensureBatanguenoMarker`), `chat-service.test.ts` (date-context injection into the system prompt, the btg-marker prepend), and a new `system-prompt.test.ts`.

---

## 2026-10-14 — Haven AI chat-widget UX pass: collapsible topics, reply-start scroll, distinct AI bubble (fix/haven-ai-polish-101426, DEC-029)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean), committed on `fix/haven-ai-polish-101426`, not yet merged to `dev`.

### Outcome
Owner UX feedback on the live chat widget: the 7 static topic chips (`src/lib/chat/chat-tree.ts`'s `root.options`) sat below every message, including Haven's AI replies, so the owner scrolled to "bottom" and saw the chip grid instead of the reply. Fixed in `ChatWidget.tsx`/`ChatMessage.tsx`, gated on a new `aiModeActive = aiEnabled && lastMode === "ai"` (`lastMode` tracks whether the *most recent* Haven message actually came from the AI vs. the static tree — flag off, or any turn that fell back to the tree, renders exactly as before this pass):
- Topic chips collapse behind a small "Topics" toggle once `aiModeActive`; tapping it still works as before.
- A persistent "Talk to a Human" text link (`m.me/haveninlipa`) stays visible near the input in AI mode, since the toggle can hide the chip version.
- Auto-scroll now scrolls to the *top* of Haven's newest reply in AI mode (not the panel bottom, which used to land on the chip grid), deferred one `requestAnimationFrame` so a reply's booking-link buttons have their final layout first. Static mode's scroll-to-bottom is unchanged.
- AI replies get a distinct `bg-cream` bubble with a "Haven" label (vs. the unchanged `bg-white` static-tree bubble) — `text-charcoal/80`, not `text-forest`, since forest-on-cream falls short of WCAG AA at this bubble's size. The message list carries `aria-live="polite"`.
- New `ChatWidget.test.ts` (jsdom, mounts the real component) covers: static mode still renders all 7 chips with no "Topics" toggle; an AI-mode turn collapses chips and exposes the persistent Messenger link; a fallback turn renders exactly like static mode.

---

## 2026-10-14 — Haven AI polish pass: booking-link buttons, sentence-level price guard, stronger Batangueño, handoff (fix/haven-ai-polish-101426, DEC-029)

Area: Website

Status: Code complete and tested (lint/typecheck/`vitest run` clean), committed on `fix/haven-ai-polish-101426`, not yet merged to `dev`. Flag still off by default — no behavior change for any guest until an Owner sets `HAVEN_AI_ENABLED`.

### Outcome
Live dev testing of H0+H1 (the prior entry below) surfaced several rough edges, fixed in
`src/lib/haven/post-process.ts`, `tools.ts`, `system-prompt.ts`, and `chat-service.ts`:
- **Booking-link buttons** — `collectBookingLinks()` turns every booking link a tool
  actually produced this turn (`get_quote`, `find_stay`) into a labeled button ("Book
  <property> · <dates>", deduped, capped at 5), instead of relying on the model to format
  one as a markdown link (it often didn't, so replies returned `links: []`).
- **Sentence-level price guard** — `enforcePriceClaims()` used to replace only the matched
  ₱ amount, leaving broken fragments like "(You'll see the exact total at checkout./hour)".
  It now replaces the whole sentence or bullet line, with a fee-vs-total-aware fallback
  ("For that fee, please ask us via Messenger…" vs "You'll see the exact total at
  checkout."). `get_quote`/`get_property_details` now surface a property `name` and a
  structured `fees` object (extra-guest, early-check-in/late-checkout) so real fee numbers
  are traceable instead of forcing every fee question into the Messenger fallback.
- **Stronger Batangueño mode** — `btg` gained a 4-exchange few-shot block in a playful
  Batangueña host voice, using real expressions ("ala eh", "aba'y", "ga", "nga", "ari", "ala
  e ganoon") with placeholder-only facts so an example can never leak as real data.
- **Explicit resolved dates, neutral address, Messenger handoff, "provisional" once** — the
  system prompt now requires stating resolved dates explicitly, bans "pare"/"bro"/"sis" in
  English, and requires the literal m.me/haveninlipa text for any off-topic/unknown
  question; `ensureHandoffLink()` and `limitToOneProvisional()` back the last two with a
  server-side check that doesn't depend on the model complying.
- Added/extended unit tests for all of the above (`post-process.test.ts`, `tools.test.ts`,
  `chat-service.test.ts`) and a per-property guest-split-cap assertion to
  `find-stay-combinations.test.ts`.

---

## 2026-10-14 — CI "Migrations" row-count check fixed for expand-only migrations (feature/haven-ai-h1-101426)

Area: Website

Status: Done.

### Outcome
`scripts/test-migrations.mjs` section 2 ("no rows were added or removed by them") compared
a single flattened `"table:count|..."` string across all tables, so a later migration that
only *creates* a new, empty table (allowed as expand-only under
[DEC-026](HIL_DECISIONS.md)) still failed the check — the new table's `name:0` entry changed
the string even though no existing row moved. This is what broke CI for
`20261014120000_add_haven_chat_ai`, which creates two empty tables
(`HavenChatUsage`, `HavenChatTranscript`).

Fixed by comparing per table instead of as one string: every table present before the later
migrations must still exist afterward with an identical row count, and any table that is new
must start at 0 rows. Dropped tables and data changes (inserts/deletes) in existing tables
still fail, same as before. See [HIL_MIGRATION_RUNBOOK.md](HIL_MIGRATION_RUNBOOK.md) (Review
checklist, section 2) for the documented behavior.

---

## 2026-10-14 — Haven AI chat mode, H0+H1 (feature/haven-ai-h1-101426, DEC-029)

Area: Website

Status: **Code complete and tested (lint/typecheck/`vitest run` clean), committed on `feature/haven-ai-h1-101426`, not yet merged. Flag off by default (`HAVEN_AI_ENABLED` unset) — no behavior change for any guest until an Owner sets it.**

### Outcome
Adds an optional free-text LLM mode to the existing static chat widget, entirely behind
`HAVEN_AI_ENABLED` (kill switch `HAVEN_AI_KILL`). With the flag off, behavior is
byte-identical to before this session.
- **`src/lib/haven/`** — provider adapter (`anthropic` default / `openai`, raw `fetch`, no
  vendor SDK dependency); `resolveDates()` for natural-language date phrases ("this
  weekend", "2nd Saturday of November", "Dec 24-26"), pure and Asia/Manila-anchored;
  seven read-only, zod-validated tools (`list_properties`, `get_property_details`,
  `check_availability`, `get_quote`, `find_stay`, `get_faq`, `resolve_dates`), each
  calling an **existing** service — nothing in the AI path computes a price or
  availability decision itself; the fixed persona/rules system prompt; post-generation
  guardrails (link allowlist, price-claim enforcement against this turn's tool results);
  PII masking before any transcript write; DB-backed rate limits (20/10 min, 100/day per
  IP, 600/hour global) and a monthly spend cap (`HAVEN_AI_MONTHLY_CAP_USD`, default $20,
  with a one-alert-per-month admin email); the `handleHavenChat()` orchestrator, which
  never throws — every failure degrades to `{mode: "static"}`.
- **`POST /api/haven/chat`** (Node runtime, 20 s race) and **`/api/cron/haven-retention`**
  (daily Vercel Cron — 90-day transcript retention, 13-month usage retention).
- **Widget:** `ChatWidgetServer` passes `aiEnabled` (server-computed); when on, a language
  toggle (Auto/English/Tagalog/Batangueño) and a free-text input with a typing indicator
  appear, persisted in `sessionStorage` with a client-generated `sessionId`; a privacy
  note links `/privacy`. The existing topic buttons and "Talk to a Human" link are
  unconditional — both modes coexist.
- **GA4:** `haven_ai_message`, `haven_ai_lang_select`, `haven_ai_fallback`,
  `haven_ai_availability_checked`, `haven_ai_booking_link_click` — all via `track()`, no
  message text or PII.
- **Schema:** two new, additive tables — `HavenChatUsage` (one row per guest message, for
  rate limiting and the spend cap) and `HavenChatTranscript` (masked message content, 90-day
  retention). Migration `20261014120000_add_haven_chat_ai`, generated via a schema-to-schema
  diff (`prisma migrate diff --from-schema-datamodel <before> --to-schema-datamodel
  schema.prisma --script`, no database connection). **Not yet applied to any database** —
  ships migrate-first per the runbook; the release gate will block the build until an
  operator applies it to dev, then production.
- **Docs:** [DEC-029](HIL_DECISIONS.md); [Haven AI Chat](HIL%20Website%20Technical%20Specification.md#haven-ai-chat)
  in the Website spec; env vars in both `CLAUDE.md` and the Website spec's Environment
  Variables table; a new "Haven, Our Chat Assistant" section in `/privacy`.
- **Not in scope for H1 (by design):** no write action — booking creation, payment, admin
  mutation — is exposed as a tool. Payment, booking-creation, Stripe, and admin code are
  untouched. Next: H2 (lead capture/inquiry handoff) and a private, read-only admin Haven
  mode behind `/admin`.

### Evidence
Lint clean, `tsc --noEmit` clean, `npx vitest run`: full suite green (177 files / 2,634
tests, ~290 of them new Haven AI tests across 11 files: `dates`, `masking`,
`post-process`, `find-stay-combinations`, `provider`, `rate-limit`, `config`, `tools`,
`chat-service`, `retention`, `no-public-env`). Covers: flag off/kill → static; request
validation; rate limits; monthly-cap fallback and the one-alert-per-month dedupe; date
resolver cases including year rollover and the Manila UTC-16:00 timezone edge;
`find_stay` single-property and combination results with inventory-group exclusion; the
price post-check and link allowlist; PII masking; provider swap (anthropic ↔ openai); a
provider error falling back to static; and that no Haven AI source file reads a
`NEXT_PUBLIC_*` env var. `npm run build:app` not exercised (no DB connection permitted for
this task; the migration gate needs a database). No real call to Anthropic or OpenAI was
made — `fetch` is mocked in every provider test.

---

## 2026-10-14 — Release dev → main: DEC-025 footer-credit closeout docs (release/dev-to-main-2026-10-14)

Area: Website | Docs

Status: **PR open against `main`; Owner merges.** Docs-only. The footer code itself has been live since 2026-10-06 (PR #63); this release carries the five `dev`-only docs commits (PRs #64, #65: DEC-025 marked live on main site and blog, housekeeping decisions). One conflict in `HIL_PROJECT_STATUS.md`, resolved in favour of `main`'s newer content with the DEC-025 row taken from `dev`. DEC-025 is unique on `main` (no renumbering). Back-merge `main` → `dev` needed after merge.

## 2026-10-12 — Instant Booking Modes & Booking Requests (PR #78, DEC-028)

Area: Website

Status: **Live on production since 2026-10-13 00:49 UTC** (PR #78, merge `206dbde`; Vercel Production deployment for `206dbde` Ready; release gate ran against `u694568445_cedcasprop`; CI on the PR green: Lint, Type Check, Unit Tests, Build, Migrations). Verified live, signed out: `/api/availability/[slug]` returns `requiresApproval` (false on all 5 listings); `/pay/booking/<unknown>` is 404; `POST /api/bookings/pay/<unknown>` is `not_found`; `POST /api/admin/bookings/1/request` is 401; `/api/cron/booking-requests` is 401 without the cron secret. **All 5 listings are On, so guest behaviour is unchanged.**

**Not yet done:** the Owner's acceptance test (request → correct → approve → pay by GCash and by card → decline → phone check). The merge went in before it. No listing should be switched to Off on production until it passes on a preview or dev build. No request, approval or payment-link payment has been made on production.

### Outcome
- `Property.instantBookingMode` (`on` default / `off` / `auto`, `auto` stored but not offered); set in Admin → Edit Property → Booking Settings.
- Statuses `requested`, `approved`, `declined`, `expired` added; `BLOCKING_BOOKING_STATUSES` unchanged, so a request holds no dates.
- Request creation in `POST /api/bookings`; the card and checkout routes refuse an approval-required listing.
- Admin Approve / Decline (`checkPermission("bookings")`), status control limited to valid transitions, correct-then-approve with re-quote.
- `/pay/booking/[token]` and `POST /api/bookings/pay/[token]`: dates claimed under the inventory lock on payment (GCash/BPI → `pending`, verified card → `confirmed`).
- Vercel Cron `/api/cron/booking-requests` every 5 minutes: 24-hour expiry of requests and payment links, one-time alert for a GCash/BPI payment unverified after 24 hours.
- Status audit fixes: admin calendar, message threading, customers, dashboard, checkout-abandonment backstop. `/pay/booking/<token>` redacted from GA4 `page_location`.
- GA4 `booking_request` for a request; `booking_confirmed` and `purchase` fire on the payment-link page.
- Unique index on `Booking.stripePaymentIntentId` (closes the DEC-020 residual race).
- Tests: 2,289 unit tests pass (about 210 new). Local real-database suite: all new request and payment-link cases pass, including concurrent payers.

### Migration run records
| Target | Database | Commit | Applied (UTC) | Result |
|---|---|---|---|---|
| dev | `u694568445_cedcasprop_dev` | `89a4d94` | 2026-10-13 00:24:15–00:24:34 | applied, `Schema verified`, `NO DRIFT` |
| production | `u694568445_cedcasprop` | `206dbde` | 2026-10-13 00:39:11–00:39:31 | applied, `Schema verified`, `NO DRIFT` |

Migration: `20261012223750_add_instant_booking_requests` (additive: 1 `Property` column, 8 `Booking` columns, 2 unique indexes, 1 index, 1 foreign key). `89a4d94` → `206dbde` is the merge commit only. Before the production run: 0 duplicate `stripePaymentIntentId` values.

Production backup before the run: `~/hil-db-backups/hil-production-20261013T003810Z.sql.gz` on the Owner's Mac (outside the repository and Dropbox, file `600`, sha256 `cd529e46d2ed1087…`). Restore-tested into a throwaway local server: all 24 tables matched production on row count. Contains guest data; **retention is the Owner's decision**.

### Gotchas
- **Merged before the production migration.** The first Production build of `206dbde` (00:32 UTC) was stopped by the release gate: `BLOCKED: migration(s) not applied`. The previous deployment kept serving and nothing was written. The migration was then applied and the Owner redeployed. This is the order the runbook warns about; the gate did its job.
- The PR's first preview build failed the same way until the migration was on dev, then passed on redeploy.
- Production URL: `.env` has only the dev `DATABASE_URL`. The production run read `DATABASE_URL` from `.env.bak-encode` (2026-08-06), and the command confirmed the database name with the server before writing. That file holds a working production credential.
- `npm run test:db` has 5 failing cases in "amendment vs. reminder send", identical on `main` before this change (they fail with "This stay is in progress"). Not investigated.
- `next dev` (Turbopack) panics with `Permission denied (os error 13)` in the agent sandbox; the local smoke test used `next build` + `next start` against a scratch database with SMTP pointed at a dead port.
- The Mac's MariaDB accepts socket connections only; a throwaway `mariadbd` on port 33917 served as `--reference-url` and for `npm run test:migrations`.

---

## 2026-10-12 — Same-Day Booking & Advance Notice, Session 1: today floor and per-listing policy (PR #74, DEC-027)

Area: Website

Status: **Live on production since 2026-10-12** (PR #74, merge `a372f1a`, merged 21:40 UTC; Vercel Production deployment `success`; CI on `main` green). Verified live: `/api/availability/[slug]` returns the Manila-date `earliestCheckIn`; `/api/stripe/payment-intent`, `/api/checkout-attempts` and `/api/bookings` each refuse a past check-in with 409 `too_soon`; property and `/book` pages 200.

**Session 2 live on production since 2026-10-12** (PR #76, merge `bc3bd40`, merged 22:00 UTC; Vercel Production deployment `success`; CI on `main` green): Admin → Edit Property → Booking Settings (advance notice; same-day cutoff every half hour 6:00 AM–11:30 PM; copy-to-house checkbox; one `AdminLog` entry per changed listing) and guest date pickers taking `min` from `/api/availability/[slug]?earliest=1`. No schema change. Owner accepted the preview and checked production in a browser.

**Settings in effect:** all 5 listings are same day with an 11:30 PM cutoff, set by the Owner in admin 2026-10-12 22:05 and 22:15 UTC (5 `AdminLog` entries; values read back from the production database). The feature is complete; Instant Booking (step 2) is not started.

### Outcome
- The three guest routes refuse a check-in before today in Lipa (Asia/Manila) for every payment method; both date pickers use the Manila date instead of the UTC date.
- `Property.advanceNoticeDays` (default 0) and `Property.sameDayCutoffMinutes` (null) added; all 5 listings hold the defaults, so the today floor is the only behaviour change.
- `src/lib/booking-policy.ts` (pure, clock-injected); 30-minute grace at final submission; a card paid outside it takes the paid-but-not-booked path; `/api/availability/[slug]` returns `earliestCheckIn`.
- `scripts/test-migrations.mjs` updated: it assumed the baseline was the only migration and failed CI on the first real one.

### Migration run records
| Target | Database | Commit | Applied (UTC) | Result |
|---|---|---|---|---|
| dev | `u694568445_cedcasprop_dev` | `467a5c2` | 2026-10-12 21:27 | applied, `Schema verified`, `NO DRIFT` |
| production | `u694568445_cedcasprop` | `e25a563` | 2026-10-12 21:34:58–21:35:16 | applied, `Schema verified`, `NO DRIFT`; pending `[]`, failed `[]` |

Migration: `20261012184848_add_property_advance_notice` (additive `ALTER TABLE Property ADD COLUMN` ×2). `467a5c2` → `e25a563` is docs only.

Production backup before the run: `~/hil-db-backups/hil-production-20261012T213321Z.sql.gz` on the Owner's Mac (outside the repository and Dropbox, file `600`, sha256 `3286d34299ae3c91…`). Restore-tested into a throwaway local server: all 24 tables matched production on row count and `CHECKSUM TABLE`. Contains guest data; **retention is the Owner's decision**. Row counts unchanged after the migration (Booking 13, Property 5, AdminLog 1367, GuestMessage 78).

### Gotchas
- Local `.env` no longer has active `DEV_DATABASE_URL` / `PRODUCTION_DATABASE_URL` keys (both are commented); dev was read from `DATABASE_URL` and production from the commented line via `MIGRATE_DATABASE_URL`, without editing the file.
- The Mac's MariaDB refuses `root@127.0.0.1:3306`, which the runbook's `--reference-url` uses. A throwaway `mariadbd` on another loopback port (`mariadb-install-db --auth-root-authentication-method=normal`) served as the reference and was deleted afterwards.

---

## 2026-10-10 — Booking-intent SEO copy on `/properties`/`/staycation` + homepage link; dark-pink backgrounds → homepage pink

Area: Website / SEO

Status: **Built, tested, not yet merged.** Owner approved both parts same-day (copy proposal `content/seo/runs/101026/Booking_Intent_SEO_Proposal_101026.md`; background change requested directly).

### Outcome — booking-intent copy (Part 1)
Shipped exactly as Owner-approved, with one exception found and held rather than shipped:
- `/properties`: fixed title `Apartments for Rent in Lipa City, Batangas` (58 rendered, was 68 — over budget), DB-count-gated description (160 / 153 chars), new H1 `Apartments & Transient Houses for Rent in Lipa City`, reworded intro paragraph (still `numberWord(count)`-derived, DEC-007).
- `/staycation`: fixed title `Lipa City Staycation & Vacation Rental Homes` (60 rendered), H1 keeps the DB-derived count/plural pattern with a renamed prefix, one sentence appended to the existing intro.
- **Held, not shipped:** `/staycation`'s proposed meta description. As rendered it measures 187 chars (fallback) / 213–214 chars (`count === 5`, with a real peso amount) — both well over the 160-char budget the proposal itself was supposed to respect. The proposal's own length note (159 chars) described the pre-existing copy, not the new text, which was never re-measured before Owner approval. Per the task's own rule ("stop and report rather than reword"), the description was left exactly as it was. Also found in passing: the *pre-existing, unchanged* fallback description already renders at 167 chars, over budget independently of this work — a separate, pre-existing issue, not introduced here.
- Homepage ("Our Rentals" section) gained a second button, "Browse all homes" → `/properties`, next to the existing "See staycation options" → `/staycation`. Confirmed by grep that no direct homepage link to `/properties` existed before (the navbar's "Properties" link is the on-page anchor `/#properties`).
- New tests: `src/lib/__tests__/properties-page.test.ts`, `src/lib/__tests__/staycation-page.test.ts`, `src/lib/__tests__/homepage-properties-link.test.ts` — title/H1/intro content and rendered-length budgets, with and without a database.

### Outcome — dark-pink background → homepage pink (Part 2)
The Owner flagged `/properties`' background as a dark pink that should match the homepage's lighter pink. Evidence: `bg-cream`/`bg-sand` (`#F5BECA`, alias tokens, same hex) is a saturated pink despite the name; `bg-offwhite` (`#FFF8FA`) is the homepage body color and the color `/staycation`/`/weddings-accommodation` already use for the same reason (their own code comments predate this task and already call out the `#F5BECA` naming trap).
- Changed the Tailwind **class usage**, not the token definitions — `cream`/`sand` are still the right color for small accents (icon chips, hover states, admin chat UI) that were deliberately left untouched.
- `bg-cream` → `bg-offwhite` on 7 full-page `<main>` backgrounds (`/properties`, `/about`, `/faq`, `/terms`, `/privacy`, `/ambassadors`, `/pay/[token]`) and the homepage's own `FAQ.tsx` section background.
- **Contrast (WCAG AA):** every text/background pair measured improves after the swap (never regresses) — e.g. full-opacity `charcoal` on the old dark pink was 5.45:1, now 8.34:1 on the new background; the worst-case `charcoal/35` muted text goes 1.67:1 → 1.81:1. Some sub-AA pairs pre-dated this change and remain sub-AA after it (most `charcoal/*` opacity levels below ~80%, the `forest` link color, and the `coral` accent color, against either background) — these are a known, already-tracked gap (`HIL_PROJECT_STATUS.md`'s "main-site property-page accessibility items (contrast…)" item), not something this background-only change attempted to fix, since doing so would mean changing brand accent/link colors site-wide, which is out of this task's scope and not Owner-authorized.

### Evidence
Lint clean, `tsc --noEmit` clean, `vitest run`: 111 files / 1629 tests passed (10 new, across 3 of 3 timezone configs). `npm run build:app` could not be verified in this sandboxed git worktree — Turbopack fails on a pre-existing cross-worktree `node_modules` symlink ("Symlink node_modules is invalid, it points out of the filesystem root"), unrelated to this change and reproducible on an unmodified checkout of the same worktree.

---

## 2026-10-10 — Newsletter signup → Hostinger Reach

Area: Website

Status: **Code complete and tested (lint/typecheck/`vitest run` clean, 1776 tests), committed on `feature/newsletter-signup-101026`, not yet merged.** Owner-approved 2026-10-10; to be linked from a future SMS campaign.

### Outcome
A standalone `/newsletter` page plus email-only signup strips on the homepage and in the
footer, all backed by one `NewsletterSignup.tsx` client component (`variant="page"|"strip"`,
`source`) and one route, `POST /api/newsletter`. No `Booking`/DB table is created — the
contact is written directly into **Hostinger Reach** (`src/lib/hostinger-reach.ts`), HIL's
mailing-list tool, so this ships with **no Prisma schema change**.
- **Validation** (`src/lib/newsletter.ts`, pure/unit-tested): email required; optional
  first name (≤50 chars) and PH mobile — the phone path reuses the existing
  `src/lib/phone.ts` `normalizePhone()` rather than a second parser, requiring a
  `+639XXXXXXXXX` mobile shape.
- **Honeypot** (`company`, hidden) and a **per-IP in-memory rate limiter** (5 / 10 min,
  same best-effort pattern as `/api/security-alert`) guard the route.
- **UTM passthrough:** the client captures `utm_source/medium/campaign/content/term` from
  the landing URL into `sessionStorage`, so a signup later in the same session (e.g. the
  footer, after landing via a tagged link) still carries the original attribution; the
  server re-whitelists/length-caps them before folding into Reach's free-text `note`
  alongside `source` and `page`.
- **Hostinger Reach client:** duplicate contact (409, or 422 mentioning
  "already"/"exists"/"taken") is treated as a friendly success
  (`alreadySubscribed: true`); a missing `HOSTINGER_REACH_API_TOKEN` never throws — 503,
  logged as a warning with no secret value; other upstream failures/timeouts (8 s
  `AbortController`) are 502 with a friendly message, never echoing the upstream body or
  the token.
- **GA4:** `generate_lead` fires on success (including `alreadySubscribed`) with
  `{ method: "newsletter", lead_source: <source> }`, no PII — added to the Website spec's
  GA4 events table.
- `/newsletter` added to `sitemap.ts` (priority 0.3, yearly, no `lastModified` — fixed-copy
  treatment, like `/privacy`/`/terms`); title/description pinned under the SERP length caps.

### Evidence
Lint clean, `tsc --noEmit` clean, `vitest run`: 120 files / 1776 tests passed (18 new in
`src/lib/__tests__/newsletter.test.ts`, `hostinger-reach.test.ts`, `newsletter-route.test.ts`,
`newsletter-page.test.ts`, `newsletter-signup-render.test.ts`; `sitemap.test.ts` extended for
`/newsletter`). `npm run build:app` not exercised this session — same documented
environment-only Turbopack/`node_modules`-symlink limitation as the 2026-10-10 `purchase`
event session, not a code defect. No real call to the Hostinger Reach API was made from this
session (constraint of the task); `fetch` is mocked in every test that reaches
`subscribeToReach()`.

---

## 2026-10-10 — GA4 `purchase` event added alongside `booking_confirmed` (ecommerce revenue reporting fix)

Area: Website / Analytics

Status: **Code complete and tested (lint/typecheck/`vitest run` clean), committed, not yet merged.** Owner-approved 2026-10-10.

### Outcome
A GA4 Data API reconciliation (property 532187541) found `booking_confirmed` arriving
correctly with its custom params (14 events, `eventValue` 61,627, `Booking Ref`/`Listing`
dimensions populated) but GA4's **built-in** `transactionId` stayed `(not set)` and
`purchaseRevenue` stayed 0 — those fields, and the Monetization → Ecommerce purchases
reports, are only populated by the recommended `purchase` event
(`transaction_id`/`value`/`currency`/`items`), which had never been sent. Fix: fire
`purchase` **alongside** `booking_confirmed` (never replacing it — continuity preserved,
same key event):
- **Client:** [BookingForm.tsx](HIL%20Website%20Technical%20Specification.md)'s existing
  `booking_confirmed` effect also calls the new `trackPurchaseOnce()` from
  `src/lib/ga4-purchase.ts` — pure param builder (`buildPurchaseParams`, with a
  nights-unknown fallback to `quantity: 1`) plus a `sessionStorage`-backed per-`transaction_id`
  dedup guard (`shouldSendPurchase`/`markPurchaseSent`, fails open if storage throws).
- **Server (still OFF by default):** `src/lib/ga4-measurement-protocol.ts`'s
  `sendBookingConfirmedMeasurementEvent` optionally queues a `purchase` event in the same
  Measurement Protocol request when given `propertyName`/`nights` — both call sites
  (`POST /api/bookings` Stripe auto-confirm; `PUT /api/admin/bookings/[id]`
  `becameConfirmed`) now supply them, so if `GA4_MP_ENABLED` is ever turned on the
  GCash/BPI admin-confirm path also reports `purchase` revenue. GA4 de-duplicates
  `purchase` by `transaction_id`; `booking_confirmed` is a custom event and is not
  de-duplicated.
- Full write-up, params, and Owner verification steps: [GA4 Analytics Events → `purchase`](HIL%20Website%20Technical%20Specification.md#purchase--fired-alongside-booking_confirmed-2026-10-10).

### Evidence
Lint clean, `tsc --noEmit` clean, `vitest run`: 105 files / 1632 tests passed (9 new in
`src/lib/__tests__/ga4-purchase.test.ts`; 2 new in `ga4-measurement-protocol.test.ts`;
existing `booking_confirmed`/MP tests unchanged and still pass). `npm run build:app` could
not be exercised in this session — the worktree's `node_modules` is a symlink into a
different workspace root, which Turbopack's sandboxed build rejects (`Symlink node_modules
is invalid`); this is an environment limitation, not a code issue, and `tsc --noEmit`
already covers the type-level surface `next build` would check.

---

## 2026-10-10 — Mickey Sleeps 11 "Groups of 12 or more" segment retitled (Stay Match false-positive fix)

Area: Website / Content / Blog (Stay Match)

Status: **Code complete and tested; production update pending the Owner running a new targeted script.** PR #67 (plugin v1.0.3) closed as superseded by this content fix.

### Outcome
Stay Match (blog plugin) scores an intent phrase against each property's `bestForSegments` title (3x) + body (1x). Sleeps 11's upsell segment was titled "Groups of 12 or more," so a reader's "groups of 12 or more" phrase recommended the 11-guest house for a group it can't actually fit. Retitled/reworded in `prisma/property-content/mickey-content.ts` (slug `mickey-in-lipa--family-house--sleeps-11`, property id 4):
- Title: "Groups of 12 or more" → "Need more room? See the full house"
- Body: now states the rate covers 9 / sleeps up to 11 / extra per-guest fee for guests 10–11, then points to the full-house configuration — no longer implying this house fits 12+.
- `internalLinkLabel`/`internalLinkUrl` (→ the Sleeps-15 full house) unchanged.
- Body stays number-free (no peso amount, per [DEC-007](HIL_DECISIONS.md)) and keeps the exact `"covers 9 guests"` substring so `normalizePricingProse`'s `/covers \d+(?= guests?)/gi` rewrite still applies at render time.

**HIL Marketing re-scored all 31 enrolled Stay Match intents against the proposed feed: no change in recommendation for any real enrolled intent.** Only synthetic test phrases like "groups of 12 or more" stop matching Sleeps 11 — the fix is scoped to exactly the false-positive case.

### What shipped vs. what's pending
- **Shipped (this repo, committed, not pushed):** the content-module edit above; `src/lib/sleeps11-segment-fix.ts` (pure transform: finds the one segment titled exactly "Groups of 12 or more," replaces only its title/body, refuses on anything unexpected — round-trip JSON check, wrong id/slug, zero or multiple matches); unit tests in `src/lib/__tests__/sleeps11-segment-fix.test.ts`; `scripts/fix-sleeps11-segment.ts`, a dry-run-by-default CLI modeled on `scripts/fix-property-content.ts` ([DEC-016](HIL_DECISIONS.md)'s targeted-substring-replacement pattern) that asserts property id 4 + slug before writing.
- **Not run against any database** — `bestForSegments` has no admin UI ([DEC-015](HIL_DECISIONS.md)), so production still carries the old title until the Owner runs `scripts/fix-sleeps11-segment.ts` (dry run first, then `--execute`) from an operator machine that can reach Hostinger, per [DEC-012](HIL_DECISIONS.md)/the migration runbook's reachability posture. Re-running the full Mickey seed instead would overwrite any admin edits on all three Mickey listings and was explicitly avoided.
- **PR #67** (an earlier plugin-side fix, Stay Match v1.0.3) was closed in favor of this content-level fix.

### Evidence
Lint clean, `tsc --noEmit` clean, `vitest run`: 96 files / 1554 tests passed (11 new).

---

## 2026-10-10 — Main-site LodgingBusiness JSON-LD: GBP hasMap/geo, LodgingBusiness type

Area: Website / SEO

Status: **Built, tested, not yet merged.**

### Outcome
`src/lib/local-business-schema.ts` replaces the inline `LocalBusiness` object literal in `src/app/layout.tsx` (and the matching `worksFor` stub on `/about`) with a shared `buildLocalBusinessJsonLd()`:
- `@type` changed `LocalBusiness` → **`LodgingBusiness`** (a schema.org subtype of `LocalBusiness` — valid everywhere a `LocalBusiness` was, more specific for a short-term rental operator).
- Added **`hasMap`** and **`geo`** pointing at the verified Google Business Profile pin ("Haven in Lipa", kgmid `/g/11vcxkyhh4`, 4.6★/11 reviews) — this node previously carried no map reference at all.
- **`telephone`** already matched the GBP's number exactly (`+639066554415` ≡ `+63 906 655 4415`) — confirmed, not changed.
- **`sameAs`** already matches the blog's Organization graph (`hil-seo` 1.1.8) for Facebook, Instagram, and TikTok. **Not changed:** the Airbnb listing link — the blog's Organization `sameAs` doesn't carry it, so the two sites are not yet fully aligned on this one entry; left as-is pending an explicit Owner decision (CLAUDE.md: ask before customer-visible/public claim changes).
- **Deliberately not added:** a business-level `aggregateRating` from the GBP snapshot — it would go stale the moment a new Google review lands, the same staleness DEC-007 exists to prevent for prose.
- The "cedcasproperties.com redirect check" referenced in the task brief was searched for across `src/`, `docs/`, and `content/seo/` and not found — nothing to drop; the domain's retirement is already recorded in `docs/HIL Commits.md`/`HIL_COMPLETION_LOG.md` as historical only.
- 7 new unit tests (`src/lib/__tests__/local-business-schema.test.ts`).

### Owner decision needed
Keep or drop the Airbnb `sameAs` entry (`https://airbnb.com/h/fullhousebellavita`) on the main site's business node, to match the blog exactly.

### Evidence
`npm run lint`, `npm run typecheck`, `npm test` (1,542/1,542), `npm run build:app` all clean on this branch.

---

## 2026-10-10 — Booking/GA4 reconciliation tooling; proposed (disabled) server-side GA4 send

Area: Website / Analytics

Status: **Code and tests built and merged; the Measurement Protocol send stays off (`GA4_MP_ENABLED` unset).** No production data was read by this session — see Blocker below.

### Outcome
2026-10-10 HIL Marketing measured 10 `booking_confirmed` events on `haveninlipa.com` in GA4 for Aug 22 → Sep 28, 2026 (90-day window; 4 more hits were pre-DEC-021 test traffic from `dev.haveninlipa.com`/a laptop host). To let a human compare that figure against production, `scripts/reconcile-ga4-bookings.ts` lists confirmed bookings in a date range with their `HIL-<bookingId>` transaction IDs (the same format `BookingForm.tsx` sends client-side) — **read-only, prints only, excludes nothing automatically**. There is no `Booking.isTest` flag (DEC-021 proposal declined), so it only *flags* guest emails that look like a test/admin address for manual review.

If the comparison finds GA4 undercounting real confirmed bookings (plausible causes: guest leaves before the "done" screen renders, ad blockers, or a GCash/BPI booking that only becomes `confirmed` later via the admin panel with no browser present at all), `src/lib/ga4-measurement-protocol.ts` is a proposed fix: a server-side GA4 Measurement Protocol `booking_confirmed` send from the two places the server itself knows a booking just became confirmed — the Stripe auto-confirm branch of `POST /api/bookings`, and the `becameConfirmed` transition in `PUT /api/admin/bookings/[id]`. It is **built, tested, and wired in, but inert**: `isGa4MpEnabled()` requires both `GA4_MP_ENABLED=true` and a `GA4_MP_API_SECRET` (an Owner-created GA4 MP API secret), and neither is set anywhere. 8 unit tests cover the disabled-by-default state, the exact request shape when enabled, and that a fetch failure never throws.

**Known limitation, stated in the code comments, not hidden:** GA4 does not automatically deduplicate a server-sent hit against a client-sent one sharing the same `transaction_id` — "dedup" here means the two call sites never double-fire for the same booking, and the shared transaction ID lets a human reconciling an export filter overlaps. True automatic dedup is not implemented and would need a decision about which side wins.

### Blocker — production data not read
Per DEC-012/DEC-026, production MySQL is reachable only from an operator machine (and this change does not alter that); this session had no `PRODUCTION_DATABASE_URL` and made no attempt to use one. `scripts/reconcile-ga4-bookings.ts` is written but has **not been run against production** — the actual Aug 22 → Oct 9 reconciliation is a Next step for the Owner/operator, per the runbook pattern in [HIL_MIGRATION_RUNBOOK.md](HIL_MIGRATION_RUNBOOK.md).

### Evidence
- New: `src/lib/ga4-measurement-protocol.ts`, `src/lib/__tests__/ga4-measurement-protocol.test.ts` (8 tests), `scripts/reconcile-ga4-bookings.ts`.
- Changed: `src/app/api/bookings/route.ts` (Stripe auto-confirm branch), `src/app/api/admin/bookings/[id]/route.ts` (`becameConfirmed` branch) — one `sendBookingConfirmedMeasurementEvent(...)` call added to each, both no-ops while the flag is unset.
- `npm run lint`, `npm run typecheck`, `npm test` (1,545/1,545), `npm run build:app` all clean on this branch.

---

## 2026-10-10 — Main-site booking-intent SEO proposal (not implemented)

Area: Website / SEO

Status: **Proposal only — no code changed.** Awaiting Owner approval of the exact wording.

### Outcome
2026-10-10 GSC measurement found main-site booking-intent queries ranking poorly despite all money pages being indexed: "apartment for rent lipa city" pos 28, "airbnb lipa" pos 16–38, "transient house in lipa batangas" pos 16–29. `content/seo/runs/101026/Booking_Intent_SEO_Proposal_101026.md` proposes specific title/description/H1/intro-block text for `/properties` and `/staycation` (one primary keyword per page, per SEO-DEC-012) and a missing homepage → `/properties` internal link (the homepage already links `/staycation`; the navbar's "Properties" link only goes to the on-page `/#properties` anchor, not the dedicated index page). Also fixes, as part of the same proposed titles, that `/properties`'s current rendered `<title>` is 68 characters — already over the 60-char budget the `/weddings-accommodation` page follows — independent of the keyword additions.

### Not done
No file under `src/app/properties`, `src/app/staycation`, or `src/components/sections/Properties.tsx` was touched. Per CLAUDE.md, implementation waits for the Owner's sign-off on the proposed copy.

---

## 2026-10-10 — Verification closures (PR #50, hil-seo 1.1.8, post 205) and Stay Match enrollment additions

Area: SEO / Blog

Status: **Documentation only — confirms prior work and records a prior session's WordPress writes; no code in this entry.**

### Outcome
Per the 2026-10-10 marketing-measurement brief: **PR #50** (sitemap real `lastModified` + `/ambassadors`) and **`hil-seo` 1.1.8** (blog Organization `sameAs` → `facebook.com/haveninlipa`) are confirmed live on production, closing the "merged but not independently verified live" caveat `HIL_PROJECT_STATUS.md` had been carrying since 2026-10-04 (DEC-006: a merge is not a deploy). **Post 205's SEO title paste slip is closed** — it reads "Mickey in Lipa: A Mickey-Themed Family House in Lipa" (the Owner's 2026-10-05 revision); no paste error visible as of 2026-10-10, pending the Owner's final confirmation.

`content/seo/runs/101026/Stay_Match_Enrollment_101026.md` records a second Stay Match enrollment batch from the same brief: `_hil_stay_intent` set on posts 27, 602, 489, 75, 307, 763 plus a CTA+intent on scheduled posts 847–850. **This session has no WordPress credentials**, so unlike the 2026-10-04 batch's own record, this one could not independently verify the writes or fetch slugs — it records the brief's claims, adds tier/confidence/properties-shown computed by running the live plugin's scorer (v1.0.2) against this repo's real `bestForSegments` content, and explicitly flags what it could not confirm (post slugs; the specific intent text used on 847–850).

### Evidence
`docs/HIL_PROJECT_STATUS.md` updated (two rows, "Last updated" line); `content/seo/runs/101026/Stay_Match_Enrollment_101026.md` new.

---

## 2026-10-06 — `prisma db push` removed from builds; version-controlled migrations with a release gate

Area: Website / Deployment / Database

Status: **Complete — live on production.** Decision: [DEC-026](HIL_DECISIONS.md). Runbook: [HIL_MIGRATION_RUNBOOK.md](HIL_MIGRATION_RUNBOOK.md).

### Outcome
No deployment changes a database schema any more. `npm run build` is the compile-only `build:app`. Schema changes are migrations in `prisma/migrations/`, applied by an operator with `scripts/db-migrate.mjs` before the code is merged. Vercel's `vercel-build` adds a read-only gate that fails the build if a migration in the commit is not applied.

### Evidence
- **PRs:** #57 → `main`, merge `3798482` (2026-10-06 10:25 UTC; reviewed head `1ddf487`). #58 → `dev`, merge `09f04b9`. Closeout docs #59 → `main`, merge `e7f296e` (Production deployment `6881637494`, success, gate OK, database unchanged). Back-merge #60 → `dev`, merge `d61395b` (dev deployment `6881695376`, success); dev-only footer work preserved.
- **Schema equivalence before any write:** `mariadb-dump --no-data` of production, of dev, and of the baseline applied to an empty database were byte-identical (23 tables; no views, triggers, routines, events). Prisma's diff of each hosted database against `schema.prisma` was empty after the index-prefix correction.
- **Finding:** `prisma db push` had been dropping and recreating `GuestMessage_messageId_idx` on every deployment (undeclared 768-character prefix). Production build log of `40fbc05` shows the push; `GuestMessage.create_time` matched it (00:58:17 UTC). Fixed in `schema.prisma` only.
- **Vercel settings (API, read-only):** project `ced-cas-properties`, Build Command and Install Command `null`, production branch `main`. `ced-cas-properties-dev` returns 404 and last deployed 2026-04-05 — not active.
- **Dev baseline:** 2026-10-06 09:50:37 UTC, commit `53aebc4`. Preview of `4f1554f` failed at the gate before it (`BLOCKED: … no migration history`); `53aebc4` passed after it.
- **Production backup:** `~/hil-db-backups/hil-production-20261006T101529Z.sql.gz`, sha256 `7809c21c…dc6a`, dump exit 0 through the gzip pipeline (failure detection demonstrated on a deliberate bad dump), restored locally: schema byte-identical, 23 of 23 tables equal in row count and `CHECKSUM TABLE`.
- **Production baseline:** 2026-10-06 10:17:15 UTC, commit `1ddf487`, `prisma migrate resolve --applied 20261005000000_baseline`. One table and one row added (checksum `0246c5ad…09ef`, equal to the file). Afterwards: application schema dump byte-identical, all 81 index rows identical, 23 of 23 tables equal in row count and checksum, `status` exit 0 with `NO DRIFT`.
- **Production deployment:** `dpl_E37remzqxLQkeravjAdExwqj2cWt`, commit `3798482`, served at `haveninlipa.com`. Build log: `Running "npm run vercel-build"` → `[migration-gate] environment: production … OK — every migration in this commit is applied` → `next build`. No `db push`. After the build: schema dump, indexes and every table's `create_time` unchanged (`GuestMessage` still 00:58:17), `status` still `NO DRIFT`.
- **Checks:** Lint, Type Check, Unit Tests (1,509), Build, Migrations green on `1ddf487` and on `main` at `3798482`. `main`'s ruleset now requires all five; nothing else in it changed.
- **Acceptance:** Owner confirmed the logged-in checks on `dev.haveninlipa.com` (build `09f04b9`) on 2026-10-06 before the merge. Production: signed-out smoke checks only (pages, 5 listings, booking pages, availability, iCal all 200; admin API 401).
- **Local environment:** `.env` `DATABASE_URL` now points at dev; production moved to `PRODUCTION_DATABASE_URL`. Vercel environment values untouched.

### Retained backup
`~/hil-db-backups/hil-production-20261006T101529Z.sql.gz` (Owner's Mac; outside the repo and Dropbox; folder `700`, file `600`; sha256 `7809c21c…dc6a`; restore-tested). Contains guest personal data. **Retention pending the Owner's decision.** The temporary dev backup was deleted after the release. `.env.bak-20261006-pre-dev-default` (old local layout, production as `DATABASE_URL`) is kept until the Owner removes it.

### Remote branch inventory (2026-10-06, 27 branches besides `main`/`dev`)
No branch has unmerged work: every one has a merged PR and is fully contained in `dev`. Nothing was deleted or changed.

- **Merged / obsolete — 26.** Safe to delete.
  - *Old build script (22), all contained in `main`:* `chore/hil-performance-plugin`, `chore/remove-fix-drive-times-route`, `chore/remove-manual-fix-route`, `docs/close-hourly-fee-e2e-20261005`, `docs/ga4-mcp-closeout-100426`, `docs/hil-status-reconcile-20261005`, `docs/layered-docs-into-git`, `docs/stay-match-enrollment-100426`, `docs/wrapup-093026`, `feat/hil-seo-1.1.7`, `fix/analytics-tracking`, `fix/ga4-internal-cookie`, `fix/hil-performance-1.0.1`, `fix/messages-booking-date-utc`, `fix/property-drive-times-db`, `fix/seo-audit-093026`, `fix/seo-audit-low-100426`, `fix/verify-stripe-payment-server-side`, `manual-booking-fix-temp`, `release/dev-to-main-2026-09-28`, `remove-manual-fix-route`, `seo/weddings-accommodation-rework`.
  - *New build script (4):* `chore/prisma-migrations-baseline`, `docs/db-migrations-closeout-100626` (in `main`); `integrate/db-migrations-into-dev-100626`, `integrate/main-into-dev-100626` (merge branches, in `dev`).
- **Active work — 0.** (Footer credit, DEC-025, was released to `main` 2026-10-06 — see Housekeeping decisions below.)
- **Uncertain — 1.** `feat/netcore-footer-credit` (PR #37, merged into `dev`, not on `main`; **old build script**). Redundant with `dev`, but it is the named branch of work that has not been released. Delete it, or keep it until the footer ships — Owner's call. Do not push to it without merging `main` in first.

**Recommendation:** delete the 26 merged branches; that removes 22 of the 23 places a push could still trigger `db push` (against the dev database). Turning on GitHub's "Automatically delete head branches" would stop the pile re-forming.

### Housekeeping decisions (Owner-confirmed, recorded 2026-10-06)
- Obsolete remote branches and the final-closeout branch were deleted; GitHub "Automatically delete head branches" is enabled.
- The old `.env` backup (`.env.bak-20261006-pre-dev-default`) was moved to the trash.
- The production recovery backup `~/hil-db-backups/hil-production-20261006T101529Z.sql.gz` is **retained for 30 days, through 2026-11-05**. Do not delete it before then.
- A second migration machine is deferred.
- `feat/netcore-footer-credit` (old build script, fully contained in `main` after PR #63) is deleted after the footer release; no unique work remained.

### Not done / limits
- No GitHub-hosted migration workflow: runner reach to Hostinger was never tested, and no hosted database credential is stored in GitHub.
- No logged-in action was performed on production.
- **Current builds are safe; old commits are not.** Builds of `3798482` or any later commit are safe: they run only the read-only gate. Rebuilding a commit **older than `3798482`** still runs `prisma db push` — against dev for a push to a stale branch, against production for Vercel's **Redeploy** on an old Production deployment. Roll back by reusing an existing deployment (Instant Rollback / Promote), never by rebuilding. Runbook, sections 6 and 8.
- Operational follow-ups, not blockers: migrations run from the Owner's Mac only; DEC-012 connectivity is still unexplained.
- Local comparisons ran on MariaDB 12.3; the exact 11.8 match is CI's container and the hosted servers themselves.

---

## 2026-10-05 — ₱200/hour Early Check-In / Late Checkout E2E acceptance

Area: Website / Additional Charges

Status: **Complete — Owner-attested acceptance.**

### Outcome
The Owner attests that the ₱200/hour Early Check-In / Late Checkout workflow was exercised end-to-end and works across all supported payment types. During acceptance testing, the Owner also encountered and corrected a Stripe environment-key configuration issue: Development/Preview use Stripe test keys, while Production uses live keys.

### Evidence boundary
This completion record is **Owner attestation from the 2026-10-05 project session**, not independently reconstructed from GitHub telemetry. The implementation itself remains traceable to the existing Additional Charges/hourly-fee commits and deployment history.

---

## 2026-10-05 — Durable documentation reconciliation

Area: Project governance / documentation

Status: **Complete as a documentation pass; no application, database, WordPress, payment, or production configuration changes.**

### Outcome
- Reconciled `HIL_PROJECT_STATUS.md` against GitHub `main` and the durable Dropbox workspace instead of relying on chat history.
- Corrected stale Stay Match wording: v1.0.2 is active; 12 high-traffic published posts were enrolled on 2026-10-04 and verified rendering the block live (PR #54 / merge `b906939`).
- Corrected the SEO-audit follow-up state: PR #50 is merged to `main`; production deployment remains a separate verification step, and the manual `hil-seo` 1.1.8 WordPress upload remains pending unless separately verified.
- Added durable **SHELVED** backlog records for third-party property/payment-profile planning, SMS reactivation, Hostinger MySQL → Supabase evaluation, and broader scheduled-job migration to Vercel. These records authorize no implementation.
- Added a provenance rule: GrokBot/other AI work is represented through the normal layered docs when it materially affects state; GitHub/production evidence controls implementation status. Existing GrokBot GA4/GSC read-only access remains documented.

### Important evidence boundary
This reconciliation deliberately does **not** close items solely from conversational recollection when the connectors do not corroborate them. In particular, the durable status still treats the end-to-end hourly-fee workflow test as open until connector-backed evidence or a new recorded acceptance result is added.

---

## 2026-10-04 — GA4 internal-traffic cookie marker; analytics Owner steps closed

Area: Website / SEO (measurement)

Status: **Live.** PR #49, merge `17749db`; CI green and the Production deployment for that SHA succeeded; the served bundle contains the cookie code. The cookie being set was not observed first-hand (needs an admin sign-in).

### Outcome
- Middleware sets `hil_internal=1` (400 days, renewed per request) on every signed-in `/admin` request; the GA4 gate tags a browser `traffic_type: internal` if either that cookie or the `localStorage` marker is present. `?hil_internal=0` clears both. [Website spec → Internal-traffic marker](HIL%20Website%20Technical%20Specification.md).
- Why: the Owner's phone still appeared in GA4 on 2026-09-30 – 10-02 with the Internal Traffic filter Active. Safari on iOS drops script-written storage after 7 days without a visit, and the marker is per browser.
- Closed the DEC-021 Owner steps: both GA4 data filters Active, `booking_confirmed` + `generate_lead` are key events, Stay Match v1.0.2 active.
- GA4 has recorded no `/admin`, `dev.` or `/pay/<token>` pageviews since 2026-09-29.

### Evidence
- Local and CI: lint, typecheck, build, 1,425 unit tests.
- Read through the GA4 / Search Console MCP connection (local `.mcp.json`, gitignored).

### Gotchas worth remembering
- **`/admin` hits stopping on 2026-09-28 is the code, not the filter** — GA is never loaded there. It is not evidence the Internal Traffic filter works.
- **The GA4 Data API cannot read data-filter state.** Confirm in the UI.
- Still per browser: an in-app browser (Google / Facebook app) needs its own admin sign-in. `blog.haveninlipa.com` is not covered.
- **Stay Match's empty click count was a coverage gap**, not a broken event: none of the 12 high-traffic posts is enrolled. See [Blog spec → Stay Match](HIL%20Blog%20Technical%20Specification.md).

---

## 2026-10-01 — Admin Guest & Stay Edit, inventory lock, protected reactivation

Area: Website

Status: **Released via PR #43.** Two separate verifications, not to be confused:
- **Owner acceptance testing — passed, 2026-10-01, on `dev.haveninlipa.com`** (dev build `9eb9f76`, Vercel Preview environment, dev database).
- **Production verification — deployment and smoke checks only.** merged as `6aa5729` on 2026-10-02 05:00 UTC; Production deployment `6801664704` for that SHA succeeded; signed-out read-only smoke checks passed (public pages 200, amend route 401 where it was 404, availability API and `.ics` feed normal, CI on `main` green). **Not exercised on production:** a logged-in amendment, a real booking, or the lock under concurrent load. The Owner's acceptance test was not repeated on production.

### Outcome
- Staff with the `bookings` permission can amend guest name, email, phone, guest count, property and dates on `/admin/bookings/[id]` through Edit → Review → Save, with a mandatory reason and an Amendment History list. Replaces the temporary-route method used on 2026-09-17.
- Every write that claims nights now takes an inventory lock: amendments, `POST /api/bookings`, and cancelled → pending/confirmed status changes.
- A card payment whose booking cannot be saved is reported to the guest with its reference and alerted to the admin once. No automatic refund.
- The reminder worker claims rows before sending; delivery is at-most-once.
- No schema change. Full detail: [Website spec → Booking Amendments](HIL%20Website%20Technical%20Specification.md#booking-amendments-guest--stay-edit), [DEC-024](HIL_DECISIONS.md).

### Evidence
- CI: lint, typecheck, build, 1,416 unit tests (three timezones).
- Local only, not in CI: 56 database-backed tests on a throwaway MariaDB (`npm run test:db`), including concurrency races.
- Production engine checked read-only: MariaDB 11.8.9, InnoDB.

### Gotchas worth remembering
- **`dev.haveninlipa.com` serves the `dev` branch, not a feature branch's Preview.** The first "deployed" report pointed at the feature Preview URL; the Owner looked at the dev hostname and saw nothing. Getting a branch cut from `main` onto `dev` needed an integration branch (PR #45), because `dev` and `main` had diverged in docs.
- Deadlocks between the lock and post-commit block inserts are normal and retried; only the database-backed suite caught them.
- The first-release policies (keep agreed price, no automatic guest notification, hold reminders made overdue, the four eligibility phases, manual handling of a card charged without a booking) were **approved by the Owner on 2026-10-02**. The released code already matched them; see DEC-024, including the one in-flight reminder exception.

---

## 2026-09-30 — Full SEO audit and HIGH/MEDIUM fixes (main site + blog)

Area: SEO | Website | Blog

Status: **Complete — live on both sites.** Main-site code: PR #38 (`3168324`), merged and confirmed live by the Owner. Blog: `hil-seo` 1.1.6 and HIL Performance 1.0.2 uploaded by the Owner; artifacts in PRs #38/#39/#40.

- **Audit (read-only):**
  - Crawled 14 main-site and 31 blog URLs, with an internal-link check on both sites.
  - Validated the JSON-LD, ran local Lighthouse on main-site templates, and reviewed the code.
  - Found 4 HIGH and 9 MEDIUM issues.
  - **Corrections made during the work:**
    - HIGH #4 (homepage LCP 5.4 s) was a cold-start outlier; re-runs gave 2.7–2.8 s.
    - The review-markup finding was withdrawn: the reviews are real direct-booking guests.
    - Only 3 property descriptions were over 160 characters, not 4.
- **Main site (PR #38), verified on the preview and then on production:**
  - Duplicated title brand fixed on all 5 listings: `stripBrandSuffix()`.
  - Per-page Open Graph/Twitter tags on every public page, via `socialMetadata()` in `src/lib/seo-metadata.ts`. `/faq`, `/about`, `/privacy`, `/terms` and `/ambassadors` had been sharing as the homepage.
  - Real 1200×630 `og-default.jpg`.
  - `/faq` description cut from 210 to 152 characters.
  - Gallery moved to `next/image`: listing page 21.3 MB → 622 KB, mobile LCP 5.7 s → 1.8 s, accessibility 87 → 92.
  - New admin "Search Engine Listing" fields. The Owner used them to shorten the 3 Mickey descriptions (now 152–157 characters, live).
- **Blog:**
  - Article #6 (post 67) set to Private; its 301 still works, and no blog page links to it any more.
  - Extra H1s removed on posts 77, 763 and 764.
  - `hil-seo` 1.1.6 title-suffix rule (SEO-DEC-031).
  - LiteSpeed/EWWW lazy-load and CSS configuration, plus the HIL Performance plugin (DEC-023).
  - Blog post PageSpeed mobile went from 65 to **89**.
  - The plugin needed three releases, recorded with their gotchas in the Blog spec: the dequeue ran too early, then LiteSpeed combined the `<noscript>` fallback.
- **Owner decisions:** keep "one hour from Manila" on the main site (SEO-DEC-032); article #6 set to Private; blog title rule (SEO-DEC-031); admin fields rather than a production script for the descriptions.
- **Follow-up:** GSC Request Indexing done for 10 URLs (5 listings, `/faq`, `/about`, posts 77/763/764).
- **Open:**
  - LOW findings, not started: sitemap `lastmod` is set to request time; `/ambassadors` is missing from the sitemap; brand identity is inconsistent between the two sites' structured data; seasonal blog posts are stale; blog homepage meta description is 32 characters.
  - 26 blog titles still over 60 characters (editorial).
  - Optional Google Fonts async ON/OFF comparison.

---

## 2026-09-29 — Footer credit brand standard (DEC-025): "Powered by NetCoreSolutions.com"

Area: Website | Blog | Brand

Status: **Main site: live on production 2026-10-06** (PR #37 → `dev` 2026-09-30; released by PR #63, merge `2ffacaa`, Production deployment `6886658355`; all five required checks passed; verified on dev.haveninlipa.com and live haveninlipa.com `/`, `/privacy`, `/terms`, `/faq`, `/properties`: one credit link each, none on `/admin/login`). Release also tightened the mobile breakpoint from `max-[769px]` to exactly `max-[768px]`. **Blog: live 2026-10-06.** Applied on the live blog 2026-10-06 by direct edit of the live theme files over SSH: `footer.php` credit line, `main.css` (0.875rem + `a.footer-credit` rules), `style.css` Version 1.0.1. A pre-change backup of the three files (with checksums) is kept on the hosting account outside the web root; location is in the Owner's notes, not this repo. `php -l` clean; LiteSpeed purged and object cache flushed; verified over HTTP on the blog home, a post and the 404 page (one credit link each, no GeneratePress, new CSS served). Not visually checked in a browser; Hostinger CDN not separately flushed.

- **Reference:** the live tribemedspa.com footer, fetched 2026-09-29 (details in DEC-025):
  - the whole phrase "Powered by NetCoreSolutions.com" is one plain link, on a second line under the copyright, on the left of the legal row;
  - 14px, muted colour, no underline; underline plus a stronger colour on hover/focus-visible;
  - the row stacks and centres at ≤768px.
- **Main site:** `src/components/layout/Footer.tsx`, bottom row.
  - The legal row is now 14px white/55 (was 12.5px): copyright, then the linked credit on the next line, with Privacy/Terms on the right.
  - The link hovers/focuses to white/85 with an underline.
  - On mobile it is stacked and centred (`max-[768px]:flex-col text-center`).
  - It is on every page that renders `<Footer />`, and deliberately not on `/admin/*` or `/pay/[token]`.
  - New test `src/lib/__tests__/footer-credit.test.ts` renders the real Footer and checks link scope, href, no target/rel, placement, 14px/white-55, underline only on hover/focus, the mobile classes and that there is no GeneratePress.
- **GeneratePress:** the only repo mention was a `CLAUDE.md` note ("not a GeneratePress child theme"), now reworded. Nothing in `content/seo`. None on the live blog (homepage, post, 404, `/wp-json`, theme `style.css`), and `/wp-content/themes/generatepress/` returns 404.
- **Blog theme:** the source is Dropbox `/VSCode/old/wordpress-themes/haveninlipa-blog/`. Its `style.css` and `main.css` are byte-identical to live, but live `footer.php` has drifted (Quick Links, and legal links hardcoded to haveninlipa.com).
  - Prepared change: `<br><a class="footer-credit" href="https://netcoresolutions.com">Powered by NetCoreSolutions.com</a>` in the `.footer-bottom` copyright `<p>`, plus 4 CSS rules after `.footer-bottom__links` in `main.css` (row 0.875rem; credit `rgba(255,255,255,.5)`, no underline; hover/focus accent plus underline), plus `Version: 1.0.1`.
  - Primary route: Theme File Editor. Optional zip: `haveninlipa-blog-1.0.1.zip`, built from the source with the live footer edits folded in; use it only after comparing with live.
  - Instructions are on the HIL PM box at `/workspace/hil-blog-theme/APPLY.md`, including the LiteSpeed purge, Hostinger CDN flush and a logged-out check.
## 2026-09-28 — Production drive-time correction run; temporary route removed

Area: Website | Content

Status: **Run done and verified live. Route-removal PR opened against `main`, not merged.** At 2026-09-28 00:11 CT the Owner ran the temporary DEC-012 route `/api/admin/dev/fix-drive-times` on production. It went live with release PR #30 (`41d666a`). GET dry run: planHash `db895ae4f17708a6`, 20 field changes across 5 properties, matching the expected list in the 2026-09-27 entry below. POST: `success: true`, 20 written, and the post-write re-check passed. The Owner then checked all 5 live listings: SM Lipa shows about 20 min and Casa Marikit about 30 min, in the new "About 20 to 30 minutes by car" group. Follow-up PR deletes `src/app/api/admin/dev/fix-drive-times/` and the route-only POST gate (`checkApplyRequest` / `DRIVE_TIME_CONFIRM` and their tests) from `src/lib/drive-time-fixes.ts`. It keeps `planDriveTimeFixes` and the CLI pass in `scripts/fix-property-content.ts`. See the DEC-016 addendum.

---

## 2026-09-28 — Checkout-abandonment alerts + GA4 `add_payment_info` (DEC-022)

Area: Website | Analytics

Status: **Live on production.** PR #32 merged as `cbfd123`; Vercel Production deployment `6702940894` `success`. Verified on the live site: `/api/cron/checkout-abandonment` → 401 without the secret, `POST /api/checkout-attempts {}` → 400, and the booking-page bundle contains the new call. `dev` was fast-forwarded to `cbfd123` right after. **Owner end-to-end test passed 2026-09-28**: the payment screen was left open without tapping "I Paid", and the "Checkout not completed" email arrived. The GA4 funnel was set up as `/book` page view → `add_payment_info` → `booking_confirmed`. `add_payment_info` data is still pending GA4 processing and real guest traffic.

Why: booking #140. The guest paid by GCash at 11:15 AM PHT and tapped "I Paid" 53 minutes later, so the Owner saw a payment with no booking. First checked as a possible PR #23 regression and ruled out: GCash never touches the Stripe path. A temporary DEC-012 seed route was prepared (PR #29), but it was closed unmerged when the guest completed the booking themselves.

What: `CheckoutAttempt` table, `POST /api/checkout-attempts`, `/api/bookings` link, `/api/cron/checkout-abandonment` (Vercel Cron `*/5`; GitHub `*/15` backstop), admin alert email, GA4 `add_payment_info` (funnel step, not a key event). 16 new tests (1,218 total on `main`); CI Build/Lint/Type Check/Unit Tests all green. PR #31 (a cherry-pick of the GA4 gating) was closed as redundant, because PR #30 had already released it. Detail: [Website spec → Checkout-Abandonment Alerts](HIL%20Website%20Technical%20Specification.md#checkout-abandonment-alerts).

---

## 2026-09-28 — Release PR: `dev` into `main` (PRs #24–#28 + reconcile production-only fixes)

Area: Website | Release

Status: **Merged and live as PR #30 (`41d666a`), 2026-09-28.** Branch `release/dev-to-main-2026-09-28` = latest `origin/dev` (after PR #28) plus a normal (no-rebase) merge of `origin/main`. The merge had no conflicts. `main`'s production-only work (#19–#21 manual-fix route added, fixed and removed; #22 Guest Messages UTC booking dates + jsdom tests; #23 server-side Stripe PaymentIntent verification; merge commits for #13–#18) is now in `dev`'s history. Every file touched by #22/#23 is byte-identical to `main`, and `src/app/api/admin/dev/manual-fix/` stays deleted. Going live: the analytics changes (DEC-021, active only on the production hostname), the `/weddings-accommodation` rework (SEO-DEC-030) + drive-time copy, the drive-time correction lib/script pass + TEMPORARY `/api/admin/dev/fix-drive-times` route (DEC-012; delete after the Owner's run), and docs/, content/seo, tools/seo additions. `prisma/schema.prisma` is identical to `main`, and no dependency, workflow or Vercel config changes. Lint/tsc clean, 1170/1170 tests, `prisma generate && next build` OK with a placeholder `DATABASE_URL`.

---

## 2026-09-27 — Production drive-time correction tooling (SM Lipa / Casa Marikit), dry-run-first

Area: Website | Content

Status: **Built on branch `fix/property-drive-times-db`, [PR #28](https://github.com/cedcas/CedCasProperties/pull/28) against `dev`. Not merged, not deployed, and not run against any database (no dry run either).** Production property text still has the old drive times until the Owner runs it.

- **Why:** PR #26 (`db0cdbc`) fixed the drive times in the repo source only. Production's 5 property rows still say "5 / 5–10 / five to ten minutes to SM Lipa" and "a short drive to … Casa Marikit". `scripts/fix-property-content.ts` did not detect these phrases.
- **What:** new pure `src/lib/drive-time-fixes.ts` with a self-contained, reviewed table of exact old → new substrings (wording copied from `db0cdbc`). It is wired into `scripts/fix-property-content.ts` as a second pass, in the same dry run, transaction and post-write re-scan. The Maculot/Mbps/parking pass is unchanged. `neighborhoodPlaces` moves SM Lipa and Casa Marikit into a new "About 20 to 30 minutes by car" band. Any residual stale SM Lipa / Casa Marikit phrase aborts the whole run with a property/field/excerpt list. There is also a TEMPORARY admin-only DEC-012 route, `src/app/api/admin/dev/fix-drive-times/route.ts`: GET = read-only plan + `planHash`; POST needs `{"confirm":"APPLY-DRIVE-TIMES","planHash":…}`. Decision: DEC-016 extension (targeted replacements). How it works: [Website spec → Build & Deployment](HIL%20Website%20Technical%20Specification.md).
- **Expected dry run (from the pre-#26 content):** 20 field changes on all 5 properties. id 1 `cozy-1-bedroom`: description, amenityDetails, neighborhoodPlaces. id 2 `spacious-2-bedroom`: description, bestForSegments, amenityDetails, neighborhoodPlaces, propertyFaqs. id 3 `…sleeps-7`: bestForSegments, amenityDetails, neighborhoodPlaces, propertyFaqs. ids 4 `…sleeps-11` and 5 `…sleeps-15`: description, amenityDetails, neighborhoodPlaces, propertyFaqs.
- **Verification:** `npm run lint` clean, `npx tsc --noEmit` clean, `npx vitest run` 1035/1035 (was 921; +38 cases × 3 TZ projects). `npx prisma generate && npx next build` passed with a placeholder `DATABASE_URL`. The commit cherry-picks cleanly onto `origin/main`, where tsc and the two content-fix test files pass. No schema change.
- **Pending (Owner):** `dev` and `main` are not reconciled. The real run needs this commit cherry-picked onto a branch off `main`, a PR to `main`, and a production deploy verified per DEC-006. Then GET (review), POST with the `planHash`, confirm on the live listings, and a removal PR for the temp route.

---

## 2026-09-27 — Leftover manual-fix admin route removed from `dev`

Area: Website

Status: **PR #27 merged into `dev` 2026-09-27 (`35d682f`); not on `main` (already deleted there).** `src/app/api/admin/dev/manual-fix/route.ts` had been deleted on `main` 2026-09-17 (PR #21, `111ca40`) but survived on `dev`, where it was the original PR #19 version (`bec0f8c`), not the sequenced fix. No other code references; lint, typecheck and 651 tests pass. See [DEC-012](HIL_DECISIONS.md).

---

## 2026-09-27 — `/weddings-accommodation` SEO rework for Lipa wedding-destination / venue intent

Area: SEO | Website

Status: **Merged into `dev` via PR #26 (merge `d236376`, 2026-09-27). Not on `main`, not deployed.**

### Outcome
Reworked the wedding money page for the venue/destination-intent queries it was already surfacing for (GSC Aug 28–Sep 24 2026: 324 impr, pos 19.8, 1 click; `wedding destination in lipa` 175 impr, `wedding venue in lipa` 96 impr) without claiming to be a venue (`SEO-DEC-030`; DEC-008/SEO-DEC-003 unchanged).

### Material Changes
- `src/app/weddings-accommodation/page.tsx`: title `Lipa Wedding Destination Homes, Sleeps {range}` (DB range, ≤ 60 chars rendered, number-free fallback) and "we're not the venue" meta description; OG + new Twitter metadata; new H1 plus a plain not-a-venue line and a top `/properties` CTA; H2s reordered (destination → churches/venues → where the party stays → houses → cost → booking → FAQ → CTA); FAQ 7 → 9 (venue question reworded with a flat "No.", Lipa-as-destination, distance FAQ generated from the owner-verified `DRIVE_TIMES`, entourage-capacity FAQ from `deriveHouses()`); blog pilgrimage-guide link removed in favour of `/properties`.
- New `src/lib/__tests__/weddings-accommodation-page.test.ts` (DB-free; 30 cases across the 3 TZ projects).

### Verification
`npm run lint` clean, `npx tsc --noEmit` clean, `npm test` 681/681 (was 651). Production not touched; no schema change.

### Pending
Owner review/merge; after the production deploy: GSC URL Inspection + Request Indexing, re-measure ~4 weeks later. Details: [HIL SEO Technical Specification.md](HIL%20SEO%20Technical%20Specification.md) → `/weddings-accommodation` → SEO rework.

### Follow-up, same day — drive-time consistency fix (commit `db0cdbc`, same branch/PR)
Owner fact-check answered 2026-09-27: from Bella Vita, SM City Lipa ≈ 7 km / 20 min by car, Casa Marikit ≈ 10 km / 30 min, both traffic-dependent. Superseded "5 / 5–10 / five to ten minutes to SM Lipa", "Casa Marikit is a short drive away" and the August sheet's 45-min Casa Marikit figure. Changed: `src/lib/faqs.ts` (family + distance FAQs), `src/app/weddings-accommodation/page.tsx` ("about" on the drive-time table and distance FAQ, traffic caveat, SM Lipa re-confirmation note, Casa Marikit comment), `prisma/property-content/b34-content.ts` + `mickey-content.ts` (seed source only — SM Lipa/Casa Marikit moved to an "About 20 to 30 minutes by car" band; description, segment, amenity and FAQ phrases). New guard `src/lib/__tests__/drive-time-claims.test.ts`; weddings test +3 cases. Lint/tsc clean, tests 705/705. **Production DB property text unchanged** (no seed/script run) — needs an Owner-approved correction; `scripts/fix-property-content.ts` does not detect these phrases as written.

---

## 2026-09-27 — Analytics tracking fixes: GA4 production/admin gate, internal-traffic tagging, Stay Match landing confirmation

Area: Website / SEO / Analytics

Status: **Merged into `dev` via PR #25 (merge `a90c72b`, 2026-09-27 22:25 CT). Not on `main`, not deployed.** The Stay Match v1.0.2 plugin is an artifact only and needs an Owner upload to WordPress.

- **Why:** the 2026-09-27 GA4 review found admin sessions (52 "Organic Search" landings on `/admin/*`/`/pay/*`), dev/preview/local-host sessions (7), and 4 test `booking_confirmed` events (2026-08-09) in the reports. It also found `stay_match_click` at 0 and `generate_lead` not marked as a key event.
- **What:** GA4 loads and sends only on `haveninlipa.com`/`www.` (runtime hostname allowlist, not a preview build), never on `/admin/*`, including after SPA navigation (`ga-disable-G-2SV2PXYB7T`). `track()` is a no-op otherwise. Owner/staff devices get `traffic_type: internal`. `/pay/[token]` stays tracked with the token redacted from `page_location`. DebugView opt-in via `?ga_debug=1`. New `stay_match_arrival` landing event, fed by non-UTM `?hil_sm=&hil_sm_post=` params that plugin v1.0.2 appends (`content/seo/runs/092726/`). `generate_lead` confirmed as the only lead event (contact form) and given `lead_source`. Decision: [DEC-021](HIL_DECISIONS.md). How it works: [Website spec → GA4 Analytics Events](HIL%20Website%20Technical%20Specification.md).
- **`stay_match_click` finding:** no defect in v1.0.1 that would suppress real readers' clicks. With ~14 real viewers, 0 clicks is plausible. The pagePath-`/` views/clicks are inferred (not proven) to be editor previews. The measurement is unverifiable from the blog alone, hence the landing-side event. Detail: [HIL_SEO_SPECIFICATION.md §13](HIL_SEO_SPECIFICATION.md).
- **Tests:** suite 651 → 867 (new `analytics-config`, `analytics-track`, `analytics-component` (jsdom), `stay-match-arrival`). `npm run lint`, `tsc --noEmit` and `npm test` clean. `npm run build:app` not run in this session. **No schema change.** The `Booking.isTest` proposal in DEC-021 was **declined by the Owner on 2026-09-27**: test bookings are made on `dev.haveninlipa.com` (separate database; sends no GA4 after this change), so no DB flag is needed. Owner test bookings made on production, if any, are still tagged `traffic_type: internal` via the admin-device marker.
- **Owner steps (GA4 UI / WordPress):** set the Internal Traffic and Developer data filters Active (**done — Owner-confirmed Active 2026-10-04**); mark `generate_lead` as a key event; upload Stay Match v1.0.2.

---

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

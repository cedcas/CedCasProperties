# Haven in Lipa — Custom SEO Plugin: Implementation Plan

Date: 2026-09-07 (reclassified from the original "Web Work Stream Handoff" — see SEO-DEC-024; updated same day through the all-modules-live milestone and a robots.txt fix). **Updated 2026-09-19 — see §8, which supersedes §4 and §7 where they conflict.**
Status (end of 2026-09-19): **CUTOVER COMPLETE AND VERIFIED — Yoast is installed but deactivated, `hil-seo` v1.1.5 is the sole SEO output, core `/wp-sitemap.xml` is live (28 URLs), the old sitemap URL 301s to it. Yoast is NOT deleted (rollback kept). Remaining: GSC status confirmation, one crawl cycle of monitoring, optional Rich Results Test — see §8.7–8.8.** *(Earlier the same day the status was "CUTOVER NOT COMPLETE — live sitemap redirect loop, installed plugin v1.1.0"; see §8.1–8.2. Original 2026-09-07 status, superseded: "All 6 output modules live on production. One defect found and fixed same day (robots.txt); v1.1.1 packaged, pending Cedric's re-upload. Cache purge and Yoast deactivation remain ahead.")* Per Cedric's 2026-09-07 instruction, the SEO Analyst owns the `blog.haveninlipa.com` WordPress environment and the complete implementation of this project. A Web Work Stream handoff is not used for this work unless a change to `haveninlipa.com` (the separate Next.js main site) is genuinely required — none has been found to be.

This document replaces `HIL_Custom_SEO_Plugin_Web_Handoff.md`, which framed this as a brief for a separate developer. That framing is retired. Cedric promoted the Analyst's account to Editor, manually installed the plugin, then used its Administrator screen (v1.1.0) to turn all 6 modules on — `hil-seo` now renders meta descriptions, SEO titles, canonicals, robots directives, and schema for production, with noindex-exclusion active on core's sitemap. Checking that transition, Cedric found Yoast's virtual robots.txt still pointed at its own retired sitemap URL; fixed in v1.1.1 (§7).

---

## 1. What has been built

A complete, working WordPress plugin (`hil-seo`, now v1.1.0), modeled directly on the already-live `tms-core` (TribeMedSpa) and `ncs-core` (NetCoreSolutions) plugins — both read in full from source before writing this one. Source: `090726/hil-seo-plugin/`. Packaged and ready to install: `090726/hil-seo-plugin.zip`. All 11 PHP files pass `php -l` (no syntax errors). v1.1.0 adds the Administrator-only **HIL SEO** admin screen (§3) — the primary interface for the remaining go-live steps.

**What it does**: meta description, OG/Twitter cards, an SEO-title override with a global title-suffix fix (closes the Audit §3 finding), a canonical override, a per-post/per-archive robots module (the one piece with no TMS/NCS precedent — see Requirements doc §3), hand-authored JSON-LD schema (Organization, WebSite, Person, BlogPosting, BreadcrumbList), sitemap hygiene on top of WordPress core's own sitemap, and the full editorial metabox (focus keyword, secondary keywords, SEO status, computed validation warnings — missing description, missing focus keyword, noindex-on-published-post, unresolved `[OWNER ...]` placeholders, missing featured image).

**Why it's safe to install now, before anything else is resolved**: every output hook is gated behind a cutover flag (`includes/cutover.php`) that defaults every module to OFF. Installing and activating this plugin, by itself, changes nothing about the live front end — Yoast keeps printing everything it prints today. A REST route, `/wp-json/hil-seo/v1/preview/<post-id>`, computes the plugin's full would-be output for any post regardless of cutover state, gated only at `edit_posts` capability — this is how Migration Plan Stage 5's URL-by-URL parity check happens with zero risk to live output. Flipping a cutover flag requires `manage_options` (Administrator) — deliberately not something the Analyst's own Editor-role credential can do, so the one action in this plugin that changes live output is never something the Analyst can trigger unilaterally by REST alone.

## 2. What has been executed and verified live, 2026-09-07

- **Stage 1 (backup) — complete.** Permanent snapshot at `090726/yoast-pre-migration-backup/`.
- **Stage 2 (build) — complete.** Plugin installed, activated, and confirmed reachable at `/wp-json/hil-seo/v1/` (the initial `/wp-json/` check that appeared to show it missing was LiteSpeed cache serving a stale root response — confirmed via cache-busting; same class of issue as the Audit §5 finding, not a plugin problem).
- **Role upgrade — complete, verified live.** `whoami()` now returns `roles: ['editor']`, `allow_publish: False`. The account can now reach all 34 posts under `context=edit` (previously 9).
- **Stage 3 (backfill import) — complete, verified for all 34 posts.** Every post's `hil_focus_keyword`, `hil_secondary_keywords`, `hil_seo_title`, `hil_meta_description`, and `hil_seo_status` written via REST and read back to confirm an exact match — 34/34, zero mismatches. **One real bug caught and fixed before import**: the backfill workbook's "Final SEO Title" column had inherited the literal placeholder string "NEEDS REVIEW — see Notes" for 20 rows, purely because those rows' Validation Status reflected an unrelated author/description issue — not an actual title defect. Caught by inspection before the import ran; corrected to carry the existing (correct) title forward for those rows. Nothing malformed was ever written to production.
- **SEO-DEC-021 (author reassignment) — complete, verified live.** All 18 Cassandra-Kim-authored posts reassigned to Haven via a `PATCH` touching only `author`. Before/after comparison confirmed slug, date, status, and a SHA-256 content hash were identical for every post. `/author/cassandrakim/` now returns HTTP 200 (not 404) with zero posts and its existing `noindex, follow` treatment intact — checked live, not assumed.
- **Stage 5/6 (parity check + resolve discrepancies) — passed.** Diffed the plugin's `/wp-json/hil-seo/v1/preview/<id>` output against the Stage 1 backup for all 34 posts: **title, canonical, and robots match Yoast exactly for all 34 (zero diffs)**. Meta description matches for 17, differs for 3 by the approved SEO-DEC-023 rewrite (expected), and differs for 14 because the plugin trims descriptions to ~158 characters at a word boundary — the exact, proven `tms_core_trim_description()`/`ncs_core_trim_description()` behavior ported verbatim from TMS/NCS, applied here to Yoast descriptions that had run longer than the guideline. This shortens 14 live descriptions slightly at cutover; it is a deliberate quality behavior already documented in the Requirements spec, not a defect, and is called out here rather than passed through silently.
- Documentation reclassification — complete (SEO-DEC-024, SEO-DEC-025 added).

**Everything above changed only what the Analyst's Editor-role REST credential can reach: post meta and the `author` field. No cutover flag has been flipped, no cache purged, no Yoast setting touched — Yoast is still what every live page renders.**

## 3. What blocks the next step — a third instance of the same WordPress permission pattern (SEO-DEC-025), now resolved with a proper interface

The plugin's cutover-flag write route requires `manage_options` (Administrator) — a safety choice built into the plugin itself, deliberately mirroring SEO-DEC-019's ceiling on the Analyst's own account. Confirmed live: a flip attempt with the Editor-role credential returns `HTTP 403 rest_forbidden`. This blocks every remaining stage — module cutover, sitemap transition, cache purge, and Yoast deactivation all sit downstream of at least one flag flip.

**Plugin v1.1.0 adds a proper Administrator screen for this — `090726/hil-seo-plugin.zip` (updated), install the same way as before** (WP Admin → Plugins → Add New → Upload — WordPress recognizes the matching plugin slug and offers to replace the current version; every stored setting, post meta value, and cutover flag is preserved across that replacement since none of it lives in the plugin's files). No raw REST/curl commands needed.

**WP Admin → HIL SEO** (menu appears only for Administrator accounts — invisible to the Analyst's Editor-role login, so this doesn't create a new way around SEO-DEC-019's ceiling). The screen shows, per module:

- **Current state** (ON/OFF)
- **Prerequisite status** — which earlier-in-sequence modules aren't enabled yet (advisory, not a hard block: canonical is a no-op today with zero overrides set, so it's safe to enable out of turn if that's ever needed)
- **Last-changed timestamp and who changed it** (`hil_seo_cutover_log` option, written by the same function both the screen and the REST route use)
- **The specific verification to do** before turning that module on — the exact checks below, shown inline
- **A toggle** that requires a checked confirmation box plus a JS "are you sure" dialog before it submits

Recommended order (meta → title → canonical → robots → schema → sitemap), each verified before the next:

1. **Meta** — lowest risk, pure content. Verify: spot-check 3–5 live pages' description (cache-busted) against the backfill workbook.
2. **Title** — verify: no doubled suffix on the homepage, an article, and an archive/tag page specifically.
3. **Canonical** — no-op today (no overrides set); verify: no duplicate `<link rel="canonical">` appears anywhere.
4. **Robots** — **highest risk.** Verify immediately: all 7 previously-confirmed noindex archives (tag/airbnb, tag/barako-coffee, category/uncategorized, category/travel-and-itineraries, category/booking-tips, category/weekend-getaways, category/outdoor-adventures, category/getting-here) plus `/author/cassandrakim/` still show `noindex, follow`; all 34 posts still show `index, follow` (no robots tag at all).
5. **Schema** — verify with Google's Rich Results Test: exactly one `@graph`, 0 critical errors. Disable Yoast's own schema module (Yoast → General → Features) at this point too, or the page will carry two.
6. **Sitemap** — verify last, since it depends on robots being correct: `/wp-sitemap.xml` lists all 34 posts and excludes every noindexed archive.

An **Emergency Rollback** button on the same screen turns every module off in one confirmed action if anything looks wrong mid-sequence.

The Analyst verifies the *effect* of each flip (fetching live pages, Rich Results Test, checking the noindex archives) immediately after Cedric flips it — only the toggle itself needs his account. `GET /wp-json/hil-seo/v1/cutover` still works with the Analyst's own Editor credential for reading current state, and the preview route keeps working throughout for spot-checks.

## 4. Everything after the flags — sitemap transition, cache purge, Yoast removal

> **SUPERSEDED 2026-09-19 by §8.** The order below (301 at step 2, Yoast off last) produces a redirect loop while Yoast's XML sitemaps are on, and step 2's claim that only `robots.txt` needs updating is wrong. Kept as the historical record; do not follow it.

The same **WP Admin → HIL SEO** screen now includes written Administrator instructions for both remaining steps (no functional automation for these two — deliberately kept as documentation, since they involve other plugins'/WordPress's own UI):

1. **Purge the LiteSpeed cache** — do this after every module is verified, and again after the sitemap/robots.txt change. Instructions on-screen point to LiteSpeed Cache → Toolbox → Purge All.
2. **Redirect + robots.txt** (SEO-DEC-020): register `/sitemap_index.xml` → `/wp-sitemap.xml` in the Redirection plugin; update `robots.txt`'s `Sitemap:` line. To be confirmed whether the Redirection plugin exposes a REST-writable endpoint at the Analyst's Editor role when this step is reached — otherwise a specific request for Cedric, same pattern as everything else here.
3. **Validate rendered + REST output** end-to-end, cache bypassed. GSC resubmission for the new sitemap URL.
4. **Deactivate Yoast** (never delete) only after every check above passes clean — on-screen instructions walk through this and the rollback-if-something-looks-wrong sequence (reactivate Yoast, hit the Emergency Rollback button, purge cache again).
5. Monitor Search Console for one crawl cycle (fold into the already-scheduled October Maintenance run).

**Pattern worth naming explicitly**: every remaining step that changes what the public sees, or touches plugin/site configuration, needs Cedric's own Administrator action once — now through one screen rather than scattered commands. Every step that reads or writes post-level content/metadata is already within the Analyst's Editor-role reach and has been executed directly throughout this session. That split is a stable, predictable rule for the rest of this rollout.

## 5. What stays frozen until §3 is resolved

No cutover flag has been flipped. No cache has been purged. No sitemap/robots.txt change has been made. Yoast has not been touched. `WP_ALLOW_PUBLISH=false` remains enforced throughout — nothing executed this session touched publish/unpublish capability, only post meta and the `author` field on already-published/scheduled content.

## 6. Independent finding, reconfirmed this session

**Current-State Audit §5's cache-staleness finding reproduced again**, this time on the `/wp-json/` root itself (§2) — reinforcing that every verification step from here on must bypass cache. The cache purge in §4 is the point this gets resolved deliberately.

## 7. All modules now live; robots.txt defect found and fixed (v1.1.1)

> **CORRECTED 2026-09-19 (§8):** v1.1.1 was never installed (live readme: `Stable tag: 1.1.0`) and its fix could not have worked — Yoast 28.4 hooks `robots_txt` at priority 99,999, not 10. "Fixed" below should read "attempted". Superseded by v1.1.2.

Cedric worked through the Administrator screen and turned **all 6 modules ON** — `hil-seo` is now what production renders for meta descriptions, SEO titles, canonicals, robots directives, and schema, with noindex-exclusion active on core's `/wp-sitemap.xml`.

Checking the sitemap transition, Cedric found robots.txt (virtual — no physical file exists on this site, confirmed via Yoast's own File Editor) still advertised Yoast's retired `Sitemap: https://blog.haveninlipa.com/sitemap_index.xml`. The sitemap module's original code only ever filtered which content appears *in* `/wp-sitemap.xml` — it never touched robots.txt, a separate WordPress filter (`robots_txt`) that only Yoast was hooking.

**Fixed in `includes/sitemap.php` (v1.1.1)**: a `robots_txt` filter at priority 999 (after Yoast's own callback) finds the exact existing `Sitemap:` line and rewrites its URL to `/wp-sitemap.xml`, in place. It never appends a new line, so there is no code path that could produce a duplicate. It re-checks the live sitemap flag on every request rather than writing a persistent change, so turning the module off — or using Emergency Rollback — restores Yoast's original line automatically on the next request. Yoast was not deactivated or otherwise modified to make this fix.

**Next step: Cedric re-uploads `090726/hil-seo-plugin.zip` (v1.1.1)** the same way as before (WordPress detects the matching slug and offers to replace v1.1.0/1.1.1's predecessor; every flag and setting persists across the replacement). Then, cache-busted: confirm robots.txt's `Sitemap:` line now reads `/wp-sitemap.xml` exactly once. Then proceed to the remaining steps in §4 (redirect, GSC resubmission, full verification pass, cache purge, Yoast deactivation) via the Administrator screen's on-screen instructions.

---

## 8. 2026-09-19 — Read-only verification, root cause, v1.1.2, and the corrected cutover sequence

Owner: SEO Analyst (`blog.haveninlipa.com`, SEO-DEC-024). Decision record: **SEO-DEC-026**. Nothing on production was changed by the work described in this section; every production change below is an Administrator step for Cedric.

### 8.1 Live evidence (2026-09-19, cache-busted, read-only)

| Check | Result |
|---|---|
| Installed plugin | `/wp-content/plugins/hil-seo-plugin/readme.txt` → `Stable tag: 1.1.0`, changelog ends at 1.1.0. **v1.1.1 was never installed.** (Plugin folder slug is `hil-seo-plugin`, so `/plugins/hil-seo/…` is a 404 — that is why the first check missed it.) |
| `/wp-sitemap.xml` | 301 → `/sitemap_index.xml`, header `x-redirect-by: Yoast SEO`. With a query string: 404 (core's sitemap suppressed). |
| `/sitemap_index.xml` | 301 → `/wp-sitemap.xml`, header `x-redirect-by: redirection`. **Loop**: curl stops at 6 hops. |
| Yoast children | `/post-sitemap.xml` 200 (homepage + 28 posts = 29 URLs, matches REST's 28 published), `/page-sitemap.xml` 200 (homepage); not reachable from any index. |
| robots.txt | Uncached `/?robots=1` and `/robots.txt`: `# START YOAST BLOCK … Sitemap: …/sitemap_index.xml`. No physical file. LiteSpeed objects up to ~6 days old, TTL 604,800 s. |
| Yoast | Active, v28.4; prints its own description, `og:*`, JSON-LD on every post. |
| Duplicate output | 27/27 non-redirected published posts carry two `<meta name="description">`, two `og:title`, two JSON-LD graphs (Yoast + `hil-seo`). One `<title>`, one canonical, no robots meta (= index,follow) on all 27. |
| Noindex archives | All 8 tag/category archives + `/author/cassandrakim/` + `/author/haven/` → single `noindex, follow`. |
| Article #6 | Redirection 301 → `https://haveninlipa.com/staycation` is **live**; 0 of 28 published posts link to it. |
| Parity vs Stage 1 Yoast backup | Title equal for 26/27 (1 post published after the backup, no baseline); canonical equal 26/27 (same post); Yoast description unchanged 26/27. |

### 8.2 Root causes
1. **Loop.** Yoast's own sitemap code (active while its XML-sitemap feature is on) redirects `/wp-sitemap.xml` to `/sitemap_index.xml`; the Redirection rule sends the reverse. The old order added the rule first.
2. **v1.1.1 could not work.** `robots_txt` priority 99,999 in Yoast (`src/integrations/front-end/robots-txt-integration.php`) vs. 999 in v1.1.1; and rewriting Yoast's line was wrong in principle (Yoast writes that line only while core's sitemap is off).
3. **Core writes its own `Sitemap:` line** when its sitemaps are enabled, so no robots.txt "ownership" code is needed once Yoast's XML feature is off.
4. **Two more defects found in the baseline** (not sitemap-related): (a) `hil_seo_trim_description()` truncates two of the three SEO-DEC-023 descriptions mid-phrase — *family-staycation*: "…and where to stay, a…"; *romantic-getaway*: "…couple-fit rental, a comfortable…" (Holy Week is intact); 13 of 27 `hil-seo` descriptions end in "…" (documented, deliberate trim behaviour from 2026-09-07). (b) Article #6 is a published post that now 301s; core's sitemap would list it.

### 8.3 What v1.1.2 changes (`hil-seo-plugin.zip`, SHA-256 `2d1105695f2628d82c544fc70418d65fbf109a013978b858e4aefa34926b890e`)
`includes/sitemap.php`: robots filter rewritten (PHP_INT_MAX; acts only if module ON **and** core sitemap served **and** Yoast's line absent; guarantees exactly one core line; never rewrites Yoast's line); `users` sitemap provider dropped; `hil_seo_status_snapshot()` + `GET /hil-seo/v1/status`. `includes/admin-page.php`: Status panel; instructions and rollback rewritten to §8.4. Version bumped in `hil-seo.php`/`readme.txt`. `php -l` clean on all 11 files; the robots filter passed 8 stubbed scenarios (Yoast XML on / off, Yoast deactivated, missing line, duplicate lines, CRLF, flag off) — **not yet exercised inside a live WordPress**. No flag, post meta or setting changes on install.

### 8.4 Corrected sequence — a valid sitemap at every checkpoint

| # | Who | Action | State after (valid sitemap) | Verify (cache-busted) | If it fails |
|---|---|---|---|---|---|
| 1 | Cedric | Tools → Redirection → **Disable** the `/sitemap_index.xml` rule | Yoast index `/sitemap_index.xml` | `/sitemap_index.xml` 200 XML; `/wp-sitemap.xml` one 301 hop to it | Re-enable the rule = today's (broken) state; escalate |
| 2 | Cedric | Plugins → Add New → Upload `hil-seo-plugin.zip` → **Replace current** | unchanged | Readme `Stable tag: 1.1.2`; HIL SEO screen shows v1.1.2; robots.txt/sitemaps identical to step 1 | Upload v1.1.0 zip back (flags persist) |
| 3 | Cedric | Yoast SEO → Settings → Site features → **XML sitemaps OFF** | core `/wp-sitemap.xml` | `/wp-sitemap.xml` **200**, lists the 28 published posts (article #6 is expected here until step 7; a homepage entry is optional), no archive/author URL; Status panel "core sitemap served: YES" | **Switch XML sitemaps back ON immediately** = checkpoint 1 |
| 4 | Cedric | Redirection → **Enable** the `/sitemap_index.xml` rule | core | `/sitemap_index.xml` → one 301 → `/wp-sitemap.xml` 200 | Disable the rule again (checkpoint 3 state is still valid) |
| 5 | Cedric | LiteSpeed Cache → Toolbox → Purge → **Purge All** | core | uncached `/?robots=1` and `/robots.txt`: exactly one `Sitemap: …/wp-sitemap.xml`, no `sitemap_index.xml` | Purge again; check Status panel |
| 6 | Cedric | GSC (blog property) → Sitemaps → add `wp-sitemap.xml` | core | Status "Success"; then remove old entry | — |
| 7 | Analyst | Fix 2 descriptions; `hil_robots_index=noindex` on article #6 (Editor REST) | core | REST read-back; `/wp-sitemap.xml` no longer lists article #6 | Restore prior meta values |
| 8 | Cedric | Plugins → Installed → Yoast SEO → **Deactivate** (never Delete); purge again | core, hil-seo only | Full pass (§8.5) | Rollback §8.6 |

### 8.5 Full verification pass (run after step 5 and again after step 8)
All published posts (28 today; the 6 unpublished ones only via the authenticated preview route): HTTP 200; exactly one `<title>`, one canonical equal to the URL, no robots meta, exactly one description / `og:title` / `og:description` / `twitter:title` / JSON-LD graph (after step 8), no `yoast` marker (after step 8); the 3 SEO-DEC-023 posts contain no "1 hour from Manila" and no truncated phrase; 8 archives + 2 author pages `noindex, follow`; `/wp-sitemap.xml` 200 and `/sitemap_index.xml` one hop; robots.txt one Sitemap line; `/wp-sitemap-users-1.xml` and `/post-sitemap.xml` 404; article #6 still 301s; Rich Results Test on 2–3 posts, 0 critical errors; comparison against `yoast-pre-migration-backup/` (title/canonical/robots must be equal).

### 8.6 Rollback (any failure at step 8, or a crawl-cycle regression)
(a) Plugins → **Activate** Yoast SEO. (b) Yoast → Settings → Site features → **XML sitemaps ON**. (c) Redirection → **Disable** the `/sitemap_index.xml` rule — (b) and (c) go together; either alone leaves a loop or a missing sitemap. (d) HIL SEO → **Emergency Rollback** (only if hil-seo output itself is wrong). (e) LiteSpeed Purge All. (f) `/sitemap_index.xml` 200. Yoast is never deleted before the rollback window closes.

### 8.7 Execution record, 2026-09-19 (times UTC)

Every Administrator action was performed by Cedric one at a time; each was verified from outside (cache-busted, then bare) before the next.

| Step | Outcome | Evidence |
|---|---|---|
| 1 Redirection rule for `/sitemap_index.xml` disabled | Done | `/sitemap_index.xml` 200 (Yoast index); `/wp-sitemap.xml` one hop → 200 |
| 2 Upload v1.1.2 | Done | Public readme `Stable tag: 1.1.2`; Status panel: Yoast v28.4 active, XML sitemaps ON, core sitemap served NO. Screenshot of the module table: all six modules ON, changed 2026-09-08 (11:07–11:11) — **not 2026-09-07 as §7 and the 09-07 records state**. |
| 3 Yoast XML sitemaps OFF | Done, with two findings | Status: XML sitemaps OFF, core sitemap served YES; uncached `/wp-sitemap.xml` 200; uncached robots.txt: one core-written `Sitemap:` line. Findings: (a) stale caches — see below; (b) core's sitemap listed 8 categories + 141 tags because the term filter hooked a non-existent WordPress hook, and `wp-sitemap-users-1.xml` answered 200 HTML → **v1.1.3**. |
| Cache handling (added to the sequence) | Done | **Two cache layers exist: LiteSpeed (WP Admin → LiteSpeed Cache → Toolbox → Purge All) and Hostinger's CDN (`server: hcdn`; hPanel → Websites → the `blog.haveninlipa.com` row → CDN card → Flush cache).** LiteSpeed's purge does not clear the CDN. LiteSpeed also caches 404s (a cached 404 for `/sitemap_index.xml` hid the redirect until purged). Purge order: LiteSpeed, then CDN. |
| 3c Upload v1.1.3 | Done | Index lists only posts + homepage page-sitemap; category/tag/users sitemaps 404; 28 URLs. |
| 4 Redirection rule re-enabled | Done | `/sitemap_index.xml` → one 301 → `/wp-sitemap.xml` 200 (the Redirection screen showed the old state until the purge; origin was authoritative). |
| 7 Metadata fixes (done by Cedric in the post editor's "SEO (HIL)" box, not by Analyst REST) | Done | Posts 268 and 272: descriptions now 143/141 chars, clean; post 67 (article #6) `hil_robots_index=noindex` → dropped from sitemap (29 → 28 URLs). |
| 6 GSC | Partly | `wp-sitemap.xml` first showed "Couldn't fetch" (submitted while stale caches served a redirect to a 404). URL Inspection live test: "URL is available to Google". Resubmission/Success status **not yet confirmed**. |
| 8 (attempt 1) Yoast deactivated | **FAILED → rolled back** | Homepage and `/page/N/` lost canonical, meta description and all `og:*`/Twitter tags; title had a doubled suffix (every module handled only singular posts; the 09-07 parity pass covered the 34 posts only). Rollback = reactivate Yoast only (XML sitemaps stayed OFF, so the sitemap was unaffected). Verified: homepage identical to its pre-cutover output on 9/9 fields; 27/27 posts back to Yoast+plugin output. |
| v1.1.4 | Built, installed | Blog-index title/canonical/description/`og:*`/Twitter/logo image; inert while Yoast is active; new "Default social image / logo" setting on the HIL SEO screen (set to Media Library ID 25 = `HIL-Final-Logo.png`, 1024×1024, so the homepage `og:image` and the Organization logo no longer depend on Yoast). Installing it changed nothing visible (verified). |
| 8 (attempt 2) Yoast deactivated | Passed except one defect | 27/27 posts, homepage (9/9 fields identical to Yoast's), page 2/3 titles, noindex pages, sitemap, robots.txt all correct. Defect: `get_pagenum_link()` kept the query string in the `/page/N/` canonical (`?utm_source=x` canonicalised to itself; plain URLs were correct). Judged low-severity and fixed forward rather than rolled back — a deliberate departure from the "roll back on any failure" instruction, chosen by the Owner's upload of the fix. |
| v1.1.5 | Installed, verified | `/page/2/?utm_source=test`, `/page/3/?fbclid=…` canonicalise to the clean URL; `og:url` clean; homepage clean with a parameter. |
| Final purge (LiteSpeed + CDN) and bare-URL pass, 22:18 | **Passed** | See §8.8. |

### 8.8 Final verification, bare URLs, 22:18 UTC (Yoast inactive, plugin v1.1.5)

- **Posts (27 rendered):** 27/27 — HTTP 200; exactly one `<title>` (equal to the Stage 1 Yoast backup, 26/26 with a baseline), one canonical equal to the URL (26/26 equal to the backup), one description, one `og:title`, `og:description`, `og:image`, `twitter:card`, one JSON-LD graph (Organization, WebSite, Person, BlogPosting, BreadcrumbList; logo present); no "yoast" anywhere in `<head>`; no "1 hour from Manila"; no noindex. Article #6: 301 → `https://haveninlipa.com/staycation`.
- **Homepage / page 2 / page 3:** titles `Haven in Lipa Blog - Travel, Stay & Explore Lipa City` and `… - Page N of 3 - …`; canonicals `/`, `/page/2/`, `/page/3/`; description, `og:image`, Twitter card present; homepage identical to the pre-cutover Yoast output on title, description, canonical, `og:title/description/url/site_name/image`, `twitter:card`.
- **Noindex:** all 8 tag/category archives, `/author/haven/`, `/author/cassandrakim/`, search and date archives → `noindex, follow` from `hil-seo` alone.
- **Sitemaps:** `/wp-sitemap.xml` 200 `application/xml`, 28 URLs (27 posts + homepage), no archive/author/article-#6 URLs; `/sitemap_index.xml` one 301 → `/wp-sitemap.xml`; `/post-sitemap.xml`, users/category/tag sitemaps 404.
- **robots.txt (virtual, no physical file):** `User-agent: *`, `Disallow: /wp-admin/`, `Allow: /wp-admin/admin-ajax.php`, one `Sitemap: https://blog.haveninlipa.com/wp-sitemap.xml`.
- **Other:** Yoast's REST namespace is gone, its files remain (readme reachable), `hil-seo/v1` present; the main-site footer still resolves `_yoast_wpseo_focuskw` via `hil-expose-focuskw`; Google's URL Inspection live test reports `/wp-sitemap.xml` available.
- **Not verified:** the 6 unpublished posts (need the authenticated preview route — the Analyst's REST credential was not available to this session); Google's Rich Results Test (not run); GSC's "Success" for the new sitemap.

### 8.9 Rollback readiness and what remains

- **Rollback now:** Plugins → Yoast SEO → **Activate** is sufficient (Yoast's XML-sitemaps setting stays OFF, so core's sitemap and the 301 are unaffected; the plugin's homepage output stands down while Yoast is active). Returning to Yoast's own sitemap additionally needs XML sitemaps ON and the Redirection rule disabled. Yoast is installed and its data untouched.
- **Yoast may NOT yet be deleted.** Before deletion: (1) rollback window closed and one GSC crawl cycle clean (fold into the October Maintenance run); (2) GSC shows the new sitemap as Success and the old entry is removed; (3) Yoast's stored settings exported first; (4) longer term, point the main-site footer (`src/components/layout/Footer.tsx`) at `hil_focus_keyword` instead of `_yoast_wpseo_focuskw` (works today because the meta survives deactivation; new posts only get the HIL field).
- **Owner:** confirm GSC sitemap status; optionally run the Rich Results Test on `/` and one post (expect 0 critical errors).
- **SEO Analyst:** authenticated read of `/hil-seo/v1/status` and the six flags; preview-route check of the 6 unpublished posts before they publish; monitor Coverage for one crawl cycle.
- **Optional/advisory:** 11 of 27 descriptions end in "…" (documented 158-char trim); several SEO titles exceed the 60–65 guideline (identical to Yoast's, so left alone); no `rel=next/prev` and no `og:image` width/height (accepted differences).

### 8.10 Independent read-only production verification, 2026-09-19 22:35–22:38 UTC (plugin v1.1.5, Yoast inactive) — PASSED

GET/HEAD only; nothing was modified, purged, activated or deactivated. Every URL was fetched twice — as a normal bare URL and cache-busted — and the two outputs were compared. Baselines: `HIL_SEO_Metadata_Backfill.xlsx` (approved title/description/canonical, 27/27 posts have a row) and `yoast-pre-migration-backup/`.

- **Coverage:** 28 REST-published posts (27 render; article #6 is the retired 301); `/`, `/page/2/`, `/page/3/`, `/page/4/` (404); 9 category, 25 of 141 tag (15 most-used, 5 mid, 5 least-used), 2 author, 5 date and 1 search archives; 18 tracking-parameter URL/mode combinations (3 posts, home, page 2, page 3, category, tag, author); `/robots.txt` (3 access paths); `/wp-sitemap.xml` + children; retired `/sitemap_index.xml`; platform checks. **4,264 checks.**
- **Result:** **4,238 in-scope checks, 0 failures.** 4 further checks failed on the `/?s=lipa` search-results page (added beyond the required scope): it has no JSON-LD, which is by design (`schema.php` returns early on `is_404() || is_search()`); the harness expectation was wrong. **0 confirmed defects.** Negative control: a synthetic Yoast-style head fails the relevant checks.
- **Every post (27, bare and busted, 46 checks each):** one `<title>` equal to the approved workbook title (27/27) and to the Yoast backup (26/26 with a baseline; the 27th post post-dates the backup); one description; one canonical equal to the clean permalink (equal to the Yoast canonical 26/26); indexable; one each of `og:title/description/url/type/site_name/image/locale` and `twitter:card/title/description/image`, all consistent with title/description/canonical; `og:image` returns a 200 image; exactly one JSON-LD script (Organization, WebSite, Person, BlogPosting, BreadcrumbList; logo present, unique `@id`s, clean URL); no "yoast"/"wordpress-seo" anywhere in the HTML, headers or schema; no X-Robots-Tag header; bare output identical to cache-busted output. Descriptions vs approved workbook: 14 identical, 2 owner-edited on 2026-09-19 (posts 268, 272), **11 the documented 158-char trim of longer approved text** (advisory below).
- **Homepage, page 2, page 3:** title `Haven in Lipa Blog - Travel, Stay & Explore Lipa City` / `… - Page N of 3 - …`, canonical `/`, `/page/2/`, `/page/3/`, description = tagline, `og:*`/Twitter with the logo, JSON-LD Organization+WebSite; bare == busted.
- **Archives (42 URLs × 2 modes):** all `noindex, follow` (26/26 equal to the Yoast robots baseline), single title with the suffix once, zero-or-one clean canonical, valid single JSON-LD, no Yoast markup.
- **Tracking parameters** (`utm_*`, `fbclid`, `gclid`): canonical and `og:url` stay clean on posts, home, page 2 and 3; noindex preserved on archives; no parameters in JSON-LD.
- **robots.txt:** 200 `text/plain` on all three paths; standard core rules; exactly one `Sitemap: …/wp-sitemap.xml`; no `sitemap_index`, no Yoast block, no site-wide Disallow.
- **Sitemaps:** index 200 `application/xml`, well-formed; lists only the post and page sitemaps; 28 URLs = the 27 posts + homepage exactly; no article #6, archive, author or parameterised URL; bare == busted; removed sitemaps (`post-sitemap.xml`, `page-sitemap.xml`, users/category/tag) 404.
- **Retired `/sitemap_index.xml`:** one 301 (`x-redirect-by: redirection`) → `/wp-sitemap.xml` → 200 (chain `[301, 200]`); legacy `/sitemap.xml` also 301s to `/wp-sitemap.xml`.
- **Platform:** Yoast REST namespace and `yoast_head*` absent; `hil-seo/v1` present; installed version 1.1.5; Yoast files present (installed, inactive).
- **Documented differences from the Yoast baseline, on noindex archives only (not defects):** titles are `X – Haven in Lipa Blog` (WordPress default join with the single forced suffix — the Audit §3 fix) instead of Yoast's `X Archives - Haven in Lipa Blog` (0/26 identical); the plugin's meta module covers singular content and the homepage, so archives no longer carry the `og:*`/Twitter tags Yoast printed on them (Yoast had no canonical or description on them either).
- **Advisories (Owner decision, not blocking):** (1) 11 posts' live descriptions end in "…" because their approved text is 161–224 characters and the plugin trims to ≤158 (Yoast served the full text for 10 of them); either accept, or shorten those descriptions in the post editor. (2) Optional: extend `og:*` to archives. (3) Titles over 60–65 characters are identical to Yoast's.
- **Not covered:** the 6 unpublished posts (no authenticated access); 116 of 141 tag archives (representative sample tested; the tag template is shared); Google's Rich Results Test; GSC status.
- **Verdict:** no rollback or remediation required; this verification item is closed. The wider cutover gate stays open only for GSC "Success" and one clean crawl cycle.

### 8.11 Owner decisions (2026-09-19), post-cutover monitoring, and scheduled-post checkpoints — SEO-DEC-027

**Formal closure.** The Owner accepted the §8.10 result and **formally closed the technical `hil-seo`/Yoast cutover** (2026-09-19). What remains is monitoring (below), not implementation.

**Owner decisions**
1. **Rewrite the 11 truncated meta descriptions** to ~150–158 characters, each ending naturally, no ellipsis. Text below; applied by the Owner in the post editor's "SEO (HIL)" box; verified live afterwards (status in the table).
2. **Accept the revised archive-title format** (`X – Haven in Lipa Blog`, replacing Yoast's `X Archives - Haven in Lipa Blog`) — closes advisory 2 of §8.10.
3. **Do not add Open Graph/Twitter tags to noindex archives** — closes advisory 3; noindex archives intentionally carry none.
4. **Yoast stays installed but inactive. Deleting it requires separate Owner approval** (prerequisites in §8.9 unchanged).
5. **Monitoring continues** until `/wp-sitemap.xml` shows Success in Google Search Console and one clean crawl cycle completes (definition below). Each of the six scheduled posts gets a verification checkpoint after it publishes.

**The 11 descriptions** (only these 11 change; posts 268 and 272 were already fixed on 2026-09-19 and are untouched). All are within 150–158 characters, end with punctuation, contain no ellipsis, no drive-time figure and no compliance-sensitive wording (SEO-DEC-013–018/-023).

| Post ID | Slug | Chars | New description |
|---|---|---|---|
| 27 | weekend-getaway-in-lipa-city-batangas-your-chill-escape-near-manila | 150 | Weekend getaway in Lipa City, Batangas: cool mountain views, no crowds, and great food, a comfortable drive from Manila. See our easy 2-day itinerary. |
| 77 | how-to-get-to-lipa-city-from-manila-2026-guide | 157 | How to get to Lipa City from Manila in 2026: bus routes from PITX, Buendia and Cubao, plus car, Grab and taxi options, fares, travel times, and helpful tips. |
| 205 | mickey-in-lipa-coming-soon | 158 | A Disney-inspired family house is opening soon at HavenInLipa. Meet Mickey in Lipa: a full Bella Vita house with flexible booking. Join the early-access list. |
| 307 | family-weekend-batangas-without-beach-crowds | 155 | Tired of Laiya traffic and crowded beaches? Plan a relaxing family weekend in Batangas: a 2-day Lipa City itinerary, family-friendly food, and budget tips. |
| 451 | work-from-lipa-rainy-season-july | 158 | Why July is the best month for remote work in Lipa: cool weather, reliable fiber WiFi, lower rates, and fewer distractions for deep, focused work near Manila. |
| 552 | barkada-getaway-near-manila-why-a-whole-house-in-lipa-beats-a-beach-resort-cost-per-head-math-inside | 158 | Barkada getaway near Manila? See the real cost-per-head math on renting a whole house in Lipa City versus a beach resort, with an itinerary and budget inside. |
| 575 | batangas-road-trip-itinerary-lipa-base | 157 | A Batangas road trip itinerary with Lipa City as your base: cooler nights, close to Taal, Mt Maculot and Tagaytay. 2D1N and 3D2N plans with real PHP budgets. |
| 590 | summer-in-lipa-cool-highland-escape | 154 | Summer in Lipa means cooler highland air, fewer crowds, and no sunburn. A smart alternative to packed Batangas beaches, with where to stay and what to do. |
| 602 | lipa-charter-day-history-coffee-town-to-city | 158 | August 20, 1947: the day Lipa became a city. The honest history of how a coffee-boom town earned its charter, and why Lipa still feels more like a town today. |
| 626 | ninoy-aquino-day-long-weekend-lipa-2026 | 150 | Skip La Union and Anilao this Ninoy Aquino Day weekend (Aug 21–23, 2026). A slow Lipa itinerary for couples and families, with real food and a budget. |
| 718 | heroes-day-weekend-lipa-2026-quiet-itinerary | 156 | National Heroes Day 2026 weekend (Aug 28–31) is a 4-day break. A quiet, indoor-friendly Lipa itinerary for late-August rains, with slow days and real meals. |

Editorial choices made while shortening (Owner to note): post 27's approved text said "just **1 hour away**" — the same unsupported drive-time claim SEO-DEC-023 removed elsewhere — so it now uses the approved non-numeric wording "a comfortable drive from Manila"; post 590 dropped "solar-backed, brownout-proof" (an unverifiable claim); post 552 dropped the "cooler, quieter, cheaper" comparison in favour of "versus a beach resort". **Per HIL DEC-007 (prose is number-free), no rewrite carries a hard-coded capacity or price:** post 205's approved text said "sleeps 5, 9, or 13", which is **wrong against the live inventory** (the three Mickey configurations sleep 7, 11 and 15 per `/api/properties.json`), and post 552's "9-pax house" was a hard-coded capacity — both are now number-free. The bodies of posts 205 and 552 may repeat the same figures; not checked, not changed (outside the approved scope).

**Finding outside the approved 11 — NOT changed, needs an Owner decision:** post **75** (`work-from-lipa-the-affordable-remote-work-staycation…`) has a live description containing "just 1 hour from the metro" (same class as SEO-DEC-023) plus a hard-coded "₱1,500/night" and "400 Mbps" (pricing/speed facts owned by the Owner; the main site normalises pricing at render time, the blog does not).

**Application status:** ☐ applied by Owner · ☐ verified live (bare + cache-busted; only these 11 descriptions and their derived `og:description`/`twitter:description` changed; the other 16 posts byte-identical) — *update this line when done.*

**Monitoring — definition of "one clean crawl cycle" (proposed by the Analyst; Owner may amend).** 14 calendar days from 2026-09-19 (to 2026-10-03), reviewed in the early-October Maintenance run. Clean means, on the blog property in GSC: (1) Sitemaps: `wp-sitemap.xml` = **Success**, discovered pages ≈ the published post count + homepage, no errors; the old `sitemap_index.xml` entry then removed; (2) Page indexing: zero "Submitted URL marked 'noindex'", zero "Submitted URL not found (404)", zero "Redirect error"/"Server error (5xx)"; expected and acceptable: article #6 "Page with redirect" and noindex archives "Excluded by 'noindex' tag"; (3) Enhancements: no new structured-data errors; (4) Crawl stats: no spike in 4xx/5xx on `blog.haveninlipa.com`; (5) blog clicks/impressions show no unexplained drop against the prior 28 days. Owner/Analyst record the result in the log below. Yoast may be considered for deletion only after this closes **and** the Owner separately approves.

**Six scheduled posts — checkpoint after each publishes.** WordPress IDs 763–768 (dates are from the 2026-09-07 backup, timezone as configured — **confirm the current schedule in WP Admin → Posts → Scheduled**; 763 additionally needed Melody's accessibility fact-check before scheduling per the 09-07 status).

| ID | Slug | Scheduled (per 09-07) | Checkpoint result |
|---|---|---|---|
| 763 | senior-friendly-staycation-guide-lipa | 2026-09-21 08:08 | ☐ |
| 764 | solo-travel-guide-lipa | 2026-09-28 08:00 | ☐ |
| 765 | family-reunion-accommodation-lipa | 2026-10-05 08:00 | ☐ |
| 766 | team-building-house-rentals-lipa | 2026-10-12 08:00 | ☐ |
| 767 | wedding-guest-accommodation-lipa | 2026-10-19 08:00 | ☐ |
| 768 | whole-house-rental-vs-hotel-lipa | 2026-10-26 08:00 | ☐ |

Per-post checkpoint — **before publication** (Analyst reads via `GET /wp-json/hil-seo/v1/preview/<id>` with the Analyst credential, or Owner in the "SEO (HIL)" box): SEO title present; meta description present, ≤158 characters, no ellipsis, no numeric drive-time claim, no price/speed figure the Owner has not confirmed, no compliance-sensitive wording; robots `default`; schema `blogposting`; featured image set; no `[OWNER …]` placeholder; warnings panel clear or explained. **Within 2 hours after publication** (bare and cache-busted): the same checks as §8.10 for a post — HTTP 200; one `<title>`, one description equal to the approved text, one clean canonical, indexable; one each of `og:*`/Twitter with `og:type=article` and a 200 `og:image`; exactly one valid BlogPosting JSON-LD graph; no Yoast markup; bare == cache-busted (if stale, Owner purges LiteSpeed then the CDN); the URL appears in `/wp-sitemap.xml` and nothing else in the sitemap changes; the homepage and `/page/N/` still render correct titles and canonicals. **Expect a change:** the "of M" in paginated titles (`… - Page N of M - …`) will move from 3 to 4 once the published post count passes 30 — that is correct, not a regression. **Days 3–7:** GSC URL Inspection shows the URL discovered/indexed with no new error. Record each result in the table above with the date.



### 8.12 Work package 2026-09-19: blog-claim durability, description rewrites and scheduled-post checkpoints — SEO-DEC-028

**Owner instruction:** complete end-to-end without further editorial approvals unless a change would materially alter policy, pricing, property facts or publication status. **WordPress write credentials were not available to the Analyst session** (the Analyst REST credential is held outside this workspace; the session was denied when it tried to locate it and did not work around that). Per the instruction, every task that does not need a WordPress write was completed, and every required edit is consolidated into the **single owner batch below**.

**Status**

| Task | Status |
|---|---|
| 11 approved description rewrites (text final, validated 150–158 chars, DEC-007-clean) | Drafted; **application pending — owner batch A** |
| Post 75 description rewrite (152 chars, natural ending, no "1 hour", price or speed) | Drafted; **pending — owner batch A** |
| Audit of posts 75, 205, 552 for unsupported/outdated claims | **Done** (evidence below); corrections **pending — owner batch B** |
| Post 763 schedule and accessibility language | **Cannot be read without credentials** (`GET /wp-json/wp/v2/posts/763` → 401; scheduled posts are not public); **owner batch C**; not unscheduled, not reopened |
| Read-after-write and rendered-page verification | Harness built and dry-run against production (104 unchanged-state checks pass; 103 "not yet applied" checks fail as expected; nothing unexpected); **runs after the batch is applied** |
| Cache purge | Not needed yet; only if a verified stale copy remains after the batch (LiteSpeed, then CDN) |
| Plugin v1.1.5 source and docs committed and pushed to `dev` | **Done** (see final report for hashes) |

**Source of truth used for the audit** (main-site `/api/properties.json`, 2026-09-19): Cozy 1BR — 5 guests, ₱1,500; Spacious 2BR — 9 guests, ₱2,800; Mickey Family Staycation — 7 guests, ₱2,500; Family House — 11, ₱4,500; Full Family House — 15, ₱6,500. Property pages state "Fiber WiFi up to 340 Mbps" for the Block 34 units.

**Audit findings.**

- **Wrong or contradicted (must change):** post 75 — "400 Mbps" (title, headline, excerpt, 4 body places; property pages say up to 340 Mbps), excerpt price "P2,000 per night" (current rate is ₱1,500), "only an hour from Manila" / "about 1 hour" (SEO-DEC-023 class); post 205 — excerpt "sleeps 5, 9, or 13" (obsolete; current 7/11/15), body "8 to 13 guests", "families of 4 to 9", speed claims "more than 500 mbps" / "400+ mbps"; post 552 — "One hour from SLEX vs. 3+ hours".
- **Correct today but hard-coded (changed for durability where removal does not change the article's intent):** post 75 nightly rates, meal, toll, bus and taxi figures; post 552 per-night prices in the "Where to stay" list.
- **Deliberately retained:** the 5 and 9 capacities of Cozy 1BR and Spacious 2BR (they are *current* per the feed — the obsolete 5/9/13 set was Mickey's old configuration), post 205's 7/11/15 configurations and room-level bed counts (correct; body was already corrected on 2026-09-08), post 205's "48 hours" notification window (policy), post 552's cost-per-head math (₱2,800 ÷ 9 ≈ ₱311, budget lines) and heading "What 9 people actually need…" (the article's stated purpose; a one-sentence currency note is added instead), and post 552's "save 15–20% vs Airbnb" (a pricing/policy claim — **not changed; needs an Owner decision**).
- **Headings, URLs, slugs and structure are preserved.** The only heading-level change is post 75's title (and its SEO title): the parenthetical "(400 Mbps WiFi + ₱1,500/night)" is removed because it is the most visible copy of the contradicted speed claim.
- **Blog-wide backlog (NOT changed, outside scope):** the same claim classes appear across the blog — drive/travel times in all 28 posts (238 occurrences), peso prices in 27 posts (406), "sleeps/fits up to N" in 25 posts (147), Mbps figures in 10 posts (451, 355, 272, 205, 268, 75, 70, 67, 44, 73). Post 268 and 272 (edited 2026-09-19) and 73 still mention Mbps; recommend a separate, owner-approved content-durability sweep.

#### Owner batch — all required WordPress edits (single batch)

**Batch A — 12 meta descriptions.** Post editor → **SEO (HIL)** box → replace only **Meta description** → **Update**. Edit link: `https://blog.haveninlipa.com/wp-admin/post.php?post=ID&action=edit`.

| ID | New meta description | Chars |
|---|---|---|
| 27 | Weekend getaway in Lipa City, Batangas: cool mountain views, no crowds, and great food, a comfortable drive from Manila. See our easy 2-day itinerary. | 150 |
| 75 | Ditch Manila rent. Work remotely from Lipa City with fiber WiFi, a full kitchen, and Netflix. Quiet, affordable, and a comfortable drive from the metro. | 152 |
| 77 | How to get to Lipa City from Manila in 2026: bus routes from PITX, Buendia and Cubao, plus car, Grab and taxi options, fares, travel times, and helpful tips. | 157 |
| 205 | A Disney-inspired family house is opening soon at HavenInLipa. Meet Mickey in Lipa: a full Bella Vita house with flexible booking. Join the early-access list. | 158 |
| 307 | Tired of Laiya traffic and crowded beaches? Plan a relaxing family weekend in Batangas: a 2-day Lipa City itinerary, family-friendly food, and budget tips. | 155 |
| 451 | Why July is the best month for remote work in Lipa: cool weather, reliable fiber WiFi, lower rates, and fewer distractions for deep, focused work near Manila. | 158 |
| 552 | Barkada getaway near Manila? See the real cost-per-head math on renting a whole house in Lipa City versus a beach resort, with an itinerary and budget inside. | 158 |
| 575 | A Batangas road trip itinerary with Lipa City as your base: cooler nights, close to Taal, Mt Maculot and Tagaytay. 2D1N and 3D2N plans with real PHP budgets. | 157 |
| 590 | Summer in Lipa means cooler highland air, fewer crowds, and no sunburn. A smart alternative to packed Batangas beaches, with where to stay and what to do. | 154 |
| 602 | August 20, 1947: the day Lipa became a city. The honest history of how a coffee-boom town earned its charter, and why Lipa still feels more like a town today. | 158 |
| 626 | Skip La Union and Anilao this Ninoy Aquino Day weekend (Aug 21–23, 2026). A slow Lipa itinerary for couples and families, with real food and a budget. | 150 |
| 718 | National Heroes Day 2026 weekend (Aug 28–31) is a 4-day break. A quiet, indoor-friendly Lipa itinerary for late-August rains, with slow days and real meals. | 156 |

**Batch B — body/title/excerpt corrections.** Edit each sentence in place (keep bold, links and images); "Find" is the exact current wording. In the block editor the **Excerpt** panel is in the document sidebar.

**Post 75** (`post=75`)

- **Post title:** `Work From Lipa: Affordable Remote Work Staycation Near Manila (400 Mbps WiFi + ₱1,500/night)` → `Work From Lipa: Affordable Remote Work Staycation Near Manila`
- **SEO (HIL) → SEO title:** `Work From Lipa: Affordable Remote Work Staycation Near Manila (400 Mbps WiFi + ₱1,500/night) - Haven in Lipa Blog` → `Work From Lipa: Affordable Remote Work Staycation Near Manila - Haven in Lipa Blog`
- **Excerpt** (currently "…400 Mbps WiFi, a full kitchen, and Netflix — starting at P2,000 per night… just 1 hour from the metro.") → `Ditch Manila rent. Work remotely from Lipa City with fiber WiFi, a full kitchen, and Netflix. Quiet, affordable, and a comfortable drive from the metro.`

| Where | Find (exact current wording) | Replace with |
|---|---|---|
| Intro paragraph (before the first heading) | What if you could work remotely from a quiet, affordable place with faster internet than most coworking spaces — and it’s only an hour from Manila? | What if you could work remotely from a quiet, affordable place with fast, dependable internet — and it’s a comfortable drive from Manila? |
| Why Remote Workers Love Lipa City → 1st paragraph | 400 Mbps WiFi — yes, you read that right. Our Cozy 1BR Haven at HavenInLipa runs on a dedicated 400 Mbps fiber connection. That’s faster than most coworking spaces in Makati. Video calls? | Fast fiber WiFi you can count on. Our Cozy 1BR Haven at HavenInLipa runs on a dedicated fiber connection built for remote work. Video calls? |
| Why Remote Workers Love Lipa City → “It costs way less…” | At ₱1,500 per night for a fully furnished 1-bedroom unit, you’re spending less than what most coliving spaces charge in the metro — and you get the whole place to yourself. | A fully furnished 1-bedroom unit often works out cheaper than a coliving space in the metro — and you get the whole place to yourself. Current nightly rates are on the listing page. |
| Your WFH Setup at HavenInLipa → “Internet you can rely on.” | The Cozy 1BR Haven comes with 400 Mbps fiber WiFi. We’re not just throwing numbers around — we’ve got speed test results to prove it. | The Cozy 1BR Haven comes with dedicated fiber WiFi. Speed test results are available on request. |
| Your WFH Setup → “A full kitchen…” | Instead of spending ₱300-500 per meal on Grab Food, hit the local market | Instead of ordering delivery for every meal, hit the local market |
| What to Do After Work Hours → “Food trip around town.” | Everything is affordable too — we’re talking ₱100-200 meals that are actually filling. | Everything is affordable too — filling meals at friendly prices. |
| Extended Stay Options and Pricing → bullet 1 | Cozy 1BR Haven — ₱1,500/night, fits up to 5 guests, 400 Mbps WiFi, solar-powered, Netflix included | Cozy 1BR Haven — fits up to 5 guests, fiber WiFi, solar-powered, Netflix included |
| Extended Stay Options and Pricing → bullet 2 | Spacious 2BR Getaway — ₱2,800/night, fits up to 9 guests, WiFi, Netflix, free parking | Spacious 2BR Getaway — fits up to 9 guests, WiFi, Netflix, free parking |
| How to Get Here From Manila → “By car” | Total drive time is about 1 hour with light traffic. Toll fees run around ₱200-300. | Drive time varies with traffic, and toll fees apply. |
| How to Get Here From Manila → “By bus” | it’s about 2 hours and costs around ₱238. JAM Liner from Buendia is another option at ₱150-200. | JAM Liner from Buendia is another option. Travel times and fares vary, so check the operator’s current schedule and rates. |
| How to Get Here From Manila → “By Grab or taxi” | Expect to pay around ₱2,500-3,000. | Fares vary with traffic and demand. |
| Frequently Asked Questions → “How reliable is the WiFi…” | The Cozy 1BR Haven has a dedicated 400 Mbps fiber connection. | The Cozy 1BR Haven has a dedicated fiber connection. |
| Extended Stay Options and Pricing → new one-line paragraph directly after the two bullets | *(new line)* | Current nightly rates are on each listing page. |

**Post 205** (`post=205`)

- **Excerpt** → `A Disney-inspired family house is opening soon at HavenInLipa. Meet Mickey in Lipa — one full house in Bella Vita, three booking configurations. Get on the early-access list.`

| Where | Find (exact current wording) | Replace with |
|---|---|---|
| Common early questions → “How does pricing compare to the existing 2BR?” | when you fill it with 8 to 13 guests. | when you fill it with a larger group. |
| One house, three ways to book it → 2-Bedroom Listing bullet | The right size for families of 4 to 9 who want a private bunk room | The right size for mid-sized families who want a private bunk room |
| The work-and-family trip → paragraph | WiFi runs fast on a dedicated fiber line (our test shows more than 500 mbps). | WiFi runs on a dedicated fiber line, fast enough for remote calls. |
| The work-and-family trip → image caption | Tested using the property’s Internet Router. Wireless connection may be around 400+ mbps. | Speed test taken at the property. Wireless speeds vary by device and location. |

**Post 552** (`post=552`)

- **Excerpt** → `The “10 resorts for your barkada” lists skip the one number that matters: cost per head. Here’s the honest math for a whole house in Lipa, plus an itinerary and budget.`

| Where | Find (exact current wording) | Replace with |
|---|---|---|
| The barkada getaway math… → paragraph beginning “That’s not a typo.” (append one sentence) | And nobody’s charging your barkada corkage for the case of beer you brought. | And nobody’s charging your barkada corkage for the case of beer you brought. Rates in this article were current when it was written, so check the listing page for today’s nightly rate. |
| Why Lipa over the usual Batangas beach trip → “Closer.” bullet | One hour from SLEX vs. 3+ hours to the Batangas beaches. | Lipa is a much shorter drive from SLEX than the Batangas beaches. |
| Where to stay in Lipa → bullet 1 | sleeps up to 9, kitchen + parking, from ₱2,800/night (the barkada default) | sleeps up to 9, kitchen + parking (the barkada default) |
| Where to stay in Lipa → bullet 2 | sleeps up to 15, from ₱6,500/night (bigger crew) | sleeps up to 15 (bigger crew) |
| Where to stay in Lipa → bullet 3 | sleeps up to 11, from ₱4,500/night | sleeps up to 11 |
| Where to stay in Lipa → bullet 4 | Disney-themed, sleeps up to 7, from P2,500/night | Disney-themed, sleeps up to 7 |
| Where to stay in Lipa → bullet 5 | sleeps up to 5, solar backup, from ₱1,500/night (smaller trips) | sleeps up to 5, solar backup (smaller trips) |
| Where to stay in Lipa → new one-line paragraph directly after the five bullets | *(new line)* | Current nightly rates are on each listing page. |

**Batch C — post 763 (`senior-friendly-staycation-guide-lipa`, ID 763).** Not readable without credentials, so it needs one look by the Owner, **before its scheduled publish (2026-09-21 08:08 per the 2026-09-07 backup)**: (1) WP Admin → Posts → Scheduled: confirm it is still **Scheduled** with the intended date/time — do not unschedule. (2) In the editor, read every sentence that makes an accessibility statement (step-free entry, ramps, grab bars, wheelchair access, door or bathroom width, senior- or PWD-friendliness, stairs, lifts). Keep a statement only if it matches Melody's earlier fact-check that the Owner confirmed. (3) Replace any statement that cannot be supported with qualified wording, using these patterns: *"The [unit] has [feature]. Accessibility needs vary, so please message us before booking and we will confirm whether it suits your needs."* / *"Some guests find the [feature] comfortable; we cannot guarantee full accessibility, so ask us about your specific needs."* / *"There are [N] steps at the entrance"* only if measured — otherwise *"There is a step at the entrance; message us for details."* Avoid measurements, certifications ("PWD-compliant") and absolutes ("fully accessible", "wheelchair-friendly"). (4) In **SEO (HIL)**: description present, ≤158 chars, no ellipsis, no drive-time, price or speed figure; robots `default`. (5) Update; leave the schedule untouched.

**After the batch:** tell the Analyst session "batch applied". It will run the prepared read-after-write and rendered verification (12 descriptions exact on bare and cache-busted URLs; only the intended posts and SEO fields changed versus the pre-change snapshot of all 27 posts; every Find string gone and every Replace string present in the rendered text; all headings, slugs and structure identical; only one added line each in posts 75 and 552; no Mbps/peso/hour residue in post 75; no obsolete 5/9/13 in post 205 while 7/11/15 remain; the sitemap still 28 URLs) and purge LiteSpeed then the CDN only if a verified stale copy remains.


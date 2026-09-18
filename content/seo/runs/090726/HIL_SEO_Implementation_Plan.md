# Haven in Lipa — Custom SEO Plugin: Implementation Plan

Date: 2026-09-07 (reclassified from the original "Web Work Stream Handoff" — see SEO-DEC-024; updated same day through the all-modules-live milestone and a robots.txt fix)
Status: **All 6 output modules live on production. One defect found and fixed same day (robots.txt); v1.1.1 packaged, pending Cedric's re-upload. Cache purge and Yoast deactivation remain ahead.** Per Cedric's 2026-09-07 instruction, the SEO Analyst owns the `blog.haveninlipa.com` WordPress environment and the complete implementation of this project. A Web Work Stream handoff is not used for this work unless a change to `haveninlipa.com` (the separate Next.js main site) is genuinely required — none has been found to be.

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

Cedric worked through the Administrator screen and turned **all 6 modules ON** — `hil-seo` is now what production renders for meta descriptions, SEO titles, canonicals, robots directives, and schema, with noindex-exclusion active on core's `/wp-sitemap.xml`.

Checking the sitemap transition, Cedric found robots.txt (virtual — no physical file exists on this site, confirmed via Yoast's own File Editor) still advertised Yoast's retired `Sitemap: https://blog.haveninlipa.com/sitemap_index.xml`. The sitemap module's original code only ever filtered which content appears *in* `/wp-sitemap.xml` — it never touched robots.txt, a separate WordPress filter (`robots_txt`) that only Yoast was hooking.

**Fixed in `includes/sitemap.php` (v1.1.1)**: a `robots_txt` filter at priority 999 (after Yoast's own callback) finds the exact existing `Sitemap:` line and rewrites its URL to `/wp-sitemap.xml`, in place. It never appends a new line, so there is no code path that could produce a duplicate. It re-checks the live sitemap flag on every request rather than writing a persistent change, so turning the module off — or using Emergency Rollback — restores Yoast's original line automatically on the next request. Yoast was not deactivated or otherwise modified to make this fix.

**Next step: Cedric re-uploads `090726/hil-seo-plugin.zip` (v1.1.1)** the same way as before (WordPress detects the matching slug and offers to replace v1.1.0/1.1.1's predecessor; every flag and setting persists across the replacement). Then, cache-busted: confirm robots.txt's `Sitemap:` line now reads `/wp-sitemap.xml` exactly once. Then proceed to the remaining steps in §4 (redirect, GSC resubmission, full verification pass, cache purge, Yoast deactivation) via the Administrator screen's on-screen instructions.

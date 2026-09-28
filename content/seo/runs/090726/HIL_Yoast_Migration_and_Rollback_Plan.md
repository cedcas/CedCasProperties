# Haven in Lipa — Yoast Migration and Rollback Plan

Date: 2026-09-07
Status: **In execution.** The role upgrade, sitemap ownership, and author-reassignment decisions this plan depends on were approved by Cedric on 2026-09-07 (SEO-DEC-019, SEO-DEC-020, SEO-DEC-021), and Cedric has authorized the SEO Analyst to execute this plan directly on `blog.haveninlipa.com` (SEO-DEC-024) — no separate developer handoff for this workstream. Stage 1 (backup) is complete. Two steps remain outside the Analyst's own reach regardless of that authorization, both requiring a short action from Cedric himself: the Editor-role promotion (only an existing Administrator can promote a WordPress account's role) and getting the plugin's files onto the server (Editor-role REST access cannot install a plugin — see `HIL_SEO_Implementation_Plan.md` §3 for exactly what's needed and why). Everything else in this plan is executed directly by the Analyst.

---

## 0. Non-negotiable constraint

**At no point in this migration does the site run with neither system supplying critical SEO output.** Every stage below is written so Yoast keeps emitting live output until the custom plugin has been verified — on production, not staging — to emit equivalent or better output for every URL class. This directly answers the brief's "do not create a temporary period where neither system supplies critical SEO output."

---

## 1. Staged sequence

### Stage 1 — Export and preserve Yoast metadata and global settings

- Export Yoast's global settings (title templates, social profile URLs, organization/person representation) via Yoast's own Tools → Import/Export, or by reading the relevant `wp_options` rows read-only via REST/wp-cli (read-only — no writes in this stage).
- Snapshot the current `yoast_head_json` output for all 34 posts (27 published + 7 scheduled) — **already captured** as part of this audit (see `HIL_SEO_Metadata_Backfill.xlsx`), so this stage is substantially already done as a side effect of Phase 1's live verification, not a separate future task.
- Snapshot `robots.txt` and `/sitemap_index.xml`'s current content (captured in the Current-State Audit §6).
- **Done when**: a dated export file exists showing every post's pre-migration Yoast title/description/robots/canonical, and the two global files' pre-migration content — so any post-cutover discrepancy can be traced to a specific before/after diff, not reconstructed from memory.

### Stage 2 — Build the custom plugin with output disabled or isolated

- **Complete.** The SEO Analyst built the plugin per `HIL_Custom_SEO_Plugin_Requirements.md`, modeled directly on `tms-core`/`ncs-core`'s file structure (`includes/meta.php`, `includes/seo-meta.php`, `includes/schema.php`, plus the new `includes/robots.php` and `includes/editor-fields.php` this project needs beyond the TMS/NCS baseline) — output gated behind a cutover-flag option (`includes/cutover.php`) that defaults every module to off, so activation on production changes no front-end output by itself. Source: `090726/hil-seo-plugin/`, packaged as `090726/hil-seo-plugin.zip`. All 9 PHP files pass `php -l`. Not yet installed on the site — see §3 of `HIL_SEO_Implementation_Plan.md` for the one remaining access question that blocks this.
- Yoast stays active and stays the only thing printing to `wp_head` during this stage — the new plugin's output hooks exist in code but are not yet wired to fire, exactly as TMS's own launch notes describe handling the Rank Math coexistence risk ("if Yoast is installed on the new site, disable its schema and social modules, or drop these two files — two sources of structured data on one page is worse than either alone").
- **Done when**: the plugin activates cleanly on staging with zero front-end output change (verified by diffing staging's rendered `<head>` before/after activation), and every field in the Requirements doc §1 round-trips correctly via REST on a staging test post (this is the "run once against a real post" verification the shared `seo_plugin.py` module insists on for any new SEO-field backend — same discipline applies here even though this plugin is newly written, not adapting an existing plugin's undocumented internals).

### Stage 3 — Import the approved article backfill

- Once the backfill workbook (`HIL_SEO_Metadata_Backfill.xlsx`) has owner-approved final values (not just current-state capture), populate the new plugin's fields for all 34 existing posts via REST, using the exact field contract in the Requirements doc §6.3.
- **This stage is blocked on the Editor-role account upgrade** (approved as SEO-DEC-019, not yet executed) for the 18 Cassandra-Kim-authored posts specifically — the 9 Haven-authored posts and 7 scheduled posts can be backfilled with today's credential; the other 18 cannot, until the role is upgraded and those posts are reassigned to Haven (SEO-DEC-021, approved — reassignment changes only the `author` field, preserving URLs, publication dates, and content).
- **Done when**: every post's `hil_*` meta fields are populated and read back correctly, verified per-post, not spot-checked.

### Stage 4 — Validate REST/API draft creation and metadata population

- Create one genuinely new test draft end-to-end through the Analyst's normal tooling (`draft_common.create_draft()` pattern), confirming every field in the Draft-Posting Workflow doc §2 populates correctly and the draft lands as `status=draft` (never bypassing `WP_ALLOW_PUBLISH=false`).
- **Done when**: the test draft's read-after-write output matches the request payload exactly, for every field, and status is confirmed `draft` in the live WordPress admin, not just in the REST response.

### Stage 5 — Compare Yoast and custom output URL by URL

- For every one of the 34 posts plus the key archive/taxonomy/search/404 templates, diff Yoast's currently-live output (Stage 1's snapshot) against the new plugin's output, **with the new plugin's output rendered to a comparison location that doesn't yet affect the live page** (e.g., a query-string-gated preview mode, or a staging copy of production data).
- **Bypass cache when comparing** — the Current-State Audit §5 found a live, real caching bug (LiteSpeed serving a 3-week-stale title on at least 2 URLs). Any URL-by-URL comparison in this stage must use a cache-busting parameter or a forced purge before treating a fetched page as ground truth, or this stage will falsely validate against stale Yoast output, not current Yoast output.
- **Done when**: a diff report exists for all 34 posts + the archive/search/404 templates, showing zero unexplained differences (a *deliberate* difference — e.g., a corrected "1 hour from Manila" description, Requirements doc's backfill-driven improvements — is fine and expected; an *accidental* one, like a dropped robots directive, is not).

### Stage 6 — Resolve discrepancies

- Any diff from Stage 5 that isn't a deliberate, approved improvement gets fixed in the plugin code before proceeding — this stage has no fixed duration; it ends when Stage 5's diff report is clean.

### Stage 7 — Prevent duplicate metadata and schema output

- Confirm (don't assume) that Yoast's schema/social/sitemap modules will be disabled at the exact moment the custom plugin's equivalent output goes live in Stage 8 — never both active on the same request. TMS's own launch-migration notes record this as a real risk they had to plan around explicitly ("two sources of structured data on one page is worse than either alone"), not a hypothetical.
- Practically: Yoast has a settings toggle to disable its schema/OG output independent of deactivating the whole plugin (Yoast → General → Features), which is the safer sequencing tool for Stage 8 than an all-or-nothing plugin deactivation — it lets the cutover happen field-by-field/module-by-module if a problem surfaces mid-stage, rather than an all-at-once flip with no intermediate checkpoint.

### Stage 8 — Enable the custom output and disable corresponding Yoast output, in a controlled sequence

Suggested order, each with its own verification before moving to the next (not a single big-bang flip):

1. Meta description + OG/Twitter (lowest risk — pure content, no indexing consequence if briefly wrong).
2. SEO title override (`pre_get_document_title`) — verify no double-suffix appears (the exact Audit §3/§4 failure mode) before proceeding.
3. Canonical override — verify no duplicate canonical tag renders during the brief overlap window.
4. Robots module — **highest risk stage**, verify every one of the archives currently `noindex, follow` (Audit §3: 7 confirmed live) still resolves to `noindex, follow` under the new plugin before disabling Yoast's equivalent, because a gap here is exactly the "archive directives that could disappear when Yoast is disabled" risk the brief calls out by name.
5. Schema — verify one `@graph` renders, not two, and that it validates in Google's Rich Results Test with 0 critical errors (per `Best-Practices.md`'s hard rule: "0 critical errors, not just 0 warnings").
6. Sitemap — see Stage 9, handled separately because of the URL-change consequence.

### Stage 9 — Disable Yoast only after parity and regression testing pass

- Deactivate Yoast entirely only once Stages 1–8 are individually verified clean.
- **Immediately before deactivation**: update `robots.txt`'s `Sitemap:` line and set up the 301 from the old sitemap URL (in the Redirection plugin, per the ownership boundary established in the Requirements doc §2/§5) to `/wp-sitemap.xml` — approved as SEO-DEC-020 (WordPress core's sitemap, with explicit retirement/redirect handling for the Yoast URL required as part of this stage, not optional).
- Retire the `hil-expose-focuskw` shim at this point, not before (Current-State Audit §1's classification note — it's needed for migration, not after).

### Stage 10 — Validate production HTML, sitemap, schema, social metadata, and indexing controls

- Full re-run of the Current-State Audit's live checks (§3, §6, §7 of that document) against production, post-cutover, **with cache purged first** (Audit §5's lesson, applied here at the highest-stakes verification point in the whole project).
- Explicitly re-check the 7 previously-verified-noindex archives — confirming they're still `noindex, follow` under the new plugin is the single most important check in this stage.
- Submit the new sitemap URL in Google Search Console.

### Stage 11 — Retain a documented rollback procedure

See §2 below — written now, before Stage 8 begins, not improvised if something goes wrong mid-cutover.

### Stage 12 — Monitor Search Console after migration

- Watch Coverage report for any of the 34 posts dropping out of the index, or any of the 7 previously noindexed archives reappearing as indexed, for at least one full crawl cycle (recommend folding this into the existing October Maintenance (Delta) run already scheduled per `SEO_PROJECT_STATUS.md`, rather than inventing a new checkpoint).

---

## 2. Rollback procedure

Two rollback tiers, matched to how far into the sequence a problem is found:

**Tier 1 — Problem found in Stages 1–7 (Yoast still fully active and unmodified).** No rollback needed — nothing live has changed. Fix the plugin code and re-run the failed stage.

**Tier 2 — Problem found in Stage 8 (partial cutover) or Stage 9+ (Yoast disabled).**

1. Reactivate Yoast immediately (WordPress plugin reactivation is near-instant and non-destructive — Yoast's own data was never deleted, only its output was superseded).
2. Re-enable any Yoast module toggled off in Stage 7/8 (schema, social output).
3. Deactivate (not delete) the custom plugin's conflicting output hooks, or gate them back behind the Stage 2 feature flag.
4. Revert the `robots.txt`/sitemap redirect changes from Stage 9 if they were already made.
5. **Purge cache** (LiteSpeed) immediately after reactivation — per the Audit §5 finding, a stale cache during a rollback would mean visitors and crawlers see neither system's correct output for however long the cache TTL runs, which defeats the entire point of a fast rollback.
6. Re-run the Stage 10 verification checklist against the *rolled-back* state to confirm Yoast's original output is genuinely restored, not assumed restored.

**What makes this rollback safe by construction**: Yoast is never deleted or uninstalled at any point in this plan — only deactivated (Stage 9) after everything else has already passed verification. Deactivating a WordPress plugin preserves its database tables and settings; reactivating restores its exact prior configuration. This is the same "reversible action model" principle `Best-Practices.md` already documents for WordPress access generally, applied here to the plugin-level cutover itself.

---

## 3. Sequencing dependency on the role/capability fix

Stage 3 (backfill import) cannot complete for 18 of 34 posts without the Editor-role account upgrade executed (approved as SEO-DEC-019, not yet done). This does not block Stages 1, 2, 4 (which only need the 9 Haven-authored posts plus new test drafts), but it does block full backfill and therefore Stage 5's URL-by-URL comparison from being *complete* (it can proceed for 16 of 34 posts — 9 published + 7 scheduled — without the fix). The role upgrade should be the first thing Cedric does, since it's a small, low-risk change (a WordPress role change on an existing account, not a new credential or a new access grant) relative to the amount of downstream work it unblocks — and it's a change only he can make, regardless of how much of the rest of this plan the Analyst executes directly.

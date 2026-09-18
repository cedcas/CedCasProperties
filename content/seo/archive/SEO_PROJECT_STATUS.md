> **ARCHIVED 2026-09-17 — migrated from the shared `/VSCode/seo` workspace.** Current
> status now lives in [HIL_PROJECT_STATUS.md](../../../About%20HIL/HIL_PROJECT_STATUS.md)
> and [docs/HIL_SEO_SPECIFICATION.md](../../../docs/HIL_SEO_SPECIFICATION.md). This file is
> preserved verbatim for provenance and is not maintained going forward — the former
> shared-workspace copy at `/VSCode/seo/content for HavenInLipa/SEO_PROJECT_STATUS.md`
> carries the same notice and was left in place, unmodified, as the pre-migration record.
> **The migration does not close any open item recorded below** (see the SEO spec's
> "Deferred / Not Authorized by This Migration" section).

---

# HavenInLipa — SEO Project Status

Last updated: 2026-09-07 (Yoast-replacement workstream: all 6 output modules turned ON live by Cedric via the Administrator screen; one robots.txt defect found and fixed same-day, v1.1.1 packaged pending re-upload)

## Current State

Overall: GREEN — site healthy, content engine running, both Aug16 approval gates closed. **One open gate**: the custom `hil-seo` plugin is now live for all 6 output modules (meta, title, canonical, robots, schema, sitemap) — Yoast is still active but every module Cedric has enabled now renders from the new plugin. A robots.txt defect from the sitemap cutover was found and fixed the same day; v1.1.1 is packaged and needs Cedric's re-upload. Cache purge and Yoast deactivation remain ahead. Momentum metric (main-domain click share, currently 1.9%) is the thing being watched into October.

## Active Gate

**Custom SEO Plugin (Yoast replacement) — Final Verification & Yoast Deactivation Gate**, opened 2026-09-07 (superseding the prior Go-Live Gate, closed the same day once Cedric turned all 6 modules on via the Administrator screen). Per SEO-DEC-024, the SEO Analyst owns `blog.haveninlipa.com` and has executed directly: role upgrade, plugin install, **the full 34-post metadata backfill** (zero mismatches), **all 18 Cassandra-Kim author reassignments** (SEO-DEC-021, verified via before/after diff including a content hash), and **a full parity check** — title/canonical/robots matched Yoast exactly for all 34 posts pre-cutover, meta description matched for 17 + 3 approved rewrites, remaining 14 explained by the plugin's proven length-trim behavior (not a defect). **One real bug was caught and fixed before import**: a backfill-workbook column had inherited a placeholder string for 20 rows — corrected before anything was written to production.

**Administrator screen built and used**: plugin v1.1.0 added an Administrator-only **WP Admin → HIL SEO** screen (SEO-DEC-025) — Cedric has since worked through it and **turned all 6 modules ON live**. This plugin's output is now what production renders for meta descriptions, SEO titles, canonicals, robots directives, and schema, and its noindex-exclusion filters are active on core's `/wp-sitemap.xml`.

**Defect found and fixed same day**: with the sitemap module ON, Yoast's virtual robots.txt (no physical file exists — confirmed via Yoast's own File Editor) still advertised its own retired `/sitemap_index.xml` in its `Sitemap:` line. Root cause: the sitemap module only ever controlled core-sitemap noindex-exclusion, never robots.txt's advertised URL — a gap, not something the original design had addressed. **Fixed in plugin v1.1.1**: a `robots_txt` filter (priority 999, after Yoast's own) rewrites that one existing line in place — never appends, so no duplicate-line code path exists — and automatically reverts to Yoast's original line if the sitemap module is turned off or Emergency Rollback is used. Yoast remains fully active throughout. **v1.1.1 is packaged (`090726/hil-seo-plugin.zip`) and needs the same manual-upload/replace Cedric has done twice already** before this fix takes effect.

Remaining before Yoast can be deactivated: verify robots.txt post-upload (cache-busted), the 301 redirect from `/sitemap_index.xml` in the Redirection plugin, GSC resubmission, a full cache-busted verification pass across all 34 posts, the LiteSpeed purge, and finally deactivating Yoast — all covered by the Administrator screen's on-screen instructions.

Otherwise: **Full Audit & Strategy Run (Phases 1→2→3) completed 2026-08-16**, both STOP-point gates passed. Current cadence is **Maintenance/delivery mode** under the Aug16 strategy — weekly article cadence continues, implementation queue from the Aug16 DOCX is nearly closed out. Next scheduled checkpoint: **early October Maintenance (Delta) run** — re-baseline read on whether main-domain click share moved off 1.9% and whether the #1 refresh (shipped 8/17) improved position on `things to do in lipa city`. **Content freeze on new articles (#30+) takes effect 2026-09-15** per the Aug16 timeline — measurement window, not a new gate.

## In Progress

| Item | Executor | Status | Blocker |
|---|---|---|---|
| QA + finish articles #30–35 (featured images, in-body images, Yoast meta, schedule) | Cedric | WP drafts (ids 763–768) | #30 additionally needs Melody's accessibility fact-check before scheduling |
| Stay Match pilots #28 (Sep 7) / #29 (Sep 14) | Automatic + NCS retune | On schedule | None — CTR-by-confidence retuning happens as each pilot accrues data |
| Anchor-text naming drift on the 36 repointed `/staycation` links ("vs. Airbnb" phrasing vs. current page copy) | NCS | Flagged, not fixed | None — low priority, fix opportunistically |
| `/staycation` link added to the wedding page | Developer | Not yet done | Sequencing item under the weekly wedding-initiative thread |
| Decision on reclassifying article #27's Keyword Master row from Cluster 3 to Cluster 7 | Cedric | Flagged, deliberately not changed | Touches live GSC performance history — needs a deliberate call, not a silent fix |

## Blocked

- **Article #22 (lipa-pilgrimage-guide)** — still not indexed after 3+ weeks live; manual indexing requested 8/31, checking on next GSC pull.
- **Article #30 (senior-friendly)** — cannot schedule until Melody confirms 1BR accessibility claims.
- **Both Mickey `/book` endpoints** — still indexed 2+ months after the noindex fix shipped; recrawl resubmitted 8/31, waiting on Google.
- **5 newly-discovered category archives** (`/category/travel-and-itineraries/`, `/weekend-getaways/`, `/outdoor-adventures/`, `/uncategorized/`, `/getting-here/`) — indexed, same thin-archive pattern as prior tag/author fixes; pending a noindex decision (see SEO-DEC-008).
- `/category/booking-tips/` and `/tag/barako-coffee/` — recorded noindexed but still showing indexed; needs confirmation the noindex tag is actually live.

## Next

1. **Cedric: upload plugin v1.1.1 (`090726/hil-seo-plugin.zip`)** the same way as before (Plugins → Add New → Upload — replaces v1.1.0, all data/flags preserved, including the 6 modules already ON) — this ships the robots.txt fix. Then cache-bust and confirm robots.txt's `Sitemap:` line reads `/wp-sitemap.xml` with no duplicate. Then: the 301 redirect in the Redirection plugin, GSC resubmission, a full cache-busted verification pass, the LiteSpeed purge, and final Yoast deactivation — all covered by the Administrator screen's on-screen instructions.
2. Finish QA on articles #30–35 and get them scheduled (Cedric).
3. Confirm article #22 indexing status and the 5 new category archives' noindex decision on the next GSC pull — **note**: this audit independently re-verified all 7 (5 flagged + 2 "needs confirmation") archives live on 2026-09-07 and found `noindex, follow` correctly emitting on every one; the open item is GSC catching up, not a live regression.
4. Decide on the #27 Cluster 3 → Cluster 7 reclassification.
5. Hand the finalized FAQ content (`090626/FAQ_Audit_and_Recommendations.md`) to the Web Work Stream for implementation — see Cross-Workstream Dependencies below for the full package.
6. Run the **October Maintenance (Delta)** — re-baseline read on click share, property-page clicks, and the #1 refresh's 30-day GSC read (~Sep 21 first look).
7. Confirm both 8/16 code-review spec follow-ups stay closed (already verbatim-confirmed 8/31 — no action expected, just a watch item).

## Recently Completed

- 2026-09-07 — Yoast-replacement workstream, all modules live + robots.txt fix: Cedric used the Administrator screen to turn all 6 cutover modules ON (`hil-seo` now renders meta descriptions, SEO titles, canonicals, robots directives, and schema for production; its noindex-exclusion filters are active on core's `/wp-sitemap.xml`). Same day, Cedric found that Yoast's virtual robots.txt (no physical file exists) still advertised its retired `/sitemap_index.xml` — the sitemap module had never touched robots.txt, only core's sitemap query. Fixed in v1.1.1: a `robots_txt` filter rewrites Yoast's existing line in place (never appends — no duplicate-line path exists) and auto-reverts if the module is turned off or rolled back. Yoast stays active throughout. v1.1.1 packaged, pending Cedric's re-upload.
- 2026-09-07 — Yoast-replacement workstream, Administrator cutover screen built: added an Administrator-only "HIL SEO" admin page to the plugin (v1.1.0) — per-module state/prerequisites/last-changed/verification-guidance, confirmation-gated toggles, an Emergency Rollback control, and written instructions for the LiteSpeed purge and final Yoast deactivation. Replaces the raw-curl-command approach from earlier the same day. Menu registered at `manage_options` — confirmed invisible to the Editor-role Analyst account by construction. No cutover flag touched while building this (verified before and after). Packaged as `090726/hil-seo-plugin.zip` for Cedric's usual manual-upload process.
- 2026-09-07 — Yoast-replacement workstream, executed through Stage 6: Cedric promoted the Analyst's account to Editor and manually installed/activated the plugin — both confirmed live. The Analyst then executed and verified: the full 34-post metadata backfill (zero mismatches on read-after-write; caught and fixed a placeholder-text bug in the backfill workbook before import), the 18-post author reassignment (SEO-DEC-021, before/after diff confirmed URLs/dates/status/content byte-identical), and a full parity check (title/canonical/robots exact match for all 34 posts; meta description matches 17 + 3 approved rewrites, 14 explained by the plugin's proven length-trim behavior). Nothing public-facing has changed — Yoast still renders live output. Blocked on SEO-DEC-025: the plugin's cutover flags require Administrator, confirmed via a live 403 on the Analyst's Editor credential.
- 2026-09-07 — Yoast-replacement workstream, ownership reclassified and plugin built: Cedric instructed the SEO Analyst to own the complete implementation directly (SEO-DEC-024) rather than hand off to a Web Work Stream. The Analyst built the full `hil-seo` plugin (all output gated OFF by default — safe to install alongside Yoast with zero live change), took the full pre-migration backup (Yoast state for all 34 posts, categories, tags, both author archives, robots.txt, sitemap — `090726/yoast-pre-migration-backup/`), and corrected every project document's framing. `HIL_Custom_SEO_Plugin_Web_Handoff.md` retired in favor of `HIL_SEO_Implementation_Plan.md`. Two WordPress-imposed actions remain for Cedric personally (role promotion; plugin file installation) before the Analyst continues — not a further approval gate, just two mechanical facts about how WordPress permissions work.
- 2026-09-07 — Yoast-replacement workstream, decisions approved: Cedric approved all 5 decisions from the 2026-09-07 audit package (SEO-DEC-019 through SEO-DEC-023) — Editor-role upgrade, core sitemap ownership with Yoast-sitemap redirect handling, 18-article author reassignment (URLs/dates/content preserved), final "1 hour from Manila" replacement wording ("a comfortable drive from Manila"), and the Keyword Master sync. The Keyword Master sync was executed same-day (rows 77/78/81 updated: Article #30 = senior-friendly, #36 = batangas road trip, #37 = summer in Lipa — also resolves why 34 live posts exist against #1–35 numbering: #6 was consolidated into `/staycation`, SEO-DEC-007).
- 2026-09-07 — Yoast-replacement workstream, initial audit: current-state audit (live-verified, not spec-only), custom-plugin functional spec, draft-posting workflow contract, migration/rollback plan, and a 34-post metadata backfill + QA delivered to `090726/`. Key findings: the SEO Analyst's WP account is Author role, not the documented Editor role, blocking edits to 18 of 27 published posts; a live LiteSpeed cache-staleness bug (confirmed reproducible) was serving a 3-week-stale page title independent of Yoast.
- 2026-09-06 — FAQ approval stage closed. SEO-DEC-013 through SEO-DEC-018 recorded (B34/B38 check-in times, ₱200/hr early/late fee, 1-Bedroom capacity corrected to 5, "Credit/Debit Card" guest-facing terminology, no public deposit/ID questions, Quick Reply boundary formalized, free-rebooking offer removed rather than republished). No SEO-side FAQ decisions remain pending. `090626/FAQ_Audit_and_Recommendations.md` is the finalized implementation package, ready for Web Work Stream handoff.
- 2026-08-31 — Page Indexing Tracker synced against a fresh 44-URL GSC pull; 9 pages flipped to confirmed Indexed, 3 noindexed archives confirmed dropped.
- 2026-08-31 — Article #6 → `/staycation` repoint executed (31 posts, 36 links, 0 remaining); developer clear to add the 301.
- 2026-08-31 — Articles #31–35 drafted and pushed to WordPress as drafts; Cluster KPIs formula gap found and fixed in the SEO Tracker.
- 2026-08-31 — Booking uptick recorded (6 total, up from 2 as of 8/14); Stay Match verified live on article #27 ahead of its hard deadline.
- 2026-08-17 — Direct WordPress editing rolled out; all 6 Maculot-closure articles remediated and verified live.

## Product Owner Watch Items

- Confirm GA4 events in DebugView; mark `booking_confirmed` + `generate_lead` as key events; flip Developer-Traffic filter Active.
- Pull GBP numbers for August (KPI Dashboard G16–G19 still blank).
- Supply actual bookings split for May/Jun/Jul (KPI Organic Conversions row blank — "2 bookings" is ambiguous between total and per-month).
- Remove the redundant `www.haveninlipa.com/sitemap.xml` GSC submission.
- Verify GA4 is actually collecting on the apex domain (only ever confirmed on `dev.`).

## Cross-Workstream Dependencies

- **Website/Application (developer-owned, see HIL_DECISIONS.md / HIL_PROJECT_STATUS.md at product level):** the `#6 → /staycation` 301 (mechanical pattern per HIL DEC-010); Stay Match engine internals and confidence-gating logic (HIL DEC-004/DEC-011); `/api/properties.json` feed maintenance; two 8/16 code-review spec corrections (confirmed fixed 8/31, no action expected).
- **Custom SEO plugin implementation (SEO Analyst-owned directly, per SEO-DEC-024 — not a Web Work Stream item):** all 6 modules live via the Administrator screen; backfill and author reassignment complete and verified. v1.1.1 (robots.txt fix) packaged, pending Cedric's re-upload. Remaining: verify the fix, the 301 redirect + GSC resubmission, a full cache-busted verification pass, the LiteSpeed purge, and final Yoast deactivation — on-screen instructions in **WP Admin → HIL SEO** cover the latter two.
- **Web Work Stream (pending handoff — approved implementation package is `090626/FAQ_Audit_and_Recommendations.md`, in full):** correct `/terms` §5's blanket 2:00 PM check-in to reflect B34 (2:00 PM) vs. B38 (3:00 PM) and add the ₱200/hr early-check-in/late-checkout policy (SEO-DEC-013), considering wiring the fee into the `AdditionalCharge` flow; update `src/lib/faqs.ts` to remove guest-facing "Stripe" references (SEO-DEC-015) and correct the 1-Bedroom capacity to 5 (SEO-DEC-014); **remove the "free rebooking 14+ days out" offer from `src/lib/faqs.ts` (cancellation-policy item) and from `src/lib/chat/chat-tree.ts` (`booking-cancel` node) without adding replacement language promising case-by-case rebooking (SEO-DEC-018)**; add B38/Mickey content to the public FAQ; optionally add H2 category headers and convert `/faq` to an accordion (Section 8 recommendations, not blocking).
- **Owner/manual (Cedric):** scheduling/publishing all new-article drafts (SEO Analyst never publishes, see SEO-DEC-010); GBP data pulls; GA4 console confirmations above; Melody fact-checks (accessibility for #30; the "1 hour from Manila" wording itself is resolved by SEO-DEC-023's non-numeric replacement and is now live — the meta module has been turned on); uploading plugin v1.1.1 (robots.txt fix) and completing the remaining post-cutover steps via **WP Admin → HIL SEO**'s on-screen instructions.

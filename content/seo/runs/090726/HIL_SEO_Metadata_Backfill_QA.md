# Haven in Lipa — SEO Metadata Backfill: QA Findings

Date: 2026-09-07
Companion to `HIL_SEO_Metadata_Backfill.xlsx`. This document explains what the backfill pass found, what it could and couldn't resolve, and what needs an owner decision before import (Migration Plan Stage 3).

---

## 1. Coverage

**34 WordPress posts discovered** — every published, scheduled, draft, and pending post found in WordPress at time of audit (2026-09-07), not just the 29 the brief's framing assumed:

- 27 published (article numbers #1, #3–16, #19–27, plus #17/#18 (barako coffee, best lomi) and #36 (batangas road trip), the latter newly numbered per §3)
- 7 scheduled (`future` status): #30–35 plus #37 (summer in Lipa), per §3
- 0 true drafts

Three article numbers referenced elsewhere in project documentation (#2, #28, #29) were not found under those numbers in the Keyword Master's Article column and could not be confidently mapped to a specific WordPress post during this pass. Per Cedric's confirmation (2026-09-07), these do exist as live content — the gap is a Keyword Master data-entry omission for those specific numbers, not missing articles. See the reconciliation below, and §3 for the sync work now completed.

### Why 34 live posts exist when article numbering reaches #35

Article numbers have been assigned #1 through #35 over the life of this project — 35 numbers. Only 34 correspond to a live, standalone WordPress post today, and the reconciliation is exact: **Article #6 was consolidated into `/staycation` and 301-redirected** (SEO-DEC-007, executed 2026-08-31) — its content no longer exists as its own post, and its number was retired rather than reused. 35 assigned numbers minus 1 retired-by-consolidation = 34, matching precisely the 34 live posts (27 published + 7 scheduled) this audit found in WordPress. Numbers #2, #28, and #29 are among those 34 — they simply weren't recoverable by number from the Keyword Master's Article column during this pass; the specific slug for each is a remaining, low-priority Keyword Master data-entry item (§3), not an open question about whether the content exists.

---

## 2. The finding that changes the shape of this whole backfill: author-attribution split

**18 of 27 published posts (67%) are attributed to "Cassandra Kim," a legacy WordPress user — not "Haven,"** the approved editorial persona. This was found by comparing the public (unauthenticated) REST post listing against the authenticated `context=edit` listing the SEO Analyst's tooling actually uses: the public listing shows all 27 posts across two author IDs; the authenticated listing returns only the 9 attributed to "Haven" (WP user id 3).

This is not simply a byline-cleanup item. It has a direct, mechanical consequence: **the current REST credential cannot read-in-edit-context or write to those 18 posts at all**, because the account authenticates with WordPress **Author** role (confirmed via `whoami()`), not the **Editor** role `README_wordpress_access.md` documents. Author role lacks `edit_others_posts`. This means:

- The backfill workbook's "Existing" columns for those 18 rows are populated correctly (read from the *public* REST endpoint, which isn't capability-filtered) — the data in the spreadsheet is real and accurate.
- But none of those 18 rows' metadata can actually be *corrected* via the SEO Analyst's normal tooling until the account's role is actually upgraded on the live WordPress site.
- **Approved 2026-09-07** — Cedric approved both the Editor-role upgrade (SEO-DEC-019) and reassigning all 18 posts to Haven, preserving URLs/dates/content (SEO-DEC-021). **Neither has been executed.** The SEO Analyst executes the reassignment directly via REST once the role upgrade is live — but the role upgrade itself is a WordPress-imposed exception: only an existing Administrator can promote another account's role, so that one step is Cedric's alone to perform (see `HIL_SEO_Implementation_Plan.md` §3). Everything else in this backfill remains a planning artifact until then, not a change log.

**Validation status column key**, as used in the workbook:
- **Verified** — existing metadata read live, checked against the known-issue patterns below, no problem found.
- **Needs correction** — a specific, named defect found (see §4).

---

## 3. Tracker/WordPress sync gaps — found and resolved (SEO-DEC-022, executed 2026-09-07)

Three live WordPress posts existed with no corresponding "Article #" assignment in the Keyword Master, or with a Keyword Master row that still showed their target keyword as an unfulfilled "Gap." **Resolved this session, approved by Cedric**:

| WordPress slug | WP ID | Status | Resolution |
|---|---|---|---|
| `senior-friendly-staycation-guide-lipa` | 763 | Scheduled, Sep 21 | Assigned **Article #30** — matches how it was already referenced by number in `SEO_PROJECT_STATUS.md` prose; the Keyword Master row (row 77... see below) had simply never been updated to match. Row updated: target URL, confirmed live slug, status. |
| `batangas-road-trip-itinerary-lipa-base` | 575 | **Already published** | Assigned **Article #36** (newly assigned — next available after #35; this article predates having been tracked, it wasn't drafted after #35). Row updated: target URL, confirmed live slug, status. |
| `summer-in-lipa-cool-highland-escape` | 590 | Scheduled, Sep 14 | Assigned **Article #37** (same rationale as #36). Row updated: target URL, confirmed live slug, status. |

Keyword Master rows 77, 78, and 81 were edited in place (workbook patched, not regenerated — a fresh backup was saved as `HavenInLipa_SEO_Tracker.pre-090726sync.backup.xlsx` before editing). `HIL_SEO_Metadata_Backfill.xlsx` was updated to match the same three article numbers so the two artifacts agree. This was a local-tracker edit, not a production change, so it was executed immediately rather than queued behind any further approval.

Separately, still unresolved (low priority, not blocking): **Article #17's Confirmed Live Slug was never recorded** in the Keyword Master at all (the column is blank for all three of its keyword rows) — the live slug (`lipa-barako-coffee-heritage`) was recovered by direct WordPress lookup for this backfill, not from the tracker, but the tracker row itself wasn't corrected as part of this pass.

---

## 4. Specific metadata defects found, and final wording approved (SEO-DEC-023)

**"1 hour from Manila" wording** — found live, verbatim, in the meta description of 3 posts:

| Article | WP ID | Live meta description (excerpt) | Approved replacement |
|---|---|---|---|
| #8 — Holy Week retreat | 73 | "...Just 1 hour from Manila." | "...no beach crowds — a comfortable drive from Manila." |
| #11 — Family staycation | 268 | "...where to stay just 1 hour from Manila." | "...where to stay, a comfortable drive from Manila." |
| #12 — Romantic getaway | 272 | "...a couple-fit rental — 1 hour from Manila." | "...a couple-fit rental, a comfortable drive from Manila." |

This is the exact "unsupported flexibility" pattern the brief names, and it's already a known, open item in `SEO_PROJECT_STATUS.md`'s Cross-Workstream Dependencies. **Cedric approved removing the specific numeric claim entirely** (rather than substituting an equally-unverified replacement figure) in favor of durable, non-numeric wording, until an actual drive time is independently verified (Melody fact-check tier, per the Fact-Checking Guide's tiering — a specific, checkable claim, not a generic one). Final copy is recorded in the backfill workbook (`Validation Status: Approved — pending live application`) and in SEO-DEC-023. **Not yet applied to production** — 2 of these 3 posts (#8 and #12, WP ids 73 and 272) are also among the 18 Cassandra-Kim-authored posts, so they're additionally gated on SEO-DEC-019/021 (the role upgrade and reassignment) before the SEO Analyst can even reach them via REST. All 3 are further gated on Yoast's own REST limitation, independent of role: `_yoast_wpseo_metadesc` is not currently exposed for writing at all (Current-State Audit §1) — so this rewrite ships through the new plugin's `hil_meta_description` field once cutover reaches the meta module, not as a direct Yoast-field edit.

**No other stale/inaccurate metadata was found** among the 27 published + 7 scheduled posts checked: no canonical mismatches, no accidental noindex on live content, no duplicate title suffixes, no empty/generic meta descriptions. This is a genuinely clean result for everything except the two items above — worth stating plainly so the backfill isn't read as finding more damage than it did.

---

## 5. What was and wasn't finalized in this pass

Per the staged plan (backfill import happens at Migration Plan Stage 3, after the plugin is built, installed, and validated for parity while Yoast stays active), the backfill workbook's "Final (proposed)" columns are one of three states:

- A **direct carry-forward** of the existing value, where it was verified clean (the large majority of rows) — nothing to decide.
- **Approved final copy**, for the 3 "1 hour from Manila" rows (§4) — Cedric reviewed and approved specific replacement wording this session, so those cells now hold real, final text rather than a placeholder flag.
- An explicit **`NEEDS REVIEW`** flag with a reason in Notes, for anything still open (author attribution on the 18 legacy-authored rows is tracked separately via the Current Author/Approved Author columns, not as a metadata-content flag, since it's a permissions/reassignment question rather than a copywriting one).

Nothing in the workbook has been applied to production regardless of its state — "approved" and "applied" remain two different things until the plugin is live enough to carry the field, per the staged sequencing in `HIL_SEO_Implementation_Plan.md`.

---

## 6. Primary-category and other minor items flagged, not resolved

- Yoast's "primary category" feature does not appear to be actively configured (breadcrumb schema on the one sample checked used the first assigned category by default) — worth a one-line confirmation from Cedric during owner review, not worth building a dedicated field for speculatively (see Requirements doc §1).
- Category names carry HTML-entity-escaped ampersands in the REST response (`Travel &amp; Itineraries`) — cosmetic, decode-on-output only, not a data problem; noted so nobody mistakes it for a data-quality defect when reading the raw workbook.

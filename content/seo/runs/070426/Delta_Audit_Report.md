# SEO Delta Audit Report — HavenInLipa

**Mode:** Maintenance (Delta)
**Run date:** 2026-07-04 (folder `070426/`)
**Baseline:** last delta run 2026-06-18 (`061826/`) + tracker state as of 2026-07-04
**Scope:** live re-crawl (sitemaps, key pages, schema, robots/indexing signals), diffed against baseline. **Competitor re-analysis skipped** — local moat unchanged, baseline < 90 days old (per Mode 3 default).
**Continuity:** read `HavenInLipa_SEO_Tracker.xlsx` first; kept the 6-cluster framework; **no net-new strategy proposed.**

---

## Summary

Quiet, healthy delta. One new article went live on schedule (**#18 Best Lomi**, with a slug drift to fix). The main site was **redeployed 2026-07-02** and all schema/content survived intact (verified — no regressions). Two previously-pending fixes are now **confirmed live** (archive `noindex`). One **new technical issue** surfaced: the Mickey `/book` form endpoints canonicalize to the homepage and are being indexed — recommend `noindex`. This cleanly resolves the standing "decide on /book" open item.

---

## 1. Content deltas (new / changed / removed pages)

| # | Change | Detail | Status |
|---|--------|--------|--------|
| **#18 Best Lomi** | **NEW — now LIVE** | Published Mon Jun 29 as scheduled. HTTP 200, `index,follow`, `Article` + `WebPage` JSON-LD, ~2,600 words, has property + Book-Direct internal links (linking floor met). | 🟢 New delta — **tracker says "Page Not Published"** → needs flip |
| **#18 slug drift** | Planned `best-lomi-lipa-city-local-guide` → **live `best-lomi-lipa-city`** | Same drift pattern seen on #17 (Yoast shortened the slug). | 🟠 Tracker URL + Keyword Master URL need sync |
| #19 Work From Lipa (rainy season) | Planned `work-from-lipa-rainy-season-july` → **404 / `noindex`** | **Expected** — scheduled Mon Jul 6; not yet due. This is the very next publish. | ✅ On schedule (no action) |

**Sitemap integrity:** blog `post-sitemap.xml` = 17 articles + blog home; main `sitemap.xml` = 10 URLs (homepage, 2 original + 3 Mickey property pages, faq/about/privacy/terms). No orphaned or removed pages. Category sitemap = 7 categories. Clean.

## 2. Fixes that HELD (re-verification — audit trail)

| Check | Result |
|-------|--------|
| Property schema (both original + all 3 Mickey pages) | ✅ `VacationRental` + `Accommodation` + `FAQPage` intact — **survived the 2026-07-02 main-site redeploy** |
| `/faq` schema | ✅ `FAQPage` + `LocalBusiness` intact post-redeploy |
| Occupancy convention on-page | ✅ sleeps-7 shows ₱2,400, "covers 5 / sleeps up to 7" — matches recorded convention |
| Mickey launch post `/mickey-in-lipa-coming-soon/` | ✅ 200, `index,follow`, self-canonical, `Article` schema — still the launch hub |

> **Why this matters:** the 2026-07-02 redeploy re-stamped homepage/faq/about/privacy/terms. A redeploy is exactly when JSON-LD silently breaks — verified it did not.

## 3. Fix now CONFIRMED LIVE (was pending recrawl)

Archive `noindex,follow` is now present in raw HTML on **all four** archives — set ~Jun 2, but the 2026-07-03 note flagged they were "still indexed, not yet recrawled." The directive is confirmed live; they will drop from the index on next Google crawl:

- `/tag/airbnb/` → `noindex, follow` ✅
- `/tag/batangas/` → `noindex, follow` ✅
- `/tag/barako-coffee/` → `noindex, follow` ✅
- `/author/cassandrakim/` → `noindex, follow` ✅

> **Tracker inconsistency to reconcile:** the Page Indexing Tracker still lists `/tag/barako-coffee/`, `/tag/airbnb/`, and `/author/cassandrakim/` as "Indexed" (only `/tag/batangas/` is marked "noindexed"). All four should read the same: *noindex applied — pending drop.*

## 4. NEW technical finding — `/book` endpoints canonicalize to the homepage — ✅ RESOLVED 2026-07-04

> **RESOLVED same-day.** Cedric's dev applied the full fix; verified live via raw HTML on all three routes:
> - `noindex, follow` meta now present on `sleeps-7/book`, `sleeps-11/book`, `sleeps-15/book` ✅
> - Homepage-canonical bug fixed — each `/book` now **self-canonicalizes** (e.g. `…/sleeps-7/book`) ✅
> - Each `/book` now has a **unique title** ("Book — Mickey in Lipa | … | Sleeps N | Haven in Lipa") instead of the homepage title ✅
>
> GSC recrawl requested for the two previously-indexed endpoints (`sleeps-7/book`, `sleeps-15/book`) so Google sees the `noindex` and drops them. Monitor Coverage over the next 1–2 weeks to confirm they fall out.
>
> _Original finding below, kept as the point-in-time record._

---


The Mickey booking-form routes return 200 but serve the **homepage's** canonical, title, and og:url — SPA app-shell behavior with no per-`/book` server rendering:

```
/properties/…sleeps-7/book   → <link rel="canonical" href="https://haveninlipa.com"/>
/properties/…sleeps-15/book  → <link rel="canonical" href="https://haveninlipa.com"/>
   title: "Haven in Lipa — Short-Term Rentals in Lipa City, Batangas"  (homepage title)
```

- Not disallowed in `robots.txt` (only `/admin/`, `/api/` are).
- GSC has indexed `sleeps-7/book` and `sleeps-15/book` (`sleeps-11/book` not indexed).
- **Problem:** thin booking-form routes, all claiming to *be* the homepage — muddies homepage signal consolidation and clutters the index with near-duplicates.
- **Recommendation (resolves the standing "decide on /book" open item):** `noindex` the `/book` routes — add `<meta name="robots" content="noindex">` to that route's head, or `Disallow: /*/book` in `robots.txt`. Prefer `noindex` (lets Google drop them cleanly; robots-disallow leaves them as "indexed, no content" longer). Give the routes a self-referential canonical or leave them out entirely once noindexed.

## 4b. Carried-forward item RESOLVED — extra-guest-fee now surfaced site-wide (2026-07-04)

The standing "per-extra-guest fee not on property pages" open item (open since the 6/18 launch) was resolved this run. It was never blocked on the host — the fee is DB-driven and already live in the booking calculator. Established the scheme is **site-wide, not Mickey-only**, and had it surfaced on the public site (dev), DB-driven + server-rendered, verified on prod:

| Listing | Rate covers (threshold) | Max | Extra fee | Base rate |
|---|---|---|---|---|
| Cozy 1BR | 3 | 5 | ₱300/guest/night | ₱1,800 *(corrected from ₱2,000 on record)* |
| Spacious 2BR | 7 | 9 | ₱300/guest/night | ₱2,800 |
| Mickey sleeps-7 | 5 | 7 | ₱400/guest/night | ₱2,400 |
| Mickey sleeps-11 | 9 | 11 | ₱400/guest/night | ₱4,200 |
| Mickey sleeps-15 | 13 | 15 | ₱400/guest/night | ₱7,000 |

- **Property pages (all 5):** "covers {threshold} guests — additional guests are ₱{fee}/guest per night" + "no hidden fees". Server-rendered.
- **Homepage cards** (`PropertyCard.tsx`, deploy 57ab099): "Sleeps up to {max}" + conditional "from/starting at ₱{base}/night", gated on `extraGuestFeeApplies` (fee>0 AND max>threshold — same predicate as the property page).
- **Grammar fix:** "are charge" → "are charged" on the 2 originals' house-rules DB text (Mickey listings already correct).
- Optional JSON-LD `priceSpecification` for the additional-guest fee was **not** added (skipped as low-priority).

## 5. Competitor re-analysis — skipped

Per Mode 3 default: local accommodation moat unchanged (no rival runs a content engine), baseline < 90 days. Offer standing if you want a refresh.

---

## Proposed remediation (pending STOP #1 approval)

1. **Flip #18 Best Lomi → Indexed-pending** in Page Indexing Tracker; correct slug to `best-lomi-lipa-city`; sync #18 Target URL in Keyword Master; set action "request indexing in GSC."
2. **Reconcile the 4 archive rows** to "noindex applied — pending drop" (fix verified live).
3. ~~**Annotate the `/book` finding**~~ — ✅ **DONE/RESOLVED 2026-07-04** (dev shipped noindex + self-canonical + unique titles; GSC recrawl requested). Update the 2 indexed `/book` rows to "noindex applied — GSC recrawl requested, pending drop."
4. **Record the 2026-07-02 redeploy + schema re-verification** as a "still holding" audit-trail note.
5. Generate the branded **SEO Delta Audit Report DOCX** (`_Jul4` suffix) after approval, per workflow FINAL STEP.

*No new content or strategy is proposed — this is a delta remediation run.*

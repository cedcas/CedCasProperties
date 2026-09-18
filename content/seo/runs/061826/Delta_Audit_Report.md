# HavenInLipa — Delta Audit Report

**Date:** 2026-06-18
**Mode:** Full Audit & Strategy → **Delta scope** (re-crawl live site, check only what changed since the 2026-05-31 full run + the 6/2–6/3 tracker/report work; competitor re-analysis intentionally skipped per scope decision)
**Inputs:** On file — haveninlipa.com + blog.haveninlipa.com; geo Lipa, Batangas, PH
**Standing rule applied:** Strategy continuity — `HavenInLipa_Keyword_Tracker.xlsx` read first; 6-cluster framework kept; no net-new strategy proposed.

> Legend: **OBSERVATION** = verified from the live site today · **ASSUMPTION** = inferred, needs confirmation · **RECOMMENDATION** = proposed action.

---

## 0. Executive Delta (what changed since 5/31)

The big one: **Mickey in Lipa has launched.** As of 5/31 this was renders-only and explicitly photo-blocked ("do not publish #13 until photo rights confirmed"). Today there are **three live, bookable, fully-schema'd property pages with real photos.** That single change cascades into stale docs, a contradictory teaser article, and newly-deployable Cluster 6 keywords. Separately, the **weekly Monday cadence is running on schedule** (#15 and #16 published on their target Mondays), the **#8 Holy Week article has gone 404**, and the **recurring tracker-slug drift is back** on four articles. All P0 technical remediations from the May run are still holding.

---

## 1. Website Audit Summary (delta)

### A. 🟢 MAJOR — Mickey in Lipa is now LIVE and bookable  *(OBSERVATION)*
Three property pages, all HTTP 200, all with full `VacationRental` + `Offer` + `LocalBusiness` JSON-LD, real photos:

| Config | Live URL slug | Sleeps / Beds | Nightly |
|---|---|---|---|
| Family Staycation | `/properties/mickey-in-lipa--family-staycation--sleeps-7` | 7 / 1BR, 2-floor | ₱2,400 |
| Family House | `/properties/mickey-in-lipa--family-house--sleeps-11` | 11 / 2BR, 2-floor | ₱4,200 |
| Full Family House | `/properties/mickey-in-lipa--full-family-house--sleeps-15` | 15 / 3BR, 2-floor | ₱7,000 |

- sleeps-7 confirmed bookable now (direct booking form, 58 real photos, GCash/BPI/Stripe).
- **⚠️ Config discrepancy:** project docs (PROJECT_STATUS Decisions & Context) record Mickey as **sleeps 5 / 9 / 13**. The live site is **7 / 11 / 15**. *(ASSUMPTION: the live site is correct and the docs are stale — needs confirmation.)*
- The "renders only / pending photo rights" constraint no longer applies. *(RECOMMENDATION: retire that constraint from PROJECT_STATUS once confirmed.)*

### B. 🔴 Content inconsistency — the #13 teaser contradicts the live booking pages  *(OBSERVATION — conversion leak)*
`blog.haveninlipa.com/mickey-in-lipa-coming-soon/` still reads as a pre-launch teaser: *"final fit-out phase… soft launch by early June… join the early-access list… message Melody."* It does **not** link to the three now-live property pages. Readers ready to book are sent to a waitlist instead of a booking page.
- **RECOMMENDATION:** convert the teaser into a launch post — link all three configs, replace the waitlist CTA with the standard book-direct CTA, keep the Disney-decor story.

### C. 🔴 Regression — #8 Holy Week article is now 404  *(OBSERVATION)*
`/holy-week-in-lipa-city-batangas-a-peaceful-retreat-near-manila/` returns **404** today. It was confirmed **Indexed** on 6/2 (GSC crawl May 6) and is still listed as Covered/Indexed in both the Keyword Master (row 14) and Page Indexing Tracker (row 11).
- Impact 1: tracker is now wrong on #8.
- Impact 2: **Article #22 (Carmel, scheduled Jul 27) internally links to #8** — that becomes a broken link on publish. This overtakes the old "decide #8 timing" open item: #8 isn't just un-linked, it's gone.
- *(ASSUMPTION: this was an intentional unpublish/delete, not an accident — needs confirmation.)*
- **RECOMMENDATION:** confirm intent; if gone for good, remove/replace the #22→#8 link before Jul 27 and 301 the dead URL; update both tracker sheets.

### D. 🟠 New technical finding — homepage links to `/properties/1`–`/properties/5`, all 404  *(OBSERVATION → needs verification)*
The homepage raw HTML contains hrefs `/properties/1` … `/properties/5`; all five return 404. The correct slug links (`cozy-1-bedroom`, the three Mickey configs, `spacious-2-bedroom`) are also present and return 200.
- *(ASSUMPTION: likely a client-side ID→slug mapping artifact rather than live broken links — these echo the "placeholder demo listings" seen mid-crawl on 5/31.)*
- **RECOMMENDATION:** verify whether crawlers/users can reach these; if they're real anchors, that's five broken internal links on the top money page — fix or remove.

### E. 🟢 P0 remediations from May — all still holding  *(OBSERVATION)*
- `/faq` → `FAQPage` JSON-LD present.
- All five property pages → `VacationRental` + `Offer` schema present (Mickey configs included).
- `/tag/barako-coffee`, `/tag/batangas`, `/tag/airbnb`, `/author/cassandrakim` → all `noindex, follow`. No regressions.
- Property URLs present in the dynamic `sitemap.xml` (now 10 URLs incl. the 3 Mickey configs).

---

## 2. Publishing Cadence — on schedule  *(OBSERVATION)*

| # | Article | Target Monday | Live? | Live slug |
|---|---|---|---|---|
| #15 | Independence Day Long Weekend | Jun 8 | ✅ live (sitemap lastmod Jun 8) | `independence-day-long-weekend-lipa-2026` |
| #16 | What to Do When It Rains | Jun 15 | ✅ live (lastmod Jun 15) | `indoor-things-to-do-in-lipa-city-when-it-rains` |
| #17 | Lipa Barako Coffee Heritage | Jun 22 | ⏳ next up | (publish Mon) |

Cadence is healthy. #11 and #12 are also now live and in the sitemap — this **resolves the long-standing "live slugs unconfirmed for #11–14" open item.**

---

## 3. Tracker Hygiene — slug drift recurs (the known issue)  *(OBSERVATION)*

Live slug ≠ tracker Target URL on four articles, plus the Mickey property rows point at a URL that doesn't exist:

| # | Tracker Target URL | Actual live slug | Sheets to fix |
|---|---|---|---|
| #11 | `family-staycation-lipa` | `family-staycation-lipa-city-batangas` | Keyword Master r17–20, Page Indexing r20 |
| #12 | `romantic-getaway-batangas` | `romantic-getaway-batangas-lipa-city` | Keyword Master r21–24, Page Indexing r21 |
| #13 | `coming-soon-disney-inspired-family-house-lipa` | `mickey-in-lipa-coming-soon` | Page Indexing r22 |
| #16 | `what-to-do-in-lipa-city-when-it-rains` | `indoor-things-to-do-in-lipa-city-when-it-rains` | Keyword Master r38–40, Page Indexing r35 |
| #13 (property) | `haveninlipa.com/properties/mickey-in-lipa` (404) | the **3** real config URLs | Keyword Master r25–30, Page Indexing r24 |
| #8 | listed Indexed/Covered | **404 (gone)** | Keyword Master r14, Page Indexing r11 |

Also flip to **Indexed/live**: #11, #12, #15, #16 (and Mickey property pages → Indexed once GSC recrawls).

---

## 4. Keyword / Topic Set — continuity reconciliation (FOR APPROVAL)

No net-new strategy. The 6-cluster framework stands. The only material keyword shift is that the **Mickey launch activates the previously-parked Cluster 6 set** plus two Cluster 1 transactional terms — these were already in the tracker, just parked pending the property. They now have three real target URLs:

| Cluster | Keyword (already in tracker) | Was | Now → target |
|---|---|---|---|
| 6 — Branded/Property | mickey in lipa | parked | live → 3 Mickey config pages (+ teaser) |
| 6 — Branded/Property | disney-inspired house lipa | parked | live |
| 6 — Branded/Property | disney themed rental philippines | parked | live |
| 6 — Branded/Property | bella vita lipa rental | parked | live |
| 1 — Short-Term Rentals | full house rental lipa | parked (→#13) | live → sleeps-15 page |
| 1 — Short-Term Rentals | family house rental lipa city | parked (→#13) | live → sleeps-11 page |

**No new keywords proposed.** Everything above already exists in the Keyword Master; this is activation + correct URL assignment, not new strategy.

---

## 5. Recommended Remediation (post-approval work)

1. **Tracker sync** — fix the 6 stale-URL groups in §3; map Cluster 6 / Cluster 1 Mickey keywords to the 3 real config URLs; flip #11/#12/#15/#16 to live; mark #8 as Removed (404). Back up the xlsx first.
2. **#13 teaser → launch post** — link the 3 live configs, swap waitlist CTA for book-direct CTA.
3. **#8 decision** — confirm intent; remove/replace the #22→#8 internal link before Jul 27; 301 the dead URL.
4. **Verify `/properties/1–5`** homepage links (false alarm vs. real broken links).
5. **Doc updates** — correct Mickey config to 7/11/15 in PROJECT_STATUS; retire the "renders-only" constraint.
6. **Confirm Mickey config** (7/11/15 vs documented 5/9/13) with Cedric/Melody.

---

## STOP POINT #1 — Approval Required

This is a delta audit, so the "next phase" is **remediation**, not new SERP/outline work. Do you approve these findings and the continuity keyword reconciliation (§4)? On approval I'll proceed with the §5 remediation (starting with the tracker sync + the #13 launch-post fix). Two items need your input regardless: **(a)** confirm Mickey is sleeps 7/11/15, and **(b)** confirm whether #8 Holy Week was intentionally taken down.

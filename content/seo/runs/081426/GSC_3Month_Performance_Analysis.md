# GSC 3-Month Performance Analysis — May–Jul 2026

**HavenInLipa · Run 081426 · Analyst pass, no approval gate**
**Prepared:** 2026-08-14 · **Baseline for:** the Full Audit & Strategy Run starting 2026-08-15

---

## Scope & method

**Data supplied by Cedric (2026-08-14):** GSC Domain-property exports for three calendar months — May 1–31, Jun 1–30, Jul 1–31 (Chart, Queries, Pages, Countries, Devices, Search appearance tabs each month), plus the Indexing report (Chart + issue breakdown) and PageSpeed Insights for the homepage.

**Reconciliation:** daily Chart sums were cross-checked against **both** the Countries and the Devices tab totals for all three months. All three agree exactly. Monthly figures below are trustworthy.

**Two method caveats that matter for reading everything else:**

1. **Query-level numbers are floors.** GSC anonymizes rare queries, so the Queries export never sums to the property total. July's export holds **115 of 267 clicks (43%)** and 8,764 of 17,218 impressions (51%). Shares and ratios are sound; absolute query counts are minimums.
2. **"Geo-qualified"** is used throughout to mean the query names Lipa, Batangas, or a local landmark (Maculot, Taal, Casa de Segunda, Lomi King…). It separates addressable demand from generic noise.

GA4 was not used: key events were only enabled 2026-08-05→09, so there is no conversion history for this window. Sessions/engagement history does exist and is worth pulling next.

---

## Headline verdict

The content engine works. The strategy behind it does not convert.

| Metric | May | Jun | Jul | 3-month change |
|---|---|---|---|---|
| Impressions | 910 | 4,295 | **17,218** | **×18.9** |
| Clicks | 12 | 80 | **267** | **×22.3** |
| CTR | 1.32% | 1.86% | 1.55% | ↓ from June |
| Average position | 10.2 | 8.4 | **6.7** | ↑ 3.5 places |
| Indexed pages (month-end) | 22 | 35 | 41 | +19 |
| **Bookings** | — | — | — | **~unchanged (~2)** |

Traffic grew 22× and bookings did not move. Three mechanically-linked causes explain it, and they are not the "buried CTA" problem we diagnosed on 2026-07-04.

---

## Corrections to the record

Both are now fixed in `HavenInLipa_SEO_Tracker.xlsx` (backup: `...pre-aug14baseline.backup.xlsx`).

| Item | Was recorded | Actual | Cause |
|---|---|---|---|
| July organic clicks | 244 | **267** | 244 is the **Philippines row**, not the total (244 PH + 23 international) |
| Indexed pages, May/Jun/Jul | 20/25/31, later 23/28/39 | **22 / 35 / 41** | Month-end GSC values. The "31" was the **mid-June** reading (Jun 12–29) — the Jul 3 pull counted rows in a 31-URL export instead of reading the summary |
| July impressions | 15,500 | **17,218** | Calendar-month total per the pull-window rule |
| Non-branded clicks | 0 / 13 / 102 | **12 / 80 / 267** | Old values were sums of the Queries *export*; branded terms drew **zero clicks in all three months**, so non-branded = total |

Note on Cedric's "31K impressions": that is the GSC **rolling 90-day** figure (≈ May 14 → Aug 12 ≈ 30.8K). It is correct — it simply uses a different window than the calendar-month columns above. No conflict.

---

## Finding 1 — The site attracts diners, not guests

July intent mix of attributable clicks:

| Intent | Clicks | Share | Impressions |
|---|---|---|---|
| Food / restaurants | 110 | **95.7%** | 6,756 |
| Travel / logistics | 2 | 1.7% | 707 |
| Things-to-do | 2 | 1.7% | 592 |
| Branded ("haven") | 0 | 0.0% | 55 |
| **Lodging / booking** | **0** | **0.0%** | 15 |

Every lodging-intent query in July — 19 queries, 70 impressions — earned **zero clicks**: `staycation lipa` (pos 20), `airbnb lipa` (21), `airbnb in lipa city` (12), `apartment for rent lipa city` (27), `haven homestay` (20), `short time hotel in lipa city` (42).

Branded demand is effectively nil: 55 impressions, 0 clicks — and most of it isn't even us (`haven subdivision`, `family haven`, `new kingsville haven`).

One URL dominates everything: **`best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide` took 183 of 267 clicks (69%)** and 9,641 of 17,218 impressions (56%).

---

## Finding 2 — The booking surface is shrinking, in share *and* absolute terms

Clicks landing on `haveninlipa.com` — the homepage and property pages, the only URLs that can take a booking:

| | May | Jun | Jul |
|---|---|---|---|
| Main-domain clicks | 9 | 12 | **5** |
| Share of all clicks | **75%** | 15% | **1.9%** |
| Property-page clicks | 0 | 0 | **1** |
| Homepage clicks | 9 | 8 | **4** |

**This is the mechanical answer to flat bookings.** Traffic grew 22× while the pages that convert received *fewer* visitors than in May. July property-page detail: Mickey sleeps-7 got 1 click on 11 impressions; Cozy 1BR 0 on 40; Spacious 2BR 0 on 17 (and slipped from position 11.13 to 16.65); Mickey 11 and 15 got 0 each.

The July 4 conversion fixes (reviews, CTAs, booking friction) were worth shipping — but they optimize a surface that search barely reaches.

---

## Finding 3 — Impressions have become a vanity metric

CTR **fell** (1.86% → 1.55%) while average position **improved** (8.4 → 6.7). The reason:

| July queries | Impressions | Clicks | CTR |
|---|---|---|---|
| Geo-qualified | 4,914 | 111 | **2.26%** |
| Generic (`best restaurants near me`, `wo essen gehen`, `restaurantes perto de mim`) | 3,850 | 4 | **0.10%** |

A **23× CTR gap**. The food guide now surfaces at positions 3–6 for national and foreign-language "near me" queries in map-pack SERPs it cannot win — 5,924 impressions burned on zero-click queries. Biggest single sink: `best restaurants near me`, 567 impressions, position 6.17, **0 clicks**.

As the guide ranks harder, total impressions will keep inflating while nothing improves. **A "Geo-qualified Impressions" row is now in the tracker; treat it as the real reach number.**

---

## Finding 4 — Google is refusing the content

Not-indexed pages, current breakdown (39 total, as of Aug 6):

| Reason | Pages | Read |
|---|---|---|
| **Crawled – currently not indexed** | **18** | Google crawled and *declined to index* |
| Excluded by `noindex` | 14 | Intentional — the archive cleanup |
| Discovered – not indexed | 4 | Crawl queue; validation Passed |
| Page with redirect | 2 | Benign (www → non-www) |
| **Redirect error** | **1** | Real fault; validation "Started" |

**18 refused against 41 indexed.** And the July trajectory is the alarming part: **indexed +6, not-indexed +15** — rejection outpacing acceptance 2.5:1, in the same month impressions quadrupled.

That quadrupling came from *one existing page* ranking harder, not from new pages earning reach. So the discovery-content engine is hitting a ceiling from two directions at once: Google declines roughly a third of what it produces, and what does rank brings readers with no booking intent.

The May → June improvement (71 → 23 not-indexed) confirms the noindex cleanup worked. The July climb back to 38 is new debt.

---

## Finding 5 — Cluster verdict: the revenue clusters are at zero

July clicks attributed by page → cluster:

| Cluster | July clicks | Share | Read |
|---|---|---|---|
| C2 — Things to Do in Lipa | 237 | **88.8%** | Carries the whole site (restaurants, lomi, Maculot, Taal, rainy-day) |
| C4 — Travel Planning & Logistics | 12 | 4.5% | `how-to-get-to-lipa`: 1,872 impressions, 0.64% CTR — big reach, poor capture |
| C3 — Weekend Getaway / Audience | 10 | 3.7% | Romantic 6, family-weekend 2, family-staycation 1 |
| Main site (home/about/faq) | 4 | 1.5% | |
| C5 — Direct Booking & Value | 3 | 1.1% | All 3 from `lipa-vs-tagaytay`; `why-book-direct` got **0** |
| C6 — Branded / Property | 1 | 0.4% | |
| C1 — Short-Term Rentals | **0** | 0.0% | The 1BR and 2BR property pages |

**Cluster 5 was built on keywords with no demand in this market.** `why-book-direct-instead-of-airbnb` went 8 → 66 → **17** impressions and 1 → 0 → **0** clicks. Its position is fine (6.65); there is simply nothing to rank for. `direct booking vs airbnb` drew **1 impression in three months**, and the whole `airbnb lipa*` family totals ~5–8/month.

That verdict includes the 2026-07-02 Primary flip to `airbnb alternative lipa`. It was a defensible call at the time — the data to contradict it didn't exist yet. It does now.

---

## Finding 6 — The market's word is "staycation"

Real lodging demand, thin but non-zero, and all of it sitting at positions 9–20 where a modest push reaches page 1:

`staycation in lipa` (9.5) · `work staycation` (10) · `kid friendly staycation near me` (10) · `work from home staycation` (5 — **this converted a click in June at position 9**) · `staycation lipa` (20) · `staycation in lipa batangas` (Jun, 16) · `lipa staycation` (Jun, 17) · `apartment for rent lipa city` (27) · `house rental` (Jun, 7) · `vacation home rental agency` (2)

**Implication for the requested "best Airbnb alternative in Lipa" page:** build it, but lead the title with staycation language and **consolidate existing article #6 into it** rather than running two pages at the same rate-shopper. #6 already owns the Airbnb-alternative angle and is dying; a second page would cannibalize it.

---

## Finding 7 — Weddings and events: unserved commercial intent

| Query | Jun | Jul | Position |
|---|---|---|---|
| `wedding destination in lipa` | 13 impr | 25 impr | **22.12** |
| `intimate wedding venue lipa` | 5 impr | 4 impr | **30.5** |

**No content exists for either.** Demand is present in both months, the site ranks only incidentally, and there is a sleeps-15 full family house to sell against it. This is the strongest net-new content case in the dataset.

---

## Striking distance — 56 geo-qualified queries at positions 11–20

Cheapest available wins: these need optimization, not new articles.

| Query | Impressions | Position | Note |
|---|---|---|---|
| `things to do in lipa city` | 96 | **14.84** | **Top prize.** Article #1 is the biggest entry page, stuck on page 2 for its own head term |
| `best lomi in lipa` | 65 | 11.02 | #18 lomi article |
| `things to do in lipa batangas` | 49 | 12.02 | Same #1 |
| `where to go in lipa batangas` | 16 | 11.06 | |
| `places to visit in lipa batangas` | 16 | 12.62 | |
| `locally sourced ingredients restaurant lipa` | 15 | 11.93 | |
| `where to go in lipa with kids` | 18 | 10.78 | **Family intent — close to booking** |
| `lipa restaurants with view` | 7 | 11.57 | |
| `lipa batangas tourist spot` | 7 | 16.71 | |

Geo-qualified ranking counts: **Top 3** 2 → 13 → 31 · **Top 10** 13 → 74 → 199 · **11–20 band** 21 → 17 → 56.

---

## What's working, format-wise

July CTR by page — a clear signal about what to make more of:

| Page | Clicks | Impressions | CTR |
|---|---|---|---|
| `family-weekend-batangas-without-beach-crowds` | 2 | 46 | **4.35%** |
| `lipa-vs-tagaytay` (comparison) | 3 | 74 | **4.05%** |
| `indoor-things-to-do-when-it-rains` (seasonal) | 6 | 203 | **2.96%** |
| Homepage | 4 | 169 | 2.37% |
| `best-restaurants-cafes` (mega-guide) | 183 | 9,641 | 1.90% |
| `how-to-get-to-lipa` | 12 | 1,872 | 0.64% |
| `best-lomi-lipa-city` | 3 | 858 | 0.35% |

**Comparison and seasonal pieces earn clicks at ~2× the mega-guides.** `lipa-vs-tagaytay` is both the highest-CTR blog post and the most commercially shaped one — audience-qualifying content outperforms breadth content on the metric that matters.

**Device shift:** traffic flipped to **82% mobile** (218 vs 44 clicks; mobile CTR 2.04% vs desktop 0.69%) from desktop-dominant in May (9 vs 3). The booking-friction fixes were correctly prioritized — verify them on mobile specifically.

---

## Technical status

**Clean.** PSI: 98 mobile / 100 desktop performance, 100 accessibility, 100 SEO, 92 best practices. No guardrail regression. *Caveat: that is lab data — the KPI row wants GSC Core Web Vitals field data, which may read "insufficient data" at this traffic level.*

Three small items for the developer:

1. **Fix the 1 "Redirect error"** — validation already Started.
2. **Remove the `www.haveninlipa.com/sitemap.xml` submission** — duplicate of the non-www sitemap (both 10 pages). www consolidated on its own: 5 clicks in May → 1 impression in July.
3. **Search Appearance is empty in all three months** — no rich-result type registering at all (no FAQ, breadcrumb, or review stars). Confirms the open Review-schema item; it's unclaimed SERP real estate on a food guide fighting local packs.

Sitemaps otherwise healthy: all 3 Success, blog index 31 pages, last read Aug 12.

**August is still climbing:** Aug 1–6 impressions averaged ~700/day vs July's ~555/day.

---

## Open data gaps

| Gap | Needed for |
|---|---|
| **Actual bookings — May, Jun, Jul** | The `Organic Conversions` row is deliberately blank. "2 bookings" is ambiguous between 2 *total* across 3 months and ~2/*month* — a 3× swing in conversion rate. |
| GA4 landing-page engagement, May–Jul | Whether food-guide traffic reads or bounces instantly. History exists; only key events are new. |
| GSC Core Web Vitals field report | The guardrail row (PSI lab data supplied instead) |
| GBP for August | Four GBP rows are baselined through July |

Also worth noting from the existing GBP data: **website clicks were 1 / 1 / 1 / 0** across Apr–Jul against 238 July profile views. GBP generates visibility and almost no site traffic.

---

## Strategic implications

1. **Stop reporting total impressions as progress.** Use geo-qualified impressions and blog→property click-through.
2. **Rebalance, don't replace.** Keep the discovery content for reach — it's the moat no local competitor has. But stop expecting it to book, and stop adding to the "crawled – not indexed" pile.
3. **Build the high-intent layer on `haveninlipa.com`:** a staycation page (consolidating #6) and a weddings/events page. Judge these on conversion rate, not sessions.
4. **Push `things to do in lipa city` off page 2** before writing article #30. Optimization beats production right now.
5. **The hand-off is the real project** — the Stay Match contextual booking engine, so articles introduce the right property instead of dead-ending. Brief to follow for the developer.
6. **Make more comparison and seasonal content, fewer mega-guides.** The CTR data is unambiguous.

**Next:** Full Audit & Strategy Run, 2026-08-15. This document is its baseline.

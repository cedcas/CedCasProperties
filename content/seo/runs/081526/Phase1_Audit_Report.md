# Phase 1 — Audit, Competitor Analysis & Content Plan

**HavenInLipa · Full Audit & Strategy Run · Run 081526**
**Prepared:** 2026-08-16 · **Baseline:** [081426/GSC_3Month_Performance_Analysis.md](../081426/GSC_3Month_Performance_Analysis.md) (numbers not re-derived)
**Mode:** Full Audit & Strategy Run — Phases 1 → 2 → 3 · **Competitor pass: included** (baseline chain ~90 days)

> Observations, assumptions and recommendations are labelled throughout. Every live figure below was verified by crawl on 2026-08-16.

---

# 1. Website Audit Summary

## 1.1 The structural finding

**Observation.** The main site is **10 URLs**, and that is the entire commercial surface:

| | Count | URLs |
|---|---|---|
| Money pages | 5 | the property pages |
| Supporting | 3 | `/`, `/about`, `/faq` |
| Legal | 2 | `/privacy`, `/terms` |
| Blog | 23 | separate WordPress, own Yoast sitemap |

**The site has a content engine and a booking engine, and almost nothing between them.** 23 discovery articles feed a funnel whose only entry point is the homepage, which is also the only index of inventory. There is no mid-funnel page — nothing that catches "I want to stay in Lipa" and routes it to the right listing.

That is the same failure the baseline measured from the traffic side: main-domain click share collapsed 75% → 15% → **1.9%**, and property pages took **one click in July**. The audit finds the structural reason: *there is nowhere for lodging intent to land except a homepage that has to do every job at once.*

**Recommendation.** The highest-value work in this run is not another article. It is building the missing middle.

## 1.2 Pages that should exist and return 404

**Observation.** Verified 2026-08-16:

| URL | Status | Consequence |
|---|---|---|
| `/properties` | **404** | No inventory index. `/properties/` 308s here, so the path looks real and isn't |
| `/contact` | **404** | Only `/#contact` exists |
| `/staycation` | 404 | The market's actual search word (baseline Finding 6) |
| `/weddings`, `/events` | 404 | Unserved commercial demand (Finding 7) |

`/properties` and `/contact` were linked from the five biggest blog evergreens until 2026-08-16. Those links are now repointed to homepage anchors, but **the URLs remain dead for everything outside our control** — external links, the GBP profile, old social posts, LLM citations. The Redirection plugin cannot help: it runs on WordPress and never sees requests to `haveninlipa.com`.

## 1.3 The About page under-sells the business by 60%

**Observation.** `/about` is indexed, in the sitemap, and its body copy reads **"Our two properties"** — listing only the Spacious 2BR and Cozy 1BR. The three Mickey in Lipa houses, live since 2026-06-18, appear nowhere in the page's content. They are present only in the site-wide nav.

This is the page that carries `Person` schema for Melody and does the trust work for direct booking. It currently tells both readers and Google that the business has two units when it has five — and omits the **sleeps-15 flagship**, which is the single product the weddings/events and big-group opportunities depend on.

**Recommendation.** Rewrite `/about` to cover all five listings. Cheapest credibility fix in this audit.

## 1.4 What is genuinely healthy

**Observation.** Verified this run — no action needed, recorded so the audit is an honest ledger:

- **Structured data is clean and complete.** `LocalBusiness` site-wide, `FAQPage` on `/faq` (14 Q&A), `Person`+`Place` on `/about`, `VacationRental`+`FAQPage` on every property page. `aggregateRating` now live on all five (32 / 21 / 47 / 23 / 46).
- **`robots.txt` fixed** — `/admin` and `/api` now disallowed as prefixes.
- **Sitemap healthy** — 10 URLs, all 200, all canonical.
- **Performance** — PSI 98 mobile / 100 desktop, 100 SEO, 100 accessibility (lab data).
- **`/api/properties.json` is live** — new since the last audit, and the structural fix for hardcoded prices across 23 articles.
- **Blog remediation closed** — 0 dead links, 0 stale rates, 0 old-slug links, 0 UTM-tagged internal links, 151 correct property links.

**Assumption.** Rich-result "Search Appearance" stays empty because the VacationRental rich result is EAP-gated. This is expected, not a defect, and no amount of schema work changes it.

## 1.5 Content quality and brand voice

**Observation.** Voice is consistent and genuinely differentiated: first-person host perspective, specific and checkable (named restaurants, real peso figures, honest trade-offs), no travel-brochure register. `lipa-vs-tagaytay` openly concedes what Tagaytay does better. That honesty is the brand asset and it correlates with performance — that post is both the highest-CTR article (4.05%) and the most commercially shaped.

**Observation.** The format signal from the baseline is unambiguous — comparison and seasonal pieces earn clicks at roughly **2× the mega-guides** (family-weekend 4.35%, lipa-vs-tagaytay 4.05%, rainy-day 2.96% vs restaurants 1.90%, how-to-get-to-lipa 0.64%).

---

# 2. Competitor Content Insights

## 2.1 The content moat holds — re-verified 2026-08-16

**Observation.**

| Competitor | Product | Content engine |
|---|---|---|
| **JET Hotel** | 52 rooms, 3-star, 5 named function rooms, 2 restaurants | **None.** Rooms / Events / Dining / Promos / Facilities. No blog, guides or articles |
| **Lakeview Resort** | 10 villas, groups to 33, infinity pool, Taal + Maculot views, on-site restaurant | **None.** About / Restaurant / Villas / Directions / Testimonials. No blog |

Neither runs any editorial content. **HavenInLipa is still the only accommodation operator in Lipa publishing consistently** — 23 articles, weekly cadence, 41 indexed pages. That moat is real and it is the reason the discovery engine works at all.

## 2.2 But the competitor set for *lodging* demand was misidentified

**Observation.** This is the most important correction in this audit. On discovery queries HIL competes with local operators and wins. On **lodging** queries it does not compete with them at all — it competes with platforms:

- `staycation lipa`, `airbnb lipa`, `vacation rentals lipa` return **Airbnb, Booking.com, Vrbo, TripAdvisor, Agoda, cozycozy**
- Those platforms list **70+ Lipa properties** between them
- Named local rivals — Casa Rosa Farm Stay, Casa Cecilia, Casa Veritas, Lipa City Villa with Pool, Gillera Staycation — reach the market **through those platforms**, not through their own sites

**This explains the baseline's most puzzling number.** Every lodging query sits at position 9–27 with zero clicks, not because the pages are weak, but because positions 1–8 are OTA category pages with domain authority no independent operator can outrank on a head term.

**Recommendation.** Stop treating "rank for `staycation lipa`" as the objective. The winnable play is the **long tail the OTAs cannot template**: specific occasion, specific group, specific need. An OTA has no page for "where the entourage stays for a Lipa wedding" or "a house for 15 with a Disney-themed room." HIL can own those outright, and they carry far higher booking intent than the head term.

## 2.3 Weddings — the baseline's strongest lead needs re-aiming

**Observation.** The baseline flagged `wedding destination in lipa` (25 impressions, position 22.12) and `intimate wedding venue lipa` (position 30.5) as the best net-new case. The SERP tells a harder story. Competing for those terms are:

- **Dedicated venues** — Villa Marasigan, M Farm Private Villa, Casa Marikit, Palazzo Antonio, Villa Natura Taal, The Farm
- **JET Hotel** — explicitly markets weddings with five function rooms and an events gallery
- **Directories** — Yelp, Brideworthy, Hitchbird
- **Caterer content marketing** — Juan Carlo, Town's Delight

**HavenInLipa is not a wedding venue.** It has no ceremony space, no reception capacity, no catering. A page targeting `wedding venue lipa` would compete against businesses whose entire product is the thing HIL doesn't sell — and would deserve to lose.

**Recommendation — build adjacent, not head-on.** Every one of those weddings needs something none of those competitors sell: **somewhere for the party to sleep.** The entourage, the out-of-town guests, the bridal party getting ready together. That is a house for 11–15 people near the venue — which is exactly HIL's flagship inventory and its worst-performing listing.

Nobody is writing this. The venues won't (they sell the venue), the directories won't (no inventory), and the OTAs can't (no local knowledge of which venue is 10 minutes from what). **It is unserved, HIL has the product, and it converts** — a wedding booking is a multi-night, full-house, high-value reservation, not a one-night couple's stay.

## 2.4 Group accommodation — a real product rival with no visibility

**Observation.** Lakeview Resort hosts groups up to **33 guests** with an infinity pool and Taal views, at roughly $149+/night per villa. For the barkada and big-family segment they are a stronger *product* than HIL's sleeps-15 house.

**But they publish nothing.** They are invisible on every discovery query that leads to a group booking.

**Recommendation.** The group segment is winnable on content alone, and article #27 (barkada, drafted, scheduled 8/31) is already aimed at it. Compete on findability and cost-per-head math, not on amenities — an honest comparison is on-brand and Lakeview cannot answer it.

---

# 3. Content Gaps Identified

Ranked by expected effect on bookings, not traffic.

| # | Gap | Evidence | Type |
|---|---|---|---|
| **G1** | **No mid-funnel lodging page.** Nothing between a blog article and a specific listing | Main-domain click share 75%→1.9%; property pages 1 click in July | Foundational |
| **G2** | **`/properties` doesn't exist.** No inventory index; the URL 404s | Verified 8/16; was linked from the 5 biggest evergreens | Foundational |
| **G3** | **No staycation page.** The market's actual word, all demand at positions 9–20 | Baseline Finding 6 | Quick win |
| **G4** | **No wedding-adjacent accommodation content.** Demand present two months running, zero content | Baseline Finding 7 + §2.3 | Authority + conversion |
| **G5** | **`/about` covers 2 of 5 properties** | Verified 8/16 | Quick win |
| **G6** | **`things to do in lipa city` stuck at 14.84** on the biggest entry page | Baseline striking-distance | Quick win (optimization) |
| **G7** | **18 pages "Crawled – currently not indexed."** July ran indexed +6 vs not-indexed +15 | Baseline Finding 4 | Constraint |
| **G8** | **Cluster 5 targets keywords with no demand** | `why-book-direct`: 17 impressions, 0 clicks | Retire / consolidate |

**G7 is a constraint, not a task, and it governs this plan.** Google is declining roughly a third of what the blog produces. Every additional thin discovery article makes that ratio worse. **This plan therefore adds few new blog posts and concentrates on money pages and optimization** — which is also what the pivot demands.

---

# 4. Topic Clusters

Keeping the tracker's six-cluster framework. Verdicts from July click attribution:

| Cluster | July clicks | Verdict | Action this run |
|---|---|---|---|
| **C1 — Short-Term Rentals** | **0** | The revenue cluster, at zero | 🔴 **Rebuild.** Gets `/properties` + the staycation page |
| **C2 — Things to Do** | 237 (88.8%) | Carries the site; the moat | 🟢 **Freeze and optimize.** No new articles; push #1 off page 2 |
| **C3 — Weekend Getaway / Audience** | 10 (3.7%) | Best CTR of any cluster | 🟠 **Extend selectively** — comparison + occasion formats only |
| **C4 — Travel Planning** | 12 (4.5%) | Big reach, 0.64% CTR | 🟡 **Convert, don't grow.** Reach exists; capture doesn't |
| **C5 — Direct Booking & Value** | 3 (1.1%) | Built on absent demand | 🔴 **Retire.** Consolidate #6 into the staycation page |
| **C6 — Branded / Property** | 1 (0.4%) | Branded demand ≈ nil | ⚪ **Leave.** Not a market to win |
| **C7 — Occasions & Groups** | — | **New** | 🔴 **Create.** Weddings-adjacent, barkada, reunions |

**Recommendation — one new cluster, C7 "Occasions & Groups."** Every existing cluster is organized around *place* (what to do in Lipa). C7 is organized around *occasion* (why you need a whole house). That is the axis on which HIL has product no competitor and no OTA can template, and where a booking is multi-night and full-house.

---

# 5. Priority Content Plan

## Quick wins — low effort, high impact

| | Item | Why now |
|---|---|---|
| **Q1** | **Push `things to do in lipa city` off page 2** | 96 impressions at 14.84 on the biggest entry page. Optimization, not production — the R1 refresh brief is already written |
| **Q2** | **Rewrite `/about` for all 5 properties** | Indexed page under-selling inventory by 60%; omits the flagship |
| **Q3** | **Consolidate #6 into the staycation page** | #6 is dying (0 clicks on 17 impressions). Don't run two pages at the same reader |

## Foundational — must exist

| | Item | Why now |
|---|---|---|
| **F1** | **`/properties` index page** | Fixes a live 404, gives lodging intent somewhere to land, and is the natural target for transactional queries |
| **F2** | **`/staycation` money page** | The market's word; all demand at 9–20 where a modest push reaches page 1 |

## Authority + conversion

| | Item | Why now |
|---|---|---|
| **A1** | **Wedding-adjacent accommodation page** | Unserved demand, two months running, and the only angle where HIL's flagship beats every competitor |
| **A2** | **Stay Match engine** (brief delivered, unblocked) | The systemic fix — every article introduces the right property instead of dead-ending |

## Explicitly NOT doing, and why

- **No new C2 discovery articles.** G7 constraint — Google is already refusing a third of the output.
- **No `wedding venue lipa` page.** §2.3 — HIL isn't a venue and would lose to businesses that are.
- **No new C5 content.** Finding 5 — the demand isn't there.
- **No article #30.** Baseline strategic implication #4: optimization beats production right now.

---

# 🔑 Target Keyword / Topic Set — FOR APPROVAL

Seven primary topics. Every keyword below is drawn from **observed GSC demand** in the May–Jul window, not from a volume tool.

### T1 — Staycation in Lipa 🔴 HIGH · *new money page, consolidates #6*
| Keyword | Observed | Intent |
|---|---|---|
| `staycation in lipa` | pos 9.5 | Commercial |
| `lipa staycation` / `staycation lipa` | pos 17–20 | Commercial |
| `staycation in lipa batangas` | pos 16 | Commercial |
| `kid friendly staycation near me` | pos 10 | Commercial |
| `work from home staycation` | pos 5 — **converted a click in June** | Commercial |
**Target:** new `/staycation` on `haveninlipa.com`. Lead the title with "staycation", never "Airbnb alternative".

### T2 — Property Index / Rentals in Lipa 🔴 HIGH · *new foundational page*
| Keyword | Observed | Intent |
|---|---|---|
| `apartment for rent lipa city` | pos 27 | Transactional |
| `house rental` | pos 7 (Jun) | Transactional |
| `vacation home rental agency` | pos 2 | Transactional |
| `airbnb lipa` / `airbnb in lipa city` | pos 12–21 | Commercial |
**Target:** new `/properties`. **Assumption:** head terms stay OTA-dominated; this page earns its keep as the landing surface and the 404 fix, not as a ranking play.

### T3 — Wedding & Event Accommodation 🔴 HIGH · *new, cluster C7*
| Keyword | Observed | Intent |
|---|---|---|
| `wedding destination in lipa` | 25 impr, pos 22.12 | Commercial |
| `intimate wedding venue lipa` | pos 30.5 | Commercial |
| *where to stay for a wedding in Lipa* | inferred | Commercial |
| *wedding guest accommodation Batangas* | inferred | Commercial |
**Target:** new page on `haveninlipa.com`. **Positioned as accommodation for weddings, not as a venue** (§2.3). **Assumption:** the last two have no GSC history because no content exists to earn impressions — flagged as inferred, not observed.

### T4 — Things to Do in Lipa 🟠 MEDIUM · *optimize existing, no new content*
| Keyword | Observed | Intent |
|---|---|---|
| `things to do in lipa city` | 96 impr, **pos 14.84** | Informational |
| `things to do in lipa batangas` | 49 impr, pos 12.02 | Informational |
| `where to go in lipa batangas` | 16 impr, pos 11.06 | Informational |
| `places to visit in lipa batangas` | 16 impr, pos 12.62 | Informational |
| `lipa batangas tourist spot` | 7 impr, pos 16.71 | Informational |
**Target:** existing article #1 via the R1 refresh. Cheapest available win in the dataset.

### T5 — Family & Kids in Lipa 🟠 MEDIUM · *closest informational intent to a booking*
| Keyword | Observed | Intent |
|---|---|---|
| `where to go in lipa with kids` | 18 impr, pos 10.78 | Informational |
| `kid friendly staycation near me` | pos 10 | Commercial |
**Target:** existing family articles + the Mickey listings. **This is the bridge intent** — family discovery sits one step from a full-house booking, and the Disney-themed houses are the product.

### T6 — Groups, Barkada & Occasions 🟠 MEDIUM · *cluster C7*
| Keyword | Observed | Intent |
|---|---|---|
| *whole house rental for barkada Lipa* | inferred | Commercial |
| *house for 15 guests Batangas* | inferred | Transactional |
| `house rental` | pos 7 (Jun) | Transactional |
**Target:** article #27 (drafted, 8/31) + the sleeps-11/15 listings. Competes with Lakeview, who publish nothing.

### T7 — Comparison & Seasonal 🟡 ONGOING · *the format that works*
| Keyword | Observed | Intent |
|---|---|---|
| `lipa vs tagaytay` | **4.05% CTR** — highest of any post | Commercial |
| seasonal / long-weekend variants | rainy-day 2.96% CTR | Informational |
**Target:** existing #20, #16 and the scheduled queue. **Recommendation:** this format, not mega-guides, is the template for anything new in C3.

---

## Deliberately excluded from the set

| Excluded | Reason |
|---|---|
| `why book direct vs airbnb`, `direct booking vs airbnb` | 1 impression in 3 months. No demand in this market |
| `best restaurants near me` and generic food terms | 5,924 impressions, ~0 clicks. Map-pack SERPs HIL cannot win |
| `wedding venue lipa` (head term) | HIL is not a venue (§2.3) |
| Branded `haven*` terms | 55 impressions, 0 clicks, and most aren't us |

---

## Success metrics — what this run is judged on

Per the standing rule: **bookings, not sessions.**

| Metric | Now | Target |
|---|---|---|
| Main-domain click share | **1.9%** | **10%+** |
| Property-page clicks / month | **1** | **20+** |
| Geo-qualified impressions | 4,914 | up, while total may fall — **acceptable** |
| Crawled-not-indexed | 18 | **flat or down** |
| Total impressions | 17,218 | **explicitly not a target** |

---

# ⛔ STOP POINT #1 — APPROVAL REQUIRED

**Do you approve Steps 1–3 and the target keyword/topic set above?**

I will proceed to SERP analysis and outline creation (Phase 2) after your approval.

**Three decisions worth making explicitly before I go on:**

1. **The wedding re-aim (§2.3).** The baseline called weddings the strongest net-new case; I'm recommending we build for *accommodation-for-weddings* rather than *wedding venue*. This is a change to the 8/14 mandate and it's the biggest judgement call in this report.
2. **Frozen discovery content.** No new C2 articles and no article #30 this cycle, because of the not-indexed constraint. The weekly cadence would carry on only through the already-drafted queue (#26–#29).
3. **Retiring Cluster 5.** Consolidating #6 into the staycation page rather than keeping it live as a separate post.

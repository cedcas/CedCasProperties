# Phase 3 — Results Report

**HavenInLipa · Full Audit & Strategy Run · Run 081526**
**Prepared:** 2026-08-16 · Phase 1 approved 8/16 · Phase 2 approved 8/16

---

## 1. Content pieces generated

Four builds. Three new money pages on `haveninlipa.com` and one optimization of the largest existing asset.

| # | Deliverable | Type | Cluster | File |
|---|---|---|---|---|
| **B1** | `/staycation` | New money page | C1 | [MoneyPage_01_Staycation.md](MoneyPage_01_Staycation.md) |
| **B2** | `/properties` | New money page — **fixes a live 404** | C1 | [MoneyPage_02_Properties_Index.md](MoneyPage_02_Properties_Index.md) |
| **B3** | `/weddings-accommodation` | New money page | **C7 (new)** | [MoneyPage_03_Wedding_Party_Accommodation.md](MoneyPage_03_Wedding_Party_Accommodation.md) |
| **B4** | Article #1 refresh | In-place optimization | C2 | [Article1_Refresh_Brief.md](Article1_Refresh_Brief.md) |

Each carries title tag, meta description, slug, full H1–H3 copy, FAQ block, schema instruction, internal-link map, and developer notes.

**Deliberately zero new blog articles.** Phase 1 constraint G7: 18 pages sit in "Crawled – currently not indexed" and July ran indexed +6 against not-indexed +15. Adding discovery content while Google refuses a third of the output makes the ratio worse. The weekly cadence continues only through the already-drafted queue (#26–#29).

## 2. Target clusters covered

| Cluster | Before | This run |
|---|---|---|
| **C1 — Short-Term Rentals** | **0 clicks.** The revenue cluster, empty | **Rebuilt** — B1 + B2, the first dedicated lodging pages the site has ever had |
| **C2 — Things to Do** | 237 clicks (88.8%), carries the site | **Frozen and sharpened** — B4 only. No new articles |
| **C3 — Weekend Getaway** | 10 clicks, best CTR | Unchanged. Comparison/seasonal template confirmed for future work |
| **C4 — Travel Planning** | 12 clicks, 0.64% CTR | Unchanged this run — capture problem, addressed by Stay Match |
| **C5 — Direct Booking** | 3 clicks, built on absent demand | **Retired.** #6 absorbed into B1 and 301'd |
| **C6 — Branded** | 1 click | Untouched. Not a market to win |
| **C7 — Occasions & Groups** | did not exist | **Created** — B3, plus article #27 (8/31) |

## 3. Internal linking plan

The architecture this run introduces: **blog → money page → listing**, replacing **blog → homepage → listing**.

### New hub-and-spoke

```
                    /properties  ←── the hub
                   ↗      ↑      ↖
          /staycation     │       /weddings-accommodation
                ↑         │              ↑
                │    5 property pages    │
                │                        │
        blog: #9, #11, #20      blog: #27, #14, #11
                     ↖         ↗
                    article #1 (biggest entry page)
```

### Link map

| From | To | Anchor |
|---|---|---|
| `/staycation` | `/properties` | "See all five homes" |
| `/staycation` | `/weddings-accommodation` | "we wrote a separate page for that" |
| `/properties` | `/staycation` | "Planning a staycation?" |
| `/properties` | `/weddings-accommodation` | "A wedding party" |
| `/weddings-accommodation` | `/properties` | "See the houses" |
| Homepage — Our Rentals | `/properties`, `/staycation` | existing CTA slots |
| sleeps-11 / sleeps-15 pages | `/weddings-accommodation` | "Booking for a wedding?" |
| Article #9 `work-from-lipa` | `/staycation` | "work-from-Lipa staycation" *(matches `work from home staycation`, pos 5)* |
| Article #11 `family-staycation` | `/staycation` | "family staycation homes" |
| Article #27 *(8/31)* | `/weddings-accommodation` | "planning around a wedding" |
| Articles #1/#3/#5/#7/#10 | `/properties` | replaces the interim `/#properties` anchor |

### Required redirect

`blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/` → **301** → `haveninlipa.com/staycation`

WordPress-side, via the Redirection plugin. **Repoint in-body links to #6 across the other 22 posts first**, or each becomes an extra hop.

## 4. Suggested next content pieces

Not commissioned — the ordered backlog for the next cycle, gated on the indexing constraint.

| Priority | Piece | Trigger |
|---|---|---|
| 1 | **Reunions & milestone birthdays** page (C7) | After B3 proves the occasion angle. Same product, same argument, different occasion — and gatherings are permitted with notice |
| 2 | **Lipa vs Tagaytay for families** (C3) | Comparison is the highest-CTR format (4.05%); the family cut is untried |
| 3 | **Corporate offsites / team retreats** (C7) | Whole-house + 400 Mbps + kitchen. Weekday occupancy, which is the weak slot |
| 4 | **Senior-friendly + solo travel** (C3) | Outlined 5/31, still valid. **Fact-check 1BR accessibility first** |
| 5 | Resume weekly discovery cadence | **Only once "Crawled – not indexed" is flat or falling** |

⛔ **Do not start any of these until the not-indexed count stops climbing.** That is the governing constraint on this whole plan.

## 5. Strategic next steps

### Sequenced, by dependency

| | Action | Owner | Blocked on |
|---|---|---|---|
| 1 | **Ship B4** — article #1 refresh | Cedric / blogger | Nothing. Highest ROI, zero indexing risk |
| 2 | **Build `/properties`** | Developer | Nothing — feed is live |
| 3 | **Build `/staycation`** + #6 301 | Developer | B2 |
| 4 | **Ship Stay Match** | Developer | Nothing — last prerequisite cleared 8/16 |
| 5 | **Build `/weddings-accommodation`** | Developer | Drive times + hotel-rate figure |
| 6 | **Rewrite `/about`** for all 5 properties | Developer | Nothing |

### Outstanding fact-checks

| Item | Owner | Blocks |
|---|---|---|
| **Drive times** to the named wedding venues + landmarks | Melody / Wilma | B3, and the `/properties` location section |
| **A checkable Lipa mid-range hotel rate** — or approval to keep the comparison qualitative | Cedric | B3's cost section |
| **Solar backup** — what it powers, for how long *(standing item)* | Melody | B1's practical section, and #29 |
| ✅ **Gatherings on-site** | — | **Answered 8/16: permitted with host informed, per house rules** |

### Measurement — what this run is judged on

Per the standing rule: **bookings, not sessions.**

| Metric | Now | Target |
|---|---|---|
| Main-domain click share | **1.9%** | **10%+** |
| Property-page clicks / month | **1** | **20+** |
| `things to do in lipa city` | pos **14.84** | **< 10** |
| Crawled – not indexed | **18** | **flat or falling** |
| Enquiries mentioning a wedding | 0 tracked | **log manually from launch** |
| Total impressions | 17,218 | **explicitly not a target** |

> Total impressions is excluded on purpose. July burned 5,924 impressions on `best restaurants near me`-type queries at ~0% CTR. Reporting that number as progress is what let a 22× traffic increase coexist with flat bookings for three months.

---

## 6. What this run deliberately did not do

Recorded so the reasoning survives into the next audit:

- **No new discovery articles.** Google already refuses a third of the output.
- **No `wedding venue lipa` page.** HIL is not a venue; that SERP belongs to businesses that are.
- **No new Cluster 5 content.** `direct booking vs airbnb` drew 1 impression in three months.
- **No article #30.** Optimization beats production while the biggest entry page sits on page 2 for its own head term.
- **No attempt to outrank OTAs on head lodging terms.** Positions 1–8 for `staycation lipa` are Airbnb, Booking, TripAdvisor and Expedia. The plan targets the qualified long tail instead.

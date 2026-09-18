# Phase 2 — SERP Analysis & Superior Outlines

**HavenInLipa · Full Audit & Strategy Run · Run 081526**
**Prepared:** 2026-08-16 · **Phase 1 approved:** 2026-08-16 (all three judgement calls accepted)
**SERPs sampled:** 2026-08-16

Four builds. Three are new money pages on `haveninlipa.com`; the fourth is an optimization of the biggest entry page. The approved topics T5, T6 and T7 are served by existing and already-drafted content and carry notes at the end rather than full outlines.

---

# BUILD 1 — `/staycation` 🔴 HIGH

## 1. Target keyword / topic
**Primary:** `staycation in lipa` (pos 9.5) · **Supporting:** `lipa staycation` (17), `staycation lipa` (20), `staycation in lipa batangas` (16), `kid friendly staycation near me` (10), `work from home staycation` (5 — converted a click in June)
**Intent:** Commercial · **Consolidates:** article #6 (`why-book-direct-instead-of-airbnb`)

## 2. SERP pattern summary
The head term is **100% platform-owned**. Sampled results: TripAdvisor (×2), Airbnb, Booking.com (×2), Expedia, TikTok. **Not one independent operator site appears.**

Every result is a *category page* — a filtered list of 70+ Lipa properties with price-from badges, star ratings and a sort control. They rank on domain authority and inventory breadth, and no amount of on-page work will displace them.

## 3. Common structures observed
- Templated listing grid — thumbnail, name, star rating, "from $X", one-line descriptor
- Faceted filters (price, guests, amenities) doing the work a human editor would
- Zero editorial judgement. Nothing says *which* property suits *which* trip
- No local knowledge — no drive times, no "the pool is cold in December," no host

## 4. Gaps / opportunities
**The OTAs cannot answer a qualified question.** They sort by price and rating; they never answer "which of these is right for two people who need to work Monday morning" or "which one won't wake the baby."

| Gap | How we win it |
|---|---|
| No editorial matching | Route by **who you are and why you're coming**, not by price |
| No local proof | Named drive times, real brownout behaviour, actual WiFi speeds |
| No host | Melody's `Person` schema and **169** real reviews across 5 listings (32 / 21 / 47 / 23 / 46, verified live 8/16) |
| Fee opacity | We already itemize; OTAs bury 14–20% until checkout |

> ⚠️ **Do not target the head term as the success metric.** Phase 1 §2.2: positions 1–8 are OTA category pages. This page earns its keep on the **qualified long tail** — `kid friendly staycation`, `work from home staycation`, `staycation in lipa batangas` — where intent is specific enough that breadth stops being an advantage.

## 5. Superior outline

**H1:** Staycation in Lipa City: 5 Private Homes, Booked Direct

- **H2 — What a Lipa staycation actually costs** *(gap: OTAs hide this)*
  - H3 — The five homes, side by side *(live table from `/api/properties.json` — never hardcode)*
  - H3 — What "from ₱1,500" includes, and what an extra guest adds
  - H3 — The 14–20% you don't pay booking direct *(← absorbs article #6's core argument)*
- **H2 — Which home fits your trip** *(gap: the editorial matching no OTA does)*
  - H3 — Two of you, one of you working → Cozy 1BR *(`work from home staycation`, pos 5)*
  - H3 — Family with kids → Mickey sleeps-7 *(`kid friendly staycation near me`, pos 10)*
  - H3 — Barkada or extended family → Spacious 2BR, sleeps-11
  - H3 — The whole clan, one roof → sleeps-15
- **H2 — Why Lipa and not Tagaytay** *(differentiator: our highest-CTR angle, 4.05%)*
  - H3 — One hour from Manila, without the weekend queue
  - H3 — Cooler than the lowlands, cheaper than the ridge
- **H2 — What a weekend here actually looks like**
  - H3 — Friday night arrival · H3 — Saturday · H3 — Sunday before checkout
  - *(each links out to the C2 discovery articles — this is the reverse funnel)*
- **H2 — Practical things nobody tells you**
  - H3 — Brownouts and the solar backup *(1BR only — see fact-check note)*
  - H3 — WiFi, verified by speed test
  - H3 — Parking, gate access, and where to buy groceries
- **H2 — Frequently asked questions** *(FAQPage schema)*
- **H2 — Check dates** *(conversion)*

## 6. Notes for content creation
- **Title must lead with "staycation"**, never "Airbnb alternative" — baseline Finding 6.
- **#6 consolidation:** absorb its book-direct argument into the pricing H2, then **301 `/why-book-direct-instead-of-airbnb…` → this page.** Do not leave both live; they target the same rate-shopper and #6 is dying (0 clicks on 17 impressions).
- **Live pricing from the feed.** Three rates changed silently in six weeks; this page must never carry a hardcoded number.
- Emit `FAQPage` schema. It's the one rich result available to this site — `VacationRental` is EAP-gated.
- **Fact-check:** solar backup is Cozy 1BR only. Confirm with Melody what it powers and for how long before publishing.

---

# BUILD 2 — `/properties` 🔴 HIGH · foundational

## 1. Target keyword / topic
**Primary:** `apartment for rent lipa city` (pos 27), `house rental` (pos 7, Jun), `vacation home rental agency` (pos 2) · **Supporting:** `airbnb lipa` (21), `airbnb in lipa city` (12)
**Intent:** Transactional

## 2. SERP pattern summary
Same platform wall as Build 1, plus long-term-rental portals (Lamudi, Property24-type) on the `apartment for rent` variants — a **different intent** (12-month leases), which is why that term sits at 27 and should not be chased.

## 3. Common structures observed
Grid of units · price-from · guest count · thumbnail · filter rail. Purely functional.

## 4. Gaps / opportunities
**This page's primary job is not ranking.** It is:

1. **Fixing a live 404.** `/properties` is dead and `/properties/` 308s into it — a path that looks real and isn't. It was linked from the five biggest evergreens until 8/16, and remains linked from anything outside our control: external sites, the GBP profile, old social posts, LLM citations.
2. **Giving lodging intent somewhere to land** that isn't a homepage doing six jobs.
3. **Being the Stay Match fallback surface** — when confidence is <0.4, the engine falls back to the property ladder. That ladder should point somewhere real.

> **Assumption, stated plainly:** this page will not outrank Airbnb for `airbnb lipa`. It is justified by the 404 fix, the landing surface, and internal-link consolidation — not by a ranking forecast. If it ranks, that's upside.

## 5. Superior outline

**H1:** Our Homes in Lipa City, Batangas

- **H2 — All five homes** *(rendered from `/api/properties.json`)*
  - H3 — one block per listing: name · sleeps · from-price with the feed's `priceFrom` prefix · 2–3 differentiators · "Check availability"
- **H2 — Find the right one**
  - H3 — By group size *(2 · 5 · 7 · 9 · 11 · 15)*
  - H3 — By occasion *(couple's weekend · family · barkada · remote work · **wedding party** → Build 3)*
- **H2 — What every home includes** *(the shared trust layer — WiFi, kitchen, parking, gate, GCash/BPI/card)*
- **H2 — Where they are** *(one map, drive times to SM Lipa, the cathedral, Maculot, Taal)*
- **H2 — Booking direct** *(fees, payment, cancellation — link `/faq`)*
- **H2 — Questions** *(FAQPage schema)*

## 6. Notes for content creation
- **Render from the feed. No hardcoded prices, ever.** `priceFrom` comes from the feed's boolean — never recompute it, or flat-price listings imply an increase that can't happen.
- Handle the short feed: selection is `isActive AND pricePerNight > 0`, so a listing can drop out silently. Never assume five.
- Add to `sitemap.ts` at **priority 0.9** — below the homepage, above `/faq` and `/about`.
- Once live, **repoint the five blog evergreens** from `/#properties` to `/properties`.
- This page is where Stay Match's `<0.4` confidence tier should link.

---

# BUILD 3 — Wedding & event accommodation 🔴 HIGH · new cluster C7

## 1. Target keyword / topic
**Primary:** `wedding destination in lipa` (25 impr, pos 22.12), `intimate wedding venue lipa` (pos 30.5)
**Inferred (no history — no content exists to earn impressions):** *where to stay for a wedding in Lipa* · *wedding guest accommodation Batangas* · *bridal preparation house Lipa*
**Intent:** Commercial · **Positioned as accommodation, not as a venue** (Phase 1 §2.3, approved)

## 2. SERP pattern summary
Four result types, and **none of them answers the accommodation question**:

| Type | Examples | What they sell |
|---|---|---|
| Dedicated venues | Villa Marasigan, M Farm, Casa Marikit, Palazzo Antonio, Villa Natura | Ceremony + reception space |
| Hotels with function rooms | **JET Hotel** (5 named function rooms, events gallery) | Rooms + banquet |
| Directories | Yelp, Brideworthy, Hitchbird | Listings, no inventory |
| Caterer content marketing | Juan Carlo, Town's Delight | Catering, via a venue listicle |

**The decisive finding.** The page ranking for `wedding venue in lipa` — Juan Carlo's guide, ~1,100 words — handles accommodation in a single sentence: *"Lipa's proximity to a variety of hotels and event spaces ensures ample accommodation options."* **It names not one establishment.** The top-ranking content concedes the question and moves on.

## 3. Common structures observed
- ~1,100 words — **a low depth bar**; HIL's articles routinely run 2,000–3,000
- Listicle of 3–7 venues, each a paragraph
- A "factors to consider" block (location, capacity, amenities)
- Heavy CTA to the publisher's own service
- **No FAQ. No pricing tables. No capacity comparison. No accommodation specifics.**

## 4. Gaps / opportunities
Everything ranking sells **rooms** (hotels) or **space** (venues). Nobody sells **a whole house near the venue** — which is what an entourage actually needs:

| Unanswered question | Who could answer it | Who does |
|---|---|---|
| Where do 12 bridesmaids get ready together? | — | **nobody** |
| Where do out-of-town guests stay who don't want 12 hotel rooms? | — | **nobody** |
| What's 10 minutes from Villa Marasigan / Palazzo Antonio? | — | **nobody** |
| What does a whole house cost vs. 8 hotel rooms? | — | **nobody** |

Venues won't write it (they sell the venue), directories can't (no inventory), OTAs can't (no local knowledge of what's near which venue), and caterers demonstrably don't.

**And the commercial case is the strongest in the audit:** a wedding booking is multi-night, full-house, booked months ahead, and frequently repeats across the same family. It is the opposite of a one-night couple's stay — against the listing that currently performs worst.

## 5. Superior outline

**H1:** Where Your Wedding Party Stays in Lipa: Whole Homes for 7–15 Guests

- **H2 — The problem nobody solves for you** *(gap: named explicitly)*
  - H3 — Your venue seats 80 and sleeps nobody
  - H3 — Eight hotel rooms, eight keys, eight breakfasts, nobody together
- **H2 — What a whole house changes**
  - H3 — Everyone under one roof the night before
  - H3 — A real kitchen for the morning-of *(hair, makeup, and food that isn't room service)*
  - H3 — Space for the photographer to actually work
- **H2 — The cost, honestly** *(differentiator: no competitor publishes this)*
  - H3 — Sleeps-15 whole house vs. 8 hotel rooms — the per-head math
  - H3 — Two nights vs. one, and why the night after matters
- **H2 — Our homes for wedding parties** *(live from the feed)*
  - H3 — Sleeps 15 — the full family house
  - H3 — Sleeps 11 — the family house
  - H3 — Sleeps 7 — the smaller entourage, or the couple's own night
- **H2 — Getting to the venues from here** *(gap: the local knowledge nobody else has)*
  - H3 — Drive times to the Lipa venues and the cathedral
  - H3 — Parking, and moving a group of 15 *(assumption: verify each drive time before publishing)*
- **H2 — Booking for a wedding**
  - H3 — How far ahead to book, and holding dates
  - H3 — Payment, deposit, cancellation *(link `/faq`)*
- **H2 — Questions from couples** *(FAQPage schema)*
- **H2 — Check your dates** *(conversion)*

## 6. Notes for content creation
- **Never call the property a venue.** No ceremonies, no receptions, no catering. Overclaiming loses the trust the brand runs on, and invites a comparison against JET Hotel we would lose.
- **Name real venues and real drive times.** That specificity is the moat — and it's exactly what Juan Carlo declined to do.
- ⚠️ **Fact-check before publishing:** every drive time, and whether Melody permits events/gatherings on-site at all. If the answer is "guests only, no functions," say so plainly — it costs nothing and prevents a bad booking.
- Cross-link **from** Build 1 and Build 2 (occasion routing) and **to** the sleeps-11/15 listings.
- Seeds cluster **C7 — Occasions & Groups**, alongside article #27.

---

# BUILD 4 — Article #1 refresh 🟠 MEDIUM · optimization, no new content

## 1. Target keyword / topic
**Primary:** `things to do in lipa city` — 96 impressions, **position 14.84**, 0 clicks
**Supporting:** `things to do in lipa batangas` (49, 12.02), `where to go in lipa batangas` (16, 11.06), `places to visit in lipa batangas` (16, 12.62), `lipa batangas tourist spot` (7, 16.71), `where to go in lipa with kids` (18, 10.78)
**Intent:** Informational · **Target:** existing `15-best-things-to-do-in-lipa-city-batangas-2026-locals-guide`

## 2. SERP pattern summary
High-DA aggregators: TripAdvisor, Traveloka, Yelp, Grab, Expedia, Guide to the Philippines, Batangas Tourism. **Article #1 is the only independent local operator ranking** — a genuinely strong position and the reason this is the cheapest win available.

## 3. Common structures observed
- Numbered listicle, 10–15 entries
- Each entry: name, one paragraph, a photo, sometimes hours/fees
- Aggregators carry review counts and star ratings we cannot match
- **All of them are written by people who have not been there.** Generic descriptors, no drive times, no "go before 9am or you'll queue"

## 4. Gaps / opportunities
It is stuck on page 2 for its own head term while ranking 11–12 for the *longer* variants — a classic relevance-dilution signal: the page serves many intents and is sharpest for none.

| Gap | Fix |
|---|---|
| Head term under-served | Ensure the exact phrase leads H1, title, first 100 words, and one H2 |
| Kids intent unclaimed at pos 10.78 | Add a dedicated "with kids" H2 → routes to the Mickey houses |
| Aggregators lack local proof | Add drive times, best-time-to-go, and current fees |
| Freshness | It's a "2026 guide" — the R1 brief exists and is unapplied |

## 5. Superior outline *(edits to the live post, not a rewrite)*
- Tighten **H1** so `things to do in lipa city` is the exact leading phrase
- New **H2 — Things to do in Lipa City with kids** *(claims pos-10.78 intent; internal-links the Mickey listings)*
- New **H2 — Where to go in Lipa if you only have one day** *(captures the `where to go` variants)*
- Add per-entry **drive time from the city centre** and **best time to go**
- Apply the pre-written **R1 refresh brief** ([050826/R1-things-to-do-lipa-aug2026-refresh-brief.md](../050826/R1-things-to-do-lipa-aug2026-refresh-brief.md))
- Replace the footer ladder with the **Stay Match** component once shipped

## 6. Notes for content creation
- **In-place WordPress edit.** Do not republish at a new slug — it's the biggest entry page and the current URL holds the equity.
- This is the **highest-ROI item in the entire run**: no new page, no indexing risk, and it moves the site's largest traffic source from page 2 to page 1.
- Re-request indexing in GSC after the edit.

---

# Topics served without new outlines

| Topic | Served by | Action |
|---|---|---|
| **T5 — Family & kids** | Existing family articles + Mickey listings | New "with kids" H2 in Build 4; Build 1's family routing block |
| **T6 — Groups & barkada** | Article **#27** (drafted, scheduled 8/31) | Publish as scheduled. Competes with Lakeview, who publish nothing |
| **T7 — Comparison & seasonal** | #20 `lipa-vs-tagaytay`, #16 rainy-day, scheduled #28/#29 | No new work. This is the **template** for future C3 content — 2× the CTR of mega-guides |

---

# Sequencing

Ordered by dependency and payback, not by size.

| | Build | Depends on |
|---|---|---|
| 1 | **Build 4 — #1 refresh** | Nothing. Ship first: highest ROI, zero indexing risk |
| 2 | **Build 2 — `/properties`** | The feed (live). Unblocks the other pages' occasion routing |
| 3 | **Build 1 — `/staycation`** | Build 2 · #6 301 redirect |
| 4 | **Build 3 — weddings** | Build 2 · Melody's fact-check on events + drive times |

**Running underneath all four:** the Stay Match engine ([Stay_Match_Engine_ClaudeCode.md](Stay_Match_Engine_ClaudeCode.md)) — unblocked, its last prerequisite cleared 8/16.

**Guardrail (Phase 1 G7):** three new indexed URLs against 18 already refused. Request indexing individually, watch the not-indexed count, and **do not add discovery content while it climbs.**

---

# ⛔ STOP POINT #2 — APPROVAL REQUIRED

**Do you approve the outlines?**
I will proceed to content generation and reporting (Phase 3) after your approval.

**Two things to confirm before I draft:**

1. **The #6 → `/staycation` 301.** Build 1 absorbs article #6 and redirects it. That retires a live post permanently — worth an explicit yes.
2. **Melody's fact-check for Build 3.** I need to know whether gatherings/events are permitted on-site at all, and I'll need real drive times to the named venues. **I can draft Builds 1, 2 and 4 immediately and hold Build 3's draft** until that comes back — or draft it with the claims flagged for verification. Your call.

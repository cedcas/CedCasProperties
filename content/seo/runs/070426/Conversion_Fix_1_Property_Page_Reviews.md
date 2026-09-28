# Conversion Fix #1 — Reviews on Property Pages
**HavenInLipa · Delta run 070426 · Priority: 🔴 HIGHEST (do this first)**

## The problem (found on the live site, 2026-07-04)
Your homepage advertises **"5.0 Avg Rating · 280+ Happy Guests · 180+ Five-Star Reviews · 3-yr Superhost."** But every individual **property page** — including the new Mickey pages — has a **"What guests say" heading with no reviews under it.** Social proof is loudest on the homepage and **absent at the exact moment someone decides to book.** This is the single highest-leverage conversion fix you have.

## The fix
Populate the "What guests say" section on **every** property page with **3–6 real guest reviews**, plus an aggregate rating line — and add review **schema** so stars can show in Google results (which also lifts CTR, a tracked KPI).

### Where to source the reviews (you already have 180+)
1. **Airbnb** — copy your existing reviews (you're a 3-yr Superhost; these are your strongest assets).
2. **Google Business Profile** reviews.
3. Past direct-guest messages/thank-yous (with permission to quote).

### Format for each review
> ★★★★★ **"Quote — 1–3 sentences, specific and real."**
> — *Guest first name + initial, Month YYYY · [trip type: family / couple / barkada]*

Keep them honest and specific (mention the solar backup, the cleanliness, Melody's fast replies, the value vs Airbnb) — matches your parent-to-parent voice. Avoid generic "great place!" filler.

### Placement on the page
- **Aggregate line** ("★ 5.0 · based on 180+ stays") **directly above the booking card** — first thing a hesitating booker sees.
- **3–6 individual reviews** in the "What guests say" section.
- **1 short pull-quote mid-page**, right after the photos.

### Match reviews to the property (trip-type mapping)
| Property | Feature reviews from… |
|---|---|
| Mickey — full family house (sleeps-15) | large groups, barkada, extended family, events |
| Mickey — family house (sleeps-11) | families, reunions |
| Mickey — family staycation (sleeps-7) | families with kids (the Disney angle sells itself — quote kids' reactions) |
| Cozy 1BR | couples, solo, work-from-Lipa |
| Spacious 2BR | small families, friend groups |

### Add review schema (JSON-LD) — do this on every property page
Add `Review` + `AggregateRating` structured data so Google can show ★ ratings in the SERP. You already have `VacationRental` + `Offer` schema on these pages (verified 6/18) — extend it:

```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "5.0",
  "reviewCount": "180"
},
"review": [
  {
    "@type": "Review",
    "author": {"@type": "Person", "name": "Guest name"},
    "reviewRating": {"@type": "Rating", "ratingValue": "5"},
    "reviewBody": "The quote text."
  }
]
```
> ⚠️ Only mark up reviews that are **genuinely displayed on the page** — Google penalizes review schema on pages that don't show the reviews. So: publish the reviews visibly first, then add the markup.

### Keep the pipeline full
Your **GBP Review Workflow** ([050826/GBP_Review_Workflow.md](../050826/GBP_Review_Workflow.md)) already exists — keep running it. Every new review both (a) refreshes property-page proof and (b) strengthens local ranking. Aim for a steady trickle (1–2/week) and rotate the freshest onto the property pages.

## Definition of done
- [ ] Every property page's "What guests say" shows ≥3 real reviews.
- [ ] Aggregate rating line sits above each booking card.
- [ ] Review + AggregateRating JSON-LD added (and validated in Google's Rich Results Test).
- [ ] Trip-type match applied (family reviews on family houses, etc.).

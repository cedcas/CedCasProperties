# Money Page 2 — `/properties`

**Build 2 of 4 · Phase 3 draft · 2026-08-16**
**For:** Cedric → developer (new route on `haveninlipa.com`)
**Cluster:** C1 — Short-Term Rentals · **Priority: foundational — fixes a live 404**

---

## Page metadata

| Field | Value |
|---|---|
| **URL** | `https://haveninlipa.com/properties` |
| **Title tag** | Our Homes in Lipa City, Batangas — 5 Private Rentals \| Haven in Lipa *(64 chars)* |
| **Meta description** | Browse all five Haven in Lipa homes — from a 1BR for two to a full house sleeping 15. Live rates, real availability, booked direct with no platform fee. *(152 chars)* |
| **Canonical** | self |
| **Sitemap** | add at priority **0.9** |
| **Schema** | `ItemList` of the five properties + `BreadcrumbList` |

> ### Why this page exists
> It is **not** primarily a ranking play — Phase 1 §2.2 established that positions 1–8 for `airbnb lipa` and `vacation rentals lipa` are OTA category pages we will not displace. This page is justified by three other things:
>
> 1. **`/properties` is a live 404**, and `/properties/` 308s into it — a path that looks real and isn't. It was linked from the five biggest blog evergreens until 8/16, and remains linked from anything outside our control: external sites, the GBP profile, old social posts, LLM citations.
> 2. **Lodging intent has nowhere to land** except a homepage doing six jobs at once.
> 3. **Stay Match needs a fallback surface** — when confidence is <0.4 the engine drops to the property ladder, and that ladder should point somewhere real.
>
> If it ranks, that's upside. It is not the success criterion.

> ### 🔴 Implementation rules
> Identical to Build 1: **everything renders from `GET /api/properties.json`**. No hardcoded prices, guest counts, slugs or images. `priceFrom` is the feed's boolean — render it, never recompute it. Handle a feed returning fewer than five.

---

# Our Homes in Lipa City, Batangas

Five private homes, all in Lipa City, all bookable directly. No platform between us, no service fee on top, and the rates below are the live ones — not a number typed into a page months ago.

## All five homes

*Rendered from the feed, in the order returned. One card per listing.*

**Per card:**
- `{{featuredImage}}` with alt `{{name}} — vacation rental in {{location}}, Batangas`
- **`{{name}}`** as an `<h3>`, linking to `{{url}}`
- `Sleeps up to {{maxGuests}}` · `{{bedrooms}} bedroom(s)` · `{{bathrooms}} bath`
- **`{{priceFrom ? "From " : ""}}₱{{pricePerNight}}/night`** — *rate covers {{includedGuests}} guests*
- `{{tagline}}` — one line, already normalised by the feed. Do not re-template prices into it.
- Two buttons: **Check availability** → `{{bookUrl}}` · **See the home** → `{{url}}`

> Both buttons need the existing `data-analytics` and `data-property` hooks so `check_availability` and `book_click` fire consistently with the rest of the site.

## Find the right one

### By group size

| Travelling as | The home |
|---|---|
| Two of you | Cozy 1BR Haven |
| A small family, up to 5 | Cozy 1BR Haven |
| A family with kids, up to 7 | Mickey in Lipa — Family Staycation |
| A barkada or two families, up to 9 | Spacious 2BR Getaway |
| A big group, up to 11 | Mickey in Lipa — Family House |
| Everyone, up to 15 | Mickey in Lipa — Full Family House |

*Guest maximums render from `{{maxGuests}}`.*

### By occasion

- **A weekend away for two** → Cozy 1BR. [What a Lipa staycation looks like](/staycation)
- **Family trip with kids** → the Mickey houses. Disney-themed rooms, full kitchen
- **Barkada getaway** → Spacious 2BR or Mickey sleeps-11. [The cost-per-head math](https://blog.haveninlipa.com/) *(link to #27 on publication, Mon 8/31)*
- **Working remotely** → Cozy 1BR. 400 Mbps fibre, speed-tested, solar backup
- **A wedding party** → sleeps-11 or sleeps-15. [Where your wedding party stays](/weddings-accommodation)
- **A reunion or milestone birthday** → Full Family House. Gatherings are fine — just tell us in advance

## What every home includes

Whichever you pick:

- **Fast fibre WiFi**, speed-tested rather than advertised
- **A full kitchen** — not a kettle and a microwave
- **Parking inside the village gates**, not on a street
- **Netflix**, and a living room actually built for sitting in
- **GCash, BPI InstaPay** (no fees) **or credit card** via Stripe (6% processing)
- **No cleaning fee, no service fee, no resort fee.** The rate plus any extra-guest fee is the total

## Where they are

All five listings are in **BellaVita Subdivision, Lipa City** — one gated village, two houses five doors apart.

*(Embed the existing area-level OSM map — the same lazy-loaded component used on the property pages.)*

✅ **Verified with the owner, 2026-08-16** — real driving times, not map estimates.

| From our houses to | Drive time |
|---|---|
| Mary Mediatrix of All Grace Parish | under 10 min |
| Casa de Segunda | 12 min |
| Metropolitan Cathedral of Saint Sebastian | 15 min |
| SM Lipa | 20 min |
| Mt. Maculot trailhead *(Cuenca side)* | 1 hour |
| Taal Heritage Town | 1 hr 15 min |
| **Alabang** *(southern edge of Metro Manila)* | **about 1 hour** |
| **Central Manila** *(traffic depending)* | **about 1 hr 45 min** |

We publish both Manila figures because "an hour from Manila" depends entirely on which part of Manila you're leaving. From Alabang it's an hour. From the north of the metro, plan for closer to two.

## Booking direct

Pick your dates on the home's page and you'll see the total before you commit — nightly rate, any extra-guest fee, and nothing else. Payment by GCash, BPI InstaPay or card.

Cancellation terms, check-in times, pets, kids and the rest are on the [FAQ page](/faq). If your question isn't there, message us — you'll get Melody or Wilma, not a queue.

## Questions

**Can I book more than one at once?**
Yes — there are **two houses, five doors apart** (about a two-minute walk), and together they sleep **up to 24**. What you can't do is book two options on the *same* house: the different guest counts you see are configurations of one property, not separate units. Message us with your headcount and we'll work out the split.

**Do rates change on weekends or holidays?**
The rate shown on each home's page is the live one for your dates. What you see is what you pay.

**How many guests can each home take?**
From {{min maxGuests}} to {{max maxGuests}}. Each home's rate covers a set number, with a flat per-night fee per guest beyond that.

**Are the homes near each other?**
Very. All five listings are in **one gated village**, across two houses that are **five doors apart** — roughly a two-minute walk. Good for split groups who still want to eat breakfast together.

**Can we hold an event or gathering?**
Gatherings are permitted as long as you inform us in advance — it's part of the house rules. What doesn't work is turning up with an unannounced party.

## Ready to book?

**[See what a Lipa staycation costs →](/staycation)** · **[Message us →](/#contact)**

---

## Developer notes

**Route:** `src/app/properties/page.tsx`

⚠️ **This route currently 404s and `/properties/` 308s into it.** Adding `page.tsx` at this segment fixes both. Confirm the trailing-slash redirect resolves to a 200 after deploy — that chain is what produced the original GSC-adjacent link rot.

**Data:** server-side fetch of the feed, 1-hour cache. Reuse whatever the `/staycation` build uses — one fetch helper, not two.

**Empty/short feed:** if the feed returns 0 properties, render the copy and a contact prompt rather than an empty grid or an error.

**Schema:** `ItemList` where each `itemListElement` is a `Product`-free reference to the property page URL — do **not** emit `Offer` or `priceSpecification`. The property pages already had those stripped for triggering "invalid itemtype" critical errors; don't reintroduce the pattern here. Add `BreadcrumbList` (Home → Our Homes).

**Sitemap:** priority 0.9, `changeFrequency: 'weekly'` — it changes whenever inventory does.

### After launch — repoint the blog

The five biggest evergreens currently link to `https://haveninlipa.com/#properties` (the interim anchor fix from 8/16). Once this page is live, repoint them:

```
https://haveninlipa.com/#properties  →  https://haveninlipa.com/properties
```

Posts: `15-best-things-to-do…`, `best-restaurants-cafes…`, `weekend-getaway-in-lipa-city…`, `taal-volcano-day-trip…`, `how-to-get-to-lipa-city…`

⚠️ **Use Better Search Replace, not raw SQL** — and if raw SQL is used, remember to flush the **object cache** as well as the page cache. Both lessons cost us a debugging round on 8/16. Filter on `post_type='post'`, never `post_status='publish'` — that skips scheduled posts.

### Post-launch

1. Request indexing in GSC.
2. Confirm `/properties/` (trailing slash) resolves 200 in one hop.
3. Point the **Stay Match `<0.4` confidence tier** at this URL.
4. Success measure: **share of blog sessions reaching a property page** — not this page's own impressions.

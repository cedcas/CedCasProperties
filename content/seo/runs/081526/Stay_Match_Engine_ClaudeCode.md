# Stay Match — contextual booking recommendation engine

**Date:** 2026-08-15
**For:** Cedric → developer (WordPress side, `blog.haveninlipa.com`)
**Design settled:** 2026-08-14 · **Pilot:** articles #27 / #28 / #29

> ## ✅ Unblocked — the feed is live (verified 2026-08-16)
> `GET https://haveninlipa.com/api/properties.json` returns **200** with all 5 listings. Verified: prices match the DB, every published URL resolves 200, prose carries no price drift, CORS is scoped to the blog origin, and the edge cache holds for an hour. See [Deploy_Gap_Note_081526.md](Deploy_Gap_Note_081526.md) for the full verification.
>
> **One contract change since this brief was drafted.** The route is now `force-dynamic` with an explicit `s-maxage=3600` rather than ISR (`2dc488b`) — `export const revalidate` was running the DB query at build time. **Nothing in the consumer contract below changes**: same envelope, same fields, same one-hour freshness. The only remaining prerequisite is P2 in the blog remediation brief (see Events).

---

## Why this exists

The 8/14 analysis found traffic up ×22 in three months with bookings flat: 95.7% of July clicks were food intent, lodging-intent queries earned zero clicks, and the share of traffic reaching the booking surface collapsed from 75% to 1.9%. Property pages got **one click** in July.

Cedric's read on the fix: *"I don't want more 'book now' buttons."* Static CTAs are already on most articles and they are not converting — because the same five-property ladder appears on a lomi guide, a hiking guide, and a wedding-season piece. The reader has to do the matching themselves.

Stay Match replaces the ladder with a recommendation: read what the article is about, pick the listing that fits, and say **why** it fits. A couple reading the romantic-getaway piece should see the Cozy 1BR with a reason, not five options with prices.

The second job is structural. ~29 articles hardcode prices, and three rates changed in the last six weeks without anyone being told — the feed makes every recommendation read live DB values, so this class of drift stops recurring at the source.

---

## The data contract

I wrote this against the actual route source (`src/app/api/properties.json/route.ts`), not the spec summary. Details that will bite if assumed:

**It's an envelope, not an array:**

```json
{ "count": 5, "properties": [ { … } ] }
```

**Per property:**

| Field | Notes |
|---|---|
| `slug`, `name`, `type`, `location` | — |
| `url`, `bookUrl` | Absolute. `bookUrl` = `{url}/book` |
| `pricePerNight`, `includedGuests`, `maxGuests`, `extraGuestFeePerNight` | **Raw numbers.** The blog formats — the feed never sends display strings |
| `priceFrom` | Boolean. See below |
| `bedrooms`, `bathrooms`, `featuredImage`, `amenities` | `amenities` is an array |
| `tagline`, `heroSummary` | Already normalised. May be `null` |
| `bestForSegments[]` | `{title, body, internalLinkLabel, internalLinkUrl}` — the scoring input |
| `updatedAt` | ISO 8601 |

### Four invariants

1. **`priceFrom` is authoritative — render it, never recompute it.** It comes from `extraGuestFeeApplies()`, the same predicate `PropertyCard` uses (`57ab099`). Prefix the rate with "From" when true and omit it when false. Recomputing it from `extraGuestFeePerNight > 0` gets flat-price listings wrong and implies an increase that cannot happen.

2. **Prose arrives normalised — don't rewrite it.** `tagline`, `heroSummary`, and `bestForSegments[].body` have already been through `normalizePricingProse()` server-side. At build time all five listings had drifted seeded prose; the feed is what corrects it. Re-templating prices into that text re-introduces exactly the bug this replaces.

3. **`internalLinkUrl` is already absolute.** Authored site-relative, absolutised against `BASE_URL` before it leaves the app. Don't prefix it again.

4. **The feed can return fewer than five.** Selection is `isActive: true` **AND** `pricePerNight > 0` — an unpriced listing drops out silently. Never assume five; handle a short or empty feed explicitly (see failure behaviour).

### Caching

`revalidate = 3600`, plus `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`. Fetch **server-side** from WordPress and cache in a transient on the same 1-hour cadence — this must not be a per-pageview request. CORS is scoped to `https://blog.haveninlipa.com` and `Vary: Origin` is set, so a client-side variant would work later without a CSP change, but server-side is the shipping path.

**The feed is the source of truth for price and URL. Never cache a rendered price string longer than the feed itself.**

---

## Intent resolution

**The feed carries no intent tags** — this is the part that lives entirely on the WordPress side.

**Primary: an explicit per-post intent field.** A custom field on each post, set by the author. This is the source of truth.

**Fallback only: categories and tags.** `uncategorized` is a live category on this blog, so taxonomy alone cannot be trusted — it is a hint when the explicit field is empty, never a substitute for it.

Seed the intent → property map from [070426/Conversion_Fix_2_Blog_to_Booking_Funnel.md](../070426/Conversion_Fix_2_Blog_to_Booking_Funnel.md), which already carries the per-article intent mapping. Score candidates against `bestForSegments` — that field exists precisely because it is the audience-fit data, and its `title`/`body` are what justify the pick in the rendered copy.

---

## Confidence gates the UI

The score is not decoration — it decides what renders:

| Confidence | Renders |
|---|---|
| **≥ 0.7** | One confident pick, itinerary framing, a stated reason drawn from `bestForSegments` |
| **0.4 – 0.7** | Two options, lighter framing, let the reader choose |
| **< 0.4** | Fall back to the proven 5-property ladder — no pretending |

The bottom gate matters as much as the top one. A confident-sounding wrong recommendation on a mismatched article is worse than the generic ladder, because it tells the reader we don't understand what they're reading.

**Log the score as a GA4 event parameter.** CTR-by-confidence-band is the whole feedback loop: if the ≥0.7 band doesn't out-convert the ladder, the thresholds or the intent map are wrong, and the data says so within a month. Without that parameter this is unfalsifiable.

---

## Events

Two new, following the conventions in [080526/GTAG_Events_ClaudeCode.md](../080526/GTAG_Events_ClaudeCode.md):

| Event | Fires | Params |
|---|---|---|
| `stay_match_view` | Component enters viewport | `property`, `confidence`, `intent`, `post_slug` |
| `stay_match_click` | Reader clicks through | `property`, `confidence`, `intent`, `post_slug`, `destination` (`property` \| `book`) |

Reuse the existing `data-analytics` / `data-property` markup hooks and the `track()` helper — do not introduce a second tracking pattern. Neither event should be a key event; `booking_confirmed` stays the only conversion. These measure the funnel step, and mixing them into conversions would feed junk to Ads bidding, the same reasoning that kept `book_click` and `check_availability` off the key-event list.

⚠️ **Before wiring these, confirm P2 in [Blog_Remediation_Brief_081526.md](Blog_Remediation_Brief_081526.md) is fixed** — 13 blog→property links currently carry `?utm_source=chatgpt.com`, which starts a new GA4 session at the click. Ship Stay Match onto that and every `stay_match_click` gets attributed away from organic before the follow-on booking is recorded.

---

## Failure behaviour

Non-negotiable, in priority order:

1. **Feed unreachable / non-200 / malformed** → render the hardcoded 5-property ladder. Never render nothing, never render a spinner, never render a partial card. This mirrors the Footer's existing fallback (`Footer.tsx` falls back to a hardcoded 5-link list on any fetch failure) — same pattern, opposite direction.
2. **Feed returns fewer properties than the recommendation needs** → drop to the next-lower confidence band; if nothing qualifies, the ladder.
3. **Matched slug missing from the feed** (deactivated or unpriced) → treat as no match. Never link a slug the feed didn't return; that's how a dead property link gets published across 29 articles.
4. **Stale transient during an outage** → serve it. A one-hour-old price beats no recommendation, and `stale-while-revalidate` is set to 24h for this reason.

---

## Pilot and rollout

Pilot on **#27** (barkada, scheduled Mon 8/31), **#28**, **#29** — all three are drafted, all three have price-free CTAs already, so nothing in them contradicts a live-data component.

Judge it on **conversion rate, not impressions** (the standing rule from 8/14 — bookings, not sessions). After roughly a month of data, compare `stay_match_click` → `booking_confirmed` against the ladder's baseline on comparable articles, broken down by confidence band. Retune the thresholds and the intent map from that, then roll out to the top entry pages — #1, #5, #3, #7, #10 — which is where the traffic actually is.

Do not roll out beyond the pilot before that comparison exists. The point of this build is to stop guessing which CTA works.

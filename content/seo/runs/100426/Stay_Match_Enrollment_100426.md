# Stay Match enrollment of the high-traffic posts — 2026-10-04

**What:** `_hil_stay_intent` set on 12 published posts on `blog.haveninlipa.com`, so the Stay Match block renders on the posts that get the readers. Approved by the Owner on 2026-10-04 ("give the top posts a stay intent").

**Why:** GA4 since 2026-09-04 showed 30 `stay_match_view`, 0 `stay_match_click`, 0 `stay_match_arrival`. None of these 12 posts was enrolled; the restaurants guide alone had 151 pageviews in 30 days.

**How:** WordPress REST, `POST /wp/v2/posts/<id>` with a `meta`-only body (Editor account, SEO-DEC-010 — modify-existing, stays published). No title, content, slug, status or SEO field was sent. Every post was `publish` with an empty intent before the write.

| Post ID | Slug | Intent set | Tier | Confidence | Properties shown |
|---|---|---|---|---|---|
| 63 | `best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide` | `small family or couple` | double | 0.67 | `family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 6 | `15-best-things-to-do-in-lipa-city-batangas-2026-locals-guide` | `small family or couple` | double | 0.67 | `family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 77 | `how-to-get-to-lipa-city-from-manila-2026-guide` | `small family or couple` | double | 0.67 | `family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 70 | `taal-volcano-day-trip-from-lipa-city-2026-updated-guide` | `small family or couple` | double | 0.67 | `family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 398 | `best-lomi-lipa-city` | `small family or couple` | double | 0.67 | `family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 466 | `lipa-vs-tagaytay-an-honest-comparison-from-a-host-who-lives-in-lipa` | `small family or couple` | double | 0.67 | `family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 365 | `lipa-barako-coffee-heritage` | `couples weekend getaway` | single | 1.0 | `cozy-1-bedroom` |
| 478 | `casa-de-segunda-lipa-city` | `couples weekend getaway` | single | 1.0 | `cozy-1-bedroom` |
| 272 | `romantic-getaway-batangas-lipa-city` | `couples weekend getaway` | single | 1.0 | `cozy-1-bedroom` |
| 44 | `mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa` | `barkada 6 to 9` | single | 1.0 | `spacious-2-bedroom` |
| 355 | `indoor-things-to-do-in-lipa-city-when-it-rains` | `families with kids` | double | 1.0 | `family-house--sleeps-11`, `spacious-2-bedroom` |
| 268 | `family-staycation-lipa-city-batangas` | `families with kids` | double | 1.0 | `family-house--sleeps-11`, `spacious-2-bedroom` |

Tier and confidence come from the plugin's own scoring (v1.0.2) run against the live `/api/properties.json` feed at the time of the change.

## How the intents were chosen

- **General-audience guides** (food, things to do, transport, Taal, lomi, Lipa vs Tagaytay) got `small family or couple`. It lands in the two-option tier on purpose: these readers are mixed, so a single confident pick would be arbitrary.
- **Couple-leaning posts** (barako coffee, Casa de Segunda, romantic getaway) got `couples weekend getaway`, a single pick of the 1-bedroom.
- **Mt. Maculot** got `barkada 6 to 9`, a single pick of the 2-bedroom, on the judgment that hikers travel in groups.
- **Family posts** (indoor things, family staycation) got `families with kids`, which ties the sleeps-11 house and the 2-bedroom.

These are first-pass editorial choices, not tested ones. Retune from `stay_match_click` by `post_slug` once there is data.

## Verification

All 12 live URLs were fetched after the write, both as served and with a cache-busting query string. Each renders the block with the tier and properties in the table.

Not verified: that a reader's click records `stay_match_click` and `stay_match_arrival` in GA4.

## Side effects

- Each post's `modified` date is now 2026-10-04, which also moves `dateModified` in its schema and its sitemap `lastmod`.
- Several of these posts already carry a hand-written "Staying overnight in Lipa?" callout near the top; the block is added below the first `<h2>`, so both now appear.

## Rollback

Clear the field on a post (set `_hil_stay_intent` to an empty string in the Stay Match box in the editor, or via REST). Empty means not enrolled and the post renders as before.

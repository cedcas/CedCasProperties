# Search vs. Pageviews Report: haveninlipa.com

**Period:** 4 Sep – 3 Oct 2026 (30 days, Asia/Manila)
**Sources:** Google Search Console (`sc-domain:haveninlipa.com`, web search) and the GA4 property, pulled 4 Oct 2026
**Scope:** `haveninlipa.com` (booking site) and `blog.haveninlipa.com` (blog). Both sit in the same Search Console and GA4 properties, so they are reported side by side.

## Summary

- **Search finds the blog, not the booking site.** Of roughly 192 Google search clicks, about 168 went to blog posts and 25 to the booking site.
- **The booking site gets its pageviews from somewhere other than search.** Its property pages were viewed 212 times but earned only 4 search clicks.
- **Blog readers are not crossing over.** The Stay Match block was seen 30 times on the blog and recorded no clicks, because it is not on any of the high-traffic posts.
- **The booking site's GA4 numbers are inflated by admin use, but only up to 28 Sep.** 375 of its 883 pageviews (42%) are `/admin` pages, and 55 of its 121 "Google organic" sessions landed on an admin page. All of it predates the tracking fix that went live on 28 Sep; none has been recorded since.
- **Booking-intent searches barely surface the site.** Queries such as "intimate wedding venue lipa" and "apartment for rent lipa city" rank on page 3 or lower.

## Totals

| | Booking site | Blog |
|---|---|---|
| Google search clicks (GSC) | 25 | ~168 |
| Google search impressions (GSC) | ~1,150 | ~20,500 |
| Pageviews (GA4) | 883 (508 excluding `/admin`) | 576 |
| Active users (GA4) | 139 | 446 |
| Sessions (GA4) | 319 | 510 |

Whole property in Search Console: 192 clicks, 21,652 impressions, 0.89% CTR, average position 7.6. Per-site figures are summed from page-level rows, which is why they do not add up exactly to the property total.

## Booking site: search queries vs. pageviews

| Page | Search clicks | Impressions | Avg position | Google organic sessions (GA4) | Pageviews (GA4) |
|---|---|---|---|---|---|
| `/` | 16 | 355 | 5.0 | 43 | 194 |
| `/properties/cozy-1-bedroom` | 2 | 82 | 7.1 | 2 | 106 |
| `/properties/mickey-in-lipa--family-staycation--sleeps-7` | 2 | 35 | 8.8 | 4 | 58 |
| `/staycation` | 0 | 24 | 10.5 | 0 | 24 |
| `/properties/mickey-in-lipa--full-family-house--sleeps-15` | 0 | 16 | 7.3 | 0 | 23 |
| `/properties/spacious-2-bedroom` | 0 | 59 | 9.4 | 1 | 19 |
| `/faq` | 0 | 36 | 7.2 | 1 | 16 |
| `/weddings-accommodation` | 1 | 251 | 19.8 | 1 | 8 |
| `/about` | 4 | 105 | 6.1 | 3 | 7 |
| `/properties` | 0 | 160 | 13.7 | 1 | 3 |
| `/admin/*` (not in search) | n/a | n/a | n/a | 55 | 375 |

Queries Search Console shows for the booking site (none recorded a click at query level):

| Query | Impressions | Avg position |
|---|---|---|
| haven in lipa | 102 | 4.4 |
| haven | 40 | 4.4 |
| intimate wedding venue lipa | 40 | 34.4 |
| apartment for rent lipa city | 27 | 28.8 |
| airbnb lipa | 5 | 14.6 |
| corporate retreat venue lipa | 4 | 40.3 |

What this shows:

- **Brand search is the only search traffic that converts to visits.** The homepage's 16 clicks come from queries Search Console hides for privacy; the visible ones are brand terms at position 4–5.
- **Property pages are reached by other routes.** The 1-bedroom page has 106 pageviews against 2 search clicks, so its visitors arrive directly, from links, or from inside the site.
- **`/weddings-accommodation` and `/properties` are seen but not clicked.** They collected 411 impressions and 1 click between them, at positions 14–20.

## Blog: search queries vs. pageviews

| Post | Top query (clicks) | Search clicks | Impressions | CTR | Google organic sessions (GA4) | Pageviews (GA4) |
|---|---|---|---|---|---|---|
| Best restaurants & cafes guide | lipa restaurants (7) | 82 | 10,527 | 0.78% | 110 | 151 |
| 15 best things to do | galaan near me (1) | 13 | 2,978 | 0.44% | 34 | 72 |
| Barako coffee heritage | kapeng barako lipa (1) | 15 | 743 | 2.02% | 24 | 47 |
| How to get to Lipa from Manila | manila to lipa (1) | 10 | 2,371 | 0.42% | 14 | 35 |
| Mt. Maculot hiking guide | is mt maculot open for hiking (1) | 6 | 402 | 1.49% | 16 | 30 |
| Best lomi in Lipa | lomi king menu (1) | 3 | 765 | 0.39% | 6 | 23 |
| Indoor things to do when it rains | indoor places to visit near me (1) | 10 | 205 | 4.88% | 14 | 20 |
| Romantic getaway | none with clicks | 4 | 423 | 0.95% | 6 | 17 |
| Taal Volcano day trip | none with a real query | 8 | 627 | 1.28% | 8 | 16 |
| Casa de Segunda | casa de segunda (2) | 2 | 737 | 0.27% | 3 | 12 |

What this shows:

- **One post carries the blog.** The restaurants guide takes 82 of about 168 blog search clicks and 151 of 576 blog pageviews.
- **The restaurants guide's queries are all "where to eat" variants.** "lipa restaurants", "where to eat in lipa", "restaurants in lipa" and "lipa city restaurants" rank at positions 5–6 with CTRs of 1.5–3.2%.
- **Three posts are seen far more than they are clicked.** "15 best things to do", "How to get to Lipa" and "Best lomi" each have CTR under 0.5% despite ranking on page 1.
- **The "things to do" post ranks for broad place-name searches it cannot win.** "lipa batangas" (257 impressions, position 12.3) and "lipa city" (114 impressions, position 11.3) produced no clicks.

## From blog reader to booking

| Event (GA4) | Count | Users |
|---|---|---|
| `stay_match_view` (blog) | 30 | 17 |
| `stay_match_click` (blog) | 0 recorded | 0 |
| `check_availability` (booking site) | 93 | 35 |
| `book_click` (booking site) | 7 | 7 |
| `booking_confirmed` (booking site) | 6 | 6 |
| `generate_lead` (booking site) | 3 | 3 |

- **The Stay Match block reaches few readers.** It was viewed by 17 of the blog's 446 users.
- **The block is missing from the posts people read.** It only appears on posts given a stay intent. A check of 12 high-traffic posts on 4 Oct found it on none of them, including the restaurants guide.
- **No Stay Match clicks were recorded.** With so few viewers this is a coverage gap; it does not show whether the click event works.
- **Booking-site events may include admin or test activity.** They are not filtered, so treat the counts as upper bounds.

## Data caveats

- **GA4 sessions and Search Console clicks will not match.** GA4's "Google organic" sessions run higher than Search Console web clicks on most pages. The two tools count differently, and Search Console figures here cover web search only.
- **Admin traffic is counted as organic, for 4–28 Sep only.** Most `/admin` sessions are attributed to Google organic, which is consistent with someone searching for the site and then logging in. It makes the booking site's organic traffic look about twice its real size in this window. Since 29 Sep GA4 has recorded no `/admin` pageviews (checked 4 Oct).
- **Owner visits to public pages are still counted.** Since 29 Sep, about 19 of the booking site's 66 pageviews come from the same cities as the earlier admin traffic. The GA4 Internal Traffic and Developer filters are Active, switched on around 28 Sep when admin traffic stopped appearing. These hits, dated 30 Sep – 2 Oct, therefore come from a browser the site has not tagged as internal.
- **The homepage figure may be affected too.** GA4 shows 43 Google organic sessions on `/` against 16 Search Console clicks; how much of the gap is internal use is not established.
- **Non-production hosts are in the property up to 28 Sep.** `dev.haveninlipa.com` (100 pageviews), a Vercel preview URL (6) and `localhost` are recorded alongside real traffic. None has sent pageviews since 29 Sep.
- **Payment-link URLs appear in GA4 up to 28 Sep.** Page paths of the form `/pay/<token>` were recorded (14 pageviews), so those tokens are stored in Google Analytics. None has been recorded since 29 Sep.
- **Most queries are hidden.** Search Console withholds rare queries, so the query tables cover only part of each page's impressions.

## Recommended next steps

1. **Check that owner visits drop out of GA4 over the next week.** `/admin`, `dev.`, preview and `localhost` tracking stopped on 28 Sep and the Internal Traffic filter is Active. If visits from owner devices still appear, open a signed-in admin page on each device so the site tags it as internal.
2. **Read the booking site's September numbers with `/admin` excluded.** Data recorded before 28 Sep cannot be cleaned, so filter it out by page path and hostname when reporting on that period.
3. **Put the Stay Match block on the top posts.** Give the high-traffic posts a stay intent so the block appears where the readers are, then confirm one real click records in GA4.
4. **Rewrite titles and descriptions on the three low-CTR posts.** Start with "How to get to Lipa" (lead with travel time and fare), then "15 best things to do" and "Best lomi".
5. **Give the restaurants guide a clear route to the booking site.** It is the single largest source of search visitors.
6. **Decide whether to pursue wedding and rental searches.** `/weddings-accommodation` and `/properties` have demand in the data but rank too low to earn clicks.

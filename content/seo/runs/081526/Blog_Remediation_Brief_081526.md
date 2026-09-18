# Blog Remediation Brief — blog.haveninlipa.com

**Date:** 2026-08-15
**For:** Cedric / the blogger — WordPress admin edits, no code
**Basis:** live crawl of all 23 posts in `post-sitemap.xml`, run 2026-08-15
**Re-verified:** 2026-08-16 after Cedric applied the brief — status below

---

## ✅ CLOSED — final verification 2026-08-16

Full cache-busted crawl of all 23 live posts. **Every item is zero.**

| Check | Count |
|---|---|
| Mangled `#properties/<slug>` links | **0** |
| UTM-tagged internal links (both hosts) | **0** |
| Dead `/properties/` links | **0** |
| Dead `/contact` links | **0** |
| Bare `#properties/` trailing slash | **0** |
| Posts with stale property rates | **0** |
| Posts with old-slug links | **0** |
| **Correct `/properties/<slug>` links** | **151** (90 survivors + 61 restored) |
| **Correct `#properties` nav links** | **121** (untouched throughout) |

All 5 property URLs and the homepage return 200.

### What the fix actually took, and the lesson worth keeping

The `#properties/` regression was cleared with direct SQL on `wp_posts` (`REPLACE` on `post_content`, filtered by `post_type='post'` — **not** `post_status='publish'`, which would have skipped 4 **scheduled** posts including #25, due to publish the next morning).

Then the fix appeared not to work: 15 rows updated, but the live pages and even the **uncached REST API** still served the broken links. Cause was the **object cache** — direct SQL bypasses WordPress, so WP never invalidates Redis/Memcached and keeps serving pre-update post objects. Purging LiteSpeed page cache alone was not enough; the object cache had to be flushed too.

**Rules to carry forward:**
1. `post_content` is plain longtext, so raw SQL is safe there. **`wp_options` and `wp_postmeta` are serialized** — raw SQL corrupts them. Use Better Search Replace for those, always.
2. Filter WordPress content edits on **`post_type`**, not `post_status` — scheduled (`future`) and draft posts are invisible to a live crawl and easy to miss.
3. After any direct SQL edit, flush **page cache AND object cache**. BSR runs inside WordPress and handles this automatically, which makes it the better default for content changes despite the SQL being correct here.
4. Never search-replace on `/properties/` without a disambiguating prefix. It matched the real property URLs twice in this exercise, and **both times it failed silently** — a fragment URL returns 200, so no 404 log, no GSC signal, no HTTP link checker catches it.

> Point 4 is a live argument for the Stay Match component rendering property links from `/api/properties.json` rather than having them hardcoded across 23 posts: it converts an invisible content-bug class into one that cannot occur.

---

## 🔴 Verification round 3 — 2026-08-16 (superseded by the close above)

Almost everything is now clean, but **the trailing-slash fix introduced a worse regression.**

| Item | Status |
|---|---|
| Main-site UTM links | ✅ 13 → **0** |
| #9 Yoast meta description | ✅ ₱1,500, zero ₱2,000 on the page incl. JSON-LD |
| Dead `/properties/` + `/contact` links | ✅ **0** |
| Stale rates, all 23 posts | ✅ **0** |
| Old-slug links | ✅ **0** |
| Bare `#properties/` trailing slash | ✅ **0** — the 5 P1 posts are correct |
| **Real property links** | 🔴 **61 mangled to `#properties/<slug>`** |
| **blog→blog UTM links** | ⚠️ **7 remaining** (missed by the earlier sweep) |

### 🔴 61 property links now point at a fragment that matches nothing

The replace matched `/properties/` inside the **real** property URLs:

| Mangled URL | Count |
|---|---|
| `https://haveninlipa.com/#properties/cozy-1-bedroom` | 16 |
| `https://haveninlipa.com/#properties/spacious-2-bedroom` | 16 |
| `https://haveninlipa.com/#properties/mickey-in-lipa--full-family-house--sleeps-15` | 11 |
| `https://haveninlipa.com/#properties/mickey-in-lipa--family-staycation--sleeps-7` | 9 |
| `https://haveninlipa.com/#properties/mickey-in-lipa--family-house--sleeps-11` | 9 |

Across 11 posts: `lipa-charter-day` (11), `mickey-in-lipa-coming-soon` (8), `indoor-things-to-do` (7), `independence-day` (7), `casa-de-segunda` (5), `lipa-vs-tagaytay` (5), `best-lomi` (5), `lipa-barako-coffee` (5), `family-weekend` (4), `romantic-getaway` (2), `family-staycation` (2). 90 property links survived intact.

**These do not 404 — that's what makes them dangerous.** The browser loads the homepage, the fragment `#properties/cozy-1-bedroom` matches no element, and the reader lands at the **top of the homepage** instead of the property page they clicked. Nothing catches it: not the Redirection 404 log, not GSC coverage, not a link checker looking for HTTP errors. And these are the in-body "Where to Stay" ladders — the exact CTAs the conversion workstream exists to build.

### ⚠️ 7 blog→blog UTM links (my earlier sweep missed these)

The first UTM check only matched links to `haveninlipa.com`, so links to `blog.haveninlipa.com` were skipped. Seven remain, all pointing at `how-to-get-to-lipa-city-from-manila-2026-guide/?utm_source=chatgpt.com`, in 6 posts: `why-book-direct` (2), `taal-volcano`, `best-restaurants`, `mt-maculot`, `weekend-getaway`, `15-best-things-to-do`. Same session-splitting defect — both domains report to the same GA4 property.

### ✅ The fix — one pass, and it is safe

**Better Search Replace**, `wp_posts` only, "Replace GUIDs" unchecked, **dry run first**:

| # | Search for | Replace with | Expect |
|---|---|---|---|
| 1 | `haveninlipa.com/#properties/` | `haveninlipa.com/properties/` | **61** |
| 2 | `?utm_source=chatgpt.com` | *(empty)* | **7** |

Replace #1 **cannot** touch the 121 correct `#properties` links, because those carry no trailing slash and the search string ends in one. That trailing slash is the entire safety mechanism — do not drop it.

If a dry run reports a count other than 61 or 7, stop and re-check the string before running live. Purge LiteSpeed afterwards.

---

## ✅ Verification round 2 — 2026-08-16 (superseded by round 3 above)

| Item | Status |
|---|---|
| **P1** dead 404 links | ✅ Fixed in all 5 posts — but see the trailing-slash defect below |
| **P2** UTM params | ⚠️ **10 of 13 still present** |
| **P3** stale rates | ⚠️ Body fixed — **#9's Yoast meta description still says ₱2,000** |
| **P4** old-slug links | ✅ Gone from every post |
| **P5** Redirection plugin | ✅ Installed and active (`redirection/v1` in the REST namespaces) |

### ⚠️ Still open — 1: ten UTM links remain

Only 3 of the 13 came out. Remaining:

| Post | Count |
|---|---|
| `why-book-direct-instead-of-airbnb-…` | 4 |
| `mt-maculot-hiking-guide-2026-…` | 3 |
| `weekend-getaway-in-lipa-city-…` | 2 |
| `work-from-lipa-the-affordable-remote-work-…` | 1 |

All are `?utm_source=chatgpt.com` on `cozy-1-bedroom` and `spacious-2-bedroom` links. Strip the query string, leave the bare URL. **This is the one item still gating the Stay Match events** — see [Stay_Match_Engine_ClaudeCode.md](Stay_Match_Engine_ClaudeCode.md).

### ⚠️ Still open — 2: #9's meta description

The post *was* edited (`dateModified: 2026-08-16`) and the body and title tag now read ₱1,500. But the Yoast **meta description** field was not touched:

```
<meta name="description" content="Ditch Manila rent. Work remotely from Lipa City with
400 Mbps WiFi, starting at ₱2,000/night. …">
```

It also propagates into the Yoast JSON-LD `description`. This was the most important instance in P3: it's the indexed SERP snippet, so the search result advertises a rate 33% above the real one to everyone who sees it without clicking. Fix it in the Yoast sidebar (the SEO meta box), not in the post body — editing the body won't touch it.

### ⚠️ Still open — 3: `#properties/` has a trailing slash

The search-replace turned `/properties/` into `/#properties/`, keeping the trailing slash inside the fragment. All 5 posts now carry:

```
https://haveninlipa.com/#properties/     ← matches nothing
```

The homepage anchor is `id="properties"`, so `#properties/` resolves to no element and the reader lands at the **top** of the homepage rather than the property grid. Not a 404, but it defeats the point of the repoint. `#contact` came out correct.

**Fix:** `https://haveninlipa.com/#properties/` → `https://haveninlipa.com/#properties` in all 5 posts.

### ℹ️ On the catch-all — configured correctly

The catch-all is **not** a blanket 404→homepage redirect. Tested three nonexistent URLs (`/this-page-never-existed-12345/`, `/random-nonsense-abcxyz/`, `/category/fake-category-999/`) — all return a clean **404**. That is the right behaviour; a blanket redirect would manufacture soft-404s, which Google treats as a quality signal against the site. Nothing to change.

**One boundary worth knowing:** the Redirection plugin runs on WordPress and only sees requests to `blog.haveninlipa.com`. It **cannot** redirect `haveninlipa.com/properties` or `/contact` — both still 404 and will stay that way whatever is entered in the plugin. The in-post links are fixed, so the reader-facing leak is closed; but those URLs remain dead for everything else that points at them — external links, the GBP profile, old social posts, LLM citations. That is still the argument for building `/properties` as a real page on the main site.

---

## Read this first: most of it is already fixed

The 8/15 blog pass did the bulk of the work. Of the 21 posts the audit flagged with stale property rates, **17 are corrected** — including both top entry pages (#1 Things to Do and #5 Restaurants both read ₱1,500 / ₱2,800 / ₱4,500 / ₱6,500 today). The old-slug links are largely repointed too.

What follows is the **tail that pass missed**, plus two things it never looked for. Ordered by what actually costs bookings, not by what's easiest to see.

Live rates for reference — verified on the property pages today:

| Listing | Rate | Extra guest |
|---|---|---|
| Cozy 1BR | **₱1,500** | ₱300/guest/night over 3 (max 5) |
| Spacious 2BR | **₱2,800** | ₱300/guest/night over 7 (max 9) |
| Mickey — sleeps 7 | **₱2,500** | ₱400/guest/night over 5 (max 7) |
| Mickey — sleeps 11 | **₱4,500** | ₱400/guest/night over 9 (max 11) |
| Mickey — sleeps 15 | **₱6,500** | ₱400/guest/night over 13 (max 15) |

---

## 🔴 P1 — Five posts send readers to a 404 at the moment of intent

The five biggest evergreens all carry the same footer block, and both of its links are dead:

| Anchor text | Current href | Result |
|---|---|---|
| **Book direct and save ›** | `https://haveninlipa.com/properties/` | 308 → `/properties` → **404** |
| **Message Melody ›** | `https://haveninlipa.com/contact` | **404** |

Affected posts — `15-best-things-to-do-…`, `weekend-getaway-in-lipa-city-…`, `best-restaurants-cafes-…`, `taal-volcano-day-trip-…`, `how-to-get-to-lipa-city-…`.

These are the top entry pages in the July GSC data. #1 and #5 alone took the majority of the month's clicks, and the last thing a reader who scrolled to the bottom of a 3,000-word guide sees is an invitation to book that lands on an error page. This is the single most damaging item in this brief and the cheapest to fix.

**Fix:** it's the same two anchors in all five posts, so one search-replace pass:

```
https://haveninlipa.com/properties/   →   https://haveninlipa.com/#properties
https://haveninlipa.com/contact       →   https://haveninlipa.com/#contact
```

Both anchors are real sections on the live homepage — the property grid and the contact form. Verify one post after editing before doing the other four.

> **Interim, deliberately.** `/properties` *should* be a real page — see the standing recommendation in the audit. Once it exists, these five links repoint there, and the anchor becomes the fallback rather than the destination.

## 🔴 P2 — 13 internal links are corrupting GA4 attribution

Five posts link to the property pages with a tracking parameter still attached from when the copy was drafted:

```
https://haveninlipa.com/properties/cozy-1-bedroom?utm_source=chatgpt.com
https://haveninlipa.com/properties/spacious-2-bedroom?utm_source=chatgpt.com
```

Affected: `work-from-lipa-the-affordable-remote-work-staycation-…` (2), `taal-volcano-day-trip-…` (2), `why-book-direct-instead-of-airbnb-…` (4), `mt-maculot-hiking-guide-…` (3), `weekend-getaway-in-lipa-city-…` (2).

**Why this is worse than it looks.** A UTM parameter on an inbound link tells GA4 to **end the current session and start a new one**, attributed to `chatgpt.com / referral`. So a reader who arrives from Google, reads the article, and clicks through to a property page has their organic session terminated at exactly the click we care about — and if they then book, `booking_confirmed` is credited to ChatGPT, not to organic search.

GA4 only began collecting on 2026-08-09. This is corrupting the fresh baseline from day one, on the precise funnel step the 8/14 pivot exists to measure. Fixing it after we've drawn conclusions about money-page conversion would be much more expensive than fixing it now.

**Fix:** strip `?utm_source=chatgpt.com` from every internal link — the bare URL, nothing replacing it. Internal links should never carry UTMs.

## 🟠 P3 — Three posts still show old property rates

The tail the 8/15 pass skipped:

**`august-long-weekends-lipa-city-2026/`** (#23) — the whole "Where to Stay" ladder:
- sleeps-7 `₱2,400` → **₱2,500**
- sleeps-11 `₱4,200` → **₱4,500**
- sleeps-15 `₱7,000` → **₱6,500**

**`lipa-pilgrimage-guide/`** (#22) — same ladder plus the 1BR:
- Cozy 1BR `₱2,000` → **₱1,500**
- sleeps-7 `₱2,400` → **₱2,500**
- sleeps-11 `₱4,200` → **₱4,500**
- sleeps-15 `₱7,000` → **₱6,500**

**`work-from-lipa-the-affordable-remote-work-staycation-near-manila/`** (#9) — `₱2,000` → **₱1,500** in four places, **one of which is the Yoast meta description** (`"…with 400 Mbps WiFi, starting at ₱2,000/night…"`). That one is an indexed surface: it's what shows in the SERP snippet, so it's advertising a price 33% above the real one to everyone who sees the result without clicking.

> **Leave these alone — they are not property rates.** #23's grocery/café budget table (`₱2,000`, `₱1,800`), #20 Lipa vs Tagaytay's `₱1,800` tolls-and-gas line, and every transport/food/Airbnb-comparison figure. I checked each one individually; a blind find-and-replace on these amounts will corrupt real budget math.

## 🟡 P4 — Eight old-slug links across three posts

These **301 in one hop to a live page**, so nothing is broken for readers — it's a wasted hop and slightly diluted internal linking. Low priority, worth cleaning when the posts are open anyway for P3.

| Post | Old slug in body | Repoint to |
|---|---|---|
| `august-long-weekends-…` (#23) | `casa-de-segunda-lipa-heritage-walk` | `casa-de-segunda-lipa-city` |
| | `what-to-do-in-lipa-city-when-it-rains` | `indoor-things-to-do-in-lipa-city-when-it-rains` |
| | `where-to-pray-reflect-rest-lipa-carmel-cathedral` | `lipa-pilgrimage-guide` |
| `lipa-pilgrimage-guide/` (#22) | `casa-de-segunda-lipa-heritage-walk` | `casa-de-segunda-lipa-city` |
| | `holy-week-getaway-lipa` | `holy-week-in-lipa-city-batangas-a-peaceful-retreat-near-manila` |
| `casa-de-segunda-lipa-city/` (#21) | `what-to-do-in-lipa-city-when-it-rains` | `indoor-things-to-do-in-lipa-city-when-it-rains` |
| | `where-to-pray-reflect-rest-lipa-carmel-cathedral` | `lipa-pilgrimage-guide` |
| | `lipa-barako-coffee-heritage-where-to-drink` | `lipa-barako-coffee-heritage` |

> ⚠️ **Order matters on one pair.** Run `/best-lomi-lipa-city-local-guide/` **before** any rule touching `/best-lomi-lipa-city/` — the dead slug contains the live one as a prefix. Keep the leading and trailing slashes on every rule and the collision can't happen.

> **A note on #21.** It read clean on my first pass and showed all three old slugs on the second — LiteSpeed cache serving different variants. **Purge the LiteSpeed cache before verifying anything in this brief**, or you'll be checking your own stale HTML.

## 🟡 P5 — Install Redirection

The blog runs Yoast **free**, whose redirect manager is Premium-only, and no Redirection plugin is installed (`wp-json` confirms no `redirection/v1` namespace). There is nowhere to enter a 301 when a slug changes, and no 404 log to catch the fallout.

WordPress core's `_wp_old_slug_redirect` is currently covering the eight renames — which is why P4 is amber and not red. But it only works while the old-slug meta survives, it can be lost in a migration or bulk edit, and it tells you nothing when it fails. Install **Redirection** (free) and turn on its 404 log. That log is also how the P1 dead links would have surfaced months ago.

---

## Verification, once applied

Purge LiteSpeed first, then:

1. Open each of the five P1 posts, click **Book direct and save ›** and **Message Melody ›** — both should land on the homepage, not an error page.
2. Search each of the five P2 posts for `utm_` — expect zero hits.
3. Confirm the three P3 posts show ₱1,500 / ₱2,500 / ₱4,500 / ₱6,500 and nothing else, and re-check #9's Yoast snippet preview specifically.
4. In GA4 Realtime, click a blog→property link yourself and confirm the session source stays `google / organic` rather than flipping to `chatgpt.com / referral`.

I'll re-crawl all 23 posts after you've applied this and confirm against the same checks.

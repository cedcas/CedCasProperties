# Haven in Lipa — Blog Technical Specification

> **Last updated:** 2026-09-30 (added [Front-end performance and title length](#front-end-performance-and-title-length-2026-09-30): `hil-seo` 1.1.6 title rule, HIL Performance plugin 1.0.2, LiteSpeed/EWWW settings; blog post PageSpeed mobile 65 → 89). Prior: 2026-09-27 evening (Stay Match: `stay_match_click` finding and the v1.0.2 artifact pending WordPress deploy). Earlier 2026-09-27: (Yoast-era wording marked superseded — `hil-seo` v1.1.5 is the sole SEO output since 2026-09-19; added [Publishing workflow — Owner-approved batches](#publishing-workflow--owner-approved-batches-seo-dec-029-2026-09-27)). Prior: 2026-08-26
>
> This spec covers the WordPress blog at `blog.haveninlipa.com` and how the main rental app integrates with it. Core app infrastructure lives in [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md); SEO / structured data lives in [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md).
>
> **Change history** for every commit (with Type) lives in [HIL Commits](HIL%20Commits.md).
>
> **This spec describes how the blog integration currently works.** For current status (e.g. the open `stay_match_click` diagnostic), see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md). For why the two sites integrate only through public REST APIs, see [HIL_DECISIONS.md](HIL_DECISIONS.md).

## Hosting

`blog.haveninlipa.com` is a **separate WordPress site on Hostinger** (not in this repo). It is hosted alongside the MySQL database and the `haveninlipa.com` domain on Hostinger. The main rental app (on Vercel) reads from the blog's public REST API only — there is no shared database or deploy between the two.

~~The blog runs **Yoast SEO**; its articles are published with their own Yoast `sitemap_index.xml` (separate from the rental app's `sitemap.ts`).~~

**Superseded 2026-09-19 (SEO-DEC-026 / SEO-DEC-027):** the custom **`hil-seo` plugin (v1.1.5)** is the sole SEO output on `blog.haveninlipa.com`. **Yoast SEO is deactivated but kept installed** for rollback (deletion needs separate Owner approval). The blog sitemap is WordPress core's **`/wp-sitemap.xml`** (`/sitemap_index.xml` 301s to it; the virtual robots.txt carries one `Sitemap: …/wp-sitemap.xml` line). Still separate from the rental app's `sitemap.ts`. Governance detail: `docs/HIL_SEO_SPECIFICATION.md` §3.

---

## Blog Integration (WordPress)

The blog at `blog.haveninlipa.com` is a separate WordPress site on Hostinger (not in this repo). The main rental app reads from its public REST API for the dynamic footer.

**Required WP-side plugin: `hil-expose-focuskw`** — single-file plugin that registers `_yoast_wpseo_focuskw` post meta as `show_in_rest: true`. Without it, `meta._yoast_wpseo_focuskw` is not exposed and the footer falls back to post titles (longer, raw). Plugin source lives in a local-only `/blog/` directory (gitignored) and is uploaded directly via WP Admin → Plugins → Upload Plugin. Snippet:

```php
add_action('init', function () {
  register_post_meta('post', '_yoast_wpseo_focuskw', [
    'show_in_rest'  => true,
    'single'        => true,
    'type'          => 'string',
    'auth_callback' => '__return_true',
  ]);
});
```

**Verification URL** (open in a browser, no auth): `https://blog.haveninlipa.com/wp-json/wp/v2/posts?per_page=1&_fields=id,slug,title,meta`. The response should include `meta._yoast_wpseo_focuskw` with a non-empty string for the latest post.

> **Note (2026-09-19 onward):** Yoast is deactivated, but the `_yoast_wpseo_focuskw` post meta survives deactivation, so this plugin and the footer keep working. This dependency is why Yoast is not deleted — `Footer.tsx` must stop reading `_yoast_wpseo_focuskw` before any Yoast deletion (SEO-DEC-026).

---

## Dynamic footer blog links

The "Plan Your Trip" column in the site footer ([src/components/layout/Footer.tsx](../src/components/layout/Footer.tsx)) is an async fetch against the blog's WP REST API:

`https://blog.haveninlipa.com/wp-json/wp/v2/posts?per_page=5&_fields=id,link,title,meta`

- **Labels** prefer the Yoast Focus Keyphrase (Title Cased — small words "in/to/from/of/the/etc." stay lowercase unless first or last); fall back to `title.rendered` (HTML-entity decoded) when the keyphrase is empty.
- **URLs** come from the post's canonical `link` so WP slug changes never break the footer.
- **Caching:** Next.js ISR (`revalidate: 3600`); on any fetch failure, falls back to a hardcoded 5-link list.
- The Focus Keyphrase field is only exposed in the WP REST API because of the `hil-expose-focuskw` plugin (above). If that plugin is deactivated on the blog, the footer transparently falls back to post titles.

`Footer.tsx` itself lives in the main rental app — its file-structure entry is in [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md) → File Structure.

---

## Public property feed — `GET /api/properties.json` (added 2026-08-15)

The footer integration above reads **blog → app**. This feed is the reverse: **app → blog**, so WordPress can render live property data instead of numbers typed into an article months ago.

**Route:** [src/app/api/properties.json/route.ts](../src/app/api/properties.json/route.ts). Public and unauthenticated — same posture as `api/calendar/[slug]`, and it exposes nothing that isn't already on the public property page (no booking, guest, revenue, or availability data; availability stays on `/api/availability/[slug]`).

- **Selection:** `isActive: true` **and** `pricePerNight > 0`, ordered `createdAt desc` — the same gate as the public grid ([Properties.tsx](../src/components/sections/Properties.tsx)) and the sitemap. A ₱0 listing is "not yet configured"; publishing it would put a ₱0 rate in an article and its `/book` URL redirects straight back.
- **Rendering:** statically prerendered with `export const revalidate = 3600`, mirroring the Footer's ISR cadence. Verified as `○ /api/properties.json 1h` in the build output. The handler takes no `request` argument, which is what keeps it static.
- **Response:** `{ count, properties: [...] }` — an envelope, not a bare array, so fields can be added without breaking the consumer.
- **CORS:** `Access-Control-Allow-Origin: https://blog.haveninlipa.com` + `Vary: Origin`. WordPress fetches server-side so this isn't required today; it future-proofs a client-side widget without a CSP change.

**Per property:** `slug`, `name`, `type`, `location`, `url`, `bookUrl`, `pricePerNight`, `includedGuests`, `maxGuests`, `extraGuestFeePerNight`, `priceFrom`, `bedrooms`, `bathrooms`, `featuredImage`, `amenities`, `tagline`, `heroSummary`, `bestForSegments`, `updatedAt`. **Raw numbers, never display strings** — the blog formats.

Three invariants that must survive future edits:

1. **`priceFrom` comes from `extraGuestFeeApplies()`** ([src/lib/occupancy.ts](../src/lib/occupancy.ts)), not a reimplementation. `PropertyCard` prefixes "From" only when that predicate is true (`57ab099`) so flat-price listings don't imply an increase that can't happen. Exporting the boolean is how the blog inherits the rule.
2. **All exposed prose runs through `normalizePricingProse()`**, exactly as `generateMetadata` does. This is not theoretical: at build time **all five** listings had drifted seeded prose (sleeps-15 said ₱7,000 vs a DB value of ₱6,500; cozy said ₱1,800 vs ₱1,500; sleeps-7 ₱2,400 vs ₱2,500; sleeps-11 ₱4,200 vs ₱4,500). A feed that re-exported that drift would defeat its own purpose.
3. **Relative `internalLinkUrl` values in `bestForSegments` are absolutised** against `BASE_URL`. They are authored as site-relative (`/properties/...`) and would 404 on the blog origin.

---

## Stay Match — contextual recommendation plugin (built and installed 2026-08-26; v1.0.2 pending deploy)

Brief: `081526/Stay_Match_Engine_ClaudeCode.md`. Consumes the feed above to replace the static "Where to stay" CTA with a recommendation that names a specific listing and says why it fits the article. WordPress-side only — plugin source is `blog/plugin/hil-stay-match.php` (gitignored, same posture as `hil-expose-focuskw.php`), installed the same way: WP Admin → Plugins → Add New → Upload Plugin, using `hil-stay-match.php.zip`.

**Both of its prerequisites were confirmed clear before this was built:** the feed contract (verified live, matches the brief exactly) and blog remediation P2 — `?utm_source=chatgpt.com` stripped from internal links, closed 2026-08-16 per `Blog_Remediation_Brief_081526.md`'s final verification.

- **Enrollment is per-post and explicit.** A new post-meta field, `_hil_stay_intent` (meta box in the post editor sidebar, `show_in_rest: true`), holds a short free-text phrase describing the trip (e.g. `"barkada 12 to 15 people"`). **Empty = not enrolled — the post renders exactly as it does today.** This is deliberately how the pilot-only rollout constraint is enforced: expanding beyond articles #27/#28/#29 is "set the field on more posts," not a code change. No taxonomy/category fallback is implemented — the explicit field is the only signal, on the judgment that a short authored phrase scores far more reliably than inferring intent from categories (`uncategorized` is a live category on this blog).
- **Scoring is token-overlap against the live `bestForSegments` copy**, not a fixed intent→property lookup table. Intent phrase and each segment's title (3x) + body (1x) are tokenized (lowercased, alnum, stopword-stripped, numbers kept when ≤2 digits so group sizes like "7"/"11"/"15" count), matched by substring rather than exact equality so "couple"/"couples" etc. still hit without a stemmer. Verified against the live feed on 2026-08-26 — `"barkada 12 to 15 people"` correctly separates the three Mickey configurations (sleeps-15 scores 1.0 vs sleeps-11's 0.42) because the group-size numbers are the actual discriminator, not the word "barkada" alone, which appears in two properties' segment titles. **This is why the meta box's helper text tells the author to include group-size numbers** — omitting them (e.g. plain `"barkada"`) lets ties fall through to the two-option tier instead of a confident single pick, which is safe but weaker than it could be.
- **Confidence gate, per the brief:** ≥0.7 with a ≥0.15 margin over the second-best property → single pick with the winning segment's body as the stated reason; ≥0.4 → two options, lighter framing; below that → the full 5-property ladder, dynamically priced from the feed. **Thresholds are a first-pass heuristic**, not tuned — the brief expects retuning after a month of `stay_match_click` → `booking_confirmed` data by confidence band, and this build doesn't pre-empt that.
- **Feed fetch is server-side and cached**, mirroring the feed's own 1h `s-maxage`: a `wp_transient` (1h) backed by a permanent `wp_option` snapshot that only updates on a successful fetch, so an outage serves the last known-good data rather than nothing. Only if the snapshot has **never** been populated (fresh install, first fetch fails) does it fall to a hardcoded, price-free 5-link ladder — no price is ever hardcoded in the plugin itself, so this last-resort path can't drift the way a cached number could.
- **Events:** `stay_match_view` (fires once, `IntersectionObserver` at 0.5 threshold) and `stay_match_click` (`destination`: `property`|`book`), both carrying `confidence`, `intent`, `post_slug`, `property`. `track()` mirrors the Next.js app's helper (host check, `debug_mode` off-prod) rather than inventing a second pattern, firing through `window.gtag` — confirmed already present on `blog.haveninlipa.com` via Site Kit, same Measurement ID (`G-2SV2PXYB7T`) as the main site.
- **Injection point:** `the_content` filter, right after the first `</h2>` (falls back to prepending if a post has none) — matches the existing editorial convention from `070426/Conversion_Fix_2_Blog_to_Booking_Funnel.md` of placing the "Where to stay" callout above the fold of value rather than at the end.

**Installed and live on `blog.haveninlipa.com` as of 2026-08-26.** #27's intent field is set to `"barkada of 9"` — **not** `"barkada 12 to 15 people"` as first guessed from an unrelated article's entry in the old intent-mapping doc (`070426/Conversion_Fix_2_Blog_to_Booking_Funnel.md`, which was written for article #23, not #27). Reading #27's actual draft (`053126/27-barkada-getaway-lipa-whole-house.md`) shows the whole article is built around a 9-person group and the Spacious 2BR's ₱2,800÷9≈₱311/head math — Mickey sleeps-15 is only a "bigger crew" aside near the bottom. Verified against the live feed: `"barkada of 9"` → confidence 1.0 → `spacious-2-bedroom`, confirmed rendering correctly on the live post.

**#28 and #29 deliberately left unenrolled.** Both are hub/multi-audience articles (couples vs. families vs. groups, each pointed at a different property in the article's own existing CTA) rather than single-intent like #27 — forcing one intent phrase onto them risks a confidently-wrong pick, which the brief calls worse than no recommendation. Their own publish dates are Sep 14 and Sep 21 respectively (see the scheduling note below), so there's no pressure to decide today.

**⚠️ #27's actual scheduled publish date may not be Aug 31.** The original brief (`Stay_Match_Engine_ClaudeCode.md`) says Mon 8/31. But #27's own draft file's metadata table says **Mon Sep 7** — "first open weekly slot after #26 (Aug 24) **and the R1 refresh (Aug 31)**," i.e. Aug 31 is explicitly stated as taken by something else. #28/#29's drafts say Sep 14 / Sep 21 respectively, one week after what the original brief implied for each. Confirm the real scheduled timestamp in wp-admin (Posts → #27 → scheduled date) before treating Friday as a hard wall.

**Known issue, fixed 2026-08-26 (`v1.0.1`):** the initial `stay_match_click` handler fired `gtag()` and let the `<a href>` navigate immediately — on a full-page-load link (not a SPA), the browser can tear the page down before the beacon actually sends, so the event was silently lost on click-through even though the card rendered and the click worked. Confirmed via DevTools: the only `collect` hit visible after clicking was the *destination* page's own automatic `page_view`, not `stay_match_click`. Fixed using gtag's own documented pattern for exit-tracking — `event_callback`/`event_timeout` delay navigation up to 500ms, with a JS-side `setTimeout` fallback so a blocked or slow beacon (ad blockers commonly eat these) never traps the click. `stay_match_view` was unaffected — it doesn't involve navigation.

**Diagnostic history, as of 2026-08-26 — `stay_match_click` still unconfirmed even after `v1.0.1`.** Live debugging with Cedric on the actual post ended mid-session with the bug still open. Ruled out so far: page-load JS errors (none), `window.gtag` (confirmed a function, so gtag.js itself is loaded), LiteSpeed cache serving a stale pre-fix script (confirmed purged, plugin confirmed updated to `v1.0.1` in wp-admin). Still only a single `collect` request appears after a click — the destination page's own automatic `page_view` — never a distinct `stay_match_click` hit. Two diagnostic console commands remain the next step:
1. `document.querySelectorAll('[data-analytics="stay_match_click"]').length` on the article page — should be `2`; if `0`, something (likely a LiteSpeed JS/HTML optimization feature) is stripping the `data-*` attributes or the whole block before it reaches the browser, which would mean the bug is WP-side, not in the plugin's JS logic.
2. A manual `window.gtag('event', 'manual_test', {event_callback, event_timeout: 500})` in the console — if this also fails to produce a `collect` request, something is blocking analytics transport generally from that browser/session (extension, consent mode), unrelated to this plugin's code.

**Separate, unrelated finding surfaced during this debugging:** a **React hydration error (minified #418)** fires in the console on `haveninlipa.com/properties/spacious-2-bedroom/book` (main Next.js app, not the blog) after navigating there from the blog link. Worth a look independent of Stay Match.

**Finding, 2026-09-27 — the two console diagnostics above are superseded.** HIL PM confirmed on the live HTML of an enrolled post that the widget (`data-analytics` attributes intact) and footer script render exactly as in the v1.0.1 source, and that gtag on the blog is a **plain snippet in the theme head** (`gtag('config','G-2SV2PXYB7T')`, not Site Kit as stated above), with no LiteSpeed JS delay. GA4 shows `stay_match_click` only on 2026-08-27 (8 events, 1 user, pagePath `/`), so the event can fire. Code review found no defect that would suppress real readers' clicks. Proven vs inferred, and the numbers, are in [HIL_SEO_SPECIFICATION.md §13](HIL_SEO_SPECIFICATION.md). In short: ~14 real viewers make 0 clicks unremarkable, and the pagePath-`/` views/clicks are most likely **editor previews** (`/?p=<id>&preview=true`: `is_singular('post')` is true there, and GA4's pagePath drops the query) — inferred, not verified.

**v1.0.2 (2026-09-27) — artifact only, NOT deployed:** `content/seo/runs/092726/hil-stay-match.php` + `Stay_Match_v1.0.2_Deploy_Note.md` (in git, unlike `blog/`). Cedric uploads it (Plugins → Upload → replace, then purge LiteSpeed + Hostinger CDN). Changes:
- `hil_sm_link()` appends `?hil_sm=<property|book>&hil_sm_post=<post_slug>` (`add_query_arg`) to **every** Stay Match href. The main site records `stay_match_arrival` on landing and strips the params ([Website spec → GA4 Analytics Events](HIL%20Website%20Technical%20Specification.md)), which gives a landing-side confirmation that doesn't depend on the blog-page beacon. Not UTMs: UTMs would start a new GA4 session and overwrite the reader's real source.
- Views/clicks on previews or unpublished posts get `debug_mode` + `traffic_type: 'internal'`; logged-in editors (`body.logged-in`) get `traffic_type: 'internal'`. Both are detected client-side so a cached page can't carry another visitor's flags. Tagged, not dropped: they only leave reports once the GA4 filters are Active.
- Click handler: text-node `e.target` guard before `closest()`, non-primary/modified clicks, `#` links and `defaultPrevented` fall through to the browser, `transport_type: 'beacon'`. `stay_match_click` name and params unchanged.
- Rollback: re-upload v1.0.1; the main site ignores missing params.

Current status of both open items (who's doing what next) is tracked in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md), not here. Also still open: confirm #27's actual scheduled publish date in wp-admin (Sep 7 per the draft's own metadata vs. Aug 31 per the original brief — see above).

---

## Blog content audit — 2026-08-15

Chasing a single GSC "Redirect error" surfaced a systemic problem: **article slugs were renamed without updating anything that pointed at them.**

**Findings across all 24 posts in `post-sitemap.xml`:**

| Issue | Scale |
|---|---|
| Dead internal slugs (hard 404, no redirect) | 7 slugs, 12 in-body links, 6 articles |
| Stale hardcoded property rates | 21 of 24 posts |
| Dead main-site links | `haveninlipa.com/properties/` (308 → `/properties` → 404) and `/contact` (404), 5 posts each |
| Property slugs linked from blog | all 5 valid ✅ |

**Slug map (old → live):** `best-lomi-lipa-city-local-guide` → `best-lomi-lipa-city`; `casa-de-segunda-lipa-heritage-walk` → `casa-de-segunda-lipa-city`; `lipa-barako-coffee-heritage-where-to-drink` → `lipa-barako-coffee-heritage`; `what-to-do-in-lipa-city-when-it-rains` → `indoor-things-to-do-in-lipa-city-when-it-rains`; `coming-soon-disney-inspired-family-house-lipa` → `mickey-in-lipa-coming-soon`; `holy-week-getaway-lipa` → `holy-week-in-lipa-city-batangas-a-peaceful-retreat-near-manila`; `where-to-pray-reflect-rest-lipa-carmel-cathedral` → `lipa-pilgrimage-guide`; `mt-maculot-hiking-guide-2026-cuenca-rockies` → `mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa`.

> ⚠️ When search-replacing these, run `/best-lomi-lipa-city-local-guide/` **before** any rule touching `/best-lomi-lipa-city/` — the dead slug contains the live one as a prefix. Keeping leading/trailing slashes prevents the collision.

**Stale rates (the old seed values):** `₱2,000`→`₱1,500` (21 posts), `₱2,400`→`₱2,500` (15), `₱4,200`→`₱4,500` (15), `₱7,000`→`₱6,500` (14). `₱2,800` is correct everywhere — that rate never changed. Other amounts in the articles are transport/food/Airbnb-comparison math and must be left alone.

**Root-cause gap:** the blog runs **Yoast free**, whose redirect manager is Premium-only, and **no Redirection plugin is installed** (`wp-json` namespaces confirm: no `redirection/v1`). There is therefore nowhere to enter a 301 when a slug changes, and no 404 log to catch the fallout. Installing **Redirection** (free) with its 404 log is the durable fix; without it this recurs on every rename. *(Historical as of 2026-08-15. Yoast is deactivated since 2026-09-19, and a Redirection rule is part of the 2026-09-19 sitemap cutover sequence — see SEO-DEC-026.)*

**The `mt-maculot` case is instructive:** no blog article linked to it — it was referenced only from the *app's* `bestForSegments` on three properties, so it never showed up in a blog-side check. Cross-surface links need cross-surface auditing. Fixed in prod and in both seed files (see [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md) → SEO seed commands).

**Stack fingerprint (2026-08-15):** *(historical — since 2026-09-19 Yoast SEO is deactivated and `hil-seo` v1.1.5 is the SEO plugin)* WordPress 7.0.4, Yoast SEO (free), LiteSpeed Cache, Site Kit by Google, EWWW Image Optimizer, YARPP, Hostinger tooling. Theme content container is `.post-content` (**not** `.entry-content` — relevant when scripting any audit).

---

## Publishing workflow — Owner-approved batches (SEO-DEC-029, 2026-09-27)

Decided by Cedric 2026-09-27 ([HIL_DECISIONS.md](HIL_DECISIONS.md) → SEO-DEC-029, amending SEO-DEC-010 for approved batches). First used in one-time form for #38–41 (posts 847–850) on 2026-09-25 — see [HIL_COMPLETION_LOG.md](HIL_COMPLETION_LOG.md).

1. **Owner approval first.** Nothing is scheduled until Cedric approves the batch. Anything not approved is created as a **draft** (SEO-DEC-010 default). The SEO-DEC-006 content freeze on new articles #30+ applies separately — approval of a batch does not by itself lift it.
2. **Create as scheduled posts via REST.** Using the Editor Application Password, create each approved article with status `future`, scheduled **08:00 `Asia/Manila`** (UTC+8, i.e. `date_gmt` 00:00) on its slot date. Reuse existing categories/tags only — never Uncategorized, never create terms. Featured images carry HIL / HavenInLipa.com branding.
3. **Verify via REST** (re-fetch each post): status `future`, `date`/`date_gmt`, categories/tags, and the SEO fields via the authenticated `hil-seo` preview. While a post is `future`, the preview canonical shows `…/?p=<id>` — expected; it becomes the slug URL on publish.
4. **At publish time:** purge LiteSpeed and the Hostinger CDN, then recheck the live URL, canonical and `/wp-sitemap.xml` entry.

---

## Front-end performance and title length (2026-09-30)

All of this is live on `blog.haveninlipa.com`, uploaded or configured by the Owner on 2026-09-30. Measured on `/solo-travel-guide-lipa/` with PageSpeed mobile:

| | Score | First Contentful Paint |
|---|---|---|
| Before | 65–67 | 3.9 s |
| After | 89 (3 of 4 runs; the first run after a purge was 69) | — |

### `hil-seo` 1.1.6: title suffix only when it fits
- **Rule:** `hil_seo_fit_title()` in `includes/seo-title.php` drops the trailing ` - Haven in Lipa Blog` from post/page `<title>`, `og:title` and `twitter:title` when the full title would exceed 60 characters (filter: `hil_seo_title_max_length`).
  - It applies to the `hil_seo_title` override as well, because the Yoast backfill stored the suffix inside overrides.
  - Length is measured on decoded text.
  - Blog index, archive titles, canonicals and everything else are unchanged.
- **Result:** all 29 posts lost the suffix. 26 are still over 60 characters on their own text; shortening those is an editorial task through each post's SEO title field.
- **Source and rollback:** `content/seo/runs/093026/hil-seo-plugin.zip`. Roll back with the 1.1.5 zip in `runs/090726/`.

### HIL Performance plugin (1.0.2): Font Awesome off the critical path
- **Why:** the theme (`haveninlipa-blog`, source not in this repo) loads the full Font Awesome 6.5.0 CSS from cdnjs, for about 14 icons per page.
- **What it does:** `content/seo/runs/093026/hil-performance/hil-performance.php` hooks `style_loader_tag` (priority 999) to drop the `font-awesome` handle's `<link>` at print time. It then prints a `data-no-optimize` inline loader (media=print + onload swap) once, at `wp_head` priority 99, with a footer fallback.
- **Rollback:** deactivate the plugin and purge both caches.
- **Gotchas found the hard way:**
  1. **Dequeuing on `wp_enqueue_scripts`@100 is too early.** The theme enqueues Font Awesome later (1.0.0 and 1.0.1 failed this way). Filter the printed tag instead.
  2. **LiteSpeed CSS Combine also combines `<link>`s inside `<noscript>`.** That is why 1.0.1 removed the noscript fallback.
  3. **Proof test:** the combined CSS's filename hash (`/wp-content/litespeed/css/<hash>.css`) only changes when the set of combined stylesheets changes. An unchanged hash after a "fix" means the stylesheet is still being combined. After 1.0.2 it went from `bf1f75098…` to `b4fdf9ed…`, and from 155 KB to 52 KB.

### Cache and lazy-load configuration (Owner-set 2026-09-30)
- **LiteSpeed Cache → Page Optimization:**
  - **CSS Minify ON** and **CSS Combine ON**, which produces one combined, render-blocking stylesheet.
  - **Load CSS Asynchronously / UCSS OFF.**
  - **Lazy Load Images OFF.**
  - **Add Missing Sizes ON.**
  - **Font Display Optimization: Swap.**
  - **Load Google Fonts Asynchronously ON.** This adds LiteSpeed's `webfontloader.min.js`, about 550 ms render-blocking. Measuring ON against OFF is an optional follow-up.
- **EWWW Image Optimizer** is now the **only** image lazy-loader, with the exclusion `size-haveninlipa-featured`, so the post hero image (the LCP element) loads eagerly with the theme's `fetchpriority="high"`.
  - The blog had two lazy-loaders (EWWW and LiteSpeed). Excluding the hero in only one of them just hands it to the other.
- **Gotchas:**
  - The class to exclude is `size-haveninlipa-featured`. `wp-post-image` would also match related-post thumbnails.
  - Hostinger's bot protection returns 403 to headless Chrome (local Lighthouse) from a developer machine, and after heavy crawling it also 403s that IP's requests for blog CSS and image files. Measure with pagespeed.web.dev instead. Google's own crawlers and PageSpeed are not affected.

---

## SEO relationship

Blog articles are part of the overall search strategy (internal linking, backlinks, keyword targeting) but are authored and indexed on the WordPress side, outside this codebase. SEO planning docs and the structured-data implementation for the rental app are in [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md).

# Haven in Lipa — SEO Technical Specification

> **Last updated:** 2026-09-27 (`/weddings-accommodation` SEO rework — title/meta, H1/H2, FAQ 7→9, pilgrimage link removed; PR against `dev`, not yet merged/deployed). Earlier the same day: blog-sitemap wording updated for the 2026-09-19 `hil-seo`/Yoast cutover — `hil-seo` v1.1.5 is the blog's sole SEO output; Yoast deactivated. Prior: 2026-08-31
>
> This spec covers SEO and structured-data implementation for the rental app (sitemap, canonicals, JSON-LD, the property-page schema builder, image alt text, and conversion measurement). Core app infrastructure lives in [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md); the WordPress blog integration lives in [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md).
>
> The `Property` SEO JSON columns these features read from are defined in the Prisma schema — see [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md) → Database Schema → **Property**.
>
> **Change history** for every commit (with Type) lives in [HIL Commits](HIL%20Commits.md).
>
> **This spec describes how SEO/structured-data currently work.** For current status, see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md). For why (e.g. why these pages carry only `FAQPage` schema, why build→repoint→redirect is the sequencing rule), see [HIL_DECISIONS.md](HIL_DECISIONS.md).

## SEO / Structured Data

Implementation of the May 8 2026 NetCoreSolutions audit. Owner-driven items (Google Business Profile review flow, backlink outreach, blog publishing on `blog.haveninlipa.com`) live outside this codebase.

**Sitemap** ([src/app/sitemap.ts](../src/app/sitemap.ts)) — homepage (priority 1.0, daily), `/properties` (priority 0.9, weekly), `/staycation` (priority 0.9, monthly), all `isActive` properties (priority 0.8, weekly), `/weddings-accommodation` (priority 0.8, monthly), `/faq` and `/about` (priority 0.6, monthly), `/privacy` and `/terms` (priority 0.3, yearly). ~~Blog articles live on `blog.haveninlipa.com`'s own Yoast `sitemap_index.xml`.~~ **Superseded 2026-09-19:** blog articles live on `blog.haveninlipa.com`'s WordPress core sitemap **`/wp-sitemap.xml`** (`/sitemap_index.xml` 301s to it).

**Blog SEO output (since 2026-09-19, SEO-DEC-026 / SEO-DEC-027).** On `blog.haveninlipa.com` the custom **`hil-seo` plugin v1.1.5** is the sole SEO output (titles, meta descriptions, canonicals, robots/noindex, schema, sitemap filters). **Yoast SEO is deactivated but kept installed for rollback**; deletion needs separate Owner approval and first requires `Footer.tsx` to stop reading `_yoast_wpseo_focuskw`. The virtual robots.txt carries one `Sitemap: …/wp-sitemap.xml` line. This spec still covers only the rental app's own SEO; blog-side governance is in `docs/HIL_SEO_SPECIFICATION.md` §3 and [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md).

**Canonical tags** — root layout sets `metadata.alternates.canonical = "/"` as default. Per-page overrides on `/privacy`, `/terms`, `/faq`, `/about`, `/properties`, and the property pages (via `generateMetadata`) emit explicit absolute canonicals via `metadataBase`. Resolves www → non-www ambiguity Google was flagging in brand SERP.

> **Metadata inheritance gotcha (App Router).** Page-level `generateMetadata`/`metadata` does **not** cascade to nested route segments — only *layout* metadata does. A nested page with no metadata export and no intervening `layout.tsx` therefore falls all the way back to the **root layout**, inheriting the homepage canonical `/`, homepage title, and homepage `og:url`. This bit the `/book` segment (see below); watch for it on any future nested route.

**`/book` route — noindex + self-canonical (2026-07-04, `36fa136`).** The booking-form segment [src/app/properties/[slug]/book/page.tsx](../src/app/properties/[slug]/book/page.tsx) had no metadata and no `layout.tsx` between it and the root layout, so all three Mickey `/book` URLs served the homepage `<head>` (canonical `/`, homepage title, homepage `og:url`); two had been indexed as thin duplicate-canonical endpoints. Fixed by adding `generateMetadata` to the book segment: `robots: { index: false, follow: true }` (**noindex, follow** — drop from index, keep link equity flowing to the parent property page), self-canonical `/properties/[slug]/book` (overrides inherited `/`), and a per-route title `Book — {name}` + matching `og:url`. **Mechanism = Next.js Metadata API** (server-rendered, emits a real crawlable `<meta name="robots">`), *not* an `X-Robots-Tag` header and *not* a robots.txt `Disallow` — the already-indexed pages must stay crawlable so Googlebot can see the noindex. Mirrors the in-repo precedent at [src/app/pay/[token]/page.tsx](../src/app/pay/[token]/page.tsx) (`robots: { index: false, follow: false }`). Parent property pages are untouched (stay `index,follow` with their VacationRental JSON-LD). Post-deploy: URL-Inspect + Request Indexing on `sleeps-7/book` and `sleeps-15/book` so Google re-crawls and drops them.

**Structured Data (JSON-LD) summary:**

| Page | Schemas emitted |
|---|---|
| Root layout (every page) | `LocalBusiness` (name, description, url, email, telephone, image, logo, priceRange, openingHours, address with streetAddress + postalCode, contactPoint, sameAs) |
| `/faq` | `FAQPage` (14 Q&A from [src/lib/faqs.ts](../src/lib/faqs.ts)) |
| `/about` | `Person` (Melody) with `birthPlace` + `homeLocation` + `knowsLanguage` + `worksFor` → LocalBusiness |
| `/staycation` | `FAQPage` only — the one rich result available to this site. Same one-block-one-type shape as `/weddings-accommodation`. |
| `/weddings-accommodation` | `FAQPage` **and nothing else** — no `EventVenue`, no `Event`, no `BreadcrumbList`. See the positioning rule below: any venue-implying type is a claim we cannot support, and keeping the page to one block makes the rule checkable at a glance. |
| `/properties` | `@graph` of `ItemList` (summary-page form — `position` + `name` + `url` per listing, `numberOfItems`) + `BreadcrumbList` (Home → Our Homes). **No `Offer`/`priceSpecification`** — same reason as the property pages. The `ItemList` is omitted entirely when the query returns nothing, rather than emitted as `numberOfItems: 0`. |
| `/properties/[slug]` | `@graph` of `VacationRental` (additionalType `"House"`, identifier, name, description, url, telephone, **direct latitude/longitude strings** + nested geo, image[], address with streetAddress + postalCode, brand, tourBookingPage, priceRange, knowsLanguage, checkinTime/checkoutTime **with `+08:00` offset**, containsPlace→Accommodation with additionalType `"EntirePlace"`/bed[]/occupancy/numberOfBedrooms/numberOfBathroomsTotal/amenityFeature[], aggregateRating, review[]) + `FAQPage` (per-property Q&A). **No `makesOffer`/`Offer`** — Google's VR spec has no on-page Offer; price is carried by `priceRange` only. |
| Homepage | LocalBusiness only (FAQPage moved to `/faq` to avoid duplicate-schema confusion) |

The property-page JSON-LD builder is [src/lib/property-schema.ts](../src/lib/property-schema.ts). **It follows Google's canonical [VacationRental example](https://developers.google.com/search/docs/appearance/structured-data/vacation-rental), which diverges from generic schema.org — match that doc, not schema.org.** It pulls structured content from the `Property` SEO fields, parallel-queries up to 8 active testimonials for `review` entities, parses `housePolicies.checkInTime`/`checkOutTime` strings ("2:00 PM onwards", and hour-only forms like "3 PM") into ISO 8601 times via `parseTimeToIso()`, then **always emits `checkinTime`/`checkoutTime` with the PH `+08:00` offset** (`PH_UTC_OFFSET`), falling back to a site default (`14:00:00`/`12:00:00`) when a property has no parseable time — Google rejects zoneless times. It conservatively infers `petsAllowed` from `housePolicies.pets` via `parsePolicyToBool()` (omitting when ambiguous), emits **direct `latitude`/`longitude` string props** (required by Google) plus a nested `geo`, and falls back to a Lipa City geo (13.9411, 121.1638) when explicit per-property coords are absent. **No `makesOffer`/`Offer`/`priceSpecification` is emitted** — Google's VR spec has none (price comes from a Hotel Center feed); emitting an Offer triggered "invalid itemtype" + "invalid object type for priceSpecification" critical errors, so price is carried by `priceRange` only. Per-property bed configuration lives in a `BEDS_BY_SLUG` lookup at the top of the same file — keyed by slug for all 5 properties (`cozy-1-bedroom`, `spacious-2-bedroom`, and the 3 Mickey configs added 2026-06-18). Slugs without an entry simply emit no `BedDetails` (no crash). If this lookup keeps growing, lift it into a `Property.beds` JSON column. Validates clean (0 critical) against Google's [Rich Results Test](https://search.google.com/test/rich-results) and GSC URL Inspection as of 2026-06-25.

**`additionalType` field — resolved 2026-06-25 (was previously omitted).** Earlier attempts flagged a Catch-22 (validator rejected both schema.org URLs and bare strings). The fix was to use Google's **own vacation-rental enum values as plain strings**: `additionalType: "House"` on the `VacationRental` and `additionalType: "EntirePlace"` on the `Accommodation` inside `containsPlace`. These validate clean. Valid enum values per Google's doc: `Apartment`, `Bungalow`, `Cabin`, `Chalet`, `Cottage`, `Gite`, `HolidayVillageRental`, `House`, `Villa`, `VacationRental` (rental level) and `EntirePlace` etc. (accommodation level) — **never** a `https://schema.org/...` URL.

**Rich result is EAP-gated — will never render for this site.** The Vacation rental rich result requires Google's invite-only Early Adopters Program (Hotel Center + a Technical Account Manager). HIL's prior enrollment attempt 404'd; re-checked 2026-06-25 the interest form ([services.google.com/fb/forms/googlevacationrentalsinterestform](https://services.google.com/fb/forms/googlevacationrentalsinterestform/)) is live again, but acceptance for a 5-listing direct-booking site is a long shot. **The VacationRental schema warnings in GSC are enhancement-only and were never indexing blockers** ("Page can be indexed" stays green). Payoff of keeping the markup clean is GSC hygiene + AI/LLM-search signal, not a rich card. The remaining non-critical `review` / `aggregateRating` warnings were cleared on the three Mickey listings on **2026-08-15** once real guest reviews existed — see SEO seed commands → review aggregates. **This still will not produce star ratings in search results**: the VacationRental rich result stays EAP-gated, and self-serving first-party reviews don't earn review snippets.

**robots.txt — `/admin` prefix fix (2026-08-15).** [src/app/robots.ts](../src/app/robots.ts) previously disallowed `/admin/` and `/api/` **with trailing slashes**. robots.txt matching is a plain prefix, so `/admin/` did not cover the bare `/admin` — leaving it crawlable, and it 307s to `/admin/login`, which robots *does* forbid. That is a redirect into disallowed space that Googlebot cannot resolve. Now `disallow: ["/admin", "/api"]`, which covers both forms. **This was not the cause of the GSC "Redirect error"** (that turned out to be a WordPress slug rename on `blog.haveninlipa.com` — see [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md) → Blog content audit), but it is a genuine crawl-hygiene defect fixed on its own merit. Note `/api` remains robots-disallowed while `/api/properties.json` is consumed server-side by WordPress, which does not consult robots.txt — same arrangement as the Airbnb iCal fetch on `/api/calendar/[slug]`.

**Property page template** ([src/app/properties/[slug]/page.tsx](../src/app/properties/[slug]/page.tsx)) — 10 sections, ~1,500–1,800 words per property when fully seeded. Sections render conditionally so the page works fine on partially-seeded properties.

**Image alt text** — [src/components/ui/PropertyGallery.tsx](../src/components/ui/PropertyGallery.tsx) accepts an optional `imageAlts[]` prop parallel to `images[]`; falls back to `${name} vacation rental in ${location}, Batangas — image ${i+1}` when not provided. Replaces the prior "photo 1, photo 2" pattern the audit flagged.

**Audit-prepared content** lives at `/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo/content for HavenInLipa/050826/` — translated into structured JSON shapes by [prisma/seed-property-seo.ts](../prisma/seed-property-seo.ts). Idempotent; safe to re-run after content updates.

**⚠️ Gotcha — new listings start SEO-bare.** All of the above rich content lives in the `Property` SEO JSON columns, which are **only ever populated by these slug-keyed seed scripts**. The admin "New Property" form and `POST/PATCH /api/admin/properties` do **not** touch any SEO field. A listing created through admin (e.g. the 3 "Mickey in Lipa" configs created 2026-06-18) therefore renders with none of the best-for / what's-inside / neighborhood / house-rules / FAQ / hero / tagline / meta signals until its content is hand-authored into a seed and run. The Mickey content lives in [prisma/seed-property-seo-mickey.ts](../prisma/seed-property-seo-mickey.ts) (slugs `mickey-in-lipa--family-staycation--sleeps-7`, `--family-house--sleeps-11`, `--full-family-house--sleeps-15`). Until the SEO fields become admin-editable, **every future listing needs the same manual seed step.**

**⚠️ Seeded `seoDescription` is no longer served verbatim (2026-08-08, `0c0133e`).** `normalizePricingProse()` from [src/lib/occupancy.ts](../src/lib/occupancy.ts) now runs **inside `generateMetadata`** in [src/app/properties/[slug]/page.tsx](../src/app/properties/[slug]/page.tsx) — so the rendered `<meta name="description">` is the seeded string *after* rewriting. It forces base-rate and included-guest numbers in authored prose to the live `pricePerNight` / `includedGuests` values, and replaces vague "additional charges may apply" wording with the real figures.

Consequences for SEO work:
- A seeded description can **differ from what Google indexes**. When diffing SERP snippets against seed content, compare against the rendered page (View Source), not the DB row.
- It is a safety net, not a licence to leave stale prices in seeds — fix the seed too, or the two drift apart silently.
- The same normalization is applied to rendered body copy and to `propertyRules` on both the property page and `/book` (`sanitizeChargeProse`). JSON-LD is **not** affected — [property-schema.ts](../src/lib/property-schema.ts) builds from the structured SEO columns, not the prose.
- [scripts/audit-vague-charges.ts](../scripts/audit-vague-charges.ts) is a read-only report of DB rows still carrying vague charge language, so the source data can be brought in line with what renders.

---

### `/properties` inventory index — new route (2026-08-16, `9a8e47c`)

[src/app/properties/page.tsx](../src/app/properties/page.tsx). `/properties` was a **hard 404** while looking like a real path, and `/properties/` 308'd into it. It was linked from the five biggest blog evergreens until 2026-08-16 (repointed to `/#properties` as an interim fix) and remains linked from surfaces outside our control: external sites, the GBP profile, old social posts, LLM citations. The site also had no inventory index at all — the property grid existed only as a homepage section. It is additionally the fallback surface for the Stay Match engine's `<0.4` confidence tier.

Page copy comes from the audit deliverable `081526/MoneyPage_02_Properties_Index.md`, rendered against live DB values rather than the draft's literals.

- **Data source: Prisma, directly.** *Not* a server-side fetch of `/api/properties.json`, which the draft specified — that feed exists to cross an origin boundary for WordPress, and the app self-fetching its own route buys a network hop and a failure mode for nothing. Same gate as the public grid, the sitemap and the feed: `where: { isActive: true, pricePerNight: { gt: 0 } }, orderBy: { createdAt: 'desc' }`, so the surfaces cannot disagree.
- **`export const dynamic = "force-dynamic"`, never `revalidate`** — same precedent as `2dc488b` on the feed route: `revalidate` runs the Prisma query at *build* time, which fails CI (no database in the lint/build workflow) and can bake a transient DB error into a static asset. **Caching is on the query, not the response** (`unstable_cache`, 1 h — see the note below); the original `next.config.ts` `Cache-Control` approach was removed in `c2c5e6b` because it does not work for a page on Vercel.
- **Rendering.** [PropertyCard](../src/components/ui/PropertyCard.tsx) gained a `variant` prop — `teaser` (default, the homepage grid, unchanged) and `index` (linked name, `Sleeps up to N · N bedrooms · N baths`, "rate covers N", tagline, and a second CTA). The "From" prefix still comes from `extraGuestFeeApplies()`, and the tagline through `normalizePricingProse()`, so this page cannot drift from the property pages or the feed.
- **Analytics.** Two CTAs per card carrying the existing markup hooks: `check_availability` → `/properties/[slug]#book`, `book_click` → `/properties/[slug]/book`. The card's `<h3>` links to the plain property page, which is the draft's "See the home" affordance without a third undefined event.
- **Derived, not hardcoded.** Title count, description variant, the "five homes" prose, the group-size table's guest maximums, the FAQ's occupancy range, and the Stripe percentage (from `STRIPE_FEE_RATE`) all render from live values. Short display names for prose contexts are derived from `Property.name` by stripping the post-pipe SEO suffix, falling back to the second segment when the first is ambiguous — which is what keeps the three Mickey configurations distinguishable.
- **Degraded state.** A DB error renders the page copy plus a contact prompt and still returns **200** — never an empty grid, never a throw. This URL is linked from places we cannot edit, so a bad minute must not resurrect the 404 it replaces.
- **Deliberately omitted:** drive times to the named landmarks (the deliverable flags them VERIFY-with-Melody-or-Wilma; estimating them trades away the local accuracy the page's advantage rests on) and links to `/staycation` and `/weddings-accommodation`, which are drafted but not built — linking them would recreate exactly the link rot this page fixes. *(Updated 2026-08-17: the drive times were verified with the owner on 2026-08-16 and now render on `/weddings-accommodation`, which is also live and linked from "By occasion". They are still absent from this page. `/staycation` remains unbuilt and unlinked.)*

> ### ⚠️ A page cannot set its own `Cache-Control` on Vercel (2026-08-16, `c2c5e6b`)
>
> `/properties` and `/about` shipped with `force-dynamic` plus a `Cache-Control: public, s-maxage=3600` entry in `next.config.ts`, mirroring what `/api/properties.json` does. **Production verification showed the edge cache was never active** — both URLs returned `cache-control: private, no-cache, no-store` with `x-vercel-cache: MISS` on every request, so each page view ran a Prisma query against Hostinger.
>
> A **Route Handler** sets its own response headers and they survive (which is why the feed works). An App Router **page** cannot, and the `next.config.ts` header loses to the framework's own no-store for a dynamic route. `next start` locally *did* serve the configured header — that is precisely what made this a false positive in pre-deploy testing, so **check this one against production, not a local production build.**
>
> The fix caches the *query* (`getPublicListings` / `getPublicListingCount` in [src/lib/listings.ts](../src/lib/listings.ts), `unstable_cache`, 1 h). Same DB-load outcome, no build-time execution. Bonus: a DB blip inside the window is now invisible to visitors — verified by restarting with an unreachable `DATABASE_URL` and still rendering all five listings at the correct rates.
>
> **Staleness:** an admin edit takes up to an hour to reach these two pages, the same trade the feed makes. A `public-listings` tag is declared so a future `revalidateTag()` in the admin property routes can make it instant.
>
> **⚠️ Latent typing risk, not a live bug:** values round-trip through `unstable_cache` as JSON, so a Prisma `Decimal` (`pricePerNight`, fee fields) comes back a **string** and a `DateTime` an **ISO string**, while the loader's declared return type still claims `Decimal`/`Date`. Every current consumer reads through `Number(...)` or `JSON.parse(...)` before doing anything with the value, so nothing is wrong today. The failure mode is a future consumer doing arithmetic or date math directly on the raw field and getting string concatenation instead of a type error — re-parse, don't trust the type.

### `/contact` → `/#contact` permanent redirect (2026-08-16, `b64ce9a`)

`/contact` was a hard 404 while looking like a real path. Five blog articles linked it until 2026-08-16 (since repointed to `/#contact`), but the GBP profile, old social posts and external sites still point at it and cannot be edited. **There is no `/contact` page and this redirect is not a step toward one** — the contact form is a homepage section (`id="contact"` in [src/components/sections/ContactForm.tsx](../src/components/sections/ContactForm.tsx)).

Implemented as a `redirects()` entry in [next.config.ts](../next.config.ts) with `permanent: true` (**308**, which Google treats identically to 301 for consolidation). That file is the layer that owns routing here: `vercel.json` is an empty object, and the middleware matcher is scoped to `/admin/:path*`, so neither sees this path. The fragment travels in the `Location` header and the browser does the scroll — fragments never reach the server.

Verified on a production build: `/contact` → **one hop** → 200, no 404 in the chain. `/contact/` takes **two** hops (Next normalises the trailing slash before redirects run, so a `/contact/` source could never match) — the same shape as `/properties/`, and inherent to `trailingSlash: false` rather than a defect in this rule.

### `/about` — all five homes, from the DB (2026-08-16, `6a0da20`)

[src/app/about/page.tsx](../src/app/about/page.tsx) is indexed and in the sitemap, carries the `Person` schema for Melody, and does the trust work for direct booking — and its body copy still read **"Our two properties"**, listing only the Spacious 2BR and Cozy 1BR. The three Mickey houses had been live since 2026-06-18 and appeared nowhere in the page's content, including the **sleeps-15 flagship** the wedding and large-group strategy depends on.

Rewritten as a *section* change, not a page rewrite — Melody's voice and the surrounding structure are untouched.

- **Prisma, same gate as `/properties`** (`PUBLIC_LISTING_GATE`). Names, guest counts, bed/bath counts and the Stripe percentage all render from live values; the "built for …" line per home comes from `bestForSegments[0].title`, the same admin-authored field the property pages render, so it stays editable in admin rather than frozen in JSX.
- The page consequently became **`force-dynamic`** — it was statically prerendered before, and a `revalidate` form would run Prisma at build time and fail CI. Same shape as `/properties`. **Superseded by `c2c5e6b`:** the original `next.config.ts` `s-maxage` header never actually cached anything (a page can't set `Cache-Control` on Vercel — see the warning box above); caching now lives in the `unstable_cache` loaders in [src/lib/listings.ts](../src/lib/listings.ts) (`getPublicListings`, 1h), and `headers()` on this route carries only the CSP.
- **Shared helpers extracted** to [src/lib/listings.ts](../src/lib/listings.ts): `PUBLIC_LISTING_GATE`, `PUBLIC_LISTING_ORDER`, `buildShortNames()`, `numberWord()`, `plural()`. The three older surfaces (homepage grid, sitemap, feed) still inline a byte-identical gate; they can adopt the constant whenever next touched.
- **Every stale count is gone**, not just the heading: the intro paragraph, the "Why Lipa, why these homes" heading, the `<h2>`, and the **meta description** (which claimed "Two short-term rental homes"). The remaining occurrences of "two" on the page are Melody's two daughters and Wilma being two minutes away — both correct.
- **Person JSON-LD `description`** said "two short-term rental homes". Rewritten **count-free** rather than re-pinned to five, so it can never drift again. This is a one-string edit — no type, property, `@id`, `sameAs`, `birthPlace` or `worksFor` change — but it is a deliberate deviation from the brief's "leave the JSON-LD alone", on the grounds that a wrong count in machine-readable form on the trust page is the same defect the task exists to fix.
- **Degraded state:** a DB error still renders the whole page at **200**, with the homes section falling back to a pointer at `/properties`. Melody's story does not need a database.

### `/weddings-accommodation` — new route (2026-08-17, `7fa3421`)

[src/app/weddings-accommodation/page.tsx](../src/app/weddings-accommodation/page.tsx). The strongest net-new commercial case in the August audit and the first page in the new **C7 — Occasions & Groups** cluster. Every wedding in Lipa has the same gap: the venue seats everyone and sleeps nobody, so the entourage scatters across hotel rooms. No venue, hotel, directory or OTA in this market sells the answer — a whole house near the church — and the page targets the listing that currently performs worst. Copy is the audit deliverable `081526/MoneyPage_03_Wedding_Party_Accommodation.md`.

Commercially it outweighs its traffic: a wedding booking is multi-night, full-house, booked months ahead, and repeats across a family. Peak season is December–February, which is why it jumped the queue in August.

> #### ⛔ Positioning rule — the page depends on it
>
> **We are not a wedding venue and must never imply we are.** No ceremonies, no receptions, no catering, no function rooms. The SERP for `wedding venue lipa` belongs to businesses whose entire product is that (Palazzo Antonio, Villa Marasigan, Casa Marikit, JET Hotel with five named function rooms) and we would deserve to lose it. **What we sell is where the party sleeps.**
>
> The FAQ answers the venue question with a flat **"No."** (since 2026-09-27 the question reads "Is Haven in Lipa a wedding venue?" and the answer still opens with "No." and rules out the ceremony, reception and catering). That reads as a weakness and is precisely why the page is credible. Keep it.
>
> Consequently the **only** schema on the page is `FAQPage`. **No `EventVenue`, no `Event`, no `LodgingBusiness`** — a venue-implying type is a machine-readable claim we cannot support. There is also **no `BreadcrumbList`** (the visible breadcrumb is unmarked HTML), so the rule stays trivially checkable: one JSON-LD block, one type.

- **Capacity is derived from shared inventory, never hardcoded.** The five listings are **two physical houses** — Block 34 (`cozy-1-bedroom` **or** `spacious-2-bedroom`, sleeps up to 9) and Block 38 (Mickey `sleeps-7` **or** `sleeps-11` **or** `sleeps-15`, sleeps up to 15) — five doors apart, about a two-minute walk. Each takes **one booking at a time**, so simultaneous capacity is **24, not 47**. New in [src/lib/listings.ts](../src/lib/listings.ts): `getPublicListingGroups()` (same `unstable_cache` window and `public-listings` tag as the listings themselves), plus the pure `deriveHouses()` / `totalHouseCapacity()` — pinned by [src/lib/\_\_tests\_\_/listings.test.ts](../src/lib/__tests__/listings.test.ts), because the arithmetic is a promise a couple plans a wedding around and Hostinger blocks DB access from laptops and CI.
- **Membership identifies a house, not `InventoryGroup.isActive`.** `isActive` gates whether sibling *blocks* propagate; it says nothing about the building. A group switched off is an availability bug, not five separate houses. An ungrouped listing is its own house, which is the correct reading — nothing shares its inventory.
- **Two copy rules the render enforces.** Never imply two configurations of the *same* house can be booked together ("book both houses" is true; "book sleeps-11 and sleeps-15" is not) — the "one honest constraint" callout states this outright. And always **"sleeps up to 24 people," never "24 beds"**: capacity comes from mixed sleeping arrangements, so bed count and guest count are different numbers and quoting beds understates the house and invites a complaint on arrival.
- **Guarded on the data actually describing two houses.** "Five doors apart", "the same village" and "a two-minute walk" are facts about the two houses we have today; any other shape falls back to copy that makes no distance claim rather than one nobody has re-verified.
- **Data.** Prisma directly through `PUBLIC_LISTING_GATE` / `PUBLIC_LISTING_ORDER` and the cached loaders from `c2c5e6b`; `force-dynamic`, never `revalidate`. Taglines run through `normalizePricingProse()` and the "From" prefix through `extraGuestFeeApplies()`, so the page cannot drift from the property pages or the feed. Title and meta description carry the DB-derived occupancy range (`7–15`) and fall back to a number-free variant when the DB is unreachable (current strings: see the 2026-09-27 rework below).
- **Verified content, used as written.** Drive times confirmed with the owner 2026-08-16 — Mary Mediatrix of All Grace **under 10 min**, Our Lady of Mount Carmel **10**, Metropolitan Cathedral of Saint Sebastian **15**, SM Lipa **20**, Palazzo Antonio **30**. Five venues were deliberately dropped as 45–50 min out or ambiguous in identity (Casa Marikit, Villa Marasigan, Cintai Corito's Garden, Villa Natura Taal, M Farm / The Farm at San Benito — the last is 40 min *and* two businesses appear to share the name). **Do not add them back or supplement the table from a map.** The hotel cost comparison stays **qualitative** ("at typical Lipa mid-range rates"): no checkable figure has been supplied, and an invented one would undermine the only thing this page sells.
- **Gatherings** are permitted with the host informed, per house rules — and the house is still not the reception venue. Both halves are on the page; keep both.
- **Internal links in:** `/properties` → "By occasion" → "A wedding party", and a "Booking for a wedding?" block on the `sleeps-15` and `sleeps-11` property pages (`WEDDING_PAGE_SLUGS` — the entourage-sized configurations; deliberately not `sleeps-7`, where the pitch doesn't hold). **Out:** `/properties`, `/faq`, `/#contact`, the property pages, and `/staycation` (added in `6fc4b60` once it existed). ~~`https://blog.haveninlipa.com/lipa-pilgrimage-guide/`~~ — **removed 2026-09-27** (off-topic for a booking-intent page; replaced by a `/properties` link in the churches section).
- **Degraded state:** the editorial case stands without a database. A DB error withholds every number — capacity, configurations, the rate — and swaps in a contact prompt, still at **200**.

#### SEO rework — 2026-09-27 (branch `seo/weddings-accommodation-rework`, PR against `dev`; not merged or deployed)

Why: GSC Aug 28–Sep 24 2026 — the page drew **324 impressions, avg position 19.8, 1 click**, almost all from venue/destination-intent queries: `wedding destination in lipa` (175 impr, pos 18.1; 147 on this page at ~p20), `wedding venue in lipa` (96 impr, pos 15.8; 93 on this page at ~p16), `intimate wedding venue lipa` (55 impr, pos 35). The page now serves couples choosing Lipa as a wedding destination and states plainly that HIL is not a venue (`SEO-DEC-030`). The positioning rule above is unchanged.

- **Title** (`generateMetadata`): `Lipa Wedding Destination Homes, Sleeps {range}` (range DB-derived; 59 chars rendered with the ` | Haven in Lipa` template suffix). Falls back to `Lipa Wedding Destination Stays Near Venues` without a DB **or** whenever the ranged title would push the rendered title past **60 chars** (`TITLE_MAX`), e.g. a future `10–15` range still fits, a wider one would not. Was: `Where Your Wedding Party Stays in Lipa — Whole Homes for 7–15` (77 rendered).
- **Meta description:** `Planning a wedding in Lipa? We’re not the venue — we’re where the wedding party stays: whole homes for {range} guests near Lipa’s churches and venues.` (147 chars); number-free fallback 154 chars. OpenGraph and (new) Twitter title/description match; both restate `siteName`/share image because a page-level `openGraph`/`twitter` object replaces the root layout's rather than merging with it (the old page silently dropped `og:image`). Canonical unchanged (`/weddings-accommodation`).
- **H1:** "Getting Married in Lipa? Here's Where Your Wedding Party Stays" (was "Where Your Wedding Party Stays in Lipa"), followed by a plain "we are not a wedding venue" sentence and a primary `/properties` CTA.
- **H2 order:** Why couples choose Lipa as a wedding destination → Near Lipa's wedding churches and venues (owner-verified drive-time table, unchanged) → Where the wedding party and guests stay (former "problem" and "what a whole house changes" H2s demoted to H3s) → Two houses, five doors apart (DB-derived) → What it costs, honestly → Booking for a wedding → Questions from couples → Check your dates. Facts in the new destination section are only those already on the page or in `/staycation` / `src/lib/faqs.ts` (Little Rome, church weddings, about one hour from central Manila). No venue other than the already-verified Palazzo Antonio is named.
- **FAQ: 9 entries with the DB (was 7), 7 without (was 5).** New: "Is Lipa a good wedding destination?" and "How far are your homes from Lipa's churches and venues?" (generated from `DRIVE_TIMES` rows whose new `kind` is `church`/`venue` — SM Lipa, `errand`, is excluded). Reworded: the ceremony question → "Is Haven in Lipa a wedding venue?" (flat "No."); "How many people can you actually sleep?" → "Can the whole entourage stay together?" (same `deriveHouses()` figures). JSON-LD still built from the same array as the visible list; still one block, `FAQPage` only.
- **Tests:** `src/lib/__tests__/weddings-accommodation-page.test.ts` renders the real page with the listing loaders mocked (with and without a DB) and pins: title/description phrases and length limits (rendered title ≤ 60, description ≤ 160), canonical/OG/Twitter, exactly one JSON-LD block of type `FAQPage` with no venue types, JSON-LD questions == visible FAQ questions, the flat "No.", one H1 with Lipa + Wedding, `/properties` and `/staycation` links present, no pilgrimage link, capacity 24 not 47.
- **Owner step after deploy:** GSC URL Inspection + Request Indexing for `/weddings-accommodation`; re-measure the queries above ~4 weeks after the deploy against this baseline.

### `/staycation` — new route (2026-08-31, `6fc4b60`)

[src/app/staycation/page.tsx](../src/app/staycation/page.tsx). **Cluster C1 (Short-Term Rentals) was sitting at zero clicks** with no page answering plain "what does a Lipa staycation cost" intent — the property grid answers *which home*, never *what it costs across the board*. Copy is the audit deliverable `081526/MoneyPage_01_Staycation.md`. Target queries: `staycation in lipa` (was pos 9.5) and `work from home staycation` (pos 5, already converted a click in June).

**It is also the consolidation target for blog article #6** (`why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take`), which draws 17 impressions and 0 clicks against the same rate-shopper. Its book-direct argument is absorbed into the page's "The 14–20% you don't pay" section.

> #### ⛔ The 301 is the LAST step, not the first
>
> Article #6 is linked in-body from **22 of 26 published posts — 33 link occurrences** (live-crawled 2026-08-31; full inventory in `083126/Article6_Repoint_Audit_083126.md`). Adding the redirect before repointing turns every one of those 33 into an extra hop. This build→repoint→redirect sequencing is a general rule for any future consolidation, not just this page — see [DEC-010](HIL_DECISIONS.md#dec-010--content-consolidation-always-goes-build--repoint--redirect-in-that-order).
>
> **Order: build → repoint → 301.**
>
> 1. ✅ **Build** — `6fc4b60`. `/staycation` live and verified 200 on production.
> 2. ✅ **In-repo repoint** — the codebase's three links to #6 all now point at `/staycation`, *in the same commit as the page*, so none ever travels through the redirect: the footer's `STATIC_BLOG_LINKS` fallback (replaced with Lipa vs Tagaytay — a *fallback* pointing through a redirect is worse than one pointing at a live post), [/about](../src/app/about/page.tsx), and the property-page "Why book direct" button, which became an internal `<Link>`. Anchor text was reworded where "Why book direct vs. Airbnb" read oddly against a staycation page. Verified on production: zero references to #6 remain in rendered output.
> 3. **WordPress repoint of the other 22 posts** and 4. **the Redirection-plugin 301** — current progress tracked in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md), not here (owner/SEO-side, not in this repo; the 301 cannot ship until the repoint verifies all 33 links resolve 200).

- **Derived, not hardcoded — the draft's non-negotiable rule** (three rates changed silently in six weeks). From the DB: the rate table, the "rates start at X and run to Y for the whole N-person house" line, the "From" prefix via `extraGuestFeeApplies()`, the title's home count, the FAQ's guest range, and the Stripe percentage from `STRIPE_FEE_RATE`.
- **Two things the draft hardcoded are now sourced as well.** *Check-in / checkout* reads `housePolicies` per house — currently 2:00 PM at Block 34 and 3:00 PM at Mickey with a shared noon checkout, which is exactly the draft's sentence but sourced; it collapses to a single clause if the houses ever agree, and lists each house separately if checkout times ever diverge. *The solar claim* resolves through the **inventory group holding `cozy-1-bedroom`** rather than by naming listings — verified with the owner 2026-08-16 that **the Mickey house has no solar**, so the claim must never migrate there. Resolving it through the group means it disappears rather than moves if that listing is ever delisted.
- **Capacity reuses `deriveHouses()` / `totalHouseCapacity()`** from `7fa3421` — two houses, 24 people simultaneously, not five listings and 47. Same rule as the wedding page: sum per house, never per listing.
- **House name vs. configuration name.** `buildShortNames()` disambiguates the three Mickey configurations *from each other* ("Mickey in Lipa — Family House"), which is right in a list of listings and **wrong when referring to the building** — quoting one configuration implies a house-wide policy applies only to it. The check-in sentence therefore uses the shared first name segment ("Mickey in Lipa") for any multi-configuration house.
- **Data.** Prisma via the cached loaders, **not** a self-fetch of `/api/properties.json` as the draft specified — same precedent as `/properties` and `/weddings-accommodation`. `force-dynamic`, never `revalidate`.
- **Internal links in:** homepage "Our Rentals" CTA ("See staycation options"), `/properties` ("Planning a staycation?"), footer Quick Links, and `/weddings-accommodation` — the link deliberately omitted in `7fa3421` while this page was a 404, now landed. **Out:** `/properties`, `/faq`, `/weddings-accommodation`, the property pages, and eight blog articles (all verified 200 before shipping).
- **Degraded state:** a DB error withholds every number — the rate table is replaced by a pointer at `/properties`, and the capacity, solar and check-in blocks disappear rather than guess. Still **200**; the page still works as an argument for booking direct.

> ⚠️ **The gatherings wording — corrected 2026-08-31.** An earlier version of this note claimed the marketing pages contradicted the listings' house rules. **They do not.** `propertyRules` item 2 on all three Mickey listings already reads *"No parties or events **without prior approval from the host**,"* which is the same permission the pages describe as *"gatherings are permitted provided the host is informed."* No page copy needs changing.
>
> The real friction is **narrower and internal to the DB**, and it is visible because the property page renders both fields back to back in one block ([src/app/properties/[slug]/page.tsx](../src/app/properties/[slug]/page.tsx), the `Parties / events` line from `housePolicies.parties` immediately above the `propertyRules` list):
>
> | Field | Value today | Reads as |
> |---|---|---|
> | `housePolicies.parties` (all 5) | "No parties or events — this is a residential gated subdivision" / "…residential village, not an event venue" / "…residential village" | **flat prohibition** |
> | `propertyRules` #2 (**all 5** — ✅ resolved by the owner 2026-08-31) | "No parties or events **without prior approval from the host**." | conditional — correct |
>
> ✅ **Resolved 2026-08-31:** `propertyRules` #2 is now identical across all five listings — the two BellaVita listings' bare "No Parties" was expanded to the Mickey wording. Verified live on production.
>
> ⏳ **Still open — 5 admin edits, no code.** `housePolicies.parties` was *not* part of that pass and still carries the unqualified line on all five. It renders as the `Parties / events:` row **directly above** the rules list, so a guest currently reads "No parties or events — this is a residential gated subdivision" and then, two lines later, "…without prior approval from the host." Nothing is wrong; the no just arrives before the explanation that it is a yes-with-notice. Tracked in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md) → Blocked. Suggested values keep each listing's residential context, which is worth keeping — `spacious-2-bedroom`'s "not an event venue" is exactly the `/weddings-accommodation` positioning:
>
> - Mickey ×3 → `No parties or events without prior approval from the host — this is a residential gated subdivision`
> - `spacious-2-bedroom` → `No parties or events without prior approval from the host — this is a residential village, not an event venue`
> - `cozy-1-bedroom` → `No parties or events without prior approval from the host — residential village`

## Conversion measurement (GA4) — added 2026-08-08

The May 8 2026 audit closed the loop as far as the click. GA4 event tracking (`0c0133e`, `d1a98ef`) closes it past the click, so an organic session can be followed through to a booking. Implementation detail lives in [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md) → **GA4 Analytics Events**; what matters here:

- **`booking_confirmed`** carries `value` (server-authoritative PHP total), `currency`, `transaction_id`, and `property` (the listing slug). Registered as the `Listing` custom dimension, so **conversions and revenue attribute per property page** — i.e. per organic landing page.
- **`check_availability` → `book_click` → `booking_confirmed`** is the on-site funnel; the gap between the last two is the submission-failure rate.
- **`generate_lead`** covers the `/#contact` form, with `form_subject` distinguishing booking intent from general questions.
- **No SSR/SEO impact.** All of it is client-side only — no effect on server render, JSON-LD, canonicals, or the `/book` noindex. The `/book` segment stays `index: false, follow: true` as documented above.

> ### ⚠️ GA4 collected NOTHING before 2026-08-09 (`d829b24`, `a22830d`)
>
> `connect-src` in `next.config.ts` named only `https://www.google-analytics.com`, while GA4 fans hits across four hosts. **Every hit was refused by the browser** — `page_view`, `scroll`, `form_start`, all custom events — silently, since `gtag()` ran without throwing.
>
> **Any GA4-derived figure predating the 2026-08-09 production deploy (`4e5cf70`) is void.** Treat post-deploy data as a fresh baseline, not a comparison.
>
> **GSC is unaffected** — Search Console collects server-side and never depended on the tag. The [2026-05-08 GSC baseline](../../.claude/projects/-Users-cedricpcastillo-Documents-VSCode-HAVENINLIPA/memory/gsc-baseline-2026-05-08.md) remains valid for diffing.
>
> Full detail, including the bare-host CSP wildcard trap and the `securitypolicyviolation` diagnostic: Website spec → Security → **Content-Security-Policy**.

### Conversion-rate work on organic landing pages (2026-08-08, `0c0133e`)

Booking-friction changes land on `/properties/[slug]` — the indexed organic landing page — so they affect what ranks, not just what converts: an itemized fee breakdown in the booking card ([BookingCard.tsx](../src/components/ui/BookingCard.tsx) → [FeeBreakdown.tsx](../src/components/ui/FeeBreakdown.tsx)), a mobile sticky booking bar ([StickyBookingBar.tsx](../src/components/ui/StickyBookingBar.tsx)), and occupancy notes stating who the nightly rate covers. The sticky bar is a fixed-position overlay — **re-check mobile CWV (CLS in particular) on the next PSI pull**; see [[lighthouse-baseline-2026-05-08]] for the pre-existing mobile-perf gap.

---

## SEO seed commands

**Seed long-form SEO content into the two original properties (2026-05-08 audit deliverables — re-run idempotently after content updates):**
```
npm run seed:property-seo
```
Equivalent to `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-property-seo.ts`. Updates `description`, `seoTitle`, `seoDescription`, `tagline`, `heroSummary`, `bestForSegments`, `amenityDetails`, `neighborhoodPlaces`, `housePolicies`, `pricingNotes`, `propertyFaqs`, `imageAlts`, `aggregateReviewCount`, `aggregateReviewRating` for `spacious-2-bedroom` and `cozy-1-bedroom`. Won't create new properties — keys off `slug`.

**Seed SEO content into the 3 "Mickey in Lipa" listings (2026-06-18):**
```
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-property-seo-mickey.ts
```
Same shape and `applySeo()` mechanism as above, for slugs `mickey-in-lipa--family-staycation--sleeps-7` / `--family-house--sleeps-11` / `--full-family-house--sleeps-15`. Idempotent. Mirrors business policy from the original two (deposit, cancellation, payment methods) except **check-in is 3 PM** (vs 2 PM) for the Mickey house.

**Review aggregates are now DERIVED, not hardcoded (2026-08-15).** The seed originally set `aggregateReviewCount`/`Rating` for no listing — they had zero testimonials, and faking review schema is a Google policy violation. Real direct-booking guest reviews landed in Aug 2026, so `reviewAggregate(propertyId)` in the seed computes count and mean from that property's **active `Testimonial` rows at run time**. Applied to prod 2026-08-15: sleeps-7 `47 / 5.0`, sleeps-11 `23 / 5.0`, sleeps-15 `46 / 5.0`; live JSON-LD verified on all three. A listing with no active testimonials still gets `null`, which omits `aggregateRating` from the JSON-LD entirely. Derived rather than literal on purpose — a hardcoded count is stale the moment the next review is added, and an `aggregateRating` disagreeing with the reviews rendered on the page is the same drift class `normalizePricingProse` exists to prevent. Note the original two listings (`seed-property-seo.ts`) still carry **literal** aggregates (32 / 21) that now under-count their actual testimonials (37 / 24) — worth converting to the same derived helper.

> ⚠️ **These seeds overwrite hand edits made in admin.** `applySeo()` rewrites *every* SEO field by slug, and the free-text fields are routinely edited in admin and never round-tripped to the repo (see [scripts/audit-vague-charges.ts](../scripts/audit-vague-charges.ts)). A 2026-08-15 re-run silently reverted a deliberate admin edit on all three Mickey listings. **Snapshot the affected rows before any prod seed run, then diff after** — that is how it was caught and restored.
>
> **The extra-guest fee must stay number-free in seeded prose.** `normalizePricingProse` rewrites the base rate and the "covers N guests" count at render time but deliberately does **not** touch the extra-guest fee — it relies on that prose already carrying no literal amount. The Mickey seed originally hardcoded `₱400` in `heroSummary`, `bestForSegments`, `housePolicies.notes`, and `propertyFaqs`; those were stripped by hand in admin, reverted by the re-run, and are now fixed at source to wording like "an extra per-guest fee". A literal amount there is an **unprotected drift surface**: change `extraGuestFeePerNight` and the copy goes stale on the live page with no normalizer to catch it.

**Outbound blog links in `bestForSegments` are unaudited by anything.** Both seeds carry absolute `blog.haveninlipa.com` URLs. A blog slug rename silently 404s them — `mt-maculot-hiking-guide-2026-cuenca-rockies` was dead on three live property pages (and in the new `/api/properties.json` feed) until 2026-08-15. Re-check these whenever blog slugs change; see [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md) → Blog content audit.

---

## Verification cadence (post-deploy)

- Submit URL Inspection → Request Indexing in GSC for `/faq`, `/about`, `/privacy`, `/terms`, and each property page
- Re-test each property URL in Google [Rich Results Test](https://search.google.com/test/rich-results) after seed runs
- Re-pull GSC Performance at 30 / 90 days, diff against the [2026-05-08 baseline](../../.claude/projects/-Users-cedricpcastillo-Documents-VSCode-HAVENINLIPA/memory/gsc-baseline-2026-05-08.md) (2 clicks / 66 impressions / 3% CTR / 8.5 avg position)
- **GA4 (from 2026-08-09 only):** check Realtime shows organic traffic on the apex domain — collection has only ever been verified on `dev.haveninlipa.com`. Then use `booking_confirmed` broken down by the `Listing` dimension to get conversions and revenue per property page. **Do not diff GA4 against anything before 2026-08-09** — see the collection warning above.
- After a seed run, confirm the rendered `<meta name="description">` (View Source) matches expectations — `normalizePricingProse` rewrites it at render time

---

## Related SEO docs (in `About HIL/`)

These standalone files stay where they are — referenced here so the SEO surface is discoverable from one place:

| Doc | Scope |
|---|---|
| [SEO_Resolution_2026-06-02.md](../About%20HIL/SEO_Resolution_2026-06-02.md) | SEO issue resolution log (2026-06-02) |
| [Backlink Outreach Guide.md](../About%20HIL/Backlink%20Outreach%20Guide.md) | Backlink outreach strategy & targets |
| [Internal Linking Guide.md](../About%20HIL/Internal%20Linking%20Guide.md) | Internal linking conventions |
| `HavenInLipa_Keyword_Tracker.xlsx` | Keyword tracking workbook |

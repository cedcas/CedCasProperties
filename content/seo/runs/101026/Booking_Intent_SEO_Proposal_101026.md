# Main-site booking-intent SEO — proposal (2026-10-10)

**Not implemented. Proposal only — Cedric approves copy before any of this ships**, per CLAUDE.md
("ask the Owner before any customer-visible copy change; propose exact text in the PR body").
This file is that proposed text. Nothing in `/properties`, `/staycation`, or the homepage has
been changed by this task.

## Why

2026-10-10 GSC measurement (Jul 11 – Oct 8, 90 days): main-site booking-intent queries rank
poorly even though all money pages are indexed —

| Query | Position | Mapped page |
|---|---|---|
| "apartment for rent lipa city" | 28 | `/properties` |
| "airbnb lipa" | 16–38 | (no dedicated page — `/properties`/`/staycation` compete) |
| "transient house in lipa batangas" | 16–29 | `/properties` |

Per **SEO-DEC-012** (transactional configuration-rental queries map to the property/booking
page — see [HIL_DECISIONS.md → Migrated SEO Decisions](../../../../docs/HIL_DECISIONS.md#migrated-seo-decisions)),
these three queries already should be served by `/properties` (plain lodging intent) and
`/staycation` (occasion-flavored intent), but neither page's title, meta description, or H1
currently names "apartment," "transient house," or "Airbnb alternative" anywhere. One keyword per
page, not all three crammed into one title — same discipline as the existing
`/weddings-accommodation` rework (**SEO-DEC-030**, same Migrated SEO Decisions table).

## Constraints respected

- **Rendered `<title>` ≤ 60 characters**, including the root layout's auto-appended
  ` | Haven in Lipa` (`src/app/layout.tsx`'s `title.template`) — the same `TITLE_MAX` convention
  used on `/weddings-accommodation` ([Website spec](../../../../docs/HIL%20SEO%20Technical%20Specification.md)).
  Current `/properties` title is already 68 rendered — this proposal also fixes that, not just adds keywords.
- **No keyword stuffing** — one primary transactional term per page (SEO-DEC-012), the others
  live in the description/intro prose only.
- **DEC-007** — no hardcoded count/rate. The proposed intro blocks reuse the same
  `count > 0 ? ... : ...` DB-derived branching the pages already use for their titles; no new
  literal numbers are introduced.
- **SEO-DEC-031/032** — SEO-DEC-031 is the blog's title-suffix-drop rule specifically
  (`hil-seo` 1.1.6); it does not apply to the main site's `generateMetadata()` pages, which
  already have their own fixed ` | Haven in Lipa` template suffix with no drop logic. Nothing
  here conflicts with it. SEO-DEC-032 (accepted "about one hour from Manila" cross-site
  inconsistency) is unaffected — no Manila travel-time claim is touched.

## `/properties` (`src/app/properties/page.tsx`)

**Primary target: "apartment for rent lipa city" (currently pos 28).**

- **Title** (was: `Our Homes in Lipa City, Batangas — N Private Rentals`, 68 rendered — over budget):
  → **`Apartments for Rent in Lipa City, Batangas`** (58 rendered with suffix). Drop the dynamic
  count from the `<title>` (it was the reason the old title ran long) — the count stays in the
  **description**, where there's room:
  - count === 5: *"Private apartments and transient houses for rent in Lipa City, Batangas — our direct-booking Airbnb alternative. Live rates, real availability, no platform fee."* (158 chars)
  - fallback: *"Apartments and transient houses for rent in Lipa City, Batangas — booked direct, no platform fee. A real alternative to searching Airbnb for a Lipa stay."* (153 chars)
- **H1** (was: `Our Homes in Lipa City, Batangas`): → **`Apartments & Transient Houses for Rent in Lipa City`**. No character budget constraint on an H1 the way there is on `<title>`, but kept tight.
- **New intro block**, directly under the H1, above the group-size grid (reuses the page's existing `count`/`numberWord(count)` — no new literals):
  > *"Every home below is a private, entire-unit apartment or transient house for rent in Lipa City, Batangas — {numberWord(count)} of them, each booked direct with live availability and no platform fee. If you've been comparing Airbnb listings for a Lipa stay, this is the direct-booking alternative: the same homes, real-time dates, and no service charge on top."*

## `/staycation` (`src/app/staycation/page.tsx`)

**Primary target: "vacation rental" / "airbnb lipa" framing — occasion-flavored, not plain lodging intent (SEO-DEC-012 keeps this distinct from `/properties`).**

- **Title** (was: `Staycation in Lipa City: N Private Homes, Booked Direct`, varies 64–70+ rendered depending on count/plural — already over budget at 5 homes):
  → **`Lipa City Staycation & Vacation Rental Homes`** (60 rendered with suffix, fixed regardless of count).
  - Description keeps its existing count/price-derived branching, lightly reworded to add the Airbnb-alternative framing:
    - count === 5 && cheapest > 0: *"Five private vacation rental homes for a Lipa City staycation — couples, families, barkadas and remote workers. Book direct from {peso(cheapest)}/night, the alternative to searching Airbnb, and skip the 14–20% platform fee."*
    - fallback: *"Private vacation rental homes for a Lipa City staycation — couples, families, barkadas and remote workers. Book direct, the alternative to searching Airbnb, with no service charge on top."*
- **H1** (was: `Staycation in Lipa City: N Private Homes, Booked Direct`): → **`Lipa City Staycation & Vacation Rentals: {count} Private Homes, Booked Direct`** (keeps the existing DB-derived count/plural pattern, adds "Vacation Rentals").
- **Intro tweak** — one sentence appended to the existing opening paragraph (not a rewrite of the Lipa-location copy already there): *"If you'd normally search Airbnb for a Lipa getaway, these are the same homes — direct, with live availability and no service fee."*

## Homepage internal links (`src/app/page.tsx` / `src/components/sections/Properties.tsx`)

Confirmed by grep: the homepage links to **`/staycation`** (`Properties.tsx` line 63) but has
**no direct link to `/properties`** anywhere — the navbar's "Properties" link goes to the
homepage anchor `/#properties` (the on-page grid section), not the dedicated index page. Propose
adding one direct, visible link to `/properties` next to the existing `/staycation` link in
`Properties.tsx` (e.g. "See all homes" / "Browse the full list"), so both money pages get a
homepage-level internal link, not just one.

## Not proposed here

- No change to `/weddings-accommodation` (already reworked per SEO-DEC-030, out of scope).
- No change to pricing, fees, or capacity figures anywhere (DEC-007).
- No schema/JSON-LD change (covered separately — see this session's structured-data branch).

## Implementation, if approved

All of the above is copy + one new homepage link — no schema change, no new dependency. Owner
approval of the exact wording above is the only gate; once given, this ships as straightforward
edits to `generateMetadata()`/the H1 JSX in both page files plus one `<Link>` in `Properties.tsx`,
with `npm run lint`/`typecheck`/`test`/`build:app` and updated title/description-length unit test
assertions (mirroring the existing `weddings-accommodation-page.test.ts` pattern) before merge.

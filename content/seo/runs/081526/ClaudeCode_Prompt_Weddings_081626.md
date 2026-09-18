# Claude Code Prompt — HIL, `/weddings-accommodation`

> Paste everything below the line into Claude Code in the HAVENINLIPA repo.
> One page. Its fact-checks cleared 12 days early, so it jumps ahead of `/staycation` in the queue.
> **Target: live by Fri 2026-08-22.**

---

Read these first and follow their conventions — do not restate what they already cover:
- `About HIL/HIL SEO Technical Specification.md` (sitemap, canonicals, JSON-LD, `normalizePricingProse`)
- `About HIL/HIL Website Technical Specification.md` (Database Schema → Property; **Shared Inventory Groups** — this one matters, see below; File Structure)
- The `/properties` page you just shipped (`9a8e47c`) — this is its sibling and should reuse its helpers

Update `About HIL/HIL Commits.md` and the relevant spec for anything you ship.

**Full page copy is written. Use it rather than composing your own:**
`/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo/content for HavenInLipa/081526/MoneyPage_03_Wedding_Party_Accommodation.md`

---

## What this page is

**Route:** `src/app/weddings-accommodation/page.tsx`
**URL:** `https://haveninlipa.com/weddings-accommodation`

Every wedding in Lipa has the same gap: the venue seats everyone and sleeps nobody, so the entourage scatters across hotel rooms. This page sells the thing no venue, hotel, directory or OTA in this market sells — **a whole house near the church**. It is the strongest net-new commercial case in the August audit, and it targets the listing that currently performs worst.

**Commercially it matters more than its traffic will suggest:** a wedding booking is multi-night, full-house, booked months ahead, and often repeats across a family. Peak season is December–February, which is why shipping in August rather than October is worth the queue jump.

---

## ⛔ The positioning rule — the whole page depends on it

**We are not a wedding venue and must never imply we are.** No ceremonies, no receptions, no catering, no function rooms.

The SERP for `wedding venue lipa` belongs to businesses whose entire product is that — Palazzo Antonio, Villa Marasigan, Casa Marikit, and JET Hotel with five named function rooms. We would lose and deserve to. **We sell where the party sleeps.**

The copy says this explicitly in the FAQ ("Can we hold the ceremony or reception there?" → "No."). **Keep that answer.** It reads as a weakness and is actually the reason the page is credible.

⛔ **Do not emit `EventVenue`, `Event`, or any venue-implying schema type.** `FAQPage` only.

---

## 🔴 The inventory constraint — read `Shared Inventory Groups` before writing any copy about capacity

The five listings are **two physical houses**, not five bookable units:

| Property | Listings | Sleeps up to |
|---|---|---|
| **Block 34** (BellaVita) | `cozy-1-bedroom` **or** `spacious-2-bedroom` | 9 |
| **Block 38** (BellaVita) | Mickey `sleeps-7` **or** `sleeps-11` **or** `sleeps-15` | 15 |

They are **five doors apart — about a two-minute walk.** Each house takes **one booking at a time**; the guest counts are configurations of the same property. Combined simultaneous capacity is **24 people**.

This is enforced in code — see `InventoryGroup` / `InventoryGroupMember` and the double-booking hole that motivated them.

**Two hard copy rules:**

1. **Never imply two configurations of the same house can be booked together.** An earlier draft did, and it was wrong. "Book both houses" is true; "book sleeps-11 and sleeps-15" is not.
2. **Always write "sleeps up to 24 people," never "24 beds."** Capacity comes from mixed sleeping arrangements — a queen sleeps two, a daybed three — so bed count and guest count are different numbers. Quoting beds understates the house and invites a complaint on arrival.

**Derive the numbers, don't hardcode them.** Group the listings by their inventory group and take the max `maxGuests` per group, then sum. If a listing is deactivated or a group changes, the page should follow.

---

## Data

**Prisma directly**, same gate as `/properties` — `PUBLIC_LISTING_GATE` / `PUBLIC_LISTING_ORDER` from `src/lib/listings.ts`. Not a self-fetch of `/api/properties.json`.

- Reuse the **cached loaders** you added in `c2c5e6b` (`getPublicListings`, `unstable_cache`, 1 h). Do not add a third caching approach.
- **`export const dynamic = "force-dynamic"`, never `revalidate`** — it would run Prisma at build time and fail CI. Same precedent as `2dc488b`.
- Run any exposed prose through **`normalizePricingProse()`**.
- Reuse **`extraGuestFeeApplies()`** for any "From" prefix.
- If a listing is missing from the feed, omit its block cleanly — never render a card for something the query didn't return.

---

## Verified content — these numbers are confirmed, use them as written

Drive times confirmed with the owner on 2026-08-16. **Do not adjust, round, or supplement them from a map.**

| Destination | Time |
|---|---|
| Mary Mediatrix of All Grace Parish | under 10 min |
| Our Lady of Mount Carmel | 10 min |
| Metropolitan Cathedral of Saint Sebastian | 15 min |
| SM Lipa | 20 min |
| Palazzo Antonio | 30 min |

Venues deliberately **excluded** (45–50 min, or ambiguous identity): Casa Marikit, Villa Marasigan, Cintai Corito's Garden, Villa Natura Taal, M Farm / The Farm at San Benito. **Do not add them back.**

**The cost comparison stays qualitative** — "at typical Lipa mid-range rates." No hotel figure. The owner has not supplied a checkable one and an invented number would undermine the only thing this page is selling: accuracy.

**Gatherings** are permitted with the host informed, per house rules. The copy says so, and also says the house is not the reception venue. Keep both halves.

---

## Metadata & schema

- **Title:** `Where Your Wedding Party Stays in Lipa — Whole Homes for 7–15 | Haven in Lipa` (trim to `Wedding Party Accommodation in Lipa: Whole Homes for 7–15` if it truncates in the SERP)
- **Description:** in the money-page draft
- Self-canonical — the root layout defaults to `/`, see the metadata-inheritance gotcha in the SEO spec
- **`FAQPage`** from the FAQ block. Nothing else.
- Sitemap: **priority 0.8**, `changeFrequency: 'monthly'`

---

## Internal links

**Into this page:**

| From | Anchor |
|---|---|
| `/properties` → "By occasion" | "A wedding party" |
| `/properties/mickey-in-lipa--full-family-house--sleeps-15` | "Booking for a wedding?" |
| `/properties/mickey-in-lipa--family-house--sleeps-11` | same |

**Out of this page:** `/properties`, `/faq`, `/#contact`, and `https://blog.haveninlipa.com/lipa-pilgrimage-guide/` (the copy links it — the blog's Carmel/Cathedral guide is topically adjacent and it's a real cross-surface link, so **verify it resolves 200 before shipping**).

The `/staycation` page doesn't exist yet, so **omit that link** rather than shipping a 404. It gets added when `/staycation` lands.

---

## Shipping

Same flow as the last two: branch from `dev`, commit, append to `HIL Commits.md` with Type, update the SEO spec (new indexed route + sitemap entry + schema), PR to `main`, merge, deploy.

⚠️ **Verify on production, not the preview** — `dev.haveninlipa.com` is behind Vercel SSO. And a merge to `main` is not a deploy: confirm the live URL returns 200 before reporting done.

CI Build and Lint are **already red on `main`** for pre-existing, unrelated reasons. Don't fix them here; don't let them hide a genuine failure either.

**Done when:** `/weddings-accommodation` returns **200**; the three church times render as written; capacity reads "sleeps up to 24 people" and is derived from inventory groups rather than hardcoded; no `EventVenue`/`Event` schema anywhere; Rich Results Test reports 0 critical; and the blog pilgrimage link resolves.

**Post-deploy:** request indexing in GSC.

---

## Explicitly NOT in scope

- **`/staycation`.** Next in the queue — it needs its WordPress 301 sequenced after in-body link repointing, so it comes as its own brief.
- **The Stay Match component.** Separate brief, already delivered. **Its hard deadline is Fri Aug 28** (pilot articles publish Aug 31 / Sep 7 / Sep 14) — if these two collide, **Stay Match wins**, because its deadline is externally fixed and this page's is not.
- **`/contact` as a real page.** Still a redirect by design.
- **The "an hour from Manila" correction** across the blog. WordPress-side, tracked separately.

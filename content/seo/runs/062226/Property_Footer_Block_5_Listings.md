# Article Footer — "Where to Stay" Block (All 5 Listings)

**Created:** 2026-06-22 · Folder: `062226/`
**Purpose:** Replace the old 2-listing "Ready to plan your Lipa trip?" footer (from [Internal_Linking_Strategy.md](../050826/Internal_Linking_Strategy.md), lines 73–77) with one that markets **all 5 live listings** at the bottom of every blog article.
**Status:** Supersedes the old 3-link footer. This is now the mandatory footer for every published + backfilled article.

---

## Why this changed

As of the Mickey in Lipa launch (6/18), there are **5 bookable listings**, not 2. The old footer only routed readers to the Cozy 1BR and Spacious 2BR — the three Mickey configs (₱2,500 / ₱4,500 / ₱6,500) got zero promotion at the article level. This block fixes that.

The design rule: **route by group size + trip type, not a flat list of 5 links.** A reader who came for a coffee-heritage article shouldn't have to decode five property names — they self-select in one glance ("we're 6 people with kids" → Mickey staycation). This keeps the footer scannable while still surfacing every listing.

Occupancy convention (per PROJECT_STATUS): "sleeps up to N" = max occupancy; the nightly rate covers the base (5/9/13), extra-guest fee applies beyond that. Footer uses **"sleeps up to N"** + **"from ₱X"** so it stays honest without needing per-guest math in the footer.

---

## ✅ RECOMMENDED — Full block (paste at the end of every article)

> ## Ready to plan your Lipa trip?
>
> We've got **five places to stay in Lipa** — all bookable direct, no Airbnb fees:
>
> **Just the two of you, or a small family**
> - 👫 [Cozy 1BR](https://haveninlipa.com/properties/cozy-1-bedroom) — sleeps up to 5, solar backup during brownouts, from ₱1,500/night
>
> **Family or barkada trip**
> - 👨‍👩‍👧‍👦 [Spacious 2BR](https://haveninlipa.com/properties/spacious-2-bedroom) — sleeps up to 9, from ₱2,800/night
> - 🏰 [Mickey in Lipa — Family Staycation](https://haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7) — Disney-themed house, sleeps up to 7, from ₱2,500/night
>
> **Big group or multi-family getaway**
> - 🏰 [Mickey in Lipa — Family House](https://haveninlipa.com/properties/mickey-in-lipa--family-house--sleeps-11) — sleeps up to 11, from ₱4,500/night
> - 🏰 [Mickey in Lipa — Full Family House](https://haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15) — sleeps up to 15, from ₱6,500/night
>
> 💸 Booking direct saves you 15–20% vs. Airbnb — [here's why](https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/)

---

## ⚡ COMPACT variant (for short articles, < 1,000 words)

Use this where the full block would feel heavy. Still links all 5.

> ## Ready to plan your Lipa trip?
>
> Five places to stay, all bookable direct:
>
> - 👫 Two of you / small family → [Cozy 1BR](https://haveninlipa.com/properties/cozy-1-bedroom) (sleeps 5, from ₱1,500)
> - 👨‍👩‍👧‍👦 Family or barkada → [Spacious 2BR](https://haveninlipa.com/properties/spacious-2-bedroom) (sleeps 9, from ₱2,800) or the Disney-themed [Mickey in Lipa](https://haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7) (sleeps 7, from ₱2,500)
> - 🏰 Big group → Mickey in Lipa [sleeps 11](https://haveninlipa.com/properties/mickey-in-lipa--family-house--sleeps-11) (₱4,500) or [sleeps 15](https://haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15) (₱6,500)
> - 💸 Booking direct saves you 15–20% — [here's why](https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/)

---

## URL reference (copy-paste safe)

| Listing | Sleeps (max) | From | URL |
|---|---|---|---|
| Cozy 1BR | 5 | ₱1,500 | `https://haveninlipa.com/properties/cozy-1-bedroom` |
| Spacious 2BR | 9 | ₱2,800 | `https://haveninlipa.com/properties/spacious-2-bedroom` |
| Mickey — Family Staycation | 7 | ₱2,500 | `https://haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7` |
| Mickey — Family House | 11 | ₱4,500 | `https://haveninlipa.com/properties/mickey-in-lipa--family-house--sleeps-11` |
| Mickey — Full Family House | 15 | ₱6,500 | `https://haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15` |
| Book Direct article (#6) | — | — | `https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/` |

Property pages live on the **main site** (`haveninlipa.com`); the Book Direct article lives on the **blog** (`blog.haveninlipa.com`). Mickey slugs use a **double hyphen** (`--`) — copy them exactly.

---

## Rollout / backfill plan

Per the existing anti-spam rule (Internal_Linking_Strategy.md): **don't bulk-edit every live article in one day** — Google can read a site-wide simultaneous footer swap as a manipulation signal.

1. **All new + scheduled articles (#17 onward):** ship with this 5-listing footer from day 1. Update the draft files in `050826/` and `053126/` so the embedded footer is already correct when Cassandra publishes.
2. **Live articles (#1–#16):** backfill in **batches of 2 per week** during the existing Monday publishing pass. ~8 weeks to clear all live articles.
3. Keep the same `## Ready to plan your Lipa trip?` H2 — it's already the recognized anchor and several articles reference "the footer block" in their embedded blogger checklists.

### ⚠️ Maintenance note (decision for Cedric)

This footer hard-codes **"from ₱X" prices** across ~29 articles. That's on-brand (HIL always shows real PHP budgets and it's a strong conversion signal) **but** it means a price change = a multi-article edit. Two options:

- **Keep prices (recommended)** — conversion lift is worth it; prices rarely drop, and "from ₱X" hedges against the extra-guest fee. Accept the periodic backfill cost.
- **Drop prices from the footer** — route by group size only, let the live property page show the current rate. Lower maintenance, slightly weaker hook.

If you ever do a site-wide price change, search every article folder for `from ₱` to find every footer instance.

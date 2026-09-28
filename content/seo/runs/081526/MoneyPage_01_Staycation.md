# Money Page 1 — `/staycation`

**Build 1 of 4 · Phase 3 draft · 2026-08-16**
**For:** Cedric → developer (new route on `haveninlipa.com`). Claude does not touch the codebase.
**Cluster:** C1 — Short-Term Rentals *(the cluster currently at zero clicks)*

---

## Page metadata

| Field | Value |
|---|---|
| **URL** | `https://haveninlipa.com/staycation` |
| **Title tag** | Staycation in Lipa City: 5 Private Homes, Booked Direct \| Haven in Lipa *(58 chars)* |
| **Meta description** | Five private homes for a Lipa City staycation — couples, families, barkadas and remote workers. Book direct from ₱1,500/night and skip the 14–20% platform fee. *(159 chars)* |
| **Canonical** | self |
| **Sitemap** | add at priority **0.9** |
| **Schema** | `FAQPage` (from the FAQ block below) — the one rich result available to this site |

> ### 🔴 Implementation rules — non-negotiable
> 1. **Every price, guest count and "From" prefix renders from `GET /api/properties.json`.** No hardcoded numbers anywhere on this page. Three rates changed silently in six weeks; that is exactly what this feed exists to prevent.
> 2. **`priceFrom` is the feed's boolean.** Render "From ₱X" when true, "₱X" when false. Never recompute it.
> 3. **Handle a short feed.** Selection is `isActive AND pricePerNight > 0` — a listing can drop out silently. Never assume five.
> 4. Values shown below in `{{braces}}` are feed fields. Values in plain text are copy.
>
> **Live reference values at time of writing (2026-08-16) — for layout only, do not paste:** Cozy 1BR ₱1,500 (covers 3, max 5, +₱300/guest) · Spacious 2BR ₱2,800 (covers 7, max 9, +₱300) · Mickey sleeps-7 ₱2,500 (covers 5, max 7, +₱400) · sleeps-11 ₱4,500 (covers 9, max 11, +₱400) · sleeps-15 ₱6,500 (covers 13, max 15, +₱400).

---

# Staycation in Lipa City: 5 Private Homes, Booked Direct

Lipa is about **an hour from Alabang** on SLEX and the STAR Tollway — call it **an hour and three quarters from central Manila** once traffic has its say. It sits high enough to be genuinely cooler than the lowlands, and it doesn't fill up the way Tagaytay does on a long weekend. It's where we live, and it's where we run five private homes you can book directly — no platform, no service fee, no bidding against a hundred other listings.

This page is the honest version: what each home costs, who each one actually suits, and what a weekend here looks like once you've dropped your bags.

## What a Lipa staycation actually costs

Rates start at **{{cozy.pricePerNight}}** a night and run to **{{sleeps15.pricePerNight}}** for the whole 15-person house. Nothing is hidden behind a checkout screen.

| Home | Sleeps up to | Nightly rate | Included guests |
|---|---|---|---|
| Cozy 1BR Haven | {{maxGuests}} | {{priceFrom ? "From " : ""}}{{pricePerNight}} | {{includedGuests}} |
| Spacious 2BR Getaway | {{maxGuests}} | {{priceFrom ? "From " : ""}}{{pricePerNight}} | {{includedGuests}} |
| Mickey in Lipa — Family Staycation | {{maxGuests}} | {{priceFrom ? "From " : ""}}{{pricePerNight}} | {{includedGuests}} |
| Mickey in Lipa — Family House | {{maxGuests}} | {{priceFrom ? "From " : ""}}{{pricePerNight}} | {{includedGuests}} |
| Mickey in Lipa — Full Family House | {{maxGuests}} | {{priceFrom ? "From " : ""}}{{pricePerNight}} | {{includedGuests}} |

*Table rendered from the feed, ordered as returned.*

### What "from" means, and what an extra guest adds

The nightly rate covers a set number of guests — **{{includedGuests}}** for that home. Beyond that, each additional guest is a flat per-night fee, and it's the same number in the booking calculator as it is here. That's the only variable. There is no cleaning fee, no service fee, no resort fee, and no surprise at checkout.

If a home's rate doesn't change with headcount, you'll see a flat price with no "From" — because there's nothing extra to add.

### The 14–20% you don't pay

Booking through a platform adds a guest service fee of roughly 14–20% on top of the nightly rate. On a two-night family stay that's often more than a full tank of fuel for the drive down.

Booking here, you pay the rate and the extra-guest fee, and that's the total. We take **GCash**, **BPI InstaPay** (no fees), and **credit card via Stripe** (6% processing). You're also messaging the people who own the homes rather than a support queue — which matters more than it sounds when you're arriving at 11pm and the gate is closed.

## Which home fits your trip

Five listings sorted by price tells you nothing useful. Here's the version that does.

### Two of you, and one of you has to work

**→ Cozy 1BR Haven** *(sleeps up to {{maxGuests}})*

400 Mbps fibre, speed-tested rather than advertised. A proper desk surface, Netflix Premium for the evening, and a solar backup that keeps things running through a brownout. If Monday morning has a standup in it, this is the one.

### A family with kids

**→ Mickey in Lipa — Family Staycation** *(sleeps up to {{maxGuests}})*

Disney-themed rooms that do a genuinely disproportionate amount of work on a family trip — the kids are delighted before anyone has unpacked. Full kitchen, so breakfast happens on your schedule instead of a hotel's.

### A barkada, or family plus grandparents

**→ Spacious 2BR Getaway** *(sleeps up to {{maxGuests}})* **or Mickey — Family House** *(sleeps up to {{maxGuests}})*

Two private bedrooms means the people who sleep early and the people who don't can both get what they want. Parking is inside the village gates.

### The whole clan, one roof

**→ Mickey in Lipa — Full Family House** *(sleeps up to {{maxGuests}})*

Three bedrooms across two floors. Reunions, milestone birthdays, and wedding parties who want everyone in one place the night before — [we wrote a separate page for that](/weddings-accommodation).

## Why Lipa and not Tagaytay

We're not going to pretend Tagaytay doesn't have the better view. It does. Here's the honest trade.

**The traffic goes the other way.** SLEX then the STAR Tollway — about an hour from Alabang. On a Friday evening the queue is heading to Tagaytay, not through Lipa.

**Cooler than the lowlands, cheaper than the ridge.** Lipa sits high enough that evenings need a blanket, without the ridge-view premium on every rate in town.

**It doesn't sell out.** Long weekends in Tagaytay mean booking a month ahead and paying surge rates. Lipa absorbs a holiday weekend without either.

We put the full comparison in [Lipa vs Tagaytay: an honest comparison from a host who lives in Lipa](https://blog.haveninlipa.com/lipa-vs-tagaytay-an-honest-comparison-from-a-host-who-lives-in-lipa/).

## What a weekend here actually looks like

**Friday night.** Arrive, drop bags, and eat. [Beegee's for lomi](https://blog.haveninlipa.com/best-lomi-lipa-city/) if you want the Batangas thing done properly, or [one of the sit-down places](https://blog.haveninlipa.com/best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide/) if the drive was long.

**Saturday.** Pick one: [Mt. Maculot](https://blog.haveninlipa.com/mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa/) if there are hikers in the group, [Taal Heritage Town](https://blog.haveninlipa.com/taal-volcano-day-trip-from-lipa-city-2026-updated-guide/) if there aren't, or [Casa de Segunda and the cathedral](https://blog.haveninlipa.com/casa-de-segunda-lipa-city/) if the weather's against you. Back for the afternoon, out again for [barako coffee](https://blog.haveninlipa.com/lipa-barako-coffee-heritage/).

**Sunday.** Slow start, groceries from the market for the drive home, checkout at noon. If it's raining, [there's a whole guide for that](https://blog.haveninlipa.com/indoor-things-to-do-in-lipa-city-when-it-rains/).

Or ignore all of it and stay in. That's a legitimate use of a staycation and the most common thing our guests actually do.

## Practical things nobody tells you

**Brownouts happen, and one of our houses shrugs them off.** They're normal in Batangas — the announced ones can run most of a day, the unannounced ones usually a couple of hours.

The house with the **Cozy 1BR and Spacious 2BR** runs on a **solar array with battery backup, powering the whole unit — not just the lights.** In a daytime outage the panels carry the load, so the battery barely gets touched. After dark it's about **four hours with the aircon running**, and considerably longer without.

In practice that covers essentially every unannounced brownout, and the daylight half of a scheduled one. Worth knowing if you're working, or travelling with someone who won't sleep without aircon. *(✅ Verified with the owner 2026-08-16. The Mickey house does not have solar — don't imply otherwise.)*

**The WiFi is real.** 400 Mbps fibre in the 1BR, speed-tested. If you're taking calls, ask us and we'll tell you honestly whether the home you're looking at will hold up.

**Parking is inside the gates.** Not on a street, not in a public lot.

**Groceries.** SM Lipa for a full shop; the public market if you'd rather buy the way we do.

**Check-in is 2pm, checkout 12nn** — 3pm check-in for the Mickey houses. Ask if you need either moved; we usually can.

## Frequently asked questions

**Can I book for one night?**
Yes. There's no minimum-stay rule on any of the five homes.

**What's the maximum number of guests?**
It varies by home — from {{min maxGuests}} to {{max maxGuests}}. The nightly rate covers a set number and each guest beyond that is a flat per-night fee. The booking calculator shows the total before you commit.

**How do I pay?**
GCash, BPI InstaPay (no fees), or credit card via Stripe (6% processing fee).

**Is it safe to book directly?**
Payment goes through Stripe or a named BPI account, you get written confirmation, and you're dealing with Melody and Wilma directly. Full detail on the [FAQ page](/faq).

**Can I bring pets?**
Ask us — it depends on the home. Say so when you enquire rather than on arrival.

**Can we have a small gathering?**
Yes, as long as you tell us in advance. It's in the house rules: gatherings are fine with the host informed. What we can't accommodate is an unannounced event.

**Can I book more than one at a time?**
We have two houses, five doors apart — about a two-minute walk. Together they sleep **up to 24**. What you can't do is book two options on the *same* house: the different guest counts are configurations of one property, not separate units. Tell us your headcount and we'll sort the split.

**Do you have a place for a bigger group?**
The big house sleeps up to 15, and both houses together take 24. For wedding parties and reunions, see [where your wedding party stays](/weddings-accommodation).

## Check your dates

Pick the home that fits and see live availability — no account, no platform, no service fee.

**[See all five homes →](/properties)**

---

## Developer notes

**Route:** `src/app/staycation/page.tsx`

**Data:** server-side fetch of `https://haveninlipa.com/api/properties.json`, cached on the same 1-hour cadence as the feed. On fetch failure, render the copy with the property table omitted rather than erroring — the page still works as an argument for booking direct.

**Schema:** emit `FAQPage` from the FAQ block. Follow the existing pattern in [src/lib/faqs.ts](file) / `/faq`.

**Sitemap:** add to `src/app/sitemap.ts` at priority 0.9, `changeFrequency: 'monthly'`.

### 🔴 Required redirect — article #6 consolidation *(approved 2026-08-16)*

`https://blog.haveninlipa.com/why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take/` → **301** → `https://haveninlipa.com/staycation`

This is a **WordPress-side** redirect via the Redirection plugin, not a Next.js one. Article #6 is being retired: it draws 17 impressions and 0 clicks and targets the same rate-shopper as this page. Its book-direct argument is absorbed into the pricing section above.

⚠️ Before adding the redirect, check what still links to #6 in-body across the other 22 posts and repoint those to `/staycation` — otherwise every one becomes an extra hop.

### Internal links into this page

| From | Anchor |
|---|---|
| `/properties` | "Planning a staycation?" |
| Homepage — Our Rentals section | "See staycation options" |
| Blog footer ladder / Stay Match `<0.4` tier | existing CTA slot |
| Article #9 `work-from-lipa` | "work-from-Lipa staycation" — matches `work from home staycation`, pos 5 |
| Article #11 `family-staycation` | "family staycation homes" |

### Post-launch

1. Request indexing in GSC.
2. Watch **`staycation in lipa`** (pos 9.5) and **`work from home staycation`** (pos 5 — already converted a click in June). Those two are the page's job.
3. **Do not judge this page on impressions.** Judge it on property-page click-through and bookings, per the standing rule.

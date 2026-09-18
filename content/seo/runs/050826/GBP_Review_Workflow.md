# Google Business Profile (GBP) Review Generation Workflow

**Owner:** Melody (host) with optional VA / assistant support
**Goal:** Move GBP from 4 reviews / 4.0★ → **25+ reviews at 4.7★+ within 90 days** (by August 8, 2026)
**Status:** Not yet launched — single highest-leverage uncovered item across the May 8 audit

---

## Why this matters now

HavenInLipa's website claims 180+ five-star reviews aggregated across platforms. The Google Business Profile shows 4. That gap is visible the moment a prospective guest Googles "haven in lipa reviews" — and right now, the brand SERP shows competitors and aggregators (Airbnb, Booking, Expedia) instead of the HavenInLipa GBP. Closing this gap does three things at once:

1. **Local pack ranking** — Google weights review velocity and recency heavily for local results
2. **Brand SERP defense** — a robust GBP with 25+ reviews dominates the right-hand knowledge panel and pushes aggregator pages down
3. **Conversion** — direct-booking trust shoots up the moment GBP shows social proof matching website claims

With 8 published blog articles potentially driving organic discovery, weak GBP social proof is now the conversion choke point. Without this fix, content traffic leaks to Airbnb/Booking instead of converting on haveninlipa.com.

---

## The 3-touchpoint flow

For every guest who checks out, run this sequence. Stop after one nudge if no review.

### Touchpoint 1 — Check-out day +1 (SMS)

Send the morning after check-out. Short, warm, no friction.

**SMS template (≤160 chars):**
> Hi [First Name]! Hope your stay at HavenInLipa was great. If you had a moment, we'd love a Google review: [short link]. Salamat! — Melody

**Variant for repeat guests:**
> Hi [First Name]! Always great hosting you. A quick Google review when you have time would mean a lot: [short link]. — Melody

### Touchpoint 2 — Check-out day +2 (Email)

Send late morning the day after the SMS. Longer, includes a property photo and soft mention of a return-stay perk (offered regardless of whether they leave a review — see compliance note).

**Email subject:** Thanks for staying with us at HavenInLipa

**Email body:**
> Hi [First Name],
>
> Thanks again for choosing HavenInLipa for your trip to Lipa City. It was great hosting you.
>
> If you had a moment to leave us an honest Google review, we'd be really grateful — it helps us reach other travelers looking for a quiet, direct-booking stay in Lipa.
>
> [LEAVE A GOOGLE REVIEW] (button → short link)
>
> If you're thinking about a return trip, message us directly when you're ready — direct-booking guests get the best rate and our flexibility on check-in.
>
> See you again soon,
> Melody
> HavenInLipa
> haveninlipa.com

### Touchpoint 3 — Check-out day +5 (SMS, only if no review yet)

One soft nudge, then stop. Pestering destroys trust.

**SMS template:**
> Hi [First Name]! Quick reminder — if you have a minute for a Google review, here's the link: [short link]. No worries either way. — Melody

---

## Mechanics

### Generate the GBP review short link (one-time setup)

1. Open the HavenInLipa Google Business Profile in Google's manager
2. From the dashboard, click **Get more reviews** (or **Ask for reviews**)
3. Google generates a short URL in the format `g.page/r/[place-id]/review` — this pre-fills the star selector and review form
4. Copy this URL. Use a link shortener (Bit.ly or similar) to keep SMS character count low and to track click-through

### Tracking sheet (Google Sheets)

Set up a single-tab tracking sheet:

| Guest Name | Property | Check-out Date | Email | Phone | T1 SMS Sent | T2 Email Sent | T3 SMS Sent | Review Posted | Star Rating | Notes |
|---|---|---|---|---|---|---|---|---|---|---|

- Pre-fill T1, T2, T3 dates as auto-formulas (check-out date + 1, +2, +5)
- Mark "Review Posted" YES/NO daily by checking the GBP feed
- Track conversion rate: review-posted ÷ guests-contacted

### Cadence

Most stays are 2 to 4 nights. With 1 to 2 stays per week per property and 2 properties, that's roughly 8 to 16 guests per month entering the funnel. A 50% review conversion rate yields 4 to 8 new reviews per month — meeting the 25-in-90-days target with margin.

---

## Compliance — what NOT to do

Google's review policy is strict. Violations can lead to GBP suspension or wholesale review deletion. Read this section before launching.

### Never offer a discount, gift, or perk in exchange for a review

Saying "leave a review and get 10% off your next stay" violates Google ToS. The "return-stay perk" mentioned in the email is offered to **all returning direct-booking guests regardless of whether they leave a review** — that's the framing that keeps it compliant.

### Never ask for a 5-star review specifically

Ask for an "honest review." Google detects review-rating-bias language and can flag the listing.

### Never review-gate or filter

Do not ask satisfied guests for reviews and dissatisfied guests for private feedback only. That's "review gating" and violates Google policy. Send the request to every guest.

### Never write reviews on behalf of guests

Self-explanatory but worth stating. No fake reviews. No staff reviews. No "have your friend leave one." Google's anomaly detection catches these and review removal cascades through the listing.

### Never solicit reviews in bulk or via third-party services that pay for reviews

Use only the official Google review link generated from your GBP dashboard.

---

## KPIs and reporting cadence

Track weekly, report monthly. The 90-day target is binary — hit it or don't.

| KPI | Today (May 8) | 30-Day | 60-Day | 90-Day (Target) |
|---|---|---|---|---|
| Total Google reviews | 4 | 12 | 18 | **25+** |
| Star average | 4.0★ | 4.5★+ | 4.6★+ | **4.7★+** |
| Review velocity (reviews/month) | 0–1 | 8 | 8 | 8+ sustained |
| GBP profile views (monthly) | TBD | 250+ | 400+ | **500+** |
| GBP direction requests (monthly) | TBD | 30+ | 60+ | **100+** |
| Direct-booking conversion lift | baseline | +10% | +15% | **+20% vs. April** |

**Source for KPI data:** Google Business Profile Insights (free, in the GBP manager).

---

## Launch checklist

- [ ] Generate the GBP short review link from Google dashboard
- [ ] Create the Google Sheets tracking template (use the columns above)
- [ ] Drop SMS T1, T2, T3 templates into the host's phone or messaging tool (or assistant's account)
- [ ] Drop the email template into Gmail / email tool with the [LEAVE A GOOGLE REVIEW] button linked
- [ ] Backfill: send the T1 SMS to all guests who checked out within the past 14 days (don't go further back — feels stale)
- [ ] From Day 1 forward: every check-out triggers the 3-touchpoint sequence
- [ ] Weekly: review the tracking sheet, mark review-posted entries, calculate conversion rate
- [ ] Monthly: pull GBP Insights report, compare to KPI targets, adjust messaging if conversion <40%

---

## What to do if a guest leaves a 1-star or critical review

It will happen eventually. Respond publicly within 24 hours.

**Response template (adapt to specifics):**
> Hi [Guest Name], thank you for taking the time to share your feedback. We're really sorry the stay didn't meet your expectations — [acknowledge the specific issue]. We've [explain the action you've taken or are taking]. We'd love the chance to host you again and make it right — please message us directly at customerservice@haveninlipa.com.
>
> — Melody

Three rules:
1. **Always reply publicly.** Silent listings look worse than imperfect ones.
2. **Acknowledge, don't argue.** Even if the guest is mistaken, defensive replies hurt future bookings.
3. **Move the resolution to email or DM.** Don't litigate in the public review thread.

A handful of 4-star reviews mixed into a sea of 5-stars actually *increases* trust — flawless ratings often read as fake. Stay calm, respond well, keep the velocity up.

---

## Why this is the highest-leverage May 8 action

Every other recommendation in the May 8 audit takes hours of writing, design, or development. The GBP review flow takes about 90 minutes to set up and then ~10 minutes per guest to run. The ROI is the steepest of any line item:

- **Cost:** ~2 hours setup, ~2 hours/month execution
- **90-day return:** 25+ reviews, brand SERP repaired, local pack ranking lift, conversion lift estimated at +20% on direct-booking leads
- **Risk:** essentially zero if compliance rules are followed

Launch this week. Everything else can wait a day. This shouldn't.

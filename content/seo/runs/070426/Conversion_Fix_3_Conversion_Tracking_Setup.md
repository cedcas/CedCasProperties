# Conversion Fix #3 — Conversion Tracking Setup
**HavenInLipa · Delta run 070426 · Priority: 🔴 FOUNDATIONAL (unblocks everything else)**

## Why this is first-among-equals
Right now you know traffic is up and you sold ~2 bookings — but you **cannot see which pages, articles, or keywords produced those bookings.** You're optimizing blind. Every other fix (reviews, funnel, lead magnet) needs this to prove whether it worked. Your KPI Dashboard's conversion rows are empty because there's nothing feeding them yet.

**Goal:** measure booking intent + completed bookings from organic, attribute them to pages/keywords, and fill the KPI Dashboard's conversion tier.

## Step 1 — Stand up GA4 (if not already live)
1. Create a **GA4 property** for haveninlipa.com (and, if the blog is a separate subdomain, ensure the same GA4 tag fires on `blog.haveninlipa.com` too, or use cross-domain measurement so blog→main is one journey).
2. Install via **Google Tag Manager** (recommended — lets you add events without dev each time) or `gtag.js`.
3. **Link GA4 ↔ Google Search Console** (Admin → Product links) so you get query → landing page → conversion in one place.

## Step 2 — Define the events (the important part)
Configure these events; mark the starred ones as **Key events (conversions)**:

| Event name | Fires when | Notes |
|---|---|---|
| `book_click` | User clicks the booking card CTA ("Agree to Rules to Book") on a property page | Booking intent |
| `booking_confirmed` ★ | Payment success / thank-you page loads | **The real conversion** |
| `generate_lead` ★ | Contact form submits with subject = "Booking Inquiry" | Inquiry = soft conversion |
| `message_click` | Click on WhatsApp / phone / "Message us" | Off-site intent (hard to close-track, but count it) |
| `check_availability` | Date picker / "Check Availability" interaction | Micro-conversion, funnel diagnostic |

**In GTM:** each is a Click or Form-submit trigger → GA4 Event tag. For `booking_confirmed`, the cleanest trigger is a **dedicated thank-you URL** (e.g. `/booking-confirmed`) — ask whoever manages the booking flow to redirect there on success.

## Step 3 — Tag your blog CTAs so blog→booking is visible
Add UTM parameters (or GTM link-click tracking) to the property links inside blog articles, e.g.:
`?utm_source=blog&utm_medium=article&utm_campaign=things-to-do-1`
Now you can see **which articles actually drive booking clicks** — and prove/disprove Conversion Fix #2.

## Step 4 — Wire it into the KPI Dashboard
Once `booking_confirmed` + `generate_lead` are collecting:
- Fill the **Local / Conversion** tier monthly from GA4 (organic-segmented): bookings, inquiries.
- Add (I can patch these in) two rows: **Organic Conversions** and **Organic Conversion Rate** (conversions ÷ organic sessions) — the single most important number for proving ROI. Say the word and I'll add them to the dashboard with the same styling.
- Keep the GBP rows (calls/directions/website-clicks) — they stay as local-intent proxies.

## Step 5 — Attribution check (the payoff)
In GA4 → **Reports → Engagement → Landing page**, segment to **Organic**, add your key events as the metric. This tells you:
- Which **landing pages** produce bookings (info articles vs property vs homepage).
- With GSC linked: which **queries** precede bookings.
This finally answers *"is my growing traffic the kind that books?"* — and tells you where to double down.

## Reality check / ownership
This step needs **GTM/site access and a thank-you URL on the booking flow** — that's a client/dev task, not something I can deploy. This doc is the spec to hand to whoever manages the site. Everything downstream (filling the dashboard, reading attribution, adding the two KPI rows) I can do with you once events are flowing.

## Definition of done
- [ ] GA4 live on both main + blog; linked to GSC.
- [ ] `booking_confirmed` + `generate_lead` marked as Key events.
- [ ] Blog CTAs UTM-tagged.
- [ ] KPI Dashboard conversion rows filling monthly; Organic Conversion Rate row added.
- [ ] First attribution read done (which pages/keywords → bookings).

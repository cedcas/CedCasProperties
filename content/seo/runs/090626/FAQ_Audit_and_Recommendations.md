# Haven in Lipa — FAQ Audit & Final Recommended Content

Prepared: 2026-09-06 · Last revised: 2026-09-06 (post owner approval)
Scope: Analysis and content deliverable only. No code, WordPress, schema, or redirects were implemented.

**Approval status:** Fully resolved. Sections 7 and 9 were reviewed and approved by the owner on 2026-09-06 (SEO-DEC-013 through SEO-DEC-017), and the one item left open at that time — the "free rebooking 14+ days out" offer — was resolved on 2026-09-06 as well (SEO-DEC-018): the offer is **removed**, not approved as a public policy. No owner decisions remain pending. This document is finalized and ready for Web Work Stream handoff.

Sources inspected (all live/current at time of writing):
- `src/lib/faqs.ts`, `src/components/sections/FAQ.tsx`, `src/app/faq/page.tsx` — the current public FAQ (single source of truth, 14 items)
- `src/app/terms/page.tsx` — Terms of Service (binding policy language)
- `src/lib/chat/chat-tree.ts` — the on-site rule-based chatbot (separate system from admin Quick Replies)
- `prisma/seed-property-seo.ts` (B34: Cozy 1-Bedroom, Spacious 2-Bedroom) and `prisma/seed-property-seo-mickey.ts` (B38 "Mickey in Lipa": Sleeps 7 / 11 / 15) — `housePolicies`, `pricingNotes`, `propertyFaqs`
- `src/app/weddings-accommodation/page.tsx` — "two houses, five doors apart" / same-village framing
- `src/app/about/page.tsx` — host bio (Melody, Superhost)
- `src/app/sitemap.ts` — confirms `/faq` is a submitted, indexable URL
- `content for HavenInLipa/SEO_COMPLETION_LOG.md` — prior Rich Results validation of `/faq`
- `haveninlipa/About HIL/HIL_DECISIONS.md` (DEC-008) and `HIL Website Technical Specification.md` — schema and capacity-derivation rules

---

## 1. Executive Recommendation

**Architecture is already close to best practice — this is a content-accuracy problem, not a structure problem.** Haven in Lipa already has exactly the architecture this kind of assignment normally has to recommend building: a canonical `/faq/` page (`src/app/faq/page.tsx`) with its own title/meta/canonical tag and `FAQPage` JSON-LD built directly from the same array the page renders, plus a 5-question homepage teaser that links to it. There is no `/#faq` fragment anywhere on the site — no nav link, no footer link, no anchor id — so the specific risk this assignment flags (treating a homepage anchor as an indexable page) does not currently exist here. **Recommendation: keep this architecture.** The work needed is revising what the FAQ says, not where it lives.

**What's wrong with the current content:**
1. **B38 ("Mickey in Lipa") does not exist anywhere in the public FAQ.** All 14 current questions were written before Mickey launched and only ever reference the 1BR/2BR (B34). A guest researching the Sleeps-7/11/15 house — live, bookable inventory — gets zero FAQ coverage of it.
2. **The B34-vs-B38 check-in distinction is real and is now resolved by owner decision (2026-09-06, SEO-DEC-013): B34 check-in is 2:00 PM, B38 check-in is 3:00 PM.** The site's Terms of Service currently states one blanket "2:00 PM onwards" with no property distinction — that page is now known to be out of date and needs a corresponding correction, which is a Web Work Stream implementation task, not something resolved by this document alone.
3. **Early check-in/late checkout is now a confirmed, approved policy: ₱200 per hour, subject to approval and availability (SEO-DEC-013).** This fee does not yet appear anywhere on the live site (FAQ, Terms, or chatbot) — publishing it is new content, not a correction of something already live.
4. **The 1-Bedroom capacity conflict is resolved: 5 guests is the approved, correct figure (SEO-DEC-014),** matching the live booking system's server-side cap. The public FAQ's stale "4" should be corrected accordingly.
5. **A travel-time conflict remains, unaddressed by this approval round and outside this deliverable's scope:** the FAQ and every property page say "about 1 hour from Manila via SLEX/STAR Tollway"; the chatbot says "about 1.5 hours." Flagged for awareness only — it's chatbot copy, not FAQ copy, and doesn't block anything in this document.
6. **Several genuinely useful guest questions are answered per-property (in `propertyFaqs`) but never surfaced on the actual public FAQ page** — parking type (open slot vs. garage), whether parties/events/extra visitors are allowed, and how/when check-in instructions arrive (in general terms only, never the actual access details — see Section 7). These are exactly the kind of pre-booking friction questions the public FAQ should be catching.
7. **The "free rebooking 14+ days out" offer is removed, not approved.** It appeared in the current live FAQ and the chatbot's cancellation answer, but was never in the Terms of Service. The owner decided (SEO-DEC-018, 2026-09-06) to drop it entirely — Haven in Lipa may still consider rebooking requests privately, case by case, but this must never be presented publicly as a guaranteed policy, guest entitlement, standard exception, or promised benefit. No replacement public wording about case-by-case rebooking is included. The cancellation/refund tiers (6.1 in Section 5) stand alone, with no rebooking exception attached.
8. **Two scope decisions were made by omission, approved 2026-09-06:** the public FAQ will not carry a security-deposit question (full-payment-at-booking is still explained, but never framed as a deposit) and will not carry an ID/KYC question, since no formal policy exists yet for either (SEO-DEC-016).
9. **Guest-facing payment terminology changed:** "Stripe" is replaced with "Credit/Debit Card" throughout guest-facing FAQ copy (SEO-DEC-015). "Stripe" remains correct and expected in technical/developer-facing documentation, including Section 8 of this report.

**Principal SEO/conversion opportunity:** the FAQ is currently a flat, un-categorized list of 14 Q&As with no heading structure beyond H1/H2-per-question. Reorganizing into the seven categories below with H2 section headers, plus adding the missing B38 and policy-clarity content, both improves scannability for guests comparing two houses and gives Google cleaner topical structure to crawl — without inflating word count for its own sake.

**Facts still requiring confirmation: none.** Every item previously flagged in this document — the B38 check-in time vs. the Terms of Service, the ₱200/hour rate, the 1-Bedroom capacity, and the free-rebooking offer — has been resolved by owner decision. This document is finalized and ready to hand to the Web Work Stream (see Section 9).

---

## 2. Current FAQ Audit

All 14 items below are drawn verbatim from `src/lib/faqs.ts` (rendered by both the homepage teaser and `/faq`).

| # | Current question | Keep / Revise / Merge / Move / Remove | Reason | Accuracy or source concern | Recommended destination |
|---|---|---|---|---|---|
| 1 | What makes Haven in Lipa different from a hotel or Airbnb? | **Merge** (into #11) | Near-total overlap with "Why book direct... instead of Airbnb" — both make the same fee/personal-service/full-home argument | None | Public FAQ |
| 2 | Where exactly are your properties located in Lipa City, Batangas? | **Revise** | Never states that there are *two* properties/houses, or that they're in the same subdivision — a guest reading this doesn't learn B34 and B38 exist | None on the stated facts, but incomplete | Public FAQ |
| 3 | How do I book a short-term rental on Haven in Lipa? | **Revise** | Restates the full payment-method/fee list that's already covered in its own dedicated FAQ (#4) — redundant; also names "Stripe," which is now removed from guest-facing copy | None | Public FAQ |
| 4 | What payment methods do you accept? | **Revise** | Cancellation percentages and the no-fee/6%-fee split are accurate, but the answer names "Stripe" — guest-facing copy now says "Credit/Debit Card" instead (SEO-DEC-015) | None — resolved | Public FAQ |
| 5 | What is your cancellation policy? | **Revise** | The 100%/50%/0% tiers are approved and verified against the Terms of Service. The "free rebooking 14+ days out" line is being **removed** — it was never in the Terms of Service, and the owner decided (SEO-DEC-018) not to publish it as a policy. Rebooking may still be considered privately, case by case, but that is never stated publicly | Resolved — offer removed, not replaced with public wording (see Sections 5, 6, and 9) | Public FAQ (tiers only) + Policy page (Terms, tiers only) |
| 6 | Can I book for just one night? | **Keep** (reorder) | Useful, low-friction, no issues | None | Public FAQ |
| 7 | Is the WiFi fast enough for remote work? | **Revise** | Only covers 2BR (400 Mbps) and 1BR ("dedicated business-grade," no number given) — omits B38/Mickey's 500+ Mbps fiber entirely | 1BR has no stated Mbps figure — cosmetic gap, not a conflict | Public FAQ |
| 8 | Is parking safe? | **Revise** | True for both properties but doesn't distinguish B34's open in-village slot from B38's garage (fits one small/compact car; larger vehicles park in the village) | None — verified, just incomplete | Public FAQ |
| 9 | Are your properties good for families with kids? | **Revise** | Only addresses the 2BR's loft/staircase caution; says nothing about B38, which is explicitly designed and marketed for families/reunions | None | Public FAQ |
| 10 | Can I bring pets? | **Keep** | Applies identically to both properties, verified in both property records | None — verified | Public FAQ |
| 11 | Why book direct with Haven in Lipa instead of Airbnb? | **Keep** (absorbs #1) | Strongest single differentiation answer on the page | None | Public FAQ |
| 12 | Is it safe to book directly? | **Keep** (light revise) | Trust signal is solid (Superhost, guest count, verified business address) — tighten wording only | None | Public FAQ |
| 13 | What are your check-in and check-out times? | **Split** into 3 items | Currently one answer covers general times, early/late arrangements, *and* implies one blanket schedule — conflates three distinct questions and omitted the B34/B38 difference and any fee | Resolved — B34 2:00 PM / B38 3:00 PM / ₱200 per hour early-late all approved 2026-09-06 (SEO-DEC-013); see Sections 5 and 6 | Public FAQ (general times) + dedicated B34/B38 item + Quick Reply (arrival specifics) |
| 14 | Can I bring a larger group? What's the maximum? | **Revise** heavily | Stated "1BR sleeps up to 4," never mentioned B38's three configurations (7/11/15) or the correct 2-house combined total | Resolved — approved figure is 5 for the 1-Bedroom (SEO-DEC-014), matching the property's own `maxGuests` and the live booking form's server-side cap | Public FAQ |

**Not currently on the FAQ at all but answered per-property in `propertyFaqs`** (candidates addressed in Section 3): parties/events/visitors policy, whether guests can cook, how many guests the nightly rate *covers* vs. the hard cap (extra-guest fee), and the B34/B38 physical relationship ("two houses, five doors apart" — currently only stated on `/weddings-accommodation`).

---

## 3. Guest-Question and Content-Gap Analysis

| Missing question | Guest journey stage | Likely intent | Business value | SEO value | Treatment |
|---|---|---|---|---|---|
| What's the difference between B34 and B38 ("Mickey in Lipa")? | Consideration | Commercial | High — routes guests to the right unit, prevents booking the wrong config | Medium — natural comparison query | Public FAQ |
| Are check-in times different for the two properties? | Consideration / pre-arrival | Informational/Transactional | High — prevents a guest showing up at 2 PM to a house that isn't ready until 3 | Medium | Public FAQ |
| Can I check in early or check out late, and how much does it cost? | Pre-arrival | Transactional | High — a recurring pre-booking and pre-arrival question; a stated ₱/hour rate reduces back-and-forth messaging | Medium | Public FAQ (policy) + Quick Reply (day-of arrangement) |
| Which unit should I book for my group size? | Consideration | Commercial | High — direct conversion assist across 5 listings | Medium | Public FAQ |
| Can I book both houses together for a wedding/reunion/big event? | Consideration | Commercial | High — this is the exact intent `/weddings-accommodation` and the Occasions & Groups cluster (C7) already target | High — internal link opportunity to a money page | Public FAQ (short answer, link to `/weddings-accommodation`) |
| How and when will I receive check-in instructions? | Post-booking anxiety, pre-arrival | Informational | Medium — reduces "did my booking go through / what do I do next" messages | Low | Both — general policy on FAQ, actual instructions via Quick Reply (Section 7 boundary applies: no arrival procedures, access codes, Wi-Fi credentials, or caretaker coordination in the public answer) |
| How do I know my reservation is confirmed? | Immediately post-booking | Transactional | Medium — GCash/BPI pending-vs-instant distinction isn't explained anywhere guest-facing today | Low | Public FAQ |
| Are parties, events, or extra visitors allowed? | Consideration | Informational/Transactional | High — prevents a disputed stay later; currently only stated in per-property FAQ, invisible to someone browsing the main FAQ | Medium | Public FAQ |
| Is Haven in Lipa's booking site itself safe/secure to pay on? | Consideration (trust) | Commercial | High for a direct-booking business competing with OTA trust signals | Medium | Public FAQ |

**Decided out of scope (owner approval, 2026-09-06 — SEO-DEC-016):** "Is a security deposit required?" and "What identification or guest information is required?" were both considered and explicitly **not** added as public FAQ questions. Haven in Lipa has no formal security-deposit or ID/KYC policy today, and the public FAQ must not imply one exists (and must not announce a possible future one either). The full-payment-at-booking fact is still explained where it naturally fits (see FAQ 3.1 in Section 5), just never framed as a deposit.

---

## 4. Recommended FAQ Structure

Seven categories, all used (no thin/empty sections):

1. **Choosing a Property** — B34 vs. B38 differences, capacities, group-size guidance, booking both houses together
2. **Location and Getting There** — where both houses are, travel time from Manila, nearby landmarks
3. **Booking and Payment** — how to book (incl. full payment at booking), payment methods/fees, reservation confirmation, site safety
4. **Check-In and Checkout** — general times, the B34/B38 split, early/late arrangements and fee, instruction delivery
5. **Amenities and House Rules** — WiFi, parking, kitchen, pets, parties/visitors, families with kids
6. **Changes, Cancellations, and Refunds** — refund tiers only (no rebooking exception; see SEO-DEC-018)
7. **Direct Booking and Guest Support** — why book direct, one-night stays, contacting Haven in Lipa

---

## 5. Final Proposed FAQ Content

Each item lists: category, final question, final draft answer, primary intent, recommended internal link, Public FAQ / Quick Reply / Both classification, and validation status.

### Category 1 — Choosing a Property

**1.1 What's the difference between your two properties?**
> Haven in Lipa has two separate houses inside the same gated Bella Vita subdivision in Lipa City — about a two-minute walk apart. **B34** is our original property with two configurations: a Cozy 1-Bedroom (sleeps up to 5) and a Spacious 2-Bedroom (sleeps up to 9). **B38, "Mickey in Lipa,"** is a Mickey-themed house with three configurations depending on how many rooms you need: Sleeps 7, Sleeps 11, or the Full House (sleeps up to 15). Each house takes one booking at a time, so if you need to compare, see "Which unit should I book for my group size?" below.
- *Intent:* Commercial (comparison) · *Link:* `/#properties` · *Classification:* Public FAQ · *Validation:* Verified (property records)

**1.2 How many guests can each unit accommodate?**
> - **Cozy 1-Bedroom (B34):** sleeps up to 5
> - **Spacious 2-Bedroom (B34):** sleeps up to 9
> - **Mickey in Lipa, Sleeps 7 (B38):** sleeps up to 7
> - **Mickey in Lipa, Sleeps 11 (B38):** sleeps up to 11
> - **Mickey in Lipa, Full House (B38):** sleeps up to 15
>
> These caps are strictly enforced for safety. Note that B34 and B38 are two separate houses — capacities don't combine within a house, but you can book both houses on the same dates for a larger group (up to 24 guests total across both).
- *Intent:* Transactional · *Link:* `/#properties` · *Classification:* Public FAQ · *Validation:* Approved (SEO-DEC-014, 2026-09-06) — 5 is the confirmed figure for the Cozy 1-Bedroom, resolving the prior conflict with the stale "4" on the live public FAQ.

**1.3 Which unit should I book for my group size?**
> - 1–2 guests, or a couple/solo traveler: **Cozy 1-Bedroom**
> - Small family or up to 5: **Cozy 1-Bedroom**
> - Family or barkada trip, up to 9: **Spacious 2-Bedroom**
> - Small group, up to 7: **Mickey Sleeps 7**
> - Medium group or two-generation family, up to 11: **Mickey Sleeps 11**
> - Big group — reunion, birthday, barkada weekend — up to 15: **Mickey Full House**
> - Still not sure, or need both houses at once? Message us and we'll help you figure out the best fit.
- *Intent:* Commercial · *Link:* `/#properties` · *Classification:* Public FAQ · *Validation:* Verified

**1.4 Can I book both houses for a wedding, reunion, or big event?**
> Yes. B34 and B38 are two separate houses in the same village, about a two-minute walk apart, and can be booked together — up to 24 guests across both houses on the same dates. This setup works well for wedding parties, multi-generation family trips, and reunions where everyone wants to stay close but not in one building. See our dedicated page for group and wedding-party accommodation.
- *Intent:* Commercial · *Link:* `/weddings-accommodation` · *Classification:* Public FAQ · *Validation:* Verified

**1.5 Are your properties good for families with kids?**
> Yes. The Spacious 2-Bedroom (B34) is family-built: two private bedrooms, a full kitchen, and a baby-safe living area — note it has a loft reached by an internal staircase, so if you're traveling with crawlers or very young toddlers, message us about the layout first. Mickey in Lipa (B38) was designed specifically for families and groups, with themed bunk rooms that kids love. SM Lipa is 5–10 minutes away for supplies, and hospitals are within 10 minutes.
- *Intent:* Informational/Commercial · *Link:* `/properties/spacious-2-bedroom` · *Classification:* Public FAQ · *Validation:* Verified

### Category 2 — Location and Getting There

**2.1 Where is Haven in Lipa located?**
> Both of our houses are inside Bella Vita, a quiet, gated subdivision in Lipa City, Batangas — about one hour from Manila via SLEX and the STAR Tollway. B34 and B38 ("Mickey in Lipa") are separate houses within the same subdivision, about a two-minute walk apart.
- *Intent:* Informational (local) · *Link:* `/#properties` · *Classification:* Public FAQ · *Validation:* Verified

**2.2 How far is Haven in Lipa from Manila and nearby landmarks?**
> About one hour from Manila via SLEX and the STAR Tollway. From the property, it's roughly 5–10 minutes to SM Lipa for groceries and shopping, and under 10 minutes to major hospitals (Mary Mediatrix, Lipa Medix). The Mt. Maculot trailhead and Casa Marikit are a short drive away.
- *Intent:* Informational (local, travel planning) · *Link:* blog.haveninlipa.com — the current Getting to Lipa / Things to Do content (developer/Cedric to confirm the live URL) · *Classification:* Public FAQ · *Validation:* Verified — **note:** the on-site chatbot currently states "about 1.5 hours," which conflicts with this and every property page; that's a chatbot copy issue outside this FAQ's scope, flagged for awareness.

### Category 3 — Booking and Payment

**3.1 How do I book directly?**
> Browse our properties, pick your dates, and complete the booking form. Choose GCash, BPI InstaPay, or Credit/Debit Card, and you'll get a confirmation email once your payment is verified. Full payment is required at the time of booking to secure your dates.
- *Intent:* Transactional · *Link:* `/#properties` · *Classification:* Public FAQ · *Validation:* Verified. Guest-facing terminology updated per SEO-DEC-015 (no "Stripe" mention). The full-payment line is included here, factually, without deposit framing, per SEO-DEC-016.

**3.2 What payment methods do you accept, and are there fees?**
> We accept GCash and BPI InstaPay — both fee-free — and Credit/Debit Card, which carries a 6% processing fee. Booking direct with any method still saves you the service fee OTAs like Airbnb charge on top.
- *Intent:* Transactional · *Link:* none needed · *Classification:* Public FAQ · *Validation:* Verified (fee structure matches Terms of Service and every property record exactly). Terminology updated per SEO-DEC-015 — "Stripe" is never named in guest-facing copy; it remains correct in backend/technical documentation only.

**3.3 How do I know my reservation is confirmed?**
> If you pay by GCash or BPI, your booking is pending until we manually verify the payment — you'll get a confirmation email once that's done, usually within a few hours. If you pay by Credit/Debit Card, your booking is confirmed immediately.
- *Intent:* Transactional (post-booking reassurance) · *Link:* none needed · *Classification:* Public FAQ · *Validation:* Verified (Terms of Service §2, chatbot). Terminology updated per SEO-DEC-015.

**3.4 Is it safe to book directly on your website?**
> Yes. We've hosted over 280 guests and hold 3 years of Airbnb Superhost status, and we operate from a verified Philippine business address. Card payments are processed securely — we never see or store your card details. You'll get a full booking confirmation by email, and your host is reachable throughout your stay.
- *Intent:* Commercial (trust) · *Link:* `/about` · *Classification:* Public FAQ · *Validation:* Verified (Terms of Service §3, `/about`). Terminology updated per SEO-DEC-015 — the payment processor is not named in guest-facing copy.

**Note on scope (SEO-DEC-016):** no "Is a security deposit required?" question is included. The owner decided the public FAQ should neither state that a deposit is required nor that one isn't, since no formal deposit policy exists — the full-payment-at-booking fact is covered above (3.1) without deposit framing. Likewise, no ID/guest-information question is included; Haven in Lipa has no approved public ID-verification or KYC policy today, and the FAQ must not imply otherwise or announce a future one.

### Category 4 — Check-In and Checkout

**4.1 What are the check-in and checkout times?**
> Checkout is 12:00 PM (noon) at both properties. Check-in time depends on which house you're staying at — see the next question for the exact times.
- *Intent:* Transactional · *Link:* n/a (points to 4.2) · *Classification:* Public FAQ · *Validation:* Verified (checkout time is identical and confirmed everywhere)

**4.2 Are check-in times different for B34 and B38?**
> Yes — please check which house you're booking:
> - **B34 (Cozy 1-Bedroom, Spacious 2-Bedroom): check-in from 2:00 PM**
> - **B38, "Mickey in Lipa" (Sleeps 7 / 11 / 15): check-in from 3:00 PM**
>
> Checkout is 12:00 PM (noon) at both houses.
- *Intent:* Transactional (prevents a guest arriving too early) · *Link:* n/a · *Classification:* Public FAQ · *Validation:* **Approved (SEO-DEC-013, 2026-09-06).** Ready to publish as written. Note for the Web Work Stream: the site's Terms of Service currently states one blanket "2:00 PM onwards" with no property distinction — that page needs a corresponding correction so it matches this approved content; that correction is an implementation task, not something resolved by this document.

**4.3 Can I check in early or check out late?**
> Early check-in and late checkout may be available, but they're never guaranteed — they depend on our cleaning schedule and whether another guest is arriving or departing the same day. When approved, early check-in or late checkout is charged at ₱200 per hour. Just message us as early as possible, ideally at the time of booking, and we'll let you know if it's possible for your dates.
- *Intent:* Transactional · *Link:* n/a · *Classification:* Public FAQ (general policy) — day-of confirmation of an approved early/late time is a Quick Reply matter · *Validation:* **Approved (SEO-DEC-013, 2026-09-06).** Ready to publish as written. This fee does not yet appear anywhere on the live site (FAQ, Terms, or `AdditionalCharge` admin flow) — the Web Work Stream should add it to the Terms of Service and, ideally, wire it into the `AdditionalCharge` flow so it's applied consistently rather than set ad hoc per booking.

**4.4 How and when will I get my check-in instructions?**
> We'll send everything you need for your arrival by email and SMS as your check-in date gets closer. You don't need to request it — it's sent automatically once your booking is confirmed.
- *Intent:* Informational (reduces pre-arrival anxiety) · *Link:* n/a · *Classification:* **Both** — the public FAQ states only the general policy (when/how it's sent); the actual arrival procedures, access instructions, door/gate codes, Wi-Fi credentials, and caretaker coordination details are delivered exclusively via the existing "Check-in reminder" Quick Reply, per the approved Section 7 boundary · *Validation:* Verified that a scheduled pre-arrival message exists (product-level Quick Reply/ScheduledMessage system); exact send timing (currently anchored 24h before check-in) is a product-level detail, not restated here. Wording confirmed against the owner's approved Section 7 boundary (2026-09-06) — no operational or security-sensitive detail is named or implied.

### Category 5 — Amenities and House Rules

**5.1 What amenities are included?**
> Every property includes a full kitchen, fast WiFi, air conditioning, and parking inside the gated village. B34 units add Netflix and dedicated fiber (400 Mbps on the 2-Bedroom); B38 ("Mickey in Lipa") adds 500+ Mbps fiber and garage parking. Full amenity lists are on each property page.
- *Intent:* Informational · *Link:* `/#properties` · *Classification:* Public FAQ · *Validation:* Verified

**5.2 Is parking available and safe?**
> Yes, at both houses, inside the gated village with 24-hour security — we've never had a parking incident. B34 has an open parking slot; B38 ("Mickey in Lipa") has a garage that fits one small/compact car, with additional parking for larger vehicles available nearby inside the village.
- *Intent:* Informational (decision factor) · *Link:* n/a · *Classification:* Public FAQ · *Validation:* Verified

**5.3 Is the WiFi fast enough for remote work?**
> Yes. The Spacious 2-Bedroom runs on 400 Mbps fiber, the Cozy 1-Bedroom on a dedicated business-grade fiber line, and Mickey in Lipa (all three configurations) on 500+ Mbps fiber. Multiple video calls, streaming, and devices at once are no problem at any of our properties.
- *Intent:* Informational (remote-work travelers) · *Link:* `/properties/spacious-2-bedroom` · *Classification:* Public FAQ · *Validation:* Verified

**5.4 Are pets allowed?**
> We don't allow pets in any of our units at this time. Sorry — we know this is a dealbreaker for some travelers.
- *Intent:* Transactional (dealbreaker screening) · *Link:* n/a · *Classification:* Public FAQ · *Validation:* Verified (identical policy, both properties)

**5.5 Are parties, events, or extra visitors allowed?**
> No — all of our properties are in residential subdivisions, not event venues, so parties and events aren't allowed. If you'd like extra day guests beyond your booked headcount, please message us in advance so we can check whether that works for your dates.
- *Intent:* Transactional (avoids a disputed stay) · *Link:* n/a · *Classification:* Public FAQ · *Validation:* Verified (identical policy stated on all 5 property records)

### Category 6 — Changes, Cancellations, and Refunds

**6.1 What is your cancellation and refund policy?**
> - **7 or more days before check-in:** 100% refund
> - **3–7 days before check-in:** 50% refund
> - **Less than 3 days before check-in, or no-shows:** no refund
>
> To cancel, email customerservice@haveninlipa.com or call +63 906 655 4415.
- *Intent:* Transactional · *Link:* `/terms` · *Classification:* Public FAQ (Terms of Service carries the full legal version) · *Validation:* Verified (matches Terms of Service and all property records exactly)

**Note on scope (SEO-DEC-018):** no rebooking/rescheduling question is included. The current live FAQ and chatbot both offer "free rebooking if requested at least 14 days before your original check-in" — the owner decided to remove this entirely rather than confirm or republish it. It was never in the Terms of Service, and no public wording promising case-by-case rebooking consideration is included as a replacement. Haven in Lipa may still consider a rebooking request privately, but that stays a private, discretionary conversation between host and guest — never a stated policy, entitlement, or promised benefit. The cancellation/refund tiers above stand alone, with no rebooking exception attached.

### Category 7 — Direct Booking and Guest Support

**7.1 Why book direct with Haven in Lipa instead of Airbnb?**
> Three reasons: you skip the 14–20% Airbnb service fee, you talk to your host directly instead of a call center, and our cancellation and check-in policies are more flexible. Same houses, same beds, same WiFi — just a better deal for both of us. Our properties are fully furnished homes, not hotel rooms — you get a full kitchen and real living space a hotel can't offer.
- *Intent:* Commercial (conversion) · *Link:* `/staycation` · *Classification:* Public FAQ · *Validation:* Verified

**7.2 Can I book for just one night?**
> Yes. We welcome short stays — one-night stopovers, weekend getaways, and longer retreats. Available dates and the total price are shown upfront on each property page.
- *Intent:* Transactional · *Link:* `/#properties` · *Classification:* Public FAQ · *Validation:* Verified

**7.3 How can I contact Haven in Lipa before booking?**
> Message us on Facebook (facebook.com/haveninlipa), email customerservice@haveninlipa.com, or call/text +63 906 655 4415. You can also use the chat widget on this site for quick answers, any time.
- *Intent:* Transactional (removes final pre-booking friction) · *Link:* `/#contact` · *Classification:* Public FAQ · *Validation:* Verified

---

## 6. B34-versus-B38 Policy Presentation — Dedicated Recommendation (Approved)

**The original problem:** two live sources disagreed. `prisma/seed-property-seo.ts` and `prisma/seed-property-seo-mickey.ts` (the data actually attached to each property listing) show **B34 check-in from 2:00 PM** and **B38 check-in from 3:00 PM**. `src/app/terms/page.tsx` §5 — the site's actual Terms of Service — states a single blanket **"Check-in time: 2:00 PM onwards"** with no property distinction at all. This was not resolved by guessing; it went to the owner as a direct decision.

**Resolution (SEO-DEC-013, approved 2026-09-06):** the property-record times are correct. **B34 check-in is 2:00 PM; B38 check-in is 3:00 PM.** The Terms of Service page's blanket "2:00 PM onwards" is the outdated source and needs a corresponding correction — that correction is a Web Work Stream implementation task, not something this document performs.

**Approved final FAQ wording:**

> **Are check-in times different for B34 and B38?**
> Yes — please check which house you're booking:
> - **B34 (Cozy 1-Bedroom, Spacious 2-Bedroom): check-in from 2:00 PM**
> - **B38, "Mickey in Lipa" (Sleeps 7 / 11 / 15): check-in from 3:00 PM**
>
> Checkout is 12:00 PM (noon) at both houses. Early check-in or late checkout may be available and, when approved, is charged at ₱200 per hour — it depends on our cleaning schedule and whether another guest is arriving or leaving the same day, so approval and payment don't guarantee an exact time until we confirm it with you directly.

**Design notes baked into this wording:**
- States each house's time under its own bolded label so a guest scanning quickly cannot misread one house's time as applying to both.
- The early/late sentence explicitly separates "charged at ₱200/hour" from "approval isn't guaranteed" — paying the fee is not framed as purchasing a guaranteed time slot, only as the cost *if and when* it's approved.
- This is now the final, approved wording — no placeholders remain. The one dependency left before it can go live on the site is the Web Work Stream correcting the Terms of Service to match (Section 9).

---

## 7. Quick Replies Coverage Map (Approved 2026-09-06 — SEO-DEC-017)

| Guest topic | Public FAQ treatment | Quick Reply treatment | Reason for separation or overlap |
|---|---|---|---|
| General check-in/checkout times, B34 vs. B38 | Full policy stated (times, ₱200/hour rule) | None needed | Stable, applies broadly, decision-relevant before booking |
| Actual arrival instructions (gate code, lockbox, unit door code, WiFi password, caretaker contact) | **Not published** — FAQ only states that instructions are sent, never the instructions themselves | "Check-in reminder – 24h before Check-in" (existing scheduled Quick Reply) | Security-sensitive, reservation-specific, changes per booking/property — never appropriate for a public, indexable page |
| Whether early check-in/late checkout is approved for *this* guest's specific dates | General ₱/hour policy and "not guaranteed" framing only | Manual reply from admin once the guest requests it, tied to the actual cleaning/booking calendar | The public answer can't know real-time availability; only an admin checking the calendar can confirm a specific date |
| Cancellation/refund percentages | Full policy stated | None needed | Stable, publicly comparable across bookings |
| Processing a specific cancellation or refund | Not applicable | Manual admin handling via the stated contact channels | Reservation-specific, involves actual payment reversal |
| Payment methods and fees | Full policy stated | Payment-pending nudge (existing SMS template) if a QR payment isn't verified in time | The rate/fee structure is stable and public; a specific unpaid booking is reservation-specific |
| Security deposit | Not addressed either way (SEO-DEC-016) — the FAQ states only that full payment is required at booking (FAQ 3.1), never framed as a deposit | Not applicable — no formal deposit policy exists to communicate | No formal security-deposit policy exists yet; the public FAQ must not imply one does (or that one doesn't) until the owner establishes one |
| Damages after a stay | Not addressed — this is inherently incident-specific | Specific billing (via the `AdditionalCharge` pay-by-link) sent only if damage actually occurs on a given stay | Guest- and incident-specific; never a general public-FAQ topic |
| Parking type per house | Stated (open slot vs. garage) | None needed | Stable, decision-relevant, no security exposure |
| Exact parking spot / access instructions | Not published | Delivered with arrival instructions | Operational/security-sensitive |
| Parties/events/extra visitors policy | States the rule (not allowed / message us for extra day guests) | Case-by-case approval of a specific visitor request | The rule is stable and public; approving a specific guest's request is reservation-specific |
| Wifi speed per property | Stated | Actual WiFi password | Speed is a selling point (public); the password is access-sensitive |
| Day-before / day-of reminders (checkout thanks, payment-pending nudge) | Not applicable | Existing scheduled SMS/email templates | Explicitly time-anchored to one guest's stay, not evergreen content |

**Explicitly kept out of the public FAQ (owner-approved boundary, verbatim categories):** detailed arrival procedures; lockbox or access instructions; door or gate codes; Wi-Fi credentials; caretaker coordination details; reservation-specific instructions; and any other operational or security-sensitive information — none of which appears in any proposed FAQ content in Section 5. All of the above remains in Quick Replies sent directly to confirmed guests.

---

## 8. SEO and Technical Recommendations for the Future Developer

**`/faq/` vs. `/#faq`:** No change needed. `/faq` already exists as the canonical, fully-indexable page (confirmed in `sitemap.ts` and already validated in Google Rich Results per the 2026-08 GSC pull: 3 valid FAQPage items, 0 issues). No `/#faq` fragment exists anywhere on the site to deprecate or redirect. Keep the current pattern: homepage renders a 5-item teaser (`HOMEPAGE_FAQ_LIMIT`) linking to `/faq` for the full list — this already avoids duplicate full-content indexing.

**Title tag and meta description:** current copy (`"FAQ — Booking, Payments & Stays in Lipa City"` / a description naming GCash, BPI, credit card, cancellation, WiFi, parking, families, pets, check-in) is solid, already avoids naming the payment processor, and can stay largely as-is. Once B38/Mickey content is added, refresh the meta description to also reference the two-property comparison, since that becomes one of the page's strongest topics (e.g., append "...and choosing between our two Lipa City properties").

**H1 and section-heading structure:** currently a flat H1 ("Frequently Asked Questions") followed by 14 individual H2/H3-per-question blocks with no grouping. Recommend adding an H2 per category (the 7 categories in Section 4) above its group of questions, so the page reads as a structured document rather than a flat list — this also gives Google clearer topical signals per section without changing the underlying `FAQPage` schema shape.

**Internal linking:** the current FAQ under-links. Recommended targets, all confirmed live: `/#properties` (property browsing), the five `/properties/[slug]` pages (property-specific claims), `/staycation` and `/weddings-accommodation` (money pages, from the direct-booking and group-booking answers), `/terms` (cancellation policy), `/about` (trust/safety answer), `/#contact` (contact answer), and the relevant Getting-to-Lipa/Things-to-Do content on `blog.haveninlipa.com` (confirm the current live slug before adding — do not guess it).

**Canonical treatment:** already correct — `/faq` self-canonicalizes via `alternates.canonical` in its metadata. No change needed.

**Remove the free-rebooking offer from live guest-facing content (SEO-DEC-018):** the current live public FAQ (`src/lib/faqs.ts`, cancellation-policy item) states "We also offer one free rebooking when requested at least 14 days before your original check-in date" — this sentence must be deleted, not softened. The on-site chatbot (`src/lib/chat/chat-tree.ts`, `booking-cancel` node) makes the same offer ("Free rebooking if requested at least 14 days before your original check-in date") and must be edited to remove it as well, without adding replacement language that promises case-by-case rebooking consideration. The cancellation policy in both places should read as the 100%/50%/0% refund tiers only, matching `/terms` §4.

**Guest-facing vs. internal payment terminology (SEO-DEC-015):** any UI copy, button labels, confirmation emails, or FAQ/Terms text a guest sees must say "Credit/Debit Card," never "Stripe." "Stripe" stays correct and expected in code, environment variable names, admin-only screens, and technical documentation (e.g., `HIL Website Technical Specification.md`) — this is an internal implementation detail, not something to rename in the codebase. When the Web Work Stream eventually updates `/faq`, `/terms`, and any property page copy, this distinction should be carried through consistently.

**FAQPage schema eligibility and limitations:** the current implementation is a genuinely good example — the JSON-LD `mainEntity` array is built directly from the same `faqs` array the page renders (`src/app/faq/page.tsx`), so visible content and schema can never drift apart by construction. Keep this pattern for any new/revised items. Be aware, per Google's own current behavior and the site's own GSC history, that FAQ rich results display is now restricted mostly to authoritative government/health sites — a valid schema is not a guarantee of an enhanced SERP snippet. Continue treating the schema as a hygiene/eligibility investment, not a promised visual upgrade. Per the product-level decision (HIL DEC-008), `/faq` and any money page must keep to `FAQPage` only — never add `EventVenue`, `Event`, or `Offer`/`priceSpecification` schema alongside it.

**Avoiding duplicate full FAQ content:** already handled correctly — the homepage shows a truncated teaser (5 of the eventual ~20 items), not the full set, and links out to `/faq` for the rest. No change needed to this pattern as the FAQ count grows.

**Mobile usability and accordion accessibility:** currently the 14 items render as a flat list of static, always-expanded cards — not a collapsible accordion. At ~20 items after this revision, that becomes a long scroll on mobile. Recommend converting `/faq` (not necessarily the homepage teaser) to an accordion pattern: collapsed by default, one question expanded at a time or multiple allowed, each trigger implemented as a real button with `aria-expanded`/`aria-controls` so screen readers and keyboard navigation work correctly. This is a structural/accessibility recommendation only — no code is provided here.

**Analytics events worth tracking:** FAQ item expand (which questions guests actually open, by category), clicks on any of the internal links recommended in Section 5 (property pages, `/staycation`, `/weddings-accommodation`, `/terms`, `/about`), the homepage's "See all N FAQs" click-through to `/faq`, and clicks on the contact answer's Messenger/email/phone links. These would let a future review measure whether the new B34-vs-B38 and pricing-clarity content is actually reducing pre-booking contact-form/chat volume on those exact topics.

---

## 9. Owner Approval Checklist — Resolution Status (updated 2026-09-06)

All items below were reviewed by the owner on 2026-09-06. Resolved items are checked and cite the decision that recorded them; one item remains genuinely open.

- [x] **Final B34 check-in time** — **Approved: 2:00 PM.** (SEO-DEC-013)
- [x] **Final B38 ("Mickey in Lipa") check-in time** — **Approved: 3:00 PM.** The current Terms of Service still states a blanket 2:00 PM for all properties — flagged as a Web Work Stream correction, not a re-opened question. (SEO-DEC-013)
- [x] **Checkout time** — **Approved: 12:00 PM (noon), both properties.** (SEO-DEC-013)
- [x] **₱200/hour early check-in/late-checkout charge and conditions** — **Approved** as the current rate; "subject to availability, cleaning schedule, and adjacent reservations, requiring advance approval" confirmed accurate. Not yet reflected on the live site — implementation is a Web Work Stream task. (SEO-DEC-013)
- [x] **Property capacities** — **Approved: Cozy 1-Bedroom (B34) = 5 guests.** The stale "4" on the live public FAQ should be corrected. B38/Mickey configurations (7 / 11 / 15) retain their previously verified figures, unchanged. (SEO-DEC-014)
- [x] **Parking policy** — **Approved as presented:** B34 = open slot, B38 = one-car garage + nearby village parking for larger vehicles.
- [x] **Visitor/event policy** — **Approved as presented:** no parties or events; message us in advance for extra day guests.
- [x] **Pet policy** — **Approved as presented:** no pets allowed at either property.
- [x] **Payment fees and terminology** — **Approved:** GCash/BPI remain fee-free, Credit/Debit Card carries a flat 6% fee. Guest-facing copy must say "Credit/Debit Card," never "Stripe" — the processor name stays in technical/internal documentation only. (SEO-DEC-015)
- [x] **Cancellation/refund tiers (100% / 50% / 0%)** — **Approved as presented.**
- [x] **Free rebooking offer ("14+ days before original check-in")** — **Resolved: removed, not approved.** The offer is dropped from the public FAQ and must be removed from the live chatbot as well. Haven in Lipa may still consider a rebooking request privately and case by case, but this is never presented publicly as a guaranteed policy, guest entitlement, standard exception, or promised benefit. No replacement public wording is included. (SEO-DEC-018)
- [x] **Security deposit** — **Resolved by omission (approved):** no public FAQ question is introduced either way. The full-payment-at-booking fact is explained in FAQ 3.1 without deposit framing. Revisit only if a formal deposit policy is established later. (SEO-DEC-016)
- [x] **ID / KYC requirements** — **Resolved by omission (approved):** no public FAQ question is introduced. No implication that ID verification or KYC currently exists or is planned. Revisit only once a formal, approved guest-facing KYC policy exists. (SEO-DEC-016)
- [x] **Public FAQ vs. Quick Reply boundaries** — **Approved as presented** (Section 7). Detailed arrival procedures, access/lockbox instructions, door/gate codes, Wi-Fi credentials, caretaker coordination, reservation-specific instructions, and other operational/security-sensitive information all stay in Quick Replies to confirmed guests only. (SEO-DEC-017)
- [x] **Dedicated `/faq/` architecture** — **Approved: no structural change.** Existing canonical `/faq` page and homepage teaser are retained as-is. Adding H2 category headers (Section 8) and the accordion-conversion recommendation remain open implementation choices for the Web Work Stream, not blocked by anything in this checklist.

**No items remain unresolved.** Every item above is approved and final. This document, in full, is the approved implementation package ready to hand to the Web Work Stream — see the Web Work Stream implementation dependencies added to Section 8 and to `SEO_PROJECT_STATUS.md`.

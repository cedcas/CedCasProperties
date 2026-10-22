# Haven in Lipa — Website Technical Specification

> **Last updated:** 2026-10-22, later (Haven AI: property-overview fix, branch
> `hil-pm/haven-property-list-102226`, DEC-029 addendum — production incident: asked "Hi,
> what properties do you have?", Haven ~50% of the time skipped `list_properties` and
> invented an answer — only the two B34 units, wrong capacities, and once a hallucinated
> price the price guard replaced with the generic Messenger-fee fallback **inside a
> property bullet**): [Haven AI Chat](#haven-ai-chat) — a per-turn "Context (public
> listings, authoritative...)" system-prompt note (`listingsContextNote()`,
> `chat-service.ts`) built from the already-fetched `publicListings`; `system-prompt.ts`'s
> new `PROPERTY_OVERVIEW_RULE` forbids answering an overview question from memory; a new
> `src/lib/haven/overview-intent.ts` (`isPropertyOverviewMessage()`, EN/TL/Batangueño) forces
> a `list_properties` tool call on round 0 only via a new `provider.ts` `forceToolName` →
> `tool_choice` mapping (Anthropic `{type: "tool", name}`, OpenAI `{type: "function",
> function: {name}}`); and `enforcePriceClaims()`'s bullet-line branch now drops just a
> disallowed price from a property-rundown bullet (new `RATE_CONTEXT`/`dropPriceFromBullet()`,
> `post-process.ts`) rather than nuking the whole bullet into the Messenger-fee fallback, with
> every fetched listing's own `pricePerNight` (`basePricesFromListings()`) allowed through the
> guard the same as a tool-result price. Lint/typecheck/`vitest run` clean (4,185 tests, 44 new).
> See [Haven AI Chat](#haven-ai-chat) below.
> Prior: 2026-10-22 (DEC-030 same-day follow-up: the last two hardcoded Airbnb
> links closed, branch `hil-pm/remove-airbnb-cta-about-102226`. The homepage CTA block
> (`src/app/page.tsx`, "Ready to Experience Our Comfort?") drops its hardcoded `fa-airbnb`
> icon rather than replacing it with an on-site icon — the block already has two on-site
> CTAs immediately above the icon row, and the icon row now reads `SOCIAL_LINKS` directly,
> matching `Footer.tsx`/`ContactForm.tsx`. The about-page Person JSON-LD `sameAs`
> (`src/app/about/page.tsx`) drops the hardcoded Airbnb URL, now `[...SOCIAL_LINK_URLS]`
> — "Airbnb Superhost" prose is unchanged. Confirmed by grep: no `airbnb.com` href/URL
> remains anywhere in `src/` except the admin `airbnbIcsUrl` calendar-import field and
> test fixtures that assert Airbnb links are *rejected*. New test:
> `src/lib/__tests__/homepage-cta-social-links.test.ts`; `social-links.test.ts` updated.
> See [Accessibility patterns](#accessibility-patterns).
> Prior: 2026-10-22 (Footer social links + Airbnb icon removed from homepage,
> branch `hil-pm/footer-social-airbnb-102226`, DEC-030: a site-wide social icon row
> (Facebook/Instagram/TikTok/YouTube, `src/lib/social-links.ts`) added to `Footer.tsx`'s
> Brand column — the footer previously had none — and the homepage "Find Us Online" row
> (`ContactForm.tsx`) no longer appends a fifth, hardcoded Airbnb icon. `BUSINESS_SAME_AS`
> (`local-business-schema.ts`) no longer appends the Airbnb listing link either; the
> `LodgingBusiness` JSON-LD `sameAs` is now exactly the four owner-approved URLs. New test:
> `src/lib/__tests__/footer-social-links.test.ts`.)
> Prior: 2026-10-19 (Haven AI: numeric month-first dates, always-on
> today's-date context, single-date 1-night nudge, and a redefined "next weekend", branch
> `fix/haven-ai-numeric-dates-101926`: [Haven AI Chat](#haven-ai-chat) — live bug: a guest
> said "10/24, this coming Saturday" (Oct 24, 2026 — a Saturday) and Haven asked "2024 ba,
> o 2025 na?" plus re-questioned the 1-night default. `dates.ts` gained numeric month-first
> date parsing (Owner convention: `M/D`/`MM/DD`/`M/D/YY`/`M/D/YYYY`, never day-first;
> ranges `10/24-10/26`, `10/24 to 10/26`, `10/24-26` shorthand; guarded against a
> guest-count phrase like "4/5 guests" the same way the existing bare day-range fallback
> is) and relative-weekday phrasing ("this coming Saturday"/"this Saturday"/"sa Sabado"/
> "ngayong Sabado"/"sa darating na Sabado" — nearest occurrence, including today; "bukas"
> as a Tagalog "tomorrow"; "sa makalawa" — day after tomorrow). When a numeric date and an
> explicit weekday both appear and agree, the numeric-date patterns are checked first, so
> the explicit date always wins (no behavior change when they already agree, as in the
> live bug). `resolveDates()`'s result gained `nights` and `singleDateDefault` — true only
> for a bare single-day phrase with no guest-stated check-out (never for an explicit range
> or "this/next weekend"). New exports `todayContextNote(now)`/`manilaYear(now)`:
> `chat-service.ts` now injects "Today is Monday, Oct 19, 2026 (Asia/Manila)" (plus the
> current-year/next-year rule) into the system prompt on **every** request, not only when
> a date phrase is detected, so the model never has to guess "this year" — the root cause
> of the year-confusion bug. `post-process.ts`'s `dropWhatYearQuestions()` gained an
> optional `currentYear` parameter: a dynamic backstop drops any sentence naming a
> calendar year earlier than the current one (so a hardcoded "2024"/"2025" list is never
> needed), plus two static phrases ("this year or next", "taong ito ... o next year").
> `dropDateReconfirmationQuestions()` gained three more mistaken-reconfirmation patterns
> ("kung 1 night lang ... tama ba?", "1 night ba", "check-in sabado at check-out linggo,
> tama ba?"). New `ensureSingleNightNudge()` appends a short "want to add more nights?"
> line (EN/TL/BTG) whenever `singleDateDefault` is true, instead of ever asking the guest
> to confirm the 1-night default. "Next weekend" is redefined (Owner rule) to mean the
> Saturday after the coming one, a 1-night Sat→Sun stay — not an extra Friday-to-Sunday
> span a week further out. `system-prompt.ts` gained matching hard rules
> (`NUMERIC_DATE_RULE`, `SINGLE_DATE_NIGHT_RULE`, `NEXT_WEEKEND_RULE`) and
> `NO_YEAR_QUESTION_RULE` now explicitly bans offering/mentioning a past year.
> Prior: 2026-10-16 (Haven AI: plain-language pass banning deep/literary Tagalog,
> same branch `fix/haven-ai-checkout-date-101626`: [Haven AI Chat](#haven-ai-chat) — Owner
> incident: Haven qualified a quote as "(provisional lang — tutuklasin ng tama sa
> checkout)"; "tutuklasin" is deep, literary Tagalog no real local host would use.
> `system-prompt.ts` gained `PLAIN_LANGUAGE_RULE` (plain, conversational Tagalog/
> Batangueño — everyday Taglish is fine, never deep/literary vocabulary) and gives the
> standard provisional/checkout caveat explicitly per language — EN "This is provisional —
> confirmed at checkout.", TL/BTG "Provisional lang ito, kukumpirmahin sa checkout."
> (`PROVISIONAL_CAVEAT_EN`/`PROVISIONAL_CAVEAT_TL`, now defined in `post-process.ts` to
> avoid a module import cycle). Two independent backstops in `post-process.ts`:
> `replaceTuklasinFamily()` bans the whole "tuklas" root entirely (tutuklasin, tuklasin,
> matutuklasan, and any other inflection), swapping the WHOLE sentence/bullet line for the
> standard caveat rather than just the word, since every live occurrence of that root was
> this exact checkout caveat; `simplifyDeepTagalogWords()` is a word-level swap for the
> rest of the banned deep words found reviewing Haven's own fixed scripts/few-shot blocks —
> "sukatin"→"tingnan", "manatili"→"mag-stay", "nawa"→"sana", "datapwat"/"subalit"→"pero",
> "marapat"→"dapat", "pagsapit"→"pagdating", "tunay na"→"talagang",
> "maaari"/"maaaring"→"pwede"/"pwedeng". Both run in `chat-service.ts` right after
> `fixDadalawPhrasing()`. None of these words were actually present in the existing
> few-shot/fixed-script text (`BATANGUENO_FEWSHOT`, `owner-facts.ts`, `access-guard.ts`,
> `welcome-book.ts`, `dates.ts` already used "pwede" and plain phrasing throughout) — the
> guard exists as a backstop against the model generating them at runtime, which is what
> produced the Owner's live incident. See `system-prompt.ts` and `post-process.ts` sections
> below.
> Prior, same day (Haven AI: never re-question a resolved date range or ask
> what year, bare day-of-month ranges, and follow-up-turn property/date resolution, same
> branch `fix/haven-ai-checkout-date-101626`: [Haven AI Chat](#haven-ai-chat) — three Owner
> rules (Cedric): (1) a parsed range ("Nov 19 to 21", "Nobyembre 19 hanggang 21") always
> means check-in the first date, check-out the second — Haven must never ask the guest to
> confirm the number of nights or re-question which dates were meant. New
> `system-prompt.ts` hard rule plus an independent `post-process.ts` backstop,
> `dropDateReconfirmationQuestions()`, drops any sentence matching that mistake in English
> ("just to confirm", "is that 1 night or 2", a "did you mean" scoped to a night/date
> mention so it never clobbers `property-resolver.ts`'s own legitimate "Did you mean
> <property>?" question) or Tagalog/Batangueño ("totoo ba/ga na isang gabi", "isang gabi
> lang ba", "ilang gabi", "sigurado ga kayo", two date ranges joined by "o") — if dropping
> empties the reply entirely (the Owner's dev screenshot: the ENTIRE bad reply was this
> kind of question), it falls back to restating the resolved `stayLabel` with a booking
> nudge instead of going blank; (2) Haven must never ask what year a guest means —
> `dropWhatYearQuestions()` is the matching backstop ("what year"/"anong taon"). `dates.ts`
> now also resolves a bare day-of-month range with no month attached ("19 to 21", "19-21",
> "19 hanggang 21") via a new `findContextMonth()` export — the month most recently named
> in conversation history if one was mentioned, else the next upcoming occurrence of that
> day (this calendar month if it hasn't passed yet, otherwise next month), guarded against
> a guest-count phrase ("4 to 5 guests") via a trailing people-noun exclusion; (3) a
> follow-up turn carrying only dates/guest count ("Nobyembre 19 hanggang 21, 4 kami") now
> resolves against a property named earlier in the conversation instead of asking again —
> `property-resolver.ts`'s new `resolveGuestPropertyMentionAcrossTurns()` tries the latest
> message first, then scans the last 6 prior turns (either role), most recent first;
> `chat-service.ts` feeds it the same recent-history window it now also passes to
> `resolveDates()` for month context. `owner-facts.ts`'s `parseGuestCount()` gained the
> number-leading Tagalog idiom "4 kami" (alongside the existing "kami ay 4") to make the
> live fixture's exact guest-count phrasing parse. See `dates.ts`, `owner-facts.ts`,
> `property-resolver.ts`, `post-process.ts`, `chat-service.ts`, and `system-prompt.ts`
> sections below.
> Prior, same day (Haven AI: date-range `hanggang`/`until` regression, doubled
> date header, and a "the system" guard, same branch `fix/haven-ai-checkout-date-101626`:
> [Haven AI Chat](#haven-ai-chat) — three fixes: (1) `dates.ts`'s month-day/weekday/ISO
> range separator (`RANGE_SEP`) was missing "hanggang" and "until" — "Nobyembre 19 hanggang
> 21" (and any other "X hanggang Y" phrasing) wasn't recognized as a range at all, so it
> fell through to the single-date pattern and silently resolved to a 1-night stay (Nov 19 →
> Nov 20) instead of the intended 2-night range (Nov 19 → Nov 21), with Haven then asking
> the guest to confirm the wrong pre-resolved dates; (2) `post-process.ts`'s
> `ensureDatesStated()` now checks for a literal `stayLabel` match FIRST, before its old
> full-month-name-only check — the model is told to copy `stayLabel` verbatim, which uses
> abbreviated month names ("Nov 19"), so the old check ("November 19") never matched it and
> a correct reply still got a redundant "For Thursday, November 19 → ...:" header prepended
> on top; (3) a new rule (`system-prompt.ts`) plus independent backstop
> (`post-process.ts`'s `stripSystemMentions()`) drop any sentence where Haven refers to "the
> system"/"ang system"/"sa system"/"our system" — including fixing the `BATANGUENO_FEWSHOT`
> example that had been teaching the model that exact phrasing. See `dates.ts`,
> `post-process.ts`, and `system-prompt.ts` sections below.
> Prior, same day (Haven AI: stay ranges now always end on the check-out
> date, `fix/haven-ai-checkout-date-101626`: [Haven AI Chat](#haven-ai-chat) — live bug:
> Haven stated a Thu check-in/Sat check-out, 2-night stay as "Thursday, November 19
> hanggang Friday, November 20, 2026 (2 nights)" — reading the last occupied NIGHT
> (Friday) as the range's end instead of the check-out date (Saturday). Fixed three ways:
> (1) `dates.ts` gained `buildStayLabel(checkIn, checkOut)`, returning `{en, tl, btg}` —
> e.g. EN "Thu, Nov 19 → Sat, Nov 21, 2026 (check-out) · 2 nights" — now surfaced by
> `resolveDates()`'s own result, `get_quote`/`find_stay`/`check_availability` (`tools.ts`),
> and `dateContextNote()`'s system-prompt note; (2) `system-prompt.ts` gained a hard rule
> to copy the `stayLabel` matching the reply language verbatim instead of composing a
> range itself; (3) `post-process.ts`'s new `fixStayRangeEndDate()` is the independent
> backstop — whatever range the model composed, if its end date matches the stay's last
> occupied night it's replaced whole with the correct `stayLabel`, leaving a per-night
> breakdown line untouched. See `dates.ts`, `tools.ts`, and the `post-process.ts` sections
> below.)
> Prior: 2026-10-15 (Haven AI: Owner override widens the Welcome Book's
> restaurants/things-to-do lists from B34-only to global, same branch
> `fix/haven-ai-freetext-reset-101526`: [Haven AI Chat](#haven-ai-chat) — Cedric amended
> the same-day Welcome Book decision below: the 10 restaurants and 13 attractions now
> apply to EVERY public listing, including the Mickey in Lipa (B38) houses — Haven says
> they're "from our Welcome Book" and may combine them with a listing's own
> `neighborhoodPlaces` tool data when present; `welcome-book.ts`'s `getWelcomeBook(slug)`
> now always returns these two lists for any slug, including one that doesn't resolve.
> House rules, how-tos, and check-out steps are unchanged — still `null` outside the two
> B34 slugs (`cozy-1-bedroom`, `spacious-2-bedroom`) and never generalized to a B38/Mickey
> listing. `get_local_guide`'s messaging and `owner-facts.ts`'s prompt bullet were updated
> to state the split explicitly; `welcome-book.test.ts`/`tools.test.ts` gained cases
> asserting a Mickey slug gets the global lists but not the B34-only house fields).
> Prior, same day (Haven AI: banned "can you afford it" phrasing + booking
> nudge, the B34 Welcome Book (restaurants/attractions by name, Owner decision), and a
> Wi-Fi/physical-access guard, same branch `fix/haven-ai-freetext-reset-101526`:
> [Haven AI Chat](#haven-ai-chat) — three more owner-approved guardrails (Cedric,
> 2026-10-15), each with an independent post-processing backstop per DEC-029's usual
> philosophy: (1) banned phrasing that reads as questioning whether a guest can afford a
> stay ("Kaya mo na ba?", "Kaya n'yo ba?", "Can you afford it?", "within your budget",
> "kaya ba ng budget") is now replaced with a booking nudge in the active language ("Want
> me to help you book it?"/"Gusto n'yo na bang i-book?"/"Gusto n'yo na ga i-book?") by
> `owner-facts.ts`'s new `replaceBannedAffordPhrasing()`, run in `chat-service.ts` BEFORE
> `stripBudgetQuestions()` so it isn't silently dropped by that guard's broader `budget`
> regex first; (2) a new typed server-only module, `src/lib/haven/welcome-book.ts`, holds
> an owner-sanitized excerpt of the B34 house manual, scoped ONLY to the two B34 listings
> (`cozy-1-bedroom`, `spacious-2-bedroom`) and exposed via `get_property_details`'s new
> `welcomeBook` field and a new `get_local_guide(slug?)` tool — the Owner additionally
> decided Haven may recommend its 10 restaurants and 13 attractions **by name** to B34
> guests (a narrower exception to the 2026-10-14 "never invent a place" rule, not a repeal
> of it), while a B38/Mickey listing or no known property still only gets a pointer to the
> printed Welcome Book in each house; the excerpt's own exclusions (no address, phone
> numbers, emails, host bio, dialect page, bars list) are preserved; (3) a new
> `src/lib/haven/access-guard.ts` ensures Haven never shares a Wi-Fi name/password or a
> door/gate/lock/keybox code under any circumstance — a direct ask skips the model entirely
> for a fixed safe reply (same pattern as the 24+ guest handoff), and an independent
> post-generation scrub replaces any leaked SSID/password/door-code-like text in the
> model's own reply, forcing the Messenger button on either way. All three are covered by
> new unit tests (`owner-facts.test.ts`, `system-prompt.test.ts`, `welcome-book.test.ts`,
> `access-guard.test.ts`, plus `chat-service.test.ts`/`tools.test.ts` integration cases)).
> Prior, same day (Haven AI: server-side property-name pre-resolution +
> `shortName` on every property tool result, same branch `fix/haven-ai-freetext-reset-101526`:
> [Haven AI Chat](#haven-ai-chat) — two more live-retest failures, both because
> `property-resolver.ts`'s fuzzy resolver only ever ran *after* a model tool call already
> missed a slug, so it never helped on a turn where Haiku answered free-text with **no**
> tool call at all: (1) Batangueño, after some history, "Mickey in lipa" → "hindi ko alam
> ang property na 'yan" (claimed the property didn't exist); (2) "Magkano ga ang yung
> malaking bahay ng Mickey sa Nobyembre 14 para sa 10?" → asked for the exact name instead
> of recognizing "malaking bahay" as the full-family-house listing. Fixed the same way
> `dateContextNote()`/`buildCapacityContextNote()` already pre-resolve dates/guest counts:
> three new pure functions in `property-resolver.ts` — `resolveGuestPropertyMention()`
> (resolves the guest's latest message against the full public-listing set before the
> model is ever called), `buildPropertyContextNote()` (system-prompt note: a unique match
> names the slug and short name and forbids asking for the name again, additionally
> telling the model to call `get_quote` immediately when dates and a guest count are ALSO
> already known this turn; an ambiguous match lists every candidate's short name and
> capacity and tells the model to ask which one), and `dropUnknownPropertyClaims()` (the
> independent post-process backstop — replaces an "hindi ko alam ang property"/"not in our
> system"/"isn't coming up"/"don't recognize" sentence with a "did you mean ...?" question
> whenever the server itself already found a match or ambiguity list). Separately:
> `list_properties`/`get_property_details` now both return a `shortName` field computed
> against the FULL public-listing set (not just whatever else was in that turn's tool
> calls) — fixes a related gap where looking up a single Mickey configuration alone
> couldn't disambiguate it from its siblings; `post-process.ts`'s `shortPropertyLabels()`
> is now exported and lets an explicit per-pair `shortName` win over its own turn-scoped
> computed fallback, so `shortenPropertyNamesInText()` and `collectBookingLinks()` both
> pick up the correctly-disambiguated name automatically.). Prior, same day (Haven AI owner
> guardrails — base-rate "from"/"simula" prefix
> and a local-places Welcome Book pointer, same branch `fix/haven-ai-freetext-reset-101526`:
> [Haven AI Chat](#haven-ai-chat) — two new Owner guardrails (Cedric, 2026-10-15): (1) a
> base/listing nightly rate (a property's own `pricePerNight`, from `list_properties`, or a
> quick property rundown) must always read "from ₱X/night" (Tagalog/Batangueño: "simula ₱X
> kada gabi"), never a bare number, since rates can change — enforced in `system-prompt.ts`'s
> hard rules and independently in `post-process.ts`'s new `ensureFromPrefix()`, using
> `collectBasePrices()` (every `pricePerNight` value in this turn's tool results) and
> `collectDatedQuoteAmounts()` (every other tool-result number, so an exact dated
> `get_quote`/`find_stay` total is left untouched even when it numerically equals the base
> rate — e.g. a single night at the base rate with no extra fees); (2) a restaurant/food/
> groceries/nearby-place/appliance-or-house-thing question is answered by pointing the guest
> to the printed "Welcome Book" in each house, never by looking up or inventing a named place
> online or from general knowledge (a tool result's own `neighborhoodPlaces` data may still
> be used when present) — `owner-facts.ts` gained a dated fact bullet for this (Cedric,
> 2026-10-15) with two fixed facts Haven may state directly: an Alfamart right outside the
> subdivision, plus minimarts around the property; anything the Welcome Book doesn't cover
> still gets the Messenger handoff.). Prior, same day (Haven AI free-text reset fix on `fix/haven-ai-freetext-reset-101526`: [Haven AI Chat](#haven-ai-chat) — live bug: in Batangueño mode, right after Haven replied with a 4-option list, the guest's next short free-text reply reset the widget to the static English root greeting mid-conversation. Root cause: the client echoes Haven's own prior replies back as `assistant`-role history, and the flat 600-char-per-message validation cap applied to every role, so a long `assistant` history turn alone failed validation → the whole request was rejected → `{mode: "static", reason: "error"}` → the client's fallback injected `tree.root.message`, resetting language and context. Fixed server-side (`chat-service.ts`): a zod discriminated union gives `user` messages the original 600-char cap but `assistant` history up to 1500 (`MAX_ASSISTANT_MESSAGE_CHARS`, `config.ts`); `normalizeIncomingMessages()` now trims history over 12 turns and truncates an over-long `assistant` turn (tail-truncated) instead of rejecting the request, and a genuinely oversized **latest guest** message gets a friendly `{mode: "ai"}` "please shorten" reply instead of a static fallback (`outcome: "handoff"`, `reason: "oversized_message"`, no model call). Fixed client-side (`ChatWidget.tsx`): `fallbackToTree()` no longer injects the root greeting on a mid-conversation static fallback — it appends a short, localized apology with a Messenger link instead, leaving history/`lang`/`currentNodeId`/input untouched; the root greeting now only ever appears on first load or an explicit Reset. Outgoing `assistant`-role history is also clamped client-side to 1500 chars as defense in depth. Also: `property-resolver.ts`'s size-word aliases for the largest-capacity listing (Mickey Full Family House, sleeps 15) gained "biggest"/"largest"/"big" (English) and "pinakamalaking" (Tagalog), alongside the existing "pinakamalaki"/"malaki"/"malaking" — a bare "Mickey"/"Mickey in Lipa" with no size/capacity detail was already, and remains, `ambiguous` (asks a short clarifying question naming the three Mickey listings, never "isn't in our system")). Prior: 2026-10-14 (Haven AI live bug fixes on `fix/haven-ai-guardrails-101426`, PR #84: [Haven AI Chat](#haven-ai-chat) — two more bugs fixed: (1) an informal/partial property name (e.g. "the Mickey Full Family House") got "isn't in our system" from an exact-slug-only lookup, fixed with a new `src/lib/haven/property-resolver.ts` — pure fuzzy name resolution by token overlap plus a capacity-number bonus, with an owner-confirmed alias table for names no DB column carries (block numbers, "pinakamalaki", etc.) — called by every slug-taking tool only after its exact-slug lookup misses, returning an `ambiguous` candidate list rather than guessing when two+ listings tie; (2) the 24+ guest group handoff's wording still drifted (clarifying questions, "exactly max"/"might fit" hedging) even with the Messenger link forced on, fixed by skipping the model entirely for this case — `chat-service.ts` now returns a fixed, warm script (English/Tagalog/Batangueño) from `owner-facts.ts`'s new `isLargeGroupMessage()`/`isLargeGroupToolCall()`/`buildLargeGroupHandoffReply()`, checked before the first model call and again after any tool call, logged as a new `outcome: "handoff"` value). Prior, same day: (Haven AI preview-retest fixes on `fix/haven-ai-guardrails-101426`, PR #84: [Haven AI Chat](#haven-ai-chat) — five bugs fixed: (1) a 24+ group handoff that didn't fire without a `find_stay`/`get_quote` tool call, fixed with a new `parseGuestCount()` guest-count parser and `buildCapacityContextNote()` system-prompt note; (2) the price guard replacing the approved ₱200/hour early-check-in/late-checkout fact with a generic "ask us via Messenger" fallback, fixed with a dedicated `FALLBACK_HOURLY_FEE_TEXT` and a broadened amount-format regex (`P200`/`200 pesos`); (3) an amenity question (e.g. "Do you have karaoke?") asking which house first, fixed with a new `find_amenity` tool that searches every property at once; (4) a Tagalog-mode (`lang: "tl"`) reply leaking Batangueño-only particles ("ga"/"baga"/"ari"/"ire"), fixed with `stripBatanguenoFromTagalog()`; (5) a Thu→Sat quote risking nights × one night's rate math, fixed with an explicit prompt ban on model-side price arithmetic, a `perNight` breakdown on `get_quote`/`find_stay`, and a `PRICE_ARITHMETIC_RE` post-check). Prior, same day: (Haven AI chat-widget bug fix on `fix/haven-ai-guardrails-101426`, PR #84: [Haven AI Chat](#haven-ai-chat) → Widget — the topic-chip collapse and persistent "Talk to a Human" link now gate on `aiEnabled` alone instead of `aiModeActive`/`lastMode`, so they're collapsed-by-default from the very first render, including the static-tree welcome message and a restored session, fixing an owner-reported bug where the 7 chips still rendered expanded on the welcome screen; chips also re-collapse after the guest sends a free-text message, not just after a chip tap; `aiModeActive` is unchanged and still gates only the reply-scroll behavior). Prior, same day: (Haven AI owner-guardrails pass on `fix/haven-ai-guardrails-101426`, not yet merged: [Haven AI Chat](#haven-ai-chat) — a new `src/lib/haven/owner-facts.ts` module holds Owner-confirmed facts (Cedric, 2026-10-14) — capacity (24-guest combined cap, counts adults, no documented kids/babies age policy), payment (full payment up front, no half/deposit), the ₱200/hour early-check-in/late-checkout rate (now allowed through the price guard without a tool call), quiet hours (10 PM–8 AM) and general house rules, and the karaoke/marketing-copy caution — injected into the system prompt and enforced independently (`stripBudgetQuestions()`, `removeKidsFreeClaims()`, `needsCapacityHandoff()`/`ensureCapacityHandoffLink()` forcing the Messenger button for a 24+ guest count or a kids/squeeze/extra-mattress question); a new `check_early_late` tool (`tools.ts`) answers a date-specific early-check-in/late-checkout question from `getInventoryScopeConflicts()` (bookings, manual blocks, iCal events, shared-inventory siblings) without ever promising a fee is approved; `post-process.ts` gained `shortenPropertyNamesInText()` (the same bracket/pipe shortener as link labels, now applied to reply prose too), `fixDadalawPhrasing()` ("ilang guests ang dadalaw" → "Ilang guests kayo?"/"Ilan ga kayo?"), `isEnglishContext()`/`stripTagalogWordsInEnglish()` (English-mode guard against stray Tagalog words), and `firstResolvedDateRange()`/`ensureDatesStated()` (an English reply with resolved dates this turn always states them, prepending "For <range>:" if it doesn't). Prior, same day: (Haven AI terms-of-address pass on `fix/haven-ai-polish-101426`, merged: [Haven AI Chat](#haven-ai-chat) — `limitToOneProvisional()` gained a punctuation cleanup pass for the debris a word removal leaves behind (stray "( "/"()"/leading separators); `collectBookingLinks()` now dedupes a booking link only *within* the same `find_stay` option (not across options) and the cap rose 6→8; a `find_stay` reply offering exactly one property drops the "Option N:" prefix; the system prompt's terms-of-address rule now gates "parekoy"/"marekoy" on a clear gender cue (with a gendered-name and a neutral-name example) and bans "partner" alongside "pare"/"bro"/"sis"/"dude" unless the guest used the word first, backed by a new independent `enforceTermsOfAddress()` post-process check; the `btg` guidance now documents "ga"/"baga" as question-only (with the "Oo ga" misuse example) and "ire", and lists a vetted set of further natural Batangueño/Filipino courtesy expressions, with `ensureBatanguenoMarker()`'s regex updated to not count a misused "Oo ga"/"Oo baga" as a genuine marker). Prior, same day: (Haven AI live-test bug-fix pass — the Messenger handoff link is now always emitted/normalized as `https://m.me/haveninlipa` (never the scheme-less, relatively-broken form); the "provisional"-once dedupe now removes the word's own markdown emphasis wrapper instead of leaving an empty `** **`; `dates.ts` understands Tagalog/Batangueño date phrasing (month/weekday names, ordinals, "ng", "susunod na") and `chat-service.ts` now pre-resolves a detectable date phrase in the guest's latest message into a system-prompt context note before the model is even called, so it stops asking what year a date means; booking-link labels are short, bracket/pipe-stripped property names (`stripToBaseName`/`buildShortNames`), and `find_stay` links are grouped and numbered "Option N: ..." in reply order, capped at 6; the `btg` system-prompt guidance was rewritten with accurate marker usage notes and a server-side `ensureBatanguenoMarker()` check that prepends a natural opener if a `btg` reply has none). Prior, same day: (Haven AI chat-widget UX pass: [Haven AI Chat](#haven-ai-chat) → Widget — topic chips collapse behind a "Topics" toggle once an AI reply lands, a persistent "Talk to a Human" link, reply-start auto-scroll instead of scroll-to-bottom, and a distinct `bg-cream` AI-reply bubble with `aria-live="polite"`; static mode and a fallback turn are unchanged). Prior, same day: (Haven AI polish pass: [Haven AI Chat](#haven-ai-chat) gained booking-link buttons collected from tool results, a sentence/bullet-level price guard with a fee-vs-total fallback, a stronger Batangueño few-shot prompt, explicit date statements, a Messenger handoff safety net, and a "provisional"-once limiter). Prior, same day: (added [Haven AI Chat](#haven-ai-chat) — flag-off by default, `HAVEN_AI_ENABLED`, DEC-029; built on `feature/haven-ai-h1-101426`, not yet merged). Prior: 2026-10-12 (added [Instant Booking Modes & Booking Requests](#instant-booking-modes--booking-requests), live 2026-10-13, DEC-028). Prior: 2026-10-10 (booking-intent SEO copy on `/properties`/`/staycation` plus a homepage `/properties` link, PR pending; the stale brand-token table corrected and a background-usage rule added — dark-pink `bg-cream` backgrounds on 7 pages + the homepage `FAQ` section switched to the lighter `bg-offwhite`, matching `/staycation`/`/weddings-accommodation`'s existing precedent — see Tech Stack → Frontend & Framework). Prior, same day: (added [Newsletter Signup](#newsletter-signup-hostinger-reach) —
> `/newsletter` page, homepage/footer signup strips (`NewsletterSignup.tsx`),
> `POST /api/newsletter`, Hostinger Reach client (`src/lib/hostinger-reach.ts`), GA4
> `generate_lead` on signup; Owner-approved, not yet merged to `main`). Prior, same day:
> GA4 Analytics Events: added the `purchase` event, fired
> alongside `booking_confirmed` from `BookingForm.tsx` so GA4's built-in
> `transactionId`/`purchaseRevenue` populate — `src/lib/ga4-purchase.ts`; server-side
> `ga4-measurement-protocol.ts` extended to optionally queue `purchase` too, still off by
> default; not yet merged to `main`). Prior: 2026-10-06 (DEC-026 live on production — release facts added; Build & Deployment rewritten: `prisma db push` removed from builds, migration history, release gate, operator command — DEC-026). Prior: 2026-10-04 (GA4 Analytics Events: Internal Traffic and Developer data filters confirmed Active by the Owner; internal-traffic cookie marker live, PR #49). Prior: 2026-10-02 (Booking Amendments: first-release policies approved by the Owner, DEC-024 — no behaviour change). Prior: 2026-10-01 (added [Booking Amendments](#booking-amendments-guest--stay-edit), the inventory lock, protected reactivation and the paid-but-unavailable card alert; PR #43, Owner-accepted on `dev.haveninlipa.com` — [DEC-024](HIL_DECISIONS.md)). Prior: 2026-09-30 (`seoTitle`/`seoDescription` became admin-editable — PR #38; see Database Schema → Property). Prior: 2026-09-28 (added [Checkout-Abandonment Alerts](#checkout-abandonment-alerts) — `CheckoutAttempt`, `POST /api/checkout-attempts`, `/api/cron/checkout-abandonment` on **Vercel Cron**, GA4 `add_payment_info`; PR #32 / `cbfd123`, **live on production**, [DEC-022](HIL_DECISIONS.md)). Prior: 2026-09-28 (the drive-time pass ran once on production 2026-09-28 00:11 CT via the temporary DEC-012 route, planHash `db895ae4f17708a6`, 20 fields / 5 properties, verified live; the route has been removed, and the CLI path remains). Earlier: 2026-09-27 (late — added the production property-content correction script to Build & Deployment, including the new targeted SM Lipa / Casa Marikit drive-time pass and its TEMPORARY DEC-012 route; branch `fix/property-drive-times-db`, PR against `dev`, **not merged, not run against any database**). Earlier that evening: ([GA4 Analytics Events](#ga4-analytics-events-gtagjs) rewritten for the production-host / no-admin gate, internal-traffic marker and `stay_match_arrival`, DEC-021; branch `fix/analytics-tracking`, PR against `dev`, **not yet merged or deployed**). Earlier the same day: added [Payment Verification](#payment-verification-server-side-pricing--stripe-paymentintent-checks) — server-side pricing and Stripe PaymentIntent verification, PR #23 / `480053f`). Prior: 2026-09-07 (repaired the CI Build/Lint checks — see Build & Deployment → CI)
>
> This is the primary "home base" spec for the Haven in Lipa rental application — shared infrastructure, the public site, and the admin panel. Blog (WordPress) and SEO / structured-data concerns live in their own specs:
> - [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md)
> - [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md)
>
> **Change history** for every commit (with Type) lives in [HIL Commits](HIL%20Commits.md) — there is no per-spec "Recent Commits" block anymore.
>
> **This spec describes how the current system works.** For current status (what's in progress, blocked, next), see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md). For why the architecture is built this way, see [HIL_DECISIONS.md](HIL_DECISIONS.md). For a history of completed work packages, see [HIL_COMPLETION_LOG.md](HIL_COMPLETION_LOG.md).

## Google Review URL
https://search.google.com/local/writereview?placeid=ChIJCamqCiYTvTMRQwC4sq84FcE

## iCal Sync with AirBnb
BV34:1-Bedroom https://www.airbnb.com/calendar/ical/863496491254902107.ics?t=8a40fa33577e4b2fbc91cf63e9849487
BV34:2-Bedroom https://www.airbnb.com/calendar/ical/1132697739115508822.ics?t=ea606cac741846a996d56b88e6afd75d
BV38:1-Bedroom https://www.airbnb.com/calendar/ical/1702580892503688207.ics?t=3fbf522dfa7d4bd1906d5ebde72b9151
BV38:2-Bedroom https://www.airbnb.com/calendar/ical/1706557839046020631.ics?t=5a81e8ac2c0c40efa3b1c22213f256a9
BV38:3-Bedroom https://www.airbnb.com/calendar/ical/1706573473286445874.ics?t=d437ced7956947ad87dd5435fa63bcbb

## iCal Sync with HIL
BV34:1-Bedroom https://haveninlipa.com/api/calendar/cozy-1-bedroom.ics
BV34:2-Bedroom https://haveninlipa.com/api/calendar/spacious-2-bedroom.ics
BV38:1-Bedroom https://haveninlipa.com/api/calendar/mickey-in-lipa--family-staycation--sleeps-7.ics
BV38:2-Bedroom https://haveninlipa.com/api/calendar/mickey-in-lipa--family-house--sleeps-11.ics
BV38:3-Bedroom https://haveninlipa.com/api/calendar/mickey-in-lipa--full-family-house--sleeps-15.ics

## Project Overview

Haven in Lipa is a full-stack property rental website for Haven in Lipa, based in Lipa City, Batangas, Philippines. It allows website visitors to browse properties, view detailed listings with photo galleries, and submit direct booking requests with QR-based payment (GCash or BPI) or online payment via Stripe. An admin panel allows the property owner to manage listings, upload images, process bookings, manage discount codes, set dynamic pricing, and view audit logs.

The site is designed as a direct-booking alternative to Airbnb, with a savings comparison feature shown to guests during checkout.

---

## Tech Stack

### Frontend & Framework
- **Next.js 16** (App Router) — full-stack React framework; handles pages, API routes, and server components
- **React 19** — latest React with server components support
- **Tailwind CSS v4** — utility-first styling with custom brand tokens (`src/app/globals.css`'s `@theme inline`; this table was stale against the live palette until 2026-10-10 — verify against the CSS file, not this list, if they ever drift again):
  - `--color-charcoal: #335238`
  - `--color-forest: #4CA750`
  - `--color-coral: #FF5371` / `--color-coral-dark: #E03D5A`
  - `--color-cream: #F5BECA` (alias: `--color-sand`, same hex) — a **saturated pink**, despite the name. Reserved for small accents (icon chips, hover states, admin UI) and the homepage's `FAQ` section/card contrast — **not** a full-page/section background since 2026-10-10 (see below). `--color-gold: #C4A862` still exists in code as a literal `#C4A862` (border-left accents, numbered badges), not promoted to a token.
  - `--color-offwhite: #FFF8FA` — the **page background** (`body` in `globals.css`) and the lighter pink the homepage's own sections use (`Properties.tsx`, `ContactForm.tsx`).
  - `--color-sky-blue: #8BCDB8`, `--color-sunshine: #FFDD3F`, `--color-palm: #4CA750` (same hex as forest) — decorative accents, not backgrounds.
  - **Background usage rule (2026-10-10):** every full-page `<main>` background and the homepage `FAQ` section background that used to be `bg-cream` (`/properties`, `/about`, `/faq`, `/terms`, `/privacy`, `/ambassadors`, `/pay/[token]`, and the homepage's `FAQ.tsx` section) is now `bg-offwhite`, matching `/staycation` and `/weddings-accommodation`'s pre-existing precedent (their own code comments already called out `bg-cream`'s hex as "a saturated pink despite the name" and chose `bg-offwhite` instead — see `src/app/staycation/page.tsx`). `bg-cream`/`bg-sand` usages that are small accents (icon chips, card backgrounds inside a grid, admin UI, hover/focus states) were deliberately left unchanged — only the class usages changed, not the token definitions, since `cream`/`sand` are still the right color for those accents.
- **TypeScript** — used throughout the codebase

### Backend & Database
- **Prisma 5** — ORM for database access. Schema changes are version-controlled migrations in `prisma/migrations/`, applied by an operator; no deployment changes the schema ([DEC-026](HIL_DECISIONS.md), see [Build & Deployment](#build--deployment))
- **MySQL (Hostinger)** — production database hosted at `[redacted: DB host, stored in Vercel env]`; connection via `DATABASE_URL` environment variable

### Authentication
- **NextAuth v5 (beta)** — JWT-based session auth protecting all `/admin` routes; admin credentials seeded via `prisma/seed.ts`; supports role-based access control (Admin / Manager) with granular permissions

### File Storage
- **Vercel Blob** — stores property images uploaded via the admin panel; images are served as public URLs; requires `BLOB_READ_WRITE_TOKEN` environment variable

### Email
- **Nodemailer + Hostinger SMTP** — transactional email via `smtp.hostinger.com:465` (SSL); sends from `"Haven in Lipa" <customerservice@haveninlipa.com>`; transporter created at runtime to avoid Vercel build-time initialization errors; requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` environment variables

### SMS (Phase 2 Guest Messaging)
- **Twilio (twilio.com)** — provider for both outbound and inbound. Confirmed 2026-05-04 after Semaphore replied "outbound only." Single Twilio number sends and receives, so guests reply to the SMS they received and it lands on our webhook automatically. Driver lives in [src/lib/sms.ts](../src/lib/sms.ts) using the official `twilio` Node SDK. Client is lazily instantiated and cached. Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Dev mode logs to console unless `SMS_FORCE_SEND=1`.
- **Inbound (2-way)** — `POST /api/sms/inbound?secret=<SMS_INBOUND_SECRET>` ([route](../src/app/api/sms/inbound/route.ts)). Two-layer auth: (1) shared-secret query/header, (2) `X-Twilio-Signature` HMAC-SHA1 verified by `twilio.validateRequest()` against `TWILIO_AUTH_TOKEN`. Both layers are checked when configured. Accepts Twilio's form-encoded payload (`From`, `To`, `Body`, `MessageSid`) and JSON for testing. Dedups by `MessageSid`. Normalizes `From` to E.164, matches to most-recent non-cancelled booking by phone. STOP keyword sets `Booking.optedOutAt`. Unmatched messages land in `UnmatchedInboundMessage` for admin re-thread or dismiss. If a reverse proxy rewrites the host such that `NextRequest.url` differs from the URL Twilio called, set `TWILIO_WEBHOOK_URL` to override.
- **Twilio dashboard config** — Phone Numbers → Active Numbers → *your number* → Messaging Configuration → "A message comes in" → Webhook → `POST` → paste the inbound URL with `?secret=`.
- **E.164 normalization** — `libphonenumber-js` via [src/lib/phone.ts](../src/lib/phone.ts). PH default for bare local numbers (`09171234567` → `+639171234567`); accepts international with `+` prefix. Normalized on write in `POST /api/bookings`.
- **Quiet hours** — SMS deferred 21:00–08:00 Asia/Manila (configurable via `SMS_QUIET_HOURS_START`/`END`); the row stays `pending` and fires on the next non-quiet cron run. Email is unaffected.
- **Foreign-number fallback** — non-`+63` numbers still parse via libphonenumber-js, but Twilio's per-message rate to other countries varies. The current `sendGuestMessage()` downgrade only fires for non-PH numbers; with Twilio supporting global delivery, this rule could be relaxed. **TODO if you want to send SMS to foreign guests:** remove the `isPHNumber()` gate in [src/lib/guestMessages.ts](../src/lib/guestMessages.ts) and budget for higher per-message rates outside PH. For now the gate stays in place to avoid surprise costs.
- **Cost (30 bookings/mo cap, 7 templates total)** — at Twilio's published PH rate (~$0.0775/segment outbound, ~$0.0075/inbound, ~$1.15/mo number rental):
  - Light (1 SMS template, 0 replies): ~$5/mo
  - **Likely (4 SMS templates + 2 reply round-trips per booking): ~$20/mo**
  - All 7 SMS + 5 round-trips: ~$31/mo
  Multi-segment SMS (long bodies) doubles cost. Keep templates ≤ 160 chars where possible.

### Hosting & Deployment
- **Vercel** — hosts the Next.js app; auto-deploys on every push to `main` branch via GitHub integration (`cedcas/CedCasProperties`); environment variables must be set in Vercel dashboard
- **Hostinger** — hosts the MySQL database and the custom domain `haveninlipa.com`; DNS A record points to Vercel (`76.76.21.21`)
- **Hostinger** - blog.haveninlipa.com is hosted in Hostinger. (See [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md).)

### Payments
- **Stripe** — online card payments with automatic booking confirmation (since 2026-09-27 only after the server prices the stay and verifies the PaymentIntent — see [Payment Verification](#payment-verification-server-side-pricing--stripe-paymentintent-checks)); 6% transaction fee charged to guest; requires `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` environment variables
- **GCash / BPI (InstaPay QR)** — static QR code images stored in `public/qr/`. One generic `gcash.jpg` and one generic `bpi.png` shared across all properties (no per-property variants — retired 2026-04-27). Guests save the QR to their Photos via a "Save QR to Photos" button (mobile-first UX, capability-based fallback chain), upload to GCash or BPI app, and pay; admin verifies manually. QR codes protected by SRI hash integrity checks (client-side + server-side); save action is gated on verified status and reuses the SRI-verified blob to preserve integrity end-to-end.

**Booking-form phone validation (client-side; PH-only 2026-06-06, internationalized 2026-06-07).** [BookingForm.tsx](../src/components/booking/BookingForm.tsx) validates the guest phone *before* leaving the details step, so an invalid number is caught at "Continue to Payment" instead of at the final "I've Paid" submit. It supports **any country** via `libphonenumber-js`: a country-code `<select>` (built at module load from `getCountries()` + `getCountryCallingCode()`, labeled with flag emoji + `Intl.DisplayNames` country name + calling code, sorted by name, **defaulting to PH**) sits beside the national-number input. Layout note (commit `1408071`): the select uses its own `selectCls` (fixed `w-[8rem]`, no `w-full`) and the input gets `flex-1 min-w-0`, so the country picker no longer inherits `w-full` and eat the row. Validation uses `isValidPhoneNumber(value, phoneCountry)` (also accepts a full `+E.164` regardless of the selected country). The field validates on blur, on country change, and on submit; the error clears live as the user fixes the number, the input + select borders turn red, and `aria-invalid` is set. On submit the form sends a normalized `parsePhoneNumberFromString(value, phoneCountry).number` (E.164) so the server parses it unambiguously. A native `<select>` is intentional — the flow is mobile-first and native selects open the OS picker on phones. This is still UX-only; the authoritative check remains the server-side `libphonenumber-js` normalization in `POST /api/bookings` (see [SMS](#sms-phase-2-guest-messaging) → E.164 normalization, PH default), which has *not* yet been hardened to *reject* unparseable input — queued, see [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string (Hostinger) |
| `NEXTAUTH_SECRET` | Random secret string for JWT signing (min 32 chars) |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `https://haveninlipa.com`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token for image uploads |
| `SMTP_HOST` | Hostinger SMTP host (`smtp.hostinger.com`) |
| `SMTP_PORT` | Hostinger SMTP port (`465`) |
| `SMTP_USER` | Hostinger email address ([redacted: stored in Vercel env]) |
| `SMTP_PASS` | Hostinger email password |
| `STRIPE_SECRET_KEY` | Stripe secret key for server-side payment processing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key for client-side Elements |
| `NEXT_PUBLIC_QR_HASH_GCASH` | SHA-256 hash of GCash QR image (integrity check) |
| `NEXT_PUBLIC_QR_HASH_BPI` | SHA-256 hash of BPI QR image (integrity check) |
| `CRON_SECRET` | Secret for authenticating Vercel Cron Job requests |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (Phase 2 SMS path — DORMANT as of 2026-05-07; left in place for future revival) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token; also used to verify `X-Twilio-Signature` on the inbound webhook |
| `TWILIO_FROM_NUMBER` | E.164 Twilio number used to send and receive SMS |
| `TWILIO_WEBHOOK_URL` | Optional — set only if a reverse proxy rewrites the URL Twilio called (signature mismatch) |
| `SMS_INBOUND_SECRET` | Shared secret for `/api/sms/inbound?secret=...` webhook auth (defense in depth atop Twilio signature) |
| `SMS_QUIET_HOURS_START` | Optional, default `21` — hour (Asia/Manila, 24h) when SMS sending pauses |
| `SMS_QUIET_HOURS_END` | Optional, default `8` — hour (Asia/Manila, 24h) when SMS sending resumes |
| `SMS_FORCE_SEND` | Optional `=1` to send real SMS in non-prod (e.g. staging); otherwise dev mode logs to console |
| `IMAP_HOST` | Hostinger IMAP host (`imap.hostinger.com`) — Phase 2 email reply polling |
| `IMAP_PORT` | Hostinger IMAP port (`993`, SSL) |
| `IMAP_USER` | Hostinger email address (defaults to `SMTP_USER` if unset) |
| `IMAP_PASS` | Hostinger email password (defaults to `SMTP_PASS` if unset) |
| `IMAP_MAILBOX` | Optional, default `INBOX` — mailbox to poll |
| `HOSTINGER_REACH_API_TOKEN` | Bearer token for the Hostinger Reach contacts API (newsletter signup) — unset degrades to a 503, never throws |
| `HOSTINGER_REACH_TAG_NEWSLETTER_PAGE` | Optional Reach tag UUID appended for `/newsletter` signups, alongside the base tag |
| `HOSTINGER_REACH_TAG_FOOTER` | Optional Reach tag UUID appended for footer-strip signups |
| `HOSTINGER_REACH_TAG_HOMEPAGE` | Optional Reach tag UUID appended for homepage-strip signups |
| `HAVEN_AI_ENABLED` | Must read exactly `"true"` to turn on Haven's AI chat mode anywhere; default OFF ([DEC-029](HIL_DECISIONS.md)) |
| `HAVEN_AI_KILL` | `=true` forces static mode even when `HAVEN_AI_ENABLED` is on — incident kill switch |
| `HAVEN_AI_PROVIDER` | `anthropic` (default) or `openai` |
| `HAVEN_AI_MODEL` | Overrides the provider's default model id (defaults to a current Claude Haiku model) |
| `HAVEN_AI_MONTHLY_CAP_USD` | Monthly spend cap in USD, Asia/Manila calendar month; default `20` |
| `HAVEN_IP_SALT` | Salt mixed into the sha256 hash of a guest's IP before it's stored in `HavenChatUsage` |
| `ANTHROPIC_API_KEY` | Anthropic API key, read server-only — never sent to the client |
| `OPENAI_API_KEY` | OpenAI API key, read server-only, only used when `HAVEN_AI_PROVIDER=openai` |

---

## Database Schema (Prisma)

### Models

- **Property** — slug, name, description, type (2BR/3BR/Studio etc.), pricePerNight, location, bedrooms, bathrooms, maxGuests, images (JSON array), featuredImage, amenities (JSON array), propertyRules (house rules text), isFeatured, isActive, airbnbIcsUrl. **Extra-guest-fee fields (added 2026-06-14):** `includedGuests` (Int, default 1 — fee applies to guests beyond this) and `extraGuestFeePerNight` (Decimal 10,2, default 0 = **disabled**). Configured on the admin Rates page; see Dynamic Pricing System → Extra guest fee. **SEO fields (added 2026-05-08, all optional):** `seoTitle`, `seoDescription` (override page metadata), `tagline` (hero one-liner), `heroSummary` (above-the-fold paragraph), `bestForSegments` (JSON: audience-fit blocks with optional internal links), `amenityDetails` (JSON: grouped amenity tour), `neighborhoodPlaces` (JSON: places by drive-radius), `housePolicies` (JSON: check-in/out, max guests, smoking, parties, pets), `pricingNotes` (JSON: rate, weekly/monthly discount, payment methods, deposit, cancellation), `propertyFaqs` (JSON: per-property Q&A array used in FAQPage schema), `imageAlts` (JSON: descriptive alts parallel to `images`), `aggregateReviewCount`, `aggregateReviewRating` (used in VacationRental AggregateRating schema). Seed via `npm run seed:property-seo` ([prisma/seed-property-seo.ts](../prisma/seed-property-seo.ts)). **How these SEO fields are used is documented in [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md).**

**`pricingNotes.paymentMethods` is admin-editable (added 2026-09-06).** Every other key inside this JSON blob is seed-only with no admin UI. `paymentMethods` is the one exception — [PropertyForm.tsx](../src/components/admin/PropertyForm.tsx) shows a "Payment Methods" field (edit mode only) seeded from the property's current value via `safeParsePricingNotes()`, with a "Use approved wording" shortcut button. `PUT /api/admin/properties/[id]` accepts an optional `paymentMethods` string and merges it into the existing `pricingNotes` JSON server-side via `mergePricingNotesPaymentMethods()` ([src/lib/pricing-notes.ts](../src/lib/pricing-notes.ts)) — the client never sends (and the route never accepts) a full `pricingNotes` object, so a stale or partial client payload can't clobber `rate`/`weeklyDiscount`/`monthlyDiscount`/`deposit`/`cancellation`. The field is omitted from the request entirely when left blank, so editing an unrelated property field never trips the server's non-empty validation on `paymentMethods`. This intentionally does **not** extend to any other `pricingNotes` key or to `bestForSegments`/`neighborhoodPlaces`/`propertyFaqs` — those remain seed-file-only (no admin path), per [DEC-015's](HIL_DECISIONS.md) narrow-field-plus-merge pattern.

**`seoTitle` / `seoDescription` are admin-editable (added 2026-09-30, PR #38).**
- [PropertyForm.tsx](../src/components/admin/PropertyForm.tsx) has a "Search Engine Listing" card (edit mode only) with a character counter: 60 for the title, excluding the auto-appended ` | Haven in Lipa`, and 155 for the description.
- `PUT /api/admin/properties/[id]` normalizes both with `normalizeSeoField()` ([src/lib/seo-metadata.ts](../src/lib/seo-metadata.ts)): trim and collapse whitespace, blank → `null`, 300-character cap → 400.
- The seeds still overwrite them, so mirror any admin edit into `prisma/property-content/*`.
- Rendering rules live in the SEO spec → "Page titles and social metadata".
- **Booking** — propertyId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, totalPrice, nightlyTotal, `extraGuestFee` (Decimal 10,2, nullable — added 2026-06-14), stripeFee, discountCode, discountAmount, status (pending/confirmed/cancelled), paymentMethod (gcash/bpi/stripe), stripePaymentIntentId, notes
- **DiscountCode** — code (unique), type (fixed/percentage), value, isActive, usageCount, maxUses, `propertyIds` (added 2026-06-05; optional JSON int array — `null`/empty = applies to all properties, otherwise scopes the code to those Property ids)
- **AdditionalCharge** *(added 2026-06-28)* — bookingId (FK, `onDelete: Cascade`), description, amount (Decimal 10,2), `token` (unique, opaque — drives the public `/pay/<token>` URL), status (pending/awaiting_verification/paid/cancelled), paymentMethod (gcash/bpi/stripe, set when guest pays), stripeFee (Decimal 10,2, card only), stripePaymentIntentId, notifiedAt, paidAt; indexed on `(bookingId)` and `(status)`. See Additional Charges (Pay-by-Link).
- **PropertyRate** — propertyId, rateType (weekday/weekend/override), dayOfWeek (0–6), specificDate, rate, note
- **Testimonial** — propertyId, name, location, rating, message, isActive
- **ContactMessage** — name, email, phone, subject, message, isRead
- **AdminUser** — email (unique), password (bcrypt), name, role (admin/manager)
- **AdminPermission** — adminUserId, properties, bookings, messages, testimonials, promoCodes, logs, userManagement (all booleans)
- **AdminLog** — actor, actorRole, actorId, action, module, target, ipAddress, metadata (JSON)
- **QuickReply** — name, `propertyIds` (added 2026-06-29; optional JSON int array — `null`/empty = applies to all properties, otherwise scopes the template to those Property ids), subject, bodyTemplate, trigger (auto/manual), **channel (email/sms — locked at send time; Phase 2)**, anchor (checkIn/checkOut/confirmation), offsetHours (signed; negative=before, positive=after), skipIfPastAnchor, isActive. *(Legacy single-value `propertyId` column kept vestigial/unused after the multi-property migration — slated for a future destructive-push cleanup.)*
- **ScheduledMessage** — bookingId, quickReplyId, **channel (snapshot of QuickReply.channel at materialize time; Phase 2)**, sendAt (precomputed), status (pending/sent/skipped/failed), sentAt, error; indexed on `(status, sendAt)` and `(bookingId)`
- **GuestMessage** — bookingId, quickReplyId?, sourceQuickReplyId?, channel (email/sms), direction (outbound/inbound), trigger (auto/manual), subject, body, status (sent/failed), error, **notes (non-error annotations; Phase 2 — e.g. SMS-fallback or re-thread reason)**, **fromNumber (E.164 sender for SMS)**, **toNumber (E.164 recipient for SMS)**, sentAt; indexed on `(bookingId, sentAt)` and `(sourceQuickReplyId)`. `quickReplyId` is non-null only when the template was sent **as-is**; `sourceQuickReplyId` is non-null whenever the send originated from a template (including edited-from-template manual sends), so it's the canonical "which template?" column for analytics.
- **UnmatchedInboundMessage** *(Phase 2)* — channel (sms), fromNumber (raw E.164 from provider), body, receivedAt, resolvedAt? (null = still in inbox), resolvedBookingId? (set when admin re-threads), providerMessageId? (dedupe key), rawPayload? (provider webhook JSON for debugging); indexed on `(resolvedAt, receivedAt)` and `(fromNumber)`. Holds inbound SMS replies whose `From` doesn't match any booking phone.
- **Booking** *(Phase 2 addition)* — `optedOutAt: DateTime?` is set when a guest replies STOP; suppresses future SMS sends for that booking. `guestPhone` is now stored in E.164 (e.g. `+639171234567`) — normalized on write via `libphonenumber-js`.
- **InventoryGroup** *(added 2026-08-06)* — name, `isActive` (**default `false`** — a new group propagates nothing until deliberately activated), notes. See Shared Inventory Groups.
- **InventoryGroupMember** *(added 2026-08-06)* — inventoryGroupId (FK, Cascade), propertyId (FK, Cascade). `propertyId` is **`@unique`**, which enforces the "a property may belong to only one group" rule at the database level; also `@@unique([inventoryGroupId, propertyId])`.
- **AvailabilityBlock** *(added 2026-08-06)* — propertyId (FK, Cascade), startDate, endDate (**UTC midnight, start inclusive / end exclusive — same convention as `Booking.checkIn`/`checkOut`**), type (`manual`/`inventory_derived`), reason (maintenance/owner_use/repair/deep_cleaning/pest_control/temporary_hold/personal_reservation/other/inventory_group), internalNotes (never shown to guests), scope (`listing_only`/`inventory_group`), status (`active`/`cancelled` — **soft-cancelled, never deleted**, to preserve audit history), isSystemGenerated, affectsAvailability, exportToIcal, `sourceBookingId` (FK, Cascade), `sourceExternalEventId` (FK, Cascade), `parentBlockId` (self-relation, SetNull — InnoDB self-referential cascades are unreliable and source blocks are soft-cancelled anyway), `sourcePropertyId` (SetNull), inventoryGroupId (SetNull), **`externalUid` (unique)** — doubles as the stable iCal UID *and* the idempotency key for reconciliation upserts, createdById, cancelledAt. Indexed on `(propertyId, status, startDate, endDate)`, `(sourceBookingId)`, `(sourceExternalEventId)`, `(inventoryGroupId)`, `(parentBlockId)`.
- **ExternalCalendarEvent** *(added 2026-08-06)* — propertyId (FK, Cascade), externalUid (VARCHAR 191), summary, startDate, endDate (UTC midnight, half-open), status (`active`/`removed`), firstSeenAt, lastSeenAt, removedAt. **`@@unique([propertyId, externalUid])`** is what makes sync idempotent; indexed on `(propertyId, status, startDate, endDate)`. Rows are marked `removed`, **never deleted**. Replaces the previous behaviour of re-parsing `airbnbIcsUrl` live on every availability check and discarding the result.
- **CheckoutAttempt** *(added 2026-09-28, [DEC-022](HIL_DECISIONS.md))* — token (unique, opaque; held by the browser), propertyId (plain Int, **no relation** — a deleted property must not block the purge), guestName/guestEmail/guestPhone (E.164), checkIn/checkOut (UTC midnight), guests, paymentMethod (last method shown on the payment screen), discountCode, total (Decimal 10,2 — server quote for that method), `bookingId?` (set when the booking is submitted), `alertedAt?` (claimed before the alert email is sent), createdAt, updatedAt (= last activity on the payment screen; the abandonment clock). Holds guest PII — **purged after 30 days**. See Checkout-Abandonment Alerts.
- **ExternalCalendarSyncState** *(added 2026-08-06)* — `propertyId` (unique; plain Int with no relation, mirroring `EmailPollState`), lastSyncedAt (last **successful** sync), lastAttemptAt (claimed before fetching, so concurrent callers don't stampede a feed), lastStatus (`ok`/`fetch_failed`/`parse_failed`/`not_configured`), lastError, eventCount. Makes a broken feed visible in admin instead of failing open silently, and drives the sync-on-demand staleness check.
- **HavenChatUsage** *(added 2026-10-14, [DEC-029](HIL_DECISIONS.md))* — one row per guest message in Haven's AI chat mode (summed across any internal tool-call rounds): sessionId, ipHash (sha256, never the raw IP), provider, model, inputTokens, outputTokens, costUsd (Decimal 10,6), toolCalls, outcome (`ai`/`static`/`error`), reason? (`cap`/`error`/`rate_limit`/…). A row count under a time window **is** the message count the rate limiter in `src/lib/haven/rate-limit.ts` checks. Indexed on `(createdAt)` and `(ipHash, createdAt)`. See Haven AI Chat below.
- **HavenChatTranscript** *(added 2026-10-14, [DEC-029](HIL_DECISIONS.md))* — one row per chat message (guest or Haven): sessionId, lang, role (`user`/`assistant`), content (masked — emails/phone numbers/card-like numbers stripped before the `INSERT`, `src/lib/haven/masking.ts`), toolNames? (JSON array). 90-day retention via `/api/cron/haven-retention`. Indexed on `(sessionId)` and `(createdAt)`.

---

## Email Notification Flow

All emails sent from `"Haven in Lipa" <customerservice@haveninlipa.com>` via Hostinger SMTP (Nodemailer).

| Trigger | Recipient | Email |
|---|---|---|
| Guest submits booking (GCash/BPI) | **Admin** | New booking request with full guest details + payment method |
| Guest submits booking (GCash/BPI) | **Booker** | Acknowledgment — request received, pending payment verification |
| Guest submits booking (Stripe) | **Admin** | Auto-confirmed booking with Stripe payment details |
| Guest submits booking (Stripe) | **Booker** | Immediate confirmation — "Your Stay is Confirmed!" with stay summary |
| Admin confirms booking | **Booker** | Booking confirmed with full stay summary and daily rate breakdown |
| Admin confirms booking | **Admin** | Confirmation summary with guest contact details |
| Admin creates an additional charge | **Booker** | Pay-by-link email (threaded into Guest Messages) — see Additional Charges |
| Guest taps "I've Paid" on a GCash/BPI charge | **Admin** | "Verify payment" notice — confirm receipt and Mark paid |
| Guest pays a charge by card (Stripe) | **Booker** | Card receipt (threaded into Guest Messages); **Admin** gets a paid notice |
| Guest reached the payment screen, no booking after 10 min (cron) | **Admin** | "⏳ Checkout not completed" — guest contact, stay, method, promo, amount, last-active time in Manila **and** Central; one per guest/stay. See Checkout-Abandonment Alerts |
| Guest Messaging: auto QuickReply fires (scheduler or cron) | **Booker** | Template rendered with booking/property variables; logged as `GuestMessage` |
| Guest Messaging: manual send from admin thread view | **Booker** | Template or free-text; logged as `GuestMessage` |

### Email Server Settings

**Incoming Server (IMAP)**
Hostname: imap.hostinger.com
Port: 993
Encryption: SSL

**Outgoing Server (SMTP)**
Hostname: smtp.hostinger.com
Port: 465
Encryption: SSL

**Authentication**
Username: [redacted: SMTP/IMAP login, stored in Vercel env]

---

## Key Features

### Public Site
- Homepage with Hero, Properties listing, Testimonials, Trust Signals, FAQ (5 questions + "see all" link), Why Us, Discover Lipa City, Contact Form sections
- Property details page with Airbnb-style photo gallery (grid layout + lightbox with thumbnail strip), now uses 10-section template (hero/tagline → honest description → "best for" segments → full amenity tour → neighborhood by drive-radius → guest reviews → house rules → pricing+payment → property FAQ → book-direct CTA)
- Date picker (check-in / check-out) with live nights and total calculation
- Dynamic pricing — nightly rates vary by weekday/weekend/date overrides; daily breakdown shown to guest
- Discount code validation at checkout (fixed ₱ or percentage off)
- 2-step booking flow:
  1. Guest details form with Airbnb savings comparison banner
  2. Payment: GCash QR, BPI QR, or Stripe card payment
- Stripe payments auto-confirm the booking immediately; QR payments remain pending until admin confirms
- Availability checking against both DB bookings and Airbnb iCal feed
- Per-property testimonials with "Show More" pagination
- Privacy policy, Terms of Service, **standalone /faq page** (14 questions, FAQPage JSON-LD, [src/lib/faqs.ts](../src/lib/faqs.ts) is single source of truth) and **/about page** (host bio for E-E-A-T with Person JSON-LD anchored to LocalBusiness)
- SEO: dynamic `robots.ts` and `sitemap.ts`, per-page canonicals, full schema.org coverage — see [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md)
- Google Analytics (G-2SV2PXYB7T) — production host only, never on `/admin` ([DEC-021](HIL_DECISIONS.md); see [GA4 Analytics Events](#ga4-analytics-events-gtagjs))
- **Newsletter signup** — standalone `/newsletter` page plus homepage/footer strips, creating a contact in Hostinger Reach (no DB table); see [Newsletter Signup](#newsletter-signup-hostinger-reach)
- **Haven AI chat mode** *(added 2026-10-14, flag-off by default, [DEC-029](HIL_DECISIONS.md))* — the chat widget's existing static tree gains an optional free-text LLM mode behind `HAVEN_AI_ENABLED`; see [Haven AI Chat](#haven-ai-chat)

### Admin Panel (`/admin`)
- Protected by NextAuth JWT session with role-based access control
- **Roles:** Admin (full access) and Manager (granular permissions per module)
- **Permissions:** properties, bookings, messages, testimonials, promo codes, logs, user management
- Property management: create, edit, delete listings; manage property rules
- Image manager: upload multiple photos, set featured image, delete images (stored on Vercel Blob)
- **Dynamic pricing:** manage weekday/weekend rates and date-specific overrides per property
- Booking management: view all bookings, update status (pending → confirmed → cancelled)
- Confirming a booking triggers email to guest automatically
- **Discount codes:** create, edit, activate/deactivate promo codes (fixed ₱ or percentage); scope each code to all properties or a specific single/multiple set; track usage counts and max uses
- Contact message inbox with read/unread tracking (now under **Messages → Contact Us Messages**)
- **Guest Messaging (Messages → Guest Messages):** Airbnb-style thread list keyed on booking with search, status chip, property thumbnail, and last-message preview; chat-style detail view with hybrid composer (template picker `+` OR free-text)
- **Quick Replies (Messages → Quick Replies):** reusable email templates with `{{variable}}` substitution; manual or automatic trigger (anchor = check-in / check-out / booking confirmation, with signed offset in hours)
- Testimonials management per property (add, toggle active, delete)
- **User management:** create/edit admin and manager accounts with granular permissions
- **Change password** functionality
- **Audit logs:** searchable activity log of all admin actions and guest bookings; filterable by actor, module, role; includes IP address and JSON metadata

### Airbnb iCal Sync
- **Export:** `/api/calendar/[slug]` generates a `.ics` feed for each property (Airbnb imports this). Since 2026-08-06 the feed also carries active manual blocks and shared-inventory sibling blocks where `exportToIcal` is true — see Shared Inventory Groups → iCal export.
- **Import:** Admin saves an Airbnb `.ics` URL per property (`airbnbIcsUrl`). **Since 2026-08-06 events are persisted** as `ExternalCalendarEvent` rows by [src/lib/external-calendar-sync.ts](../src/lib/external-calendar-sync.ts) rather than re-parsed live on every availability check. Parsing moved to [src/lib/ical.ts](../src/lib/ical.ts).

### Cron Jobs
- **Haven AI retention** *(added 2026-10-14)* — `/api/cron/haven-retention`; runs **daily** (`0 17 * * *` UTC = 01:00 Asia/Manila, via Vercel Cron); deletes `HavenChatTranscript` rows older than 90 days and `HavenChatUsage` rows older than 13 months. See [Haven AI Chat](#haven-ai-chat).
- **Booking requests** *(added 2026-10-13)* — `/api/cron/booking-requests`; **every 5 min via Vercel Cron**; expires undecided requests and unpaid payment links and sends the one-time unverified-payment alert. See [Instant Booking Modes & Booking Requests](#instant-booking-modes--booking-requests).
- **Checkout-abandonment alerts** *(added 2026-09-28)* — `/api/cron/checkout-abandonment`; **every 5 min via Vercel Cron** (`vercel.json` `crons` block — the first job to use it, after the move to a paid Vercel plan; the Hobby-plan note under *Trigger source* below applies to the older jobs). Vercel Cron runs on the **production deployment only** and sends `Authorization: Bearer $CRON_SECRET` itself. Backstop: [checkout-abandonment.yml](../.github/workflows/checkout-abandonment.yml) at `*/15` + manual dispatch. See Checkout-Abandonment Alerts.
- **Send scheduled messages** — `/api/cron/send-scheduled-messages`; runs **hourly** (`0 * * * *`); calls `flushDueScheduledMessages()` to fire every `ScheduledMessage` whose `sendAt <= now` and `status = pending`; authenticated via `CRON_SECRET`. Replaced the prior daily `check-in-reminders` cron — the check-in reminder is now a seeded `QuickReply` in the new generalized system.
- **Poll email replies** — `/api/cron/poll-email-replies`; runs **every 15 min** (`*/15 * * * *`); connects to Hostinger IMAP, fetches messages with UID strictly greater than `EmailPollState.lastSeenUid`, routes each via `processInboundEmail()` to a Booking thread (matched) or `ContactMessage` (unmatched). Authenticated via `CRON_SECRET`. On first run (`lastSeenUid === 0`), seeds the watermark to the mailbox's current max UID — skips all historical email so we don't surface months of legacy mail.
- **Sync external calendars** *(added 2026-08-06)* — `/api/cron/sync-external-calendars`; nominally **every 15 min**; fetches each active property's `airbnbIcsUrl`, upserts `ExternalCalendarEvent` rows, reconciles shared-inventory sibling blocks, and records per-property sync health. Accepts **either** `Authorization: Bearer <CRON_SECRET>` **or an authenticated admin session**, so the "Sync channel calendars now" button in `/admin/calendar` reuses this same route; `?propertyId=` syncs one feed. `export const maxDuration = 60`. **Availability correctness does not depend on this cron** — see Shared Inventory Groups → Why scheduling is not load-bearing. Primary scheduler is **cron-job.org** (configured outside the repo); [sync-external-calendars.yml](../.github/workflows/sync-external-calendars.yml) is a free redundant backstop.
- **Trigger source:** GitHub Actions workflows in `.github/workflows/` ([send-scheduled-messages.yml](../.github/workflows/send-scheduled-messages.yml) + [poll-email-replies.yml](../.github/workflows/poll-email-replies.yml)), not Vercel. Vercel Hobby rejects sub-daily cron schedules, so `vercel.json` has no `crons` block. Each workflow `curl`s its endpoint with `Authorization: Bearer ${{ secrets.CRON_SECRET }}`. The GitHub Actions secret value must match the Vercel env var exactly. GitHub schedules are "best effort" and **observed in practice to be throttled well beyond the nominal cadence** — on this public repo the `*/15` poll actually fires roughly **once an hour** (gaps of 50–90 min are normal), so inbound emails can sit **up to ~1–2 hours** before the next poll surfaces them in admin. *(Verified 2026-06-24: a guest email sent ~10:52 AM PHT appeared in admin ~1:03 PM. The poll itself was healthy — GitHub run history showed continuous successes, `EmailPollState` watermark advancing — the lag is purely GitHub's scheduler. To tighten latency, point a dedicated external cron — cron-job.org / Upstash QStash — at the same endpoint with the Bearer token, or move to Vercel Pro crons; the endpoint and IMAP path need no changes.)* Note: a 401 from the endpoint means the caller's `CRON_SECRET` doesn't match the Vercel env var — the local `.env` value can drift out of sync without affecting the GitHub-driven cron.

### Guest Messaging System (Phase 1 — email, outbound only)

Airbnb-inspired threaded messaging tied to confirmed bookings. One-way in Phase 1 (admin → guest via Hostinger SMTP). Phase 2 (built 2026-05-02 → 2026-05-03) adds SMS + 2-way inbound — see the next section.

**Architecture**
1. **Templates (`QuickReply`)** — `manual` templates are sent only from the admin UI; `auto` templates fire on a schedule anchored to `checkIn`, `checkOut`, or `confirmation` with a signed `offsetHours`.
2. **Materialization on confirm** — when an admin flips a booking to `confirmed`, [src/app/api/admin/bookings/[id]/route.ts](../src/app/api/admin/bookings/[id]/route.ts) calls `materializeScheduledMessagesForBooking()` to insert a `ScheduledMessage` row per applicable active auto QuickReply, with `sendAt` precomputed. It then calls `flushDueScheduledMessages({bookingId})` to inline-send any row whose `sendAt <= now` (covers last-minute bookings and `anchor=confirmation, offsetHours=0`).
   - **Gotcha (fixed 2026-08-30, [PR #11](https://github.com/cedcas/CedCasProperties/pull/11); merged and live on production 2026-08-31 as `fde9b3d`):** this materialize call originally lived *only* in the admin PUT route, gated on a `pending → confirmed` transition. A **Stripe** booking is created already `status: "confirmed"` in [src/app/api/bookings/route.ts](../src/app/api/bookings/route.ts) (`isStripeConfirmed`) — it never passes through that transition, so it silently got **zero** `ScheduledMessage` rows, with no error anywhere (the hourly cron had nothing to send). GCash/BPI bookings were unaffected since those start `pending` and only become `confirmed` via the admin route. Found via a real guest report (booking paid by Stripe, no scheduled messages ever arrived). Fix: `POST /api/bookings` now also calls `materializeScheduledMessagesForBooking()` + `flushDueScheduledMessages()` when `isStripeConfirmed`.
3. **Cancellation** — reverting a booking out of `confirmed` marks its pending `ScheduledMessage` rows as `skipped`.
4. **Hourly cron** — `/api/cron/send-scheduled-messages` runs `flushDueScheduledMessages()` globally for everything queued further in the future.
5. **Manual sends** — thread detail page offers a `+` template picker OR a free-text subject+body composer (hybrid). Both write a `GuestMessage` row.

**Composer picker behavior** (see [src/components/admin/ThreadDetail.tsx](../src/components/admin/ThreadDetail.tsx))
- Picker entries are sorted **manual templates first, alphabetized by name**, then **auto templates, alphabetized**. Each row shows a chip: green `Send now` for auto, grey `Edit & send` for manual.
- Clicking an **auto** template → fires immediately (hits `POST /api/admin/guest-messages/send` with `{quickReplyId}`).
- Clicking a **manual** template → **loads** its subject + body into the composer inputs (no network call yet). The admin edits as needed (e.g. inserting a SmartLock code) and clicks the green send arrow; this POSTs `{subject, body, sourceQuickReplyId}` so the attribution survives the edit. The resulting `GuestMessage` row has `quickReplyId=NULL, sourceQuickReplyId=<template id>`.
- Picker is filtered by `isActive && scopeAppliesToProperty(propertyIds, thread.propertyId)` (shared helper in [src/lib/promo.ts](../src/lib/promo.ts) — `null`/empty `propertyIds` matches every property). The scheduler ([src/lib/scheduler.ts](../src/lib/scheduler.ts)) likewise fetches all active auto templates and filters by the same helper in JS (JSON-array membership isn't cleanly queryable via Prisma on MySQL).

**Anchor semantics**
- `checkIn` / `checkOut` — anchorDate from the booking
- `confirmation` — anchorDate = moment materialization runs; `offsetHours=0` ⇒ send immediately. UI disables "before" direction and the `skipIfPastAnchor` checkbox (not meaningful for confirmation anchors).

**Template variables** (rendered at send time, not materialize time, so template edits retroactively affect queued sends). Catalog in [src/lib/templates.ts](../src/lib/templates.ts):
`guestFirstName, guestLastName, guestName, guestEmail, guestPhone, guests, checkIn, checkOut, checkInShort, checkOutShort, nights, totalPrice, propertyName, propertyType, propertyLocation, bedrooms, bathrooms, maxGuests`

**Thread model**
- Thread identity is `bookingId` (no separate `Thread` table). Thread view is `SELECT * FROM GuestMessage WHERE bookingId = X ORDER BY sentAt`.
- UI thread header: `{firstName}, {propertyType}, {checkInShort}-{checkOutShort}` (e.g. `Melvin, 2BR, 4/21-4/22`).
- Search ([src/app/api/admin/guest-messages/threads/route.ts](../src/app/api/admin/guest-messages/threads/route.ts)) is case-insensitive substring over guest name/email, property name, subject, and last-message preview.
- **Gotcha:** the thread **list** ([GuestMessageThreads.tsx](../src/components/admin/GuestMessageThreads.tsx) / `threads/route.ts`) is derived from `GuestMessage` rows, so a booking with **zero** messages sent (e.g. the Stripe gap above, before it was fixed) never appears in the inbox — there's nothing to group. The thread **page** itself has no such requirement: [/admin/messages/[bookingId]](../src/app/admin/messages/%5BbookingId%5D/page.tsx) → `ThreadDetail` only needs a valid `bookingId` ([GET /api/admin/guest-messages/[bookingId]](../src/app/api/admin/guest-messages/%5BbookingId%5D/route.ts) 404s only if the booking itself doesn't exist) and still loads the full Quick Replies picker. So a booking missing from the inbox can still be messaged by navigating straight to `/admin/messages/{bookingId}` — useful for manually backfilling a first send.
- **Gotcha (fixed 2026-09-02):** [GuestMessageThreads.tsx](../src/components/admin/GuestMessageThreads.tsx)'s data-loading effect used to swallow *every* fetch rejection in a bare `.catch(() => {})` meant only for intentional `AbortError`s. Any real failure (expired session, transient 500, non-JSON error body) left the panel stuck on "Loading threads…" forever with no error shown — reported as "Messages isn't loading." The backend (route, Prisma query, `auth()`) tested healthy end-to-end throughout; the failure was purely the swallowed client-side error. Now distinguishes abort from real errors and shows a message + "Try again" button — if it recurs, the banner will name the actual cause instead of hanging silently.

**API surface (all admin-gated by NextAuth)**
- `GET/POST /api/admin/quick-replies` + `GET/PATCH/DELETE /api/admin/quick-replies/[id]`
- `GET /api/admin/guest-messages/threads?q=...` — thread list with search
- `GET /api/admin/guest-messages/[bookingId]` — booking + chronological messages
- `POST /api/admin/guest-messages/send` — manual send. Accepts `{bookingId, quickReplyId}` (template sent as-is) OR `{bookingId, subject, body, sourceQuickReplyId?}` (free-text, optionally with attribution for edited-template sends).
- `GET /api/cron/send-scheduled-messages` — authorized via `CRON_SECRET` bearer

**Supporting libs**
- [src/lib/templates.ts](../src/lib/templates.ts) — `buildVars`, `render`, `threadHeader`, `TEMPLATE_VARS`
- [src/lib/guestMessages.ts](../src/lib/guestMessages.ts) — `sendGuestMessage()`: render → send email → log `GuestMessage`
- [src/lib/scheduler.ts](../src/lib/scheduler.ts) — `materializeScheduledMessagesForBooking`, `flushDueScheduledMessages`, `cancelScheduledMessagesForBooking`

**One-time migration:** [prisma/seed-quick-replies.ts](../prisma/seed-quick-replies.ts) seeds the default "Check-in reminder (24h before)" QuickReply and backfills `ScheduledMessage` rows for confirmed bookings whose check-in is still in the future (preserves the old cron's behavior with no gap during the swap). **Not run on the 2026-04-25 deploy** because prod already had a `Check-in reminder - 24h before Check-in` QuickReply authored via the admin UI (different exact name, so the seed's `findFirst` would have created a duplicate).

**Multi-property migration backfill (2026-06-29, `b190204`).** When QuickReply moved from a single `propertyId` to a `propertyIds` JSON array, the schema change was kept **additive** (new column added, old `propertyId` left vestigial) so the auto-deploy `prisma db push` never hits a destructive drop. Existing rows are migrated by the idempotent one-time script [prisma/backfill-quickreply-propertyids.ts](../prisma/backfill-quickreply-propertyids.ts) (copies each non-null `propertyId` → `propertyIds = [id]`), run **once on prod after the schema is pushed**: `npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/backfill-quickreply-propertyids.ts`. Subject to the same Hostinger DB-access gotcha below — if a laptop can't reach 3306, run it via a temporary admin-gated dev route from inside Vercel.

**Operational gotcha — direct DB access from outside Hostinger is blocked.** Hostinger's shared-hosting firewall silently drops TCP packets to port 3306 from non-allowlisted IPs regardless of the "Remote MySQL" UI setting (even when `%` is granted). Vercel's egress is allowed; external IPs (including developer laptops and Claude's sandbox) are not. Consequences: Prisma Studio and any local script using `DATABASE_URL` may fail with "Can't reach database server". *(2026-10-06: direct access from the Owner's Mac has worked on several occasions since — see DEC-012's updates. Schema migrations run from an operator machine after a reachability check, never through a temporary route — [runbook](HIL_MIGRATION_RUNBOOK.md).)* **Workaround:** deploy a temporary admin-gated POST route under `src/app/api/admin/dev/...` that runs the same Prisma logic from inside Vercel's network, call it from the browser devtools console while logged in as admin, then revert the route. This session used this pattern to insert 10 demo-thread bookings — see commit `0319840` → `1100226`.

### Guest Messaging System (Phase 2 — Email-Only with Reply Threading)

**Built 2026-05-07 after the SMS path (originally Phase 2) was put dormant.** Hostinger IMAP polls the same `customerservice@haveninlipa.com` inbox the SMTP path sends from. Replies are threaded onto bookings; non-booker emails land in the existing Contact Us inbox and auto-promote to a Guest Messages thread once the sender becomes a booker.

**Why email-only and not SMS:** Twilio US-long-code routing to PH carriers (Globe/Smart/DITO) failed end-to-end testing — both inbound (PH→US never reached Twilio) and outbound (`21612` errors even after caller-ID verification). The constraints were structural (PH compliance restrictions on Twilio), not config bugs we could fix. Provisioning a Twilio PH mobile number ($120/mo + 1–3 weeks of NTC paperwork) was the only working SMS path, but the value didn't justify the cost. The SMS code is left dormant for future revival — see "SMS path (dormant)" below.

**Outbound email** — same as Phase 1 (admin → guest via Hostinger SMTP), but `sendEmail()` in [src/lib/email.ts](../src/lib/email.ts) now returns `{ messageId }` from Nodemailer, and `sendGuestMessage()` in [src/lib/guestMessages.ts](../src/lib/guestMessages.ts) persists it to `GuestMessage.messageId` so inbound replies can thread via In-Reply-To.

**Inbound email pipeline:**
1. **Poller** ([src/lib/imap.ts](../src/lib/imap.ts)) — `pollNewEmails()` connects via `imapflow`, fetches `UID > lastSeenUid` from INBOX, parses each message via `mailparser`, returns `ParsedInboundEmail[]` with extracted `messageId`, `inReplyTo`, `references`, `from`, `subject`, `text`. Detects auto-replies (`Auto-Submitted` header) and bounces (`multipart/report` content type) for skipping. `getCurrentMaxUid()` exposed for first-run watermark seed. `stripQuotedReply()` heuristically removes "On <date> <name> wrote:" quoted history from reply bodies.
2. **Router** ([src/lib/emailReply.ts](../src/lib/emailReply.ts)) — `processInboundEmail(parsed)` follows the threading priority:
   1. **In-Reply-To / References** match → look up `GuestMessage.messageId` (outbound) → write inbound `GuestMessage` on the same booking
   2. **From email** matches `Booking.guestEmail` (most-recent non-cancelled) → write inbound `GuestMessage` with note "Threaded by sender email (no In-Reply-To match)"
   3. **No match** → write to `ContactMessage` with `source: "email"` and `messageId` populated. Surfaces in the existing Contact Us inbox.
   - Skips: bounces, auto-replies, self-sends (`From == SMTP_USER`, e.g. admin replying via webmail), and dedup duplicates by `messageId`.
3. **Cron route** ([src/app/api/cron/poll-email-replies/route.ts](../src/app/api/cron/poll-email-replies/route.ts)) — bearer-token auth via `CRON_SECRET`. On first run seeds the watermark; subsequent runs fetch+process+advance. Returns summary `{ fetched, matched, unmatched, skipped, advancedTo }`.
4. **Workflow** ([.github/workflows/poll-email-replies.yml](../.github/workflows/poll-email-replies.yml)) — fires every 15 min via GitHub Actions cron `*/15 * * * *`.

**ContactMessage → GuestMessage promotion** — in [src/lib/emailReply.ts](../src/lib/emailReply.ts), `promoteContactMessagesForEmail({ bookingId, email, bookingCreatedAt })` migrates pre-booking inquiries from the same email into the booking's GuestMessage thread when a Booking is created. Called from [src/app/api/bookings/route.ts](../src/app/api/bookings/route.ts) after `prisma.booking.create()`. Best-effort (failure does not block booking). Migrated ContactMessage rows get `promotedToBookingId` set, hiding them from the Contact Us inbox query (`WHERE promotedToBookingId IS NULL`) but preserving them as a back-reference. Sentinel timestamp: original `createdAt` becomes the new `GuestMessage.sentAt` so the thread chronology is correct.

**Pagination** — both Guest Messages threads and Contact Us Messages default to **10 items per page** with a "Load older (N more)" button:
- Guest Messages: client-side cumulative — `?page=N&pageSize=10` on [GET /api/admin/guest-messages/threads](../src/app/api/admin/guest-messages/threads/route.ts) returns the first `page * pageSize` rows after search. Search resets `page` to 1.
- Contact Us: server-side via `?contactPage=N` query param on [/admin/messages](../src/app/admin/messages/page.tsx). Each click navigates with `take: 10 * contactPage`.

**Idempotency / dedup:**
- IMAP UID watermark is monotonically increasing per mailbox; advancing it after each successful run prevents reprocessing.
- `Message-ID`-based dedup — if an inbound `Message-ID` already exists in `GuestMessage` or `ContactMessage`, skip writing.
- `processInboundEmail()` is safe to call repeatedly with the same payload.

**Edge cases:**
| Case | Handling |
|---|---|
| Reply has no `In-Reply-To` (some clients drop it) | From-email fallback |
| Reply from new email address (different from booking) | Contact Us inbox; admin manually copies content if it should belong to a booking |
| Auto-reply / vacation responder | `Auto-Submitted` header check; skip |
| Bounce / DSN | `Content-Type: multipart/report` check; skip |
| HTML-only email | `mailparser` returns `text` (extracted) for thread display |
| Quoted history in reply | Best-effort strip via `stripQuotedReply()` patterns |
| Same email arrives twice (IMAP retry) | Dedup by `Message-ID` |
| Admin replying via Hostinger webmail | Detected by `From == SMTP_USER`; skipped (admin should use the in-app composer for thread fidelity) |

### Guest Messaging System (Phase 2 — SMS, DORMANT as of 2026-05-07)

The SMS path remains in the codebase but is non-functional in production. See "Guest Messaging System (Phase 2 — Email-Only)" above for what's actually live.



Adds SMS as a second channel alongside email. Each `QuickReply` has a locked `channel` (`email` or `sms`) chosen once in QuickRepliesManager; templates fire on the channel they're tagged with. Free-text composer in [ThreadDetail.tsx](../src/components/admin/ThreadDetail.tsx) has a per-send channel toggle (since it has no template).

**Channel split (per-template; Decision C from the plan)**
- **Email templates:** booking acknowledgment, full confirmation with price breakdown, contact-form replies — anything that benefits from a paper trail or rich content.
- **SMS templates:** day-before-checkin reminder, payment-pending nudge, check-out thanks — anything time-sensitive that the guest will actually read within minutes.

**Outbound flow** — single chokepoint at `sendGuestMessage()` in [src/lib/guestMessages.ts](../src/lib/guestMessages.ts):
1. Resolve `channel` from the caller (template's locked channel, or free-text picker).
2. If `sms`:
   - **Opted out?** Downgrade to `email`, annotate `notes` with the opt-out timestamp.
   - **Phone unparseable?** Downgrade to `email`, annotate `notes`.
   - **Non-PH (`+63...` check)?** Downgrade to `email`, annotate `notes` with country (e.g. `"SMS skipped: non-PH number (US); sent as email"`). Note: with Twilio (post-2026-05-04) this gate is conservative — Twilio supports global delivery; keep the gate to avoid surprise charges or remove it if you want to message foreign guests.
   - **Otherwise:** Call `sendSms()` ([src/lib/sms.ts](../src/lib/sms.ts)) → Twilio SDK `messages.create()`.
3. Write `GuestMessage` row with the *actually-used* channel, `fromNumber`, `toNumber`, status, and any annotation notes.

The scheduler in [src/lib/scheduler.ts](../src/lib/scheduler.ts) snapshots `QuickReply.channel` onto the `ScheduledMessage` row at materialize time (so retroactive template channel changes don't confuse pending sends). It also defers SMS sends during quiet hours (21:00–08:00 Asia/Manila by default) — the row stays `pending` and fires on the next out-of-quiet cron run.

**Inbound flow** — `POST /api/sms/inbound?secret=<SMS_INBOUND_SECRET>` ([route](../src/app/api/sms/inbound/route.ts)):
1. **Auth (two layers):**
   - Shared secret: `?secret=` query param OR `x-inbound-secret` header must match `SMS_INBOUND_SECRET`.
   - Twilio signature: `X-Twilio-Signature` header verified by `twilio.validateRequest()` against the request URL + sorted form params, signed with `TWILIO_AUTH_TOKEN`. Skipped only if `TWILIO_AUTH_TOKEN` is unset (e.g. dev or before Twilio is wired up).
2. **Parse:** Accepts Twilio's form-encoded payload (`From`, `To`, `Body`, `MessageSid`) and JSON for testing. Looks up common field names so the route remains provider-portable.
3. **Dedupe:** by `MessageSid` (Twilio retries on non-2xx responses) against existing `GuestMessage` and `UnmatchedInboundMessage`.
4. **Normalize:** `From` → E.164 via `libphonenumber-js`.
5. **STOP keyword detection:** if body trims to `STOP`/`UNSUBSCRIBE`/`OPTOUT`/`CANCEL`/`QUIT`, set `Booking.optedOutAt` for all matching non-cancelled bookings on that phone. (Twilio also auto-handles STOP at the carrier level; we additionally enforce it for defense in depth.)
6. **Match:** Find non-cancelled bookings with `guestPhone === fromE164`, ordered by `checkIn DESC`. If 1+ matches, attach to the most recent and write a `GuestMessage` row with `direction: "inbound"`. If none, write to `UnmatchedInboundMessage` (admin re-threads later).
7. **Notify:** Fire an admin email summarizing the inbound (separate templates for matched vs unmatched, vs STOP).

**Unmatched Inbox** ([/admin/messages/unmatched](../src/app/admin/messages/unmatched/page.tsx) + [UnmatchedInboundList.tsx](../src/components/admin/UnmatchedInboundList.tsx)):
- A banner on `/admin/messages` shows a count when pending unmatched messages exist.
- The page lists each unmatched row with sender + body + timestamp; admin can **re-thread** (search bookings by name/email/phone via `/api/admin/bookings/search` and pick one — creates an inbound `GuestMessage` on that booking) or **dismiss** (mark resolved).

**Phone normalization** — [src/lib/phone.ts](../src/lib/phone.ts) wraps `libphonenumber-js`. PH default for bare local numbers; international with `+` prefix is parsed correctly. Booking creation rejects unparseable input. Backfill script for existing rows: [scripts/backfill-phone-e164.ts](../scripts/backfill-phone-e164.ts) (with `--dry` flag for preview).

**SMS character handling** — `smsLength()` in [src/lib/sms.ts](../src/lib/sms.ts) detects GSM-7 vs UCS-2, computes char count + segment count + per-segment length. QuickRepliesManager shows a live segment counter when `channel === "sms"` to prevent accidental multi-segment templates.

**API surface (Phase 2 additions; all admin-gated except `/api/sms/inbound`)**
- `POST /api/sms/inbound` — provider webhook (secret-gated; not auth-protected so the provider can call it)
- `GET /api/admin/unmatched-inbound` — list pending unmatched messages
- `PATCH /api/admin/unmatched-inbound/[id]` — body `{bookingId}` to re-thread, or `{dismiss: true}` to dismiss
- `GET /api/admin/bookings/search?q=...` — booking lookup for the re-thread UI (substring on name/email/phone, plus E.164-normalized phone match)
- `POST /api/admin/guest-messages/send` — accepts `channel` for free-text sends; templates use their locked channel

**Provider history** — initially built against Semaphore 2026-05-02; switched to Twilio 2026-05-04 after Semaphore confirmed via email (Alex Alabiso, May 4 2026) that they're outbound-only. The codebase was already provider-flexible — only [src/lib/sms.ts](../src/lib/sms.ts) (driver) and inbound `MessageSid`/signature handling needed updating; everything else (sendGuestMessage branching, scheduler, admin UI, schema) was unchanged.

**Operational notes**
- Twilio number: any number that can SMS to PH works (US long codes do; +63 local numbers are not generally available on Twilio). Single number for sending and receiving — guests reply to the same number they received.
- Cost guardrail: there's no monthly send-cap implemented yet. At 30 bookings/mo cap, even worst-case usage caps at ~$31/mo, so this is low-priority. Add a simple counter check in `sendSms()` if needed.
- Compliance: transactional SMS (booking confirmations, reminders) does not require separate consent under the PH Data Privacy Act. The booking form copy adds a one-line consent disclosure: *"We'll send transactional SMS reminders about your stay (PH numbers only)."*
- A2P 10DLC registration: if Twilio routes outbound through a US long code, you may receive a registration notice. For low-volume transactional traffic this is typically fine to skip, but Twilio may eventually require brand+campaign registration for sustained sending.

### Security
- QR code integrity protection (SRI): server-side startup hash verification + client-side `useQrIntegrity` hook to detect tampered QR images
- Security alert API endpoint with rate limiting (10 alerts/IP/15 min)
- Admin route protection via NextAuth middleware
- Bcrypt password hashing for admin accounts
- Stripe payment validation on server side before confirming bookings

#### Content-Security-Policy ([next.config.ts](../next.config.ts))

A single CSP header applies to `/(.*)`. When adding any third-party script or
client-side fetch, **check this header first** — a missing host fails silently at
the network layer, which is very hard to attribute after the fact.

> **GA4 needs four hosts in `connect-src`, not one (fixed 2026-08-08, `a22830d`).**
> The policy originally named only `https://www.google-analytics.com`, and GA4 was
> unable to collect **anything** from the site — `page_view`, `scroll`,
> `form_start`, every custom event. `gtag()` ran without throwing and the beacon
> was refused by the browser, so GA4 reported "No stream data detected" for every
> event, including Google's own auto-created ones.
>
> Two traps made this easy to get wrong:
> - `analytics.google.com` is a **bare** host. A CSP wildcard requires at least one
>   leading label, so `*.analytics.google.com` does **not** match it. Covered via
>   `*.google.com`.
> - `www.google.com` serves a second `/g/collect` endpoint plus the
>   `/measurement/conversion` linker ping, and was absent entirely.
>
> Required: `*.google-analytics.com`, `*.analytics.google.com`, `*.google.com`,
> `*.googletagmanager.com`. If Google Ads is ever connected, country domains
> (`google.com.ph`, …) and `*.g.doubleclick.net` may need adding too.
>
> Diagnosing a suspected block — the violation event names the exact host:
> ```js
> document.addEventListener("securitypolicyviolation", e =>
>   console.warn("CSP BLOCKED →", e.blockedURI, "|", e.violatedDirective));
> ```
> CSP is fixed at document load, so a tab opened before a redeploy still enforces
> the old policy. Confirm what is actually being served with
> `fetch(location.href, {cache:"reload"}).then(r => r.headers.get("content-security-policy"))`.

Also allowed: `m.stripe.com` / `m.stripe.network` per Stripe's documented CSP.
`vercel.live` (the preview comment toolbar) is deliberately **not** allowed — it is
preview-only, and permitting it would widen production `script-src` for no
production benefit. Its console error on preview deploys is expected.

---

## File Structure

```
src/
  app/
    page.tsx                          # Homepage
    layout.tsx                        # Root layout
    globals.css                       # Tailwind v4 + brand tokens
    robots.ts                         # Dynamic robots.txt
    sitemap.ts                        # Dynamic sitemap
    privacy/page.tsx                  # Privacy policy
    terms/page.tsx                    # Terms & conditions
    properties/page.tsx               # Inventory index (9a8e47c)
    properties/[slug]/
      page.tsx                        # Property detail page (gallery, dates, availability)
      book/page.tsx                   # 2-step booking flow
    staycation/page.tsx               # Staycation money page (6fc4b60) — cluster C1, article #6's 301 target
    weddings-accommodation/page.tsx   # Wedding-party money page (7fa3421) — FAQPage schema only
    admin/
      layout.tsx                      # Admin layout (force dynamic — no caching)
      page.tsx                        # Admin root redirect
      login/page.tsx                  # NextAuth login
      dashboard/page.tsx
      properties/page.tsx
      properties/new/page.tsx
      properties/[id]/page.tsx        # Edit property
      properties/[id]/rates/
        page.tsx                      # Property rate management
        PropertyRatesClient.tsx
      properties/inventory-groups/
        page.tsx                      # Shared inventory groups (static segment wins over [id])
        InventoryGroupsClient.tsx     # Create/rename/activate, members, upcoming propagated blocks
      calendar/
        page.tsx                      # Availability calendar + manual block manager
        CalendarClient.tsx            # Month grid, 6-way legend, why-blocked panel, sync buttons
      bookings/page.tsx
      messages/
        page.tsx                      # Combined Guest Messages (top) + Contact Us Messages (bottom) + unmatched-inbox banner
        [bookingId]/page.tsx          # Thread detail — chat feed + hybrid composer + per-channel rendering
        quick-replies/page.tsx        # QuickReply CRUD
        unmatched/page.tsx            # Unmatched inbound SMS inbox (Phase 2)
      testimonials/page.tsx
      discount-codes/
        page.tsx                      # Discount code management
        DiscountCodesClient.tsx
      logs/
        page.tsx                      # Audit log viewer
        LogsClient.tsx
      users/
        page.tsx                      # Admin user management
        UsersClient.tsx
      change-password/page.tsx
    api/
      auth/[...nextauth]/route.ts     # NextAuth handler
      bookings/route.ts               # POST — create booking (GCash/BPI/Stripe)
      availability/[slug]/route.ts    # GET — delegates to lib/availability (bookings + blocks + imported events)
      calendar/[slug]/route.ts        # GET — export .ics feed (bookings + exportable blocks; never echoes imported events)
      properties.json/route.ts        # GET — public read-only listing feed for the WP blog (ISR 1h, static)
      contact/route.ts                # POST — contact form
      rates/[slug]/route.ts           # GET — fetch daily rates for a property
      discount-codes/validate/route.ts # POST — validate discount code at checkout
      stripe/payment-intent/route.ts  # POST — create Stripe PaymentIntent
      security-alert/route.ts         # POST — QR tampering alert (rate-limited)
      cron/send-scheduled-messages/route.ts # GET — hourly; flush due ScheduledMessage rows
      admin/bookings/[id]/route.ts    # PATCH — update booking status (also materializes/flushes/cancels messaging)
      admin/properties/route.ts       # GET/POST properties
      admin/properties/[id]/route.ts  # GET/PATCH/DELETE property
      admin/properties/[id]/images/route.ts  # POST/DELETE images (Vercel Blob)
      admin/properties/[id]/rates/route.ts   # GET/POST/DELETE property rates
      admin/messages/[id]/route.ts    # PATCH — mark message read
      admin/testimonials/route.ts     # GET/POST testimonials
      admin/testimonials/[id]/route.ts # PATCH/DELETE testimonial
      admin/discount-codes/route.ts   # GET/POST discount codes
      admin/discount-codes/[id]/route.ts # PATCH discount code
      admin/users/route.ts            # GET/POST admin users
      admin/users/[id]/route.ts       # PATCH/DELETE admin user
      admin/change-password/route.ts  # POST — change password
      admin/logs/route.ts             # GET — fetch audit logs
      admin/quick-replies/route.ts    # GET/POST — QuickReply list & create
      admin/quick-replies/[id]/route.ts # GET/PATCH/DELETE — QuickReply item
      admin/guest-messages/threads/route.ts  # GET — thread list + search
      admin/guest-messages/[bookingId]/route.ts # GET — single thread messages
      admin/guest-messages/send/route.ts # POST — manual send (template or free-text; channel-aware in Phase 2)
      admin/unmatched-inbound/route.ts   # GET — list pending unmatched inbound messages (Phase 2)
      admin/unmatched-inbound/[id]/route.ts # PATCH — re-thread to booking or dismiss (Phase 2)
      admin/bookings/search/route.ts     # GET — booking lookup by name/email/phone (Phase 2)
      sms/inbound/route.ts               # POST — provider webhook for inbound SMS replies (Phase 2; DORMANT as of 2026-05-07)
      cron/poll-email-replies/route.ts   # GET — every-15-min IMAP poll of Hostinger inbox (Phase 2 email reply threading)
      cron/sync-external-calendars/route.ts # GET — fetch/persist external .ics feeds + reconcile inventory blocks; Bearer CRON_SECRET OR admin session
      admin/calendar/route.ts            # GET — one payload for /admin/calendar (bookings, events, blocks, group, sync health)
      admin/availability-blocks/route.ts # GET list / POST create manual block (listing_only | inventory_group)
      admin/availability-blocks/[id]/route.ts # PATCH edit / DELETE soft-cancel; 400 on system-generated blocks
      admin/inventory-groups/route.ts    # GET list+available properties / POST create (inactive by default)
      admin/inventory-groups/[id]/route.ts # PATCH rename+activate / DELETE
      admin/inventory-groups/[id]/members/route.ts # POST add / DELETE remove (+ reconcile)
  components/
    layout/
      Navbar.tsx                      # Nav with working anchor links from any page
      Footer.tsx                      # Async server component; "Plan Your Trip" column fetches latest 5 posts from WP REST API — see HIL Blog Technical Specification. Bottom legal row (14px): copyright + "Powered by NetCoreSolutions.com" credit link (DEC-025) on the left, Privacy/Terms on the right
    sections/
      Hero.tsx
      Properties.tsx                  # Property listing cards with pagination
      Testimonials.tsx                # Per-property testimonials with "Show More"
      TrustSignals.tsx                # Guest reviews trust section
      FAQ.tsx                         # Frequently asked questions
      WhyUs.tsx
      DiscoverLipa.tsx                # Discover Lipa City section
      ContactForm.tsx
    ui/
      PropertyCard.tsx
      PropertyGallery.tsx             # Airbnb-style grid + lightbox thumbnail strip
      BookingCard.tsx
      TestimonialList.tsx
      ScrollReveal.tsx
    admin/
      AdminLayoutClient.tsx
      AdminSidebar.tsx
      PropertyForm.tsx
      ImageManager.tsx
      BookingStatusSelect.tsx
      DeleteButton.tsx
      MarkReadButton.tsx
      AddTestimonialForm.tsx
      TestimonialToggle.tsx
      GuestMessageThreads.tsx         # Thread list component (search, thumbnail, preview)
      ThreadDetail.tsx                # Chat bubble feed + hybrid composer; Phase 2: inbound left-aligned, channel pill per message, opt-out banner, per-send channel toggle for free text
      QuickRepliesManager.tsx         # QuickReply CRUD modal; Phase 2: channel selector, SMS char/segment counter; multi-property "Applies to" via All/Specific toggle + property pills (mirrors DiscountCodesClient)
      UnmatchedInboundList.tsx        # Phase 2 — re-thread or dismiss unmatched inbound messages
    booking/
      BookingForm.tsx                 # 2-step: guest details → payment
      PaymentQR.tsx                   # QR display + Save to Photos (capability-based fallback: navigator.share for touch, <a download> for desktop, long-press hint for old iOS Safari) + tap-to-copy amount chip + method-specific 4-step instructions; gated on SRI-verified status
  hooks/
    useQrIntegrity.ts                 # Client-side QR hash verification hook; returns { status, blob } — caches the verified blob so the Save action reuses verified bytes (no double-fetch)
  lib/
    auth.ts                           # NextAuth config
    prisma.ts                         # Prisma client singleton
    email.ts                          # Nodemailer + Hostinger SMTP
    pricing.ts                        # Daily rate calculation (weekday/weekend/override)
    log.ts                            # Admin audit trail logging
    qr-integrity-check.ts            # Server-side QR hash verification
    templates.ts                      # {{variable}} substitution + TEMPLATE_VARS catalog
    guestMessages.ts                  # sendGuestMessage(): render → branch on channel (email/sms) → send → log; foreign-number auto-fallback to email
    scheduler.ts                      # materialize / flush / cancel scheduled messages; Phase 2: channel-aware + Asia/Manila quiet-hours deferral
    availability.ts                   # SINGLE SOURCE OF TRUTH for conflicts: bookings + manual blocks + inventory blocks + imported events
    dates.ts                          # UTC calendar-date helpers + mergeRanges/isFullyCovered (echo-suppression coverage maths)
    booking-status.ts                 # BLOCKING_BOOKING_STATUSES = [pending, confirmed] — own module to break an import cycle
    inventory-groups.ts               # pure planDerivedBlocks() + reconcilers for booking / external-event / manual-block sources
    external-calendar-sync.ts         # fetch+persist external .ics; removal safety rail; ensureExternalEventsFresh (sync-on-demand)
    ical.ts                           # RFC 5545 parse (unfolding, UID, DURATION) + buildVCalendar; replaced 2 copy-pasted inline parsers
    calendar-uids.ts                  # deterministic iCal UIDs, doubling as reconciliation idempotency keys
    sms.ts                            # Phase 2 — Twilio SMS driver; DORMANT as of 2026-05-07 (returns error if Twilio env vars unset)
    sms-length.ts                     # Phase 2 — pure-JS GSM-7/UCS-2 segment counter (split from sms.ts so client components don't pull in the Twilio SDK)
    phone.ts                          # Phase 2 — libphonenumber-js wrapper for E.164 normalization (PH default, accepts international)
    imap.ts                           # Phase 2 email reply pipeline — pollNewEmails, getCurrentMaxUid, stripQuotedReply via imapflow + mailparser
    emailReply.ts                     # Phase 2 email reply pipeline — processInboundEmail (route to GuestMessage or ContactMessage), promoteContactMessagesForEmail (migrate inquiries on booking creation)
  middleware.ts                       # Protects /admin routes (NextAuth)
prisma/
  schema.prisma
  seed.ts                             # Seeds admin user
  seed-testimonials.ts                # Seeds testimonials per property
  seed-quick-replies.ts               # Seeds default "Check-in reminder" QuickReply + backfills upcoming confirmed bookings
  backfill-quickreply-propertyids.ts  # One-time, idempotent: migrate QuickReply.propertyId -> propertyIds [id] (multi-property migration, 2026-06-29)
scripts/
  generate-qr-hash.js                # Generates SHA-256 hashes for QR images
  backfill-demo-threads.ts           # LOCAL-ONLY (.gitignored). Creates 10 demo bookings + GuestMessage rows; requires direct DB access (won't run from laptops blocked by Hostinger's 3306 firewall)
  backfill-phone-e164.ts             # Phase 2 — one-time normalization of existing Booking.guestPhone to E.164; supports --dry preview
  fix-property-content.ts            # One-time production content correction (DEC-016): Maculot/Mbps/parking pass + SM Lipa/Casa Marikit drive-time pass; dry run by default, --execute to write
.github/
  workflows/
    ci.yml
    send-scheduled-messages.yml      # Hourly cron trigger; curls /api/cron/send-scheduled-messages with Bearer CRON_SECRET
    sync-external-calendars.yml      # */15 REDUNDANT BACKSTOP for calendar sync (~12% delivery); cron-job.org is primary
public/
  qr/
    gcash.jpg                         # GCash payment QR (one QR for all properties — per-property variants retired 2026-04-27)
    bpi.png                           # BPI payment QR (one QR for all properties)
  brand-assets/
    Logo.png
    Transparent Logo.png
    Brand Guideline.png
```

> SEO-specific files (`prisma/seed-property-seo.ts`, `prisma/seed-property-seo-mickey.ts`, `src/lib/property-schema.ts`, `src/lib/faqs.ts`) are documented in [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md).

---

## Build & Deployment

**Deployments never change the database schema** ([DEC-026](HIL_DECISIONS.md), 2026-10-06). Operating procedure: [HIL_MIGRATION_RUNBOOK.md](HIL_MIGRATION_RUNBOOK.md).

| Script (`package.json`) | Runs | Touches a database? |
|---|---|---|
| `build` | `npm run build:app` | No |
| `build:app` | `prisma generate && next build` | No (CI's `Build` job uses this) |
| `vercel-build` | `prisma generate && node scripts/migration-gate.mjs && npm run build:app` | **Read-only.** Vercel runs this script instead of `build` when it exists |
| `db:migrate` | `node scripts/db-migrate.mjs` | Yes — the only schema-writing entry point; operator-run, never automatic |
| `test:migrations` | `node scripts/test-migrations.mjs` | Throwaway loopback databases only |

### Migration history — `prisma/migrations/`

- `20261005000000_baseline/migration.sql` reproduces the schema as it stood on production on 2026-10-05 (23 tables). It was generated from `schema.prisma`, then put in production's physical column and index order, so a database built from it dumps (`mariadb-dump --no-data`) byte-identical to production and dev. One foreign-key index (`GuestMessage_quickReplyId_fkey`) is declared explicitly for that reason.
- The existing dev and production databases are **marked** as having the baseline (`prisma migrate resolve --applied`): one `_prisma_migrations` table, one row, no application DDL. The baseline's SQL is only ever executed on an empty database.
- `.gitattributes` pins migration SQL to LF line endings — Prisma stores a checksum of each file.
- **Gotcha — index prefix lengths.** `GuestMessage.messageId` is `VARCHAR(998)`; InnoDB caps an index key at 3072 bytes, so MariaDB stores its index as a 768-character prefix. Until 2026-10-06 `schema.prisma` did not declare that, so every `prisma db push` build dropped and recreated the index. It is now `@@index([messageId(length: 768)])`. Any future index on a long string column needs its prefix declared.

### Release gate — [scripts/migration-gate.mjs](../scripts/migration-gate.mjs)

Runs in the Vercel build before `next build`, for Production and Preview alike, against that environment's `DATABASE_URL`. It issues `SELECT`s only. It compares the migrations in the commit with `_prisma_migrations` (shared logic in [scripts/lib/migration-history.mjs](../scripts/lib/migration-history.mjs)) and exits non-zero — failing the build, leaving the previous deployment live — when:

- the database has no migration history (never baselined);
- a migration in the commit is not applied (pending);
- a migration failed or was interrupted;
- an applied migration's file was edited (checksum mismatch);
- the history cannot be read (database unreachable — fails closed).

A database that is *ahead* of the commit only warns, so rollbacks and branches that are behind the dev database still build. Log lines start with `[migration-gate]`.

This is what orders a release: Vercel deploys `main` on its own, so a migration job elsewhere could finish after the build. With the gate, schema-dependent code cannot build until its migration has been applied. **The Vercel dashboard's Build/Install Command overrides must stay off** (confirmed `null` via the Vercel API, 2026-10-06); an override would skip `vercel-build`. The Production build of `3798482` logged `Running "npm run vercel-build"`, then `[migration-gate] OK`, then `next build`.

### Operator command — [scripts/db-migrate.mjs](../scripts/db-migrate.mjs)

`status` (read-only), `baseline` (one-time), `deploy`, `new` (authoring; loopback database only). Common behaviour:

- **Target.** URL from `MIGRATE_DATABASE_URL` or one named key of an env file — never `DATABASE_URL`. In the local `.env`, `DATABASE_URL` and `DEV_DATABASE_URL` are the dev database and production is `PRODUCTION_DATABASE_URL` (since 2026-10-06). The server is asked which database it is; a mismatch with `--expect-database` stops the run. `--target production` writes also need `--confirm-production`.
- **Commit.** `baseline`/`deploy` need `--commit <sha>` equal to the checked-out commit, with no uncommitted change under `prisma/`, `scripts/`, `package.json`, `package-lock.json`.
- **Drift check.** Builds a scratch database on a loopback MariaDB (`--reference-url`) from the relevant migrations and compares the target with it two ways: Prisma's `migrate diff`, and an `information_schema` fingerprint that also covers what Prisma ignores (column order, collations, engines, views, triggers, routines, events, check constraints). Runs before any write and again after `deploy`.
- **Deploy.** Lists pending migrations and stops; applies only when `--apply` names exactly those. Refuses on a failed row, an edited migration, a database ahead of the commit, or out-of-order history. Uses the locked Prisma CLI from `node_modules` (not `npx`). Prisma's own advisory lock serializes concurrent runs against one database.
- **Failure.** Exits non-zero, never marks anything applied, never retries. A second run refuses while the failed row exists.
- **Record.** Writes `.migration-runs/<time>-<target>-<command>.json` (gitignored): target, database, commit, migrations before/after, result. Connection strings and passwords are redacted from all output.

### Guardrails

- [src/lib/__tests__/build-safety.test.ts](../src/lib/__tests__/build-safety.test.ts) (in `npm test`, no database): no schema-writing command in any npm lifecycle/build script, `vercel.json`, or workflow; no workflow references a hosted database secret; the gate script contains only `SELECT`s; the baseline's checksum is pinned; history-evaluation rules.
- [scripts/test-migrations.mjs](../scripts/test-migrations.mjs) (`npm run test:migrations`; CI job **Migrations**, MariaDB 11.8 container): empty database → `migrate deploy` → equals `schema.prisma`; a `schema.prisma` edit without a migration is detected; baselining a populated database is metadata-only and leaves data checksums unchanged; a drifted database is not baselined; a pending migration blocks the gate until applied; a failing migration fails closed and is not re-run.

**Seed admin user:**
```
npm run seed
```

**Seed testimonials:**
```
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-testimonials.ts
```

**Seed default QuickReply + backfill upcoming bookings (one-time, after deploying Guest Messaging):**
```
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-quick-replies.ts
```

**Seed long-form SEO content into properties** — see [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md) (`npm run seed:property-seo` and the Mickey seed).

**Payment / deposit policy (all properties):** `pricingNotes.deposit` now reads "Full payment required at the time of booking to secure your dates" for every listing (HIL takes full payment at booking, not a partial deposit). The detail-page pricing line labels this field **"Payment:"** (not "Deposit:") — label is a single shared template in [src/app/properties/[slug]/page.tsx](../src/app/properties/[slug]/page.tsx); the JSON field key remains `deposit`.

**Backfill Booking.guestPhone to E.164 (one-time, after deploying Phase 2 Guest Messaging):**
```
# Preview (no writes):
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-phone-e164.ts --dry
# Apply:
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-phone-e164.ts
```

**Production property-content correction (one-time, Owner-approved only)** — [scripts/fix-property-content.ts](../scripts/fix-property-content.ts) with pure logic in [src/lib/property-content-fixes.ts](../src/lib/property-content-fixes.ts) and [src/lib/drive-time-fixes.ts](../src/lib/drive-time-fixes.ts) ([DEC-016](HIL_DECISIONS.md)). Never wired into `build`/`postinstall`/`seed`.
```
# Dry run (default, no writes):
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-property-content.ts
# Write, only after Owner review of the printed dry run:
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/fix-property-content.ts --execute
```
- **Safety model (both passes):** exactly the 5 `{id, slug}` pairs in `EXPECTED_PROPERTIES` or abort; any unexpected content aborts the whole run before a transaction opens; all writes in one `prisma.$transaction`; all 5 rows re-queried and re-scanned after the write; idempotent (a second run proposes nothing).
- **Pass 1 — Maculot / Mbps / parking (2026-09-07):** detects `STALE_PATTERNS`, allows them only in each slug's `EXPECTED_STALE_FIELDS`, and replaces the **whole field** with the seed-module value (`prisma/property-content/*`). Production has been clean since the 2026-09-07 run, so this pass is a no-op today. Its targets come from the content modules. Since the 2026-09-28 release, `dev` and `main` both carry the post-PR #26 versions.
- **Pass 2 — SM Lipa / Casa Marikit drive times (added 2026-09-27, [src/lib/drive-time-fixes.ts](../src/lib/drive-time-fixes.ts)):** runs on top of pass 1's output, in the same dry run/transaction. **Targeted, not whole-field:** `DRIVE_TIME_RULES` is a hardcoded, reviewed table of exact old → new substrings per slug and field, copied from commit `db0cdbc` (PR #26), so unrelated admin edits elsewhere in a field survive. It is deliberately self-contained (no import from `prisma/property-content/*`) so the same file works on `dev` and `main`. JSON fields (`bestForSegments`, `amenityDetails`, `propertyFaqs`) are edited on the parsed value and re-serialized with `JSON.stringify`, the seed's format; if the stored text doesn't round-trip through `JSON.stringify`, the run aborts rather than reformat it. `neighborhoodPlaces` moves the SM Lipa and Casa Marikit entries out of the `5 minutes by car` (B34) / `5 to 10 minutes by car` (Mickey) band into a new `About 20 to 30 minutes by car` band inserted before `30 to 45 minutes by car`; any other band layout aborts. An old substring that is absent is skipped (already fixed or rewritten); one occurring twice aborts as ambiguous.
- **Residual gate:** after replacement, every content field is scanned sentence-by-sentence (JSON: per string value; `neighborhoodPlaces`: `band label: place`) for a stale time **in the same sentence as SM (City) Lipa or Casa Marikit**: SM Lipa + 5 / five / 5–10 / five to ten / 5-minute; Casa Marikit + short drive / 10–15 / 45 / 5 minutes. Any hit aborts with a property/field/excerpt list for a human to fix in admin. False positives deliberately avoided: "a short drive from Taal and Tagaytay" (no landmark), "hospitals within 10 minutes", and "the SM Lipa area" (no time) are never flagged or changed.
- **Expected changes against the pre-#26 content (20 fields, all 5 properties):** 1 `cozy-1-bedroom` — description, amenityDetails, neighborhoodPlaces; 2 `spacious-2-bedroom` — description, bestForSegments, amenityDetails, neighborhoodPlaces, propertyFaqs; 3 `…sleeps-7` — bestForSegments, amenityDetails, neighborhoodPlaces, propertyFaqs; 4 `…sleeps-11` and 5 `…sleeps-15` — description, amenityDetails, neighborhoodPlaces, propertyFaqs.
- **Production run (done 2026-09-28, 00:11 CT):** pass 2 ran once on production through a TEMPORARY admin-only DEC-012 route, `/api/admin/dev/fix-drive-times`. GET gave a read-only plan with a `planHash`; POST required the confirm string `APPLY-DRIVE-TIMES` plus the reviewed hash. Owner dry run: planHash `db895ae4f17708a6`, 20 field changes across 5 properties. POST returned `success: true`, 20 written, and the re-check passed. All 5 live listings were checked. **The route has since been removed.** For any future production run, add a new temporary route that reuses `planDriveTimeFixes`, following the DEC-016 addendum, or use the CLI from an environment that can reach the DB. Idempotent: a re-run now proposes nothing.
- **Tests:** `src/lib/__tests__/property-content-fixes.test.ts` (pass 1) and `src/lib/__tests__/drive-time-fixes.test.ts` (pass 2). Pass 2 uses a frozen fixture, `src/lib/__tests__/fixtures/drive-time-pre-post-26.json` (every field at `db0cdbc^`, serialized as the seed writes the DB), and asserts byte-equality with post-#26, idempotency, preservation, residual aborts, and planHash stability. DB-free.

**Generate QR hashes:**
```
npm run qr:hash
```

**Repository:** `github.com/cedcas/CedCasProperties`
**Production URL:** `haveninlipa.com`
**Preview/dev URL:** `dev.haveninlipa.com` (mapped to the `dev` branch — Vercel Preview environment)
**Branch:** `main` (auto-deploy on push)

### CI (GitHub Actions) — repaired 2026-09-07

[.github/workflows/ci.yml](../.github/workflows/ci.yml) runs five jobs on every push/PR to `main` or `dev`: **Lint**, **Type Check**, **Unit Tests**, **Build**, and (since 2026-10-06) **Migrations**, which tests the migration history against a throwaway MariaDB 11.8 container on the runner — never a hosted database. These are separate, stably-named status checks (suitable for branch protection), not one combined job.

**The CI `Build` job never runs the production `build` script.** It runs `npm run build:app` (`prisma generate && next build`) — application compilation only. Since 2026-10-06 `build` is the same thing (`npm run build:app`), and Vercel's own entry point, `vercel-build`, adds only a read-only check ([DEC-026](HIL_DECISIONS.md)). No PR build can write to any hosted database, run a migration against one, or seed anything. The Build job's `DATABASE_URL`/`NEXTAUTH_SECRET`/`NEXTAUTH_URL` are placeholders, parsed by Prisma Client generation and Next's env validation but never contacted — never a production credential.

**Why this needed repair:** both were failing on every PR (confirmed identical on #16 and #17, unrelated to either PR's content):
- **Build** — `/sitemap.xml` queried Prisma directly at static-export time, and `getChatTree()` (mounted in the root layout via `ChatWidgetServer`, so it runs for *every* route) did the same, unguarded. Any statically-prerendered page — including the shared `/_not-found` — crashed the whole build against CI's placeholder DB. Fixed by pointing `/sitemap.xml` at the existing cached `getPublicListings()` helper with `export const dynamic = "force-dynamic"` (same precedent as `/about`/`/properties`, DEC-005), and by having `getChatTree()` ([src/lib/chat/get-chat-tree.ts](../src/lib/chat/get-chat-tree.ts)) fall back to the generic (non-DB) chat tree if the property query throws, instead of crashing the page. See [DEC-017](HIL_DECISIONS.md).
- **Lint** — 9 real errors from `eslint-config-next` 16's stricter rule set (`@typescript-eslint/no-require-imports` on a CommonJS script, `@next/next/no-assign-module-variable`, and 5× the new `react-hooks/set-state-in-effect` React Compiler rule). All fixed or, for 3 instances on guest-facing/payment-adjacent code where a rewrite risked a behavior change, given a single narrow `eslint-disable-next-line` with an inline justification — never a blanket or rule-wide suppression.

**Trustworthiness, verified on the repair PR (#18) itself, not just locally:** a deliberately broken lint rule, a real type error, a failing test, and invalid syntax were each confirmed to still fail their respective gate (`exit 1`/`exit 2`) before being reverted, uncommitted.

---

## Manual Test Plans

Manual test plan workbooks live in `About HIL/`. Each follows the pattern Setup → per-scenario Testing tabs → Summary, with brand styling (charcoal title, forest header, cream subhead). Test IDs prefixed `TC-P-...` for positive (sunny day) and `TC-N-...` for negative (rainy day).

| Workbook | Scope |
|---|---|
| `HavenInLipa_Positive_Test_Plan_Basic_Features_v1.0.xlsx` | Booking flow basics — 1BR/2BR, GCash/BPI/Stripe, promo codes |
| `HavenInLipa_Negative_Test_Plan_Basic_Features_v1.0.xlsx` | Booking edge cases — past dates, conflicts, validation |
| `HavenInLipa_GuestMessaging_Positive_Test_Plan_v1.1.xlsx` | Guest Messaging Phase 1 — sunny day (outbound + cron + auth) |
| `HavenInLipa_GuestMessaging_Negative_Test_Plan_v1.1.xlsx` | Guest Messaging Phase 1 — rainy day |
| `HavenInLipa_GuestMessaging_Positive_Test_Plan_v1.2.xlsx` | Guest Messaging Phase 2 — adds Email Reply Testing sheet (TC-P-015..022: Message-ID capture, In-Reply-To threading, From-fallback, ContactMessage promotion, watermark seed, dedup, quoted-history strip) + Admin UI Pagination sheet (TC-P-023..025) |
| `HavenInLipa_GuestMessaging_Negative_Test_Plan_v1.2.xlsx` | Guest Messaging Phase 2 — adds Email Reply Testing sheet (TC-N-016..022: cron auth, self-send skip, SMS dormant graceful failure, bounce/DSN skip, auto-reply skip, promoted-row hidden, no-history booking creation) |
| `HavenInLipa_QRPayment_Positive_Test_Plan_v1.0.xlsx` | QR payment UX — Save to Photos, copy amount, instructions, app upload (per device: iPhone Safari, Android Chrome, MacBook, Windows PC) |
| `HavenInLipa_QRPayment_Negative_Test_Plan_v1.0.xlsx` | QR payment UX — share-sheet cancel, mid-flow method switch, tampered-QR detection (dev-prep required) |
| [`HavenInLipa_InventoryGroups_Test_Plan_v1.0.md`](../About%20HIL/HavenInLipa_InventoryGroups_Test_Plan_v1.0.md) | Shared inventory groups, manual availability blocks, persisted external calendar events, `/admin/calendar` (TC-P-001..025 + TC-N-001..016, plus a Phase A/B/C protocol that is safe on the shared production database). Markdown rather than xlsx because the setup constraints and teardown ordering need prose. |

**Tampered-QR test prep on Vercel** (negative QR plan, TC-N-QR-005/006/009/010): split the `NEXT_PUBLIC_QR_HASH_GCASH` / `NEXT_PUBLIC_QR_HASH_BPI` env vars per-environment — keep Production with the real hash, override Preview with a bogus value (e.g. `sha256-AAAA...AAAA=`). Redeploy the `dev` branch without build cache. Tester verifies on `dev.haveninlipa.com` while Production stays clean. Restore Preview to the real hash + redeploy after testing.

---

## Shared Inventory Groups, Availability Blocks & Persisted Calendar Events

*Added 2026-08-06.*

### The problem

Some listings are different configurations of **one physical property**. The two real sets are already visible in the iCal tables at the top of this document:

| Set | Listings |
|---|---|
| **BV34** | `cozy-1-bedroom`, `spacious-2-bedroom` |
| **BV38** | `mickey-in-lipa--family-staycation--sleeps-7`, `…--family-house--sleeps-11`, `…--full-family-house--sleeps-15` |

Only one configuration can be occupied on any overlapping date range, but HIL treated every `Property` row as an independent unit. Booking the 1BR left the 2BR and 3BR openly bookable on this site *and*, through the exported `.ics` feed, on Airbnb. That was a live double-booking hole.

### What changed

Three gaps had to close together:

1. **No concept of shared inventory** — nothing linked sibling listings → `InventoryGroup` + `InventoryGroupMember`.
2. **No way to block dates manually** — maintenance and owner use had no representation at all; the only lever was a fake booking → `AvailabilityBlock`.
3. **External events were never persisted** — the feed was re-parsed live per request and discarded, so there was no stable record to match on the next sync, nothing to update when dates moved, and no way to distinguish "this event is gone" from "the fetch failed" → `ExternalCalendarEvent` + `ExternalCalendarSyncState`.

### Centralised availability — [src/lib/availability.ts](../src/lib/availability.ts)

The single source of truth. A date is unavailable if **any** active record overlaps it:

1. HIL bookings in a blocking status
2. Active manual availability blocks
3. Active system-generated shared-inventory blocks
4. Active persisted external calendar events

Operations: `getPropertyConflicts`, `getUnavailableDateRanges`, `isPropertyAvailable`, `assertPropertyAvailable` (throws `AvailabilityConflictError` carrying a **guest-safe** message that never reveals *why* — an owner-use block reads simply as "not available").

**Blocking statuses live in [src/lib/booking-status.ts](../src/lib/booking-status.ts)** as `BLOCKING_BOOKING_STATUSES = ["pending", "confirmed"]`. This preserves the existing rule exactly — it was previously hard-coded as `["confirmed","pending"]` in three separate route handlers with no shared constant (`api/availability/[slug]`, `api/bookings`, `api/calendar/[slug]`). It sits in its own module to break an import cycle (availability → external-calendar-sync → inventory-groups → availability).

> **Business consequence worth knowing:** because `pending` blocks, an *unpaid* booking request on one configuration also blocks its siblings and pushes those blocks to Airbnb. Narrowing propagation to confirmed-only is a one-line change to that constant.

Routes rewired to use it: `api/availability/[slug]` (response shape **unchanged** — still `{available, conflicts}` / `{blockedRanges}`, so `BookingCard` and `BookingForm` needed no edits, and no guest names or block reasons leak to the public API), `api/bookings` (an inline overlap loop *and* a duplicated 34-line inline iCal parser were replaced by one `assertPropertyAvailable` call), and `api/calendar/[slug]`.

### Propagation — [src/lib/inventory-groups.ts](../src/lib/inventory-groups.ts)

Split into a **pure planner** and an **impure applier**, which is what makes the logic testable without a database (Hostinger blocks DB access from laptops *and* CI):

- `planDerivedBlocks({ source, group, existing, cancelCutoff })` → `{ upserts, cancels }`. No DB, no clock, no side effects.
- `reconcileBookingDerivedBlocks`, `reconcileExternalEventDerivedBlocks`, `reconcileManualBlockDerivedBlocks`, `reconcileGroup`, `reconcilePropertyRemovedFromGroup`.

Rules it upholds:

- The source event **stays on its original property**; the reservation is never duplicated. Only derived *blocks* appear elsewhere.
- **Channel-neutral** — a source is a HIL booking, an imported external event, or a group-scoped manual block. No platform-specific logic.
- Reconciliation is *compute the desired set → upsert it → cancel active strays*, so it is idempotent: a no-op run performs **zero writes**.
- Blocks are **soft-cancelled**, never deleted.
- A property in no group, or in an inactive group, produces an **empty plan** — which is why every ungrouped property behaves exactly as it did before.

**Deliberately not wrapped in one big transaction.** Each upsert is atomic on its unique `externalUid`, and desired blocks are written *before* stale ones are cancelled. A mid-flight failure therefore leaves *extra* active blocks rather than missing ones — it over-blocks, never under-blocks, and the next run converges. For a system whose job is preventing double bookings, that is the correct failure direction.

### Stable UIDs and idempotency — [src/lib/calendar-uids.ts](../src/lib/calendar-uids.ts)

`AvailabilityBlock.externalUid` is UNIQUE and does double duty: it is the iCal UID *and* the reconciliation upsert key. Every derived UID is computable from immutable ids **before** insert, so one `upsert` delivers idempotency, date-change reconciliation, revival of a cancelled block, and concurrency safety (a losing race raises `P2002` and is retried as an update).

| Record | UID |
|---|---|
| Booking on its own property | `booking-{id}@haveninlipa.com` — **unchanged**; altering it would orphan events already in external calendars |
| Manual block | `manual-block-{id}@haveninlipa.com` |
| Derived from a booking | `inventory-block-booking-{bookingId}-property-{targetPropertyId}@haveninlipa.com` |
| Derived from an external event | `inventory-block-external-{eventId}-property-{targetPropertyId}@haveninlipa.com` |
| Derived from a group manual block | `inventory-block-manual-{blockId}-property-{targetPropertyId}@haveninlipa.com` |

A manual block is created and then stamped with its id-derived UID inside one transaction; `externalUid` is nullable precisely so that intermediate state is legal under the unique index.

### External sync — [src/lib/external-calendar-sync.ts](../src/lib/external-calendar-sync.ts)

**The removal safety rail is the most important part of this feature.** Deciding an event has *disappeared* unblocks dates, so a fetch may only drive removals when it unambiguously succeeded: HTTP 2xx **and** a body containing `BEGIN:VCALENDAR`. On any timeout, non-2xx, or non-calendar payload (an HTML error page arrives as a 200 with a useless body) the failure is recorded, a sync-failure entry is logged, and the last known-good state is left **completely intact**.

This is a strict improvement on the previous behaviour, where a renamed or broken feed silently dropped every Airbnb block and the site quietly resumed accepting bookings on occupied dates with no warning anywhere.

Sync flow: capture `runStartedAt` → fetch/verify → upsert each event on `[propertyId, externalUid]` → detect date changes and revivals → mark active events absent from the feed as `removed` (never deleted) → reconcile sibling blocks **only for events that actually changed**. Cancelling a removed event's blocks touches only blocks tied to that event; unrelated overlapping blocks, including manual maintenance on the same dates, are never disturbed.

Parsing ([src/lib/ical.ts](../src/lib/ical.ts)) fixes several silent faults in the old inline copies: RFC 5545 **line unfolding** (folded values were corrupted), **`UID`/`SUMMARY` extraction** (never read at all), a **`DURATION` fallback** (events with no `DTEND` were silently dropped, leaving dates bookable), `STATUS:CANCELLED` skipping, and `TZID`-qualified datetimes no longer resolving in the *server's* timezone.

### Why scheduling is not load-bearing

Measured GitHub Actions delivery on this repo (`gh run list`, Aug 2026): the `*/15` poll fires ~**11.5×/day (≈12%)** and the hourly job ~**9.3×/day (≈39%)**, with observed gaps of **3 h 30 m** and **4 h 05 m**. Every run succeeded — GitHub simply never fired the rest. A 2-hour blind spot is cosmetic for guest messaging; for calendar sync it is a double-booking window.

Correctness is therefore delivered by **sync-on-demand**, not by a scheduler. `ensureExternalEventsFresh` re-syncs a stale feed at the moments that matter:

| Trigger | Staleness window |
|---|---|
| Availability check on a stale feed | 30 min |
| **Immediately before a booking commits** | 2 min |
| Admin "Sync channel calendars now" | forced |
| Scheduled pre-warm | 15 min target — optimisation only |

`lastAttemptAt` is claimed via a conditional `updateMany`, so a burst of concurrent availability checks triggers at most one outbound fetch. This is **strictly cheaper than the old behaviour**, which re-fetched Airbnb synchronously on every keystroke with no caching at all. Worst case with every scheduler dead: one ~1 s inline fetch after an idle period.

Schedulers, in order of importance: (1) sync-on-demand, (2) the manual button, (3) **cron-job.org at `*/15`** — the primary pre-warmer, configured in their dashboard with the URL and an `Authorization: Bearer <CRON_SECRET>` header, (4) the GitHub Actions workflow as free redundancy plus a `workflow_dispatch` manual trigger.

### Echo suppression — bidirectional sync feedback (added 2026-08-06)

**The hazard.** HIL and a channel sync *both ways*: HIL exports a block, the channel imports it, and the channel's own feed then re-advertises it — so we import our own block back as an "external" event. Left alone that echo becomes an **independent propagation source that outlives whatever caused it.**

Observed and traced on 2026-08-06. With Airbnb's sibling cross-links in place it deadlocks: cancel the real booking → its derived blocks cancel → but the imported echo on 1BR survives → it derives a block onto 2BR → **that block exports on 2BR's feed** → Airbnb 1BR, cross-linked to HIL's 2BR feed, stays blocked → the echo survives the next sync. All three listings stay closed permanently with no traceable cause.

**Two mitigations, in order of importance:**

1. **Each Airbnb listing must import only its OWN HIL feed** — no sibling cross-links, and no other *Airbnb* listing's export either. This applies to **both** shared sets. BV34 was observed relaying independently of HIL on 2026-08-06: `cozy-1-bedroom` and `spacious-2-bedroom` were both blocked Aug 7–8 while **both HIL feeds were empty**, so Airbnb was passing the block between the two listings itself. This alone breaks the cycle — 1BR's feed goes clean because imported events are never exported, so Airbnb unblocks and the echo is marked removed. Necessary *and* sufficient. Sequence when going live: activate the group → verify all three feeds → **then** unlink, never before, since the cross-links are what enforce shared inventory on Airbnb until HIL takes over.
2. **Code-level suppression** ([src/lib/inventory-groups.ts](../src/lib/inventory-groups.ts)) as defence in depth against a future re-link or another channel wired the same way: an imported event does **not** propagate to siblings when its nights are already **fully covered** by a HIL-originated record on the same property. The covering record derives those same siblings itself, so the echo is pure redundancy.

**Why coverage must be TOTAL, not merely overlapping.** A genuine channel reservation that only *starts* inside a HIL booking would, under an overlap test, stop propagating — leaving its uncovered nights bookable on siblings while the unit is occupied. That is a real double booking, and it is the one way this rule could cause harm, so `isFullyCovered` in [src/lib/dates.ts](../src/lib/dates.ts) requires containment and is covered by an explicit partial-overlap test plus a mutation check.

"HIL-originated" coverage means bookings in `BLOCKING_BOOKING_STATUSES` plus active **non-derived** blocks. It deliberately excludes derived blocks and other imported events, since either can itself be a link in an echo chain.

**Closing the uncover window.** When a booking is cancelled or a manual block withdrawn, coverage shrinks and a previously-suppressed event may be a genuine reservation that must resume blocking siblings. Waiting for the next sync would leave siblings bookable for up to a sync interval, so `reconcileBookingDerivedBlocks` and `reconcileManualBlockDerivedBlocks` re-reconcile overlapping `ExternalCalendarEvent` rows immediately when their source stops blocking.

`/admin/calendar` labels a suppressed event in the day detail — *"already covered by booking #N, so it is not propagating to sibling listings"* — so the rule is visible rather than mysterious.

### iCal export

[api/calendar/[slug]](../src/app/api/calendar/[slug]/route.ts) now exports bookings in a blocking status **plus** active manual and derived blocks where `exportToIcal && affectsAvailability`, bounded to `endDate > today`.

It deliberately **never exports `ExternalCalendarEvent` rows** — those were imported *from* a channel, and echoing them back through the same property's feed would loop. A block *derived* from an imported event **is** exported, but on the **other** properties in the group, which is the entire point of shared inventory.

`DTSTAMP` now comes from each record's `updatedAt` instead of `new Date()`, so a feed fetched twice with no underlying change is **byte-for-byte identical**.

### Admin UI

- **`/admin/calendar`** ([page](../src/app/admin/calendar/page.tsx) · [client](../src/app/admin/calendar/CalendarClient.tsx)) — month grid with six distinct markers (HIL booking / imported event / manual block / shared-inventory block / maintenance / owner use), click a day to see **why** it is blocked, block create/edit/cancel with a live "will also block…" preview, a per-listing feed-health chip that turns **red** with the actual error, and **"Sync channel calendars now"** plus a per-listing refresh. Dates are handled as `YYYY-MM-DD` strings built from UTC parts end to end, so a US admin and a Manila admin see identical squares.
- **`/admin/properties/inventory-groups`** ([page](../src/app/admin/properties/inventory-groups/page.tsx) · [client](../src/app/admin/properties/inventory-groups/InventoryGroupsClient.tsx)) — create, rename, activate/deactivate, add/remove members, and view upcoming propagated blocks. Only properties not already in a group are offered.
- Sidebar gains a **Calendar** item; the Properties list gains an **Inventory Groups** button.

**System-generated blocks are read-only.** Both `PATCH` and `DELETE` on a derived block return **400** — it is a projection of its source, so a direct edit would be silently undone by the next reconciliation.

### Authorization & audit

Reuses existing infrastructure — **no new `AdminPermission` column and no new `AdminLog.module` literal**, so user management, seeds and existing manager accounts are untouched. Routes use the standard `const session = await auth(); if (!session) → 401`. Blocks, calendar and sync log under `module: "bookings"`; inventory groups under `module: "properties"`. System-generated entries use `actor: "System"`. Reconciliation logs only **real changes**, so a quiet sync writes nothing.

### Tests

`npm test` → **210 assertions** (105 unique × two timezone projects, `America/Chicago` and `Asia/Manila`, configured in [vitest.config.ts](../vitest.config.ts)). A CI `test` job runs them.

**What is covered:** the derived-block planner (all required propagation, cancellation, date-change, idempotency, membership and activation scenarios), **echo suppression** (covered / partially-covered / uncovered, and that only imported events are ever suppressed), external-sync planning, overlap + coverage + UTC-date maths, iCal parse/build, UID stability.

The suppression rule is mutation-verified three ways: weakening containment to an overlap test, ceasing to merge adjacent coverage ranges, and applying suppression to non-imported sources each fail the suite.

**What is NOT covered:** Prisma queries, route handlers, auth, the admin UI, real channel feeds. DB-backed tests are impossible here — Hostinger blocks database access from laptops *and* CI. That gap is closed by hand via [HavenInLipa_InventoryGroups_Test_Plan_v1.0.md](../About%20HIL/HavenInLipa_InventoryGroups_Test_Plan_v1.0.md).

### Dev / prod database split (implemented 2026-08-06)

Dev and production now use **separate Hostinger databases**. Preview no longer inherits production's `DATABASE_URL`.

| Vercel env var | Environments | Database |
|---|---|---|
| `DATABASE_URL` | Production | `[redacted: production DB name]` |
| `DATABASE_URL` | Preview + Development | `[redacted: dev DB name]` (user `[redacted: dev DB user]`) |

No code change was required — `DATABASE_URL` is consumed solely by `prisma/schema.prisma`, nothing in `src/` reads it. At the time, `prisma db push` built the schema on first deploy (no longer — a new database is built with `prisma migrate deploy`, [runbook](HIL_MIGRATION_RUNBOOK.md)); production was cloned in via phpMyAdmin to carry admin logins and properties. `airbnbIcsUrl` is cleared on the dev copies so dev neither reads from nor writes toward a live channel.

**Still shared with production:** `SMTP_*`, Stripe and Blob credentials. A dev booking sends a real email from `customerservice@haveninlipa.com`, and live Stripe keys mean a real charge. Twilio is safe by default (console-only unless `SMS_FORCE_SEND=1`).

#### Two gotchas that cost several failed deploys

1. **Connection-string encoding.** The generated MySQL password began with `#`, which in a URL starts the *fragment* — so every parser truncated there, read the username as the hostname, and failed with `P1001: Can't reach database server at [redacted: dev DB user]:3306`. Reserved characters in the password **must** be percent-encoded: `#`→`%23`, `;`→`%3B`, `+`→`%2B`, `@`→`%40`, `/`→`%2F`. Simplest prevention: use an alphanumeric-only database password. Verify a string without deploying:
   `echo "SELECT 1;" | npx prisma db execute --url "<url>" --stdin`
2. **Variable naming and scoping.** `P1012 Environment variable not found: DATABASE_URL` means the variable is absent from that build, not that the database is unreachable. Causes seen: the key was named `DATABASE_ENV`; and the Preview value was pinned to a **custom preview branch**, so `dev`-branch Preview builds never received it. A giveaway is the log line `Datasource "db": MySQL database` with no database name after it.

#### Schema drift blocked production deploys — RESOLVED 2026-08-08

*Historical, kept because the failure mode is instructive.* While dev shared production's
database, dev deploys ran `prisma db push` against **production**, creating the five
inventory/calendar tables there. `main`'s schema did not declare them, so a production
build saw five unexpected tables and refused to drop them:

```
⚠️  There might be data loss when applying the changes:
  • You are about to drop the `AvailabilityBlock` table, which is not empty (13 rows).
Error: Use the --accept-data-loss flag …
```

The live site was never affected — this was **build-time** only — but no production deploy
could ship. **Merging `dev` → `main` (`3c9d3fb`) resolved it**: the schema then matched the
database. Dropping the orphan tables would have worked too.

**Never add `--accept-data-loss` to the build command** — it would turn every future schema
divergence into silent production data loss. The guard behaved correctly.

Now that the databases are separated, production's schema is only ever pushed by `main`
builds, so this drift cannot recur.

### Go-live record — 2026-08-08

Merged as `3c9d3fb` (a merge commit, so `git revert -m 1 3c9d3fb` rolls the whole feature
back), plus `5ed7c1f`. Verified live:

- `/api/admin/calendar` returns `401` rather than `404`, confirming the new routes deployed.
- Availability unchanged on every listing immediately after deploy — the feature arrives
  dormant, since a property in no active group behaves exactly as before.
- Feeds carried no unexpected events: only the two pre-existing bookings.

**Groups created and active:** *Mickey in Lipa* (BV38 — Sleeps 7 / 11 / 15) and
*Haven in Lipa* (BV34 — Cozy 1BR + Spacious 2BR).

**Validated end-to-end on production data.** An unintended Airbnb-side block on
8 Aug 2026 was cleared in Airbnb; HIL's sync saw the event vanish from the feed, retracted
it, cancelled the derived blocks on both siblings, and reopened all three listings — with
no manual intervention. That exercises the removal path, bounded retraction and propagation
cancellation together.

**Scheduling:** cron-job.org runs `*/15` against `/api/cron/sync-external-calendars`
(`Authorization: Bearer <CRON_SECRET>`, 6.3 s typical, 30 s timeout), with the GitHub
Actions workflow as a redundant backstop. `CRON_SECRET` was rotated on go-live day; it is
consumed by **four** places — three GitHub workflows (`send-scheduled-messages`,
`poll-email-replies`, `sync-external-calendars`) plus cron-job.org. Rotating it without
updating the GitHub repo secret silently stops guest messaging, so verify with a manual
`workflow_dispatch` run afterwards.

#### Still outstanding

Current status of these items (owner/tester actions, not implementation work) is tracked in [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md), not here. As of this spec's last update the mechanism-relevant one is: **the Airbnb sibling cross-links are not yet unlinked on any of the five listings** — see the echo-suppression section above. Until they are, each Airbnb poll can form a fresh echo, and code-level suppression deliberately does not catch this case (a *derived* block is not HIL-originated coverage). The tell is doubled ranges in `/api/availability/<slug>`: the listing's own imported event plus a derived block from a sibling's echo of the same thing.

### Deploying safely

**Preferred: a dedicated dev database.** Point `DATABASE_URL` at its own database for the Vercel **Preview** environment only. No code changes are required — `DATABASE_URL` is consumed solely by `prisma/schema.prisma`, nothing in `src/` reads it, and no host is hardcoded. Build the schema with `prisma migrate deploy` run by an operator ([runbook](HIL_MIGRATION_RUNBOOK.md)) — a Vercel build will not create it, and fails at the release gate until the database has migration history. Cloning production via phpMyAdmin (which carries `_prisma_migrations` along) avoids the empty-DB deadlock (no `AdminUser` → no admin login, and Hostinger blocks `npm run seed` from a laptop unless the IP is whitelisted under Remote MySQL). Clear `airbnbIcsUrl` on the dev copies so dev neither reads from nor writes toward a live channel. Note that `SMTP_*`, Stripe and Blob credentials remain **shared** with production regardless.

**If the database is shared**, the dangerous artefact is a test **`Booking`**, not a test block. Production cannot read `AvailabilityBlock`, but `Booking` is shared and production's pre-existing `.ics` feed **exports it** — which is exactly how a test booking reached live Airbnb listings on 2026-08-06 and kept real dates closed after it was deleted (Airbnb had not re-polled). Create test bookings only on properties no channel subscribes to, and verify the production feeds are empty afterwards with `curl -s https://haveninlipa.com/api/calendar/<slug>.ics`.

Other mitigations: `InventoryGroup.isActive` defaults to **`false`**, and blocks are soft-cancelled. The three-phase protocol (isolated fixtures → real listings grouped but inactive → activation on production, then unlinking in Airbnb) is in the test plan. **Deactivating a group is the instant rollback.**

> ### ⚠️ A merge to `main` is not a deploy — Vercel can miss the push entirely (2026-08-17, `f0027cc`)
>
> The push of `00ca46a` to `main` produced **no Vercel deployment at all** — no Production record, no Preview, nothing, **25 minutes** after the push. GitHub Actions ran on the commit normally, so every signal short of the live URL looked healthy. Every prior release in the deployments log shows a Production build within **~60 seconds** of the main push, which is what makes the absence diagnostic rather than ambiguous.
>
> Nothing in the repo was wrong: the same commit deployed cleanly once re-triggered, and the page was live 90 seconds later.
>
> **How to detect.** Poll *both* the live URL and the deployments API — the API is what distinguishes "still building" from "never started":
> ```
> gh api repos/cedcas/CedCasProperties/deployments --jq '.[0] | "\(.created_at) \(.environment) \(.sha[0:7])"'
> ```
> **How to fix.** Push an **empty commit** to `main` (`git commit --allow-empty`) to fire the webhook again. Re-pushing the same ref does nothing — Git sees no change. *(Corrected 2026-10-06: the Owner's Mac does have a working Vercel CLI login — `npx vercel inspect <deployment url> --logs --scope cedcas-projects` reads build logs, and a redeploy can be done from the CLI or the dashboard.)*
>
> **Reading the `environment` field carefully.** It is labelled from the *sha*, not the branch that triggered the build, so a `dev` push whose head happens to equal `main`'s head is recorded as **Production**. Don't infer "main deployed" from an environment label alone — check the sha.

---

## Booking Amendments (Guest & Stay Edit)

*Added 2026-10-01 — PR #43. Owner acceptance-tested on `dev.haveninlipa.com` (dev build `9eb9f76`) before release. [DEC-024](HIL_DECISIONS.md).*

Staff can change a booking's **guest name, email, phone, guest count, property, check-in and check-out** from `/admin/bookings/[id]`. Before this, those fields had no editor and corrections needed a temporary DEC-012 route (see the 2026-09-17 entry in [HIL_COMPLETION_LOG.md](HIL_COMPLETION_LOG.md)).

| Piece | Where |
|---|---|
| Service (validation, review, commit) | [src/lib/booking-amendment.ts](../src/lib/booking-amendment.ts) |
| API | `POST` [/api/admin/bookings/[id]/amend](../src/app/api/admin/bookings/[id]/amend/route.ts) — `{action: "preview" \| "commit" \| "resync"}` |
| UI | [GuestStayEditor.tsx](../src/components/admin/GuestStayEditor.tsx), mounted in the existing Guest and Stay cards |
| Inventory lock | [src/lib/inventory-lock.ts](../src/lib/inventory-lock.ts), [src/lib/db-retry.ts](../src/lib/db-retry.ts) |
| Permission check | [src/lib/admin-permissions.ts](../src/lib/admin-permissions.ts) |

### Flow

**Edit → Review → Save.** "Review changes" calls `preview`, which validates and returns before/after values, nights, the sibling listings that will be blocked or released, any conflicts, the price position and the scheduled-message plan. Nothing is written. "Save amendment" calls `commit` with a mandatory **reason** and the `expectedUpdatedAt` token from the review. The booking keeps its id, status, payment evidence and history.

### Who can amend what

`classifyStayPhase` uses the **Manila** calendar date (`todayInManila` in [dates.ts](../src/lib/dates.ts)) — not the server's UTC date, which is still "yesterday" until 08:00 in Lipa.

| Phase | Editable |
|---|---|
| Upcoming (pending or confirmed) | everything; check-in cannot move into the past |
| In progress (check-in ≤ today ≤ check-out) | contact, guests, check-out. Check-in and property are locked |
| Past | contact details only |
| Cancelled | nothing — an amendment never reactivates a booking |

These rules were approved by the Owner as first-release policy on 2026-10-02 ([DEC-024](HIL_DECISIONS.md)).

Other validation: the `changes` object is allowlisted to the seven fields and anything else (e.g. `totalPrice`, `status`) is **rejected with 400**, not ignored; dates must be strict `YYYY-MM-DD` real calendar dates; guests must be a whole number within the target listing's `maxGuests`; a move requires an active target listing; phone goes through `normalizePhone`.

### Availability

A check runs only when the property or dates change. It uses `getInventoryScopeConflicts` in [availability.ts](../src/lib/availability.ts) with `excludeBookingId`, which removes **only** this booking and the blocks derived from it. Another booking, a manual block or an imported channel event still conflicts — **including an imported event that overlaps the booking's own current nights**. The code cannot tell an echo from a real channel reservation, so it never assumes; resolve it on the channel first.

`getInventoryScopeConflicts` also reads blocking bookings on active-group **siblings directly**, not only through their derived blocks. A booking's derived blocks are written after its row, so a check that relied on the projection alone would miss a sibling booking that has just committed.

The external feed is refreshed with the same 2-minute pre-commit policy as a new booking, **before** the transaction opens (no network inside a lock). Failure policy is unchanged: last known-good events stay in force. If the feed's last status is a failure, the review shows a warning.

### The inventory lock — why a transaction is not enough

Check-then-insert is not atomic, and under InnoDB two transactions do not see each other's uncommitted rows, so a transaction alone lets both pass. `withInventoryLock` takes `SELECT … FOR UPDATE` on the `Property` rows of the whole inventory scope (the listing plus every member of its group) in id order, at `READ COMMITTED`. **Both `POST /api/bookings` and amendments take it.** The public route keeps its early `assertPropertyAvailable` (before the slow Stripe verification) and re-checks under the lock immediately before the insert.

**Gotcha — deadlocks are expected.** A writer outside the lock that inserts a row with a foreign key to `Property` (a post-commit derived-block upsert) takes share locks in foreign-key order, which can cross the lock's id order. InnoDB aborts one side with error 1213. `retryOnDeadlock` ([db-retry.ts](../src/lib/db-retry.ts)) re-runs the transaction, and `reconcileBookingDerivedBlocks` retries itself when called outside a transaction. Found by the database-backed suite (about 1 run in 4 before the retry).

The retry is deliberately narrow: **only** a deadlock (Prisma `P2034`, or `P2010` with `meta.code` 1213), **3 attempts in total**, jittered. A lock-wait timeout (1205), Prisma's transaction timeout (`P2028`) and connection errors are not retried. It wraps only database work — one transaction, or the upsert-based reconciler — never anything that emails, calls Stripe or fetches a feed.

**Production database (checked read-only 2026-10-01).** Hostinger runs **MariaDB 11.8.9**; production and dev are separate schemas on the same server; all 23 tables are InnoDB. Server default isolation is already `READ-COMMITTED`, `innodb_deadlock_detect` is ON, `innodb_lock_wait_timeout` is 50 s, `lower_case_table_names` is 0 (so the raw `` `Property` `` / `` `Booking` `` names must keep their exact case), `max_user_connections` is 75. The local test database was MariaDB 12.3 — same engine family, same locking behaviour. A lock waiter is cut off by Prisma's 25 s transaction timeout long before the server's 50 s.

**How this keeps the reconciler's guarantees.** The reconciler's contract is: write desired blocks before cancelling stale ones, be idempotent on the unique UID, soft-cancel only, and fail towards over-blocking. Nothing in `planDerivedBlocks` or `applyPlan` changed. Outside a transaction (booking creation, sync, group edits) it behaves exactly as before, plus a deadlock retry. Inside an amendment or reactivation transaction the same `applyPlan` runs in the same order on the transaction client, so the outcome is either the complete new projection or the untouched old one — strictly stronger than "over-block on partial failure", never weaker. The one new step is re-reconciling imported events on the nights a booking left, which is the existing uncover rule (DEC-003) applied to a move instead of a cancellation.

**Card payments — paid but unavailable.** The card is charged in the browser before `POST /api/bookings` runs, so a paid request can still find the dates gone, at the first availability check or at the locked re-check. When the PaymentIntent really is a succeeded payment for that exact stay, [paid-unavailable.ts](../src/lib/paid-unavailable.ts) returns `409 {code: "paid_unavailable", paymentReference}` with a message telling the guest the payment went through, no booking was made, and not to pay again; writes one `AdminLog` row (`target: stripe-{intent id}`); and sends one alert email to `customerservice@haveninlipa.com` with the reference, amount, guest contact and stay. It is once per payment — a retried request gets the same answer and no second alert. **Nothing is refunded or re-charged automatically.** Before the lock, the second of two racing card bookings was saved as a double booking; before this module, a paid request refused at the first check left no record at all beyond the 10-minute checkout-abandonment alert.

### Reactivating a cancelled booking

`PUT /api/admin/bookings/[id]` is unchanged except for one transition: from a non-blocking status (cancelled) to a blocking one (pending/confirmed). That claims nights again, so it refreshes the feed, takes the inventory lock, runs `getInventoryScopeConflicts` (excluding itself), and writes the status and the sibling blocks in one transaction. A conflict returns 409 with the conflict list, the booking stays cancelled, no confirmation email is sent, and the refusal is logged. [BookingStatusSelect.tsx](../src/components/admin/BookingStatusSelect.tsx) shows the reason and snaps back to the saved status. Every other transition (pending → confirmed, anything → cancelled) keeps its previous behaviour and takes no lock.

### Commit — one transaction

Under the lock: lock the `Booking` row → reject if `updatedAt` ≠ `expectedUpdatedAt` (stale edit, 409) → re-validate → re-check availability → update the booking → reconcile its sibling blocks (same upsert-then-cancel order as elsewhere) → re-reconcile imported events on the nights the booking left (they may have been echo-suppressed, DEC-003) → reconcile unsent scheduled messages → write the `AdminLog` entry. All of it commits or rolls back together, so a rejected or failed amendment leaves the booking and every block untouched and there is no window in which new nights are claimed but not yet blocked on siblings.

After the commit, `checkBookingProjection` reads the blocks back. The response is `applied` only if they match; otherwise `applied_propagation_incomplete`, and the UI offers **Retry propagation** (`resync`, idempotent).

### Price — preserved, never recalculated

No financial field is written. The review shows a **reference** quote from `computeBookingQuote` (DEC-020) for comparison only. Nothing is charged or refunded, Stripe evidence is not touched, and no `AdditionalCharge` is created (its creation route emails the guest). Re-pricing is rejected (`pricing` other than `"preserve"` → 400): the Owner's first-release policy is to preserve the agreed price and defer re-pricing and financial recording ([DEC-024](HIL_DECISIONS.md)). **Consequence:** after a date change, `nightlyTotal` no longer equals nights × rate, so any per-night figure derived from it (e.g. the confirmation email's "N nights × ₱…" row) is an average.

### Scheduled messages

`ScheduledMessage.sendAt` is precomputed, so `planScheduledMessageAmendment` ([scheduler.ts](../src/lib/scheduler.ts)) reconciles **pending** rows of a confirmed booking: stay-anchored rows are re-timed; templates that no longer apply to the listing are marked `skipped`; templates new to the listing get a row. Sent rows are never changed or re-sent, confirmation-anchored templates are never replayed, and a reminder whose amended time is already past is **held** (`skipped`, with a reason) rather than sent — the review lists these so staff can send by hand. The guest is not notified of an amendment.

**Worker coordination — and its limit.** `flushDueScheduledMessages` now works in two steps per row. `claimScheduledMessage` flips `pending → sending` in one conditional UPDATE that only succeeds if the row still has the send time the worker read. `deliverClaimedScheduledMessage` then re-reads the booking and template **once** and skips the row (booking not confirmed, or template not for the booking's listing), hands it back with its corrected time (stay moved later), or sends it.

| Amendment commits… | Result |
|---|---|
| before the worker's claim | Not sent. The claim fails; the row carries its new time or is withdrawn. If the amendment is still uncommitted, the claim waits on the row lock and then fails |
| after the claim, before the re-read | Not sent early or to the wrong listing: handed back or skipped. The amendment itself could not change the row and reports it as "being sent right now". If the new time is already due, it **is** sent, with amended content |
| after the re-read | **Sent.** Too late to stop. This window is one database read plus the mail hand-off. The body is rendered from a later read, so it may or may not show the amended details |

So the point of no return for an amendment is the claim; the worker's single re-read is a best-effort second chance, not a guarantee. The claim also stops the hourly cron and an inline flush from double-sending. **Behaviour change:** delivery is now at-most-once. A `sending` row older than 15 minutes (a run that died mid-send) is marked `failed` for a human to check, not re-sent; previously such a row stayed `pending` and was sent again. A side effect of the hand-back rule: if a template's offset is edited to a later time after rows were created, a due row is re-timed rather than sent at its old time.

### Messages, customers, iCal

- Thread identity is `bookingId`, and the thread list and header read the booking live, so labels follow the amendment. `GuestMessage` rows store rendered text and are untouched. Templates render at send time, so later sends use the amended data.
- A contact edit moves or merges no message history and does not call `promoteContactMessagesForEmail`. The Customers view groups by email/phone at request time, so the review warns when the new details already belong to another booking.
- `booking-{id}@haveninlipa.com` and the derived-block UIDs depend only on ids, so they survive date and property changes. A moved booking leaves the old listing's feed and appears on the new one under the same UID. **Channels apply this on their next import, not instantly.**

### Audit

The `AdminLog` row (`module: "bookings"`, `target: booking-{id}`, action prefix `Amended booking`) is written inside the transaction and carries actor, reason, before/after snapshots, the reference quote and the propagation counts. The booking page lists these under **Amendment History**.

### Tests

- **Unit, in CI (`npm test`, three timezones):** rules, allowlist, DST/Manila boundaries, exclusion logic, message planning, route authorization (mocked), and the rendered Edit → Review → Save flow in jsdom.
- **Database-backed, local only (`npm run test:db`):** real Prisma, row locks and transactions against a disposable local MySQL/MariaDB — concurrency races (with an unlocked control that double-books), rollback and retry, same-group / cross-group / ungrouped moves, echo re-propagation, iCal feeds, permissions on real rows, the amendment-versus-reminder race in each order, protected reactivation, and the paid-but-unavailable card path (Stripe mocked). [vitest.db.config.ts](../vitest.db.config.ts) refuses any non-loopback host, because Prisma otherwise falls back to `.env`, which points at production.
- **Owner acceptance (2026-10-01):** passed in a browser on `dev.haveninlipa.com` against the dev database.
- **Not covered by any automated test:** a real channel's import of the changed feed; the locking code under real production load.

---

## Instant Booking Modes & Booking Requests

> Live on production since 2026-10-13 (PR #78, `206dbde`); all listings On. Decision record: [DEC-028](HIL_DECISIONS.md). Feature brief: [docs/claude/HIL_FEAT_Instant_Booking_Modes_Trusted_Guests.md](claude/HIL_FEAT_Instant_Booking_Modes_Trusted_Guests.md).

**Setting.** `Property.instantBookingMode` (`on` default / `off` / `auto`), edited in Admin → Edit Property → Booking Settings (On/Off only; `auto` is stored but not offered). Rule: `assertInstantBooking` in [src/lib/booking-policy.ts](../src/lib/booking-policy.ts). Loaded with the advance-notice policy by `loadBookingRules` ([src/lib/booking-policy-db.ts](../src/lib/booking-policy-db.ts)).

**Statuses** ([src/lib/booking-status.ts](../src/lib/booking-status.ts)).

| Status | Meaning | Holds dates |
|---|---|---|
| `requested` | Guest asked; waiting for the Owner | No |
| `approved` | Owner said yes; payment link sent | No |
| `pending` | GCash/BPI payment submitted; awaiting verification | Yes |
| `confirmed` | Paid and verified | Yes |
| `declined` / `expired` | Final | No |
| `cancelled` | Cancelled by an admin | No |

`adminStatusChoices` lists what `PUT /api/admin/bookings/[id]` accepts: pending ↔ confirmed ↔ cancelled as before, and approved → cancelled. Anything else is 409 `invalid_transition`.

**Request path.**
1. `POST /api/bookings` on an Off listing saves `requested` via `createBookingRequest` ([src/lib/booking-requests.ts](../src/lib/booking-requests.ts)): server quote without card fee, `requestExpiresAt`, no lock, no hold. Advance notice and availability are checked first. A repeat of the same open request returns the existing row. The form sends `intent: "request"`; on a listing that is now On this is refused with `instant_booking`.
2. `POST /api/admin/bookings/[id]/request` `{ action: "approve" | "decline", note? }` — `checkPermission("bookings")`. Approve refreshes the channel feed, re-checks availability (`getInventoryScopeConflicts`), sets `paymentToken` and `paymentLinkExpiresAt`, emails the link. Every status change is a conditional `updateMany` on the current status.
3. Guest opens `/pay/booking/[token]` ([page](../src/app/pay/booking/[token]/page.tsx), [client](../src/components/booking/BookingPaymentClient.tsx)). The page re-checks availability before offering payment.
4. `POST /api/bookings/pay/[token]` → `submitBookingPayment` ([src/lib/booking-payment.ts](../src/lib/booking-payment.ts)). Under `withInventoryLock`: re-check, then approved → `pending` (GCash/BPI) or `confirmed` (card, after `verifyPaymentIntent` against `bookingPaymentIntentMetadata`), and sibling blocks in the same transaction. Card total = stored total + 6%; `totalPrice` and `stripeFee` are updated then.
5. Cron `/api/cron/booking-requests` (Vercel Cron, every 5 min) → `processBookingRequests`: expires stale `requested` and `approved` rows, and sends the one-time unverified-payment alert (`paymentSubmittedAt` older than 24 h, `holdAlertedAt` null).

**Expiry.** `cappedExpiry` = 24 hours, or `bookingDeadlineFor(checkIn, policy)` if sooner.

**Correct, then approve.** `classifyStayPhase` has phases `request` (all fields editable, total re-quoted: `FinancialReview.mode = "requote"`), `approved` and `closed` (not editable). See Booking Amendments above for everything else.

**Emails** ([src/lib/booking-request-emails.ts](../src/lib/booking-request-emails.ts)): request received (guest, admin), approved with link, declined, expired, payment received and being verified, confirmed (card), unverified-payment alert, dates-taken alert. Builders are pure and escape guest text.

**Gotchas.**
- A listing switched On → Off while a guest is paying: `/api/bookings` still takes a card reference (verified as usual) or a checkout attempt under 2 hours old as an instant booking.
- A verified card payment is honoured slightly past the link's expiry while the booking is still `approved`. The card intent itself is refused strictly after expiry.
- The payment-link page creates no `CheckoutAttempt`: the abandonment job would match the existing booking and never alert.
- A GCash/BPI guest who loses the race leaves the request `approved` until its link expires; `AdminLog` target `booking-payment-unavailable-<id>` keeps the alert to one.
- `redactPageLocation` ([src/lib/analytics-config.ts](../src/lib/analytics-config.ts)) must cover any new `/pay/...` route that carries a token.

**Tests.** `booking-requests.test.ts`, `booking-payment.test.ts`, additions to `booking-policy-routes.test.ts`, `booking-amendment.test.ts`, `booking-settings-admin-route.test.ts`, `booking-status-select-render.test.ts`; real-database cases (races, sibling blocks, whole path) in `db/booking-amendment.dbtest.ts`. Not covered by an automated test: the booking form's request screens and the card form in a browser.

---

## Dynamic Pricing System

The pricing engine (`src/lib/pricing.ts`) computes nightly rates with the following priority:

1. **Date override** — a specific date has a custom rate (e.g. holiday pricing)
2. **Weekend/weekday rule** — Friday and Saturday are weekends; all other days are weekdays
3. **Default rate** — falls back to the property's `pricePerNight`

Rates are managed per property via the admin panel at `/admin/properties/[id]/rates`. The booking flow fetches rates via `/api/rates/[slug]` and shows an itemized daily breakdown. Confirmation emails include the nightly breakdown when rates vary.

**Stripe fee:** 6% of the nightly total is added for Stripe payments (`STRIPE_FEE_RATE = 0.06`).

### `pricing-core.ts` — the client-shareable split (2026-08-08, `0c0133e`)

[src/lib/pricing-core.ts](../src/lib/pricing-core.ts) holds the Prisma-free pure
math (`STRIPE_FEE_RATE`, `DailyRateEntry`, `sumDailyRates`, `calcStripeFee`,
`calcExtraGuestFee`) so client components can import it without dragging in
Prisma. [pricing.ts](../src/lib/pricing.ts) re-exports all of it and keeps the
server-only `getDailyRates` / `isPricingComplete`.

> Note `BookingForm.tsx` still re-implements the extra-guest fee inline rather
> than importing `calcExtraGuestFee`. The server remains authoritative, so a
> divergence affects display only — but this is a live duplication worth
> collapsing.

### Booking friction reduction (2026-08-08, `0c0133e`)

Aimed at surprise-fee anxiety and drop-off between the property page and `/book`.

- **Itemized fee breakdown** — `buildFeeBreakdown` / `buildFeeFootnote` in
  [occupancy.ts](../src/lib/occupancy.ts), rendered by
  [FeeBreakdown.tsx](../src/components/ui/FeeBreakdown.tsx). The total never
  arrives unexplained.
- **Sticky booking bar** —
  [StickyBookingBar.tsx](../src/components/ui/StickyBookingBar.tsx) on the
  property page. Scrolls to the booking widget rather than navigating (relevant
  to the capture-phase analytics listener above).
- **Occupancy notes** — `buildOccupancyNote` states plainly who the nightly rate
  covers and when the extra-guest fee applies.
- **Vague-charge prose** — `sanitizeChargeProse` / `normalizePricingProse` rewrite
  known stock phrases ("additional charges may apply") in admin free-text at
  render time, so the public site is safe even when the DB rows are not. The
  free-text fields (`propertyRules`, `pricingNotes`, `heroSummary`,
  `description`, `propertyFaqs`) live only in the live DB and are never seeded
  from the repo.
  [scripts/audit-vague-charges.ts](../scripts/audit-vague-charges.ts) is a
  **read-only** report of rows still needing a manual admin edit — it also flags
  contradictory pricing configs. Writes nothing:
  ```
  npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-vague-charges.ts
  ```
- **Guest count survives the hop** — the count chosen on the property card is
  carried into `/book` via `initialGuests`, so the quote the guest saw is the
  quote the form opens with.
- Test coverage: [src/lib/__tests__/occupancy.test.ts](../src/lib/__tests__/occupancy.test.ts).

### Calendar-date rendering (2026-06-18, `c44b5d0`)

Stay dates (check-in / check-out and each per-night breakdown row) are **calendar dates, not instants** — "Jun 19" means the night of the 19th wherever the viewer sits. They are stored / serialized anchored at **UTC midnight** (a date-input value `"2026-06-19"` → `new Date("2026-06-19")` → `2026-06-19T00:00:00Z`, and `getDailyRates` emits `YYYY-MM-DD` strings via `toISOString()`).

The bug: every render site formatted them with `new Date(...).toLocaleDateString(...)`, which converts UTC-midnight to the **viewer's local timezone**. For anyone behind UTC (e.g. a US-based guest or the Chicago-based host), the date shifted one day earlier — a 6/19→6/22 booking showed nights labelled "Jun 18 / 19 / 20". **Rates and totals were always correct** (each row's rate travels with its array entry); only the date *label* was wrong. This is purely a display fix.

- **Helper:** `formatStayDate(d, opts)` in [src/lib/dates.ts](../src/lib/dates.ts) — accepts a `YYYY-MM-DD` string or a UTC-midnight `Date` and formats with `{ timeZone: "UTC", ...opts }`, so the calendar date is stable on any runtime (US browser, Vercel UTC server, local dev).
- **Routed through it:** booking form check-in/out summary + nightly breakdown on both steps ([BookingForm.tsx](../src/components/booking/BookingForm.tsx)); the booking-submitted acknowledgment email + its breakdown rows ([bookings/route.ts](../src/app/api/bookings/route.ts)); the admin-confirmation email ([admin/bookings/[id]/route.ts](../src/app/api/admin/bookings/[id]/route.ts)); the shared email templates' `fmtDate`/`fmtShortDate` ([templates.ts](../src/lib/templates.ts)); and the admin booking list / dashboard / unmatched-inbound views (compact opts to preserve their terse table format).
- **Deliberately NOT changed:** `createdAt` timestamps (booking/message creation) stay on local-time `toLocaleDateString()` — those are genuine instants, where local conversion is the *correct* behavior.
- **Server hardening:** `getDailyRates` now uses `getUTCDay()` / `setUTCDate()` so weekend detection (Fri/Sat) matches the UTC date string regardless of the runtime timezone. No-op on Vercel (already UTC); fixes a latent skew if the rate logic ever runs in a non-UTC context (e.g. local dev).

### Extra guest fee (2026-06-14, `df91988`)

Optional per-property fee charged per extra guest, per night, once a booking exceeds a threshold — mirroring Airbnb's "extra guest fee".

- **Config:** `Property.includedGuests` (guests included before the fee) + `Property.extraGuestFeePerNight` (₱/extra guest/night; **0 = disabled**, the default for all existing properties). Set on the admin Rates page ([PropertyRatesClient.tsx](../src/app/admin/properties/[id]/rates/PropertyRatesClient.tsx) "Extra Guest Fee" card → `PUT /api/admin/properties/[id]`, validated `>= 0`).
- **Helper:** `calcExtraGuestFee(guests, includedGuests, feePerNight, nights)` in [src/lib/pricing.ts](../src/lib/pricing.ts) = `max(0, guests − includedGuests) × feePerNight × nights`; returns 0 when disabled/within threshold.
- **Composition (server-authoritative, [bookings/route.ts](../src/app/api/bookings/route.ts)):** recomputed from the property's own fields (client total never trusted). Promo **discounts the nightly base only**; the fee is added on top; Stripe's 6% applies to `nightly + fee − discount`. Stored in `Booking.extraGuestFee` and itemized in the booking form (both steps) and **all** confirmation emails (shared `priceBreakdownHtml`, so line items reconcile to the total).
- **Capacity cap (same commit):** `POST /api/bookings` now hard-rejects (`400`) when `guests > Property.maxGuests` — the booking-form dropdown already capped the UI, this is the server backstop. `guests` of 0/missing still coerces to 1 (existing `Number(guests) || 1`).
- **Public surfacing (2026-07-04, `b893f9c`):** the fee was previously only visible inside the booking flow. Now shared across all listings:
  - **Property detail page** ([properties/[slug]/page.tsx](../src/app/properties/[slug]/page.tsx)) renders a factual occupancy line just below the stats bar via `buildOccupancyNote()` in [src/lib/occupancy.ts](../src/lib/occupancy.ts) — reads the same `maxGuests`/`includedGuests`/`extraGuestFeePerNight` fields so it can never drift from `calcExtraGuestFee`. Copy: *"Sleeps up to {max}. The nightly rate covers {included} guests — additional guests are ₱{fee}/guest per night. Full breakdown shown at booking; no hidden fees."* Fallback when fee `0` **or** `includedGuests >= maxGuests`: *"Sleeps up to {max}. All guests included in the nightly rate."* (`extraGuestFeeApplies()` predicate). Peso thousands-separated, guest/guests pluralized. Server-rendered (crawlable).
  - **`PropertyCard` variants (2026-08-16, `9a8e47c`).** The card takes a `variant` prop: `teaser` (**default** — the homepage grid, unchanged) and `index` (the `/properties` inventory page: name linked to the property page, a `Sleeps up to N · N bedrooms · N baths` spec line, a "rate covers N" note, the normalised `tagline`, and a second **Book now** CTA so `book_click` is measurable there too). The "From" logic below is shared by both variants.
  - **Homepage card** ([PropertyCard.tsx](../src/components/ui/PropertyCard.tsx)) subtitle shows `{type} · Sleeps up to {maxGuests}` (max, not the included threshold); no fee text on the card. Price prefixes **"From"** only when `extraGuestFeeApplies` is true (fee `> 0` **and** `maxGuests > includedGuests`) — flat-pricing listings show the plain rate with no "From", so no implied increase that can't happen (`57ab099`).
  - **Fee prose is number-free / drift-proof:** the fee amount is **never** hardcoded in authored prose. A one-time DB migration (2026-07-04) scrubbed the literal `₱400` out of the 3 Mickey units' `heroSummary`, `bestForSegments`, `housePolicies` notes, and `propertyFaqs` → *"an extra per-guest fee"* / *"charged an extra per-night fee"*. The actual ₱ figure lives **only** in the dynamic occupancy line + booking breakdown (both read the live DB fee), so changing the fee in admin needs **no** prose edit. Any new listing should author prose the same way (no fee number). *(A `{{extraGuestFee}}` token-substitution approach was built and reverted in favor of number-free prose.)*
  - **Base rate + included-guest count are normalized to the DB at render (`2d9fa1f`, `9e62bb6`):** `normalizePricingProse()` in [src/lib/occupancy.ts](../src/lib/occupancy.ts) rewrites *"₱N per night"* / *"₱N/night"* → live `pricePerNight` and *"covers N guests"* → `includedGuests`, in place (every other number/text untouched). Applied to `heroSummary` + `pricingNotes.rate` on the property page, the VacationRental `description` in [property-schema.ts](../src/lib/property-schema.ts), and the page metadata (`generateMetadata` → meta/OG/Twitter description). So the base rate can't drift from `pricePerNight` on any surface. The chatbot ([get-chat-tree.ts](../src/lib/chat/get-chat-tree.ts)) already builds *"Starting at ₱{pricePerNight}"* from the DB. Cozy 1BR's stored prose (heroSummary, pricingNotes.rate, seoDescription) was also corrected ₱2,000 → ₱1,800 so the DB itself is truthful.
  - **Grammar (`57ab099`):** corrected *"Additional guests are charge extra per night"* → *"are charged"* in Cozy 1BR + Spacious 2BR `propertyRules` (house-rules text, per-listing DB content — not a template; the 3 Mickey units already read *"is charged"*).

### Advertised "From" pricing (2026-06-11)

`Property.pricePerNight` is the weekday/**base** rate. Because `isPricingComplete()` ([src/lib/pricing.ts](../src/lib/pricing.ts)) gates public visibility/booking on a base rate **and** a `rateType="weekend"` row both existing, every price a guest sees is a **minimum**, not a flat rate. All guest-facing advertised nightly rates are therefore prefixed **"From"**:

- [src/components/ui/PropertyCard.tsx](../src/components/ui/PropertyCard.tsx) — listing cards
- [src/components/ui/BookingCard.tsx](../src/components/ui/BookingCard.tsx) — detail-page booking card (desktop)
- [src/app/properties/[slug]/page.tsx](../src/app/properties/[slug]/page.tsx) — "Pricing & payment → Rate:" line (hero already used "Starting from")
- [src/components/sections/Properties.tsx](../src/components/sections/Properties.tsx) — static fallback cards (shown only when DB is empty)
- `heroSummary` blurb above "About this property" — seed source updated in [prisma/seed-property-seo.ts](../prisma/seed-property-seo.ts); live DB rows patched directly (only the `heroSummary` field, to avoid clobbering the admin-editable `description`)

**Not touched** (exact/computed, not advertised minimums): all BookingForm totals/itemized lines, BookingCard computed-total lines, confirmation emails, and admin pages. (JSON-LD pricing note from this commit is superseded — as of 2026-06-25 the property JSON-LD no longer emits `makesOffer`/`Offer`; price appears only as the text `priceRange`. See [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md).) Chat widget already said "Starting at". `seoDescription` meta still shows a flat `₱X,XXX/night` — left as-is, optional follow-up.

---

## Payment Verification (Server-Side Pricing & Stripe PaymentIntent Checks)

> **Added 2026-09-27** — [PR #23](https://github.com/cedcas/CedCasProperties/pull/23), commit `fb3933b`, merge `480053f` (merged and deployed to production 2026-09-27 18:45 CT). Decision: [DEC-020](HIL_DECISIONS.md). **No schema change.**

**The gap it closed.** Before PR #23, `POST /api/bookings` auto-confirmed a card booking whenever the browser sent *any* `stripePaymentIntentId` string, without asking Stripe; `POST /api/stripe/payment-intent` charged whatever `amount`/`currency`/`metadata` the client sent; and percentage/fixed promo discounts were computed from the client-sent `nightlyTotal`/`totalPrice`. The rule now: **the client says what it wants to pay for, never how much** — every peso is computed on the server, and a booking or charge is marked paid only after the retrieved PaymentIntent is verified against those server numbers.

**Server-side pricing — [src/lib/booking-quote.ts](../src/lib/booking-quote.ts).** `computeBookingQuote({ propertyId, checkIn, checkOut, guests, discountCode, paymentMethod })` is the single price computation behind both the PaymentIntent amount and the booking record. It holds the logic that previously lived inline in `/api/bookings` (UTC-midnight date parsing and validation, property lookup, guest-capacity guard, unpriced-property guard, weekend-rate-required guard, `getDailyRates`/`sumDailyRates`, extra-guest fee via `calcExtraGuestFee`), and the promo discount now uses the **server** nightly total as its base. Stripe's 6% (`calcStripeFee`) is added only when `paymentMethod === "stripe"`. It returns `{ ok: true, quote }` (nightlyTotal, extraGuestFee, discountCode, discountAmount, stripeFee, total, …) or `{ ok: false, status, error }`. Availability is deliberately **not** checked here — callers pick their own sync policy.

**PaymentIntent verification — [src/lib/stripe-payment.ts](../src/lib/stripe-payment.ts).** Pure helpers (no Prisma, no Stripe client, no network — unit-tested directly):
- `STRIPE_CURRENCY = "php"`; `toStripeAmount(total)` = `Math.round(total * 100)` (centavos).
- `bookingIntentMetadata(...)` → `{ kind: "booking", propertyId, checkIn, checkOut (UTC date keys), guests, discountCode, amount }`; `chargeIntentMetadata(...)` → `{ kind: "additional_charge", chargeId, token, amount }`. One builder per kind is used both when the intent is created and when it is verified, so the two sides can't drift.
- `verifyPaymentIntent(pi, { amount, metadata })` requires, in order: `status === "succeeded"` (else **402** — with a distinct "still processing" message for `processing`); currency PHP (else **400**); `amount` **and** `amount_received` equal to the server-computed amount (else **400**); every expected metadata key/value present on the intent (else **400**).
- **Not reused:** checked in the routes (needs Prisma) — an intent already stored on another booking/charge → **409**.

**Where it is used.**
- **`POST /api/stripe/payment-intent`** — body is either a booking request `{ propertyId, checkIn, checkOut, guests, discountCode }` or `{ kind: "additional_charge", token }`. Bookings: `computeBookingQuote(..., paymentMethod: "stripe")`, then an early `assertPropertyAvailable` (`syncPolicy: "availability"`) so a conflict fails *before* the guest pays (the authoritative availability check still runs in `/api/bookings`). Charges: looked up by token (404 unknown; 409 if already paid or cancelled), card total = amount + `calcStripeFee`. The intent is created with the server amount, `currency: "php"` and the server metadata; the response adds `total` (the server-authoritative card total in PHP). `BookingForm.tsx` and `ChargePaymentClient.tsx` no longer send an amount; `BookingForm` also clears the client secret/intent id when the guest goes back to edit details, so an intent priced for old details can't be confirmed.
- **`POST /api/bookings`** — client `totalPrice`/`nightlyTotal`/`discountAmount` are no longer read; the route re-runs `computeBookingQuote`. For `paymentMethod === "stripe"`: missing intent id → 400; no `STRIPE_SECRET_KEY` → 503; `paymentIntents.retrieve` failure → 400 ("Could not verify payment"); then `verifyPaymentIntent` against `toStripeAmount(total)` + `bookingIntentMetadata(...)`; then the reuse check (`Booking.stripePaymentIntentId` already used → 409). Only a verified intent sets `stripePaymentIntentId` and auto-confirms. **GCash/BPI bookings** skip Stripe entirely, stay `pending` for manual admin verification with the server-computed price, and any intent id they send is dropped.
- **`POST /api/charges/[token]/pay`** (the `/pay/<token>` page's card path) — already retrieved the intent and checked `succeeded`; now also runs `verifyPaymentIntent` against `toStripeAmount(amount + calcStripeFee(amount))` + `chargeIntentMetadata(...)` and rejects an intent already stored on a different `AdditionalCharge` (409).

**Tests.** `src/lib/__tests__/stripe-payment.test.ts` (pure verifier) and `src/lib/__tests__/stripe-payment-routes.test.ts` (routes with mocked Stripe/Prisma). PR #23 changed 9 files, +952/−130.

**Open follow-ups (not part of PR #23).**
- **Unique constraint on `stripePaymentIntentId`** — the reuse check is a read-then-insert, so two concurrent requests with the same intent could both pass it; only a DB unique constraint closes that fully. Schema change → **needs Cedric's approval**, and it would reach production as a reviewed migration applied by an operator before the code is merged (see [Build & Deployment](#build--deployment)).
- **Stripe webhook** — there is still no webhook; a card payment that succeeds but whose booking request never arrives (or fails verification) leaves money in Stripe with no booking. Until then, reconcile in the Stripe dashboard.
- **Weekend-rate guard uses server-local time** — the "weekend rate required" loop in `computeBookingQuote` (moved verbatim from `/api/bookings`) calls `Date.getDay()` on UTC-midnight dates, i.e. server-local time rather than UTC. Harmless on Vercel (runs in UTC); would misclassify days on a server/dev machine west of UTC.

---

## Checkout-Abandonment Alerts

*(Added 2026-09-28, PR #32 / `cbfd123` — [DEC-022](HIL_DECISIONS.md).)* A GCash/BPI booking row is only written when the guest taps **"I Paid"**, so a guest who pays and gets distracted leaves the Owner with money, no booking, and **no held dates**. Trigger case: booking #140 — GCash paid 11:15 AM PHT, "I Paid" tapped 12:08 PM PHT (53 min later).

**Flow**
1. **Payment screen** — [BookingForm.tsx](../src/components/booking/BookingForm.tsx) runs an effect on `[step, paymentMethod]`: whenever `step === "payment"` it fires GA4 `add_payment_info` and `POST`s [/api/checkout-attempts](../src/app/api/checkout-attempts/route.ts). The first call returns an opaque token (kept in a ref); later calls on the same page (method switch, back-to-details and return) send it back and **update** that row. Best-effort — failures are swallowed, never shown, never block payment.
2. **Server pricing** — the endpoint re-runs `computeBookingQuote` (same as `/api/bookings`), so a row always refers to a real property/dates/guest count with a server total; client amounts are never stored. A token whose attempt is already linked or alerted is not reused — a fresh attempt is created.
3. **Link** — `/api/bookings` accepts `checkoutAttemptToken` and sets `bookingId` after creating the booking (try/catch — never fails a booking).
4. **Cron** — [processAbandonedCheckouts()](../src/lib/checkout-abandonment.ts) via `/api/cron/checkout-abandonment`: candidates are `bookingId = null`, `alertedAt = null`, `updatedAt` between 24 h and **10 min** ago. Backstop match: a Booking with the same property + email + check-in created since the attempt (−5 min slack) → link, no alert. The rest: **one alert per guest/stay** (key = property | lower-cased email | check-in date; newest attempt wins, others are marked), and a key alerted in the last 24 h is suppressed. Each alert is **claimed** (`updateMany … alertedAt: null → now`) before sending, so overlapping triggers can't double-send; a failed send releases the claim for the next run. Rows older than 30 days are deleted every run.

**Gotchas**
- Alert latency = 10 min of inactivity + up to one 5-min cron tick. `updatedAt` is the clock, so switching payment method restarts it.
- A guest who is simply slow (still paying at minute 10) produces an alert followed by the normal New Booking email — expected; the alert copy tells the Owner to check admin.
- A late booking after an alert still links (`bookingId` is set whenever it is null), but no "resolved" email is sent.
- Public endpoint with no rate limiting (none exists site-wide): every row needs a real property, valid dates, email and phone, and alerts dedupe per guest/stay — but a determined script could still generate alert emails.
- *(Historical — no longer applies since builds stopped pushing the schema, DEC-026.)* Once this table exists, a build from any branch **without** `CheckoutAttempt` in `schema.prisma` against the same DB makes the build's `prisma db push` try to drop it → Prisma refuses (data loss) → **build fails**. Keep `dev` merged up with `main` (done 2026-09-28: `dev` fast-forwarded to `cbfd123`).
- Tests: [checkout-abandonment.test.ts](../src/lib/__tests__/checkout-abandonment.test.ts) (selection/dedupe, email escaping + both timezones, a cron pass over mocked Prisma, the endpoint, the booking link), run under UTC/Chicago/Manila.

---

## Discount Code System

| Field | Description |
|---|---|
| `code` | Unique promo code string |
| `type` | `"fixed"` (₱ amount off) or `"percentage"` (0–100% off) |
| `value` | Discount amount or percentage |
| `isActive` | Toggleable by admin |
| `usageCount` | Incremented after each successful booking |
| `maxUses` | Optional limit; `null` = unlimited |
| `propertyIds` | Optional JSON int array (added 2026-06-05). `null`/empty = all properties; otherwise the code only redeems on those Property ids |
| `notes` | Optional free-form admin notes (`TEXT`, nullable, added 2026-06-25). Editable anytime from the admin table; not surfaced to guests |

Guests enter a code during checkout; it's validated via `/api/discount-codes/validate`. The discount is applied to the nightly total before Stripe fees (if applicable). Usage count is incremented when the booking is created.

**Editable notes (added 2026-06-25, `e5c0749`).** Each code carries free-form `notes` the owner can continuously edit — campaign name, who it's for, when to retire it, etc. The create form has an optional Notes textarea, and every row in the table has a sticky-note toggle (gold when notes exist, faint when empty) that expands an inline editor with a Save button + "Saved ✓" indicator, all in [DiscountCodesClient.tsx](../src/app/admin/discount-codes/DiscountCodesClient.tsx). Saved via `PATCH /api/admin/discount-codes/[id]`, which was **hardened the same session** — it formerly spread the raw request JSON into `prisma.discountCode.update`, and now whitelists only `isActive` + `notes`, so a crafted request can no longer overwrite `code`, `usageCount`, `value`, etc.

**Property scoping (added 2026-06-05).** Each code may target ALL properties (default — existing codes have `propertyIds = null` and stay global) or a specific single/multiple set. The shared rule lives in [src/lib/promo.ts](../src/lib/promo.ts) (`scopeAppliesToProperty(propertyIds, propertyId)` — generalized 2026-06-29, with `codeAppliesToProperty` kept as a back-compat alias — plus `parsePropertyIds(json)`) and is reused everywhere a record is scoped to properties (DiscountCode **and** QuickReply). Admin: the create form in [DiscountCodesClient.tsx](../src/app/admin/discount-codes/DiscountCodesClient.tsx) has an **All / Specific properties** toggle (specific reveals selectable property chips), the table shows an **Applies To** column, and [the page](../src/app/admin/discount-codes/page.tsx) feeds it the active-property list. The create API ([admin/discount-codes/route.ts](../src/app/api/admin/discount-codes/route.ts)) validates the chosen ids exist before saving. **Two-layer enforcement:** the validate route ([discount-codes/validate/route.ts](../src/app/api/discount-codes/validate/route.ts)) accepts `propertyId` and returns `404 "Invalid promo code"` for an off-scope code (does not leak that it exists for another listing); [BookingForm.tsx](../src/components/booking/BookingForm.tsx) sends `propertyId` when applying; and the booking-create endpoint ([bookings/route.ts](../src/app/api/bookings/route.ts)) re-checks scope server-side so a hand-crafted request silently drops the discount (no `usageCount` increment).

---

## Additional Charges (Pay-by-Link)

**Added 2026-06-28 (`8d5fed3`).** A lightweight way for the owner/caretakers to bill a guest **after booking** for early check-in, late check-out, extra cleaning, damages or incidentals — without Airbnb's "Resolution Center." The guest pays through a public link that mirrors the booking payment (GCash / BPI / card). Backed by the **AdditionalCharge** model (see Models).

**Status lifecycle:** `pending` (created, link live) → guest taps "I've Paid" on a QR → `awaiting_verification` (admin confirms receipt) → `paid`. Card success goes straight to `paid` (Stripe PaymentIntent verified server-side). Admin can move any non-paid charge to `cancelled` (link then shows a "no longer active" card).

**Admin (on the booking detail page — no separate screen).** [AdditionalChargesManager.tsx](../src/components/admin/AdditionalChargesManager.tsx) renders an "Additional Charges" section inside [admin/bookings/[id]/page.tsx](../src/app/admin/bookings/%5Bid%5D/page.tsx): a "Charge type" selector (**Custom charge** / **Early Check-In** / **Late Checkout**) above the add form, and a per-charge list with **Mark paid · Cancel · Resend · Copy link · Copy SMS · Delete**. Custom charge shows the original reason + amount fields; the two hourly fee types swap those for a whole-hours input with a live description/rate/total preview before submit. APIs follow the discount-codes pattern (`auth()` guard, whitelisted PATCH, `logAction` audit): `POST /api/admin/charges` (create + auto-email guest) and `PATCH/DELETE /api/admin/charges/[id]` (PATCH whitelists only `status` → paid/cancelled and `resend: true`).

**Early Check-In / Late Checkout (added 2026-09-06, DEC-014).** The published ₱200/hour early-check-in and late-checkout fee is a specialized creation mode of the same `AdditionalCharge` model and routes — no new columns, no parallel fee system. `POST /api/admin/charges` accepts either the original `{ description, amount }` body or `{ feeType: "early_checkin" | "late_checkout", hours }`; when `feeType` is present the server — never the client — computes `amount = hours × 200` and builds the `description` string via [src/lib/hourly-fee.ts](../src/lib/hourly-fee.ts), the single source of truth for the rate, the two labels, and whole-hours validation (`isValidHours` rejects zero, negative, decimal, and non-numeric values; there is no fractional-quantity precedent anywhere else in this codebase's pricing logic, so hours are whole numbers only). Everything past that point — token, guest email, admin log, PATCH/DELETE, the `/pay/[token]` guest payment page, the status-based duplicate-payment guard — is the unmodified path every other additional charge already uses. This is an admin-assessed charge for an approved accommodation request; nothing auto-imposes it from check-in/checkout timestamps, and there is no guest self-service purchase flow for it.

**Guest (public, no auth).** [pay/[token]/page.tsx](../src/app/pay/%5Btoken%5D/page.tsx) is `force-dynamic`, `noindex`, and branches on status (payable / awaiting-verification / paid / cancelled / 404). [ChargePaymentClient.tsx](../src/components/charge/ChargePaymentClient.tsx) reuses the booking **PaymentQR** component (GCash/BPI) and Stripe **Elements** (card). `POST /api/charges/[token]/pay` handles both: GCash/BPI → `awaiting_verification` + admin verify email; card → retrieves the PaymentIntent, requires `status === "succeeded"`, then marks `paid` and records the 6% fee. The route is public (middleware only guards `/admin/*`).

**Card fee.** Card adds the same **6% surcharge** as bookings (`calcStripeFee` / `STRIPE_FEE_RATE` from [src/lib/pricing.ts](../src/lib/pricing.ts)); GCash/BPI are fee-free. The PaymentIntent is created via the existing [stripe/payment-intent](../src/app/api/stripe/payment-intent/route.ts) route at `amount × 1.06`.

**Notifications & SMS.** Guest-facing emails (the pay-link and the card receipt) go through `sendGuestMessage()` ([src/lib/guestMessages.ts](../src/lib/guestMessages.ts)) so they **thread into the booking's Guest Messages**; admin verify/paid notices are plain `sendEmail()`. **SMS is copy-paste only — no Twilio:** the admin's "Copy SMS" button produces ready-to-paste text via [src/lib/charge-message.ts](../src/lib/charge-message.ts) (`buildChargeSms`, `buildChargeEmail`, `chargeUrl`). No new env vars; reuses Stripe keys + the existing QR files/SRI hashes.

---

## Ambassador Program

**Added 2026-06-26 (`658ea07`); reward tiers revised 2026-08-16 (`2579b6b`).** A referral program: an approved ambassador shares a personal promo code, their audience gets **5% off direct bookings**, and the ambassador earns a cash reward per *completed* stay. Backed by the **Ambassador** model (see Models) — one application per email (`email @unique`), `status` `pending` → `approved` / `rejected`, and a reserved `promoCode` field intended to hold the issued `DiscountCode.code` on approval.

**Public page** — [src/app/ambassadors/page.tsx](../src/app/ambassadors/page.tsx), canonical `/ambassadors`. Hero → why join → how to join → rewards table → payout terms → application form. The enrollment form is [src/components/ambassador/AmbassadorForm.tsx](../src/components/ambassador/AmbassadorForm.tsx) (client), posting to `POST /api/ambassadors` ([route.ts](../src/app/api/ambassadors/route.ts)): validates all required fields **and** `agreedToTerms === true`, stamps `agreedToTermsAt`, returns **409** on a duplicate email (Prisma `P2002`), then emails admin + applicant. Public route — middleware only guards `/admin/*`.

**Admin review** — [src/app/admin/ambassadors/](../src/app/admin/ambassadors/) (page + `AmbassadorsClient.tsx`) lists applications and PATCHes status/notes via [/api/admin/ambassadors/[id]](../src/app/api/admin/ambassadors/%5Bid%5D/route.ts).

**Content lives in one module — [src/lib/ambassador.ts](../src/lib/ambassador.ts).** `REWARD_TIERS`, `AMBASSADOR_GUIDELINES`, `HOW_TO_JOIN`, `WHY_JOIN` are exported constants consumed by both the landing page and the form's terms checkbox, deliberately, so the tier table a visitor reads and the guidelines they legally agree to can never drift apart. **Edit the tiers here, not in the page.**

### Reward tiers (revised 2026-08-16, `2579b6b`)

| Level | Annual completed bookings (Jan 1 – Dec 31) | Reward / booking |
|---|---|---|
| Bronze | 1 – 5 | ₱200 |
| Silver | 6 – 10 | ₱300 |
| Gold | 11 – 15 | ₱400 |
| Platinum | 16+ | ₱500 |

Replaces the launch tiers (1–10 ₱200 / 11–20 ₱400 / 21–30 ₱600 / 31+ ₱800) — **bands tightened and the top rate cut**, so a given booking count now reaches a higher badge for less money. Two things changed beyond the numbers:

- **Tiers are now explicitly annual and reset each January.** The table header carries the `(January 1 – December 31)` qualifier and a matching line was added to `AMBASSADOR_GUIDELINES` — since guidelines back the form's consent checkbox, the reset rule is something applicants actually agree to rather than page copy alone.
- **Rewards are cumulative across tiers, not retroactive.** The worked example on the page (12 bookings → **₱3,300**) is 5×₱200 + 5×₱300 + 2×₱400. Reaching Gold does not re-rate earlier bookings. Any change to the tier table must have this example recomputed — it is prose, not derived, and there is no test covering it.

`page.tsx` also carries a `₱200–₱500` range in its `metadata.description`; it feeds search snippets and is a third hand-maintained copy of the numbers.

**Payouts are entirely manual.** Nothing in the codebase counts completed bookings per ambassador, assigns a level, or computes a reward — no cron, no admin report, no `promoCode` → `Booking` join in use. `promoCode` on the model is *reserved*, not wired. The tier table is marketing copy the owner honours by hand; treat any "the system tracks this" assumption as false.

---

## Role-Based Access Control

| Role | Access |
|---|---|
| **Admin** | Full access to all modules |
| **Manager** | Access limited to modules granted via `AdminPermission` |

### Permission Modules
- `properties` — create, edit, delete property listings
- `bookings` — view and manage booking statuses
- `messages` — view and manage contact messages
- `testimonials` — manage property testimonials

**Enforcement gap (found 2026-10-01).** Only `POST /api/admin/bookings/[id]/amend` enforces a module permission server-side (`checkPermission("bookings")` in [admin-permissions.ts](../src/lib/admin-permissions.ts), which re-reads the user from the database on every call). Every other admin API route checks only that a session exists, so a manager can call any of them regardless of their `AdminPermission` row. The JWT carries the role as it was at sign-in, which is why the helper does not trust it.
- `promoCodes` — create and manage discount codes
- `logs` — view audit trail
- `userManagement` — create and manage admin/manager accounts

---

## Public listing helpers (`src/lib/listings.ts`)

Added 2026-08-16 (`9a8e47c` / `6a0da20`) when `/properties` and `/about` both needed the same definitions.

| Export | Purpose |
|---|---|
| `PUBLIC_LISTING_GATE` | `{ isActive: true, pricePerNight: { gt: 0 } }` — the definition of "a listing the public can see". `pricePerNight` of 0 means *not yet configured*; publishing it would put a ₱0 rate on a page, and its `/book` URL redirects back to the property page anyway. |
| `PUBLIC_LISTING_ORDER` | `{ createdAt: "desc" }` — newest first, the order every public surface lists in. |
| `buildShortNames()` | Display names for prose. `Property.name` carries an SEO suffix after a pipe ("Cozy 1BR Haven \| Solar Power•Netflix•Wi-Fi•5 Pax") that reads badly mid-sentence. Returns the first segment, falling back to the second when several listings share the first — which is what keeps the three `Mickey in Lipa` configurations distinguishable. Derived, not hardcoded, so renaming a listing in admin can't leave a stale label on a page. |
| `numberWord()` / `plural()` | "five" for 5; `plural(1, "bedroom")` → "bedroom". |
| `getPublicListings()` / `getPublicListingCount()` | The gated query and count, wrapped in `unstable_cache` with a **1-hour** revalidate and a `public-listings` tag (`c2c5e6b`). Used by `/properties`, `/about`, `/weddings-accommodation` and `/staycation`. **Caching is on the query, not the response**: an App Router page can't set its own `Cache-Control`, and a `next.config.ts` header loses to the framework's no-store on Vercel — see the SEO spec for the full finding. ⚠️ Values round-trip as JSON, so Prisma `Decimal` returns a **string** and `DateTime` an **ISO string** while the TS types still claim `Decimal`/`Date`. Read new fields through `Number(...)` / `JSON.parse(...)`, never off the raw value. |
| `getPublicListingGroups()` | *(2026-08-17, `7fa3421`)* Every `InventoryGroupMember` row as `{ propertyId, inventoryGroupId }`, on the same cache window and `public-listings` tag. Ungated on purpose — membership is joined in memory against whatever the gate returned, so a deactivated listing simply has no row to match. |
| `deriveHouses()` / `totalHouseCapacity()` | *(2026-08-17, `7fa3421`)* Collapse listings into the **physical houses** behind them and sum capacity per house. Pure — no Prisma, no clock — and covered by [listings.test.ts](../src/lib/__tests__/listings.test.ts). |

### Deriving physical capacity from shared inventory (2026-08-17, `7fa3421`)

Five listings are **two houses**: Block 34 (`cozy-1-bedroom` **or** `spacious-2-bedroom`, up to 9) and Block 38 (Mickey `sleeps-7` **or** `sleeps-11` **or** `sleeps-15`, up to 15) — the same two sets as the `InventoryGroup` tables above. Each takes **one booking at a time**, so any public claim about how many people we can host on one date must be summed **per house, not per listing**: **24, not 47**. `/weddings-accommodation` leads with that number.

Two rules the implementation encodes, both of which are easy to get wrong:

- **Membership identifies a house; `InventoryGroup.isActive` does not.** `isActive` gates whether sibling *blocks* propagate — it says nothing about the building. Keying capacity off it would mean a group switched off silently republishes the page as five separate houses claiming 47 guests. A switched-off group is an availability bug, not new inventory.
- **An ungrouped listing is its own house**, which is the correct reading: nothing shares its inventory. Consistent with the rest of the system, where a property in no group behaves exactly as if the feature did not exist.

Ordered largest house first and tie-broken by slug so renders are deterministic. Tested rather than eyeballed because the arithmetic is a promise a couple plans a wedding around, and because Hostinger blocks DB access from laptops **and** CI — the same constraint that shaped `planDerivedBlocks`.

⚠️ **Three older surfaces still inline a byte-identical gate** — the homepage grid ([Properties.tsx](../src/components/sections/Properties.tsx)), the [sitemap](../src/app/sitemap.ts) and the [feed](../src/app/api/properties.json/route.ts). They were deliberately left untouched (each extra file changed is extra deploy risk on a live booking site). **Anything new should import from `listings.ts` rather than adding a fifth copy**, and those three can adopt the constant whenever they're next edited.

## GA4 Analytics Events (gtag.js)

Added 2026-08-08 (`0c0133e`, `d1a98ef`). Running spec and per-event rationale:
[GTAG_Events_ClaudeCode.md](../About%20HIL/GTAG_Events_ClaudeCode.md). Measurement ID
`G-2SV2PXYB7T`, fired on both `haveninlipa.com` and `blog.haveninlipa.com`.
**No GTM.**

### Where GA4 runs — the gate ([DEC-021](HIL_DECISIONS.md), 2026-09-27)

Rules live in one pure, unit-tested module,
[src/lib/analytics-config.ts](../src/lib/analytics-config.ts):

| Rule | Function | Detail |
|---|---|---|
| Production host only | `isAnalyticsHost(hostname)` | Exact-match allowlist `haveninlipa.com`, `www.haveninlipa.com`, checked **in the browser at runtime**. `dev.haveninlipa.com` (a Vercel Preview deployment on a custom domain), `*.vercel.app`, localhost and LAN machine names (e.g. `cpc-m5-mbp-2026`) send nothing. |
| Not a preview build | `resolveAnalyticsContext` | Also requires `NEXT_PUBLIC_VERCEL_ENV !== "preview"`. A secondary check: if Vercel doesn't expose the var it is `undefined` and the hostname rule still decides. |
| Never on admin | `isTrackedPath(pathname)` | `false` for `/admin` and everything under it (incl. `/admin/login`) and `/api/*`. `/administrator`, `/admins` etc. are **not** matched (segment-exact). |
| DebugView opt-in | `readDebugParam` | `?ga_debug=1` turns GA on for the tab (sessionStorage `hil_ga_debug`) on **any** host, with `debug_mode: true` on config and events; `?ga_debug=0` turns it off. Default off. Never enables `/admin`. |

Browser wiring:

- [src/components/Analytics.tsx](../src/components/Analytics.tsx), mounted once in the
  root layout, replaced the old inline `<Script id="gtag-init">`. It renders the gtag.js
  `<Script strategy="lazyOnload">` **only** when the host is allowed and the path is
  tracked, so an `/admin` page load never fetches gtag.js at all. The host decision uses
  `useSyncExternalStore` with a `false` server snapshot — decided in the browser, never at
  build/render time, so the root layout stays static.
- **Client-side navigation:** once gtag.js is loaded on a public page it stays in memory,
  so an SPA hop into `/admin` would otherwise send an enhanced-measurement history
  `page_view`. `syncGaDisable()` sets gtag's official kill switch
  `window['ga-disable-G-2SV2PXYB7T']` from the path **during render** and in a
  `popstate` listener. ⚠️ Gotcha: Next pushes the new URL from a `useInsertionEffect`
  (`HistoryUpdater` in `next/dist/client/components/app-router.js`), which runs before any
  `useLayoutEffect`/`useEffect` — an effect-only toggle would lose that race. A `useEffect`
  re-asserts the committed path after any abandoned render.
- `ensureGtag()` installs the standard `dataLayer` stub (`push(arguments)` — gtag.js needs
  the `Arguments` object, not an array) and queues `js` + `config` once. Events tracked
  before gtag.js arrives now **queue** instead of being dropped (the old helper returned
  early until the library loaded).
- `/pay/[token]` is guest-facing (the charge-payment link emailed to a guest), so it
  stays tracked — but the token is a bearer credential, so `config` overrides
  `page_location` to `…/pay/[token]` (`redactPageLocation`).

### Internal-traffic marker (owner/staff devices)

Any `/admin/*` page other than `/admin/login` can only render for a signed-in user
(middleware redirects the rest), so rendering one sets `localStorage.hil_internal = "1"`
(`isInternalMarkerPath` → `markInternalDevice`). On public pages that device's `config`
carries `traffic_type: "internal"`, and `track()` adds it to every event too (belt and
braces — `config` params apply to the page's hits, and a marker set mid-page is applied
with `gtag('set', …)`). GA is **not** disabled for the device: tagging is reversible and
only takes effect while the GA4 **Internal Traffic** data filter is Active — it is
(Owner-confirmed 2026-10-04, GA4 UI). The filter only drops hits from a *marked* device:
a browser that has not rendered a signed-in admin page since the 2026-09-28 deploy, a
private window, or one with cleared site data is not marked and is still counted. Clear
the marker on a device with `?hil_internal=0`.

**Cookie twin (2026-10-04).** [src/middleware.ts](../src/middleware.ts) also sets a
`hil_internal=1` cookie on every signed-in `/admin` request (`Path=/`, 400 days, renewed
each request, `SameSite=Lax`, not HttpOnly so the gate can read it). `readAnalyticsContext()`
treats the device as internal if **either** the `localStorage` marker or the cookie is
present (`hasInternalCookie` in `analytics-config.ts`); `?hil_internal=0` clears both.
Why: Safari on iOS deletes script-written storage after 7 days without a visit to the
site, so an owner phone that had not opened admin that week lost its tag; a server-set
cookie is not subject to that cap. Still **per browser** — an in-app browser (Google /
Facebook app) needs its own admin sign-in once. Host-only cookie, so it does not cover
`blog.haveninlipa.com`. **Live:** PR #49, merge `17749db`, Production deployment succeeded
2026-10-04 and the served bundle contains the cookie code. The `Set-Cookie` itself was not
observed first-hand (it needs an admin sign-in); the Owner signed in on the phone the same
day.

### The `track()` helper — [src/lib/analytics.ts](../src/lib/analytics.ts)

Every event goes through it. It reads the gate fresh on every call
(`readAnalyticsContext()`) and is a **no-op** when GA is disabled or `window.gtag` is
absent — the booking flow, contact form and click tracker never depend on GA being
there. When enabled it adds `traffic_type: "internal"` (marked device) and/or
`debug_mode: true` (debug opt-in) via `buildEventParams`. The old behaviour — send from
any host, stamp `debug_mode` off `PROD_HOSTS` — is gone: it relied on the Developer
Traffic filter, which was never Active, so dev/preview hits (incl. 4 test
`booking_confirmed` on 2026-08-09) reached the reports.

`window.gtag` and the `ga-disable-*` key are typed in
[src/types/gtag.d.ts](../src/types/gtag.d.ts).

### Events

| Event | Fires on | Key event | Params |
|---|---|---|---|
| `booking_confirmed` | "Booking Received!" screen, [BookingForm.tsx](../src/components/booking/BookingForm.tsx) | ✅ | `property`, `value`, `currency`, `transaction_id` |
| `purchase` *(2026-10-10)* | same screen, fired alongside `booking_confirmed` (never instead of it) | ✅ (GA4 default for `purchase`) | `transaction_id`, `value`, `currency`, `items` (`item_id`=slug, `item_name`, `item_category`=`"stay"`, `price`, `quantity`=nights) |
| `generate_lead` | contact form success, [ContactForm.tsx](../src/components/sections/ContactForm.tsx) — **and** newsletter signup success/`alreadySubscribed`, [NewsletterSignup.tsx](../src/components/sections/NewsletterSignup.tsx) *(2026-10-10)* | ✅ (to be marked in GA4 UI — Owner) | Contact form: `form_subject`, `form_location`, `lead_source` (`contact_form`). Newsletter: `method` (`newsletter`), `lead_source` (`site:newsletter-page`\|`site:footer`\|`site:homepage`) — no PII |
| `add_payment_info` *(2026-09-28)* | payment screen shown, and again on each method change there, [BookingForm.tsx](../src/components/booking/BookingForm.tsx) | ❌ — **deliberately not a key event** ([DEC-022](HIL_DECISIONS.md)) | `property`, `payment_type` (`gcash`\|`bpi`\|`stripe`), `value` (client-estimated total), `currency` |
| `book_click` | booking-submit CTAs — property-card Book CTA **and** the payment screen's "I've Paid" / card Pay buttons (not the details-form Continue button) | ❌ | `property` |
| `check_availability` | property card + sticky bar | ❌ | `property` |
| `stay_match_arrival` | landing from a Stay Match link (blog plugin v1.0.2+), [Analytics.tsx](../src/components/Analytics.tsx) | ❌ | `destination` (`property`\|`book`), `post_slug`, `property` |

Not lead events, by design: the `/ambassadors` application (a partner signup, not a guest
lead) and the chatbot's Messenger handoff (`m.me`, an outbound link GA4 enhanced
measurement records as `click`). `form_start`/`form_submit` are GA4 enhanced-measurement
auto events, not ours — leave them. **`generate_lead` still needs marking as a key event in
the GA4 UI (Owner).**

`book_click` and `check_availability` are intent signals, **deliberately not key
events** — marking them as such would mix button clicks into the conversion count
and, if Google Ads is connected, feed junk into bidding.

### `booking_confirmed` — why it is fired from code

The confirmation screen is a **client-side state on the same `/properties/<slug>/book`
URL** — no route change, no `page_view`. GA4 cannot match it by URL under any
configuration; it must be fired in the component.

It uses a `useRef` fire-once guard rather than empty deps, because the payload
arrives asynchronously from the POST response (so the effect must depend on it)
and StrictMode double-invokes effects in dev.

> **`value` is server-authoritative.** `POST /api/bookings` returns `total`
> (the persisted `computedTotal`) and `propertySlug` alongside `bookingId`,
> and the event reports those. The client's own `total` silently falls back to
> `nights × pricePerNight` when `/api/rates/[slug]` fails, so reporting it would
> risk a GA4 revenue figure nobody was ever charged.

`transaction_id` is `HIL-<bookingId>` — namespaced so it does not read as a bare
row counter, and consistent across payment methods (**not** the Stripe
PaymentIntent id) so dedupe and reporting stay uniform.

A malformed response body leaves the event unsent but the booking successful.
Analytics must never break the conversion it measures.

> **Semantics:** `booking_confirmed` means *booking request submitted*, not
> *payment verified*. Stripe bookings are paid and auto-confirmed; GCash/BPI are
> `pending` and some fraction never pay — so the conversion count and its value
> total run somewhat ahead of money collected. Adding a `payment_method` param
> would let the two be separated in reports; still deferred.

### `purchase` — fired alongside `booking_confirmed` (2026-10-10)

A 2026-10-10 GA4 Data API reconciliation (property 532187541) found `booking_confirmed`
arriving correctly with its params (14 events, `eventValue` summing to 61,627; the
`Booking Ref`/`Listing` custom dimensions populated) — but GA4's **built-in**
`transactionId` stayed `(not set)` and `purchaseRevenue` stayed 0, because those fields
and the Monetization → Ecommerce purchases reports are only populated by the recommended
`purchase` event with `transaction_id`/`value`/`currency`/`items` — a different event from
any custom one. No `purchase` event had ever been sent. Owner-approved 2026-10-10 to add
it **in addition to** `booking_confirmed`, not as a replacement — `booking_confirmed`
keeps the continuity of the existing funnel/reports and the `booking_confirmed` *key
event is unchanged*.

- **Where:** same effect as `booking_confirmed` in
  [BookingForm.tsx](../src/components/booking/BookingForm.tsx) — the "Booking Received!"
  screen, a client-side state with no route change (same reasoning as `booking_confirmed`
  above).
- **Params:** `transaction_id` (`HIL-<bookingId>`, same format as `booking_confirmed` so
  the two can be matched), `value` (server-authoritative total, rounded), `currency`
  (`"PHP"`), `items`: one line item per booking — `item_id` (property slug), `item_name`
  (property name), `item_category` (`"stay"`), `price` (total ÷ nights, 2dp), `quantity`
  (nights). If nights is 0/unknown, `quantity: 1` and `price` is the full total — never a
  divide-by-zero.
- **Dedup:** before sending, [src/lib/ga4-purchase.ts](../src/lib/ga4-purchase.ts) checks
  `sessionStorage` key `hil_ga4_purchase_<transaction_id>`; it skips the send if already
  marked, and marks it right after a successful `track()` call. Storage access is wrapped
  in the same try/catch pattern as `analytics.ts` (private-mode/blocked storage must not
  break the booking flow) — if storage throws, the guard fails open (sends) rather than
  silently dropping real revenue. **This is a client-side, per-tab guard, not a server-side
  one** — GA4 itself also de-duplicates `purchase` by `transaction_id` (its one built-in
  exception among custom-shaped events); `booking_confirmed` is a custom event and is
  **not** de-duplicated by GA4, so the two events' counts can diverge if a send is ever
  retried.
- **Pure logic split out for testing:** `buildPurchaseParams`, `shouldSendPurchase`,
  `markPurchaseSent`, and `trackPurchaseOnce` (which takes `track` as a parameter so it's
  testable without mocking `window.gtag`) live in
  [src/lib/ga4-purchase.ts](../src/lib/ga4-purchase.ts), unit-tested in
  `src/lib/__tests__/ga4-purchase.test.ts`.
- **Server-side (still OFF by default):**
  [ga4-measurement-protocol.ts](../src/lib/ga4-measurement-protocol.ts)'s
  `sendBookingConfirmedMeasurementEvent` now optionally queues a `purchase` event in the
  *same* Measurement Protocol request when the caller supplies `propertyName`/`nights` (both
  call sites — the Stripe auto-confirm branch of `POST /api/bookings` and the
  `becameConfirmed` transition in `PUT /api/admin/bookings/[id]` — do). This stays inert
  while `GA4_MP_ENABLED` is unset; if the Owner ever turns it on, the GCash/BPI
  admin-confirm path (which has no guest browser to fire the client-side event) would also
  report `purchase` revenue, not just `booking_confirmed`.
- **GA4 admin note:** `purchase` is a **key event by default** in GA4 — unlike
  `booking_confirmed`/`generate_lead`, which needed manual marking (see Implications
  above), no Owner UI step should be required here, but check Admin → Key events to
  confirm it shows up marked once real data arrives.

**Owner verification steps:**
1. **Immediate:** make (or have the Owner make) a real booking with `?ga_debug=1` on the
   `/book` URL, then check GA4 DebugView for both `booking_confirmed` and `purchase` on the
   same "Booking Received!" screen — or watch Realtime for the live site without the debug
   param.
2. **After ~24–48 h:** check Admin → Key events (`purchase` should already be marked) and
   Monetization → Ecommerce purchases (or an Explore report with Transaction ID) for a
   non-zero `purchaseRevenue` / populated `transactionId` matching the `HIL-<bookingId>`
   format.

### `book_click` / `check_availability` — markup-driven

One document-level listener,
[AnalyticsClickTracker.tsx](../src/components/AnalyticsClickTracker.tsx), mounted
once in the root layout. It resolves `event.target.closest("[data-analytics]")`,
reads `data-analytics` as the event name and `data-property` as the `property`
param, and calls `track()`.

**Any CTA site-wide becomes measurable by adding two attributes** — no
per-component wiring, and no tracking call to lose in a refactor:

```jsx
<button data-analytics="book_click" data-property={slug}>
```

It listens on the **capture** phase: some CTAs stop propagation in their own
handlers (`StickyBookingBar` scrolls rather than navigating), which would swallow
a bubble-phase listener.

Note `book_click` fires immediately before `booking_confirmed` on success — the
gap between the two counts is the submission-failure rate, which is the point.

### GA4 property configuration (not in code)

Custom dimensions are **not retroactive** — they must exist before the traffic
they describe. All three were created 2026-08-08.

| Dimension | Scope | Parameter |
|---|---|---|
| `Listing` | Event | `property` |
| `Booking Ref` | Event | `transaction_id` |
| `Lead Subject` | Event | `form_subject` |

`value` / `currency` / `transaction_id` need no dimension for revenue reporting —
they are GA4 reserved names.

**Data filter:** Admin → Data filters → **Developer** type, Exclude, state
**Active**. The default *Internal Traffic* filter is a different thing — it keys
on `traffic_type` from IP rules and is inert unless those are defined. A filter
left in *Testing* state excludes nothing; it only labels data for preview.

Since 2026-09-27 (DEC-021) non-production hosts send **nothing**, so the Developer filter
only matters for the explicit `?ga_debug=1` opt-in, which sets `debug_mode` on `config`
(covering `page_view`/`scroll` too) as well as on events. As of 2026-10-04 both the
Developer filter and the **Internal Traffic** filter (which keys on `traffic_type =
internal`, set by the marker above) are **Active**, operation Exclude — confirmed by the
Owner from the GA4 UI. Per the Owner they were switched on the day admin traffic stopped
appearing in GA4; the last `/admin` pageviews are dated 2026-09-28 (the same day the
DEC-021 code went live, which on its own stops `/admin` hits). On 2026-09-27 neither was
Active. Data filters are not retroactive, so data collected before activation still
contains owner/admin hits — segment by hostname/page path when reading it. The GA4 Data
API cannot read filter state; re-confirm in the UI. ⚠️ Public-page hits from the same
cities as the earlier admin traffic still appear on 2026-09-30 – 2026-10-02 (none on
10-03/10-04, checked 10-04): with the filter Active these can only come from an unmarked
browser — e.g. an in-app browser (Google/Facebook app), which has its own `localStorage`
separate from the browser used to sign in to admin.

### `stay_match_arrival` — landing-side Stay Match confirmation

The blog's `stay_match_click` depends entirely on a GA4 beacon leaving the blog page as it
unloads; referrers are origin-only and the same posts also carry plain in-article links,
so a Stay Match click can't be told apart from any other blog → property visit. From
plugin v1.0.2 (pending WordPress deploy — see
[Blog spec → Stay Match](HIL%20Blog%20Technical%20Specification.md)) every Stay Match
href carries `?hil_sm=<property|book>&hil_sm_post=<post_slug>`. On arrival
`reportStayMatchArrival()` fires `stay_match_arrival` once through `track()`, then strips
both params with `history.replaceState(null, "", …)` (the `null` state is what lets the
Next router adopt the URL; other params and the hash are kept). Parsing is pure and tested
in [src/lib/stay-match-arrival.ts](../src/lib/stay-match-arrival.ts): unknown
destinations and non-slug `post_slug` values are dropped, not sent.

- **Not UTMs, deliberately** — UTMs would start a new GA4 session and overwrite the real
  source (organic/Facebook) of the blog → main-site journey in the same property.
- **SEO-safe:** `/properties/[slug]` and `/properties/[slug]/book` emit absolute
  self-canonicals (`generateMetadata` → `alternates.canonical`); robots.txt and the
  sitemap are untouched.
- Gotcha: the params are stripped at hydration, normally before lazy gtag.js processes
  `config`, so the landing `page_view` usually reports the clean URL; if gtag.js is already
  loaded first, `page_location` may include them (harmless).
- The main-site code is inert until the plugin ships.

---

## Newsletter Signup (Hostinger Reach)

**Added 2026-10-10, Owner-approved — to be linked from a future SMS campaign.** Lets a
visitor subscribe to email (and optionally SMS) marketing without creating a `Booking` or
touching the database — the contact is created directly in **Hostinger Reach**, HIL's
mailing-list tool, via its public API.

**Three entry points, one component.** [NewsletterSignup.tsx](../src/components/sections/NewsletterSignup.tsx)
(client) takes `variant` (`"page"` — email + optional first name + optional PH mobile —
or `"strip"` — email only) and `source`:
- `/newsletter` ([page.tsx](../src/app/newsletter/page.tsx)), `variant="page"`, `source="site:newsletter-page"` — the standalone, indexable landing page (in `sitemap.ts`).
- Homepage strip ([src/app/page.tsx](../src/app/page.tsx), between Discover Lipa and the contact section), `variant="strip"`, `source="site:homepage"`.
- Footer strip ([Footer.tsx](../src/components/layout/Footer.tsx), `theme="dark"`), `variant="strip"`, `source="site:footer"`.

**UTM passthrough.** On mount the component reads `utm_source/medium/campaign/content/term`
from the current URL and persists them to `sessionStorage` (`hil_newsletter_utm`), so a
visitor who lands via a tagged SMS/social link and signs up later in the same session from
the footer still carries the original attribution. Sent to the API as a `utm` object;
the server re-whitelists and length-caps it (`sanitizeUtm` in
[src/lib/newsletter.ts](../src/lib/newsletter.ts)) rather than trusting the client's keys.

**`POST /api/newsletter`** ([route.ts](../src/app/api/newsletter/route.ts)), `runtime = "nodejs"`:
1. Honeypot (`company`, hidden field) — if filled, returns the normal success shape without calling Reach.
2. In-memory per-IP rate limit, 5 requests / 10 minutes (same best-effort pattern as `/api/security-alert`; resets on cold start, not shared across instances).
3. Validates `email` (required), `firstName` (optional, ≤50 chars), `phone` (optional PH mobile — reuses [src/lib/phone.ts](../src/lib/phone.ts)'s `normalizePhone`, requires the parsed number to be a `+639XXXXXXXXX` PH mobile) — all in [src/lib/newsletter.ts](../src/lib/newsletter.ts), pure and unit-tested.
4. Builds `note` (`source=…; utm_source=…; …; page=…`) and calls `subscribeToReach()` in [src/lib/hostinger-reach.ts](../src/lib/hostinger-reach.ts).

**Hostinger Reach client** (`src/lib/hostinger-reach.ts`, server-only): `POST`s to
`https://developers.hostinger.com/api/reach/v1/profiles/<profile-uuid>/contacts` with
`Authorization: Bearer ${HOSTINGER_REACH_API_TOKEN}`, body
`{ email, name?, phone?, tag_uuids, note }`. `tag_uuids` always includes one base tag;
an optional per-source tag (`HOSTINGER_REACH_TAG_NEWSLETTER_PAGE`/`_FOOTER`/`_HOMEPAGE`,
tag UUIDs) is appended only if its env var is set — the route never creates tags via the
API. An 8-second `AbortController` timeout guards the call.
- **Duplicate contact** (409, or 422 whose message mentions "already"/"exists"/"taken") → treated as success: `{ ok: true, alreadySubscribed: true }`, friendly message.
- **Missing `HOSTINGER_REACH_API_TOKEN`** → never throws; logs a server warning (no secret value) and returns `503 { ok: false, error: "Signups are temporarily unavailable. Please try again later." }`.
- **Other upstream errors/timeouts** → `502` with a friendly message. The upstream response body is never echoed to the client, and the token is never logged or returned.

**GA4:** on success (including `alreadySubscribed`) the client fires `generate_lead` via
`track()` with `{ method: "newsletter", lead_source: <source> }` — no PII. See
[GA4 Analytics Events](#ga4-analytics-events-gtagjs) → Events table.

**Not yet wired:** no admin UI lists newsletter signups (Reach is the system of record);
no DB table backs this feature by design (DEC-007-style "don't duplicate a system of
record" reasoning, though no formal `DEC-###` was opened for this small a feature).

---

## Haven AI Chat

**Added 2026-10-14, flag-off by default ([DEC-029](HIL_DECISIONS.md)).** Adds an optional
free-text LLM mode to the existing `ChatWidget` (`src/components/chat/*`), mounted
unconditionally in `src/app/layout.tsx` via `ChatWidgetGate`/`ChatWidgetServer`. With
`HAVEN_AI_ENABLED` unset (or anything but exactly `"true"`), or with `HAVEN_AI_KILL=true`,
behavior is **byte-identical** to the pre-existing static `chat-tree.ts` flow — the topic
buttons and "Talk to a Human" link are unaffected either way.

**Library** — `src/lib/haven/`:
- `config.ts` — flag/provider/model/cap resolution, all server-only env reads, the
  per-model USD price map.
- `provider.ts` — `ChatProvider` adapter (`chat({system, messages, tools, maxTokens})`),
  raw `fetch` against Anthropic's Messages API or OpenAI's Chat Completions API (no vendor
  SDK dependency) behind `HAVEN_AI_PROVIDER`.
- `welcome-book.ts` *(added 2026-10-15, Cedric; restaurants/things-to-do scope widened to
  global later the same day — owner override)* — a typed server-only module holding an
  owner-sanitized excerpt of the B34 house manual ("BV-B34L21 House Manual v020325"),
  keyed by slug: `getWelcomeBook(slug)` always returns the 10 restaurants and 13
  things-to-do — global, for every public listing including the Mickey in Lipa/B38
  listings, and even an unresolved slug — but `houseRules`/`howTos`/`checkOutSteps` are
  `null` for every slug except `cozy-1-bedroom`/`spacious-2-bedroom`; callers must never
  generalize those three house-specific fields to a non-B34 slug. Deliberately excludes
  what the source excerpt excludes: Wi-Fi (QR-code only in the manual), door/gate/lock/
  keybox codes, the street/lot address, staff phone numbers/emails, the host family bio,
  the dialect page, and the bars list — `welcome-book.test.ts` asserts none of these ever
  appear in the module's content.
- `access-guard.ts` *(added 2026-10-15, Cedric)* — Wi-Fi/physical-access guard, two
  independent layers mirroring the rest of DEC-029's tool-only-facts philosophy:
  `isWifiOrAccessRequest(message)` detects a direct Wi-Fi/password/door/gate/lock/keybox/
  susi question in English, Tagalog, or Batangueño; `buildAccessGuardReply(lang,
  guestMessages, latestMessage)` returns a fixed safe sentence (Wi-Fi: "posted inside the
  property"; access: "the team sends check-in instructions... message us on Messenger")
  with the Messenger button, used by `chat-service.ts` to skip the model entirely for a
  direct ask — same pattern as the 24+ guest handoff. `containsAccessLeak(text)` /
  `scrubAccessLeak(text, lang, guestMessages)` are the post-generation backstop: whatever
  the model wrote, a sentence matching a labeled credential ("password:", "SSID", "wifi
  name", "code is 1234") or a 4–8 digit run next to a door/gate/lock/keybox/susi word is
  replaced whole with the safe access sentence, and `ensureAccessHandoffLink()` forces the
  Messenger button on whenever the scrub fires.
- `dates.ts` — `resolveDates(expression, now?)`: pure natural-language date resolution
  ("this weekend", "next Friday to Sunday", "2nd Saturday of November", "Dec 24-26") into
  exact ISO `checkIn`/`checkOut` in Asia/Manila, built on the existing UTC-anchored
  calendar-date helpers in `src/lib/dates.ts`. The model never computes a date itself — it
  calls the `resolve_dates` tool and relays the result, including `interpreted` (a
  human-readable confirmation string). The weekday/month/ordinal vocabularies also carry
  Tagalog and Batangueño forms (`Linggo`–`Sabado`, `Enero`–`Disyembre`, `ikalawang`/`una`/…),
  "ng" is accepted alongside "of"/"in", and "susunod na" alongside "next" — so "ikalawang
  Sabado ng Nobyembre" and "sa susunod na Sabado" resolve the same way their English
  equivalents do *(Tagalog/Batangueño support added 2026-10-14, live-test bug-fix pass)*.
  `chat-service.ts` also runs this resolver on the guest's latest message **before** calling
  the model at all (`dateContextNote()`), and when it finds a date phrase, injects a system
  context note with the resolved `checkIn`/`checkOut` (ISO + the human `interpreted` form)
  instructing the model to use those exact dates and never ask what year is meant — live
  testing had shown the model sometimes skipping its own `resolve_dates` call and asking
  "2024 o 2025?" instead *(same pass)*. `buildStayLabel(checkIn, checkOut)` *(added
  2026-10-16, fix/haven-ai-checkout-date-101626)* — the single source of truth for how a
  stay's range is worded, fixing a live bug where Haven read a Thu check-in/Sat check-out
  2-night stay back as "Thursday → Friday" (the last occupied NIGHT, not the check-out
  date). Returns `{en, tl, btg}` (`btg` identical to `tl`), e.g. EN "Thu, Nov 19 → Sat, Nov
  21, 2026 (check-out) · 2 nights", TL/BTG "Huwebes, Nob 19 → Sabado, Nob 21, 2026
  (check-out) · 2 gabi" — the end date is always `checkOut`, nights is always `checkOut −
  checkIn`. `resolveDates()`'s own result now carries a `stayLabel`, as do `get_quote`,
  `find_stay`, and `check_availability` (`tools.ts`, below) and `dateContextNote()`'s
  system-prompt note — every surface that states a stay's range pulls from this one
  function. See `system-prompt.ts`'s "copy stayLabel verbatim" hard rule and
  `post-process.ts`'s `fixStayRangeEndDate()` backstop, below. The month-day/weekday/ISO
  range separator (`RANGE_SEP`) gained "hanggang" and "until" *(added 2026-10-16,
  fix/haven-ai-checkout-date-101626)* — a live regression: "Nobyembre 19 hanggang 21" (and
  any other "X hanggang Y" phrasing) wasn't recognized as a range at all, since only
  "-"/"to"/"–"/"through" were understood, so it fell through to the single-date pattern and
  silently resolved to a 1-night stay (Nov 19 → Nov 20) instead of the intended 2-night
  range (Nov 19 → Nov 21) — Haven then asked the guest to confirm the wrong, pre-resolved
  dates. A leading "mula"/"from" needs no special handling, since none of these patterns
  anchor to the start of the expression. `resolveDates()` gained a third optional
  `context` parameter and a bare day-of-month-range fallback *(added 2026-10-16, Owner
  rule, same branch)*: "19 to 21"/"19-21"/"19 hanggang 21" with no month attached resolves
  against a month found in `context` (recent prior turns — see `findContextMonth(context)`,
  a new export returning the LAST month name mentioned, English or Tagalog/Batangueño) or,
  with no month in context either, the next upcoming occurrence of the start day — this
  calendar month if it hasn't passed yet (today counts as not yet passed), otherwise next
  month. Lowest-confidence fallback, reached only once every month-named pattern above has
  already missed, and guarded by a trailing people-noun/kami exclusion so a guest-count
  phrase like "4 to 5 guests"/"4-5 kami" is never mistaken for a date range.
  `chat-service.ts` passes it the same last-6-prior-turns window (`recentHistoryMessages()`)
  it also uses for cross-turn property resolution (see `property-resolver.ts` below).
  *(added 2026-10-19, Owner convention, `fix/haven-ai-numeric-dates-101926`)* Numeric
  month-first dates: `M/D`, `MM/DD`, `M/D/YY`, `M/D/YYYY` (e.g. "10/24" is always October
  24 — **never day-first**), and ranges `10/24-10/26`, `10/24 to 10/26`, `10/24 hanggang
  10/26`, and the shorthand `10/24-26` (end day only, same month as the start). Guarded
  against a guest-count phrase like "4/5 guests" with the same trailing-noun exclusion the
  bare day-range fallback uses, so it's never mistaken for a date. Checked before every
  relative-weekday pattern, so when a numeric date and an explicit weekday both appear in
  the same message and agree (e.g. "10/24, this coming Saturday" — Oct 24, 2026 is a
  Saturday), the explicit numeric date resolves first; `system-prompt.ts` additionally
  tells the model to trust the numeric date and simply state the weekday it falls on if
  the two ever disagree, never asking the guest to pick one. New relative-weekday
  patterns, all resolving to the nearest occurrence of that weekday **including today**
  (unlike the existing "next `<weekday>`", which always skips today): "this coming
  Saturday", "this Saturday", "sa Sabado", "ngayong Sabado", "sa darating na Sabado".
  "bukas" now resolves the same as "tomorrow"; new "sa makalawa" resolves to the day after
  tomorrow. "Next weekend" is **redefined** (Owner rule) to mean the Saturday after the
  coming one, a 1-night Saturday→Sunday stay — not an extra Friday-to-Sunday span a week
  further out, which is what the prior implementation computed (no guest-facing test had
  pinned the old behavior). `resolveDates()`'s result gained two new fields: `nights`
  (`checkOut − checkIn`, in days) and `singleDateDefault` — `true` only when the guest's
  phrase named a single day with no check-out of its own (a bare numeric date, bare
  weekday, "tomorrow"/"bukas", "today"/"tonight", "sa makalawa", or one of the new
  relative-weekday phrases above) and the resulting 1-night stay is this resolver's own
  default rather than something the guest explicitly asked for — never `true` for an
  explicit range or "this/next weekend". New exports `todayContextNote(now)` ("Today is
  Monday, Oct 19, 2026 (Asia/Manila). The current year is 2026 — use next year (2027)
  only for a calendar date that has already passed this year...") and `manilaYear(now)`.
  `chat-service.ts` prepends `todayContextNote(now)` to **every** system prompt,
  unconditionally — not only on a turn where a date phrase is detected — so the model
  always has today's exact date and the current year as an anchor and never has to guess
  "this year" when relaying a tool result; this is the root-cause fix for the live bug
  where Haven asked a guest "10/24 ba yan ng taong ito, o next year? ... 2024 ba, o 2025
  na?" for a date four days away. `post-process.ts` gained `ensureSingleNightNudge(text,
  applies, lang, isEnglish)`: whenever `singleDateDefault` is true, Haven's reply gets a
  short "want to add more nights?" line appended (EN "Want to add more nights? Just tell
  me."; TL "Pwede pong dagdagan ang gabi — sabihin n'yo lang."; BTG "Pwede ga dagdagan ang
  gabi? Sabihin n'yo lang."), and the reply must never ask the guest to confirm the
  1-night default first — the three new `dropDateReconfirmationQuestions()` patterns just
  below handle that. `dropWhatYearQuestions()` gained an optional `currentYear` parameter
  (backward-compatible — omitting it keeps the prior static-only behavior): when passed
  (`chat-service.ts` always passes `manilaYear(now)`), it also drops any sentence naming a
  calendar year earlier than the current one — built as a 50-year alternation at call
  time, so no "2024"/"2025" literal list ever needs hardcoding or updating — plus two
  static phrases this live bug also produced: "this year or next" (EN), "taong ito ... o
  next year" (TL/BTG, matched as a same-sentence lookahead so word order doesn't matter).
- `owner-facts.ts` *(added 2026-10-14, owner-guardrails pass)* — the single server-side
  source of Owner-confirmed facts (Cedric, 2026-10-14): `buildOwnerFactsPrompt()` is
  injected into `system-prompt.ts`'s prompt and states the 24-guest combined capacity cap
  (counts adults; no documented kids/babies age policy — Haven must say the team will
  confirm via Messenger, never promise flexibility or that kids/babies are free/uncounted),
  full payment up front (no half payment, no deposit), the ₱200/hour early-check-in/
  late-checkout rate (subject to availability), quiet hours (10 PM–8 AM) plus the
  no-pets/no-smoking-inside/no-parties-without-approval house rules that are the same at
  every listing, and the karaoke/amenities caution (answer only from `amenities`/
  `amenityDetails`, never infer equipment from marketing copy like "a karaoke-and-lechon
  dinner"). A dated bullet *(added 2026-10-15, Cedric; restaurants/things-to-do widened to
  global later the same day — owner override)* covers local places / how things work:
  Haven may recommend the Welcome Book's 10 restaurants and 13 attractions **by name** for
  ANY public listing, including the Mickey in Lipa/B38 houses, saying they're "from our
  Welcome Book" and combining them with that property's own `neighborhoodPlaces` tool data
  when present — never looking up or inventing a place beyond this fixed list for any
  property. House rules/how-tos/check-out steps stay scoped to ONLY the two B34 listings
  (Cozy 1BR Haven `cozy-1-bedroom`, Spacious 2BR Getaway `spacious-2-bedroom`) — never
  generalized to a B38/Mickey listing or any other property, which instead get a pointer
  to the printed "Welcome Book" in each house for those. Two fixed facts Haven may state
  directly for any property: an Alfamart right outside the subdivision, plus minimarts
  around the property; anything the Welcome Book doesn't cover still gets the Messenger
  handoff. Two more dated bullets *(added 2026-10-15, Cedric)*:
  (1) banned "can you afford it" phrasing — "Kaya mo na ba?", "Kaya n'yo ba?", "Can you
  afford it?", "within your budget", "kaya ba ng budget" — must never appear; after a
  quote, Haven closes with a booking nudge ("Want me to help you book it?" / "Gusto n'yo na
  bang i-book?" / "Gusto n'yo na ga i-book?") instead, enforced independently by
  `replaceBannedAffordPhrasing()`, which runs **before** `stripBudgetQuestions()` below so
  "within your budget"/"kaya ba ng budget" is replaced with the nudge rather than silently
  dropped by the broader budget-question regex; (2) Haven must never share a Wi-Fi name/
  password or a door/gate/lock/keybox code — see `src/lib/haven/access-guard.ts` below.
  `OWNER_FACT_ALLOWED_AMOUNTS` (currently `{200}`) is merged into the price
  guard's allowlist in `chat-service.ts` so the ₱200/hour fact can be stated even when no
  tool call happened to return it this turn. Independent, testable enforcement lives
  alongside the facts: `stripBudgetQuestions()` drops any sentence asking the guest's
  budget; `removeKidsFreeClaims()` replaces a sentence claiming kids/babies don't count or
  stay free with a Messenger-confirmation sentence; `needsCapacityHandoff()` (true for a
  `find_stay`/`get_quote` call for 24+ guests, a `parseGuestCount()`-detected 24+ guest
  count in the guest's own latest message, or a guest message about kids/babies counting
  toward capacity, squeezing in extra people, or an extra bed/mattress) and
  `ensureCapacityHandoffLink()` force the Messenger button on regardless of what the
  model's own text says. `parseGuestCount()` *(added 2026-10-14, preview-retest pass)* is a
  language-agnostic guest-count parser — "24 people/pax/guests/adults", "kami ay 24", "4
  kami"/"4 na kami" (number-leading idiom, added 2026-10-16 to parse the Owner's exact
  "Nobyembre 19 hanggang 21, 4 kami" fixture), "24 na tao", "24 katao", or a split group
  like "8 adults + 4 kids" (summed) — scoped to a number sitting next to a people-noun (or
  "kami") so a date/time/price number is never picked up
  (fixes an owner-reported miss: "Kami ay 24 na tao sa ikalawang Sabado ng Nobyembre. Saan
  kami pwede?" got a "how many nights?" follow-up instead of a handoff, since the old check
  only looked at tool-call arguments). `buildCapacityContextNote()` *(same pass)* injects a
  server-resolved system-prompt note (same pattern as `dateContextNote()`) when the parsed
  count is 24+, telling the model to hand off immediately rather than ask for more details
  — `ensureCapacityHandoffLink()` forces the button on independently either way. The
  karaoke/amenities guidance now points at the `find_amenity` tool (below) instead of
  `get_property_details`, so Haven never has to ask which house first *(same pass — fixes
  an owner-reported "Do you have karaoke?" → "which house?" bug)*. `needsCapacityHandoff()`'s
  24+ check is now two exported, independently-testable functions,
  `isLargeGroupMessage()`/`isLargeGroupToolCall()` *(added 2026-10-14, live bug-fix pass)*
  — reused by `chat-service.ts`'s model-skipping handoff (see below) as well as the
  Messenger-button force — alongside a new fixed-script `buildLargeGroupHandoffReply(lang,
  guestMessages)` in English/Tagalog/Batangueño (`auto` picks English vs. Tagalog the same
  way `isEnglishContext()` does; there's no reliable way to detect Batangueño from the
  guest's own text, so `auto` never produces the `btg` script, only an explicit toggle
  does).
- `tools.ts` — zod-validated, read-only tools, each calling an **existing** service, never
  computing a price or availability decision itself: `list_properties`
  (`getPublicListings`, never `airbnbIcsUrl`), `get_property_details`
  (`sanitizeChargeProse` + the property's JSON content fields), `check_availability`
  — both `list_properties` and `get_property_details` also return a `shortName` field
  *(added 2026-10-15, live-retest fix)*, always correctly disambiguated against the FULL
  public-listing set via `post-process.ts`'s `shortPropertyLabels()` (`list_properties`
  passes its own already-fetched list; `get_property_details` re-fetches via a new
  `shortNameFor(slug, name)` helper, since a single resolved property alone can't tell if
  its base name collides with siblings it didn't look up) — `system-prompt.ts` tells the
  model to always say `shortName`, never the raw `name`.
  (`getPropertyConflicts`/`formatConflictRange`), `get_quote` (`computeBookingQuote`),
  `find_stay` (checks every public property's availability for a date range and returns
  single properties that fit or combinations whose summed `maxGuests` covers the group —
  `findStayCombinations`/`splitGuestsAcrossCombo` are pure and never pair two properties
  sharing an inventory group, i.e. two configurations of the same physical house, DEC-001),
  and `get_faq` (keyword search over `src/lib/faqs.ts`). `check_availability`, `get_quote`,
  and `find_stay` each also return a `stayLabel` *(added 2026-10-16,
  fix/haven-ai-checkout-date-101626)* — `dates.ts`'s `buildStayLabel(checkIn, checkOut)` for
  the exact range the tool was called with, so Haven can copy the correctly-worded range
  (end date = check-out, never the last night) instead of composing it itself; `find_stay`
  returns one `stayLabel` at the top level, shared by every option, since every option is
  for the same dates. Booking links are built
  server-side as `/properties/{slug}/book?checkIn=…&checkOut=…&guests=…`. `get_quote` also
  returns the property's `name` (for booking-link labels) and `get_property_details`
  returns a structured, numeric `fees` object (`extraGuestFeePerNight` plus the published
  early-check-in/late-checkout rate from `src/lib/hourly-fee.ts`'s `HOURLY_FEE_RATE`) so a
  guest's fee question can be answered with a real, traceable number instead of the model
  inventing one *(added 2026-10-14, polish pass)*. `check_early_late(slug, date, kind)`
  *(added 2026-10-14, owner-guardrails pass)* answers a date-specific early-check-in/
  late-checkout question: it reads the property's own `checkInTime`/`checkOutTime` from
  `housePolicies` and calls `getInventoryScopeConflicts()` — the same commit-time check
  the booking flow uses, covering bookings, manual blocks, imported iCal events, and
  shared-inventory siblings — over a 3-day window centered on `date`. Early check-in on
  `date` is `not_possible` when a conflict **ends** exactly on `date` (the night before is
  occupied); late checkout is `not_possible` when a conflict **starts** exactly on `date`
  (the night of is occupied); otherwise `likely_possible` — never a guaranteed yes, always
  "subject to confirmation with the team." A missing property, invalid date, or a DB error
  returns `unknown` rather than fabricating a status. Returns
  `{status, reason, standardTime, fee: "₱200/hour"}`. `get_quote` and `find_stay`'s
  per-property quote both also return a `perNight` array (`{date, weekday, rate}`, derived
  from the same `dailyRates` `computeBookingQuote` already returns) *(added 2026-10-14,
  preview-retest pass)* — so Haven can show a stay's nightly breakdown (e.g. a weekday vs.
  weekend rate on a Thu→Sat stay) by relaying this verbatim, never by multiplying/summing a
  rate itself; the `total`/`nightlyTotal` fields remain the only total Haven may state.
  `find_amenity(term)` *(added 2026-10-14, preview-retest pass)* searches every public
  property's `amenities`/`amenityDetails` for one item (karaoke, videoke, pool, grill, …)
  and returns which propert(y/ies) have it (`{found: true, properties: [...]}`) or
  `{found: false, properties: []}` if none do — so an amenity question never has to ask
  "which house?" first (the old path required `get_property_details` for one property at a
  time). `needsAmenityHandoff()` (post-process.ts) independently forces the Messenger
  button on whenever `find_amenity` comes back empty. `get_property_details` also returns
  a `welcomeBook` field *(added 2026-10-15, Cedric; restaurants/things-to-do widened to
  global later the same day — owner override)* — restaurants/things-to-do are non-null for
  every property, `houseRules`/`howTos`/`checkOutSteps` only for the two B34 slugs, see
  `welcome-book.ts` above — and a new `get_local_guide(slug?)` tool *(same pass)* returns
  the same global restaurants/things-to-do for any property (resolving an informal name
  through `resolveSlugFallback`'s existing fuzzy fallback, never blocking on an unresolved
  slug, and even returning the global lists with no slug given yet), with
  `houseRules`/`howTos`/`checkOutSteps` populated only for a resolved B34 slug and a
  message pointing to the printed Welcome Book in each house for the house-specific
  content on any other property.
- `property-resolver.ts` *(added 2026-10-14, live bug-fix pass)* — pure, DB-free fuzzy
  property-name resolution: `resolvePropertyMatch(query, listings)` fixes a live bug where
  an informal/partial property name (e.g. "the Mickey Full Family House") got "isn't
  coming up in our system" from an exact-slug-only lookup. Normalizes case/accents/
  punctuation, strips a `[...]` bracket prefix and a `" | "`/`"•"` suffix (reusing
  `post-process.ts`'s `stripToBaseName`), drops filler tokens ("house", "bahay", "yung",
  "sa", "ang", "the"), then scores every public listing by token overlap (name/slug/a
  small owner-confirmed alias table — "B34"/"B38" block numbers, "Mickey",
  "pinakamalaki"/"pinakamalaking"/"malaki"/"malaking" (Tagalog) and "biggest"/"largest"/
  "big" (English, since "house" is itself a filler token) for the biggest configuration,
  "studio" for the Cozy 1BR, etc., since these never appear in any DB column) plus a
  capacity-number bonus (a bare number
  in the query matching a listing's `maxGuests` outscores a same-named sibling, so "mickey
  15" picks the 15-pax configuration over its 7/11-pax siblings). An exact slug always
  wins outright with no scoring. Two or more listings tied at the top score (a bare "B38",
  "Mickey", or "Mickey in Lipa" alone — every slug itself contains "mickey"/"in"/"lipa",
  so all three Mickey configurations always tie unless the query also names a size/
  capacity) come back `ambiguous` with a candidate list rather than guessing — the model
  is instructed to turn that into a short clarifying question naming the candidates, never
  "isn't in our system". `tools.ts`'s
  `resolveSlugFallback()` calls this only *after* each slug-taking tool's existing
  exact-slug lookup misses — `get_property_details`, `check_availability`, `get_quote`,
  and `check_early_late` all retry once with the resolved slug, return
  `{ambiguous: true, candidates, message}` to let the model ask a short clarifying
  question, or fall back to the original `"Property not found."` for a genuine miss. A
  model that already has the right slug (the common case) never touches this path or
  `getPublicListings()` at all. `system-prompt.ts` (below) tells the model how to use an
  `ambiguous` result and never to claim a property isn't in the system otherwise.
  **Server-side pre-resolution** *(added 2026-10-15, live-retest fix)* closes the gap left
  by `resolveSlugFallback()` above: that path only ever runs AFTER a tool call already
  missed, so a turn where the model answers free-text with no tool call at all (the two
  exact live failures — Batangueño "Mickey in lipa" after some history got "hindi ko alam
  ang property na 'yan"; "Magkano ga ang yung malaking bahay ng Mickey sa Nobyembre 14
  para sa 10?" got asked for the exact name) never touched it. Three new pure functions,
  same pattern as `dateContextNote()`/`buildCapacityContextNote()`:
  `resolveGuestPropertyMention(guestMessage, listings)` resolves the guest's latest
  message against the full public-listing set and returns a short-named `unique`/
  `ambiguous`/`none` result (reuses `resolvePropertyMatch()` above, then
  `shortPropertyLabels()` for a properly disambiguated label — see `post-process.ts`
  below); `buildPropertyContextNote(resolution, dates)`, called from `chat-service.ts`
  alongside the date/capacity notes, appends a system-prompt note — a unique match names
  the slug and short name and forbids asking for the name again, and additionally tells
  the model to call `get_quote` immediately (with the slug/dates/guest count spelled out)
  when a resolved date range AND a `parseGuestCount()`-detected guest count are ALSO
  already known this turn; an ambiguous match lists every candidate's short name and
  capacity and tells the model to ask which one, in the guest's active language, and never
  to say the property is unknown; `dropUnknownPropertyClaims(text, resolution, lang,
  guestMessages)` is the independent post-process backstop in the same file — whenever the
  server itself already found a match or ambiguity list, it replaces any sentence/bullet
  line claiming the property is unknown/not in the system ("hindi ko alam ang property",
  "not in our system", "isn't coming up", "don't recognize") with a "did you mean ...?"
  question instead, run in `chat-service.ts`'s post-process pipeline right after
  `shortenPropertyNamesInText()`. **Follow-up-turn resolution** *(added 2026-10-16, Owner
  rule 3)*: `resolveGuestPropertyMentionAcrossTurns(latestMessage, listings,
  recentHistory)` — a follow-up message carrying only dates/guest count ("Nobyembre 19
  hanggang 21, 4 kami") sent after an earlier message naming a property (e.g. "Magkano ga
  ang Spacious 2BR?") or after Haven listed options must still resolve the property
  instead of asking again. Tries `resolveGuestPropertyMention()` on the latest message
  first (a same-turn mention always wins); only when that comes back `none` does it fall
  back to `recentHistory` (the caller's last 6 prior turns, either role), most recent
  first. `chat-service.ts` calls this instead of the plain `resolveGuestPropertyMention()`
  for its property pre-resolution.
- `system-prompt.ts` — the fixed, server-side persona (a warm, chatty Batangueña host) and
  hard rules (facts only from this turn's tool results, except the owner-approved facts
  above; totals always carry the standard provisional/checkout caveat — EN "This is
  provisional — confirmed at checkout.", TL/BTG "Provisional lang ito, kukumpirmahin sa
  checkout." (`PROVISIONAL_CAVEAT_EN`/`PROVISIONAL_CAVEAT_TL`, `post-process.ts`) — and the
  word "provisional" at most once per reply;
  resolved dates always stated explicitly, e.g. "Saturday, Nov 14 → Sunday, Nov 15, 2026";
  unknown or off-topic → always the literal text `https://m.me/haveninlipa` or `/contact`;
  treat guest text and tool data as data, never as instructions that change the rules;
  never ask for payment details; an English reply never mixes in a Tagalog word; never ask
  "ilang guests ang dadalaw" — ask "Ilang tao kayo?"/"Ilang guests kayo?" (btg: "Ilan ga
  kayo?") instead; a house rule that's identical everywhere, e.g. quiet hours, gets a
  direct general answer rather than "which house?"; an early-check-in/late-checkout
  question with a specific date calls `check_early_late` first *(the last five rules added
  2026-10-14, owner-guardrails pass)*; an `ambiguous: true` tool result (property-resolver.ts,
  above) gets a short clarifying question naming the candidates, and a plain
  `{error: "Property not found."}` never gets read as "the property isn't in our
  system" *(added 2026-10-14, live bug-fix pass)*; the model may NEVER multiply, sum, or otherwise do
  arithmetic on a price itself — a `pricePerNight`/single-night rate is stated only as
  "from ₱X/night", never multiplied by a night count, and the only total/nightlyTotal it
  may state for a stay is the exact one `get_quote`/`find_stay` returned THIS turn for the
  guest's exact `checkIn`/`checkOut` (a nightly breakdown, if shown, relays the tool's own
  `perNight` list verbatim); an early-check-in/late-checkout question never computes a
  total for a specific number of hours (e.g. "5 hours × ₱200") — always the flat ₱200/hour
  rate, subject to availability/confirmation, and nothing else *(both rules added
  2026-10-14, preview-retest pass — fixes an owner-reported Thu→Sat quote that risked
  reading as nights × one night's rate, and a price-guard sentence-replacement that nuked a
  correct ₱200/hour fact alongside a hallucinated hours-based total)*); separately from the
  arithmetic ban above, a base/listing rate (`pricePerNight`, `list_properties`, a property
  rundown) must always read "from ₱X/night" (Tagalog/Batangueño: "simula ₱X kada gabi"),
  never a bare number, since rates can change — explicitly carved out from an exact dated
  `get_quote`/`find_stay` quote line, which is stated exactly as the tool returned it *(rule
  added 2026-10-15, Cedric; independent backstop below)*. A stay's date range always ends
  on the check-out date, never the last occupied night — when stating a range, the model
  must copy the `stayLabel` matching its reply language (en/tl, `btg` reuses `tl`)
  verbatim from whichever tool gave it one, rather than composing the range itself; a
  per-night breakdown is unaffected, since each row correctly lists its own occupied night
  *(rule added 2026-10-16, fix/haven-ai-checkout-date-101626 — fixes a live bug where a Thu
  check-in/Sat check-out 2-night stay was read back as "Thursday → Friday"; independent
  backstop below)*. A date range ("Nov 19 to 21", "Nobyembre 19 hanggang 21") always means
  check-in the first date, check-out the second; once resolved this turn or already clear
  from earlier in the conversation, Haven must never ask the guest to confirm the number
  of nights, re-ask which dates were meant, or contradict that range — state it (copying
  `stayLabel` verbatim) and move on. Haven must never ask a guest what year they mean —
  always the current year in Asia/Manila, or next year if that date has already passed,
  exactly what `resolve_dates`/the date context note already do *(both rules added
  2026-10-16, Owner rules 1 & 2, same branch — fixes a live bug where Haven asked a guest
  to confirm whether a correctly-parsed "Nobyembre 19 hanggang 21" meant 1 night or 2,
  contradicting the range it had just parsed; independent backstops
  `post-process.ts`'s `dropDateReconfirmationQuestions()`/`dropWhatYearQuestions()`,
  above)*. The year rule now also explicitly bans offering or mentioning a past year as an
  option (e.g. "2024 or 2025?"), and points at the always-injected `todayContextNote()`
  system message as the source of truth for "today"/"this year." A numeric date is always
  month-first — "10/24" is always October 24, never day-first; a numeric date and a
  weekday mentioned together that agree need no comment, and if they ever disagree Haven
  trusts the explicit date and simply states the weekday it falls on, never asking the
  guest to pick one. A bare single date with no guest-stated check-out gets the resolver's
  1-night default stated directly — never "is that just 1 night?"/"check-in Saturday,
  check-out Sunday, right?" — closing with a short invite to add more nights (EN "Want to
  add more nights? Just tell me."; TL "Pwede pong dagdagan ang gabi — sabihin n'yo lang.";
  BTG "Pwede ga dagdagan ang gabi? Sabihin n'yo lang."). "Next weekend" means the Saturday
  after the coming one, a 1-night Saturday→Sunday stay — not next Friday; `resolve_dates`
  already resolves it this way, Haven just relays it *(three rules added 2026-10-19, Owner
  rule, `fix/haven-ai-numeric-dates-101926` — `NUMERIC_DATE_RULE`, `SINGLE_DATE_NIGHT_RULE`,
  `NEXT_WEEKEND_RULE` in `system-prompt.ts`; independent backstops `post-process.ts`'s
  extended `dropDateReconfirmationQuestions()`/`dropWhatYearQuestions()` and the new
  `ensureSingleNightNudge()`, above)*. Haven must never say she's checking/looking something up in "the
  system"/"ang system"/"sa system"/"our system" — a real host, not software describing its
  own backend; say what she's actually doing in plain terms instead ("let me check that for
  you", "tinitingnan ko muna") *(rule added 2026-10-16, fix/haven-ai-checkout-date-101626;
  independent backstop `post-process.ts`'s `stripSystemMentions()`, above)*. Haven must
  always speak plain, conversational Tagalog/Batangueño — everyday Taglish is fine, but
  never deep or literary vocabulary — per an Owner incident where she qualified a quote as
  "(provisional lang — tutuklasin ng tama sa checkout)": "tutuklasin"/"tuklasin"/
  "matutuklasan" (or any other word on that root) are banned outright in favor of
  "kukumpirmahin" (will confirm), and a further list of deep words each gets a plain
  replacement — "sukatin" when checking something → "tingnan"; "manatili" when staying at
  a property → "mag-stay"; "nawa" → "sana"; "datapwat"/"subalit" → "pero"; "marapat" →
  "dapat"; "pagsapit" → "pagdating"; "tunay na" → "talaga"/"talagang"; "maaari"/"maaaring"
  → "pwede"/"pwedeng" *(`PLAIN_LANGUAGE_RULE`, rule added 2026-10-16, Owner plain-language
  pass; independent backstops `post-process.ts`'s `replaceTuklasinFamily()` — which swaps
  the WHOLE sentence/bullet line for the standard provisional/checkout caveat above, since
  every live occurrence of the "tuklas" root was this exact caveat — and
  `simplifyDeepTagalogWords()` — a word-level swap for the rest, below)*. Language
  mode (`en`/`tl`/`btg`/`auto`) is a parameter, not a separate prompt per language.
  **Terms of address** *(policy added 2026-10-14)*: "partner"/"pare"/"bro"/"sis"/"dude" are
  banned unless the guest used that exact word first; "parekoy" (male) / "marekoy" (female)
  are used ONLY on a clear gender cue — the guest self-identifies, or gives a name that
  strongly implies a gender (prompt examples: "Ako si Maria" → marekoy, "Ako si Juan" →
  parekoy, "Ako si Toni" → stays neutral, since Toni/Jun/Ali/Rene-style names are unisex);
  otherwise the model defaults to a neutral, warm term — "kabayan", "kaibigan", or
  "ka-Haven". `post-process.ts`'s `enforceTermsOfAddress()` is the independent backstop: it
  scans the model's reply for the five banned terms and, for any the guest never used
  themselves earlier in the conversation, substitutes "kaibigan" (or "friend" in English
  mode), preserving the matched word's capitalization.
  `btg` carries documented usage notes for each marker — "ala eh" (filler/exclamation,
  "well"/"oh my"), "aba'y" ("why, ..."/"well then", a sentence opener), "ga"/"baga" (yes/no
  particle replacing "ba", question-only — e.g. "Ilan ga kayo?", "Totoo baga?" — never a bare
  affirmation; the prompt spells out "Oo ga, may bakante" as WRONG, "Aba'y oo, may bakante!"
  as the fix), "nga" (emphasis/soft request, "Sabihin mo nga"), "ari"/"are"/"ire"
  ("this/here", "Ari ang bahay") — plus a vetted list of further natural touches (used at
  most 1–2 per reply, never forced, never slang that could offend or profanity): Batangueño
  "Ala, sige!", "Ay, ala eh, salamat!", "kapeng barako" (when coffee/local food comes up);
  Filipino courtesy with "po"/"opo" — "Tuloy po kayo", "Salamat po"/"Maraming salamat",
  "Ingat po sa biyahe", "Walang anuman", "Sige po", "Naku!", "Sulit", "Mabuhay" — plus a
  placeholder-only, 6–8-line few-shot block in a playful Batangueña host voice; every
  placeholder in those examples is fake so an example can never leak as a real price or
  date. `post-process.ts`'s `ensureBatanguenoMarker()` backs this with a server-side check: a
  `btg` reply with none of these markers gets a short natural opener ("Ala eh, ") prepended
  rather than silently shipping indistinguishable from plain Tagalog; its marker regex
  excludes a misused "Oo ga"/"Oo baga" (bare affirmation, not a question) from counting as a
  genuine marker, via a negative lookbehind for a preceding standalone "oo "
  *(ga/baga-misuse exclusion and "ire" added 2026-10-14, terms-of-address pass; marker
  rewrite + server-side check originally added 2026-10-14, live-test bug-fix pass,
  replacing an earlier pass's looser, partly-inaccurate marker glosses)*.
- `post-process.ts` — guardrails applied to the model's text after generation, regardless
  of what the prompt says. `extractAllowedLinks()` strips any link that isn't a relative
  site path, `haveninlipa.com`, or the Messenger handoff; `normalizeHref()` rewrites a
  scheme-less `m.me/haveninlipa` (wherever the model or `ensureHandoffLink()` emits one) to
  `https://m.me/haveninlipa` — the bare form renders as a broken relative link in the widget
  *(bug found in live testing, fixed 2026-10-14)*. `enforcePriceClaims()` replaces the
  **whole sentence or bullet line** containing a ₱/PHP amount not present in that turn's
  tool results (never just the number, which used to leave broken fragments like a
  dangling "/hour") — the replacement is "You'll see the exact total at checkout." for a
  stay total, "Early check-in and late checkout are ₱200/hour, subject to availability and
  confirmation with the team." (`FALLBACK_HOURLY_FEE_TEXT`) for an early-check-in/late-
  checkout context, or "For that fee, please ask us via Messenger
  (https://m.me/haveninlipa)." for any other rate/fee context (`/hour`, "fee", "charge") —
  `FEE_CONTEXT` deliberately excludes `/night`/`/day`/`/guest` as of 2026-10-22 (below), since
  those describe a property's own base rate, not a fee.
  The hourly fallback states the real owner fact instead of deflecting to Messenger,
  because Haven always knows that answer *(reclassification added 2026-10-14,
  preview-retest pass — fixes a live reply that replaced a correct "₱200/hour" alongside a
  hallucinated hours-based total with the generic Messenger fallback)*. The amount regex
  (`PESO_AMOUNT_SOURCE`) now also recognizes a bare "P" prefix (`P200`, never mid-word) and
  a "pesos" suffix with no symbol (`200 pesos`), not just `₱`/`PHP` *(same pass)*. A new
  `PRICE_ARITHMETIC_RE` check rejects any "₱2,800 × 2 = ₱5,600"-style multiplication/sum in
  the reply outright — treated as disallowed regardless of whether every number involved
  happens to be individually valid, since Haven showing its own arithmetic is never
  allowed even when the result is coincidentally right *(same pass)*. `ensureFromPrefix()`
  *(added 2026-10-15, Cedric)* is the independent backstop for the "from ₱X/night"/"simula
  ₱X" base-rate rule above: it inserts the missing lead word before a ₱ amount that matches
  `collectBasePrices()` (every `pricePerNight` value in this turn's tool results) and does
  NOT also appear in `collectDatedQuoteAmounts()` (every other tool-result number — a dated
  quote's `total`/`nightlyTotal`/`perNight` rate/`extraGuestFee`), so a dated quote line is
  never touched even when its number happens to equal the base rate; a match already
  preceded by "from"/"simula"/"starting at" is left alone rather than doubled up.
  **Property-overview fix** *(added 2026-10-22, DEC-029 addendum — production incident: asked
  "Hi, what properties do you have?", Haven ~50% of the time skipped `list_properties` and
  invented an answer — only the two B34 units, with wrong capacities (2/4 or 4/6 instead of
  the real 5/9), and once an invented price the price guard then replaced with the generic
  Messenger-fee fallback **inside a property bullet**)*: `enforcePriceClaims()`'s bullet-line
  branch now tells apart a property-listing rundown bullet from a true fee/total bullet via a
  new `RATE_CONTEXT` regex (`/night`, `/day`, `/guest` — moved out of `FEE_CONTEXT`, which now
  only matches `/hour`/`/hr`/"fee"/"charge"). A disallowed amount on a `RATE_CONTEXT` bullet
  with no fee/hourly wording drops just the price (`dropPriceFromBullet()` — removes the
  peso token plus its "from"/"simula" lead-in and "/night"-style unit, leaving an allowed
  amount on the same line untouched) instead of replacing the whole bullet, so the rest of
  the bullet (the property's name/capacity) survives even when its price can't be verified
  this turn; an explicit "fee"/"charge" bullet, or an hourly one, is unaffected and still gets
  the full-line fallback via `classifyFallback()`. Three complementary fixes close the rest of
  the gap, all in `chat-service.ts`'s `runToolLoop()` unless noted: (1) a new
  `listingsContextNote()` builds a compact "Context (public listings, authoritative...)"
  system-prompt block every turn from the `publicListings` already fetched for property
  pre-resolution (above) — one line per listing with its `shortName`, slug, bedrooms,
  `maxGuests`, and "from ₱X/night", or (if the fetch failed/returned empty) a note saying so
  and instructing the model to call `list_properties` itself; `system-prompt.ts`'s new
  `PROPERTY_OVERVIEW_RULE` tells the model never to name/count/describe properties from
  memory, to use this note (or `list_properties`) for any overview question in English or
  Tagalog/Batangueño, to name every listing (never only some), and that it may state the
  two-building fact (Block 34 = Cozy 1BR + Spacious 2BR, Block 38 "Mickey in Lipa" = the
  three Sleeps-7/11/15 configurations) only as *additional* context, never a substitute for
  the full per-listing list. (2) `basePricesFromListings()` folds every fetched listing's own
  `pricePerNight` into both the price guard's `allowedAmounts` and `ensureFromPrefix()`'s
  `basePrices` set (above), so a reply built from the context note's data — rather than an
  actual `list_properties` tool call this turn — states the identical server-fetched price
  and is never wrongly treated as unverified. (3) a new `src/lib/haven/overview-intent.ts`
  (`isPropertyOverviewMessage()`) detects a plain overview question ("what properties do you
  have", "anong property/properties meron kayo", "ano (ang) (mga) bahay ninyo", "ilang bahay
  meron kayo", and their English/Tagalog variants) in the guest's latest message; when it
  fires, `runToolLoop()` passes a new `forceToolName: "list_properties"` to `provider.chat()`
  on round 0 only (never on a later round, so the model can still finish normally after the
  forced call) — `provider.ts`'s `ChatRequest.forceToolName` maps to Anthropic's
  `tool_choice: {type: "tool", name}` and OpenAI's `tool_choice: {type: "function",
  function: {name}}`, falling back to each provider's normal "auto" behavior when unset.
  `collectBookingLinks()`
  turns every booking link a tool actually produced this turn (`get_quote`, `find_stay`)
  into a labeled button, still run through the same href allowlist, independent of whether
  the model wrote one into its prose; capped at 8, in reply order. Dedup is scoped to
  **within a single `find_stay` option only** — the same property+guests href legitimately
  reappears under a different option (e.g. a property that fits both a 2-property and a
  3-property combo), so two options are never collapsed into one just because they share a
  property *(dedup scope fix, cap 6→8, added 2026-10-14, terms-of-address pass; the caller,
  `chat-service.ts`, dedupes the model's own prose links against `collectBookingLinks()`'s
  output and against each other, but never dedupes `collectBookingLinks()`'s own entries
  against each other — that would re-collapse the intentional cross-option repeats)*. A
  single quote, or a `find_stay` reply offering exactly one property with no alternatives
  (one option, one property — not a combo, not a choice), labels as "Book <short name>
  (<guests> guests)" with no "Option N:" prefix, since there is nothing to number
  *(single-offer label fix added 2026-10-14, terms-of-address pass)*; otherwise `find_stay`
  options label as "Option N: <short name> (<guests> guests)" in the same order the options
  array (and therefore the reply prose) lists them. The short name
  (`stripToBaseName()`/`shortPropertyLabels()`) strips a leading `[DEVDB]`-style bracket tag,
  reuses `buildShortNames()` (`src/lib/listings.ts`) to keep a distinguishing second segment
  for properties sharing a base name (e.g. the three "Mickey in Lipa" configurations), and
  cuts at a bare "•" for a name with no "|" segment at all *(label rework added 2026-10-14,
  live-test bug-fix pass, replacing the earlier pass's raw-`Property.name` labels)*.
  `ensureHandoffLink()` guarantees a Messenger button (now always the `https://` href)
  whenever the reply mentions the handoff, even if the model wrote it as plain text rather
  than a markdown link. `limitToOneProvisional()` strips any repeat of the word
  "provisional" beyond the first — matching `**provisional**`/`*provisional*`/
  `_provisional_` as one unit so a repeat's own markdown emphasis is removed with it, not
  left behind as an empty `** **` (the exact regression a live test surfaced: "**Option 2**
  — ** total ₱10,525") *(dedupe fix added 2026-10-14, live-test bug-fix pass)*. A follow-up
  cleanup pass, `cleanupStrippedPunctuation()`, now runs after that removal to mop up the
  punctuation debris it can leave behind — e.g. "(provisional total: ₱10,525)" losing just
  the word leaves "( total: ₱10,525)" — by collapsing a stray "( " to "(", removing a fully
  empty "()"/"( )" (plus any space before it), and stripping a stray leading separator
  (",", ";", ":", "-", "—") left right after an opening paren, on top of the existing
  double-space collapse *(added 2026-10-14, terms-of-address pass)*.
  `enforceTermsOfAddress(text, guestMessages, lang)` *(added 2026-10-14, terms-of-address
  pass)* is the independent backstop for the terms-of-address rule above: for each of
  "partner"/"pare"/"bro"/"sis"/"dude" found in the reply, if that exact word never appears
  in the guest's own messages this conversation, it is substituted with "kaibigan" (English
  mode: "friend"), preserving the original word's capitalization — called from
  `chat-service.ts` with every `user`-role message in the request joined together as
  `guestMessages`. *(added 2026-10-14, owner-guardrails pass)* `shortenPropertyNamesInText()`
  applies the same bracket/pipe shortener `collectBookingLinks()` uses for link labels to
  the reply **text** too — a literal substring swap for every raw `{slug, name}` pair any
  tool returned this turn (`collectPropertyNamePairs()` covers `list_properties`,
  `get_property_details`, `get_quote`, and `find_stay`). `shortPropertyLabels()` is now
  exported and accepts an optional per-pair `shortName`, which always wins over its own
  turn-scoped `buildShortNames()` computation; `collectPropertyNamePairs()` now carries a
  `list_properties`/`get_property_details` result's own `shortName` field through, so both
  `shortenPropertyNamesInText()` and `collectBookingLinks()`' link labels automatically
  pick up the correctly-disambiguated name `tools.ts` computed against the full
  public-listing set — fixing a gap where looking up/mentioning only ONE of several
  same-base-name listings in a turn couldn't tell it apart from its unmentioned siblings
  *(added 2026-10-15, live-retest fix)*. `fixDadalawPhrasing(text, lang)`
  rewrites "ilang guests/tao ang dadalaw" (dadalaw = "to visit", confusing for a staying
  headcount) to "Ilang guests kayo?" (btg: "Ilan ga kayo?"). `isEnglishContext(lang,
  guestMessages)` is true for explicit `en`, or `auto` with no detectable Tagalog marker
  word in the guest's own messages; `stripTagalogWordsInEnglish()` is the backstop it gates
  — a small word map (`grupo`→"group", `kabayan`/`kaibigan`→"friend", `po`→dropped)
  independent of the system prompt's own "reply in English" instruction.
  `firstResolvedDateRange()` finds the first `checkIn`/`checkOut` pair among this turn's
  tool results/inputs (`resolve_dates`'s own result, or any other tool's date-bearing
  input); `ensureDatesStated()` prepends "For `formatDateRangeArrow()`:" (e.g. "For
  Saturday, November 14 → Sunday, November 15, 2026:") to an English reply that resolved
  dates this turn but doesn't already state the check-in month/day. It now takes `stayLabel`
  as a parameter and checks it FIRST — a literal `text.includes(stayLabel.en)` match skips
  the prepend outright — before falling back to the full-month-name check
  *(doubled-header fix, added 2026-10-16, fix/haven-ai-checkout-date-101626)*: the model is
  told to copy `stayLabel` verbatim, which uses abbreviated month names ("Nov 19"), so the
  old full-month-name-only check ("November 19") never matched it, and a reply already
  correctly reading "Thu, Nov 19 → Sat, Nov 21, 2026 (check-out) · 2 nights" still got "For
  Thursday, November 19 → Saturday, November 21, 2026:" prepended on top. `fixStayRangeEndDate()`
  *(added 2026-10-16, fix/haven-ai-checkout-date-101626)* is the independent backstop for
  the live bug where Haven stated a Thu check-in/Sat check-out, 2-night stay as "Thursday,
  November 19 hanggang Friday, November 20, 2026 (2 nights)" — reading the last occupied
  night (Friday) as the range's end instead of the check-out date (Saturday). Whatever
  English-worded date range the model composed itself, if its start-date mention matches
  this turn's resolved/quoted stay's `checkIn` AND its end-date mention matches the last
  occupied night (`checkOut − 1`), `chat-service.ts` replaces the WHOLE matched range
  (including any trailing "(N nights)"/"(N gabi)" note) with `dates.ts`'s `buildStayLabel()`
  output for the current reply language — never just the end date, so no dangling
  night-count note is left paired with a now-wrong end date. A correct range, or a
  per-night breakdown line (one date, no range separator), is never touched. `needsAmenityHandoff()`
  *(added 2026-10-14, preview-retest pass)* is true whenever a `find_amenity` call this
  turn came back `found: false`, forcing the Messenger button on the same way
  `needsCapacityHandoff()` does. `stripBatanguenoFromTagalog()` *(same pass)* converts a
  leaked Batangueño-only particle back to standard Tagalog whenever the effective reply
  language is plain Tagalog — `lang: "tl"` always, or `"auto"` mirroring a Tagalog-speaking
  guest (never `btg`, where these are correct, or `en`): "ga"/"baga" (question-particle
  usage only, same "Oo ga" bare-affirmation carve-out as `ensureBatanguenoMarker()`) → "ba";
  "ari"/"ire" ("this/here") → "ito"; capitalization preserved. `stripSystemMentions()`
  *(added 2026-10-16, fix/haven-ai-checkout-date-101626)* drops the whole sentence/bullet
  line whenever Haven refers to "the system"/"ang system"/"sa system"/"our system" — a
  guest-facing reply must never describe Haven's own backend; the article/possessive is
  required immediately before "system" so an unrelated phrase like "the sound system" is
  never caught. Independent backstop for the matching `system-prompt.ts` rule below; the
  `BATANGUENO_FEWSHOT` example that used to say "...sa system, tapos sasabihin ko..." was
  also corrected, since the few-shot's own wording was teaching the model the exact phrase
  this guard now bans. `dropDateReconfirmationQuestions(text, datesResolvedThisTurn,
  stayLabel, isEnglish)` and `dropWhatYearQuestions(text)` *(added 2026-10-16, Owner rules
  1 & 2, same branch)* are the independent backstops for "never re-question a resolved
  date range" and "never ask what year": the first drops any sentence/bullet line asking
  to confirm the number of nights or re-asking which dates were meant (EN: "just to
  confirm", "is that N nights or N", "do you want N nights", a "did you mean" scoped by a
  same-sentence night/date lookahead so it never clobbers `property-resolver.ts`'s own
  legitimate "Did you mean <property>?"; TL/BTG: "totoo ba/ga na isang gabi", "isang gabi
  lang ba/ga", "ilang gabi", "sigurado ba/ga kayo", two date ranges joined by "o") whenever
  a date range was resolved this turn (a tool result or the pre-resolved date context
  note) — if dropping leaves the reply completely empty (the Owner's dev screenshot: the
  ENTIRE bad reply was this kind of question), it falls back to restating the resolved
  `stayLabel` with a booking nudge rather than sending a blank message; the second
  unconditionally drops "what year"/"anong taon". Both run in `chat-service.ts` right
  after `fixStayRangeEndDate()`, before the model's markdown links are extracted.
  *(extended 2026-10-19, Owner rule, `fix/haven-ai-numeric-dates-101926`)*
  `dropDateReconfirmationQuestions()` gained three more mistaken-reconfirmation patterns
  for the single-date-default 1-night stay: "kung N night(s) lang" (TL/BTG, e.g. "kung 1
  night lang, ... tama ba?"), "N night(s) ba" (e.g. "1 night ba"), and a standalone
  "check-in `<weekday>` at check-out `<weekday>`, ... tama ba/ga" — the exact closing
  question from the live bad reply. `dropWhatYearQuestions(text, currentYear?)` gained an
  optional second parameter, backward-compatible (omitting it keeps the prior static-only
  behavior checking only "what year"/"anong taon"): when `chat-service.ts` passes
  `manilaYear(now)`, a dynamic backstop also drops any sentence naming a calendar year
  earlier than the current one — a 50-year alternation built at call time, so no
  "2024"/"2025" literal list needs hardcoding — plus two more static phrases from the same
  live bug: "this year or next" (EN) and a same-sentence lookahead for "taong ito" +
  "next year" (TL/BTG, word-order-independent). New `ensureSingleNightNudge(text, applies,
  lang, isEnglish)` appends the "want to add more nights?" line (EN/TL/BTG, see `dates.ts`
  above) whenever `resolveDates()`'s `singleDateDefault` was true this turn, run in
  `chat-service.ts` right after `ensureDatesStated()`, before the Batangueño-particle
  guard.
  `replaceTuklasinFamily(text, isEnglish)` and `simplifyDeepTagalogWords(text)` *(added
  2026-10-16, Owner plain-language pass, same branch)* are the independent backstops for
  `system-prompt.ts`'s `PLAIN_LANGUAGE_RULE`, fixing the Owner incident where Haven
  qualified a quote as "(provisional lang — tutuklasin ng tama sa checkout)". The first
  matches the whole "tuklas" root (`tutuklasin`, `tuklasin`, `matutuklasan`, `tinuklasan`,
  …, via a bare substring match — not just the exact form the owner saw) and replaces the
  **whole** sentence/bullet line with the standard caveat, `PROVISIONAL_CAVEAT_EN`
  ("This is provisional — confirmed at checkout.") or `PROVISIONAL_CAVEAT_TL` ("Provisional
  lang ito, kukumpirmahin sa checkout.") depending on reply language — every live
  occurrence of that root was this exact checkout caveat, so the ban is total, not a
  rewording in place. The second is a word-level swap, same pattern as
  `stripTagalogWordsInEnglish()`'s word map, capitalization-preserving, for the rest of the
  banned deep words: "sukatin"→"tingnan", "manatili"→"mag-stay", "nawa"→"sana",
  "datapwat"/"subalit"→"pero", "marapat"→"dapat", "pagsapit"→"pagdating", "tunay na"→
  "talagang", "maaari"/"maaaring"→"pwede"/"pwedeng". Both constants live in
  `post-process.ts` (not `system-prompt.ts`) to avoid a module import cycle, since
  `system-prompt.ts` already imports `owner-facts.ts`, which imports `post-process.ts`.
  Both run in `chat-service.ts` right after `fixDadalawPhrasing()`, before
  `stripSystemMentions()`.
- `masking.ts` — `maskPii()` strips emails, PH phone numbers (`+63`/`09xx`), and card-like
  digit runs from text **before** it is ever written to `HavenChatTranscript`.
- `rate-limit.ts` — `hashIp()` (sha256 + `HAVEN_IP_SALT`, the raw IP never stored);
  `checkRateLimit()` against `HavenChatUsage` row counts (20/10 min and 100/day per
  `ipHash`, 600/hour globally — one row is one guest message, see the schema entry above);
  `checkMonthlyCapAndAlert()` sums `costUsd` for the current Asia/Manila calendar month
  against `HAVEN_AI_MONTHLY_CAP_USD` and sends at most one admin alert per month (a
  zero-cost `HavenChatUsage` marker row, `reason: "cap"`, prevents a resend).
- `chat-service.ts` — `handleHavenChat(rawBody, ip, now?)`, the entry point for the route.
  Validates the request (zod: ≤12 messages, `role` `user`/`assistant`, `lang` enum,
  `sessionId`), then drives the tool loop: up to 5 rounds of `provider.chat()` ↔
  `runHavenTool()`, ~500 output tokens per call. **Never throws** — every failure path
  (flag off/killed, validation, rate limit, monthly cap, provider error, timeout) resolves
  to `{mode: "static"}`, optionally with a `reason` (`"rate_limit"`/`"cap"`/`"error"`), so
  the client's existing static tree is always a safe fallback.
  *(Added 2026-10-15, fix/haven-ai-freetext-reset-101526 — live bug: a guest typed a short
  reply right after Haven's own 4-option reply, which the client echoes back as `assistant`
  history; that history turn alone was long enough to fail the old flat 600-char-per-message
  cap, so the **whole request** was rejected → `{mode: "static", reason: "error"}` → the
  client injected the English root greeting mid-conversation, in the middle of a
  Batangueño-language chat):* the per-message cap is now role-specific —
  `messageSchema` is a zod discriminated union on `role`: `user` content still caps at
  `MAX_MESSAGE_CHARS` (600, the guest's own typing), `assistant` content (Haven's own
  prior replies, echoed back by the client as history) caps at the much larger
  `MAX_ASSISTANT_MESSAGE_CHARS` (1500, `config.ts`). `normalizeIncomingMessages()` runs
  **before** zod validation so an over-long request degrades gracefully instead of being
  rejected outright: history is trimmed to the most recent `MAX_MESSAGES` (12) turns
  (dropping the oldest, not rejecting the whole request), and any `assistant` message over
  1500 chars is truncated to its last 1500 characters (keeping the tail — e.g. the actual
  list of options, usually at the end). The one remaining oversized case — the **latest**
  message is from the guest and itself exceeds 600 chars — no longer falls back to static
  either: `handleHavenChat()` detects it before validation, validates the rest of the body
  against a clamped copy (so `sessionId`/`lang`/history shape are still checked normally),
  and returns a friendly `{mode: "ai"}` reply asking the guest to shorten the message
  (English/Tagalog/Batangueño via the same `isEnglishContext()` language selection
  `buildLargeGroupHandoffReply()` uses), with the Messenger button, skipping the model
  entirely — logged as `outcome: "handoff"`, `reason: "oversized_message"` (reusing the
  existing free-text `HavenChatUsage.outcome`/`reason` columns, no schema change).
  *(Added 2026-10-14, live bug-fix pass):* for a 24+ guest group, the model is
  skipped entirely rather than post-processed — `runToolLoop()` checks
  `isLargeGroupMessage()` on the guest's latest message *before* the first `provider.chat()`
  call (zero tokens, zero cost) and `isLargeGroupToolCall()` after each round's tool calls
  (in case a `find_stay`/`get_quote` call hits 24+ without the raw message itself parsing
  to a number); either one short-circuits to `owner-facts.ts`'s fixed
  `buildLargeGroupHandoffReply()` script plus the Messenger button, discarding whatever the
  model had generated so far. Replaces the prior approach (a system-prompt context note the
  model was still free to word however it liked) after live testing showed the wording
  drifting ("exactly max"/"might fit" hedging, follow-up questions) even with the Messenger
  link forced on independently. Logged as `outcome: "handoff"` — a new value in the existing
  `HavenChatUsage.outcome` free-text column, no schema change.
  *(Added 2026-10-15, Cedric):* same model-skip pattern for a direct Wi-Fi/access
  question — `runToolLoop()` checks `isWifiOrAccessRequest()` on the guest's latest message
  right after the 24+ guest check and before property-name pre-resolution, returning
  `access-guard.ts`'s fixed safe reply plus the Messenger button, zero tokens. On every
  other turn, the post-process pipeline now also runs `replaceBannedAffordPhrasing()`
  (before `stripBudgetQuestions()` — ordering matters, see `owner-facts.ts` above) and
  `scrubAccessLeak()`/`ensureAccessHandoffLink()` (detected on the pre-scrub text so the
  Messenger button can still be forced on after the scrub runs) on the model's reply.
  *(Added 2026-10-16, Owner rules 1–3):* `recentHistoryMessages()` returns the last 6
  prior turns (either role, excluding the guest's own latest message) — `runToolLoop()`
  now calls `resolveGuestPropertyMentionAcrossTurns()` (property-resolver.ts, above) with
  this window instead of the plain per-turn resolver, and passes it joined as `resolveDates()`'s
  new `context` argument for bare day-range month lookup (dates.ts, above). `dateContextNote()`
  no longer re-runs `resolveDates()` itself — it now takes the already-resolved object so
  the one call (with its history context) is shared with the property note and the
  post-process guards. The post-process pipeline runs `dropDateReconfirmationQuestions()`
  (gated on either this turn's tool-resolved range or the pre-resolved date context note)
  then `dropWhatYearQuestions()` (unconditional) right after `fixStayRangeEndDate()`,
  before the model's markdown links are extracted.
  *(Added 2026-10-19, Owner rule, `fix/haven-ai-numeric-dates-101926`):* `runToolLoop()`
  prepends `todayContextNote(now)` to the system prompt unconditionally (every request,
  before `dateContextNote()`), and now passes `manilaYear(now)` as `dropWhatYearQuestions()`'s
  `currentYear` argument. A new step, `ensureSingleNightNudge()`, runs right after
  `ensureDatesStated()` (gated on `resolveDates()`'s `singleDateDefault` for the guest's
  latest message, independent of whether a tool call happened this turn) and before the
  Batangueño-particle guard (`stripBatanguenoFromTagalog()`/`ensureBatanguenoMarker()`).
- `retention.ts` — `purgeExpiredHavenData()`, driven by the daily cron (see Cron Jobs
  above): deletes `HavenChatTranscript` rows older than 90 days and `HavenChatUsage` rows
  older than 13 months.

**Route** — `POST /api/haven/chat` (`src/app/api/haven/chat/route.ts`, `runtime = "nodejs"`,
`dynamic = "force-dynamic"`): parses the body, resolves the caller's IP
(`x-forwarded-for`/`x-real-ip`), calls `handleHavenChat()` under a 20-second race (a
provider hang resolves to `{mode: "static", reason: "error"}` rather than hanging the
response), and returns the result as-is — `{mode: "ai", reply, links}` or
`{mode: "static", reason?}`.

**Widget** (`ChatWidget.tsx`) — `ChatWidgetServer` passes `aiEnabled` (computed server-side
via `havenAiActive()`, with `getChatTree()`'s existing try/catch fallback unchanged). When
`aiEnabled`: a language toggle (Auto/English/Tagalog/Batangueño) appears below the header,
persisted in `sessionStorage` alongside the chat and a client-generated `sessionId`
(`crypto.randomUUID()`); a free-text input with a typing indicator sits below the message
list; a short privacy note links `/privacy`. A reply's `links` render as the same coral
pill buttons the static tree's CTA link already uses.

*(Changed 2026-10-15, fix/haven-ai-freetext-reset-101526):* a `{mode: "static"}` response
mid-conversation (the server degrading for `"cap"`/`"error"`/`"rate_limit"`, or the kill
switch) no longer falls back to the static tree's English root greeting — that used to
reset the guest's chosen language and conversation context in the middle of an AI-mode
chat (the reported bug). `fallbackToTree()` now appends a short, localized "couldn't
answer that just now" message with a "Message us on Messenger" link button, in the
currently selected language (en/tl/btg; `"auto"` defaults to English client-side, since
the client has no guest-text language detector), and otherwise leaves everything alone:
history, `lang`, `currentNodeId`, and `lastMode` are all untouched, and the free-text
input stays enabled. The static tree's root greeting is now shown **only** on first load
(`initialized` effect) or an explicit tap of the reset button (`handleReset`) — never from
a mid-conversation fallback. The outgoing payload's `assistant`-role (Haven's own) history
entries are also clamped client-side to the last 1500 characters
(`CLIENT_MAX_ASSISTANT_MESSAGE_CHARS`, mirroring `chat-service.ts`'s
`MAX_ASSISTANT_MESSAGE_CHARS`) as defense in depth — the server truncates independently
regardless.

*UX polish, added 2026-10-14 (owner feedback):* the widget tracks `lastMode`
(`"tree" | "ai"`, persisted in `sessionStorage`) — whether the **most recent** Haven
message actually came from the AI (`data.mode === "ai"`) or the static tree (the initial
greeting, a topic-chip tap, `handleReset`, or a fallback). `aiModeActive = aiEnabled &&
lastMode === "ai"` gates only the reply-scroll behavior below (see Auto-scroll); with the
flag off the widget renders **exactly** as it did before this pass:
- **Topic chips collapse behind a "Topics" toggle whenever `aiEnabled`** — gated on the
  flag alone, *not* `lastMode` (owner bug report, same day: the welcome message always
  comes from the static tree, so gating on `lastMode` left the chips expanded on first
  render). Collapsed by default from the very first render, including a restored
  `sessionStorage` session; tapping "Topics" expands the same `ChatOptions` chips as
  before, and tapping a chip still navigates the tree. Chips re-collapse after a chip tap
  (`handleSelect`), `handleReset`, or the guest sending a free-text message
  (`handleFreeTextSubmit`) — so a static-fallback turn mid-conversation still shows that
  node's (the root's) options collapsed, not expanded.
- **A small "Talk to a Human" text link** (`m.me/haveninlipa`) stays visible just above the
  input whenever `aiEnabled` — same flag-only gating as the chips, so it's reachable from
  first render, not just after an actual AI reply lands.
- **Auto-scroll** still branches on `aiModeActive` (did the *latest* message actually come
  from the AI, not just "is AI mode on" — unrelated to the chip-collapse bug above): static
  mode (and a fallback turn) still
  scrolls to the bottom of the panel exactly as before; in AI mode it scrolls so the
  **top** of Haven's newest message is in view instead (the old scroll-to-bottom put the
  chip grid in view, not the reply) — deferred one `requestAnimationFrame` so a reply's
  booking-link buttons have their final layout before the scroll math runs.
- **AI replies get a distinct bubble** (`ChatMessage.tsx`, new optional `mode?: "ai"` prop,
  set only on a message created from `data.mode === "ai"`) — a small "Haven" label above a
  `bg-cream` bubble with `border-forest/20`, left-aligned, vs. the unchanged `bg-white`
  static-tree bubble and the right-aligned `bg-forest` user bubble. Text stays
  `text-charcoal/80` rather than `text-forest` — forest-on-cream falls short of WCAG AA at
  this bubble's font size, charcoal-on-cream clears ~5.5:1. The message list carries
  `aria-live="polite"` in both modes so a screen reader announces new replies.

**GA4** (`track()` only, no message text or PII): `haven_ai_message` (`lang`),
`haven_ai_lang_select` (`lang`), `haven_ai_fallback` (`reason`),
`haven_ai_availability_checked` (count of booking links in a reply — a proxy for "Haven
found N available options", since the fixed `{mode, reply, links}` response contract
carries no separate metadata field), `haven_ai_booking_link_click` (`slug`, parsed from
the clicked link's `/properties/<slug>/book` path).

**Privacy policy** (`/privacy`) gained a short "Haven, Our Chat Assistant" section
describing the 90-day masked retention and the no-payment-details rule.

**Not yet built (tracked in Next steps):** H2 (lead capture/inquiry handoff from the chat)
and a private, admin-only Haven mode (read-only bookings/revenue Q&A behind `/admin`). No
write action — booking creation, payment, admin mutation — is exposed as a tool; H1 is
read-only by design.

---

## Performance & Accessibility (Homepage)

The homepage is tuned for PageSpeed Insights / Core Web Vitals. Several patterns are load-perf-critical — preserve them when editing the affected files.

### Scroll-reveal animation gating

`.reveal` in [globals.css](../src/app/globals.css) starts at **`opacity: 1`** by default — content paints immediately on first render. After hydration, [ScrollReveal.tsx](../src/components/ui/ScrollReveal.tsx) does three things in order:

1. Synchronously marks any `.reveal` element currently in (or near) the viewport as `.visible` via a `getBoundingClientRect` check.
2. Adds `html.js-loaded` to the root element.
3. Sets up an `IntersectionObserver` for the remaining `.reveal:not(.visible)` elements.

The synchronous pass in step 1 uses a **two-phase loop** — a read phase that collects all bounding rects into a `visible[]` array, then a write phase that applies `.visible` to each. **Do not mix reads and writes in the same iteration** (i.e. `getBoundingClientRect` immediately followed by `classList.add` per element). The write invalidates layout; the next iteration's read then forces a synchronous layout recalc. With ~20 `.reveal` elements on the homepage this added ~500 ms of forced reflow to Desktop TBT (commit `d4be460` fixed this).

The CSS rule `html.js-loaded .reveal:not(.visible) { opacity: 0; transform: translateY(22px); }` only kicks in after hydration, which means below-the-fold elements still hide-then-animate-in, but above-the-fold elements (including the **Hero `<h1>` LCP element**) never go through an opacity-0 → opacity-1 transition. Previously this transition was adding ~2 s of "element render delay" to LCP.

**Do not** revert `.reveal` to `opacity: 0` by default — the LCP penalty comes back.

### Property images use `next/image`

[PropertyCard.tsx](../src/components/ui/PropertyCard.tsx) renders cover images with `<Image fill priority={index < 2} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw">`. The first two cards preload (LCP candidates). [next.config.ts](../next.config.ts) restricts `images.remotePatterns` to `*.public.blob.vercel-storage.com` only — narrower than the CSP, which matches the actual asset host.

**Operational note:** when uploading new property covers, **use JPEG or WebP, not PNG** for photographs. The Vercel Blob optimizer transcodes for delivery, but the source file size still affects cold-cache latency and bandwidth cost. (A single 970 KiB PNG was the largest asset on the homepage until 2026-05-26 when it was re-uploaded as JPEG.)

### Hero icons — inline SVG (not Font Awesome)

The 7 above-the-fold icons in the Hero — Explore Our Properties (house), Learn More (circle-info), the 5 stats-bar icons (house, users, star, comment, award), and the scroll-down chevron — render as inline SVGs from [HeroIcons.tsx](../src/components/ui/HeroIcons.tsx) instead of Font Awesome `<i>` glyphs. Reason: Font Awesome's two woff2 files (~289 KB combined) were competing with Montserrat's woff2 for Slow-4G bandwidth during the LCP window, dragging Mobile Perf from the 90s down to the 70s.

Each icon component sizes via `width="1em" height="1em"`, so the parent's `font-size` (e.g. `text-[14px]`) controls icon size — drop-in replacement for the `<i>` markup. Color picks up `currentColor`.

**Do not** revert these to Font Awesome `<i>` icons — the bandwidth contention returns. If new above-the-fold icons are needed, add them to `HeroIcons.tsx`. The rest of the page (FAQ, ContactForm, Footer, PropertyCard amenity icons, etc.) continues to use Font Awesome via the deferred CDN load — that's fine because those icons are below the fold and don't affect LCP.

### Font Awesome — non-blocking load

[layout.tsx](../src/app/layout.tsx) injects the Font Awesome CDN stylesheet via an inline script that uses the **`media="print"` + onload swap** pattern. The created `<link>` starts with `media="print"` so the browser deprioritizes it for the screen render path; on load, the `onload` handler flips it to `media="all"` to apply the styles. A `<link rel="preconnect" href="https://cdnjs.cloudflare.com">` warms the connection; a `<noscript>` fallback covers no-JS clients.

```js
var l = document.createElement('link');
l.rel = 'stylesheet';
l.media = 'print';
l.onload = function () { this.media = 'all'; this.onload = null; };
l.href = '…/all.min.css';
document.head.appendChild(l);
```

**Important:** if this is ever simplified back to `l.rel = 'stylesheet'` without the `media='print'` swap, FA returns to the render-blocking critical path — the inline script alone does not defer the stylesheet. The page-level duplicate `<link>` in `src/app/page.tsx` was removed; **do not re-add it**.

### Font loading — Montserrat on `display: swap`

Montserrat is the Hero `<h1>` font and therefore the LCP element's font. Configured in [layout.tsx](../src/app/layout.tsx) with `display: "swap"` and `fallback: ["Georgia", "serif"]`. The H1 paints after a brief block period (~100 ms) with next/font's auto-generated metric-matched fallback; Montserrat swaps in when its woff2 arrives. Because the auto-fallback is metric-matched, the swap is visually minimal and Lighthouse fires LCP at the first paint with the fallback (not on the swap).

**Note:** `display: "optional"` was attempted briefly (commit `cb6e404`, reverted in `0663de1`). On Slow 4G, Chromium extended the `optional` block period to ~1 s, leaving the H1 invisible (FOIT) for that window and inflating LCP element-render-delay to 1,020 ms. `swap` does not have that issue — the fallback paints almost immediately.

Poppins and Open_Sans also use `display: "swap"` — they're body-text fonts, no LCP impact.

### Chat widget — idle-deferred mount

[ChatWidgetGate](../src/components/chat/ChatWidgetGate.tsx) wraps `<ChatWidgetServer />` in `layout.tsx` and gates rendering on `requestIdleCallback` (with a 1.5 s setTimeout fallback for Safari). The gate also hides the widget on `/admin/*` routes. Without this gate the chat widget JS executes during initial page load and contributes to Total Blocking Time.

### Google Analytics — `lazyOnload`

gtag.js is loaded via `next/script` with `strategy="lazyOnload"` from [Analytics.tsx](../src/components/Analytics.tsx) (mounted in [layout.tsx](../src/app/layout.tsx); production host + tracked paths only — DEC-021) — runs after `window.load`. No GTM. Trade-off: a few seconds of missing pageview data on bounced visitors, in exchange for the script not affecting LCP/TBT.

Because of this, anything calling `gtag` must tolerate its absence — see
[GA4 Analytics Events](#ga4-analytics-events-gtagjs) for the guarded helper.

### Navbar scroll handler — rAF throttled

[Navbar.tsx](../src/components/layout/Navbar.tsx) wraps the `setState(scrolled)` call in `requestAnimationFrame` with a ticking flag — at most one state update per frame. Required to keep TBT and forced-reflow contributions low.

### Chat button pulse animation

The `haven-pulse` keyframes in [globals.css](../src/app/globals.css) animate `transform: scale()` only (no `box-shadow`) so the GPU can composite it. Animating `box-shadow` was previously flagged as a non-composited animation.

### Accessibility patterns

- Form fields in [ContactForm.tsx](../src/components/sections/ContactForm.tsx) use explicit `id` + `htmlFor` pairs (`contact-name`, `contact-email`, `contact-phone`, `contact-subject`, `contact-message`).
- Social-media link icons carry `aria-label` props — the visible content is an icon-only `<i>` element. Facebook/Instagram/TikTok/YouTube are sourced from one shared constant, `src/lib/social-links.ts` (`SOCIAL_LINKS`, `aria-label="Haven in Lipa on {Platform}"`, 2026-10-16). **Since 2026-10-22 (DEC-030):** `Footer.tsx` renders this same four-icon row (Brand column, `target="_blank" rel="noopener noreferrer"`) on every page — the footer previously had no social icons at all — and the homepage "Find Us Online" row (`ContactForm.tsx`) no longer appends a fifth, hardcoded Airbnb icon. **Same-day follow-up:** the homepage CTA block (`src/app/page.tsx`, "Ready to Experience Our Comfort?") also now reads `SOCIAL_LINKS` directly with no Airbnb icon — dropped rather than replaced with an on-site icon, since the block already has two on-site CTAs ("Book Your Stay Today", "Browse Properties") immediately above the row. No page carries an Airbnb icon/link anywhere on `haveninlipa.com`. Tests: `src/lib/__tests__/footer-social-links.test.ts`, `src/lib/__tests__/homepage-cta-social-links.test.ts`, `src/lib/__tests__/social-links.test.ts`.
- Property card "View Details" links carry `aria-label={`View details for ${property.name}`}` so screen readers can distinguish otherwise-identical links.
- Heading hierarchy on the homepage: `h1` (Hero) → `h2` (each top-level section) → `h3` (sub-sections and footer columns). **Do not introduce `h4`** without an intervening `h3` in the same section.
- Footer body text uses `text-white/70` and secondary text `text-white/55` on `bg-[#1c1c1c]` to meet WCAG AA contrast; hover state is `text-white/85`.
- **Footer credit (DEC-025, copied from the live tribemedspa.com footer):**
  - The bottom legal row is `flex flex-wrap items-center justify-between gap-4 text-[14px] text-white/55`. At ≤768px it stacks and centres (`max-[769px]:flex-col max-[769px]:text-center`).
  - Left block: copyright, `<br />`, then `<a href="https://netcoresolutions.com">Powered by NetCoreSolutions.com</a>` (`NETCORE_CREDIT_URL`). The whole phrase is the link, with no target/rel. It inherits white/55 and is `no-underline`; on hover/focus-visible it becomes `text-white/85` plus underline.
  - Privacy/Terms sit on the right at the same 14px.
  - It is on every page that renders `<Footer />`, and deliberately not on `/admin/*` or `/pay/[token]`.
  - Test: `src/lib/__tests__/footer-credit.test.ts`. Keep it subtle: no logo, no accent colour at rest, and never write "NetCore Solutions".

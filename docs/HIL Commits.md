# HIL Commits

Running log of every commit pushed to `main` — the single source of truth for change history (Vercel Deployments mirrors the deploy side). **Type** = which aspect(s) of the project the commit touched: `HIL Website`, `HIL Blog`, `HIL SEO`, or a combination.

For *how* each aspect works, see the focused specs:
- [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md)
- [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md)
- [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md)

Newest commits at the top. On every "We're done for today" session wrap-up, new commits since the last logged hash are appended here with their Type (see the Session Wrap-up Protocol in `CLAUDE.md`).

| Commit | Date | Type | Message |
|---|---|---|---|
| `23cbbbb` | 2026-10-04 | HIL Website / HIL SEO | **Merge pull request #48 — 2026-10-02 wrap-up docs plus the GA4 filter record.** Merge commit, so `git revert -m 1 23cbbbb` rolls it back. Docs only. Production deployment `6848120130` for this SHA: success |
| `d8e04fa` | 2026-10-04 | HIL Website | Merge branch 'main' into docs/wrapup-100226 *(branch update so PR #48 could merge after #42, #49 and #50 landed)* |
| `419e559` | 2026-10-04 | HIL SEO / HIL Website / HIL Blog | **Merge pull request #50 — SEO audit LOW items.** Merge commit, so `git revert -m 1 419e559` rolls it back |
| `4e56456` | 2026-10-04 | HIL SEO / HIL Website / HIL Blog | fix(seo): honest sitemap dates, /ambassadors listed; hil-seo 1.1.8 artifact; 2027 refresh schedule *(LOW items from the 2026-09-30 audit: sitemap `lastmod` was request time and `/ambassadors` was missing)* |
| `3f47e09` | 2026-10-04 | HIL Blog / HIL SEO | **Merge pull request #42 — hil-seo 1.1.7 artifact.** Merge commit, so `git revert -m 1 3f47e09` rolls it back. Artifact only; WordPress upload is the Owner's step |
| `e2ada02` | 2026-10-04 | HIL Blog / HIL SEO | Merge branch 'main' into feat/hil-seo-1.1.7 *(branch update before PR #42 merged)* |
| `17749db` | 2026-10-04 | HIL Website / HIL SEO | **Merge pull request #49 — GA4 internal-traffic cookie.** Merge commit, so `git revert -m 1 17749db` rolls it back |
| `193453f` | 2026-10-04 | HIL Website / HIL SEO | fix(analytics): back the internal-traffic marker with a server-set cookie |
| `98fd49d` | 2026-10-04 | HIL Website / HIL SEO | docs: GA4 data filters confirmed Active; internal-traffic cookie marker |
| `00eb318` | 2026-10-02 | HIL Website | docs: 2026-10-02 wrap-up — Guest & Stay Edit closeout, commits log |
| `38d5cad` | 2026-10-02 | HIL Website | **Merge pull request #46 — production record and approved policies for Guest & Stay Edit.** Merge commit, so `git revert -m 1 38d5cad` rolls it back. Docs only. Production deployment `6801742473` for this SHA: success |
| `158b14b` | 2026-10-02 | HIL Website | docs: record Owner-approved first-release policies for Guest & Stay Edit (DEC-024) *(the released code already matched the five policies, so no behaviour changed; the blanket "decisions still open" wording was replaced by three tracked follow-ups)* |
| `16158c1` | 2026-10-02 | HIL Website | docs: record production release of Guest & Stay Edit (merge 6aa5729) *(the merge SHA and production result could only be written after PR #43 merged; also logged the commits since `74f25ab`)* |
| `6aa5729` | 2026-10-02 | HIL Website | **Merge pull request #43 — Admin Guest & Stay Edit, inventory lock, protected reactivation.** Merge commit, so `git revert -m 1 6aa5729` rolls it back (no schema change, so no database step). Merged 2026-10-02 05:00 UTC through branch protection with all four required checks green. **Production deployment `6801664704` for this exact SHA: success** (DEC-006). Production smoke checks passed, signed-out and read-only: public pages 200; `/api/admin/bookings/{id}/amend` 401 (404 before release); status route 401; availability API and `.ics` feed normal; CI on `main` green. **Not done on production:** a logged-in amendment, a real booking, or any locking under load — the Owner's acceptance test was on `dev.haveninlipa.com` only |
| `c0b0573` | 2026-10-01 | HIL Website | docs: record Owner acceptance of Guest & Stay Edit on dev (DEC-024 active) *(acceptance passed on `dev.haveninlipa.com`, dev build `9eb9f76`; kept separate from production verification)* |
| `06a9f3f` | 2026-10-01 | HIL Website | fix(admin): show why Guest & Stay editing is locked instead of hiding it *(a manager without the bookings permission, or a cancelled booking, got no Edit control and no explanation)* |
| `fb082b2` | 2026-10-01 | HIL Website | feat(admin): Guest & Stay Edit, inventory lock, protected reactivation *(staff could not correct guest or stay details without a temporary route; booking creation was check-then-insert with no lock; a cancelled booking could be reactivated over taken dates; a card charged for unavailable dates left no record — DEC-024)* |
| `96d3c11` | 2026-10-01 | HIL Blog / HIL SEO | feat(seo): hil-seo v1.1.7 artifact — dedicated blog homepage meta description (not deployed) *(the blog homepage description was 32 characters; reached `main` via PR #42 on 2026-10-04)* |
| `b624452` | 2026-10-01 | HIL Website / HIL Blog / HIL SEO | **Merge pull request #41 — 2026-09-30 wrap-up docs.** Merge commit, so `git revert -m 1 b624452` rolls it back. Docs only |
| `6c8b5f7` | 2026-09-30 | HIL Website / HIL Blog / HIL SEO | docs: 2026-09-30 wrap-up — SEO audit fixes, blog performance, DEC-023, SEO-DEC-031/032 |
| `74f25ab` | 2026-09-30 | HIL Blog | **Merge pull request #40 — HIL Performance 1.0.1/1.0.2 artifact.** Merge commit, so `git revert -m 1 74f25ab` rolls it back. Artifact only; Owner uploaded 1.0.2 to WordPress 2026-09-30 and it is live (blog PageSpeed mobile 65 → 89) |
| `9fa1433` | 2026-09-30 | HIL Blog | fix(blog): HIL Performance 1.0.2 — intercept the printed Font Awesome tag *(1.0.0/1.0.1 dequeued too early — the theme enqueues Font Awesome later — so LiteSpeed kept combining it; proof was the combined-CSS filename hash never changing. Now drops the tag via `style_loader_tag`)* |
| `78119d7` | 2026-09-30 | HIL Blog | fix(blog): HIL Performance 1.0.1 — drop noscript fallback *(LiteSpeed CSS Combine treats `<noscript><link>` as combinable, so the fallback put Font Awesome back into the blocking bundle)* |
| `722335c` | 2026-09-30 | HIL Blog | **Merge pull request #39 — HIL Performance v1.0.0 artifact.** Merge commit, so `git revert -m 1 722335c` rolls it back. Artifact only; superseded by 1.0.2 (#40) |
| `78fbc99` | 2026-09-30 | HIL Blog | feat(blog): HIL Performance v1.0.0 artifact *(new WordPress plugin to load the theme's full Font Awesome CSS without blocking first paint — the largest render-blocking request on blog posts, ~1,050 ms)* |
| `3168324` | 2026-09-30 | HIL Website + HIL SEO | **Merge pull request #38 — SEO audit fixes (titles, share tags, gallery images, admin SEO fields, hil-seo 1.1.6).** Merge commit, so `git revert -m 1 3168324` rolls it back. **Merged and confirmed live by the Owner 2026-09-30**; production re-check: single brand suffix, per-page `og:url`, `og-default.jpg` 200 |
| `c437a95` | 2026-09-30 | HIL SEO + HIL Blog | feat(seo): hil-seo v1.1.6 artifact *(drops " - Haven in Lipa Blog" from post titles over 60 chars, overrides included — 2026-09-30 audit found titles up to 132 chars; Owner uploaded it 2026-09-30, live)* |
| `9a1499b` | 2026-09-30 | HIL SEO | docs(seo): record audit fixes in the SEO Technical Specification |
| `87dd43d` | 2026-09-30 | HIL Website | perf(listing): serve gallery photos through next/image *(listing pages were ~21 MB / LCP 5.7 s: raw `<img>` to 1–4.6 MB Blob originals, rendered twice incl. a CSS-hidden mobile copy; preview measured 622 KB / LCP 1.8 s. Also drops the hero's stale "2" property-count fallback)* |
| `f8b464e` | 2026-09-30 | HIL Website + HIL SEO | fix(seo): single brand suffix, per-page social metadata, admin SEO fields *(property titles read "… \| Haven in Lipa \| Haven in Lipa"; /faq, /about, /privacy, /terms, /ambassadors shared as the homepage; new `src/lib/seo-metadata.ts`, 1200×630 default share image, shorter /faq description, Admin → Edit "Search Engine Listing" SEO title/description fields)* |
| `5f6255f` | 2026-09-28 | HIL Website | **Merge pull request #35 — docs: checkout-abandonment record.** Merge commit, so `git revert -m 1 5f6255f` rolls it back. Docs only |
| `a93e43c` | 2026-09-28 | HIL Website | docs: record checkout-abandonment alerts (DEC-022), Owner test, and #30/#34 live |
| `dab3a0a` | 2026-09-28 | HIL Website | **Merge pull request #34 — remove temporary fix-drive-times route.** Merge commit, so `git revert -m 1 dab3a0a` rolls it back |
| `521aa54` | 2026-09-28 | HIL Website | Merge origin/main into chore/remove-fix-drive-times-route *(branch sync)* |
| `cbfd123` | 2026-09-28 | HIL Website | **Merge pull request #32 — checkout-abandonment alerts + GA4 `add_payment_info` (DEC-022).** Merge commit, so `git revert -m 1 cbfd123` rolls it back. Live and Owner-tested 2026-09-28 |
| `d84689c` | 2026-09-28 | HIL Website | chore: remove temporary fix-drive-times admin route after the production run *(DEC-012/016 one-off route had served its purpose)* |
| `0f2f889` | 2026-09-27 | HIL Website | chore(cron): trigger checkout-abandonment from Vercel Cron every 5 min |
| `c4f13a4` | 2026-09-27 | HIL Website | feat(booking): alert the Owner when a checkout is left unfinished; GA4 `add_payment_info` *(prompted by booking #140 paid 53 min before "I Paid"; DEC-022)* |
| `41d666a` | 2026-09-28 | HIL Website + HIL SEO | **Merge pull request #30 — release `dev` → `main` 2026-09-28** (PRs #24–#28). Merge commit, so `git revert -m 1 41d666a` rolls it back. Live on production 2026-09-28 |
| `142121d` | 2026-09-27 | HIL Website | docs: record dev → main release and reconciliation of production fixes #19–#23 |
| `75be614` | 2026-09-27 | HIL Website | Merge origin/main into release branch *(reconciles production-only fixes #19–#23 into `dev` history)* |
| `6a6a1f6` | 2026-09-27 | HIL Website | **Merge pull request #28 — production drive-time correction tooling.** Merge commit, so `git revert -m 1 6a6a1f6` rolls it back |
| `2a242e1` | 2026-09-27 | HIL Website | Merge origin/dev into fix/property-drive-times-db *(branch sync)* |
| `d3cea57` | 2026-09-27 | HIL Website | docs: record drive-time correction tooling (DEC-016 extension) |
| `b323ead` | 2026-09-27 | HIL Website | feat(maintenance): targeted SM Lipa / Casa Marikit drive-time pass *(fixes stored property text to the Owner-confirmed ~20 / ~30 min figures without overwriting admin edits)* |
| `35d682f` | 2026-09-27 | HIL Website | **Merge pull request #27 — remove leftover manual-fix route from `dev`.** Merge commit, so `git revert -m 1 35d682f` rolls it back |
| `412a842` | 2026-09-27 | HIL Website | Merge origin/dev into chore/remove-manual-fix-route *(branch sync)* |
| `d236376` | 2026-09-27 | HIL SEO + HIL Website | **Merge pull request #26 — `/weddings-accommodation` SEO rework (SEO-DEC-030).** Merge commit, so `git revert -m 1 d236376` rolls it back |
| `8a4afa5` | 2026-09-27 | HIL Website | docs: mark PR #25 analytics entry as merged into dev |
| `4438a3d` | 2026-09-27 | HIL Website | docs: record Owner decline of `Booking.isTest` proposal (DEC-021) |
| `9e7f16b` | 2026-09-27 | HIL Website | docs: record removal of leftover manual-fix route from dev |
| `1ed162c` | 2026-09-27 | HIL Website | chore: remove leftover manual-fix admin route from dev |
| `ae7a7b2` | 2026-09-27 | HIL SEO | Merge origin/dev into seo/weddings-accommodation-rework *(branch sync)* |
| `ea8baf9` | 2026-09-27 | HIL SEO | docs: record SM Lipa / Casa Marikit drive-time fact-check resolution |
| `db0cdbc` | 2026-09-27 | HIL Website + HIL SEO | fix(content): make SM Lipa and Casa Marikit drive times consistent *(Owner-confirmed ~7 km / ~20 min and ~10 km / ~30 min)* |
| `a90c72b` | 2026-09-27 | HIL Website + HIL SEO | **Merge pull request #25 — analytics tracking fixes (DEC-021).** Merge commit, so `git revert -m 1 a90c72b` rolls it back |
| `4f34150` | 2026-09-27 | HIL SEO | docs: record /weddings-accommodation SEO rework (SEO-DEC-030) |
| `9c5a0c7` | 2026-09-27 | HIL SEO + HIL Website | feat(seo): rework /weddings-accommodation for Lipa wedding-destination intent *(title/meta, H1/H2, FAQ 7→9; never claims to be a venue)* |
| `f1578ec` | 2026-09-27 | HIL SEO + HIL Blog | docs: record GA4 gating (DEC-021), stay_match_click finding and Stay Match v1.0.2 |
| `0732962` | 2026-09-27 | HIL Blog | feat(seo): Stay Match plugin v1.0.2 artifact + deploy note *(not deployed — Owner upload)* |
| `e600947` | 2026-09-27 | HIL Website | fix(analytics): gate GA4 to the production host, never load it on /admin *(DEC-021)* |
| `88539d0` | 2026-09-27 | HIL Website + HIL SEO + HIL Blog | **Merge pull request #24 — move layered docs into git-tracked `docs/`.** Merge commit, so `git revert -m 1 88539d0` rolls it back |
| `b9920cb` | 2026-09-27 | HIL Website + HIL SEO + HIL Blog | docs: move layered project docs into `docs/` *(so PRs update the docs alongside code)* |
| `57f0a10` | 2026-09-25 | HIL Website | test(admin): render Guest Messages views in jsdom to pin booking dates *(cherry-pick of `cb02295` onto `dev`)* |
| `818fad4` | 2026-09-25 | HIL Website | fix(admin): render Guest Messages booking dates as UTC calendar dates *(cherry-pick of `4e2d2b9` onto `dev`)* |
| `47af155` | 2026-09-19 | HIL Blog + HIL SEO | docs: record blog WordPress cleanup, verification and scheduled-post checkpoints |
| `e84a0bc` | 2026-09-19 | HIL SEO | chore(seo): add gitignored SEO secrets file with a tracked placeholder template |
| `4b28b07` | 2026-09-19 | HIL SEO + HIL Blog | feat(seo): HIL SEO plugin v1.1.5 *(sitemap, robots and blog-index metadata — the version live after the 2026-09-19 cutover)* |
| `61d2520` | 2026-09-19 | HIL SEO + HIL Blog | docs: record hil-seo/Yoast cutover, verification and post-cutover decisions |
| `bec0f8c` | 2026-09-17 | HIL Website | chore: add temporary admin route for manual booking data fix *(`dev` copy of `25864d0`)* |
| `53844ee` | 2026-09-17 | HIL Website + HIL SEO | docs: record Owner confirmation of Airbnb unlink and PinasBNB boundary |
| `d73112b` | 2026-09-17 | HIL Website + HIL SEO + HIL Blog | chore: unify HIL web and SEO workspace governance *(DEC-018)* |
| `480053f` | 2026-09-27 | HIL Website | **Merge pull request #23 from `cedcas/fix/verify-stripe-payment-server-side` — fix(payments): verify Stripe PaymentIntent server-side before confirming bookings.** Merged 18:45 CT and deployed to production. Merge commit, so `git revert -m 1 480053f` rolls it back. No schema change (see Website spec → Payments, [DEC-020](HIL_DECISIONS.md)) |
| `fb3933b` | 2026-09-27 | HIL Website | fix(payments): verify Stripe PaymentIntent server-side before confirming bookings *(closes a gap where `/api/bookings` auto-confirmed a card booking on any client-sent `stripePaymentIntentId` and `/api/stripe/payment-intent` charged a client-sent amount: stays and charges are now priced server-side (`src/lib/booking-quote.ts`), and the intent is retrieved and checked for succeeded + PHP + exact amount + matching metadata + not reused (`src/lib/stripe-payment.ts`) in `/api/bookings` and `/api/charges/[token]/pay`; promo discount now computed on the server nightly total; 9 files, +952/−130, tests with mocked Stripe/Prisma)* |
| `c4f6345` | 2026-09-25 | HIL Website | **Merge pull request #22 from `cedcas/fix/messages-booking-date-utc` — fix(admin): Guest Messages booking dates display one day early.** Merge commit, so `git revert -m 1 c4f6345` rolls it back |
| `cb02295` | 2026-09-25 | HIL Website | test(admin): render Guest Messages views in jsdom to pin booking dates *(mounts the real `GuestMessageThreads`/`ThreadDetail` under Chicago, Manila and UTC so a Sep 28–30 booking must read 9/28–9/30; fails against the unfixed components; adds `jsdom` as a test-only devDependency)* |
| `4e2d2b9` | 2026-09-25 | HIL Website | fix(admin): render Guest Messages booking dates as UTC calendar dates *(thread list and header formatted UTC-midnight `checkIn`/`checkOut` with a timezone-less `toLocaleDateString`, so dates showed one day early west of UTC; now `formatStayDate` via a new `formatStayRangeShort` helper. Display-only — no stored dates, pricing or availability touched)* |
| `9ff8ebc` | 2026-09-17 | HIL Website | **Merge pull request #21 from `cedcas/remove-manual-fix-route` — remove temporary manual-fix admin route.** Merge commit, so `git revert -m 1 9ff8ebc` rolls it back. Cleanup after both manual corrections below were confirmed applied |
| `111ca40` | 2026-09-17 | HIL Website | chore: remove temporary manual-fix admin route *(deletes `src/app/api/admin/dev/manual-fix/route.ts` now that it served its one-off purpose, per [DEC-012](HIL_DECISIONS.md))* |
| `16375d1` | 2026-09-17 | HIL Website | **Merge pull request #20 from `cedcas/manual-booking-fix-temp` — sequence manual-fix route writes instead of checking both up front.** Merge commit, so `git revert -m 1 16375d1` rolls it back |
| `ce19da1` | 2026-09-17 | HIL Website | fix: sequence manual-fix route writes instead of checking both up front *(PR #19 merged one commit before this fix landed on its branch, so production briefly ran the version that checks guest A's move and guest B's extension against one up-front DB snapshot — which 409'd on guest B's step, before any writes, because guest B's property shares an inventory group with Cozy 1-BR and guest A's then-current booking there derived a block onto guest B's listing. Fixed by applying guest A's move first (+ reconciling derived blocks), then re-checking guest B fresh against the post-move state before her extension applies. No data was ever written incorrectly — the old version aborted before touching the DB)* |
| `3218874` | 2026-09-17 | HIL Website | **Merge pull request #19 from `cedcas/manual-booking-fix-temp` — add temporary admin route for manual booking data fix.** Merge commit, so `git revert -m 1 3218874` rolls it back. Superseded same-day by `16375d1`/`ce19da1` above before any writes occurred |
| `25864d0` | 2026-09-17 | HIL Website | chore: add temporary admin route for manual booking data fix *(Owner-requested direct-DB correction, done the [DEC-012](HIL_DECISIONS.md) way — a hardcoded, admin-gated `GET`/`POST /api/admin/dev/manual-fix` route rather than a raw SQL edit, so pricing fields and shared-inventory `AvailabilityBlock` rows stay consistent. Two corrections: booking #130 (guest A) moved from Cozy 1-BR to Mickey Sleeps 7 with dates/price untouched (already paid); booking #136 (guest B) extended checkOut 9/18/26→9/19/26 with totalPrice ₱1,500→₱3,000 (a second payment the Owner had collected separately). Both applied successfully on 2026-09-17 after the `ce19da1` fix, confirmed via the route's own JSON response, then the route was deleted (`111ca40`))* |
| `77e31af` | 2026-09-07 | HIL Website | **Merge pull request #18 from `cedcas/dev` — repair Build and Lint GitHub Actions checks.** Merge commit, so `git revert -m 1 77e31af` rolls it back. **Deployed and independently verified live** (deployment id `6311803597`, sha matches the merge commit exactly, `Production`/`success` per DEC-006): `/sitemap.xml` live and dynamic with real DB data, chatbot's DB-backed nodes present, booking flow and admin routes responding, both QR images' live hashes match the hashes baked into the bundle |
| `3f784c1` | 2026-09-07 | HIL Website | fix(ci): repair Build and Lint GitHub Actions checks *(both checks had failed on every PR for months, confirmed identical on PR #16 and #17 — neither PR's fault. Build: `/sitemap.xml` and the layout-mounted `getChatTree()` both queried Prisma unguarded at static-export time, crashing any statically-prerendered page against CI's placeholder `DATABASE_URL`. Lint: 9 real errors from `eslint-config-next` 16's stricter rules. Fixed the architecture — dynamic sitemap via the existing cached `getPublicListings()` helper, a graceful DB-fallback in `getChatTree()`, a new `build:app` script so CI never runs `prisma db push` — rather than suppressing either check. See [DEC-017](HIL_DECISIONS.md))* |
| `5e5e628` | 2026-09-07 | HIL SEO + HIL Website | **Merge pull request #17 from `cedcas/dev` — FAQ #2 direct booking links, consolidate check-in/checkout FAQs (24→23).** Merge commit, so `git revert -m 1 5e5e628` rolls it back. Deployed and verified live 2026-09-07 (deployment id `6310351609`, `Production`/`success`) |
| `c68c284` | 2026-09-07 | HIL SEO + HIL Website | fix(content): FAQ #2 direct booking links, consolidate check-in/checkout FAQs *(FAQ #2 now links all 5 property names directly to `/properties/<slug>#book` instead of only "Cozy 1-Bedroom" to the generic `/#properties`; FAQ #12+#13 merged into one Owner-approved check-in/checkout answer, count 24→23, homepage teaser derives from `faqs.length` so it updated automatically; also caught and fixed a pre-existing dead-link bug on the WiFi FAQ via a new regression test, `src/lib/__tests__/faqs.test.ts`)* |
| `9684ed0` | 2026-09-07 | HIL Website | **Merge pull request #16 from `cedcas/dev` — Post-FAQ follow-ups: Stripe terminology, Manila travel-time, and hourly fee workflow.** Merge commit, so `git revert -m 1 9684ed0` rolls it back. Deployed and verified live 2026-09-07 (deployment id `6309859383`, `Production`/`success`); the Payment Methods admin field this PR shipped was then used for an Owner-authorized direct database correction on all 5 properties (see [DEC-015](HIL_DECISIONS.md)) |
| `14f7a5d` | 2026-09-07 | HIL Website | fix(content): correct three issues Owner review found in the proposed data *(Owner review of the production content-correction dry run caught a would-have-reverted Cozy 1BR price (₱1,800→stale ₱2,000), leftover "car is safe"/"secure"-parking safety-guarantee wording on Spacious 2BR and two Mickey/B38 fields, and a missing backup-internet mention on B34's WiFi FAQ answers — all three fixed before any production write)* |
| `8015076` | 2026-09-06 | HIL Website | feat(maintenance): add dry-run-first production content correction script *(`scripts/fix-property-content.ts` — dry-run-by-default, `--execute`-gated, transactional, self-verifying; built to fix stale Maculot/internet-speed/parking-incident content a read-only audit confirmed was still live. **Incident during development, fully resolved**: an early version's import of the seed files triggered their own unconditional `main()` write routine, reaching production before this script's own safety checks ran — a read-only re-audit confirmed zero content actually changed, only two `updatedAt` timestamps moved; root-caused and fixed via [DEC-016](HIL_DECISIONS.md))* |
| `8b0a91c` | 2026-09-06 | HIL Website | feat(admin): add targeted Payment Methods field to the property form *([DEC-015](HIL_DECISIONS.md) — a single-key admin field with a server-side JSON merge, `src/lib/pricing-notes.ts`, that can never clobber sibling `pricingNotes` values; built after a read-only audit confirmed the stale "Stripe / credit card" text was genuinely live on all 5 properties)* |
| `d8f2c41` | 2026-09-06 | HIL Website | fix(content): Owner-approved FAQ corrections — Maculot, payment timing, SMS, parking, internet *(five corrections from the Owner's manual FAQ review, applied across every customer-facing surface, not just `/faq`: Mt. Maculot removed with no replacement invented, payment-verification timing corrected to "within a few minutes," the SMS arrival-instructions promise corrected to "by email and/or FB Messenger," parking facts corrected to the Fortuner/Vios/street-parking wording with the "never had an incident" guarantee removed everywhere, internet-speed figures corrected to "up to 340/520 Mbps" plus a new backup-connection fact)* |
| `a421278` | 2026-09-06 | HIL Website | fix(content): finish Manila travel-time standardization *(two more conflicting travel-time mentions found in a fuller codebase sweep — the homepage `DiscoverLipa` map graphic and `/staycation`'s intro paragraph — standardized to "about one hour," matching the chatbot lines already fixed in `8f535f3`)* |
| `a401e00` | 2026-09-06 | HIL Website | feat(admin): add Early Check-In / Late Checkout to AdditionalCharge workflow *([DEC-014](HIL_DECISIONS.md) — wires the published ₱200/hour fee into the existing `AdditionalCharge` model as a new creation mode rather than a schema migration; `src/lib/hourly-fee.ts` is the single source of truth for the rate; the server always computes the total from a whole-hours count, never trusts a client-supplied amount)* |
| `8f535f3` | 2026-09-06 | HIL Website | fix(content): replace customer-facing Stripe branding with Credit/Debit Card *(neutral "Credit/Debit Card" wording everywhere a guest sees a payment option — `/about`, `/staycation`, `/properties`, property pages, `/weddings-accommodation`, the booking-confirmation email, and the SEO seed data; `/privacy`'s actual data-processor disclosure and all internal/SDK/webhook code left untouched; also standardized the chatbot's stale "1.5 hours from Manila" line to "about one hour")* |
| `cc3e83d` | 2026-09-06 | HIL SEO + HIL Website | **Merge pull request #15 from `cedcas/dev` — implement remaining approved FAQ audit recommendations.** Merge commit, so `git revert -m 1 cc3e83d` rolls it back. Deployed and verified live 2026-09-07 (deployment id `6300670822`, `Production`/`success`) — closed the entire 2026-09-06 FAQ audit (SEO-DEC-013 through SEO-DEC-018) |
| `1fe3d76` | 2026-09-06 | HIL SEO + HIL Website | fix(content): implement remaining approved FAQ audit recommendations *(SEO-DEC-013 through SEO-DEC-017 — FAQ count 14→24, adds B38 "Mickey in Lipa" coverage previously entirely absent from the public FAQ, splits check-in into B34 (2PM)/B38 (3PM) with the new hourly fee, corrects Cozy 1-Bedroom's capacity to match live `maxGuests`, drops "Stripe" naming; chatbot and `/terms` §5 updated to match)* |
| `3e26d4a` | 2026-09-06 | HIL Website | **Merge pull request #14 from `cedcas/dev` — remove free-rebooking offer from public FAQ and chatbot.** Merge commit, so `git revert -m 1 3e26d4a` rolls it back |
| `f34fed1` | 2026-09-06 | HIL SEO + HIL Website | fix(content): remove free-rebooking offer from public FAQ and chatbot *(SEO-DEC-018 — the "free rebooking within 14 days" offer removed from the two code-tracked surfaces presenting it as public policy; rebooking may still be considered privately at the Owner's discretion, but is never published as a policy, guarantee, or entitlement; the approved 100%/50%/0% cancellation tiers are unchanged)* |
| `5b1a422` | 2026-09-02 | HIL Website | **Merge pull request #13 from `cedcas/dev` — Guest Messages thread list hangs forever on fetch failure.** Merge commit, so `git revert -m 1 5b1a422` rolls it back. Opened and merged 2026-09-02; CI's Build/Lint checks were red on this PR but pre-date it (Build fails in GitHub Actions because it can't reach a DB at `localhost:3306`; Lint has several unrelated long-standing violations) — the actual **Vercel build passed**, which is what gates production |
| `953d54c` | 2026-09-02 | HIL Website | fix(admin): Guest Messages thread list hangs forever on fetch failure *(reported: `/admin/messages` stuck on "Loading threads…" indefinitely. Root-caused in [`GuestMessageThreads.tsx`](../src/components/admin/GuestMessageThreads.tsx) — the fetch effect's `.catch()` was written to only expect `AbortError` but silently swallowed **every** rejection, so any real failure (expired session, transient 500, non-JSON error body) left `threads` state at `null` forever with zero signal to the admin. Verified the backend itself was healthy end-to-end first — hand-crafted a valid Auth.js session JWT with `@auth/core/jwt`'s `encode()` against the local `.env` (which points at the **production** Hostinger DB) and confirmed `/api/admin/guest-messages/threads` returns a clean 200 with real thread data; the route, Prisma query, and `auth()` were never the problem. Fix now distinguishes abort from real errors, shows the failure message, and adds a "Try again" button — next occurrence will self-diagnose instead of hanging silently. **Unresolved:** the actual trigger for the original stuck-loading report was never pinned down (most likely a stale/expired session cookie) — if it recurs, the new error banner should reveal the real cause)* |
| `fde9b3d` | 2026-08-31 | HIL Website | **Merge pull request #11 from `cedcas/dev` — materialize scheduled guest messages for Stripe bookings.** Merge commit, so `git revert -m 1 fde9b3d` rolls it back. Opened 2026-08-30, merged and **verified on Production** 2026-08-31 |
| `6f6f0f7` | 2026-08-30 | HIL Website | fix(booking): materialize scheduled guest messages for **Stripe** bookings *(root-caused from a real guest report — a confirmed booking that received none of its scheduled QuickReplies. `materializeScheduledMessagesForBooking()` was called **only** from the admin `pending → confirmed` route; a Stripe booking is created already `confirmed` and never passes through that transition, so it silently got zero `ScheduledMessage` rows — no error, and the hourly cron simply had nothing queued. GCash/BPI were unaffected. `POST /api/bookings` now makes the same call when `isStripeConfirmed`. **Second gotcha, documented not fixed:** the admin inbox thread list is derived from existing `GuestMessage` rows, so a booking with zero messages is invisible there — which is how this went unnoticed)* |
| `bffa488` | 2026-08-31 | HIL Website | fix(ui): `/staycation` and `/weddings-accommodation` used the **pink** token as a page background *(**`--color-cream` is `#F5BECA` — a saturated pink, not the warm off-white the name implies.** CLAUDE.md still documents it as `#F9F5EE`, which it has not been for some time. Both pages inherited `bg-cream min-h-screen` from the `/faq` + `/properties` pattern without anyone checking the token's value. Now `bg-offwhite` (`#FFF8FA`), the exact value `body` already sets, so they match the homepage. **Still pink and not in scope of the report:** `/properties`, `/faq`, `/about`, `/ambassadors`, `/privacy`, `/terms`, `/pay/[token]`)* |
| `dfeb239` | 2026-08-31 | HIL SEO + HIL Website | **Merge staycation — `/staycation`, cluster C1's landing page** ([PR #12](https://github.com/cedcas/CedCasProperties/pull/12)). Merge commit, so `git revert -m 1 dfeb239` rolls the whole thing back |
| `6fc4b60` | 2026-08-31 | HIL SEO + HIL Website | feat(seo): **`/staycation`** — cluster C1's landing page, and blog article #6's consolidation target *(C1 was at **zero clicks** with no page answering "what does a Lipa staycation cost". **`FAQPage` only**; sitemap 0.9 monthly. Everything numeric derives from the DB — rate table, "start at X run to Y for the whole N-person house", the "From" prefix, the title's home count. Two things the draft hardcoded are now sourced too: **check-in/checkout from `housePolicies` per house**, and the **solar claim resolved through the inventory group** holding `cozy-1-bedroom` so it can never migrate to the Mickey house, which has no solar. Capacity reuses `deriveHouses()` from `7fa3421` — two houses, 24, not five listings and 47. **Carries the in-repo half of the article #6 repoint**: footer fallback list, `/about`, property-page "Why book direct" button. ⛔ **The WordPress 301 must not be added until the other 22 posts are repointed** — order is build → repoint → 301)* |
| `f0027cc` | 2026-08-17 | HIL Website | chore: re-trigger the Vercel production deploy *(**the push of `00ca46a` to `main` produced no Vercel deployment at all** — no Production record, no Preview, 25 minutes after the push, while GitHub Actions ran on the commit normally. Every prior release in the deployments log shows a Production build within ~60s of the main push, so the Git-integration webhook missed this one. An empty commit fired it; live 90s later. **Worth remembering: a merge to `main` is genuinely not a deploy — always confirm the URL returns 200**)* |
| `00ca46a` | 2026-08-17 | HIL SEO + HIL Website | **Merge dev — `/weddings-accommodation`, the wedding-party money page** ([PR #10](https://github.com/cedcas/CedCasProperties/pull/10)). Merge commit, so `git revert -m 1 00ca46a` rolls the whole thing back |
| `7fa3421` | 2026-08-17 | HIL SEO + HIL Website | feat(seo): **`/weddings-accommodation`** — whole homes for the wedding party *(first page of the new C7 Occasions & Groups cluster. **`FAQPage` and nothing else** — no `EventVenue`, no `Event`, no `BreadcrumbList`: we are not a wedding venue and the FAQ says "No" to the ceremony question in as many words. Capacity **derived from shared inventory**, not hardcoded — five listings are two houses, so simultaneous capacity is **24, not 47**; new `getPublicListingGroups()` + pure `deriveHouses()`/`totalHouseCapacity()` in `src/lib/listings.ts`, with the repo's first `listings.test.ts`. Owner-verified drive times used as written; hotel cost comparison stays qualitative. Sitemap priority 0.8, monthly. `/staycation` omitted rather than linked — **now added, see `6fc4b60`**)* |
| `26629a4` | 2026-08-16 | HIL Website | **Merge dev — correct the session wrap-up protocol in `CLAUDE.md`.** Docs only |
| `ce03911` | 2026-08-16 | HIL Website | docs(claude): wrap-up protocol pointed at a **retired** `## Recent Commits` block *(it told future sessions to maintain that block at the top of `HIL Technical Specification.md`, which became a pure index on 2026-06-26 and says the block was retired in favour of this file — following it meant reversing a documented decision and duplicating this log. Rewritten to describe the four-document structure as it is; also records that `About HIL/` is gitignored on purpose and that the SEO developer has live read access to it)* |
| `c62d603` | 2026-08-16 | HIL Website | **Merge dev — cache the public listing query instead of the response.** Merge commit, so `git revert -m 1 c62d603` rolls it back |
| `c2c5e6b` | 2026-08-16 | HIL Website | fix(perf): cache the listing **query**, not the response — Vercel drops a page's `next.config.ts` `Cache-Control` *(**production verification of `9a8e47c`/`6a0da20` found the intended edge cache was never active** — `x-vercel-cache: MISS` + `no-store` on every request. A Route Handler can set response headers, an App Router **page** cannot. Replaced with `unstable_cache` (1 h) in `src/lib/listings.ts`; the two inert `next.config.ts` entries removed. `next start` locally DID honour the header — that is what made it a false positive pre-deploy)* |
| `506c4c0` | 2026-08-16 | HIL SEO | **Merge dev — `/properties` index, `/contact` redirect, `/about` all five homes.** Merge commit, so `git revert -m 1 506c4c0` rolls the whole thing back. Three independent fixes from the 081526 Full Audit |
| `6a0da20` | 2026-08-16 | HIL SEO + HIL Website | fix(seo): `/about` described **2 of 5 homes** — now rendered from the DB with the same gate as `/properties` *(the stale count was in five places, not one: `<h2>`, intro, section heading, meta description and the Person JSON-LD. Page became `force-dynamic`; shared helpers extracted to `src/lib/listings.ts`. **Deviation:** the Person `description` was edited despite the brief's "leave the JSON-LD alone" — it claimed "two short-term rental homes")* |
| `b64ce9a` | 2026-08-16 | HIL SEO | fix(seo): `/contact` → `/#contact` **308** instead of a hard 404 *(`next.config.ts` owns routing — `vercel.json` is `{}` and middleware is scoped to `/admin/:path*`)* |
| `9a8e47c` | 2026-08-16 | HIL SEO + HIL Website | feat(seo): **`/properties` inventory index** — the route was a hard 404 *(Prisma directly, NOT a self-fetch of the feed; `force-dynamic` + `s-maxage`, never `revalidate`; `ItemList` + `BreadcrumbList`, no `Offer`. `PropertyCard` gains a `variant` prop. Sitemap priority 0.9)* |
| `2579b6b` | 2026-08-16 | HIL Website | feat(ambassadors): new annual reward tiers + updated example *(Bronze 1–5 ₱200 · Silver 6–10 ₱300 · Gold 11–15 ₱400 · Platinum 16+ ₱500; tiers now calendar-year and reset each January. **Pushed straight to `main` without a dev-preview check** — copy/constants only)* |
| `6d38e42` | 2026-08-16 | HIL SEO | **Merge dev — public property feed, robots prefix fix, derived review aggregates** ([PR #9](https://github.com/cedcas/CedCasProperties/pull/9)). Merge commit, so `git revert -m 1 6d38e42` rolls the whole thing back |
| `2dc488b` | 2026-08-16 | HIL SEO | fix(seo): serve `properties.json` dynamically with an edge cache, not via ISR |
| `95cc36e` | 2026-08-16 | HIL SEO | fix(seo): derive Mickey review aggregates from active `Testimonial` rows; stop seeding drift-prone prose |
| `f2535a8` | 2026-08-16 | HIL SEO | fix(seo): disallow `/admin` and `/api` as prefixes, not just `/admin/` and `/api/` *(robots.txt matching is a plain prefix — bare `/admin` was crawlable and 307s into disallowed space)* |
| `f66295e` | 2026-08-16 | HIL SEO | feat(seo): public read-only property feed at `/api/properties.json` *(consumed server-side by WordPress, which does not consult robots.txt)* |
| `4e5cf70` | 2026-08-09 | HIL Website | **Merge dev — GA4 conversion tracking, booking friction reduction, CSP collection fix** ([PR #8](https://github.com/cedcas/CedCasProperties/pull/8)). Merge commit, so `git revert -m 1 4e5cf70` rolls the whole thing back |
| `d1a98ef` | 2026-08-08 | HIL Website | feat(analytics): GA4 events 2–4 — `generate_lead`, `book_click`, `check_availability` *(markup-driven click tracker; `book_click`/`check_availability` deliberately NOT key events)* |
| `a22830d` | 2026-08-08 | HIL Website | fix(csp): allow the bare `analytics.google.com` + `www.google.com` GA4 endpoints *(a CSP wildcard needs a leading label, so `*.analytics.google.com` never matched the bare host)* |
| `d829b24` | 2026-08-08 | HIL Website | fix(csp): allow GA4 regional collection endpoints in `connect-src` *(**GA4 had been collecting nothing at all** — every hit refused, silently. See Website spec → Security → CSP)* |
| `0c0133e` | 2026-08-08 | HIL Website | feat(booking): reduce booking friction *(fee breakdown, sticky bar, occupancy notes, vague-charge prose)* + GA4 `booking_confirmed` conversion with a server-authoritative `value` |
| `5ed7c1f` | 2026-08-08 | HIL Website | fix(admin): show the year when it is not the current one *(2026 and 2027 blocks rendered identically and read as duplicates)* |
| `3c9d3fb` | 2026-08-08 | HIL Website | **Merge dev — shared inventory groups, availability blocks, persisted external calendar events, /admin/calendar.** Merge commit, so `git revert -m 1 3c9d3fb` rolls the whole feature back |
| `0274def` | 2026-08-08 | HIL Website | fix(sync): retract imported events only from today forward; never rewrite history *(also: clearing an iCal URL no longer strands events)* |
| `fa59b91` | 2026-08-07 | HIL Website | fix(admin): blocks table heading says "in this window", not "upcoming" |
| `a45671c` | 2026-08-07 | HIL Website | fix(inventory): stop bidirectional-sync echoes propagating to siblings *(cross-link deadlock)* |
| `9a669a6` | 2026-08-06 | HIL Website | fix(admin): distinguishable calendar markers *(`bg-charcoal` is a GREEN)*, clarify the blocks table |
| `cb9a77e` | 2026-08-06 | HIL Website | test: vitest suite for availability logic, CI job, scheduler backstop *(repo's first tests)* |
| `180b95f` | 2026-08-06 | HIL Website | feat(admin): availability calendar and inventory-group management UI |
| `7840998` | 2026-08-06 | HIL Website | refactor(api): route availability through the central service |
| `0a14b4a` | 2026-08-06 | HIL Website | feat(api): admin routes for blocks and inventory groups, plus sync cron |
| `20eb48f` | 2026-08-06 | HIL Website | feat(lib): centralised availability service, iCal module, inventory reconciler |
| `d934512` | 2026-08-06 | HIL Website | feat(schema): shared inventory groups, availability blocks, external events |
| `9e62bb6` | 2026-07-04 | HIL Website | fix(pricing): normalize base rate in page metadata (seoDescription) too |
| `2d9fa1f` | 2026-07-04 | HIL Website | fix(pricing): normalize base-rate/included-guest numbers in prose to DB values *(+ corrected Cozy 1BR stored ₱2,000 → ₱1,800)* |
| `57ab099` | 2026-07-04 | HIL Website | fix(pricing): card shows "Sleeps up to {max}" + conditional "From" price *(+ grammar fix "are charge" → "are charged" in Cozy/Spacious house rules)* |
| `b893f9c` | 2026-07-04 | HIL Website | feat(pricing): surface extra-guest fee occupancy note on property page + card *(+ DB migration scrubbing hardcoded fee amounts to number-free, drift-proof prose)* |
| `36fa136` | 2026-07-04 | HIL SEO | fix(seo): noindex + self-canonical on /book route segment |
| `97bc3fc` | 2026-07-01 | HIL Website | feat(admin): editable internal comments on bookings/customers + mobile sidebar drawer (#7) |
| `f689262` | 2026-06-29 | HIL Website | Feat/additional charges (#6) — merges the additional-charges + Quick Reply "Applies To" work |
| `b190204` | 2026-06-29 | HIL Website | feat(messages): multi-property "Applies To" for Quick Replies *(merged to main via #6 / `f689262`)* |
| `8d5fed3` | 2026-06-28 | HIL Website | feat(charges): add additional-charges pay-by-link for guests (#5) |
| `658ea07` | 2026-06-26 | HIL Website | feat(ambassadors): add Ambassador Program enrollment page + admin review |
| `e5c0749` | 2026-06-25 | HIL Website | feat(admin): add editable notes field to promo codes |
| `d5c6ae7` | 2026-06-25 | HIL SEO | fix(seo): align VacationRental JSON-LD with Google's canonical spec |
| `a81c71e` | 2026-06-25 | HIL SEO | fix(seo): clear VacationRental structured-data validation errors |
| `5aad1a0` | 2026-06-24 | HIL Website | feat(admin): add booking detail view + Customers page |
| `7f07fa2` | 2026-06-18 | HIL Website | fix(property): label pricing line "Payment" instead of "Deposit" |
| `0b284fc` | 2026-06-18 | HIL SEO + HIL Website | feat(seo): add SEO/signal content for 3 Mickey listings; full-payment deposit |
| `c44b5d0` | 2026-06-18 | HIL Website | fix(dates): render stay dates as calendar dates, not tz-shifted |
| `9221872` | 2026-06-16 | HIL Website | docs(terms): simplify House Rules to per-property observance + late-fee notice |
| `e43b090` | 2026-06-16 | HIL Website | fix(admin): unblock image upload — allow Vercel Blob in CSP connect-src |
| `df91988` | 2026-06-14 | HIL Website | feat(booking): per-property extra guest fee + enforce max-guest cap |
| `382b272` | 2026-06-14 | HIL Website | fix(csp): allow OpenStreetMap in frame-src so property map renders |
| `02a94c3` | 2026-06-14 | HIL Website | fix(property): replace broken Google map with OSM embed on BellaVita |
| `1b37794` | 2026-06-14 | HIL Website | fix(admin): upload images via Vercel Blob client to bypass 413 limit |
| `b89aa03` | 2026-06-14 | HIL Website | fix(admin): persist propertyRules on property create/edit |
| `57f4389` | 2026-06-11 | HIL SEO | content(seo): prefix "From" on price in property heroSummary |
| `360048d` | 2026-06-11 | HIL Website | feat(pricing): prefix "From" on advertised nightly rates |
| `2a38d08` | 2026-06-11 | HIL Website | feat(pricing): single source of truth — weekday/base rate + required weekend |
| `f850ab5` | 2026-06-08 | HIL Website | docs(claude): require last-5-commits block atop spec on every update |
| `1408071` | 2026-06-07 | HIL Website | fix(booking): correct country dropdown / phone input sizing |
| `7367cb8` | 2026-06-07 | HIL Website | feat(booking): international phone validation with country dropdown |
| `66897c0` | 2026-06-06 | HIL Website | feat(booking): validate PH phone on details step, not final submit |
| `95cd6f6` | 2026-06-05 | HIL Website | feat(promo): scope discount codes to specific properties |
| `b022081` | 2026-06-02 | HIL Website | perf(hero): inline SVG for 7 above-the-fold icons |
| `d4be460` | 2026-06-02 | HIL Website | perf(ScrollReveal): batch layout reads and writes to avoid forced reflow |
| `4b300b1` | 2026-05-31 | HIL SEO | fix(seo): use makesOffer instead of offers on VacationRental schema |
| `a65ef16` | 2026-05-31 | HIL SEO | feat(seo): add optional additionalType to property JSON-LD |
| `918c5e5` | 2026-05-31 | HIL SEO | feat(seo): add Offer schema, FAQ internal links, area-level property map |
| `0663de1` | 2026-05-29 | HIL Website | perf(homepage): revert Montserrat to swap and truly defer Font Awesome |
| `cb6e404` | 2026-05-26 | HIL Website | perf(fonts): use display: optional for Montserrat to stabilize LCP |
| `3dbfe23` | 2026-05-26 | HIL Website | perf+a11y(homepage): address PageSpeed Insights findings |
| `baeb40d` | 2026-05-21 | HIL Blog | fix(footer): title-case Yoast focus keyphrases for Plan Your Trip labels |
| `84f1230` | 2026-05-21 | HIL Blog | chore: gitignore /blog/ (WP plugin source, deployed to blog.haveninlipa.com) |
| `2c8dd6a` | 2026-05-21 | HIL Blog | feat(footer): pull Plan Your Trip links from WP REST API |
| `e229de7` | 2026-05-17 | HIL Website | feat(messaging): paginate admin Contact and Guest message lists |
| `22b5652` | 2026-05-17 | HIL SEO | fix(seo): drop additionalType field — Google validator rejects every value |
| `106eb01` | 2026-05-17 | HIL SEO | fix(seo): use bare additionalType strings per Google VacationRental spec |
| `4b209ca` | 2026-05-17 | HIL SEO | fix(seo): replace invalid additionalType HouseAndApartment with House |
| `02f6bf5` | 2026-05-17 | HIL SEO | feat(seo): close remaining Rich Results Test gaps on rental + business schemas |
| `98444ec` | 2026-05-08 | HIL SEO | fix(seo): clear remaining Rich Results Test warnings on property pages |
| `54da1a8` | 2026-05-08 | HIL SEO | fix(seo): VacationRental JSON-LD now passes Google Rich Results Test |
| `338d0f2` | 2026-05-08 | HIL SEO | feat(seo): implement May 8 audit recommendations across the codebase |
| `06e6eba` | 2026-05-07 | HIL Website | feat(messaging): inbound email reply pipeline + ContactMessage promotion |
| `925ddcd` | 2026-05-05 | HIL Website | chore(messaging): remove temp phone-backfill dev route |
| `d750ee6` | 2026-05-05 | HIL Website | chore(messaging): add temp admin route to backfill guestPhone to E.164 |
| `c0813e3` | 2026-05-05 | HIL Website | feat(booking): normalize guestPhone to E.164 on write |
| `fc63197` | 2026-05-05 | HIL Website | feat(messaging): admin UI + 2-way inbound webhook for SMS |
| `7ebf107` | 2026-05-05 | HIL Website | feat(messaging): add SMS channel via Twilio with quiet-hours scheduler |
| `512de53` | 2026-05-02 | HIL Website | fix(booking): don't route Windows touchscreen laptops to QR share sheet |
| `cccbfbe` | 2026-05-01 | HIL Website | ci(messaging): cancel in-progress runs of scheduled-messages workflow |
| `f448b71` | 2026-05-01 | HIL Website | chore(qr): retire per-property QR variants in favor of single generic QRs |
| `7909d03` | 2026-05-01 | HIL Website | feat(booking): mobile-first Save QR to Photos UX with copy chip and step-by-step instructions |
| `9487a99` | 2026-04-25 | HIL Website | feat(messaging): track sourceQuickReplyId for template attribution |
| `dd14091` | 2026-04-25 | HIL Website | feat(messaging): sort quick reply picker — manual first, then alphabetical |
| `70e6fa6` | 2026-04-25 | HIL Website | feat(messaging): manual quick replies load into composer instead of sending |
| `1100226` | 2026-04-25 | HIL Website | chore(dev): remove temporary backfill endpoint |
| `22002e8` | 2026-04-25 | HIL Website | fix(dev): rename _dev to dev so Next.js App Router actually registers the route |
| `0319840` | 2026-04-25 | HIL Website | chore(dev): temporary admin-only backfill endpoint for demo threads |
| `34f7aa9` | 2026-04-25 | HIL Website | fix(messaging): narrow Prisma trigger/anchor strings at server→client boundary |
| `ad8c7cd` | 2026-04-25 | HIL Website | chore(cron): move hourly scheduled-messages trigger from Vercel to GitHub Actions |
| `ab329f9` | 2026-04-25 | HIL Website | feat: Guest Messaging System Phase 1 (outbound email + QuickReplies + scheduler) |
| `7ba3fb9` | 2026-04-13 | HIL Website | feat: add Messenger handoff to Haven chatbot + update Facebook URLs to vanity username |
| `882ea0b` | 2026-04-13 | HIL Website | chore: replace stale cedcasproperties.com references with haveninlipa.com |
| `92467e4` | 2026-04-13 | HIL Website | Revert "Revert "feat: replace default Vercel favicon with Haven in Lipa logo"" |
| `9ddef97` | 2026-04-13 | HIL Website | Revert "feat: replace default Vercel favicon with Haven in Lipa logo" |
| `15f9b00` | 2026-04-13 | HIL Website | feat: replace default Vercel favicon with Haven in Lipa logo |
| `c0d2110` | 2026-04-11 | HIL Website | feat: move logo to navbar, remove hero logo |
| `3d230a8` | 2026-04-11 | HIL Website | feat: add Haven chatbot (Phase 0 — rule-based decision tree) |
| `52a9f97` | 2026-04-11 | HIL Website | feat: add /privacy and /terms pages, require terms checkbox on booking |
| `cbc7825` | 2026-04-11 | HIL Website | feat: add change-password page to admin panel |
| `7d4b7c3` | 2026-04-11 | HIL Website | fix: restore AdminUser role, AdminPermission, AdminLog models |
| `e4f256a` | 2026-04-11 | HIL Website | feat: auto-confirm Stripe bookings, default country to PH, update emails |
| `03db795` | 2026-04-11 | HIL Website | feat: add QR code integrity protection (SRI) for payment page |
| `41aaab6` | 2026-04-09 | HIL Website | feat: add Google Analytics tag (G-2SV2PXYB7T) |
| `cec0f0f` | 2026-04-07 | HIL Blog | feat: add Blog link to navbar linking to blog.haveninlipa.com (NET-101) |
| `1db44a6` | 2026-04-07 | HIL Website | fix: update guest count to 280+, fix weekend pricing to Fri-Sat (NET-91/NET-99) |
| `8bfe9be` | 2026-04-07 | HIL Website | feat: redesign FAQ section — open card grid replaces accordion (NET-98) |
| `f6e7def` | 2026-04-07 | HIL Website | fix: update stats to 5.0/280+ guests/Superhost, add Welcome Book note (NET-97) |
| `57cbaaa` | 2026-04-07 | HIL SEO | feat: implement SEO homepage copy + property page content (NET-97) |
| `4f88201` | 2026-04-07 | HIL Website | fix: default role to 'admin' for sessions missing role field (NET-94) |
| `4374247` | 2026-04-07 | HIL SEO | feat: implement Technical SEO Foundation Pack (NET-93) |
| `76a169d` | 2026-04-07 | HIL Website | merge: resolve dev → main conflicts (NET-92) |
| `5066dce` | 2026-04-07 | HIL Website | feat: user management, event log, manager role & deployment info (NET-92) |
| `96f6119` | 2026-04-05 | HIL Website | fix: revert all transactional email from Resend back to SMTP/Nodemailer (NET-31) |
| `5394578` | 2026-04-05 | HIL Website | fix: move Resend instantiation inside handler to fix build (NET-84) |
| `07cd9a7` | 2026-04-05 | HIL Website | fix: fetch actual daily rates in BookingCard (NET-83) |
| `182a827` | 2026-04-05 | HIL Website | fix: guard against invalid Stripe publishable key format (NET-39) |
| `abd52e6` | 2026-04-04 | HIL Website | fix: cast propertyRules && !rulesAgreed to boolean for disabled prop |
| `acf2e2e` | 2026-04-04 | HIL Website | fix: improve image upload error handling and align brand colors |
| `f46219e` | 2026-04-03 | HIL Website | feat: add check-in reminder email via Vercel cron (NET-55) |
| `596f16f` | 2026-04-02 | HIL Website | docs: update CLAUDE.md to reflect Hostinger SMTP email setup (NET-53) |
| `650e3c0` | 2026-04-02 | HIL Website | fix: migrate transactional email from Resend to Hostinger SMTP (NET-53) |
| `d115d25` | 2026-04-02 | HIL Website | Merge remote-tracking branch 'origin/main' |
| `2949d79` | 2026-04-02 | HIL Website | Merge branch 'dev' |
| `b37c2c4` | 2026-04-02 | HIL Website | fix: initialize Stripe at runtime from API response to fix form rendering (NET-43) |
| `f47a063` | 2026-04-02 | HIL Website | fix: migrate contact form email from SMTP/Nodemailer to Resend |
| `6a8bfba` | 2026-04-02 | HIL Website | feat: collapsible admin sidebar with localStorage persistence (NET-46) |
| `eb350ef` | 2026-04-02 | HIL Website | chore: add CLAUDE.md context and seed-testimonials script (NET-43) |
| `c08c953` | 2026-04-02 | HIL Website | fix: add loading spinner while Stripe payment intent is created (NET-39) |
| `3c77a05` | 2026-04-01 | HIL Website | fix: permanent admin sidebar + multi-domain auth (NET-40, NET-41) |
| `d94e342` | 2026-04-01 | HIL Website | fix: guard Stripe key init to prevent pattern-match error (NET-39) |
| `ba83faf` | 2026-04-01 | HIL Website | fix: show Stripe form when Card selected on payment step (NET-39) |
| `dc4d4ab` | 2026-04-01 | HIL Website | fix: move Stripe client init inside handler to prevent build-time failure |
| `07eb840` | 2026-04-01 | HIL Website | feat: add Home link to Navbar (NET-37) |
| `402be1b` | 2026-04-01 | HIL Website | fix: add itemized price breakdown to admin booking status-change email (NET-35) |
| `969915b` | 2026-04-01 | HIL Website | copy: improve Stripe/discount/rules copy in BookingForm (NET-32) |
| `77a8a39` | 2026-04-01 | HIL Website | fix: pass total to StripePaymentForm so Pay button shows amount (NET-34) |
| `c59e190` | 2026-04-01 | HIL Website | feat: Phase 1 — Stripe, Discount Codes, Daily Rate Flexibility (NET-31) |
| `9e064eb` | 2026-04-01 | HIL Website | Merge pull request #2 from cedcas/dev |
| `f4cb378` | 2026-04-01 | HIL Website | feat: remove nav logo, enlarge hero logo to 312px (NET-24 follow-up) |
| `014c558` | 2026-04-01 | HIL Website | feat: rework Hero — light vacation vibe, prominent logo, updated nav colors (NET-24) |
| `c058779` | 2026-03-31 | HIL Website | feat: HIL brand refresh — coral colors, transparent logo, Hero copy (NET-17, NET-21) |
| `2f24111` | 2026-03-31 | HIL Website | feat: update Hero and CTA to HIL brand palette |
| `983ce5d` | 2026-03-31 | HIL Website | feat: brand refresh — transparent logo + coastal hero gradient (NET-18) |
| `e322649` | 2026-03-31 | HIL Website | chore: merge dev → main for HavenInLipa rebrand deploy |
| `ed2e884` | 2026-03-31 | HIL Website | Complete HavenInLipa rebrand: replace all remaining cedcasproperties.com references |
| `d014411` | 2026-03-31 | HIL Website | feat: rebrand site to HavenInLipa (NET-9) |
| `1db2e8a` | 2026-03-30 | HIL Website | chore: configure CI/CD pipeline, Prettier, and dev tooling (NET-5) |
| `3bf3c27` | 2026-03-30 | HIL Website | feat: add propertyRules field and update booking components |
| `43a53c5` | 2026-03-29 | HIL Website | chore: set up GitHub Actions CI and update README |
| `c3e2a5e` | 2026-03-12 | HIL Website | chore: update special requests placeholder text |
| `d8595bc` | 2026-03-12 | HIL Website | Merge branch 'main' of https://github.com/cedcas/CedCasProperties |
| `0900fa6` | 2026-03-12 | HIL Website | fix: force dynamic rendering on admin layout to prevent sidebar caching |
| `47d013c` | 2026-03-12 | HIL Website | Merge pull request #1 from cedcas/dev |
| `ae084db` | 2026-03-12 | HIL Website | feat: add real social media links to all icon buttons |
| `1d3101e` | 2026-03-12 | HIL Website | fix: point "Book Your Stay Today" CTA to #properties |
| `01db7a8` | 2026-03-12 | HIL Website | chore: remove Amenities link from navbar |
| `546629d` | 2026-03-12 | HIL Website | fix: remove brand name from page copy, use generic phrasing |
| `5a93524` | 2026-03-12 | HIL Website | fix: make nav links and Book Now work from any page |
| `a33a44c` | 2026-03-12 | HIL Website | feat: add Discover Lipa City section to homepage |
| `2702802` | 2026-03-11 | HIL Website | feat: paginate property testimonials with show more button |
| `f7590e0` | 2026-03-11 | HIL Website | feat: move testimonials from site-level to per-property |
| `709a20e` | 2026-03-11 | HIL Website | chore: trigger dev deployment |
| `94d79e8` | 2026-03-10 | HIL Website | Add booker acknowledgment and admin confirmation emails |
| `ddd0a22` | 2026-03-10 | HIL Website | Fix Resend init — move to runtime to avoid build-time error |
| `8db6fba` | 2026-03-10 | HIL Website | Switch email sending from nodemailer/SMTP to Resend API |
| `1e5ff4d` | 2026-03-10 | HIL Website | Simplify payment QR codes to one per method (BPI + GCash) |
| `9a99890` | 2026-03-08 | HIL Website | Require dates before booking and clear cache on page load |
| `fc3b5ad` | 2026-03-08 | HIL Website | Block booking when dates unavailable on property page |
| `b1b697e` | 2026-03-08 | HIL Website | Fix calendar URL to end in .ics as required by Airbnb |
| `4d13cfe` | 2026-03-08 | HIL Website | Fix iCal export format for Airbnb compatibility |
| `152d745` | 2026-03-08 | HIL Website | Add Airbnb iCal sync: export feed + import blocking per property |
| `2f9c151` | 2026-03-08 | HIL Website | Add date pickers to property page + full booking flow with QR payment |
| `8fafdc0` | 2026-03-08 | HIL Website | Redesign property details page: remove hero banner, Airbnb-style gallery grid with lightbox thumbnail strip |
| `aa92608` | 2026-03-08 | HIL Website | Add property image gallery, featured image, and public details page |
| `1da9d11` | 2026-03-08 | HIL Website | Fix Vercel build: run prisma generate before next build |
| `85be2dc` | 2026-03-08 | HIL Website | Fix nodemailer peer dependency conflict for Vercel |
| `25a6d51` | 2026-03-08 | HIL Website | Add admin panel with NextAuth authentication |
| `26bb243` | 2026-03-08 | HIL Website | Migrate to Next.js 15 + Prisma 5 + MySQL |
| `15d5f49` | 2026-03-08 | HIL Website | Initial commit from Create Next App |

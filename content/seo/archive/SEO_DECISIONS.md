> **ARCHIVED 2026-09-17 — migrated from the shared `/VSCode/seo` workspace.** All 25
> `SEO-DEC-###` identifiers below are preserved exactly as originally numbered — none were
> renumbered. They are now also indexed (summary only, full text stays here) in
> [HIL_DECISIONS.md](../../../About%20HIL/HIL_DECISIONS.md)'s "Migrated SEO Decisions"
> section, alongside the product-level `DEC-###` sequence. This file is preserved verbatim
> for provenance and is not maintained going forward — the former shared-workspace copy at
> `/VSCode/seo/content for HavenInLipa/SEO_DECISIONS.md` carries the same notice and was
> left in place, unmodified, as the pre-migration record.
>
> **Updated 2026-09-19 (Owner-directed, SEO Work Stream):** this file is being maintained again
> for the `hil-seo`/Yoast cutover only. Added **SEO-DEC-026**; annotated **SEO-DEC-020** and
> **SEO-DEC-023** where later live evidence showed their recorded status was wrong. All other
> entries are unchanged. 28 `SEO-DEC-###` identifiers now exist.

---

# HavenInLipa — SEO Decision Log

Durable SEO-side decisions only. Whole-product/engineering decisions (Stay Match engine internals, WordPress caching internals, deploy mechanics, database/inventory architecture) are owned at the product level — see `HIL_DECISIONS.md` in `/Volumes/Files and Cloud/Dropbox/VSCode/haveninlipa/About HIL/`. Cross-referenced below wherever the two layers touch.

---

## SEO-DEC-001 — Strategic continuity: keep the existing 6-cluster tracker, no net-new strategy

Date: 2026-05-31
Status: Superseded (by SEO-DEC-005)
Area: Content

### Decision
For the 2026-05-31 Full Audit & Strategy run, do not invent a new strategy. Keep the existing 6-cluster keyword tracker as source of truth and limit new work to keyword GAP rows already earmarked there (3 medium-priority gaps drafted as articles #27–29; senior/solo deferred to Q3).

### Reason
Cedric's explicit direction for that run — the tracker already reflected an established strategy; the job was execution against it, not re-strategizing.

### Implications
- Phase 1/2 for that run scoped to GAP-keyword outlines only.
- Established the "continuity vs. reset" distinction later used to decide when a run should re-strategize vs. execute.

### Supersedes
None

---

## SEO-DEC-002 — Lodging competitor set redefined: OTAs, not local operators

Date: 2026-08-16
Status: Active
Area: Content

### Decision
For lodging/booking-intent competitive analysis, the relevant competitor set is OTAs (Airbnb, Agoda-type listings), not local accommodation operators (Lakeview Resort, JET Hotel). The prior "no local rival runs a content engine" framing undersold the actual competitive problem.

### Reason
The 2026-08-16 structural finding: HIL's booking-surface problem is a domain-authority wall against OTA listings, not a page-quality gap against nearby hotels/resorts. Local operators were never the real barrier to ranking or booking share.

### Implications
- Content/positioning work for booking-intent pages should be judged against what OTA listings offer, not local hotel sites.
- Discovery-content competitor set (things-to-do, food guides) is unaffected — no local rival runs a content engine there, and that finding still holds.

### Supersedes
None

---

## SEO-DEC-003 — Wedding page re-aimed: accommodation-for-weddings, not a venue

Date: 2026-08-16
Status: Active
Area: Content

### Decision
`/weddings-accommodation` is positioned as **where the wedding party sleeps**, not as a wedding venue. No venue booking, no `EventVenue`/`Event` schema (schema specifics owned at product level — see HIL DEC-008). Content built around proximity to churches (reframed around "church weddings" after the Melody fact-check surfaced two additional nearby churches) and the two-house / up-to-24-guest capacity.

### Reason
The original page ranking for `wedding venue in lipa` hand-waved accommodation in one sentence and named nobody — nobody in the local market sells "where the party sleeps" as its own product, and HIL has the inventory (sleeps-15 house) to own that angle.

### Implications
- All wedding-page copy and internal linking should reinforce "accommodation for your wedding," never imply venue/event hosting.
- Drive-time content on the page is anchored to churches, not the dropped 40+ minute venues (Casa Marikit, Villa Marasigan, Cintai Corito's Garden, Villa Natura Taal, M Farm/Farm at San Benito).
- New cluster **C7 — Occasions & Groups** created to house this and adjacent group-occasion content (see SEO-DEC-004).

### Supersedes
None

---

## SEO-DEC-004 — Cluster 7 "Occasions & Groups" added; Cluster 5 retired

Date: 2026-08-16
Status: Active (C7) / Cluster 5 retired
Area: Content

### Decision
Add a new keyword cluster, **C7 — Occasions & Groups**, to the tracker to house wedding-accommodation, group/barkada, reunion, and team-building content (articles #27, #32–34 file here going forward). Retire Cluster 5 from active tracking.

### Reason
Approved as part of the 2026-08-16 STOP #1 gate alongside the wedding re-aim and the OTA competitor-set correction — the occasions/groups angle needed its own cluster rather than being scattered across existing ones.

### Implications
- New group/occasion-intent content (articles #27, #32–35 batch) should file under C7 going forward.
- **Unresolved ambiguity:** the specific keyword scope of the retired Cluster 5 is not established in the available session-log record — flagged for confirmation rather than guessed. Article #27's Keyword Master row is still filed under the old Cluster 3 (not C7) as of 2026-08-31, deliberately left alone pending a decision — see Open Items in SEO_PROJECT_STATUS.md.

### Supersedes
None (Cluster 5's own prior definition is out of scope / not recoverable from available records)

---

## SEO-DEC-005 — Strategy pivot: high-intent money pages over discovery volume

Date: 2026-08-14
Status: Active
Area: Content

### Decision
Keep the discovery/"things to do" content engine running for reach (it remains the content moat — no local rival runs one), but stop expecting it to produce bookings. Add a high-intent layer: wedding/events and staycation money pages on the main domain, plus a contextual booking-recommendation engine ("Stay Match") replacing static CTAs. New pages are judged on conversion rate, not sessions.

### Reason
The 2026-08-14 3-month GSC analysis: traffic grew ×18.9 impressions / ×22.3 clicks over May–Jul, but bookings stayed flat. Root causes: 95.7% of July clicks were food-intent (lodging-intent queries earned 0 clicks); the booking surface's share of clicks collapsed 75% → 15% → 1.9%; and 18 pages sat "Crawled – currently not indexed" against 41 indexed.

### Implications
- This is a genuine strategy reset, not a continuation of SEO-DEC-001's continuity scope — it commits to net-new money pages and a new recommendation-engine layer beyond the tracker's pre-existing GAP keywords.
- Discovery content is explicitly not to be optimized for booking conversion; money pages and Stay Match carry that job instead.
- Stay Match's engine internals (confidence-gating thresholds, `/api/properties.json` contract, REST-only integration) are owned at the product level — see HIL_DECISIONS.md (DEC-004, DEC-011). This entry covers only the SEO-strategy mandate: replace hand-placed CTAs with a tunable, retunable recommendation system, piloted on articles #27–29.

### Supersedes
SEO-DEC-001

---

## SEO-DEC-006 — Content freeze on new blog articles from 2026-09-15

Date: 2026-08-16
Status: Active
Area: Content

### Decision
No new blog articles (#30+) publish after 2026-09-15. The period is used to measure the Aug16 changes (main-domain click share, #1 refresh ranking movement) rather than add more discovery volume.

### Reason
18 pages were "Crawled – currently not indexed" at the time of the Aug16 audit — adding more discovery content before addressing that would compound an indexing-saturation problem rather than grow reach.

### Implications
- Articles #30–35 (drafted/pushed 2026-08-31) are pre-freeze content already in the pipeline, not an exception to the freeze — they were queued before the cutoff.
- The freeze is scoped to *new* articles; the existing weekly cadence (#26–29) and Stay Match pilots continue on their already-scheduled dates.
- Revisit at the October Maintenance re-baseline: extend, lift, or adjust based on whether click share moved.

### Supersedes
None

---

## SEO-DEC-007 — Article #6 consolidated into `/staycation` via redirect

Date: 2026-08-16 (approved) / 2026-08-31 (executed)
Status: Active
Area: Content

### Decision
Rather than launching `/staycation` as a competing page, consolidate article #6 ("why book direct vs. Airbnb") into it: repoint all in-body links from #6 to `/staycation`, then 301 the old article #6 URL.

### Reason
Article #6 already owned the "book direct" angle but was dying (0 clicks on 17 impressions in July, down from 66 in June); `/staycation` is a higher-intent page on the main domain that can inherit the link equity and reader intent instead of splitting it.

### Implications
- Execution order (build → repoint → redirect) follows the general mechanical pattern owned at the product level — see HIL_DECISIONS.md DEC-010.
- All 31 posts / 36 link occurrences confirmed repointed with zero remaining references (verified by re-fetch, not the update response) as of 2026-08-31.
- Anchor text on the repointed links still reads "vs. Airbnb" in places; `/staycation`'s live copy no longer names Airbnb directly. Still factually accurate, flagged as a low-priority phrasing cleanup, not a broken-link issue.

### Supersedes
None

---

## SEO-DEC-008 — Noindex policy for thin auto-generated archive pages

Date: 2026-07-04 (tag/author archives) — extended 2026-08-31 (category archives)
Status: Active
Area: Technical SEO

### Decision
Any thin, auto-generated WordPress taxonomy archive (tag, author, category) that offers no unique content of its own gets `noindex, follow` (not `Disallow` — Google still needs to crawl through it).

### Reason
These archives were being indexed as low-value duplicate/thin content, diluting crawl budget and cluttering Coverage reports, while still needing to pass link equity through (`follow`).

### Implications
- Applied first to `/tag/airbnb/`, `/tag/batangas/`, `/tag/barako-coffee/`, `/author/cassandrakim/` (2026-07-04), confirmed dropped from the index by 2026-08-31.
- Extended 2026-08-31 to 6 category archives (`/category/booking-tips/`, `/category/uncategorized/`, `/category/travel-and-itineraries/`, `/category/weekend-getaways/`, `/category/outdoor-adventures/`, `/category/getting-here/`) via a Yoast taxonomy-visibility setting, not custom code.
- 5 more category archives were discovered still indexed as of 2026-08-31 and remain a pending decision (not yet actioned) — see SEO_PROJECT_STATUS.md Blocked section.
- Both Mickey `/book` endpoints carry the same noindex treatment (fixed 2026-07-04) but are proving slow to drop from the index — standing watch item, not a policy question.

### Supersedes
None

---

## SEO-DEC-009 — Claude does not touch either codebase

Date: 2026-08-14 (confirmed; standing since project start)
Status: Active
Area: Other

### Decision
Claude (SEO Analyst role) never edits code, deploys, or touches either the `haveninlipa.com` (Next.js) or `blog.haveninlipa.com` (WordPress theme/infra) codebase directly through a repo. All site-side engineering changes are delivered as written briefs to Cedric's developer.

### Reason
Clean separation of responsibility between SEO analysis/content and product engineering; keeps a verifiable, reviewable paper trail for every site change (briefs in the dated run folders).

### Implications
- The one exception is direct WordPress **content** editing via the REST API (see SEO-DEC-010) — that is content operations, not codebase access, and has its own separate guardrails.
- `Tools/*.py` (local workbook/DOCX generators) are the only code Claude writes, and they operate only on local project files, never on either live site's codebase.

### Supersedes
None

---

## SEO-DEC-010 — Direct WordPress content editing: modify stays published, create is always draft

Date: 2026-08-17 (rollout) / 2026-08-31 (extended to `create()`)
Status: Active
Area: Content

### Decision
The SEO Analyst (Claude) has REST API write access to the blog via a dedicated Editor Application Password, credentials held outside Dropbox with `WP_ALLOW_PUBLISH=false` enforced in config. Rules:
- **Modify** an existing article → edit directly via REST, article **stays published** (WordPress revisions make this reversible).
- **Create** a new article → always pushed as **DRAFT** only; Cedric adds the featured image and publishes/schedules.
- Anything in Draft status is Cedric's — the SEO Analyst never schedules or publishes it.
- No scheduled/automated routines — cloud routines can't reach the local credentials or the project folder; all of this work is on-request.

### Reason
Enables faster iteration on existing content (fact-check corrections, CTA updates, refreshes) without waiting on manual paste-in, while keeping publish authority with Cedric for anything net-new.

### Implications
- `Tools/wp_client.py` enforces the guardrail at the code level (`create()` hard-refuses any status but `WP_DEFAULT_STATUS`), independent of `update()`'s own publish-guard.
- First real-world test of this boundary: 6 Maculot-remediation articles modified-and-stayed-published (8/17); articles #30–35 created-as-draft (8/31).

### Supersedes
None

---

## SEO-DEC-011 — Content lens pivot: "where to eat" → "where to stay"

Date: 2026-08-31
Status: Active
Area: Content

### Decision
Standing weekly lens for every content/linking/prioritization decision through the October re-baseline: format mix shifts toward comparison/seasonal content over mega-guides; internal linking shifts toward property pages over more blog-to-blog links; new content is prioritized for lodging intent over discovery volume.

### Reason
Operationalizes the 2026-08-14 strategy pivot (SEO-DEC-005) as an ongoing weekly discipline rather than a one-time set of deliverables — two concrete threads run under it: the wedding initiative and the Stay Match pilot/retune cycle.

### Implications
- Judge this initiative the same way as the rest of the Aug16 audit: main-domain click share and property-page clicks, not impressions or sessions.
- Applies to both existing-content edits (CTA/link placement) and new-content topic selection until the October Maintenance run reviews whether it should continue, adjust, or end.

### Supersedes
None (operationalizes SEO-DEC-005)

---

## SEO-DEC-012 — Keyword-to-URL mapping rule for Mickey/booking-transactional terms

Date: 2026-06-18
Status: Active
Area: Internal Linking

### Decision
Transactional queries of the form "[configuration] rental" map to the relevant booking/property page; branded or franchise-adjacent terms (e.g., Disney-themed references) map to the launch-post content hub rather than directly to a property page.

### Reason
Established when Mickey in Lipa launched with three live, bookable property-config pages — gives a consistent rule for routing both keyword targeting and internal links between transactional and branded/informational intent.

### Implications
- Applied to the Page Indexing Tracker and Keyword Master target-URL columns for the Mickey cluster.
- Sets the template for how future named-property or sub-brand launches (if any) should be mapped, not just Mickey-specific.

### Supersedes
None

---

## SEO-DEC-013 — B34/B38 check-in times and early check-in/late-checkout policy confirmed

Date: 2026-09-06
Status: Active
Area: Content

### Decision
For the public FAQ (and any future guest-facing policy copy): **B34 (Cozy 1-Bedroom, Spacious 2-Bedroom) check-in is 2:00 PM; B38 "Mickey in Lipa" (Sleeps 7/11/15) check-in is 3:00 PM.** Checkout is 12:00 PM (noon) at both. Early check-in or late checkout is charged at **₱200 per hour**, requires advance approval, and remains subject to availability, the cleaning schedule, and adjacent reservations — approval and payment never guarantee an exact time.

### Reason
The FAQ audit (`090626/FAQ_Audit_and_Recommendations.md`) surfaced that property-level records (`housePolicies.checkInTime` in `prisma/seed-property-seo.ts` / `seed-property-seo-mickey.ts`) show different check-in times per house, while the live Terms of Service states one blanket 2:00 PM for everyone — a direct conflict that could not be resolved by guessing. The owner confirmed the property-record times are correct and approved the ₱200/hour early/late policy, which did not previously appear anywhere on the live site.

### Implications
- The Terms of Service page is now known to be out of date (blanket "2:00 PM onwards") and needs a corresponding correction — this is a **Web Work Stream implementation task**, not resolved by this decision alone.
- The ₱200/hour fee is not yet reflected in the live `AdditionalCharge` admin flow; the Web Work Stream should consider wiring it in so it's applied consistently rather than set ad hoc per booking.
- Final approved FAQ wording lives in Sections 5 and 6 of the audit document.

### Supersedes
None

---

## SEO-DEC-014 — B34 Cozy 1-Bedroom capacity corrected to 5 guests

Date: 2026-09-06
Status: Active
Area: Content

### Decision
The Cozy 1-Bedroom (B34) accommodates **up to 5 guests**. This is the figure to use consistently across the public FAQ and any other guest-facing content.

### Reason
The live public FAQ stated "sleeps up to 4," which conflicted with the property's own listing data (`maxGuests: 5` in `prisma/seed-property-seo.ts`) and the live booking form's server-side cap (which rejects bookings over 5). The owner confirmed 5 is correct; the "4" figure was stale.

### Implications
- B38/Mickey configuration capacities (7 / 11 / 15) were separately verified and are unaffected — they retain their existing figures.
- The public FAQ's stale "4" should be corrected when the Web Work Stream next updates `/faq` or `src/lib/faqs.ts`.

### Supersedes
None

---

## SEO-DEC-015 — Guest-facing payment terminology: "Credit/Debit Card" replaces "Stripe"

Date: 2026-09-06
Status: Active
Area: Content

### Decision
All guest-facing copy (FAQ, Terms of Service, property pages, booking UI, confirmation emails, chatbot) refers to card payments as **"Credit/Debit Card"** and never names "Stripe." The 6%-fee-vs-fee-free distinction is stated as **Credit/Debit Card (6% processing fee) vs. GCash/BPI (no fee)**. "Stripe" remains correct and expected in technical documentation, backend configuration, environment variable names, and admin-only screens, where identifying the actual payment processor is necessary.

### Reason
Owner decision: guests generally do not need to know which payment processor powers the transaction, and unnecessary brand exposure in guest-facing copy has no benefit.

### Implications
- Applies to all FAQ content drafted in `090626/FAQ_Audit_and_Recommendations.md` (Section 5) going forward, and to any future guest-facing copy across both the main site and blog.
- Does not require any change to the codebase's internal naming (`STRIPE_SECRET_KEY`, `stripePaymentIntentId`, etc.) — this is a content/terminology rule, not a technical one.
- The Web Work Stream should apply this consistently when it eventually updates live `/faq`, `/terms`, and property-page copy.

### Supersedes
None

---

## SEO-DEC-016 — Public FAQ omits security-deposit and ID/KYC questions until formal policy exists

Date: 2026-09-06
Status: Active
Area: Content

### Decision
The public FAQ will **not** include a "Is a security deposit required?" question, and will **not** state either that a deposit is required or that none is required. The public FAQ will also **not** include an ID-requirement/guest-information question, and must not imply that ID verification or KYC currently exists, nor announce a possible future KYC feature. The existing full-payment-at-booking fact may still be explained where it naturally fits (e.g., as part of the "How do I book" answer), but never framed as a security deposit.

### Reason
Haven in Lipa has no formal, approved security-deposit or ID-verification/KYC policy today. Publishing either subject — even a "no" answer — would state a policy position that doesn't formally exist, or risk implying a future feature that hasn't been decided.

### Implications
- Both topics are removed from the FAQ's guest-question gap analysis (Section 3) as candidates and from the final proposed content (Section 5) of `090626/FAQ_Audit_and_Recommendations.md`.
- Revisit this decision only if/when Haven in Lipa formally establishes a security-deposit policy or a KYC/ID-verification policy with corresponding guest-facing language approved at that time.

### Supersedes
None

---

## SEO-DEC-017 — Public FAQ / Quick Reply content boundary formalized

Date: 2026-09-06
Status: Active
Area: Content

### Decision
The public FAQ may explain generally **when and how** guests receive check-in/arrival information, but must never publish: detailed arrival procedures; lockbox or access instructions; door or gate codes; Wi-Fi credentials; caretaker coordination details; reservation-specific instructions; or any other operational or security-sensitive information. All such content remains in Quick Replies sent directly to confirmed guests (e.g., the existing "Check-in reminder – 24h before Check-in" scheduled message).

### Reason
Formalizes the boundary proposed in Section 7 of the FAQ audit (`090626/FAQ_Audit_and_Recommendations.md`) and approved by the owner without modification — the public FAQ serves pre-booking decision-making and must stay indexable/public-safe, while Quick Replies serve confirmed, reservation-specific, and security-sensitive communication.

### Implications
- Governs all current and future public FAQ content; any new FAQ item proposed later should be checked against this boundary before publication.
- FAQ item 4.4 ("How and when will I get my check-in instructions?") in Section 5 of the audit is the concrete example of compliant general-policy wording.

### Supersedes
None

---

## SEO-DEC-018 — Free-rebooking offer removed from all guest-facing content

Date: 2026-09-06
Status: Active
Area: Content

### Decision
The published offer of "free rebooking when requested at least 14 days before check-in" is **removed** from all guest-facing content — the public FAQ, and the on-site chatbot. It is not replaced with any public wording promising case-by-case rebooking consideration. Haven in Lipa may still consider a rebooking request privately, at its own discretion, but this must never be presented publicly as a guaranteed policy, guest entitlement, standard exception, or promised benefit. The approved cancellation/refund policy (100% refund 7+ days out; 50% 3–7 days; no refund inside 3 days) stands alone, with no rebooking exception attached.

### Reason
This offer appeared in the live public FAQ (`src/lib/faqs.ts`) and the on-site chatbot (`src/lib/chat/chat-tree.ts`, `booking-cancel` node) but was never part of the Terms of Service — the FAQ audit (`090626/FAQ_Audit_and_Recommendations.md`) flagged this as an unresolved conflict pending owner confirmation. The owner decided to resolve it by removing the offer rather than formalizing or republishing it, since a discretionary, case-by-case host accommodation should not be marketed as a standing entitlement.

### Implications
- `090626/FAQ_Audit_and_Recommendations.md` Section 5 no longer includes a rebooking/rescheduling FAQ item; the cancellation-policy item (6.1) states only the refund tiers.
- **Web Work Stream dependency:** the live `src/lib/faqs.ts` cancellation answer and the `chat-tree.ts` `booking-cancel` node both still contain this offer and need to be edited to remove it — flagged in `SEO_PROJECT_STATUS.md`'s Cross-Workstream Dependencies.
- This was the last open item from the 2026-09-06 FAQ audit approval round (see SEO-DEC-013 through SEO-DEC-017). No SEO-side FAQ decisions remain pending as of this entry.

### Supersedes
None

---

## SEO-DEC-019 — Analyst WordPress account upgraded from Author to Editor role

Date: 2026-09-07
Status: Complete — executed and verified live
Area: Technical SEO

### Decision
The SEO Analyst's WordPress Application-Password account on `blog.haveninlipa.com` is upgraded from Author role to **Editor** role — no higher. Administrator access is explicitly withheld (cannot install plugins, change site settings, or manage users). The existing code-level publish guard (`WP_ALLOW_PUBLISH=false` in `wp_client.py`) continues to enforce that the Analyst can never publish or unpublish content, independent of the WordPress role itself — Editor role carries `publish_posts` capability at the platform level the same as Author, so this guard remains the actual mechanism preventing publication, not the role.

### Reason
Live verification during the 2026-09-07 audit found the account authenticates as Author, not the Editor role `README_wordpress_access.md` had documented — and Author role's lack of `edit_others_posts` blocks the Analyst's tooling from reaching 18 of 27 published articles (everything authored by the legacy "Cassandra Kim" user). Editor role unblocks this while preserving the minimum-viable-role principle already established for this account.

### Implications
- Unblocks SEO-DEC-021 (author reassignment) and any future correction to the 18 previously-unreachable posts.
- Once executed, the code-level publish guard must be re-verified against a real post before being trusted post-upgrade — see `HIL_Custom_SEO_Plugin_Requirements.md` §6.8.
- **Executed and verified.** Cedric promoted the account in WP Admin; `whoami()` now returns `roles: ['editor']` and `allow_publish: False` — the code-level publish guard held through the role change, exactly as required. Confirmed live: the account can now read/write all 34 posts under `context=edit` (previously only 9), unblocking SEO-DEC-021.

### Supersedes
None

---

## SEO-DEC-020 — Custom SEO plugin uses WordPress core's sitemap; Yoast sitemap retired with a redirect

Date: 2026-09-07
Status: **Complete as of the evening of 2026-09-19 (see SEO-DEC-026 Outcome).** Earlier the same day it was found to be: **Partially executed — sitemap transition NOT complete (corrected 2026-09-19).** The 6 cutover flags were turned ON via the Administrator screen (SEO-DEC-025), but `/wp-sitemap.xml` has never served: Yoast's XML-sitemap feature is still on, so Yoast disables core's sitemap and redirects `/wp-sitemap.xml` → `/sitemap_index.xml`. The Redirection rule for the reverse direction was added, producing a live redirect loop found 2026-09-19. The same-day robots.txt "fix" (v1.1.1) was never installed and could not have worked. Sequence corrected and v1.1.2 built under SEO-DEC-026.
Area: Technical SEO

### Decision
The custom SEO plugin replacing Yoast does not generate its own sitemap. WordPress core's built-in sitemap (`/wp-sitemap.xml`) is the system of record going forward. At cutover, the retired Yoast sitemap URL (`/sitemap_index.xml`) gets a 301 redirect to `/wp-sitemap.xml` (via the existing Redirection plugin — redirects are not this project's to own, see SEO-DEC-009's sibling boundary), and `robots.txt`'s `Sitemap:` line is updated to match. Google Search Console's sitemap submission is updated to the new URL at the same time.

### Reason
Matches the proven pattern already live on TribeMedSpa and NetCoreSolutions (`tms-core`/`ncs-core` both defer to core's sitemap). Core already excludes noindexed content and password-protected posts automatically, which covers the one thing a custom sitemap might have argued for. Less code to maintain than a bespoke sitemap generator.

### Implications
- `lastmod` history under the old sitemap URL resets — a known, accepted, one-time cost (TMS's own migration notes record the identical tradeoff).
- **Defect found and fixed same day**: with the sitemap module turned ON, Yoast's virtual robots.txt (no physical file exists on this site — confirmed via Yoast's own File Editor) still advertised its own retired `Sitemap: https://blog.haveninlipa.com/sitemap_index.xml` line. Root cause: the plugin had no `robots_txt` filter at all — enabling the sitemap module only ever controlled the noindex-exclusion filters on core's `/wp-sitemap.xml`, not robots.txt's own advertised URL. Fixed in plugin v1.1.1 (`includes/sitemap.php`): a `robots_txt` filter at priority 999 (after Yoast's own callback) finds the exact existing "Sitemap:" line and rewrites its URL in place — never appends, so there is no code path that can produce a duplicate line — and automatically reverts to Yoast's original line the instant the sitemap module is turned off or Emergency Rollback is used, since the filter re-checks the live flag on every request rather than writing a persistent change. Yoast remains fully active throughout; this only corrects the one line it emits.
- The 301 redirect from `/sitemap_index.xml` to `/wp-sitemap.xml` (in the Redirection plugin) and the GSC resubmission remain manual, separate steps — this fix only addresses robots.txt's advertised URL, not the redirect itself.
- **Executed.** All 6 cutover modules confirmed live via the Administrator screen; the robots.txt fix ships in v1.1.1, packaged and pending Cedric's manual upload as of this entry.
- **Correction, 2026-09-19 (see SEO-DEC-026):** (1) v1.1.1 was never installed — the live plugin readme reported `Stable tag: 1.1.0`. (2) It could not have worked: Yoast SEO 28.4 registers its `robots_txt` callback at priority 99,999 (`src/integrations/front-end/robots-txt-integration.php`), so a priority-999 filter ran before Yoast appended its block; the "Yoast hooks at priority 10" premise above was wrong. (3) The claim that "nothing else in WordPress core adds a `Sitemap:` line" is also wrong — core adds `Sitemap: <home>/wp-sitemap.xml` itself when its sitemaps are enabled. (4) Sequencing flaw: the documented order placed the 301 (`/sitemap_index.xml` → `/wp-sitemap.xml`) before Yoast's sitemap was off, which loops against Yoast's own redirect and left the site with no working sitemap index. Superseded by SEO-DEC-026's order.

### Supersedes
None

---

## SEO-DEC-021 — The 18 Cassandra-Kim-authored articles are reassigned to Haven

Date: 2026-09-07
Status: Complete — executed and verified live
Area: Content

### Decision
All 18 published articles currently attributed to the legacy WordPress user "Cassandra Kim" are reassigned to the "Haven" author account. The reassignment changes **only** the `author` field. URLs (slugs), publication dates, and post content are explicitly preserved unchanged — this is an attribution correction, not a republish or a content edit.

### Reason
Approved to complete the Haven-persona standardization already established as policy (`SEO_PROJECT_STATUS.md`'s "Approved author: Haven unless an approved exception exists") — the 2026-09-07 audit found 67% of published content had never actually been migrated to that standard, and that the same account's role limitation (SEO-DEC-019) had made those 18 posts invisible to the Analyst's tooling entirely.

### Implications
- Technically blocked on SEO-DEC-019 (Editor role) actually being executed first — the account cannot reach these 18 posts under its current Author role.
- The `/author/cassandrakim/` archive URL and its existing `noindex, follow` treatment (SEO-DEC-008) must not break for anyone who has linked to it — confirm WordPress's own live behavior here (an author archive for a user with zero remaining posts typically 404s or returns an empty listing) before execution, not assume it self-resolves cleanly.
- Should be executed via REST `PATCH` on each post's `author` field only — no `content`, `slug`, `date`, or `status` field in the same request, to make the "URLs, dates, and content preserved" guarantee mechanically enforced rather than just intended.
- **Executed and verified.** All 18 posts reassigned via a `PATCH` touching only `author`; before/after comparison confirmed slug, date, status, and a content hash were all identical for every post — no unintended change slipped through. `/author/cassandrakim/` now returns HTTP 200 with zero posts and its existing `noindex, follow` treatment (SEO-DEC-008) intact — confirmed live, not assumed.

### Supersedes
None

---

## SEO-DEC-022 — Keyword Master synced with 3 previously-untracked live articles

Date: 2026-09-07
Status: Complete — executed this session
Area: Content

### Decision
Three live WordPress posts that existed with no clean Article #/Confirmed-Live-Slug match in the Keyword Master are now synced: **Article #30** = `senior-friendly-staycation-guide-lipa` (already referenced by number in `SEO_PROJECT_STATUS.md` prose; the tracker had simply never been updated to match), **Article #36** = `batangas-road-trip-itinerary-lipa-base` (already published), **Article #37** = `summer-in-lipa-cool-highland-escape` (scheduled 2026-09-14). #36 and #37 are newly assigned, sequential numbers — assigned because these articles predate having been tracked, not because they were drafted after #35.

### Reason
Found during the 2026-09-07 Yoast-replacement audit's WordPress-vs-tracker cross-reference; approved by Cedric as a same-session fix rather than a deferred follow-up, since it's a local tracker edit, not a production change.

### Implications
- `HavenInLipa_SEO_Tracker.xlsx`'s Keyword Master rows 77, 78, and 81 updated in place (workbook patched, not regenerated, per the standing rule against risking hand-entered data — backup saved as `HavenInLipa_SEO_Tracker.pre-090726sync.backup.xlsx`).
- `HIL_SEO_Metadata_Backfill.xlsx` updated to match the same three article numbers, so the two artifacts don't disagree.
- Closes the last open item from `HIL_SEO_Metadata_Backfill_QA.md` §3.

### Supersedes
None

---

## SEO-DEC-023 — "1 hour from Manila" claim removed from 3 meta descriptions; durable non-numeric wording approved

Date: 2026-09-07
Status: **Complete as of the evening of 2026-09-19** — Yoast is deactivated so only the plugin's descriptions are served, and the two truncated strings were replaced (verified 27/27 posts, none contains "1 hour from Manila"). Earlier the same day: **Partly complete — corrected 2026-09-19.** `hil-seo`'s description tag carries the approved wording for all 3 posts, but (a) Yoast's own description tag on the same pages still prints "1 hour from Manila" until Yoast is deactivated, and (b) `hil_seo_trim_description()` (158-char limit) truncates two of the three approved strings mid-phrase ("…where to stay, a…", "…couple-fit rental, a comfortable…"). See SEO-DEC-026. Original status text follows: the approved wording now renders for all 3 posts. Should be spot-checked once more (cache-busted) after the v1.1.1 upload, alongside the robots.txt fix verification.
Area: Content

### Decision
The unsupported "1 hour from Manila" claim is removed from the live meta descriptions of Article #8 (Holy Week retreat, WP id 73), #11 (family staycation, WP id 268), and #12 (romantic getaway, WP id 272). Approved replacement wording uses durable, non-numeric phrasing — **"a comfortable drive from Manila"** — in place of any specific travel-time figure, until an actual drive time is independently verified (Melody fact-check tier, per the Fact-Checking Guide).

### Reason
The specific "1 hour" figure was never sourced or fact-checked and is the same class of "overly broad flexibility" claim already flagged as a standing open item in `SEO_PROJECT_STATUS.md`. Rather than substitute an equally-unverified replacement number, Cedric approved removing the numeric claim entirely until a real figure can be confirmed.

### Implications
- Final approved copy for all three descriptions is recorded in `HIL_SEO_Metadata_Backfill.xlsx` (Validation Status: "Approved — pending live application").
- ~~**Not yet applied to production.** Two of the three affected posts (#8 and #12 — WP ids 73, 272) are among the 18 Cassandra-Kim-authored posts and are additionally blocked on SEO-DEC-019/SEO-DEC-021 before they can be reached via REST at all.~~ **Stale (2026-09-19):** the blocks cleared on 2026-09-07 (SEO-DEC-019/-021) and the wording is applied in `hil_meta_description`; the live state is the partial one described in Status above.
- If/when an actual drive time is independently verified later, that becomes a new, separate decision — this entry only retires the unverified claim, it doesn't pre-approve whatever number eventually replaces it.

### Supersedes
None

---

## SEO-DEC-024 — SEO Analyst owns the complete custom-SEO-plugin implementation on blog.haveninlipa.com; no Web Work Stream handoff for this project

Date: 2026-09-07
Status: Active
Area: Other

### Decision
For the custom SEO plugin (Yoast replacement) project specifically, the SEO Analyst owns the `blog.haveninlipa.com` WordPress environment and executes the complete implementation directly — building the plugin, installing it, running the backfill, reassigning authors, correcting metadata, transitioning sitemap ownership, and disabling Yoast — rather than producing a brief for a separate developer to build. A Web Work Stream handoff is used for this project only if a change to `haveninlipa.com` (the separate Next.js main site) is genuinely required; none has been identified as of this decision.

### Reason
Cedric's explicit instruction, given after reviewing the finalized handoff package: the prior model (SEO Analyst plans, a separate Web Work Stream implements) added a coordination step this project doesn't need, since `blog.haveninlipa.com` is a WordPress content environment the Analyst already has standing REST access to, and the plugin itself was written in full by the Analyst regardless of who was going to install it.

### Implications
- This narrows, for this project only, the general boundary in SEO-DEC-009 ("Claude never edits code, deploys, or touches either codebase directly... all site-side engineering changes are delivered as written briefs"). SEO-DEC-009 remains the standing default for every other kind of engineering work and for `haveninlipa.com`; this decision is a scoped exception for the WordPress plugin work described in `HIL_SEO_Implementation_Plan.md`, not a general repeal.
- `HIL_Custom_SEO_Plugin_Web_Handoff.md` is retired and replaced by `HIL_SEO_Implementation_Plan.md`. `SEO_PROJECT_STATUS.md`, `SEO_COMPLETION_LOG.md`, and the other `090726/` documents were corrected the same day to remove "Web Work Stream"/developer-handoff framing for this project.
- **Two actions were outside the Analyst's own reach regardless of this decision** — not because of policy, but because of WordPress's own permission architecture: only an existing Administrator can promote another account's role, and installing a hand-written plugin requires either a manual upload through the WordPress admin or server-level (SFTP/WP-CLI) credentials neither REST role can provide. **Both completed by Cedric on 2026-09-07** (role promoted to Editor, plugin uploaded/installed/activated) — see SEO-DEC-019 for the verified-live confirmation. A third instance of the same pattern surfaced immediately after: SEO-DEC-025.
- `WP_ALLOW_PUBLISH=false` and every other existing REST-side safeguard in `wp_client.py` remain fully in force — this decision expands what the Analyst builds and installs, not the publishing boundary.

### Supersedes
None (narrows SEO-DEC-009's scope for this project only; SEO-DEC-009 itself remains Active)

---

## SEO-DEC-025 — Cutover-flag flip (and everything downstream) requires Administrator; a third WordPress-imposed exception found during execution

Date: 2026-09-07
Status: Resolved and executed — Cedric used the Administrator screen (built in response to this decision) to turn all 6 cutover modules ON live
Area: Technical SEO

### Decision
Not yet a decision — a discovered constraint requiring one. The `hil-seo` plugin's output modules (meta description, title, canonical, robots, schema, sitemap) are each gated behind a cutover flag, all defaulting to OFF (see `090726/hil-seo-plugin/includes/cutover.php`). Flipping a flag is deliberately restricted to `manage_options` (Administrator) in the plugin's own code — a safety choice made when the plugin was written, consistent with SEO-DEC-019's Administrator ceiling for the Analyst's own account. Confirmed live: a flip attempt via the Analyst's Editor-role credential returns `HTTP 403 rest_forbidden`.

This means the actual go-live moment for every output module — and everything sequenced after it (Migration Plan Stages 8 onward: cache purge, Yoast deactivation, GSC resubmission) — requires an Administrator-authenticated request, which the Analyst's credential structurally cannot make, regardless of SEO-DEC-024's ownership grant.

### Reason
The restriction is real and was verified, not assumed (`HTTP 403` reproduced directly). It exists because flipping a flag is the one action in this plugin that changes live front-end output — the same class of action SEO-DEC-019 already drew a line around for the Analyst's own account.

### Implications
- Everything reachable via Editor-role REST access is complete as of 2026-09-07: backup (Stage 1), plugin build (Stage 2), backfill import for all 34 posts (Stage 3, verified field-by-field), author reassignment for all 18 posts (Stage 4-adjacent, SEO-DEC-021, verified via before/after diff including a content hash), and a full parity check (Stage 5/6) — title, canonical, and robots match Yoast exactly for all 34 posts; meta description matches for 17, differs for 3 by the approved SEO-DEC-023 rewrite, and differs for 14 by the plugin's own length-trim hygiene (a proven, direct port of the tms-core/ncs-core pattern, not a defect).
- **Resolved via option (b): built a proper Administrator screen rather than asking Cedric to run raw REST requests.** Plugin v1.1.0 adds **WP Admin → HIL SEO** — per-module state, prerequisite status, last-changed timestamp, required verification text, a confirmation-gated toggle, an Emergency Rollback control, and static instructions for the LiteSpeed purge and final Yoast deactivation. The menu is registered at `manage_options` capability, so it is invisible and unreachable to the Editor-role Analyst account — this does not weaken or bypass SEO-DEC-019's ceiling, it gives the Administrator a safer interface to exercise it through. The underlying REST route from the original build stays in place and unchanged (same capability requirement) for anyone who prefers it.
- Packaged as `090726/hil-seo-plugin.zip`, for Cedric to upload the same way as the first install (WP Admin → Plugins → Add New → Upload — WordPress detects the matching plugin slug and offers to replace the existing version; all stored options, post meta, and cutover flags are preserved across that replacement since they live in the database, not the plugin files). No flag was changed to build this — confirmed live via the REST route immediately before and after packaging.

### Supersedes
None

---

## SEO-DEC-026 — Sitemap/robots cutover order corrected to a loop-free sequence; `hil-seo` v1.1.2 supersedes v1.1.1

Date: 2026-09-19
Status: **Executed 2026-09-19 — cutover complete and verified; Yoast deactivated, not deleted.** Sequence below was amended during execution (see Outcome). Record: `HIL_SEO_Implementation_Plan.md` §8.7–8.9.
Area: Technical SEO

### Decision
1. **Order (durable).** Every checkpoint must leave at least one sitemap URL returning HTTP 200:
   1. Redirection: **disable** (not delete) the `/sitemap_index.xml` → `/wp-sitemap.xml` rule. Yoast's index serves again; `/wp-sitemap.xml` → Yoast's index in one hop.
   2. Upload `hil-seo` v1.1.2 (replace). No output change while Yoast's XML sitemaps are on; read the new Status panel.
   3. Yoast SEO → Settings → Site features → **XML sitemaps OFF** (Yoast stays active). Verify `/wp-sitemap.xml` = 200 immediately; if not, switch it back ON (returns to checkpoint 1).
   4. Redirection: **re-enable** the `/sitemap_index.xml` rule. Verify one hop to a 200.
   5. LiteSpeed Purge All; verify robots.txt carries one `Sitemap: …/wp-sitemap.xml` line.
   6. GSC: submit `/wp-sitemap.xml`; keep the old entry until the new one reads Success.
   7. Analyst metadata fixes (below), then a full cache-busted verification pass.
   8. Deactivate Yoast (never delete); purge; full pass again. Rollback per plan §8.
2. **Plugin v1.1.2** replaces v1.1.1 (never installed): robots filter at `PHP_INT_MAX`, inert unless core's sitemap is really being served and Yoast's sitemap line is absent, guarantees exactly one core `Sitemap:` line, no rewriting of Yoast's line; core's `users` sitemap provider dropped (author archives are `noindex`, SEO-DEC-008); read-only Status panel + `GET /hil-seo/v1/status`; on-screen instructions rewritten to this order.
3. **Analyst metadata fixes before Yoast deactivation:** (a) replace the two truncated SEO-DEC-023 descriptions with strings ≤158 chars that keep the approved wording; (b) set `hil_robots_index=noindex` on article #6 so a URL that now 301s to `/staycation` stays out of core's sitemap.
4. **Yoast deletion is a separate, later decision** — not authorized here (see Implications).

### Reason
Live evidence 2026-09-19, read-only: `/wp-sitemap.xml` → 301 `x-redirect-by: Yoast SEO` → `/sitemap_index.xml` → 301 `x-redirect-by: redirection` → `/wp-sitemap.xml` (curl stopped at 6 hops); `/wp-sitemap.xml?nocache=` = 404 (core's sitemap suppressed); robots.txt (uncached `/?robots=1`) still `Sitemap: …/sitemap_index.xml`; installed plugin readme `Stable tag: 1.1.0`. Yoast 28.4 source confirms `robots_txt` at 99,999 and that `WPSEO_Sitemaps` is only constructed while `enable_xml_sitemap` is true. The old documented order (301 at step 3, Yoast off at step 7) could not have worked.

### Implications
- **Yoast has no setting that disables only its description/schema output**, so duplicate description/`og:*`/JSON-LD on every post (Yoast + `hil-seo`) is expected until Yoast is deactivated (27 of 27 checked posts, 2026-09-19). Earlier docs' "disable Yoast's schema module in General → Features" instruction does not match Yoast 28.4.
- **Before Yoast can be deleted** (not merely deactivated): (i) rollback window closed and one GSC crawl cycle clean; (ii) `src/components/layout/Footer.tsx` reads `_yoast_wpseo_focuskw` (via `blog/plugin/hil-expose-focuskw.php`) — the meta survives deactivation for existing posts and the footer falls back to the post title, but new posts only get `hil_focus_keyword`, so the footer should be pointed at `hil_focus_keyword` (a Website change, non-blocking for deactivation); (iii) Yoast's `wpseo_*` post meta and any Yoast-created redirects/tables should be exported first.
- Two Redirection rules exist live that no document records: `/sitemap_index.xml` → `/wp-sitemap.xml` and article #6 → `https://haveninlipa.com/staycation` (301, 0 published posts still link to it). Author/date unknown.
- Everything in step 1–6 needs an Administrator; the Analyst's Editor credential cannot reach Redirection, Yoast settings, Plugins, or LiteSpeed (SEO-DEC-019/-025).

### Outcome and amendments (2026-09-19, added after execution)
- **Sequence as executed:** steps 1–4 as written, with a **cache purge inserted after step 3 and again after each plugin change** (a purge must precede step 4, or the stale cached Yoast 301 recreates the loop). **Two cache layers must be cleared, in this order: LiteSpeed (Toolbox → Purge All), then Hostinger's CDN (hPanel → Websites → the `blog.haveninlipa.com` row → CDN → Flush cache).** LiteSpeed also caches 404s. Step 7 was done by Cedric in the post editor's "SEO (HIL)" box rather than by Analyst REST.
- **Plugin releases:** v1.1.2 (robots filter fixed; Status panel), v1.1.3 (the taxonomy-exclusion filter had hooked a non-existent WordPress hook since v1.0.0, so core's sitemap listed 149 noindex archives; the users provider is emptied rather than dropped because on WordPress 7.0.5 an unregistered sitemap type returns a 200 soft page), v1.1.4 (blog-index title, canonical, description, `og:*`/Twitter and default-image setting, inert while Yoast is active), v1.1.5 (paginated canonical no longer keeps query strings).
- **Rollback used once:** the first Yoast deactivation failed (homepage and `/page/N/` lost canonical, description, `og:*`; title suffix doubled — the 09-07 parity check covered only the 34 posts). Minimal rollback (reactivate Yoast; XML sitemaps left OFF so the sitemap was untouched) restored the homepage exactly. The second deactivation passed.
- **Deliberate departure from "roll back on any failure":** the second deactivation showed one low-severity defect (canonical retained query strings on `/page/N/` only). It was fixed forward (v1.1.5) instead of rolled back, on the Owner's upload of the fix, because plain URLs were correct and rollback would have re-introduced duplicate tags.
- **Findings that corrected earlier records:** all six flags were turned ON on 2026-09-08, not 2026-09-07; the article #6 301 was already live and no post linked to it; the "disable Yoast's schema in General → Features" step does not exist in Yoast 28.4.
- **SEO-DEC-020 and SEO-DEC-023 are now complete** (their 2026-09-19 "partial" annotations are resolved): core sitemap is live with the 301; the plugin's approved descriptions are the only ones served.
- **Post-cutover verification passed (2026-09-19, 22:35–22:38 UTC):** independent read-only pass, 4,238 in-scope checks, 0 failures, no rollback or remediation required (`HIL_SEO_Implementation_Plan.md` §8.10). Two documented, non-blocking differences are recorded there: 11 descriptions are the ≤158-char trim of longer approved text (Owner may accept or shorten them), and noindex archives use the core title format and carry no `og:*` (by design).
- **Still open, not part of this decision:** GSC "Success" for the new sitemap and removal of the old entry; one crawl cycle of monitoring; the Yoast-deletion prerequisites above; verification of the 6 unpublished posts through the authenticated preview route.

### Supersedes
The sequence in SEO-DEC-020's Implications, `HIL_Yoast_Migration_and_Rollback_Plan.md` Stage 9, and `HIL_SEO_Implementation_Plan.md` §4 / §7 (v1.1.1 upload). SEO-DEC-020's decision itself (core sitemap is the system of record) is unchanged.


---

## SEO-DEC-027 — Owner decisions after the production verification: technical cutover formally closed; 11 descriptions rewritten; archive format accepted; no OG on noindex archives; monitoring and scheduled-post checkpoints

Date: 2026-09-19
Status: Active — decisions 1–5 in force; the 11-description rewrite is being applied (see `HIL_SEO_Implementation_Plan.md` §8.11 for the live status line)
Area: Technical SEO / Content

### Decision
1. **The technical `hil-seo`/Yoast cutover is formally closed.** The Owner accepted the §8.10 read-only verification (4,238 in-scope checks, 0 failures). Remaining work is monitoring, not implementation.
2. **Rewrite the 11 truncated meta descriptions** (posts 27, 77, 205, 307, 451, 552, 575, 590, 602, 626, 718) to ~150–158 characters ending naturally, no ellipsis. Only these 11 change. Final text and the editorial choices made are in plan §8.11: post 27's unsupported "1 hour away" replaced by the approved non-numeric wording; unverifiable "brownout-proof" and the "cheaper" comparison dropped; and, per HIL DEC-007, hard-coded capacities removed — post 205's approved "sleeps 5, 9, or 13" was wrong against the live inventory (Mickey sleeps 7/11/15), post 552's "9-pax" was a literal.
3. **Accept the revised archive-title format** (`X – Haven in Lipa Blog`) on noindex archives.
4. **Do not add Open Graph/Twitter metadata to noindex archives.**
5. **Yoast stays installed but inactive; deleting it needs separate Owner approval.**
6. **Monitoring continues** until `/wp-sitemap.xml` shows Success in Google Search Console and one clean crawl cycle completes (Analyst-proposed definition: 14 days to 2026-10-03, criteria in plan §8.11 — Owner may amend). A verification checkpoint is added for each of the six scheduled posts (IDs 763–768) after publication.

### Reason
The §8.10 advisories were the only open items after verification. The 11 descriptions were the documented ≤158-character trim of longer approved text (mid-sentence "…"); the archive title format is the documented Audit §3 fix and the archives are noindex; social tags on noindex archives add no search value.

### Implications
- Not changed and needing a separate Owner decision: post 75's live description contains "just 1 hour from the metro" (same class as SEO-DEC-023) plus a hard-coded "₱1,500/night" and "400 Mbps".
- The paginated-title suffix `Page N of M` will change from 3 to 4 once more than 30 posts are published; that is expected.
- The Analyst never publishes (SEO-DEC-010); each scheduled post publishes on the Owner's schedule and is then verified.

### Supersedes
Closes advisories 1–3 of plan §8.10 and the "Still open" list of SEO-DEC-026 except GSC "Success", the crawl cycle, Yoast deletion, and the six-post checkpoints.

---

## SEO-DEC-028 — Blog claim-durability rules applied to posts 75, 205 and 552; post 75 description rewritten; post 763 handled by checkpoint, not reopened

Date: 2026-09-19
Status: Decided; the WordPress edits are consolidated in one owner batch (plan §8.12) because WordPress write credentials were unavailable to the Analyst session
Area: Content / Technical SEO

### Decision
1. **Post 75's meta description** is rewritten to 152 characters with a natural ending and no drive-time, price or speed figure (durable wording per SEO-DEC-023).
2. **Remove or correct claims that are wrong, contradicted or likely to change; keep facts that are current and integral.** Wrong/contradicted (changed): "400 Mbps" (property pages say up to 340 Mbps) and "500+/400+ mbps"; post 75's excerpt price "P2,000" (current ₱1,500); "1 hour"/"about 1 hour"/"2 hours" travel times; post 205's "sleeps 5, 9, or 13", "8 to 13 guests", "families of 4 to 9"; post 552's "One hour from SLEX vs. 3+ hours". Correct but hard-coded HIL rates and third-party fares/meal prices in post 75 and the per-night prices in post 552's "Where to stay" list are made number-free (HIL DEC-007).
3. **Retained on purpose:** the 5- and 9-guest capacities of Cozy 1BR and Spacious 2BR (current per `/api/properties.json`; the obsolete 5/9/13 set was Mickey's old configuration), Mickey's current 7/11/15 configurations and room-level bed counts, the "48 hours" notification window (policy), post 552's cost-per-head math and the heading "What 9 people actually need…" (the article's purpose; a one-sentence currency note is added), and post 552's "save 15–20% vs Airbnb" (a pricing/policy claim, needs an Owner decision).
3a. **Headings, URLs, slugs and structure are preserved.** The one heading-level change is post 75's title and SEO title, from which the parenthetical "(400 Mbps WiFi + ₱1,500/night)" is removed.
4. **Post 763** is neither reopened nor unscheduled: its schedule and accessibility wording are covered by owner batch C, with qualified-wording patterns for any statement that cannot be supported.

### Reason
The Owner asked for durable, non-contradicted copy without materially altering policy, pricing, property facts or publication status. The main-site feed is the source of truth for prices and capacities (DEC-007), so only figures that disagree with it, or that are unnecessary and volatile, were changed.

### Implications
- The same claim classes exist blog-wide (travel times in all 28 posts, prices in 27, capacity phrases in 25, Mbps in 10). A content-durability sweep is a separate, owner-approved work package; nothing beyond posts 75/205/552 was changed or scheduled for change here.
- Verification of the batch is prepared and runs once the Owner reports it applied; if any verified stale output remains, LiteSpeed then the CDN are purged.

### Supersedes
Extends SEO-DEC-027 (item 2 covered only the 11 descriptions); does not supersede any earlier decision.

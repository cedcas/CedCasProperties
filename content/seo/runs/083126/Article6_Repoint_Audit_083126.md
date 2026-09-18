# Article #6 Repoint — ✅ EXECUTED 2026-08-31

**`/staycation` confirmed live (200). Executed the same day.** All 22 originally-audited posts repointed, plus 9 more found in a full-site sweep afterward: the two not-yet-published scheduled articles (#28, #29 — would have shipped with the stale link otherwise), all 6 of today's new drafts (#30–35, which used the #6 URL in their own standard footer), and a self-referencing link found inside article #6's own content. **31 posts total, 36 link occurrences, 0 remaining references anywhere (checked across publish/future/draft/pending) — verified by re-fetching every post after the edit, not assumed from the update response.** `/staycation` confirmed still resolving 200 after the sweep. **Clear for the developer to add the `#6 → /staycation` 301** — nothing left pointing at the old URL that the redirect would need to catch as a safety net.

---

# Article #6 Repoint — Audit (ready to execute, blocked on `/staycation` existing)

**Live-crawled 2026-08-31.** Article #6 (`why-book-direct-instead-of-airbnb-a-philippines-hosts-honest-take`) is currently linked in-body from **22 of 26 published posts**, 33 total link occurrences. Full list below, ready to run the moment `/staycation` is live — re-verified `/staycation` is still 404 as of this crawl, so **not executed yet**: repointing now would point 33 links at a 404. Sequence stays build → repoint → 301, per the approved brief.

| Post ID | Slug | # links to #6 |
|---|---|---|
| 552 | barkada-getaway-near-manila-why-a-whole-house-in-lipa-beats-a-beach-resort-cost-per-head-math-inside | 2 |
| 718 | heroes-day-weekend-lipa-2026-quiet-itinerary | 1 |
| 626 | ninoy-aquino-day-long-weekend-lipa-2026 | 2 |
| 602 | lipa-charter-day-history-coffee-town-to-city | 1 |
| 499 | august-long-weekends-lipa-city-2026 | 2 |
| 489 | lipa-pilgrimage-guide | 1 |
| 478 | casa-de-segunda-lipa-city | 1 |
| 466 | lipa-vs-tagaytay-an-honest-comparison-from-a-host-who-lives-in-lipa | 2 |
| 451 | work-from-lipa-rainy-season-july | 2 |
| 398 | best-lomi-lipa-city | 1 |
| 365 | lipa-barako-coffee-heritage | 1 |
| 355 | indoor-things-to-do-in-lipa-city-when-it-rains | 2 |
| 336 | independence-day-long-weekend-lipa-2026 | 2 |
| 307 | family-weekend-batangas-without-beach-crowds | 2 |
| 272 | romantic-getaway-batangas-lipa-city | 1 |
| 205 | mickey-in-lipa-coming-soon | 3 |
| 268 | family-staycation-lipa-city-batangas | 1 |
| 75 | work-from-lipa-the-affordable-remote-work-staycation-near-manila | 2 |
| 70 | taal-volcano-day-trip-from-lipa-city-2026-updated-guide | 1 |
| 63 | best-restaurants-cafes-in-lipa-city-batangas-2026-food-guide | 1 |
| 44 | mt-maculot-hiking-guide-2026-trail-tips-routes-where-to-stay-in-lipa | 2 |
| 27 | weekend-getaway-in-lipa-city-batangas-your-chill-escape-near-manila | 1 |

**Not linking to #6** (checked, confirmed clean — no action needed): 4 published posts, including the newest ones not yet cross-linked.

**Execution plan once `/staycation` is live:** re-fetch each post's content via REST, replace the `#6` URL with the `/staycation` URL (anchor text unchanged unless it specifically says "Why Book Direct" — a few do and may read oddly pointing at a staycation page; flagging those for a light anchor-text edit at execution time, not just a URL swap), verify all 33 links resolve 200 post-edit, then hand back the "clear to add the 301" signal. This is a same-day turnaround once the page exists — no need to wait on me, just say the word.

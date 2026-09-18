# Claude Code Prompt — HIL, 2026-08-26

> Paste everything below the line into Claude Code in the HAVENINLIPA repo.
> Two items: a status check with a real deadline, and two one-line spec corrections. Independent of each other.

---

Read `About HIL/HIL SEO Technical Specification.md` and `About HIL/HIL Blog Technical Specification.md` before Task 2 — do not restate what they already cover, just correct the two stale lines.

Update `About HIL/HIL Commits.md` and the relevant spec for anything you ship.

---

## Task 1 — Stay Match: status check against a hard deadline

**Why:** The brief ([081526/Stay_Match_Engine_ClaudeCode.md](../081526/Stay_Match_Engine_ClaudeCode.md)) was delivered 2026-08-15 and its last prerequisite (blog remediation P2 — stripping `?utm_source=chatgpt.com` from internal links) cleared 2026-08-16. **Deadline: live by Friday, August 28.** Article #27 (the first Stay Match pilot, "Barkada Getaway") is scheduled to publish automatically Monday, August 31 at 08:00 — if the component isn't live by then, that article either publishes without it or needs retrofitting after the fact. There is no slack in this date; it's set by the WordPress publish schedule, not by us.

**What I need back, not a rebuild:**
- Is it built and deployed? If yes: confirm live at the route/component level, and confirm `stay_match_view` / `stay_match_click` are firing (GA4 DebugView or equivalent).
- If not yet live: what's actually blocking, and is Friday realistic? If Friday slips, say so **now** rather than Monday morning — we'd rather scope down (ship the fallback ladder only, confidence-scoring later) than miss the pilot entirely.
- Confirm which confidence tier the current build defaults to when intent can't be resolved from the post (should fall back to the 5-property ladder per the brief, never an empty state).

**Done when:** a one-line status (live / blocked-on-X / needs-more-time) posted back today or tomorrow, so there's a full business day to react before Friday.

---

## Task 2 — Two stale lines in the specs (from the 8/16 code review)

Both are documentation-only — no behavior changes, no redeploy needed.

**2a. `About HIL/HIL SEO Technical Specification.md` — the `/about` section describes caching that no longer exists.**
It currently says the page "became `force-dynamic` with a one-hour `s-maxage` in `next.config.ts`." That was superseded by `c2c5e6b`: `/about` and `/properties` now go through the cached **loaders** (`getPublicListings`, `unstable_cache`, 1h) in `src/lib/listings.ts`, and `headers()` on these pages carries only the CSP — there is no cache directive in `next.config.ts` for them anymore. A reader hitting the `/about` section first would wrongly conclude an edge cache is active there.
**Fix:** rewrite that line to describe the `unstable_cache` loader approach and point at `c2c5e6b`. One line.

**2b. Same spec — a latent typing risk from `unstable_cache`, worth documenting even though nothing is broken today.**
Values round-trip through `unstable_cache` as JSON, so a Prisma `Decimal` comes back as a **string** and a `DateTime` as an **ISO string**, while the TS types on the loader's return value still claim `Decimal` / `Date`. Every current consumer goes through `Number(...)` before doing arithmetic, so it's silent today. The failure mode is a future consumer doing arithmetic directly on `pricePerNight` and getting string concatenation instead of a type error.
**Fix:** add a short note in the spec (near the loader definition) flagging that the return type is JSON-serialized, not the raw Prisma type — enough that the next person touching this code doesn't assume otherwise. Not asking for a runtime fix or a type-level guard unless you think it's cheap; the ask is documentation so the risk isn't invisible.

**Done when:** both lines corrected, `About HIL/HIL Commits.md` updated, no code changes required for either.

---

## Explicitly NOT in scope

- **`/staycation`** — separate brief, sequenced for the week of Sep 1–5 (link-repoint first, then build, then the #6 301). Not this week.
- **Rebuilding or redesigning Stay Match** — Task 1 is a status check against the existing brief, not new scope.

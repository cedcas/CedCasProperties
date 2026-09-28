# Claude Code Prompt — HIL, 2026-08-31 (spec confirmation only)

> Paste into Claude Code in the HAVENINLIPA repo. This is a status check, not new work — send only if the two spec corrections from [082626/ClaudeCode_Prompt_082626.md](../082626/ClaudeCode_Prompt_082626.md) Task 2 haven't been confirmed done yet.

---

Quick confirmation needed on two doc-only corrections asked for this week in `About HIL/HIL SEO Technical Specification.md`:

1. The `/about` section — does it still say the page "became `force-dynamic` with a one-hour `s-maxage` in `next.config.ts`"? It should instead describe the `unstable_cache` loader approach from `c2c5e6b` (`getPublicListings`, 1h), since `headers()` on that page now carries only the CSP.
2. Is there a note near the loader definition flagging that `unstable_cache` round-trips values through JSON — so a Prisma `Decimal` comes back as a string and `DateTime` as an ISO string, even though the TS types still say `Decimal`/`Date`?

**Just need:** done / not done for each, and if not done, an ETA. No code changes, no redeploy — text only.

# Stay Match enrollment additions — 2026-10-10

**What:** per the 2026-10-10 marketing-measurement task brief, `_hil_stay_intent` was set (REST
meta-only, backups taken) on posts 27, 602, 489 (`small family or couple`), 75
(`remote workers`), 307 (`families with kids`), and 763 (`multi-generation family trips`),
plus a CTA and an intent on the four scheduled posts 847–850. Block verified rendering on
27, 75, 763 (per the brief). **This record is written by the engineering session that
received that brief, not by the session that performed the WordPress writes** — this
session has no WordPress REST credentials, so the table below was **not** independently
re-verified against live `blog.haveninlipa.com` postmeta. It documents the brief's claims and
adds the plugin-scoring columns (tier/confidence/properties shown), computed against this
repo's real `bestForSegments` content, the same way `content/seo/runs/100426/Stay_Match_Enrollment_100426.md`
did for the prior batch.

**Known gaps in this record (confirm against WordPress before relying on it for retuning):**
- Slugs for posts 27, 602, 489, 307, 763 are not available to this session (only post IDs were
  given). Posts 847–850's slugs are known from `docs/HIL_COMPLETION_LOG.md`'s 2026-09-25 entry:
  `milestone-birthday-staycation-lipa`, `business-trip-accommodation-lipa-lima-estate`,
  `sports-team-accommodation-lipa-2027-raam`, `group-accommodation-lipa-booking-checklist`.
- The exact intent string(s) set on 847–850 were not supplied to this session — the brief says
  only "the CTA + intent," not the phrase. Given each post's topic, a plausible per-post intent
  exists (e.g. a milestone-birthday post → `birthday celebration`; the business-trip post →
  `remote workers`; the two group/sports posts → a barkada/group intent), but this session is
  **not** recording a guessed value as fact. Fill this table's `847–850` rows from the live
  postmeta before using them for anything.

| Post ID | Slug | Intent set | Tier | Confidence | Properties shown |
|---|---|---|---|---|---|
| 27 | *(not available to this session)* | `small family or couple` | double | 0.67 | `mickey-in-lipa--family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 602 | *(not available to this session)* | `small family or couple` | double | 0.67 | `mickey-in-lipa--family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 489 | *(not available to this session)* | `small family or couple` | double | 0.67 | `mickey-in-lipa--family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 75 | *(not available to this session)* | `remote workers` | single | 1.00 | `cozy-1-bedroom` |
| 307 | *(not available to this session)* | `families with kids` | double | 1.00 | `mickey-in-lipa--family-house--sleeps-11`, `spacious-2-bedroom` |
| 763 | *(not available to this session)* | `multi-generation family trips` | double | 0.75 | `mickey-in-lipa--full-family-house--sleeps-15`, `spacious-2-bedroom` |
| 847 | `milestone-birthday-staycation-lipa` | *(value not supplied to this session)* | — | — | — |
| 848 | `business-trip-accommodation-lipa-lima-estate` | *(value not supplied to this session)* | — | — | — |
| 849 | `sports-team-accommodation-lipa-2027-raam` | *(value not supplied to this session)* | — | — | — |
| 850 | `group-accommodation-lipa-booking-checklist` | *(value not supplied to this session)* | — | — | — |

Tier and confidence for posts 27/602/489/75/307/763 were computed by running `hil_sm_score_properties()`
from the live plugin version (v1.0.2 — v1.0.3's upsell-segment fix, built in this same session,
is not yet uploaded to WordPress, see `Stay_Match_v1.0.3_Deploy_Note.md`) against the real
`bestForSegments` content in `prisma/property-content/b34-content.ts` and
`prisma/property-content/mickey-content.ts` (the source of truth `/api/properties.json` serves
from) — not against a live `/api/properties.json` fetch, since this session has no outbound
access to it either. Matches the 2026-10-04 batch's scoring exactly where the same intent phrase
repeats (`small family or couple`, `families with kids`).

## How these intents map (consistent with the 2026-10-04 batch's reasoning)

- `small family or couple` (27, 602, 489): same intent as 6 posts in the prior batch — lands in
  the two-option tier (Sleeps-7 / Cozy 1BR) on purpose, for mixed general-audience readers.
- `remote workers` (75): a near-exact match to Cozy 1BR's own "Remote workers and digital
  nomads" segment — single pick, confidence 1.00.
- `families with kids` (307): same intent as posts 355/268 in the prior batch — ties Sleeps-11
  and the 2BR.
- `multi-generation family trips` (763): new. Matches Sleeps-15's "Reunions and multi-generation
  trips" segment most strongly (0.75), paired with the 2BR's "Work trips with extended family"
  (0.67) in the double tier — plausible given 763's content (reviewed with the SEO-DEC-027
  schedule-preservation checkpoint; see `docs/HIL_PROJECT_STATUS.md`).

## Verification

**Not performed by this session** (no WordPress credentials). The brief states block rendering
was verified live on 27, 75, and 763; this record does not independently confirm that.

## Rollback

Clear `_hil_stay_intent` on the affected post (empty string via the Stay Match meta box or REST)
— empty means not enrolled, and the post renders exactly as before enrollment.

# Stay Match enrollment additions — 2026-10-10

**What:** per the 2026-10-10 marketing-measurement task brief, `_hil_stay_intent` was set (REST
meta-only, backups taken) on posts 27, 602, 489 (`small family or couple`), 75
(`remote workers`), 307 (`families with kids`), and 763 (`multi-generation family trips`),
plus a CTA and an intent on the four scheduled posts 847–850. Block verified rendering on
27, 75, 763 (per the brief). **This record is written by the engineering session that
received that brief, not by the session that performed the WordPress writes** — this
session has no WordPress REST credentials, so the table below was later completed and verified by HIL Marketing (see "Verification" below). It documents the brief's claims and
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
| 27 | `weekend-getaway-in-lipa-city-batangas-your-chill-escape-near-manila` | `small family or couple` | double | 0.67 | `mickey-in-lipa--family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 602 | `lipa-charter-day-history-coffee-town-to-city` | `small family or couple` | double | 0.67 | `mickey-in-lipa--family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 489 | `lipa-pilgrimage-guide` | `small family or couple` | double | 0.67 | `mickey-in-lipa--family-staycation--sleeps-7`, `cozy-1-bedroom` |
| 75 | `work-from-lipa-the-affordable-remote-work-staycation-near-manila` | `remote workers` | single | 1.00 | `cozy-1-bedroom` |
| 307 | `family-weekend-batangas-without-beach-crowds` | `families with kids` | double | 1.00 | `mickey-in-lipa--family-house--sleeps-11`, `spacious-2-bedroom` |
| 763 | `senior-friendly-staycation-guide-lipa` | `multi-generation family trips` | double | 0.75 | `mickey-in-lipa--full-family-house--sleeps-15`, `spacious-2-bedroom` |
| 847 | `milestone-birthday-staycation-lipa` | `reunions birthday celebrations` | double | 0.78 | `mickey-in-lipa--full-family-house--sleeps-15`, `mickey-in-lipa--family-house--sleeps-11` |
| 848 | `business-trip-accommodation-lipa-lima-estate` | `business work trip remote workers` | double | 0.80 | `spacious-2-bedroom`, `cozy-1-bedroom` |
| 849 | `sports-team-accommodation-lipa-2027-raam` | `groups 12 to 15 people` | single | 0.75 | `mickey-in-lipa--full-family-house--sleeps-15` |
| 850 | `group-accommodation-lipa-booking-checklist` | `barkada weekends 12 to 15` | single | 1.00 | `mickey-in-lipa--full-family-house--sleeps-15` |

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

## Re-tuned weak intents (2026-10-10, HIL Marketing, REST meta-only, backups taken)

| Post ID | Slug | Status | Before | After | Tier | Confidence | Properties shown |
|---|---|---|---|---|---|---|---|
| 764 | `solo-travel-guide-lipa` | publish | `Solo` (ladder, 0.00) | `remote workers` | single | 1.00 | `cozy-1-bedroom` |
| 766 | `team-building-house-rentals-lipa` | future 2026-10-12 | `Company Team Building 15 or more` (ladder, 0.27) | `groups 12 to 15 people` | single | 0.75 | `mickey-in-lipa--full-family-house--sleeps-15` |
| 767 | `wedding-guest-accommodation-lipa` | future 2026-10-19 | `Wedding entourage of 15 or more` (ladder, 0.33) | `reunions birthday celebrations` | double | 0.78 | `mickey-in-lipa--full-family-house--sleeps-15`, `mickey-in-lipa--family-house--sleeps-11` |

## Verification (added by HIL Marketing, which performed the writes)

- All values above were read back via REST (`context=edit`) after the write; status, date, title and content were unchanged on every post; only `meta._hil_stay_intent` (plus the approved closing CTA on 847–850) changed.
- Live render confirmed on 27, 75, 763 and 764 (764 shows one card → `cozy-1-bedroom`). 766/767/847–850 are `future` and were verified via REST only.
- Tier/confidence computed against the live `/api/properties.json` on 2026-10-10 with plugin **v1.0.2** scoring. **v1.0.3 (if uploaded) changes several of these** — see the v1.0.3 PR review note.
- Backups: `/workspace/hil-backups/<id>-pre-staymatch.json` and `<id>-pre-cta.json` on the HIL box (not in the repo; they contain full post bodies).

## Rollback

Clear `_hil_stay_intent` on the affected post (empty string via the Stay Match meta box or REST)
— empty means not enrolled, and the post renders exactly as before enrollment.

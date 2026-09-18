# content/seo/ — SEO & content operations workspace

This tree holds active SEO research, evidence, briefs, and the historical artifacts
migrated from the shared `/VSCode/seo` workspace on **2026-09-17**, when HIL's SEO
governance was consolidated into this repository (see
[docs/HIL_SEO_SPECIFICATION.md](../../docs/HIL_SEO_SPECIFICATION.md) and
[About HIL/HIL_DECISIONS.md](../../About%20HIL/HIL_DECISIONS.md)'s "Migrated SEO
Decisions" section, `DEC-018`). It sits alongside, and does not replace, HIL's own
documentation hierarchy in `About HIL/` — see the "Where this fits" section below.

## Folder purposes

| Folder | Purpose |
|---|---|
| `runs/` | Dated snapshots of a work session's raw deliverables — one folder per date-stamped run (`MMDDYY`), named for when the work was done, not for a phase. Contents are point-in-time evidence and analysis; don't edit a past run's files after the fact — start a new run. Migrated runs: `040826` through `090726` (13 runs). |
| `research/` | Standing research artifacts not tied to one dated run — `Best-Practices.md`, `Fact_Checking_Guide.md`, and the Kim keyword-research workbook. |
| `evidence/` | Standing evidence not tied to one dated run and not yet processed into `research/` or `analytics/`. Empty at migration time — populate going forward as needed. |
| `briefs/` | Content briefs written ahead of drafting — target keyword/topic, audience, structure, internal-link targets. Gated by the approval process below before anything is drafted from them. Empty at migration time. |
| `drafts/` | Draft copy and pending assets in progress. Contains the migrated `Featured Images/` folder (pending featured images for draft/queued articles) and the two Mickey outreach/social drafts. Nothing here is published; publishing is a WordPress action taken by Cedric, never a repository action. |
| `metadata/` | Title tag / meta description worksheets. Empty at migration time — the current title/meta implementation is the `hil-seo` WordPress plugin (see `docs/HIL_SEO_SPECIFICATION.md`), not a file in this folder. |
| `internal-links/` | Internal-linking maps and audits — which pages should link to which, anchor text notes. Empty at migration time; see `research/Internal Linking Guide.md`-equivalent content already living in `About HIL/Internal Linking Guide.md`. |
| `redirects/` | Redirect value-grading work product. Empty at migration time. |
| `schema/` | Schema-related research or gap analysis. Authoritative schema *code* lives in the Next.js app (see `HIL_DECISIONS.md` DEC-008/DEC-009) and the `hil-seo` plugin — this folder is for evidence and proposals, never a competing implementation. Empty at migration time. |
| `analytics/` | Processed analytics and the current live tracker (`HavenInLipa_SEO_Tracker.xlsx`). Superseded backup copies of this tracker are in `archive/legacy-deliverables/`, not here. |
| `approvals/` | Records of approval-gate sign-off — dated notes confirming Cedric approved a keyword set, an outline, a competitor list, a decision, etc. Empty at migration time; historical approvals are recorded inline in the archived `SEO_DECISIONS.md` / `SEO_COMPLETION_LOG.md`. |
| `archive/` | Frozen historical documents — the retired `SEO_PROJECT_STATUS.md`, `SEO_DECISIONS.md`, `SEO_COMPLETION_LOG.md`, `PROJECT_STATUS.md` (each with a supersession notice prepended), plus `legacy-deliverables/` (superseded report drafts and tracker backups). Read-only history; not maintained going forward. |

`tools/seo/` (project root, not inside `content/`) holds the HIL-specific Python
reporting/sync scripts migrated alongside this tree — see that folder's own README.

## Where this fits

HIL's durable documentation hierarchy is `About HIL/` (gitignored — current status,
decisions, technical specs, completion log; see that folder's own layered index,
`About HIL/HIL Technical Specification.md`). This `content/seo/` tree and
`docs/HIL_SEO_SPECIFICATION.md` are new as of the 2026-09-17 consolidation and are
git-tracked, unlike `About HIL/`. The mapping:

| Governance need | Document |
|---|---|
| Current whole-product status | `About HIL/HIL_PROJECT_STATUS.md` |
| Durable whole-product decisions (`DEC-###`) + migrated SEO decisions (`SEO-DEC-###`) | `About HIL/HIL_DECISIONS.md` |
| How the website/blog/SEO implementation works | `About HIL/HIL * Technical Specification.md` (Website/Blog/SEO) |
| Completed work history | `About HIL/HIL_COMPLETION_LOG.md` |
| Focused SEO governance (facts/decisions/planned/deferred/assumptions/gates) | `docs/HIL_SEO_SPECIFICATION.md` |
| SEO/content working artifacts | `content/seo/` (this tree) |

## Naming convention

Dated runs use `MMDDYY` (matching the source workspace's convention — `081426` = 14 Aug
2026, `090726` = 7 Sep 2026), not ISO dates, so the migrated folder names didn't need
renaming. New runs should follow the same `MMDDYY` pattern for consistency with the
migrated history.

## Sensitive-data restrictions

Do not commit: `.env` files, credentials, WordPress Application Passwords, SSH keys, or
unredacted sensitive exports. The GSC/GBP/WordPress-state exports migrated here (see
`runs/090726/yoast-pre-migration-backup/`) are aggregate marketing/CMS-state data —
search queries, click/impression counts, post metadata, category/tag/author state — not
credentials or guest PII. If a future export contains anything more sensitive, keep the
original outside Git and add only a sanitized inventory or reference here instead.

## Evidence vs. plans vs. drafts vs. published material

- **Evidence** (`runs/`, `research/`, `evidence/`, `analytics/`) — what was observed or
  measured. Not a recommendation.
- **Plans** (`briefs/`, `internal-links/`, `redirects/`, `schema/`) — a proposed course of
  action derived from evidence, awaiting approval.
- **Drafts** (`drafts/`) — copy and assets in progress, not yet approved or published.
- **Published material** — lives in WordPress (`blog.haveninlipa.com`) or the Next.js app,
  not in this repository. Nothing in `content/seo/` is itself the live site; publishing is
  always a separate, explicit action by Cedric (`WP_ALLOW_PUBLISH=false` — see
  `docs/HIL_SEO_SPECIFICATION.md`).

## Approval requirements

**This migration does not authorize new SEO implementation, publishing, Yoast changes,
cache purges, or production changes.** See `docs/HIL_SEO_SPECIFICATION.md` for the current
approval gates and everything still open as of 2026-09-17.

## Archive rules

A document moves to `archive/` when it is superseded and will not be updated again.
Archived documents keep their original content with a short supersession notice prepended
(as was done for the four documents migrated here) — never silently edit archived history
to match current facts.

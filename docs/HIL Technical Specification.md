# Haven in Lipa — Technical Specification (Index)

> **As of 2026-06-26 this document was split into focused specs** so each aspect of the project can be reviewed independently. **As of 2026-09-06 the record became a layered documentation system** — this page indexes all of it. This page itself is just an index — the content lives in the documents below. **As of 2026-09-27 every layer lives in the git-tracked `docs/` folder** (moved from the gitignored `About HIL/`, so PRs update the docs alongside the code); all links below are relative to `docs/`. The former `About HIL/` copies of these files are superseded. Reference material (guides, briefs, diagrams, test plans, punch list) stays in `About HIL/`.

## Layer 1 — Current status (read this first)

[HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md) (`docs/HIL_PROJECT_STATUS.md`) — the single source of truth for **current** HIL status: what's live, what's in progress, what's blocked, what's next. Deliberately short (~100 lines) and never accumulates history. Start every session here.

## Layer 2 — Decision log

[HIL_DECISIONS.md](HIL_DECISIONS.md) (`docs/HIL_DECISIONS.md`) — **why** the architecture intentionally works the way it does (`DEC-001`, `DEC-002`, …). Consult before re-litigating something that looks odd — it may already be a documented, deliberate choice.

## Layer 3 — Technical specifications (how it works)

| Document (all in `docs/`) | Scope |
|---|---|
| [HIL Website Technical Specification](HIL%20Website%20Technical%20Specification.md) | **Primary "home base" spec.** Shared infrastructure (tech stack, env vars, DB schema, email), the public site, the admin panel, guest messaging, pricing, discount codes, RBAC, security, file structure, build/deploy, test plans, and homepage performance/accessibility. |
| [HIL Blog Technical Specification](HIL%20Blog%20Technical%20Specification.md) | The WordPress blog at `blog.haveninlipa.com` — hosting, the `hil-expose-focuskw` plugin, the dynamic footer blog-link integration, and the Stay Match plugin. |
| [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md) | SEO and structured data — sitemap, canonicals, JSON-LD, the property-page schema builder, image alt text, SEO seed commands, and related SEO docs. |

## Layer 4 — Completion history

[HIL_COMPLETION_LOG.md](HIL_COMPLETION_LOG.md) (`docs/HIL_COMPLETION_LOG.md`) — concise record of completed work packages/phases, grouped by feature rather than by commit. Answers "was this already built, and what happened?" without rereading old commits.

## Layer 5 — Deep evidence

[HIL Commits](HIL%20Commits.md) (`docs/HIL Commits.md`) — running log of every commit pushed to `main`, classified by **Type** (HIL Website / HIL Blog / HIL SEO). Authoritative for granular change history; GitHub itself remains authoritative for the commits themselves.

## Layer 6 — SEO governance and working artifacts (added 2026-09-17)

As of the 2026-09-17 workspace consolidation ([DEC-018](HIL_DECISIONS.md)), two more
locations exist **outside** `About HIL/` (which stays gitignored) because they are
git-tracked by design *(since 2026-09-27 Layers 1–5 are git-tracked in `docs/` too)*:

| Location | Scope |
|---|---|
| [`docs/HIL_SEO_SPECIFICATION.md`](HIL_SEO_SPECIFICATION.md) | Focused SEO **governance** spec — verified facts, decisions, planned/deferred work, assumptions, open questions, owner actions, approval gates. Distinct from Layer 3's [HIL SEO Technical Specification](HIL%20SEO%20Technical%20Specification.md), which describes *how* the SEO implementation works. |
| [`content/seo/`](../content/seo/README.md) | SEO/content working artifacts and the migrated history of the former shared `/VSCode/seo/content for HavenInLipa/` workspace — dated `runs/`, standing `research/`, and `archive/` (the four original governance documents, preserved verbatim with supersession notices). |

**Where do I look?**
- *Where are we right now, what's next* → [HIL_PROJECT_STATUS.md](HIL_PROJECT_STATUS.md).
- *Why does it work this way* → [HIL_DECISIONS.md](HIL_DECISIONS.md) (includes migrated `SEO-DEC-###` decisions).
- *How a feature works* → the relevant spec (Website / Blog / SEO).
- *What's the current SEO governance state (facts vs. plans vs. gates)* → [`docs/HIL_SEO_SPECIFICATION.md`](HIL_SEO_SPECIFICATION.md).
- *Was this already built* → [HIL_COMPLETION_LOG.md](HIL_COMPLETION_LOG.md).
- *What changed and when, at commit granularity* → [HIL Commits](HIL%20Commits.md).

The per-session "Recent Commits" block that used to sit at the top of this file has been retired — that history now lives in [HIL Commits](HIL%20Commits.md). Do not revive it here.

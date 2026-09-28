# Haven in Lipa — Future Draft-Posting Workflow Contract

Date: 2026-09-07
Purpose: the exact standard every new HIL draft must meet once the custom plugin (see `HIL_Custom_SEO_Plugin_Requirements.md`) is live, so Cedric's remaining work per article is limited to images, placeholder resolution, final visual review, and scheduling/publishing.

---

## 1. The workflow, end to end

```
SEO Analyst prepares complete draft + metadata (via REST, using draft_common.create_draft())
        │
        ▼
Draft lands in WordPress as status=draft — WP_ALLOW_PUBLISH=false makes this
structurally impossible to skip (see Requirements doc §6.8)
        │
        ▼
SEO Analyst performs read-after-write verification (Requirements doc §6.5)
        │
        ▼
SEO Analyst sends Cedric a compact handoff (§4 below) — not the full draft pasted into chat
        │
        ▼
Cedric: adds featured + in-body images, removes resolved placeholders,
final visual review, schedules or publishes
```

This is SEO-DEC-010's model, unchanged — this document specifies the *content contract* a draft must satisfy before that handoff happens, not a new access rule.

---

## 2. What must already be true of a draft before handoff

Every item below must be set at creation time, through the REST field contract in the Requirements doc §6.3 — none of these are things Cedric fills in after the fact:

| Requirement | Where it lives | Verification method |
|---|---|---|
| Final H1/article title | `post_title` | Read-after-write string match |
| Approved slug | `post_slug` — set explicitly, never left to WordPress's auto-generated fallback | Read-after-write; **also re-confirm the live slug once scheduled/published**, per `Best-Practices.md`'s "confirmed live slug" rule — a CMS can silently alter a planned slug at publish time, so the Keyword Master's Target URL isn't trusted until it's been checked against what's actually live (this is exactly the article #17 gap the Backfill QA doc found — a live slug with no confirmed-slug record at all) |
| Complete article body | `post_content` | Rendered read-back, diffed against source markdown |
| Correct headings | Body content, checked at markdown→HTML conversion time (existing `draft_common.py` responsibility) | Visual structure check on read-back |
| Excerpt | `post_excerpt` | Read-after-write; also drives the meta-description fallback chain (Requirements doc §1) if `hil_meta_description` is ever left blank — though it shouldn't be, per the next row |
| Category and tags | `categories`/`tags` (resolved via `get_or_create_term`, matching the existing shared pattern) | Read-after-write; cross-check against the 9 live categories inventoried in the Audit — don't create a 10th category by typo |
| Author set to Haven | `author` | Read-after-write. **Contingent on the account actually being the Haven user** — already true today (REST credential authenticates as `author_slug="haven"`, WP user id 3) |
| Focus and supporting keywords | `hil_focus_keyword` / `hil_secondary_keywords` | Read-after-write; cross-checked against the Keyword Master row for the target article number before the draft is even created, not after |
| Final SEO title | `hil_seo_title` | Read-after-write |
| Final meta description | `hil_meta_description` | Read-after-write; length-checked against the ~155-char guidance (warning only, not a hard gate — Requirements doc §4) |
| Canonical | `hil_canonical_url` (left at `default` unless this draft is deliberately consolidating into another URL, per the SEO-DEC-007 pattern) | Read-after-write |
| Robots setting | `hil_robots_index` / `hil_robots_follow` (left at `default` for a normal article — `index, follow` is what every one of the 27 live published posts already correctly uses) | Read-after-write |
| Social metadata | `hil_social_image` (or left unset to fall through to featured image → site logo, Requirements doc §1) | Read-after-write |
| Schema selection | `hil_schema_type` (`blogposting` for a normal article) | Read-after-write |
| Internal links | Body content — checked against `draft_common.check_link_requirements()`'s existing internal/outbound guardrail, extended to flag the **October re-baseline lens** from SEO-DEC-011 (property pages over blog-to-blog links, where the topic allows it) | Automated link-domain check, already exists in shared tooling |
| Appropriate citations/external links | Body content | Manual Analyst judgment, per the Fact-Checking Guide's source-tiering rules — not automatable |
| CTA and Stay Match requirements | Body content — CTA placement per the article's cluster (Stay Match for Cluster 1/7 lodging-intent content, per SEO-DEC-005/011; standard CTA otherwise) | Manual, cluster-driven |
| Image placeholders | Body content, using the convention in §3 | Regex-scanned by the plugin's editorial-warning check (Requirements doc §4) |
| Suggested image subject, placement, filename, alt text | Encoded inside each placeholder (§3) — not a separate document Cedric has to cross-reference | Same regex scan |
| Final fact-check placeholders, if any | Body content, using the convention in §3 | Same regex scan |

---

## 3. Placeholder convention

Two forms, both regex-matchable by the plugin's editorial-warning check (Requirements doc §4) and by a quick `grep` if the Analyst wants to spot-check before handoff:

```
[OWNER IMAGE: description | suggested filename | alt text]
[OWNER VERIFY: exact fact requiring confirmation]
```

Rules:

- **One placeholder, one fact or one image.** Don't bundle two unresolved questions into one bracket — each must be independently removable once resolved, and independently trackable in the handoff (§4).
- **The bracket text is the complete instruction.** Cedric should never need to open a separate brief to understand what an `[OWNER IMAGE: ...]` placeholder is asking for — subject, filename, and alt text are all inline, matching the brief's own example format exactly.
- **Placeholders are visually and mechanically distinct from real content** — the leading `[OWNER` token is deliberately chosen to be greppable and to never collide with real article text (an article about brackets or citations is not a realistic HIL topic).
- **The plugin warns, it doesn't block.** An unresolved-placeholder warning shows in the admin metabox (Requirements doc §4) but does not prevent scheduling — Cedric is the final check, and a hard block that's occasionally wrong (a false-positive regex match) is worse friction than a warning he can override with eyes open.

---

## 4. The handoff

Sent to Cedric after read-after-write verification passes. Compact by design — this is a pointer to the draft, not a restatement of it:

```
Article: [Title] — WP ID [id]
Draft: [WP admin edit URL]
Images needed: [count] — see [OWNER IMAGE] markers in the draft
Placeholders to resolve: [count] — see [OWNER VERIFY] markers in the draft
Recommended publish date: [date, with 1-line reasoning if it's tied to a cluster/cadence decision]
Metadata: confirmed populated (focus keyword, SEO title, meta description,
robots, schema, categories/tags) — read-after-write verified against
WordPress, not assumed from the request payload.
```

No draft content is pasted into the handoff message itself — Cedric reviews the actual draft in WordPress, where the placeholders are inline and visible in context, not in a second, separately-maintained document that can drift from what's actually in the post body.

---

## 5. What this workflow deliberately does not ask Cedric to do

Per the brief's stated goal, Cedric's manual work per article is limited to exactly four things: add images, remove resolved placeholders, final visual review, schedule/publish. This workflow does not ask him to:

- Re-enter or copy-paste any SEO metadata from a separate document — everything in §2 is already in WordPress when he opens the draft (this is the brief's explicit anti-goal: "The system must not require Cedric to reopen every post and manually copy SEO metadata from a separate document").
- Choose a slug, title, category, or keyword set — all of that is a completed Analyst decision by the time the draft exists.
- Write or approve CTA/Stay Match placement — that's cluster-driven and already in the body.
- Resolve a fact-check question the Analyst could have resolved from existing sources — `[OWNER VERIFY]` is reserved for genuinely owner-only knowledge (current pricing, a policy confirmation, a fact only Cedric or Melody can attest to), matching the Fact-Checking Guide's existing risk-tiering, not used as a catch-all for research the Analyst should have done.

---

## 6. Interaction with the Keyword Master

Before a draft is created, the Analyst confirms the target article's row in the Keyword Master (cluster, primary/secondary keywords, target URL) — this is not new; it's the existing SEO-DEC-001 continuity discipline. What's new here: **after** the draft is scheduled/published, the Analyst re-confirms the Keyword Master's "Confirmed Live Slug" column against the actual live URL, closing the loop the Backfill QA doc found already broken once (article #17's live slug was never recorded). This is a one-line tracker update per article, not a new process — just an explicit step that wasn't previously written down as mandatory.

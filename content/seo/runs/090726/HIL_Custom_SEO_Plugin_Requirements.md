# Haven in Lipa — Custom SEO Plugin: Functional Requirements

Date: 2026-09-07
Working name: `hil-seo` (parallels `tms-core`/`ncs-core` naming)
Model: TribeMedSpa's `tms-core` (`includes/seo-meta.php`, `schema.php`) and NetCoreSolutions's `ncs-core` (`includes/seo-meta.php`, `seo-title.php`), both inspected directly (source read, not summarized from docs) — see the Current-State Audit §1 for the capability-by-capability mapping this spec is built from.

---

## 0. Design stance — what HIL takes from TMS/NCS, and what it doesn't

TMS and NCS both run **deliberately narrow** plugins: "WordPress already handles titles, canonicals, robots and XML sitemaps, so this only fills the three real gaps: a per-page meta description, Open Graph, and Twitter cards" (verbatim rationale from both plugins' `seo-meta.php`). That narrowness is correct *for those two sites* because neither runs a taxonomy-heavy blog with a thin-archive noindex policy, and neither needs a focus-keyword/editorial-tracking layer.

**HIL cannot copy that narrowness verbatim.** Two capabilities Yoast currently supplies are things TMS/NCS never needed and their plugins don't have:

1. **Per-post/per-archive robots control.** WordPress core has no per-post or per-taxonomy-type noindex mechanism — only a single sitewide "discourage search engines" switch. HIL's SEO-DEC-008 noindex policy (tag/category/author archives) is not optional hygiene here, it's an active, approved, currently-enforced decision. This module does not exist in `tms-core` or `ncs-core` and has to be built new for HIL, modeled on Yoast's own behavior rather than on TMS/NCS.
2. **Editorial fields with no rendering role** (focus keyword, secondary keywords, SEO completion status, validation warnings). NCS's `ncs_seo_title` is the closest precedent (an editable field with a single, narrow rendering hook), but focus keyword renders nothing — it exists purely to drive the Keyword Master workflow and the analyst's own QA. Build it as inert metadata, explicitly not a ranking signal, per the brief's own instruction.

Everything else below — SEO title override, meta description, canonical override, OG/Twitter, hand-authored schema — is a direct extension of the exact pattern already proven at TMS and NCS. Where this spec diverges from that pattern, the reason is stated inline.

---

## 1. Per-post fields

| Field | Meta key | Type | REST | Model |
|---|---|---|---|---|
| Focus keyword | `hil_focus_keyword` | string | read/write | New — editorial/tracking only. **Do not imply this field influences ranking.** Powers the Keyword Master sync and the "missing focus keyword" editorial warning (§4). |
| Secondary keywords | `hil_secondary_keywords` | string (comma-separated) or array | read/write | New, same rationale as above. |
| SEO title | `hil_seo_title` | string | read/write | Direct port of NCS's `ncs_seo_title` — hooked on `pre_get_document_title` at priority 20, exactly as NCS does it. Empty = falls back to WordPress's default title-tag behavior unchanged. Store the **full** title including brand suffix (NCS's own field description already states this rule — "include any brand suffix... since WordPress will not append its own site-name suffix on top of this"), so the editor decides the whole string and there is no second place a suffix can get appended twice (see Audit §4's archive-suffix inconsistency — this is exactly the failure mode a second suffix-injection point would risk recreating). |
| Meta description | `hil_meta_description` | string | read/write | Direct port of TMS/NCS `tms_meta_description`/`ncs_meta_description`, including the excerpt-fallback rule (posts only, never auto-excerpt on to a page-shaped body) and the word-boundary trim helper (`tms_core_trim_description`/`ncs_core_trim_description`, ~158 chars). |
| Canonical URL | `hil_canonical_url` | string (URL) | read/write | New field, narrow scope: only an **override**. Default behavior (self-referencing canonical from the permalink) needs no code — WordPress's own `rel_canonical()` already does this correctly (confirmed in the Audit — no canonical mismatches were found on any of the 27 published posts). This field only fires when populated. |
| Robots: index/noindex | `hil_robots_index` | enum: `default` \| `index` \| `noindex` | read/write | New — see §3. `default` defers to the archive/post-type-level rule; an explicit value overrides it. |
| Robots: follow/nofollow | `hil_robots_follow` | enum: `default` \| `follow` \| `nofollow` | read/write | Same pattern as above. HIL has never used `nofollow` on a real page (every noindex case found in the Audit is paired with `follow`) — the field exists for completeness and because Yoast exposes it, not because a current use case needs it. |
| Open Graph title | *(none — always derived)* | — | — | TMS/NCS don't expose a separate OG-title override either; both derive `og:title` from `wp_get_document_title()`, which already reflects `hil_seo_title` once that filter is in place. Do not add a redundant field. |
| Open Graph description | *(none — always derived)* | — | — | Same reasoning; derives from `hil_meta_description` via the same resolution chain as TMS/NCS. |
| Open Graph image | `hil_social_image` | integer (attachment ID) | read/write | New field, but the resolution chain is the direct TMS/NCS pattern: **featured image → this override is checked first → then the site logo fallback.** Adding the override ahead of the featured image (rather than TMS/NCS's simple two-tier chain) is the one deliberate difference, because HIL's brief explicitly asks for social-image control independent of the body's featured image (e.g., a square crop for OG vs. a wide featured image for the article header). |
| X/Twitter title/description/image | *(none — always derived)* | — | — | Twitter tags mirror OG tags exactly in both TMS and NCS (`twitter:title` = `og:title` source, `twitter:image` = same resolved image, card type computed from whether an image exists). No separate fields — this is correct, not a gap. |
| Schema type | `hil_schema_type` | enum: `blogposting` \| `webpage` \| `none` | read/write | New. Default `blogposting` for `post`, `webpage` for `page`. `none` is an escape hatch for a page type nobody has anticipated yet — emit nothing rather than guess, per TMS's own stated principle ("nothing is emitted for data we do not have"). |
| SEO completion status | `hil_seo_status` | enum: `not_started` \| `in_progress` \| `complete` | read/write | New, editorial only — see §4. Set by the Analyst as part of the draft-posting contract (see Draft-Posting Workflow doc), not auto-computed from field presence, because "all required fields are non-empty" is not the same claim as "this is actually ready," and a false-green auto-status is worse than an editor's own honest mark. |
| SEO notes / validation warnings | *(computed, not stored)* | — | read-only, computed | Not a stored field — see §4. Computed at read-time from the other fields' state (missing meta description, title-length out of range, unresolved placeholder markers in body, etc.) so it can never drift out of sync with the content it's warning about. |

All fields registered via `register_post_meta()` with `show_in_rest: true` and an `auth_callback` gated on `current_user_can( 'edit_posts' )` — the exact TMS/NCS/tms-core pattern (see `meta.php` in both plugins), which is also precisely what makes this immune to the AIOSEO/Yoast internal-table trap the shared `seo_plugin.py` module was built to work around: a field *you* register with `show_in_rest` round-trips correctly by construction, because there is no separate internal table it can silently fail to reach.

Post types: `post` for all the above (HIL's content is entirely blog articles; there is no second content type analogous to TMS's `tms_service`/`tms_provider`). If HIL ever adds a static Page (e.g., an about page) that needs its own SEO fields, extend the type list the same way TMS/NCS do (`array( 'post', 'page' )`) rather than building a page-specific variant.

---

## 2. Global controls

| Control | Mechanism | Notes |
|---|---|---|
| Site-name and title-suffix rules | A single filterable constant/option (e.g. `hil_seo_get_title_suffix()`), used by every template-level title (archives, author, search, 404) | Fixes the Audit §3 bonus finding (inconsistent `- Haven in Lipa Blog` vs `- blog.haveninlipa.com` suffix on some archive/search/author pages) at the source, in one place, instead of per-template patching. |
| Homepage metadata | `hil_meta_description` + `hil_seo_title` on the front-page Page/Post object, same resolution chain as any other singular — TMS's `is_front_page()` special-case (check the editable field before falling back to the tagline) is the correct model | HIL's homepage is a Post-type archive (blog index), not a static front page like TMS/NCS — confirm whether `is_home()` or `is_front_page()` is the right hook once the actual homepage template is inspected; not yet built into `hil-seo` v1.0.0 (the homepage currently falls through to WordPress's own default title/description, which the Current-State Audit found already correct and unremarkable). |
| Default social image | One site option (attachment ID or URL), used as the final fallback in the OG/Twitter image chain | Direct TMS/NCS pattern (`tms_image_hero_poster` / site icon fallback), substituting HIL's logo. |
| Organization/publisher entity | Hand-authored `Organization` schema node, hardcoded like TMS's `tms_core_schema_organization()` — name, logo (from the site icon, `ImageObject` with dimensions, not a bare URL), `sameAs` (Facebook/Instagram/TikTok/main-site — all four already live in Yoast's current output per the Audit, so this is a direct value transfer, not new research) | Do not invent a `founder` array the way TMS does — HIL has no equivalent public-founder fact pattern; only include what's true and supportable. |
| Haven author entity | `Person` schema node, linked by `@id` to the author archive, same cross-reference pattern as TMS's provider↔article author linking | Contingent on the author-migration decision — see the Author Requirements section of the Draft-Posting Workflow doc. Do not build this ahead of that decision (see Audit §1's note on the same point). |
| Search, date, author, category, tag, attachment, archive directives | The new robots module (§3) | |
| Sitemap ownership | See §5 | |
| Schema ownership | Wholly owned by this plugin once live — see Migration & Rollback doc for the "never two schema sources" sequencing | |
| Breadcrumb behavior | Hand-authored `BreadcrumbList`, TMS's `tms_core_schema_breadcrumbs()` is a near-direct model (simpler — HIL has no multi-CPT ancestor-trail logic, just post → category) | |
| Redirect ownership | **Not this plugin.** Redirection plugin (v5.10.0) already owns this, confirmed active and unaffected (Audit §6/§7) | Explicitly listed here to close the question, not because there's a build item. |
| Predictable metadata fallback rules | Documented once, in one place (a single "resolution order" comment block per field, exactly like TMS's `tms_core_get_meta_description()` docblock), not scattered across templates | |

---

## 3. The robots module (new — HIL's actual scope delta versus TMS/NCS)

This is the one module with no TMS/NCS precedent to lift from, because neither of those sites runs HIL's thin-archive noindex policy. Design:

- **Default-by-context, override-by-field.** A filterable function (`hil_seo_default_robots( $context )`) returns the baseline for each request type:
  - Singular post/page: `index, follow` (unless `hil_robots_index`/`hil_robots_follow` overrides it).
  - Tag archive, category archive, author archive, search results, date archive, attachment: `noindex, follow` — this is SEO-DEC-008's policy, encoded as the *default* rather than as 30 individual per-archive settings, which is both less error-prone and matches how Yoast's own taxonomy-visibility toggle already behaves today.
  - 404: `noindex, nofollow` (WordPress/Yoast convention; confirmed live in the Audit).
- **Category-by-category exceptions must be possible**, because the brief is explicit that HIL should "recommend indexation only where a page has a deliberate search purpose" — i.e., some future category or tag might deliberately want to be indexable. Implement as a per-term meta field (`hil_term_robots_index`, same enum as the post-level field) rather than a hardcoded archive/exception list, so a future decision doesn't require a code change.
- **Print once, correctly.** One `wp_head` hook, one `<meta name="robots" ...>` line, built by resolving (post/term override) → (context default) → (global fallback of `index, follow`). This mirrors Yoast's own current behavior exactly (confirmed: robots meta is *absent* — meaning default index,follow — on every page that doesn't need an explicit directive, not printed redundantly on every page).

---

## 4. Editorial workflow support (WordPress admin UI)

Per the brief: "Do not recreate Yoast's scoring theater. Build only controls and checks that improve accuracy, consistency, and publishing readiness." Concretely:

- **A metabox** (side panel, same placement rationale as TMS's `editor-fields.php`: "'side' rather than 'normal'... normal metaboxes render in a pane that is collapsed by default" — HIL's fields need to be seen, not buried) holding: focus keyword, secondary keywords, SEO title, meta description (with a live character counter — not a traffic-light score, just a number against the ~155/~60 guideline ranges), canonical override, robots index/follow, schema type, social image picker, and the SEO completion status dropdown.
- **Computed validation warnings**, read-only, rendered in the same metabox, recalculated on every page load (never stored, so they can't go stale — see §1's rationale for why this is computed, not cached):
  - Missing meta description.
  - Missing focus keyword.
  - SEO title or meta description outside the recommended length range (guidance, not a hard block).
  - Canonical set but pointing off-domain or to a non-existent path (a lightweight sanity check, not a full crawl).
  - Robots set to `noindex` while the post is `publish` status (a real footgun — this exact combination is how a live page silently disappears from search, and it's the kind of state that's easy to leave behind by accident after testing something).
  - **Unresolved placeholder warning** — regex-scan the post content for the placeholder convention defined in the Draft-Posting Workflow doc (`[OWNER IMAGE: ...]`, `[OWNER VERIFY: ...]`) and warn if any remain. This is the single highest-value editorial check in this whole list, because it's the direct mechanical enforcement of the brief's core requirement: Cedric should never have to eyeball a wall of markdown looking for leftover placeholders.
  - Missing featured-image reminder (WordPress already has a "featured image" concept; this just surfaces its absence in the same warnings panel instead of a separate, easy-to-miss sidebar box).
- **Admin-list columns**: SEO completion status, focus keyword, and a compact warning-count badge, added to the Posts list screen — direct model of TMS's `tms_core_register_editor_field_columns()` (which exists specifically because fields buried in a metabox are invisible at a glance across many posts — TMS's own before/after data, "0 of 44 treatments had a duration... every one of those fields empty on the front end because nobody could reasonably fill them in," is the exact failure mode this prevents).
- **What this deliberately does not include**: a readability score, a green/yellow/red traffic light, keyword-density percentages, an "SEO score" number, internal-linking suggestion widgets, cornerstone-content marking, or any of Yoast's content-analysis engine. None of that is being replaced — the brief calls it out by name as scoring theater not to rebuild, and nothing in HIL's actual workflow (an analyst who prepares complete, fact-checked drafts before they ever reach WordPress) needs a real-time readability nudge aimed at a first-draft-in-the-editor workflow HIL doesn't use.

---

## 5. Sitemap ownership — decision needed, options laid out

Per the brief, "determine whether the custom plugin or an existing component should own the WordPress sitemap." Two real options, not a default:

**Option A — Core's built-in sitemap (`/wp-sitemap.xml`), Yoast disabled.** WordPress core has shipped XML sitemaps since 5.5. This is what both TMS and NCS do — TMS's architecture doc states it explicitly ("WordPress already handles titles, canonicals, robots and the XML sitemap"). Zero new code. Core's sitemap already respects `noindex` (posts/terms marked noindex are excluded automatically) and password-protected posts (`has_password => false`, per TMS's D78 finding). Downside: URL changes from `/sitemap_index.xml` to `/wp-sitemap.xml` — exactly the migration step TMS's own launch notes flag (redirect the old URL, resubmit in GSC, accept that `lastmod` history resets).

**Option B — This plugin generates its own sitemap at a stable URL** (e.g., keep serving `/sitemap_index.xml` itself, or a new `/hil-sitemap.xml`). More code, but avoids the URL-change/GSC-resubmission step entirely, and gives control over exactly which taxonomy types get included (relevant given HIL's noindex-heavy category/tag structure — though core's sitemap already excludes noindexed terms by default, so this control may be redundant in practice).

**Approved: Option A (core's sitemap)**, per Cedric, 2026-09-07 (SEO-DEC-020). It's the proven TMS/NCS pattern, it's less code to maintain, and core's noindex-exclusion behavior already does the one thing that might have argued for a custom sitemap. The URL-change cost is real but one-time and well-understood (TMS already wrote the playbook for it) — Cedric's approval explicitly requires proper retirement/redirect handling for the old Yoast sitemap URL as part of cutover (Migration Plan Stage 9), not an afterthought.

Whichever option is chosen: **`robots.txt`'s `Sitemap:` line must be updated at cutover** (Audit §6), and the old `/sitemap_index.xml` needs a 301 to whatever replaces it, registered in the Redirection plugin (not in the new SEO plugin — redirects are already owned elsewhere, §2).

---

## 6. REST/API support — full contract

This section is the direct answer to the brief's "the analyst must be able to populate the custom SEO fields when creating or updating a WordPress draft through the approved API workflow," written against the actual, verified current REST behavior (Audit §2), not against the documented-but-inaccurate assumption of Editor-role access.

### 6.1 REST exposure

Every field in §1 is registered with `show_in_rest: true`, `single: true`, an explicit `sanitize_callback`, and a `default` where the type requires one (numeric/enum fields need this — TMS's `meta.php` docblock explains why: "a numeric field with no stored value resolves to null over REST and fails the... schema"). This means every field is readable and writable at `GET/POST /wp/v2/posts/<id>` under the `meta` key, with no separate custom REST route needed — the same approach TMS/NCS already use, and the approach that sidesteps the entire AIOSEO/Yoast internal-table problem the shared `seo_plugin.py` module exists to work around.

### 6.2 Authentication and capability requirements

- **Same transport as today**: WordPress Application Passwords, REST-primary, no SSH (per the shared `client_config.py`'s stated model and HIL's own `haveninlipa_config.py`).
- **Required WordPress role: Editor, not Author — approved by Cedric, 2026-09-07 (SEO-DEC-019).** This is the direct, concrete fix to the Audit §2 finding. Editor grants `edit_others_posts` (needed to reach the 18 Cassandra-Kim-authored posts for backfill and any future cross-author correction) and `manage_categories` (needed for the category/tag work in §2's global controls and any future taxonomy cleanup), while still stopping well short of Administrator (cannot install plugins, change site settings, or manage users) — Cedric's approval was explicit on this ceiling, preserving the exact "minimum viable role" principle `Best-Practices.md` already documents as the right call for this kind of access. **Approved, not yet executed, and mechanically outside the SEO Analyst's own reach regardless of ownership model** — WordPress requires an existing Administrator to promote another account's role; no REST call from the Analyst's own credential (Author or Editor) can self-elevate it. This is a short, one-time action only Cedric can perform (WP Admin → Users → the credential's account → change role to Editor → Update) — see `HIL_SEO_Implementation_Plan.md` §3 for the exact instruction and everything else the Analyst is executing directly instead of handing off.
- `auth_callback` on every registered field checks `current_user_can( 'edit_posts' )`, consistent with TMS/NCS — this gates the *field*, independent of whatever role ends up granted; it's not a substitute for the role-level fix above, because a field-level `auth_callback` returning true is meaningless if the post itself is invisible to the account under `context=edit` REST filtering.

### 6.3 Field names and value formats

Exactly the meta keys listed in §1's table, e.g.:

```json
PATCH /wp/v2/posts/1234
{
  "meta": {
    "hil_focus_keyword": "senior-friendly staycation lipa",
    "hil_secondary_keywords": "accessible rental lipa, grandparents getaway batangas",
    "hil_seo_title": "Senior-Friendly Staycation Guide to Lipa | Haven in Lipa",
    "hil_meta_description": "Planning a Lipa getaway with grandparents...",
    "hil_canonical_url": "",
    "hil_robots_index": "default",
    "hil_robots_follow": "default",
    "hil_schema_type": "blogposting",
    "hil_social_image": 4821,
    "hil_seo_status": "complete"
  }
}
```

Empty string / `"default"` is always a valid explicit value meaning "use the fallback chain" — never require a field to be populated to be considered valid, because an empty canonical override or an unset secondary-keywords list are both legitimate, common states.

### 6.4 Validation behavior

- `sanitize_callback` on every field, matching the TMS/NCS pattern by type: `sanitize_text_field` for plain strings, `esc_url_raw` for the canonical URL and social-image-adjacent URLs (not `esc_url` — TMS's `meta.php` docblock explains exactly why: `esc_url` mangles query-string ampersands on the way into storage, which matters for HIL too if a canonical override ever needs a tracked URL), `absint` for the social-image attachment ID, and a small custom enum-validator for the robots/schema-type/status fields (reject and error on any value outside the declared enum, rather than silently coercing).
- No field is required to publish — matching TMS/NCS (no publish-gating on SEO fields the way `tms_result_release` gates photo results). SEO completeness is surfaced as a warning (§4), not enforced as a hard block, because the actual publish gate is a human (Cedric), not the plugin.

### 6.5 Read-after-write verification

The Analyst's draft-creation tooling (the `draft_common.create_draft()` pattern already shared across every client) must read the post back after every write and confirm the meta values persisted, exactly as `seo_plugin.py`'s `YoastBackend._set_via_rest_postmeta()` already does for the Yoast fallback path today — except here it should **never** need to raise the "did not persist" error that function exists to catch, because `register_post_meta` + `show_in_rest` is a directly-supported REST write path, not a best-effort postmeta guess against a plugin that stores its real data somewhere else. If it ever does fail to persist, that is a real bug in the new plugin's registration, not an expected transport limitation — treat it accordingly.

### 6.6 Safe handling of missing optional fields

Every field has a sensible empty/default state (§1, §6.3) — a draft created with only `hil_meta_description` set and every other SEO field left at its default must render correctly (falls back exactly as if the plugin's fields didn't exist for that post), matching TMS/NCS's "nothing is emitted for data we do not have" principle.

### 6.7 Prevention of unauthorized metadata changes

Unchanged from today's model: the `auth_callback` on every field (`current_user_can( 'edit_posts' )`) plus the account-level capability fix in §6.2. No new access-control mechanism is needed beyond WordPress's own role/capability system — this is deliberately not reinventing permissions.

### 6.8 Prevention of draft publication through the analyst workflow

**Unchanged, and this is the one safeguard this entire project must never weaken.** `WP_ALLOW_PUBLISH=false` (enforced in `wp_client.py`, not just documented) continues to gate `status` changes exactly as it does today — verified live: `wp.allow_publish` reads `False` right now, and `update()`/`create()` both refuse a `status` argument while that flag is false. The Editor-role upgrade in §6.2 does **not** change this: Editor role has `publish_posts` capability at the WordPress level, same as Author, but the code-level guard is what actually enforces the SEO Analyst's non-publishing boundary, independent of role. This must be explicitly re-verified (not assumed) once the role changes — the plugin/tooling should still refuse to flip status, and that refusal should be tested against a real post before this safeguard is trusted post-upgrade.

---

## 7. What this plugin will NOT do (explicit non-goals, to prevent scope creep back toward Yoast)

- No content/readability scoring engine.
- No AI content generation, internal-linking suggestion engine, or "SEO Content Planner" — Yoast v28.4's `ai_content_planner`/`ai_generator` REST routes (confirmed present in the Audit) have no equivalent here and don't need one; the Analyst workflow already produces complete drafts before they reach WordPress.
- No redirect manager (owned by Redirection plugin, §2).
- No Wincher-style rank tracking, SEMrush integration, or "workouts"/task-checklist UI.
- No bulk editor UI beyond the admin-list columns in §4 — bulk edits happen through the Analyst's own REST tooling, not a new in-admin bulk-SEO screen.

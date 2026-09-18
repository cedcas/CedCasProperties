# Haven in Lipa — Custom SEO Plugin: Current-State (Yoast) Audit

Date: 2026-09-07
Scope: `blog.haveninlipa.com` (WordPress). The main site (`haveninlipa.com`, Next.js) is out of scope — different codebase, different ownership (SEO-DEC-009).
Method: Live verification against production (curl, WP REST API — public `yoast_head_json` plus the existing read/write Editor Application Password), cross-checked against `SEO_PROJECT_STATUS.md`, `SEO_DECISIONS.md`, `README_wordpress_access.md`, and the shared `seo/Tools/` library. Nothing below is asserted from memory or from the spec alone — see Best-Practices.md's "verify production, not the spec" rule, applied here on purpose.

---

## 0. Executive summary of what's live right now

- **Yoast SEO v28.4** is active and is the sole source of title tags, meta descriptions, canonicals, robots meta, Open Graph/Twitter cards, schema (`@graph` JSON-LD), and the XML sitemap (`/sitemap_index.xml`).
- **Redirection v5.10.0** is active separately and already owns 301s — Yoast's redirect manager is not in use. This is a plugin the new build must **not** duplicate or compete with.
- **LiteSpeed Cache** is active. It is confirmed live-broken in one respect right now (§5) — a page-level cache staleness bug independent of Yoast, but directly relevant to how any cutover gets verified.
- **A capability gap was discovered, not assumed**: the SEO Analyst's WordPress account is Author role, not the Editor role `README_wordpress_access.md` documents. Live REST evidence shows this blocks editing 18 of the 27 published articles today (§2). This is the single most consequential finding in this audit — see the Requirements doc's REST/API section and the Owner-approval report.
- 34 posts exist in WordPress right now: 27 published, 7 scheduled (`future`), 0 true drafts. Full per-post data captured in `HIL_SEO_Metadata_Backfill.xlsx`.
- No literal "Haven in Lipa | Haven in Lipa" duplicate suffix was found. A real, different title-consistency defect was found instead (§4), plus a live cache-staleness bug that can make audits believe a fix shipped when production is still serving the old value (§5).

---

## 1. Yoast footprint — capability inventory and classification

Each capability Yoast currently supplies on `blog.haveninlipa.com`, classified per the brief's four buckets.

| Capability | Currently supplied by Yoast? | Classification | Notes |
|---|---|---|---|
| SEO titles (per-post override) | Yes — every post has a distinct `<title>`, format `{headline} - Haven in Lipa Blog` | **1. Required in custom plugin** | Confirmed consistent across all 27 published + 7 scheduled posts (§4). No global template control needed beyond what's already stable — the field itself (editable override) is what must be rebuilt. |
| Meta descriptions | Yes — all 27 published + 7 scheduled have one; none empty | **1. Required in custom plugin** | Direct model: TMS/NCS `tms_meta_description`/`ncs_meta_description` pattern. |
| Focus keyword | Yes — read-only via REST today (`hil-expose-focuskw` mu-plugin/plugin exposes read only) | **1. Required in custom plugin** | Editorial/tracking field only — TMS/NCS have no equivalent; this is genuinely new, driven by the Keyword Master workflow, not by Yoast parity. |
| Canonical URL | Yes — emitted on every checked page; matches permalink in all 27 sampled published posts (no mismatches found) | **1. Required in custom plugin** (override capability) | Default (self-referencing) case needs no custom code at all — WordPress core + a correct permalink already produces this. Only the **override** field is a genuine gap (e.g., for a future consolidated/canonical-elsewhere page). |
| Robots (index/follow per post) | Yes — used actively: `noindex, follow` confirmed live on all 7 checked taxonomy archives, the author archives, search, and 404; `index, follow` confirmed on all 27 published posts (no accidental noindex found) | **1. Required in custom plugin** | This is the one core WP genuinely does **not** provide granularly (TMS/NCS never needed this because neither runs thin auto-generated archives at HIL's scale) — see Requirements doc for why this is a bigger scope item for HIL than for TMS/NCS. |
| Open Graph metadata | Yes — og:title/description/url/type/site_name/image, all populated | **1. Required in custom plugin** | Directly matches the TMS/NCS `seo-meta.php` pattern verbatim. |
| X/Twitter metadata | Yes — twitter:card/title/description/image | **1. Required in custom plugin** | Same TMS/NCS pattern. |
| Article/BlogPosting schema | Yes — homepage graph confirmed (`CollectionPage`, `WebSite`, `Organization`); per-article graph not separately pulled but Yoast is confirmed the sole schema source (`yoast-schema-graph` class present) | **1. Required in custom plugin** | Model on TMS's `schema.php` `tms_core_schema_article()` — adapt `BlogPosting` type, drop the medical-specific typing logic entirely (not needed). |
| Breadcrumb schema | Yes — `BreadcrumbList` present on homepage graph | **1. Required in custom plugin** | TMS's `tms_core_schema_breadcrumbs()` is a near-direct model; HIL's post/tag/category hierarchy is simpler than TMS's multi-CPT tree. |
| Organization/publisher schema | Yes — `Organization` node with logo, sameAs (FB/IG/TikTok/main site) confirmed live | **1. Required in custom plugin** | Direct model: TMS's `tms_core_schema_organization()`. |
| Person/author schema | Present implicitly via WordPress author archive `ProfilePage`/`Person` nodes (confirmed live for both `haven` and `cassandrakim` author slugs) | **1. Required in custom plugin, contingent on Phase author-migration decision** | Don't build this until the Haven-persona/legacy-author question (§2, and see author-requirements doc) is resolved — building Person schema against an author model that's about to change is wasted work. |
| XML sitemap | Yes — `/sitemap_index.xml` → `/post-sitemap.xml`, 28 URLs (27 posts + homepage), correct `lastmod` | **4. Unnecessary and safe to retire from Yoast, but must be replaced, not just dropped** | See §6 — sitemap ownership needs an explicit decision, this is not a "just turn it off" capability. |
| Category/tag/author/archive controls (noindex) | Yes — actively enforced; all 7 sampled archives (5 recently-flagged categories + 2 "needs confirmation" ones) verified **already emitting `noindex, follow` correctly** live in production right now | **1. Required in custom plugin** | Good news buried in this audit: SEO-DEC-008's pending items are not a live regression — see §3. |
| Redirect dependencies | **None** — Redirection plugin (v5.10.0) handles 301s, confirmed active and separate from Yoast | **3. Already owned by another component** | Do not build redirect handling into the new plugin. Nothing to migrate here. |
| Primary categories | Not confirmed in use (Yoast's "primary category" feature requires a premium/specific configuration; breadcrumb used the first assigned category in the one sample checked) | **4. Unnecessary** unless a specific page is found relying on it | Flag for confirmation during backfill (§ Phase 4 in Requirements doc), don't build a primary-category field speculatively. |
| Social images (fallback) | Yes — falls back to the site logo when no featured image | **1. Required in custom plugin** | TMS/NCS pattern: featured image → site icon/logo fallback. Direct model. |
| REST-visible metadata | Yes, read-only — `yoast_head_json` is exposed on every public GET; the raw meta keys (`_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `_yoast_wpseo_focuskw`) are **not** writable via REST today | **1. Required in custom plugin** (as a designed-in REST contract, not a retrofit) | This is the core lesson from AIOSEO/Yoast's shared `seo_plugin.py`: a plugin you write yourself with `register_post_meta(show_in_rest: true)` gets this for free and correctly, on day one, with no version-dependent internal API to reverse-engineer. |
| Global title/description templates | Yes — Yoast's site-wide templates for post type archives, taxonomy archives, author archives, search, 404 | **1. Required in custom plugin (narrow)** | Only for the templates HIL actually uses (post archives, tag/category archives, author archive, search, 404) — no need to rebuild Yoast's full template-variable system. |
| Theme/plugin dependencies on Yoast | **One confirmed**: `hil-expose-focuskw` (mentioned in README) reads Yoast's focus-keyphrase meta key for the SEO Tracker workflow. **None found** in theme templates via the checks performed (no `wpseo_` template tag calls surfaced in the live-rendered HTML beyond Yoast's own output) | **2. Required temporarily for migration** | The `hil-expose-focuskw` shim becomes unnecessary once the new plugin owns focus keyword natively — retire it at cutover, not before (it's a Yoast-read shim; removing it early breaks nothing Yoast-related, but removing it while still needed for the *tracker* workflow would). |

---

## 2. The capability gap this audit found (new finding, not previously documented)

**`README_wordpress_access.md` states the REST credential is "Dedicated user, Editor role."** Live verification says otherwise:

```
$ python3 wp_client.py
Authenticated as Haven in Lipa (haven, id 3) roles=['author']
```

Editor role includes `edit_others_posts`; Author role does not. This was cross-checked against real data, not just the role label:

- Public REST (`/wp/v2/posts`, unauthenticated, unfiltered by edit capability): **27 published posts**, split `author_id 3 ("Haven in Lipa"): 9` / `author_id 2 ("Cassandra Kim"): 18`.
- Authenticated REST with `context=edit` (what the write-capable client actually uses): **9 posts returned** — exactly the Haven-authored subset. The 18 Cassandra-Kim-authored posts don't appear at all; they are invisible to the credential that's supposed to do metadata backfill and corrections.

**Consequence: two-thirds of HIL's published articles cannot be edited via REST today**, with the current account. This is not a hypothetical — it is the exact blocker Phase 4 (backfill) and Phase 1's "author-attribution inconsistencies" item run into immediately. It also means SEO-DEC-010's "modify an existing article → edit directly via REST" claim has only ever been exercised against the 9 Haven-authored posts (consistent with the 6 Maculot-remediation articles cited as the first real-world test — worth checking whether those 6 were Haven-authored, which would explain why the gap wasn't caught then).

This is flagged as a **decision requiring owner approval** in the final report — the fix (upgrade the account to Editor role) is small, but it's a real WordPress-role change on a live account, which is exactly the class of action this stage is not authorized to make unilaterally.

---

## 3. Rendered-site checks the brief asked for

| Check | Result |
|---|---|
| Duplicate title suffixes (`\| Haven in Lipa \| Haven in Lipa`) | **Not found.** All 34 posts (27 published + 7 scheduled) carry exactly one `- Haven in Lipa Blog` suffix, verified via `yoast_head_json.title` for every post, not sampled. |
| Multiple canonical tags | **Not found** on any sampled page. |
| Multiple robots directives | **Not found.** |
| Duplicate schema graphs | **Not found** — one `yoast-schema-graph` `<script>` per page, as expected with only one active SEO plugin. |
| Duplicate social metadata | **Not found.** |
| Sitemap overlap | **Not found** — only `/sitemap_index.xml` → `/post-sitemap.xml` resolves; core's `/wp-sitemap.xml` 301-redirects to Yoast's, so there is exactly one live sitemap system today, not two. (This redirect itself is worth noting — see §6.) |
| Author-attribution inconsistencies | **Found, quantified**: 18 of 27 published posts (67%) are still attributed to "Cassandra Kim," not "Haven" — see §2 for why this is also a REST-capability blocker, not just a byline question. |
| Stale/inaccurate metadata | **Found, 3 instances**: the meta description on articles #11 (`family-staycation-lipa-city-batangas`, WP id 268), #12 (`romantic-getaway-batangas-lipa-city`, WP id 272), and #8 (`holy-week-in-lipa-city-batangas-a-peaceful-retreat-near-manila`, WP id 73) all contain "1 hour from Manila" — the exact "overly broad" wording the brief calls out and that `SEO_PROJECT_STATUS.md` already lists as an open, ongoing fix. Confirmed live in the actual meta description text, not just the visible body copy. |
| Archive directives that could disappear when Yoast is disabled | **This is the real risk of the whole project** — see the Migration & Rollback doc. Every `noindex, follow` currently live (7 archives sampled, all correct) is a Yoast-emitted robots meta tag; disabling Yoast with no replacement live would flip all of them back to indexable in one step. |

**Bonus finding, not on the brief's checklist**: title-suffix branding is inconsistent specifically on **archive/taxonomy/author/search pages**, not on articles — e.g. `Uncategorized Archives - blog.haveninlipa.com` vs. `Travel & Itineraries Archives - Haven in Lipa Blog` vs. `How to Get to Lipa City from Manila - Complete 2026 Guide - Haven in Lipa Blog`. Some of these are noindexed anyway (so low priority), but the pattern suggests Yoast's site-wide title template or the site tagline changed at some point without every template being touched — worth a single global-template fix rather than per-page cleanup.

---

## 4. Title-suffix defect, precisely stated

Not the literal example in the brief, but a real, verified defect:

- **Live source of truth (uncached, via REST `yoast_head_json`)**: all 27 published posts use `{headline} - Haven in Lipa Blog`. Consistent, correct, no duplication.
- **What some visitors/crawlers may still be served**: see §5 — a caching bug can serve an older title (`{headline} - blog.haveninlipa.com`) for pages that haven't had their cache invalidated since an edit.

So the "duplicate/stale title suffix" problem here isn't a Yoast configuration bug — Yoast's current output is clean. It's a **caching bug sitting downstream of Yoast**, which matters directly for the migration plan: cutover verification must bypass cache (cache-busting query string or a forced purge before comparing Yoast vs. custom output URL-by-URL), or it will pass a check that production itself would fail.

---

## 5. Live finding: cache staleness, reproduced

Reproduced directly, not inferred:

```
GET /how-to-get-to-lipa-city-from-manila-2026-guide/                  → <title>...- blog.haveninlipa.com</title>
GET /how-to-get-to-lipa-city-from-manila-2026-guide/?nocache=<ts>     → <title>...- Haven in Lipa Blog</title>
```

The post was last modified 2026-08-17 (per REST `modified` date) — **21 days before this audit**, and the bare URL was still serving the old title. Same result on `/15-best-things-to-do-in-lipa-city-batangas-2026-locals-guide/`.

This is LiteSpeed Cache (confirmed active via the `litespeed/v1` and `litespeed/v3` REST namespaces), not Yoast. It reproduces exactly the caching lesson already recorded in `Best-Practices.md` ("a caching layer can hide a broken fix for hours or days... test cache behavior against the actual production environment"), except this time the "hours or days" is three weeks and counting, on a live, currently-indexed page. **Recommend Cedric purge the site-wide LiteSpeed cache and spot-check a handful of recently-edited URLs against Google's cached/rendered version (GSC URL Inspection → Live Test) before this audit's findings are treated as fully representative of what Google is actually seeing.** This is independent of the Yoast migration and should not block it, but it does mean: don't trust a bare-URL fetch as proof of current state for *any* verification step in this project going forward — always cache-bust or purge first.

---

## 6. Sitemap and redirect ownership — current reality

- **Sitemap**: Yoast owns `/sitemap_index.xml` (28 URLs: 27 posts + homepage — no page, category, or tag sitemaps are being generated, which is consistent with HIL having no static Pages of consequence on the blog subdomain and the noindexed archives correctly being excluded). WordPress core's own sitemap (`/wp-sitemap.xml`) is not dormant — it 301-redirects to Yoast's URL, meaning Yoast (or a compatibility shim) has explicitly taken over the core route rather than the two coexisting. This must be preserved in spirit at cutover: **whatever new sitemap URL is chosen, the old `/sitemap_index.xml` needs a 301 to it**, exactly as TMS's own migration notes record needing to redirect `/sitemap_index.xml` → `/wp-sitemap.xml` — same failure mode, same fix.
- **Redirects**: owned entirely by the separate Redirection plugin (v5.10.0). Not a Yoast capability in use here. No action needed from the new SEO plugin.
- **robots.txt**: served by WordPress/Yoast directly here (unlike TMS, where it's served by Cloudflare) — confirmed: `https://blog.haveninlipa.com/robots.txt` returns a Yoast-block-wrapped file with `Disallow:` (empty) and a `Sitemap:` line pointing at Yoast's sitemap URL. **This must be updated at cutover** — a stale `Sitemap:` line pointing at a retired URL is a real, if minor, defect the TMS migration notes specifically flag.

---

## 7. Plugins confirmed active (fingerprinted via `/wp-json/` namespaces, live)

| Plugin | Evidence | Relevance to this project |
|---|---|---|
| Yoast SEO v28.4 | `yoast/v1` namespace + `readme.txt` fetch | The plugin being replaced. |
| Redirection v5.10.0 | `redirection/v1` namespace + `readme.txt` fetch | Unaffected — keep as-is (§6). |
| LiteSpeed Cache | `litespeed/v1`, `litespeed/v3` namespaces | Not being replaced, but directly implicated in §5 — cutover verification must account for it. |
| Google Site Kit | `google-site-kit/v1` namespace | Owns the GA4/GSC connection referenced elsewhere in `SEO_PROJECT_STATUS.md`'s Product Owner Watch Items. Not a Yoast-overlap concern — Site Kit doesn't do on-page SEO output. |
| YARPP (Yet Another Related Posts Plugin) | `yarpp/v1` namespace | Related-posts widget; not an SEO-output concern, noted for completeness only. |
| Hostinger bundle (`hostinger-easy-onboarding`, `hostinger-ai-assistant`, `hostinger-amplitude`, `hostinger-reach`, `hostinger-tools-plugin`) | Namespaces present | Host-provided plugins, no SEO-output overlap found. Not touched by this project. |

No second SEO/schema plugin (Rank Math, AIOSEO, All in One SEO, etc.) was found installed-but-inactive on this site, unlike TMS's Rank Math situation — one less thing to disable at cutover.

---

## 8. What the audit did *not* cover (explicitly out of scope for this pass)

- Full per-article schema-graph diffing (only the homepage graph was pulled in full; per-article `BlogPosting` nodes were confirmed present via the `yoast-schema-graph` marker but not diffed field-by-field against what the custom plugin will emit — that comparison belongs in the Migration & Rollback doc's Phase 5 "compare Yoast and custom output URL by URL" step, once the new plugin exists).
- GSC Coverage-report cross-check for the 5 pending category archives and the 2 "needs confirmation" ones — this audit confirmed the **live tag is correct** (§3); whether Google has actually dropped them from the index is a separate, already-tracked item in `SEO_PROJECT_STATUS.md`'s Blocked section and doesn't need re-litigating here.
- The main `haveninlipa.com` domain's SEO output — out of scope per SEO-DEC-009.

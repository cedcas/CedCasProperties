=== HIL SEO ===
Contributors: haveninlipa
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.5
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Custom SEO output and editorial workflow for the Haven in Lipa blog, replacing Yoast SEO.

== Description ==

This plugin owns, once fully cut over:

* Meta description, Open Graph, and Twitter card output
* SEO title override (document `<title>` only, never the visible H1)
* Canonical URL override
* Per-post and per-archive robots (index/noindex, follow/nofollow) — the one module with no equivalent in the sibling `tms-core`/`ncs-core` plugins, because HIL runs a thin-archive noindex policy (SEO-DEC-008) neither of those sites needs
* Hand-authored JSON-LD structured data (Organization, WebSite, Person, BlogPosting, BreadcrumbList)
* Sitemap hygiene on top of WordPress core's own `/wp-sitemap.xml` (SEO-DEC-020) — this plugin does not generate its own sitemap
* An editorial metabox: focus keyword, secondary keywords, SEO completion status, and computed (never cached) validation warnings — missing description, missing focus keyword, noindex-on-published-post, unresolved `[OWNER ...]` placeholders, missing featured image

It deliberately does **not** include a readability score, a traffic-light "SEO score," keyword-density percentages, AI content generation, rank tracking, or a bulk editor — see `HIL_Custom_SEO_Plugin_Requirements.md` §4 and §7 for why each of those is an explicit non-goal, not an oversight.

= Safe to activate alongside Yoast =

Every output hook in this plugin (`includes/seo-meta.php`, `seo-title.php`, `robots.php`, `schema.php`, `sitemap.php`) is gated behind a cutover flag (`includes/cutover.php`), defaulting to OFF. Activating this plugin changes nothing about the live front end until each flag is explicitly turned on, one module at a time, per `HIL_Yoast_Migration_and_Rollback_Plan.md` Stage 8.

A REST route, `/wp-json/hil-seo/v1/preview/<post-id>`, computes the plugin's full would-be output for any post — title, meta description, canonical, robots, schema, social image — regardless of cutover state, for anyone with `edit_posts` capability. This is what makes Stage 5's "compare Yoast and custom output URL by URL" possible with zero risk to live output.

Flipping a cutover flag requires `manage_options` (Administrator) — deliberately not available to the Editor-role Analyst account (SEO-DEC-019's explicit ceiling). Flag changes are the one action in this plugin that changes live front-end output.

= Administrator screen (1.1.0+) =

**WP Admin → HIL SEO** (menu hidden from any role below Administrator — Editors never see it). For each module: current state, whether its recommended prerequisites are enabled yet, when and by whom it was last changed, the specific verification to do before enabling it, and a toggle requiring a checked confirmation box plus a JS confirm dialog before it submits. An Emergency Rollback section turns every module off in one action (also confirmation-gated). Below that, static Administrator instructions for purging the LiteSpeed cache and for the final Yoast deactivation sequence — these two steps are documentation only, deliberately not automated by this plugin.

The screen and the REST route (`/wp-json/hil-seo/v1/cutover`) write through the exact same function (`hil_seo_set_cutover_flag()` in `includes/cutover.php`), so both stay in agreement and every change — from either interface — lands in one audit log (`hil_seo_cutover_log` option).

= Rollback =

No content, no post meta, and no term meta is ever deleted by this plugin — not on deactivation, not on uninstall (see `uninstall.php`). Rolling back is: reactivate Yoast, re-enable its schema/social modules if they were disabled, and flip every `hil_seo_cutover` flag back to `false` (or simply deactivate this plugin — deactivation alone stops every gated output hook from firing). See `HIL_Yoast_Migration_and_Rollback_Plan.md` §2 for the full procedure.

== Changelog ==

= 1.1.5 =
* Fixed: the blog-index canonical on paginated pages kept the request's query string (`/page/2/?utm_source=x` canonicalised to itself) because `get_pagenum_link()` preserves it. Found live 2026-09-19 in the verification pass after the second Yoast deactivation; plain `/page/2/` and the homepage were already correct. The canonical (and `og:url`) is now always the clean URL.

= 1.1.4 =
* Fixed (found live 2026-09-19 on the first attempt to deactivate Yoast, which was rolled back): the blog homepage and `/page/N/` lost their canonical, meta description and all Open Graph/Twitter tags, and the title gained a doubled "- Haven in Lipa Blog" suffix, because every output module only handled singular posts. Yoast had supplied all of it. New blog-index handling in `includes/seo-title.php` and `includes/seo-meta.php`: title `<site> - <tagline>` / `<site> - Page N of M - <tagline>`, self-referencing canonical (`/`, `/page/N/`), description = site tagline, `og:*`/Twitter tags with the default image. **Inert while Yoast is active** (`hil_seo_is_blog_index()` checks `WPSEO_VERSION`), so installing this changes nothing until Yoast is deactivated.
* Added: `og:locale` on posts (skipped while Yoast is active).
* Added: "Default social image / logo" setting on WP Admin → HIL SEO (Media Library attachment ID, saved to `hil_seo_default_social_image`, Administrator only). Feeds the homepage `og:image` and the Organization logo in schema. Yoast supplied the logo before the cutover; without this setting the homepage has no `og:image` and the Organization schema has no logo. `GET /hil-seo/v1/status` now reports `default_social_image_id`.
* Known, accepted difference from Yoast: no `rel="next"/"prev"` links on paginated pages (Google has ignored them since 2019), no `og:image:width/height/type`.

= 1.1.3 =
* Fixed: core's sitemap listed every noindexed archive (8 categories, 141 tags) because the term-exclusion filter in `includes/sitemap.php` (since 1.0.0) hooked `wp_sitemaps_taxonomies_entries`, which is not a WordPress hook. Found live 2026-09-19 the first time core's sitemap served. Now uses `wp_sitemaps_taxonomies_query_args` with a `hil_term_robots_index = index` meta query, so only terms explicitly overridden to `index` (none today) are listed, and empty taxonomy sitemaps return 404.
* Fixed: the 1.1.2 "drop the users provider" mechanism left `wp-sitemap-users-1.xml` answering 200 HTML on WordPress 7.0.5 (unregistered sitemap types fall back to a soft page). The provider now stays registered with an emptied query (`wp_sitemaps_users_query_args`), so it is absent from the index and returns 404.
* No cutover flag, post meta or setting changes on install.

= 1.1.2 =
* Fixed: the v1.1.1 robots.txt filter could never have worked. Yoast SEO 28.4 hooks `robots_txt` at priority 99,999 (v1.1.1 assumed 10 and ran at 999, i.e. before Yoast wrote its block), and rewriting Yoast's `sitemap_index.xml` line was wrong in principle — Yoast writes that line only while its XML-sitemap feature is on, and in that state core's sitemap is off and Yoast redirects `/wp-sitemap.xml` back to `/sitemap_index.xml`. The filter (`includes/sitemap.php`) now runs at PHP_INT_MAX and only acts when the Sitemap module is ON, core's sitemap is actually being served, and Yoast's own sitemap line is absent; it then guarantees exactly one `Sitemap: <home>/wp-sitemap.xml` line (append if missing, drop repeats). Core already writes that line itself once Yoast's XML-sitemap feature is off or Yoast is deactivated, so this is a safety net. No physical robots.txt is ever created.
* Added: core's "users" sitemap provider is dropped while the Sitemap module is ON — every author archive is `noindex, follow` (SEO-DEC-008), and core (unlike Yoast) would otherwise list `/author/haven/` in the sitemap.
* Added: read-only status — `hil_seo_status_snapshot()`, shown as a "Status" panel on WP Admin → HIL SEO (plugin version, Yoast active/XML-sitemap feature, core sitemap served yes/no) and as `GET /wp-json/hil-seo/v1/status` (edit_posts). `GET /cutover` is unchanged.
* Admin screen: the post-cutover instructions are rewritten in the loop-free order (SEO-DEC-026): old-sitemap redirect OFF → Yoast XML sitemaps OFF → verify `/wp-sitemap.xml` 200 → redirect ON → purge → GSC → deactivate Yoast, with a matching rollback. The previous text ("add the 301, then deactivate Yoast") produced the 2026-09-19 redirect loop between Yoast's `/wp-sitemap.xml` → `/sitemap_index.xml` redirect and the Redirection rule. Schema guidance corrected: Yoast has no toggle for description/schema output, so duplicates are expected until Yoast is deactivated.
* v1.1.1 was never installed on production (live readme reported 1.1.0 on 2026-09-19); 1.1.2 supersedes it. No cutover flag, post meta or setting is changed by installing this version.

= 1.1.1 =
* Fixed: with the Sitemap module ON, Yoast's virtual robots.txt (no physical file exists on this site) still advertised its own retired `/sitemap_index.xml`. `includes/sitemap.php` now hooks `robots_txt` at priority 999 (after Yoast's own callback) and rewrites that one existing "Sitemap:" line to `/wp-sitemap.xml` in place — never appends, so there is no code path that can produce a duplicate line. Automatically reverts to Yoast's original line the moment the Sitemap module is turned OFF or Emergency Rollback is used, since the filter re-checks the live flag on every request. Yoast itself is untouched by this fix and remains fully active.
* Admin screen: Sitemap module's description and verification text updated to cover the robots.txt correction; step 2 of the post-cutover instructions rewritten to reflect that robots.txt no longer needs a manual edit (only the 301 redirect and GSC resubmission remain manual).

= 1.1.0 =
* Added the Administrator-only "HIL SEO" admin screen (`includes/admin-page.php`): per-module state/prerequisites/last-changed/verification-guidance, confirmation-gated toggles, an Emergency Rollback control, and static instructions for the LiteSpeed cache purge and final Yoast deactivation.
* `includes/cutover.php`: added `hil_seo_cutover_order()`, `hil_seo_unmet_prerequisites()`, and a per-module change log (`hil_seo_cutover_log` option) — both the admin screen and the existing REST route write through the same function, so they can never disagree.
* No role, capability, or existing flag state changed by this update. All cutover flags remain exactly as they were before installing this version.

= 1.0.0 =
* Initial build, modeled on `tms-core` (TribeMedSpa) and `ncs-core` (NetCoreSolutions).

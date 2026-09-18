=== HIL SEO ===
Contributors: haveninlipa
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.1.1
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

= 1.1.1 =
* Fixed: with the Sitemap module ON, Yoast's virtual robots.txt (no physical file exists on this site) still advertised its own retired `/sitemap_index.xml`. `includes/sitemap.php` now hooks `robots_txt` at priority 999 (after Yoast's own callback) and rewrites that one existing "Sitemap:" line to `/wp-sitemap.xml` in place — never appends, so there is no code path that can produce a duplicate line. Automatically reverts to Yoast's original line the moment the Sitemap module is turned OFF or Emergency Rollback is used, since the filter re-checks the live flag on every request. Yoast itself is untouched by this fix and remains fully active.
* Admin screen: Sitemap module's description and verification text updated to cover the robots.txt correction; step 2 of the post-cutover instructions rewritten to reflect that robots.txt no longer needs a manual edit (only the 301 redirect and GSC resubmission remain manual).

= 1.1.0 =
* Added the Administrator-only "HIL SEO" admin screen (`includes/admin-page.php`): per-module state/prerequisites/last-changed/verification-guidance, confirmation-gated toggles, an Emergency Rollback control, and static instructions for the LiteSpeed cache purge and final Yoast deactivation.
* `includes/cutover.php`: added `hil_seo_cutover_order()`, `hil_seo_unmet_prerequisites()`, and a per-module change log (`hil_seo_cutover_log` option) — both the admin screen and the existing REST route write through the same function, so they can never disagree.
* No role, capability, or existing flag state changed by this update. All cutover flags remain exactly as they were before installing this version.

= 1.0.0 =
* Initial build, modeled on `tms-core` (TribeMedSpa) and `ncs-core` (NetCoreSolutions).

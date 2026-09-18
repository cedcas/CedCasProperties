<?php
/**
 * Sitemap ownership: WordPress core's /wp-sitemap.xml is the system of
 * record — approved 2026-09-07 as SEO-DEC-020 (Option A in
 * HIL_Custom_SEO_Plugin_Requirements.md §5). This plugin does not generate
 * its own sitemap; it only makes sure core's sitemap correctly excludes
 * content this plugin has marked noindex via hil_robots_index, since core
 * has no knowledge of that custom field on its own.
 *
 * Core already excludes non-published posts and password-protected posts
 * automatically (confirmed in tms-core's own D78 finding, which applies
 * identically here — WP_Sitemaps_Posts sets has_password => false). The one
 * gap this module closes is: a post or term explicitly marked noindex via
 * this plugin's own field should not appear in the sitemap either, exactly
 * as it wouldn't have under Yoast.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Excludes explicitly-noindexed posts from core's post sitemap.
 *
 * @since 1.0.0
 * @param array<string, mixed> $args WP_Query args for the sitemap provider.
 * @return array<string, mixed>
 */
function hil_seo_sitemap_exclude_noindexed_posts( array $args ): array {
	if ( ! hil_seo_cutover_enabled( 'sitemap' ) ) {
		return $args;
	}

	$meta_query   = $args['meta_query'] ?? array();
	$meta_query[] = array(
		'relation' => 'OR',
		array(
			'key'     => 'hil_robots_index',
			'compare' => 'NOT EXISTS',
		),
		array(
			'key'     => 'hil_robots_index',
			'value'   => 'noindex',
			'compare' => '!=',
		),
	);
	$args['meta_query'] = $meta_query;

	return $args;
}
add_filter( 'wp_sitemaps_posts_query_args', 'hil_seo_sitemap_exclude_noindexed_posts' );

/**
 * Excludes noindexed terms (category/tag) from core's taxonomy sitemap.
 *
 * Note: this is a secondary safeguard. The primary reason HIL's tag/category
 * archives don't need to appear in a sitemap at all is that a thin archive
 * page carries no unique content worth crawl priority in the first place —
 * this filter just makes sure the noindex policy and the sitemap agree, in
 * case core's taxonomy sitemap provider is ever enabled for a taxonomy where
 * it currently isn't.
 *
 * @since 1.0.0
 * @param array<int, WP_Term> $terms    Terms provider is about to include.
 * @param string              $taxonomy Taxonomy name.
 * @return array<int, WP_Term>
 */
function hil_seo_sitemap_exclude_noindexed_terms( array $terms, string $taxonomy ): array {
	if ( ! hil_seo_cutover_enabled( 'sitemap' ) ) {
		return $terms;
	}

	return array_values(
		array_filter(
			$terms,
			static function ( $term ) {
				if ( ! ( $term instanceof WP_Term ) ) {
					return true;
				}

				$override = (string) get_term_meta( $term->term_id, 'hil_term_robots_index', true );

				// Terms default to noindex per SEO-DEC-008 (robots.php), so
				// exclude from the sitemap unless explicitly overridden to index.
				return 'index' === $override;
			}
		)
	);
}
add_filter( 'wp_sitemaps_taxonomies_entries', 'hil_seo_sitemap_exclude_noindexed_terms', 10, 2 );

/**
 * Corrects the virtual robots.txt's Sitemap: line while Yoast is still active.
 *
 * Found live 2026-09-07: no physical robots.txt file exists on this site
 * (confirmed via Yoast's own File Editor) — WordPress serves a virtual one
 * built by core's do_robots(), and Yoast hooks the `robots_txt` filter to
 * append its own block, including "Sitemap: https://.../sitemap_index.xml".
 * Enabling this plugin's sitemap module (SEO-DEC-020) makes core's
 * /wp-sitemap.xml the system of record, but Yoast's robots.txt output still
 * advertised its own retired URL — this closes that specific gap.
 *
 * Deliberately a targeted string replacement, not an append: it finds the
 * exact "Sitemap: <yoast url>" line Yoast's own filter already produced and
 * rewrites only that line's URL. This is what "no duplicate sitemap lines"
 * means in practice — nothing is ever added, only the one existing line is
 * corrected, so there is no code path that could produce two Sitemap: lines.
 * Priority 999 guarantees this runs after Yoast's own robots_txt callback
 * (Yoast hooks at priority 10), regardless of load order between the two
 * plugins.
 *
 * Scope, deliberately narrow: this only corrects the URL Yoast already
 * writes. It does not make this plugin the owner of robots.txt — that
 * remains Yoast's while Yoast is active. Full ownership of robots.txt
 * (needed once Yoast is eventually deactivated, since nothing else in
 * WordPress core adds a Sitemap: line on its own) is a separate step already
 * tracked in HIL_SEO_Implementation_Plan.md's post-cutover instructions —
 * not solved by this function.
 *
 * Automatically inert the moment the sitemap module is turned OFF, whether
 * by its own toggle or by Emergency Rollback (both go through
 * hil_seo_set_cutover_flag(), which this reads live on every request) — no
 * separate "undo" code path is needed, because this function only ever
 * transforms Yoast's output when the flag is on; when it's off, Yoast's
 * original robots.txt (still pointing at sitemap_index.xml) passes through
 * completely untouched.
 *
 * @since 1.1.1
 * @param string $output Robots.txt content built so far (after Yoast's own filter has run).
 * @param bool   $public Whether the site is set to discourage search engines.
 * @return string
 */
function hil_seo_filter_robots_txt( string $output, bool $public ): string {
	if ( ! hil_seo_cutover_enabled( 'sitemap' ) ) {
		return $output;
	}

	$yoast_sitemap_url = home_url( '/sitemap_index.xml' );
	$core_sitemap_url  = home_url( '/wp-sitemap.xml' );

	// Nothing to do if Yoast's line isn't present — e.g. Yoast has since been
	// deactivated, or its sitemap module was already disabled independently.
	// Returning unchanged here is the safe default in every case where this
	// function's one specific assumption (Yoast wrote that exact line) no
	// longer holds, rather than guessing at what to do instead.
	if ( false === strpos( $output, $yoast_sitemap_url ) ) {
		return $output;
	}

	$corrected = preg_replace(
		'/^Sitemap:\s*' . preg_quote( $yoast_sitemap_url, '/' ) . '\s*$/mi',
		'Sitemap: ' . $core_sitemap_url,
		$output
	);

	// preg_replace() returns null on a regex engine error (not "no match" —
	// that already returns the original string unchanged). Fall back to the
	// unmodified output rather than risk serving a null/empty robots.txt.
	return null !== $corrected ? $corrected : $output;
}
add_filter( 'robots_txt', 'hil_seo_filter_robots_txt', 999, 2 );

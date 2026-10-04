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
 * Keeps noindexed terms (category/tag) out of core's taxonomy sitemaps.
 *
 * Every term archive defaults to `noindex, follow` (SEO-DEC-008, robots.php)
 * unless a term is explicitly overridden to `index` via `hil_term_robots_index`,
 * so only those overridden terms may appear in the sitemap.
 *
 * 1.1.3 fix: v1.0.0–1.1.2 hooked `wp_sitemaps_taxonomies_entries`, which is not a
 * WordPress hook — the filter never ran, and core's sitemap listed all 8
 * categories and 141 tags (found live 2026-09-19 when core's sitemap first
 * served). The real hook is `wp_sitemaps_taxonomies_query_args`, which core
 * applies to both the URL list and the page count, so a taxonomy with no
 * qualifying terms drops out of the index and its sitemap URL returns 404
 * (a registered-but-empty provider 404s; an unregistered one falls back to a 200
 * soft page on this WordPress version, so the providers are left registered).
 *
 * @since 1.0.0
 * @since 1.1.3 Hook corrected.
 * @param array<string, mixed> $args     WP_Term_Query args.
 * @param string               $taxonomy Taxonomy name.
 * @return array<string, mixed>
 */
function hil_seo_sitemap_taxonomy_query_args( array $args, string $taxonomy ): array {
	if ( ! hil_seo_cutover_enabled( 'sitemap' ) ) {
		return $args;
	}

	$meta_query         = isset( $args['meta_query'] ) && is_array( $args['meta_query'] ) ? $args['meta_query'] : array();
	$meta_query[]       = array(
		'key'     => 'hil_term_robots_index',
		'value'   => 'index',
		'compare' => '=',
	);
	$args['meta_query'] = $meta_query;

	return $args;
}
add_filter( 'wp_sitemaps_taxonomies_query_args', 'hil_seo_sitemap_taxonomy_query_args', 10, 2 );

/**
 * Keeps the author archive out of core's sitemap.
 *
 * Core registers a "users" sitemap provider (one entry per author with published
 * posts) that Yoast never had — Yoast's author sitemap was 404 on this site.
 * Every author archive here is `noindex, follow` (SEO-DEC-008; `/author/haven/`
 * verified live 2026-09-19), so once core's sitemap replaces Yoast's that provider
 * would publish a noindex URL in the sitemap.
 *
 * The provider stays registered but its query is emptied (`include => [0]` matches
 * no user), so it drops out of the index and `wp-sitemap-users-1.xml` returns a
 * proper 404. 1.1.2 instead dropped the provider via `wp_sitemaps_add_provider`;
 * on this site's WordPress (7.0.5) an unregistered sitemap type returns a 200 soft
 * page rather than a 404 (verified live: `wp-sitemap-users-1.xml` and
 * `wp-sitemap-foo-1.xml` both 200 text/html), so that approach was replaced.
 *
 * @since 1.1.2
 * @since 1.1.3 Mechanism changed from dropping the provider to emptying its query.
 * @param array<string, mixed> $args WP_User_Query args.
 * @return array<string, mixed>
 */
function hil_seo_sitemap_users_query_args( array $args ): array {
	if ( ! hil_seo_cutover_enabled( 'sitemap' ) ) {
		return $args;
	}

	$args['include'] = array( 0 );

	return $args;
}
add_filter( 'wp_sitemaps_users_query_args', 'hil_seo_sitemap_users_query_args' );

/**
 * Whether WordPress core is actually serving /wp-sitemap.xml right now.
 *
 * Yoast SEO switches core's sitemap off while its own XML-sitemap feature is
 * enabled (confirmed live 2026-09-19: /wp-sitemap.xml returned 404 for a
 * query-string request and a Yoast 301 for the bare URL). Anything that
 * advertises /wp-sitemap.xml must first check this — advertising it while it
 * redirects or 404s is what produced the 2026-09-19 sitemap loop.
 *
 * @since 1.1.2
 * @return bool
 */
function hil_seo_core_sitemaps_enabled(): bool {
	if ( ! function_exists( 'wp_sitemaps_get_server' ) ) {
		return false;
	}

	$server = wp_sitemaps_get_server();

	return is_object( $server ) && method_exists( $server, 'sitemaps_enabled' ) && (bool) $server->sitemaps_enabled();
}

/**
 * Ensures the virtual robots.txt advertises core's sitemap exactly once — but
 * only once core is actually serving it, and never while Yoast still owns the
 * sitemap line.
 *
 * Corrects v1.1.1, whose premise was wrong on two counts (both verified against
 * Yoast SEO 28.4's own source, 2026-09-19):
 *  - Yoast's `robots_txt` callback runs at priority 99,999, not 10. v1.1.1's
 *    priority-999 filter therefore ran BEFORE Yoast appended its block, so the
 *    rewrite it described could never match anything.
 *  - "Nothing else in WordPress core adds a Sitemap: line" is false: core adds
 *    `Sitemap: <home>/wp-sitemap.xml` itself (priority 0) whenever its sitemaps
 *    are enabled, and Yoast leaves that line alone (it only strips core's default
 *    User-agent/Disallow lines).
 * Rewriting Yoast's `sitemap_index.xml` line to `/wp-sitemap.xml` was also the
 * wrong idea in principle: Yoast writes that line only while its XML-sitemap
 * feature is on, and in that state core's sitemap is off and Yoast redirects
 * /wp-sitemap.xml back to /sitemap_index.xml — so the rewrite would advertise a
 * URL that redirects. That rewrite is removed.
 *
 * What this does now, in order, and only when the sitemap module is ON:
 *  1. Core's sitemap must actually be enabled — otherwise leave the output alone.
 *  2. If Yoast's `sitemap_index.xml` line is present, Yoast still owns sitemap
 *     advertisement — leave the output alone.
 *  3. Otherwise guarantee exactly one `Sitemap: <home>/wp-sitemap.xml` line:
 *     append it if missing, drop repeats if duplicated. In the expected end
 *     states (Yoast's XML feature off, or Yoast deactivated) core already wrote
 *     that line, so this changes nothing — it is a safety net, not the mechanism.
 *
 * Priority PHP_INT_MAX so it sees the final output of every other callback,
 * Yoast's 99,999 included. No physical robots.txt is ever created; this only
 * transforms the virtual one, and is inert when the module is OFF or after
 * Emergency Rollback (the flag is re-read on every request).
 *
 * @since 1.1.1
 * @since 1.1.2 Priority, premise and scope corrected; see above.
 * @param string $output Robots.txt content built so far.
 * @param bool   $public Whether the site is set to discourage search engines.
 * @return string
 */
function hil_seo_filter_robots_txt( string $output, bool $public ): string {
	if ( ! hil_seo_cutover_enabled( 'sitemap' ) || ! hil_seo_core_sitemaps_enabled() ) {
		return $output;
	}

	$core_url  = home_url( '/wp-sitemap.xml' );
	$yoast_url = home_url( '/sitemap_index.xml' );

	if ( false !== strpos( $output, $yoast_url ) ) {
		return $output;
	}

	$line_pattern = '/^Sitemap:[ \t]*' . preg_quote( $core_url, '/' ) . '[ \t]*\r?$/mi';
	$count        = preg_match_all( $line_pattern, $output );

	if ( false === $count ) {
		return $output;
	}

	if ( 0 === $count ) {
		return rtrim( $output ) . "\n\nSitemap: " . $core_url . "\n";
	}

	if ( $count > 1 ) {
		$seen    = 0;
		$deduped = preg_replace_callback(
			$line_pattern,
			static function ( array $match ) use ( &$seen ): string {
				return 1 === ++$seen ? $match[0] : '';
			},
			$output
		);

		if ( null !== $deduped ) {
			return $deduped;
		}
	}

	return $output;
}
add_filter( 'robots_txt', 'hil_seo_filter_robots_txt', PHP_INT_MAX, 2 );

/**
 * Read-only snapshot of the state that decides whether the sitemap transition can
 * work: plugin version, cutover flags, whether core's sitemap is being served,
 * and whether Yoast (and its XML-sitemap feature) is active. Shared by the
 * Administrator screen and the REST route below so they can never disagree.
 *
 * @since 1.1.2
 * @return array<string, mixed>
 */
function hil_seo_status_snapshot(): array {
	$yoast_options = get_option( 'wpseo', array() );

	return array(
		'version'               => HIL_SEO_VERSION,
		'flags'                 => hil_seo_get_cutover_flags(),
		'core_sitemaps_enabled' => hil_seo_core_sitemaps_enabled(),
		'yoast_active'          => defined( 'WPSEO_VERSION' ),
		'yoast_version'         => defined( 'WPSEO_VERSION' ) ? WPSEO_VERSION : null,
		'yoast_xml_sitemap'     => is_array( $yoast_options ) && ! empty( $yoast_options['enable_xml_sitemap'] ),
		'default_social_image_id' => (int) get_option( 'hil_seo_default_social_image', 0 ),
	);
}

/**
 * Registers GET /hil-seo/v1/status (edit_posts, read-only — same ceiling as the
 * existing preview and cutover-read routes). Deliberately a separate route:
 * GET /cutover keeps returning the bare flags object existing tooling expects.
 *
 * @since 1.1.2
 * @return void
 */
function hil_seo_register_status_route(): void {
	register_rest_route(
		'hil-seo/v1',
		'/status',
		array(
			'methods'             => 'GET',
			'callback'            => static fn() => rest_ensure_response( hil_seo_status_snapshot() ),
			'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
		)
	);
}
add_action( 'rest_api_init', 'hil_seo_register_status_route' );

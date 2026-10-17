<?php
/**
 * Stage-gate flags and the parity-preview REST route.
 *
 * Every output module (seo-meta.php, seo-title.php, robots.php, schema.php,
 * sitemap.php) checks hil_seo_cutover_enabled() before printing anything to
 * the front end. All flags default to OFF. This is what makes it safe to
 * activate this plugin on production while Yoast is still fully active and
 * printing its own output — this plugin computes everything but stays silent
 * until each module is explicitly turned on, one at a time, per
 * HIL_Yoast_Migration_and_Rollback_Plan.md Stage 8.
 *
 * The REST preview route (/hil-seo/v1/preview/<id>) is NOT gated by the
 * cutover flags — it always works, for anyone with edit_posts capability, so
 * the Migration Plan's Stage 5 ("compare Yoast and custom output URL by URL")
 * can be done entirely by reading this route's JSON response and diffing it
 * against Yoast's live yoast_head_json, with zero risk to live output.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Returns the current cutover flags, merged with defaults.
 *
 * @since 1.0.0
 * @return array<string, bool>
 */
function hil_seo_get_cutover_flags(): array {
	$defaults = array(
		'meta'      => false, // meta description + OG/Twitter (seo-meta.php)
		'title'     => false, // SEO title override + suffix fix (seo-title.php)
		'canonical' => false, // canonical override (seo-title.php)
		'robots'    => false, // robots meta module (robots.php)
		'schema'    => false, // JSON-LD graph (schema.php)
		'sitemap'   => false, // core sitemap is system of record (sitemap.php) — this flag only controls whether this plugin's own noindex-aware sitemap filters run
	);

	$stored = get_option( 'hil_seo_cutover', array() );

	if ( ! is_array( $stored ) ) {
		$stored = array();
	}

	return array_merge( $defaults, $stored );
}

/**
 * Whether a given output module is live.
 *
 * @since 1.0.0
 * @param string $module One of: meta, title, canonical, robots, schema, sitemap.
 * @return bool
 */
function hil_seo_cutover_enabled( string $module ): bool {
	$flags = hil_seo_get_cutover_flags();

	return ! empty( $flags[ $module ] );
}

/**
 * The recommended cutover order, per HIL_Yoast_Migration_and_Rollback_Plan.md
 * Stage 8: lowest-risk first (pure content, no indexing consequence if briefly
 * wrong), highest-risk in the middle (robots — this is what could silently
 * drop a page from search), sitemap last (depends on robots being correct,
 * since the sitemap's own noindex-exclusion logic reads the same signal).
 *
 * This is advisory, not a hard technical dependency — the admin screen warns
 * when a module is enabled out of order rather than blocking it outright,
 * because a hard block is itself a foot-gun if a real situation doesn't match
 * this assumed order (e.g. canonical is a no-op today with zero posts
 * overridden, so enabling it out of turn changes nothing).
 *
 * @since 1.1.0
 * @return array<int, string>
 */
function hil_seo_cutover_order(): array {
	return array( 'meta', 'title', 'canonical', 'robots', 'schema', 'sitemap' );
}

/**
 * Returns the modules that come before $module in the recommended order and
 * are not yet enabled — i.e. what "prerequisite not met" means for $module.
 *
 * @since 1.1.0
 * @param string $module Module name.
 * @return array<int, string> Unmet prerequisite module names, in order.
 */
function hil_seo_unmet_prerequisites( string $module ): array {
	$order = hil_seo_cutover_order();
	$pos   = array_search( $module, $order, true );

	if ( false === $pos || 0 === $pos ) {
		return array();
	}

	$flags   = hil_seo_get_cutover_flags();
	$earlier = array_slice( $order, 0, $pos );

	return array_values( array_filter( $earlier, static fn( $m ) => empty( $flags[ $m ] ) ) );
}

/**
 * Returns the per-module change log: when each module was last flipped, by
 * whom, and to what value. Powers the admin screen's "last-change timestamp"
 * column — never used to gate anything, purely informational/audit.
 *
 * @since 1.1.0
 * @return array<string, array{value: bool, changed_at: string, changed_by: string}>
 */
function hil_seo_get_cutover_log(): array {
	$log = get_option( 'hil_seo_cutover_log', array() );

	return is_array( $log ) ? $log : array();
}

/**
 * Sets one cutover flag and records the change in the audit log. Intended to
 * be called once per Migration Plan Stage 8 sub-step, never all at once — see
 * the module docblock. Both the REST write route and the admin screen
 * (includes/admin-page.php) go through this single function, so the log is
 * always complete regardless of which interface made the change.
 *
 * @since 1.0.0
 * @param string $module Flag name.
 * @param bool   $value  New value.
 * @return void
 */
function hil_seo_set_cutover_flag( string $module, bool $value ): void {
	$flags            = hil_seo_get_cutover_flags();
	$flags[ $module ] = $value;
	update_option( 'hil_seo_cutover', $flags, true );

	$log            = hil_seo_get_cutover_log();
	$user           = wp_get_current_user();
	$log[ $module ] = array(
		'value'      => $value,
		'changed_at' => current_time( 'mysql' ),
		'changed_by' => $user && $user->exists() ? $user->user_login : 'unknown',
	);
	update_option( 'hil_seo_cutover_log', $log, true );
}

/**
 * Registers the parity-preview REST route.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_register_preview_route(): void {
	register_rest_route(
		'hil-seo/v1',
		'/preview/(?P<id>\d+)',
		array(
			'methods'             => 'GET',
			'callback'            => 'hil_seo_preview_callback',
			'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
			'args'                => array(
				'id' => array(
					'validate_callback' => static fn( $param ) => is_numeric( $param ),
				),
			),
		)
	);

	// Cutover-flag read/write, for the Analyst's own migration tooling — never
	// exposed beyond manage_options, since flipping a flag is a production
	// output change subject to the same authorization gate as everything else.
	register_rest_route(
		'hil-seo/v1',
		'/cutover',
		array(
			array(
				'methods'             => 'GET',
				'callback'            => static fn() => rest_ensure_response( hil_seo_get_cutover_flags() ),
				'permission_callback' => static fn() => current_user_can( 'edit_posts' ),
			),
			array(
				'methods'             => 'POST',
				'callback'            => 'hil_seo_cutover_write_callback',
				'permission_callback' => static fn() => current_user_can( 'manage_options' ),
			),
		)
	);
}
add_action( 'rest_api_init', 'hil_seo_register_preview_route' );

/**
 * Writes cutover flags from a REST POST body. Restricted to manage_options
 * (Administrator) deliberately — this is the one action in this whole plugin
 * that changes live front-end output, and the Editor-role Analyst account is
 * intentionally not the account that flips it (see SEO-DEC-019's Administrator
 * ceiling). Each flag flip is still a manual, logged, one-at-a-time action
 * performed from the WordPress admin (or by whoever holds the Administrator
 * account), following Stage 8's sequencing — never called programmatically
 * from the Analyst's own REST tooling.
 *
 * @since 1.0.0
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response
 */
function hil_seo_cutover_write_callback( WP_REST_Request $request ) {
	$body = $request->get_json_params();

	if ( ! is_array( $body ) ) {
		return new WP_REST_Response( array( 'error' => 'Expected a JSON object of module => bool.' ), 400 );
	}

	$known = array_keys( hil_seo_get_cutover_flags() );

	foreach ( $body as $module => $value ) {
		if ( ! in_array( $module, $known, true ) ) {
			return new WP_REST_Response( array( 'error' => "Unknown module '{$module}'." ), 400 );
		}

		hil_seo_set_cutover_flag( (string) $module, (bool) $value );
	}

	return rest_ensure_response( hil_seo_get_cutover_flags() );
}

/**
 * Builds the full would-be SEO output for a post, regardless of cutover state.
 *
 * @since 1.0.0
 * @param int $post_id Post ID.
 * @return array<string, mixed>|WP_Error
 */
function hil_seo_preview_callback( WP_REST_Request $request ) {
	$post_id = (int) $request['id'];
	$post    = get_post( $post_id );

	if ( ! $post ) {
		return new WP_Error( 'hil_seo_not_found', 'No such post.', array( 'status' => 404 ) );
	}

	return rest_ensure_response(
		array(
			'post_id'          => $post_id,
			'status'           => $post->post_status,
			'title'            => hil_seo_resolve_title( $post ),
			'meta_description' => hil_seo_get_meta_description( $post ),
			'canonical'        => hil_seo_resolve_canonical( $post ),
			'robots'           => hil_seo_resolve_robots( get_post_status( $post ) === 'publish' ? 'singular' : 'singular', $post ),
			'schema'           => hil_seo_build_schema_graph( $post ),
			'social_image'     => hil_seo_resolve_social_image( $post ),
		)
	);
}

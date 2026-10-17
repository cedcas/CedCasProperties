<?php
/**
 * Robots meta module — the one module with no TMS/NCS precedent.
 *
 * Neither tms-core nor ncs-core needed this: WordPress core has no per-post
 * or per-taxonomy-type noindex mechanism of its own, only a single sitewide
 * "discourage search engines" switch, and neither of those two sites runs a
 * thin-archive noindex policy at HIL's scale. HIL's SEO-DEC-008 (noindex,
 * follow on thin auto-generated tag/category/author archives) is an active,
 * currently-enforced policy this module has to encode as a default, not an
 * optional nicety — see HIL_Custom_SEO_Plugin_Requirements.md §3.
 *
 * Design: default-by-context, override-by-field. Resolution order for every
 * request: post/term-level override -> context default -> global fallback
 * of index,follow. Printed once, as one <meta name="robots"> tag — mirrors
 * Yoast's own confirmed-live behavior (the Current-State Audit found the
 * robots tag ABSENT, meaning default index,follow, on every page that
 * doesn't need an explicit directive, never printed redundantly).
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Returns the context-level default robots directive.
 *
 * Encodes SEO-DEC-008 as the baseline rather than as N individual per-archive
 * settings — matches how Yoast's own taxonomy-visibility toggle already
 * behaves today (confirmed live on 7 sampled archives during the audit).
 *
 * @since 1.0.0
 * @return array{index: string, follow: string}
 */
function hil_seo_default_robots_for_context(): array {
	if ( is_404() ) {
		return array( 'index' => 'noindex', 'follow' => 'nofollow' );
	}

	if ( is_tag() || is_category() || is_author() || is_search() || is_date() || is_attachment() ) {
		return array( 'index' => 'noindex', 'follow' => 'follow' );
	}

	return array( 'index' => 'index', 'follow' => 'follow' );
}

/**
 * Resolves the robots directive for a specific post (used by the singular
 * branch of the live output AND by the parity-preview REST route).
 *
 * @since 1.0.0
 * @param string       $context 'singular' — reserved for future context types.
 * @param WP_Post|null $post    Post being resolved, when context is singular.
 * @return array{index: string, follow: string}
 */
function hil_seo_resolve_robots( string $context, ?WP_Post $post = null ): array {
	$default = array( 'index' => 'index', 'follow' => 'follow' ); // singular default: index, follow.

	if ( ! $post ) {
		return $default;
	}

	$index_meta  = (string) get_post_meta( $post->ID, 'hil_robots_index', true );
	$follow_meta = (string) get_post_meta( $post->ID, 'hil_robots_follow', true );

	$index  = ( '' !== $index_meta && 'default' !== $index_meta ) ? $index_meta : $default['index'];
	$follow = ( '' !== $follow_meta && 'default' !== $follow_meta ) ? $follow_meta : $default['follow'];

	return array( 'index' => $index, 'follow' => $follow );
}

/**
 * Resolves the robots directive for the current term archive, honoring the
 * per-term override registered in meta.php (hil_term_robots_index) — the
 * exception mechanism for "a future category or tag might deliberately want
 * to be indexable" (Requirements doc §3).
 *
 * @since 1.0.0
 * @return array{index: string, follow: string}
 */
function hil_seo_resolve_term_robots(): array {
	$default = hil_seo_default_robots_for_context();

	$term = get_queried_object();

	if ( ! ( $term instanceof WP_Term ) ) {
		return $default;
	}

	$override = (string) get_term_meta( $term->term_id, 'hil_term_robots_index', true );

	if ( '' !== $override && 'default' !== $override ) {
		$default['index'] = $override;
	}

	return $default;
}

/**
 * Prints the robots meta tag for the current request.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_print_robots(): void {
	if ( ! hil_seo_cutover_enabled( 'robots' ) ) {
		return;
	}

	if ( is_singular() ) {
		$post = get_queried_object();

		if ( ! ( $post instanceof WP_Post ) ) {
			return;
		}

		$robots = hil_seo_resolve_robots( 'singular', $post );
	} elseif ( is_tag() || is_category() || is_author() || is_search() || is_date() ) {
		$robots = hil_seo_resolve_term_robots();
	} else {
		$robots = hil_seo_default_robots_for_context();
	}

	// index,follow with no other directive is WordPress/Yoast's own confirmed
	// convention: omit the tag entirely rather than print a redundant
	// "index, follow" on every single page (matches the Current-State Audit's
	// finding of what Yoast currently does).
	if ( 'index' === $robots['index'] && 'follow' === $robots['follow'] ) {
		return;
	}

	printf(
		'<meta name="robots" content="%s, %s">' . "\n",
		esc_attr( $robots['index'] ),
		esc_attr( $robots['follow'] )
	);
}
add_action( 'wp_head', 'hil_seo_print_robots', 2 );

<?php
/**
 * Meta description, Open Graph, and Twitter cards.
 *
 * Direct port of the tms-core/ncs-core seo-meta.php pattern (both read in
 * full before writing this file — see HIL_SEO_Implementation_Plan.md §1).
 * Deliberately narrow: titles, canonicals, and robots have their own
 * modules; this file only prints description + social tags.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Trims text to a sensible description length on a word boundary.
 *
 * @since 1.0.0
 * @param string $text  Source text.
 * @param int    $limit Maximum characters.
 * @return string
 */
function hil_seo_trim_description( string $text, int $limit = 158 ): string {
	$text = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( $text ) ) ?? '' );

	if ( '' === $text || mb_strlen( $text ) <= $limit ) {
		return $text;
	}

	$cut = mb_substr( $text, 0, $limit );
	$gap = mb_strrpos( $cut, ' ' );

	return rtrim( false === $gap ? $cut : mb_substr( $cut, 0, $gap ), ' ,.;:' ) . '…';
}

/**
 * Resolves the meta description for a specific post.
 *
 * Resolution order: hil_meta_description override -> hand-written excerpt ->
 * auto-excerpt (posts only, never pages — an auto-excerpt on a page assembled
 * from headings/sections produces snippet soup, per the identical lesson
 * already documented in both tms-core and ncs-core) -> empty (no invented
 * fallback; an absent description is better than a bad one, same principle
 * both reference plugins state explicitly).
 *
 * @since 1.0.0
 * @param WP_Post $post Post.
 * @return string
 */
function hil_seo_get_meta_description( WP_Post $post ): string {
	$description = trim( (string) get_post_meta( $post->ID, 'hil_meta_description', true ) );

	if ( '' === $description ) {
		$description = trim( (string) $post->post_excerpt );
	}

	if ( '' === $description && 'page' !== $post->post_type ) {
		$description = (string) get_the_excerpt( $post );
	}

	/**
	 * Filters the resolved meta description before trimming.
	 *
	 * @since 1.0.0
	 * @param string  $description Resolved description.
	 * @param WP_Post $post        Post.
	 */
	$description = (string) apply_filters( 'hil_seo_meta_description', $description, $post );

	return hil_seo_trim_description( $description );
}

/**
 * Resolves the social (OG/Twitter) image for a post.
 *
 * Resolution order: hil_social_image override -> featured image -> site logo.
 * The override is checked FIRST, ahead of the featured image — the one
 * deliberate difference from the tms-core/ncs-core two-tier chain, because
 * HIL's brief explicitly asks for social-image control independent of the
 * body's featured image (Requirements doc §1).
 *
 * @since 1.0.0
 * @param WP_Post $post Post.
 * @return string Empty string when no image is available anywhere in the chain.
 */
function hil_seo_resolve_social_image( WP_Post $post ): string {
	$override_id = (int) get_post_meta( $post->ID, 'hil_social_image', true );

	if ( $override_id ) {
		$url = wp_get_attachment_image_url( $override_id, 'large' );

		if ( $url ) {
			return (string) $url;
		}
	}

	if ( has_post_thumbnail( $post ) ) {
		$url = get_the_post_thumbnail_url( $post, 'large' );

		if ( $url ) {
			return (string) $url;
		}
	}

	$logo_id = (int) get_option( 'hil_seo_default_social_image', 0 );

	if ( $logo_id ) {
		$url = wp_get_attachment_image_url( $logo_id, 'full' );

		if ( $url ) {
			return (string) $url;
		}
	}

	// Final fallback: the site icon, if a dedicated default social image was
	// never configured — same fallback chain tms-core/ncs-core use.
	$icon_id = (int) get_option( 'site_icon', 0 );

	if ( $icon_id ) {
		$url = wp_get_attachment_image_url( $icon_id, 'full' );

		if ( $url ) {
			return (string) $url;
		}
	}

	return '';
}

/**
 * Prints the description, Open Graph and Twitter card tags for the current
 * singular request.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_print_seo_meta(): void {
	if ( ! hil_seo_cutover_enabled( 'meta' ) ) {
		return;
	}

	if ( is_404() || ! is_singular() ) {
		return;
	}

	$post = get_queried_object();

	if ( ! ( $post instanceof WP_Post ) ) {
		return;
	}

	$description = hil_seo_get_meta_description( $post );
	$title       = hil_seo_resolve_title( $post );
	$url         = get_permalink( $post );

	if ( '' !== $description ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $description ) );
		printf( '<meta property="og:description" content="%s">' . "\n", esc_attr( $description ) );
		printf( '<meta name="twitter:description" content="%s">' . "\n", esc_attr( $description ) );
	}

	printf( '<meta property="og:title" content="%s">' . "\n", esc_attr( $title ) );
	printf( '<meta property="og:type" content="%s">' . "\n", is_singular( 'post' ) ? 'article' : 'website' );
	printf( '<meta property="og:url" content="%s">' . "\n", esc_url( $url ) );
	printf( '<meta property="og:site_name" content="%s">' . "\n", esc_attr( get_bloginfo( 'name' ) ) );
	printf( '<meta name="twitter:title" content="%s">' . "\n", esc_attr( $title ) );

	$image = hil_seo_resolve_social_image( $post );

	if ( '' !== $image ) {
		printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $image ) );
		printf( '<meta name="twitter:card" content="summary_large_image">' . "\n" );
		printf( '<meta name="twitter:image" content="%s">' . "\n", esc_url( $image ) );
	} else {
		printf( '<meta name="twitter:card" content="summary">' . "\n" );
	}
}
add_action( 'wp_head', 'hil_seo_print_seo_meta', 5 );

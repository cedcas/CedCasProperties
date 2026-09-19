<?php
/**
 * Document <title> override, global title-suffix fix, and canonical override.
 *
 * The per-post override is a direct port of NetCoreSolutions's ncs-core
 * seo-title.php: hooked on pre_get_document_title (not document_title_parts)
 * so a non-empty return short-circuits wp_get_document_title() entirely,
 * skipping the separator + site-name join that would otherwise double up a
 * title that already ends in a brand suffix.
 *
 * The global suffix fix is new — it exists specifically to close the defect
 * found in HIL_Custom_SEO_Plugin_Current_State_Audit.md §3: some archive/
 * search/author templates were rendering "- blog.haveninlipa.com" instead of
 * "- Haven in Lipa Blog", because WordPress's default document_title_parts
 * join uses the site's Settings > General "Site Title" value directly, and
 * that value does not match the brand suffix Yoast's per-template title
 * templates had been using. Forcing $parts['site'] here, in one place, for
 * every non-singular request, is the fix — no per-template patching.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Returns the one, single source of truth for the site's title suffix.
 *
 * Filterable so a future rebrand changes one function, not every template.
 *
 * @since 1.0.0
 * @return string
 */
function hil_seo_get_title_suffix(): string {
	/**
	 * Filters the site-wide title suffix.
	 *
	 * @since 1.0.0
	 * @param string $suffix Default suffix.
	 */
	return (string) apply_filters( 'hil_seo_title_suffix', 'Haven in Lipa Blog' );
}

/**
 * Whether the current request is the blog index (the posts listing, page 1 or a
 * paginated page) and this plugin — not Yoast — should describe it.
 *
 * 1.1.4: found live 2026-09-19 when Yoast was first deactivated: every output
 * module here was written for singular posts, so the homepage and /page/N/ lost
 * their canonical, meta description, Open Graph/Twitter tags, and the title got
 * a doubled "- Haven in Lipa Blog" suffix (the 09-07 parity pass covered only the
 * 34 posts). Yoast printed all of these itself. While Yoast is active this stays
 * OFF so the homepage never carries two of anything; the moment Yoast is
 * deactivated the plugin takes over with no further action.
 *
 * @since 1.1.4
 * @return bool
 */
function hil_seo_is_blog_index(): bool {
	return is_home() && ! is_singular() && ! defined( 'WPSEO_VERSION' );
}

/**
 * Site tagline, decoded (WordPress stores this option HTML-escaped: "&amp;").
 *
 * @since 1.1.4
 * @return string
 */
function hil_seo_blog_index_tagline(): string {
	return trim( wp_specialchars_decode( (string) get_bloginfo( 'description' ), ENT_QUOTES ) );
}

/**
 * Site name, decoded.
 *
 * @since 1.1.4
 * @return string
 */
function hil_seo_blog_index_name(): string {
	return trim( wp_specialchars_decode( (string) get_bloginfo( 'name' ), ENT_QUOTES ) );
}

/**
 * Blog-index document title, matching what Yoast rendered before the cutover:
 * "<site> - <tagline>" and "<site> - Page N of M - <tagline>" on paginated pages.
 *
 * @since 1.1.4
 * @return string
 */
function hil_seo_blog_index_title(): string {
	global $wp_query;

	$paged = max( 1, (int) get_query_var( 'paged' ) );
	$parts = array( hil_seo_blog_index_name() );

	if ( $paged > 1 ) {
		$max     = max( $paged, isset( $wp_query->max_num_pages ) ? (int) $wp_query->max_num_pages : $paged );
		$parts[] = sprintf( 'Page %d of %d', $paged, $max );
	}

	$tagline = hil_seo_blog_index_tagline();

	if ( '' !== $tagline ) {
		$parts[] = $tagline;
	}

	return implode( ' - ', array_filter( $parts, static fn( $p ) => '' !== $p ) );
}

/**
 * Self-referencing canonical for the blog index and its paginated pages.
 *
 * @since 1.1.4
 * @return string
 */
function hil_seo_blog_index_canonical(): string {
	$paged = max( 1, (int) get_query_var( 'paged' ) );

	if ( $paged <= 1 ) {
		return home_url( '/' );
	}

	// get_pagenum_link() keeps the current request's query string, so
	// /page/2/?utm_source=x would otherwise canonicalise to itself (found live
	// 2026-09-19). A canonical must be the clean, parameter-free URL.
	return (string) preg_replace( '/[?#].*$/', '', (string) get_pagenum_link( $paged ) );
}

/**
 * Resolves the title for a specific post — used both by the live
 * pre_get_document_title filter and by the parity-preview REST route
 * (cutover.php), so "what the plugin would output" and "what it does output"
 * are always computed by the exact same function.
 *
 * @since 1.0.0
 * @param WP_Post $post Post.
 * @return string
 */
function hil_seo_resolve_title( WP_Post $post ): string {
	$override = trim( (string) get_post_meta( $post->ID, 'hil_seo_title', true ) );

	if ( '' !== $override ) {
		return $override;
	}

	// No override: post title + the one true suffix, same join WordPress's
	// own default would do, but guaranteed consistent regardless of what
	// Settings > General > Site Title happens to hold.
	return get_the_title( $post ) . ' - ' . hil_seo_get_title_suffix();
}

/**
 * Overrides the document <title> tag for singular posts/pages.
 *
 * @since 1.0.0
 * @param string $title Title resolved by an earlier-priority filter, if any.
 * @return string
 */
function hil_seo_filter_document_title( string $title ): string {
	if ( ! hil_seo_cutover_enabled( 'title' ) ) {
		return $title;
	}

	if ( '' !== $title ) {
		return $title;
	}

	if ( hil_seo_is_blog_index() ) {
		return hil_seo_blog_index_title();
	}

	if ( ! is_singular() ) {
		return $title;
	}

	$post = get_queried_object();

	if ( ! ( $post instanceof WP_Post ) ) {
		return $title;
	}

	return hil_seo_resolve_title( $post );
}
add_filter( 'pre_get_document_title', 'hil_seo_filter_document_title', 20 );

/**
 * Forces a consistent site-name suffix on every non-singular document title
 * (archives, search, author, 404, date) — fixes the Audit §3 finding.
 *
 * @since 1.0.0
 * @param array<string, string> $parts Title parts (title, page, tagline, site).
 * @return array<string, string>
 */
function hil_seo_filter_title_parts( array $parts ): array {
	if ( ! hil_seo_cutover_enabled( 'title' ) ) {
		return $parts;
	}

	if ( is_singular() ) {
		// Singular titles are fully handled by pre_get_document_title above;
		// don't also touch document_title_parts for them.
		return $parts;
	}

	$parts['site'] = hil_seo_get_title_suffix();

	return $parts;
}
add_filter( 'document_title_parts', 'hil_seo_filter_title_parts', 20 );

/**
 * Resolves the canonical URL for a post.
 *
 * @since 1.0.0
 * @param WP_Post $post Post.
 * @return string
 */
function hil_seo_resolve_canonical( WP_Post $post ): string {
	$override = trim( (string) get_post_meta( $post->ID, 'hil_canonical_url', true ) );

	return '' !== $override ? $override : get_permalink( $post );
}

/**
 * Prints the canonical link tag when an override is set. The default
 * (self-referencing) case is left to WordPress core's own rel_canonical() —
 * confirmed in the Audit as already correct on every published post, so no
 * code is needed for that case (Requirements doc §1: "Default behavior...
 * needs no code at all").
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_print_canonical_override(): void {
	if ( ! hil_seo_cutover_enabled( 'canonical' ) ) {
		return;
	}

	// Core's rel_canonical() only handles singular requests, so the blog index
	// and its /page/N/ URLs get no canonical at all unless this plugin prints one.
	if ( hil_seo_is_blog_index() ) {
		printf( '<link rel="canonical" href="%s" />' . "\n", esc_url( hil_seo_blog_index_canonical() ) );
		return;
	}

	if ( ! is_singular() ) {
		return;
	}

	$post = get_queried_object();

	if ( ! ( $post instanceof WP_Post ) ) {
		return;
	}

	$override = trim( (string) get_post_meta( $post->ID, 'hil_canonical_url', true ) );

	if ( '' === $override ) {
		return; // core's own rel_canonical() already handles this correctly.
	}

	// Remove core's own canonical for this request so exactly one prints —
	// two canonical tags on one page is one of the specific defects the
	// Current-State Audit explicitly checked for and confirmed absent; this
	// plugin must not reintroduce it.
	remove_action( 'wp_head', 'rel_canonical' );

	printf( '<link rel="canonical" href="%s" />' . "\n", esc_url( $override ) );
}
add_action( 'wp_head', 'hil_seo_print_canonical_override', 1 );

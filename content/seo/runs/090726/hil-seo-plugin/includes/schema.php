<?php
/**
 * Structured data.
 *
 * Hand-authored here rather than delegated to an SEO plugin — direct model of
 * tms-core's schema.php, adapted for HIL's much simpler content model (posts
 * and categories only; no multi-location/multi-CPT structure). Organization
 * name, logo, and sameAs profile URLs below were read live from the current
 * Yoast output during the 2026-09-07 audit, not invented.
 *
 * Emitted as a single @graph with @id cross-references, same as tms-core, so
 * the organization, website, author, and article describe one connected
 * entity rather than disconnected islands.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Returns the site's canonical organization @id.
 *
 * @since 1.0.0
 * @return string
 */
function hil_seo_schema_org_id(): string {
	return home_url( '/#organization' );
}

/**
 * Returns plain text fit for a JSON-LD string value — WordPress stores titles
 * HTML-entity-escaped ("Travel &amp; Itineraries"), and JSON is not HTML, so
 * this decodes once before anything reaches a JSON string value. Same
 * function, same reasoning, as tms-core's tms_core_schema_text().
 *
 * @since 1.0.0
 * @param string $text Possibly escaped text.
 * @return string
 */
function hil_seo_schema_text( string $text ): string {
	return trim( wp_specialchars_decode( wp_strip_all_tags( $text ), ENT_QUOTES ) );
}

/**
 * Builds the Organization node.
 *
 * @since 1.0.0
 * @return array<string, mixed>
 */
function hil_seo_schema_organization(): array {
	$node = array(
		'@type' => 'Organization',
		'@id'   => hil_seo_schema_org_id(),
		'name'  => 'Haven in Lipa',
		'url'   => home_url( '/' ),
	);

	/**
	 * Filters the Organization sameAs profile list. Defaults to the profiles
	 * confirmed live in Yoast's current output as of the 2026-09-07 audit.
	 *
	 * @since 1.0.0
	 * @param array<int,string> $profiles Profile URLs.
	 */
	$same_as = (array) apply_filters(
		'hil_seo_organization_same_as',
		array(
			'https://www.facebook.com/profile.php?id=61572535599006',
			'https://www.instagram.com/haven_inlipa/',
			'https://www.tiktok.com/@haven_inlipa',
			'https://haveninlipa.com',
		)
	);

	if ( $same_as ) {
		$node['sameAs'] = array_values( array_filter( $same_as ) );
	}

	$logo_id = (int) get_option( 'hil_seo_default_social_image', 0 ) ?: (int) get_option( 'site_icon', 0 );

	if ( $logo_id ) {
		$logo = wp_get_attachment_image_src( $logo_id, 'full' );

		if ( is_array( $logo ) && ! empty( $logo[0] ) ) {
			$node['logo'] = array(
				'@type'  => 'ImageObject',
				'url'    => $logo[0],
				'width'  => (int) ( $logo[1] ?? 0 ),
				'height' => (int) ( $logo[2] ?? 0 ),
			);

			$node['image'] = array( '@id' => $node['logo']['url'] );
		}
	}

	return $node;
}

/**
 * Builds the WebSite node.
 *
 * @since 1.0.0
 * @return array<string, mixed>
 */
function hil_seo_schema_website(): array {
	return array(
		'@type'           => 'WebSite',
		'@id'             => home_url( '/#website' ),
		'url'             => home_url( '/' ),
		'name'            => 'Haven in Lipa',
		'description'     => hil_seo_schema_text( (string) get_bloginfo( 'description' ) ),
		'publisher'       => array( '@id' => hil_seo_schema_org_id() ),
		'potentialAction' => array(
			array(
				'@type'       => 'SearchAction',
				'target'      => array(
					'@type'       => 'EntryPoint',
					'urlTemplate' => home_url( '/?s={search_term_string}' ),
				),
				'query-input' => 'required name=search_term_string',
			),
		),
	);
}

/**
 * Builds a Person node for a WordPress author, cross-referenced from the
 * article node's author property.
 *
 * @since 1.0.0
 * @param int $author_id WordPress user ID.
 * @return array<string, mixed>
 */
function hil_seo_schema_person( int $author_id ): array {
	$name = get_the_author_meta( 'display_name', $author_id );

	$node = array(
		'@type' => 'Person',
		'@id'   => home_url( '/#/schema/person/' . $author_id ),
		'name'  => hil_seo_schema_text( (string) $name ),
		'url'   => get_author_posts_url( $author_id ),
	);

	$description = get_the_author_meta( 'description', $author_id );

	if ( '' !== (string) $description ) {
		$node['description'] = hil_seo_schema_text( (string) $description );
	}

	return $node;
}

/**
 * Builds a BlogPosting node for a post.
 *
 * @since 1.0.0
 * @param WP_Post $post Post.
 * @return array<string, mixed>
 */
function hil_seo_schema_article( WP_Post $post ): array {
	$permalink = get_permalink( $post );

	$node = array(
		'@type'            => 'BlogPosting',
		'@id'              => $permalink . '#article',
		'mainEntityOfPage' => array( '@id' => $permalink ),
		'headline'         => hil_seo_schema_text( get_the_title( $post ) ),
		'url'              => $permalink,
		'datePublished'    => get_the_date( DATE_W3C, $post ),
		'dateModified'     => get_the_modified_date( DATE_W3C, $post ),
		'publisher'        => array( '@id' => hil_seo_schema_org_id() ),
		'isPartOf'         => array( '@id' => home_url( '/#website' ) ),
		'author'           => array( '@id' => home_url( '/#/schema/person/' . (int) $post->post_author ) ),
	);

	$image = hil_seo_resolve_social_image( $post );

	if ( '' !== $image ) {
		$node['image'] = $image;
	}

	$description = hil_seo_get_meta_description( $post );

	if ( '' !== $description ) {
		$node['description'] = $description;
	}

	$categories = get_the_category( $post->ID );

	if ( $categories ) {
		$node['articleSection'] = hil_seo_schema_text( $categories[0]->name );
	}

	return $node;
}

/**
 * Builds a BreadcrumbList for the current request. HIL's structure is a flat
 * post -> category hierarchy — simpler than tms-core's multi-post-type
 * ancestor trail, so this is a reduced version of the same pattern.
 *
 * @since 1.0.0
 * @return array<string, mixed>|null
 */
function hil_seo_schema_breadcrumbs(): ?array {
	if ( is_front_page() || ! is_singular() ) {
		return null;
	}

	$post = get_queried_object();

	if ( ! ( $post instanceof WP_Post ) ) {
		return null;
	}

	$items = array(
		array(
			'@type'    => 'ListItem',
			'position' => 1,
			'name'     => __( 'Home', 'hil-seo' ),
			'item'     => home_url( '/' ),
		),
	);

	$position   = 1;
	$categories = get_the_category( $post->ID );

	if ( $categories ) {
		++$position;
		$items[] = array(
			'@type'    => 'ListItem',
			'position' => $position,
			'name'     => hil_seo_schema_text( $categories[0]->name ),
			'item'     => get_category_link( $categories[0] ),
		);
	}

	++$position;
	$items[] = array(
		'@type'    => 'ListItem',
		'position' => $position,
		'name'     => hil_seo_schema_text( get_the_title( $post ) ),
	);

	return array(
		'@type'           => 'BreadcrumbList',
		'@id'             => get_permalink( $post ) . '#breadcrumbs',
		'itemListElement' => $items,
	);
}

/**
 * Assembles the full structured-data graph for the current request. Also the
 * function the parity-preview REST route calls directly (cutover.php), so
 * "what would render" and "what does render" always agree.
 *
 * @since 1.0.0
 * @param WP_Post|null $post Post, when previewing/rendering a singular request.
 * @return array<string, mixed>
 */
function hil_seo_build_schema_graph( ?WP_Post $post = null ): array {
	$graph = array( hil_seo_schema_organization(), hil_seo_schema_website() );

	if ( $post instanceof WP_Post ) {
		$schema_type = (string) get_post_meta( $post->ID, 'hil_schema_type', true );

		if ( 'none' !== $schema_type && 'post' === $post->post_type ) {
			$graph[] = hil_seo_schema_person( (int) $post->post_author );
			$graph[] = hil_seo_schema_article( $post );
		}
	}

	$breadcrumbs = hil_seo_schema_breadcrumbs();

	if ( $breadcrumbs ) {
		$graph[] = $breadcrumbs;
	}

	/**
	 * Filters the structured data graph before output.
	 *
	 * @since 1.0.0
	 * @param array<int, array<string, mixed>> $graph Graph nodes.
	 */
	return (array) apply_filters( 'hil_seo_schema_graph', $graph );
}

/**
 * Prints the structured data graph for the current live request.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_print_schema(): void {
	if ( ! hil_seo_cutover_enabled( 'schema' ) ) {
		return;
	}

	if ( is_404() || is_search() ) {
		return;
	}

	$post  = is_singular() ? get_queried_object() : null;
	$graph = hil_seo_build_schema_graph( $post instanceof WP_Post ? $post : null );

	if ( ! $graph ) {
		return;
	}

	// Slash escaping left ON (default) deliberately — wp_json_encode escapes
	// "/", making a literal </script> inside any string value impossible,
	// same reasoning as tms-core's identical choice.
	$json = wp_json_encode(
		array(
			'@context' => 'https://schema.org',
			'@graph'   => array_values( $graph ),
		),
		JSON_UNESCAPED_UNICODE
	);

	if ( ! $json ) {
		return;
	}

	printf(
		'<script type="application/ld+json">%s</script>' . "\n",
		$json // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode output, slashes escaped.
	);
}
add_action( 'wp_head', 'hil_seo_print_schema', 20 );

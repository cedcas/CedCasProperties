<?php
/**
 * Registered post meta — the full field set from
 * HIL_Custom_SEO_Plugin_Requirements.md §1.
 *
 * Every field is show_in_rest with an explicit sanitize_callback and default,
 * exactly the tms-core/ncs-core pattern — this is what makes every field
 * correctly round-trip through REST with no version-dependent internal API to
 * reverse-engineer (the exact lesson the shared seo/Tools/seo_plugin.py module
 * documents from the AIOSEO/Yoast experience: a field you register yourself
 * this way cannot silently fail to persist the way a raw postmeta guess
 * against another plugin's real internal table can).
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Validates an enum-typed meta value.
 *
 * @since 1.0.0
 * @param mixed             $value   Raw value.
 * @param array<int,string> $allowed Allowed values.
 * @return bool
 */
function hil_seo_is_valid_enum( $value, array $allowed ): bool {
	return in_array( (string) $value, $allowed, true );
}

/**
 * Returns the meta schema, keyed by meta key.
 *
 * @since 1.0.0
 * @return array<string, array<string, mixed>>
 */
function hil_seo_get_meta_schema(): array {
	return array(
		'hil_focus_keyword'       => array(
			'type'              => 'string',
			'description'       => __( 'Editorial/tracking field only — does not itself influence ranking. Powers the Keyword Master sync and the "missing focus keyword" warning.', 'hil-seo' ),
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		),
		'hil_secondary_keywords'  => array(
			'type'              => 'string',
			'description'       => __( 'Comma-separated supporting keywords. Editorial/tracking only.', 'hil-seo' ),
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		),
		'hil_seo_title'           => array(
			'type'              => 'string',
			'description'       => __( 'Overrides the document <title> tag only (not the visible H1). Include the full title including any brand suffix — WordPress will not append its own suffix on top of this. Leave empty to use the default.', 'hil-seo' ),
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		),
		'hil_meta_description'    => array(
			'type'              => 'string',
			'description'       => __( 'Search-result description, ~155 characters. Leave empty to fall back to the excerpt (posts only).', 'hil-seo' ),
			'sanitize_callback' => 'sanitize_text_field',
			'default'           => '',
		),
		'hil_canonical_url'       => array(
			'type'              => 'string',
			'description'       => __( 'Canonical URL override. Leave empty for the default self-referencing canonical.', 'hil-seo' ),
			'sanitize_callback' => 'esc_url_raw',
			'default'           => '',
		),
		'hil_robots_index'        => array(
			'type'              => 'string',
			'description'       => __( 'default | index | noindex. "default" defers to the archive/post-type context rule.', 'hil-seo' ),
			'sanitize_callback' => static function ( $value ) {
				return hil_seo_is_valid_enum( $value, array( 'default', 'index', 'noindex' ) ) ? (string) $value : 'default';
			},
			'default'           => 'default',
		),
		'hil_robots_follow'       => array(
			'type'              => 'string',
			'description'       => __( 'default | follow | nofollow.', 'hil-seo' ),
			'sanitize_callback' => static function ( $value ) {
				return hil_seo_is_valid_enum( $value, array( 'default', 'follow', 'nofollow' ) ) ? (string) $value : 'default';
			},
			'default'           => 'default',
		),
		'hil_social_image'        => array(
			'type'              => 'integer',
			'description'       => __( 'Attachment ID for Open Graph/Twitter image. Falls back to the featured image, then the site logo.', 'hil-seo' ),
			'sanitize_callback' => 'absint',
			'default'           => 0,
		),
		'hil_schema_type'         => array(
			'type'              => 'string',
			'description'       => __( 'blogposting | webpage | none.', 'hil-seo' ),
			'sanitize_callback' => static function ( $value ) {
				return hil_seo_is_valid_enum( $value, array( 'blogposting', 'webpage', 'none' ) ) ? (string) $value : 'blogposting';
			},
			'default'           => 'blogposting',
		),
		'hil_seo_status'          => array(
			'type'              => 'string',
			'description'       => __( 'not_started | in_progress | complete. Set by the Analyst — never auto-computed.', 'hil-seo' ),
			'sanitize_callback' => static function ( $value ) {
				return hil_seo_is_valid_enum( $value, array( 'not_started', 'in_progress', 'complete' ) ) ? (string) $value : 'not_started';
			},
			'default'           => 'not_started',
		),
	);
}

/**
 * Registers post meta for 'post' (and 'page', for parity if HIL ever adds one).
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_register_meta(): void {
	foreach ( array( 'post', 'page' ) as $post_type ) {
		foreach ( hil_seo_get_meta_schema() as $key => $args ) {
			register_post_meta(
				$post_type,
				$key,
				array(
					'type'              => $args['type'],
					'description'       => $args['description'],
					'single'            => true,
					'default'           => $args['default'],
					'show_in_rest'      => true,
					'sanitize_callback' => $args['sanitize_callback'],
					'auth_callback'     => static fn() => current_user_can( 'edit_posts' ),
				)
			);
		}
	}
}
add_action( 'init', 'hil_seo_register_meta' );

/**
 * Per-term robots override — the exception mechanism Requirements doc §3
 * calls for ("some future category or tag might deliberately want to be
 * indexable"). One field, category and post_tag only.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_register_term_meta(): void {
	foreach ( array( 'category', 'post_tag' ) as $taxonomy ) {
		register_term_meta(
			$taxonomy,
			'hil_term_robots_index',
			array(
				'type'              => 'string',
				'description'       => __( 'default | index | noindex. Overrides the archive-type default (noindex) for this specific term.', 'hil-seo' ),
				'single'            => true,
				'default'           => 'default',
				'show_in_rest'      => true,
				'sanitize_callback' => static function ( $value ) {
					return hil_seo_is_valid_enum( $value, array( 'default', 'index', 'noindex' ) ) ? (string) $value : 'default';
				},
				'auth_callback'     => static fn() => current_user_can( 'manage_categories' ),
			)
		);
	}
}
add_action( 'init', 'hil_seo_register_term_meta' );

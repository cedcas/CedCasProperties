<?php
/**
 * Uninstall handler.
 *
 * Deliberately conservative, matching tms-core's own uninstall.php: content
 * (post meta, term meta) is never touched here. WordPress already leaves
 * post meta and options in place on plain deactivation; this file only runs
 * on a full "Delete" from the Plugins screen, and even then this plugin
 * removes only its own site option (the cutover flags) — every hil_* post
 * meta value and every hil_term_robots_index term meta value is left alone,
 * because deleting a plugin should never be mistaken for a way to delete
 * the SEO work already stored in those fields.
 *
 * @package HILSEO
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

delete_option( 'hil_seo_cutover' );
delete_option( 'hil_seo_default_social_image' );

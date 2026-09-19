<?php
/**
 * Plugin Name:       HIL SEO
 * Plugin URI:        https://haveninlipa.com
 * Description:       Custom SEO output and editorial workflow for the Haven in Lipa blog — meta description, Open Graph/Twitter cards, robots control, hand-authored schema, and an SEO-title override. Built to replace Yoast SEO's output, not its editorial UI conventions. See HIL_Custom_SEO_Plugin_Requirements.md.
 * Version:           1.1.5
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Haven in Lipa SEO
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       hil-seo
 *
 * Modeled directly on the already-live tms-core (TribeMedSpa) and ncs-core
 * (NetCoreSolutions) plugins — same register_post_meta + show_in_rest pattern,
 * same wp_head-hooked output, same "nothing is emitted for data we do not have"
 * principle. Two modules have no TMS/NCS precedent and are new here because
 * neither of those sites runs a thin-archive noindex policy or an editorial
 * keyword-tracking layer: includes/robots.php and the editorial fields in
 * includes/editor-fields.php.
 *
 * IMPORTANT — activation sequencing (see HIL_Yoast_Migration_and_Rollback_Plan.md):
 * This plugin is safe to activate alongside Yoast. Nothing here fires until the
 * corresponding Yoast module is explicitly disabled (Yoast → General → Features),
 * module by module, per the Migration Plan's Stage 8 sequencing. Activating this
 * plugin does NOT by itself change any front-end output — each output hook is
 * gated behind an option this plugin controls (see includes/cutover.php).
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'HIL_SEO_VERSION', '1.1.5' );
define( 'HIL_SEO_FILE', __FILE__ );
define( 'HIL_SEO_DIR', plugin_dir_path( __FILE__ ) );

/**
 * Loads the plugin's modules.
 *
 * Ordered by dependency: meta.php registers every field before anything else
 * reads it; cutover.php (the stage-gate option) loads before any output module
 * so those modules can check it.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_load(): void {
	$modules = array(
		'cutover',
		'meta',
		'seo-title',
		'seo-meta',
		'robots',
		'schema',
		'sitemap',
		'editor-fields',
		'admin-page',
	);

	foreach ( $modules as $module ) {
		$path = HIL_SEO_DIR . 'includes/' . $module . '.php';

		if ( is_readable( $path ) ) {
			require_once $path;
		}
	}
}
hil_seo_load();

/**
 * Runs on activation. No rewrite rules or post types to register — this
 * plugin adds no new content model, only output and editorial fields on
 * existing posts. Present for parity with the tms-core/ncs-core activation
 * pattern and as the place to add a one-time notice.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_activate(): void {
	// Deliberately empty. See the module docblock above: activation changes
	// no front-end output by itself. The cutover option defaults to "off"
	// for every module (includes/cutover.php), so a fresh activation is inert
	// until each module is explicitly turned on per the Migration Plan.
}
register_activation_hook( HIL_SEO_FILE, 'hil_seo_activate' );

/**
 * Runs on deactivation. Nothing to clean up — no rewrite rules, no scheduled
 * events. Post meta and the cutover option are left in place (deactivating
 * is not the same as uninstalling) so reactivation restores exact prior state,
 * per the Migration Plan's rollback procedure.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_deactivate(): void {
	// Deliberately empty.
}
register_deactivation_hook( HIL_SEO_FILE, 'hil_seo_deactivate' );

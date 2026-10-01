<?php
/**
 * Plugin Name: HIL Performance
 * Description: Loads the theme's Font Awesome icon stylesheet without blocking the first paint. Deactivate to restore the theme's default loading.
 * Version:     1.0.2
 * Author:      HavenInLipa
 * Requires at least: 6.0
 * Requires PHP: 7.4
 *
 * Why (2026-09-30 SEO audit, blog PageSpeed mobile 65-67): the theme enqueues
 * the full Font Awesome 6.5.0 stylesheet from cdnjs as a normal render-blocking
 * <link>, for about 14 icons per page. PageSpeed measured it at ~1,050 ms of the
 * ~3.3 s of render-blocking time. With LiteSpeed "CSS Combine" ON, LiteSpeed
 * also folds that external stylesheet into its combined file, so rewriting the
 * <link> tag alone is not reliable.
 *
 * What this does: removes the theme's `font-awesome` <link> as WordPress prints
 * it and injects the same stylesheet from a tiny inline script instead, the
 * same pattern the main site uses in src/app/layout.tsx. A <link> created at
 * runtime cannot be combined or made render-blocking by LiteSpeed, and the
 * script carries data-no-optimize so LiteSpeed leaves it untouched. Icons
 * appear a moment after the text; nothing else changes.
 *
 * 1.0.1: removed the <noscript><link> fallback. LiteSpeed CSS Combine treats
 * stylesheet links inside <noscript> as combinable, so 1.0.0's fallback put
 * the whole Font Awesome stylesheet straight back into the render-blocking
 * combined file (verified live 2026-09-30: 155 KB bundle, 15 Font Awesome
 * headers). Visitors without JavaScript now get no icons; they are decorative.
 *
 * Rollback: deactivate the plugin, then purge LiteSpeed + the Hostinger CDN.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Style handle the theme registers (rendered as id="font-awesome-css"). */
const HIL_PERF_FA_HANDLE = 'font-awesome';

/**
 * Removes the theme's render-blocking Font Awesome <link> at the moment
 * WordPress prints it, and remembers its URL for the non-blocking loader.
 *
 * 1.0.2: 1.0.0/1.0.1 dequeued the handle on `wp_enqueue_scripts` at priority
 * 100, but the theme adds it later than that, so the <link> was still printed
 * and LiteSpeed CSS Combine kept folding it into the render-blocking bundle
 * (proof: the combined file's name hash never changed). Filtering the printed
 * tag works regardless of when or where the theme enqueues it.
 *
 * @param string $tag    The <link> tag WordPress is about to print.
 * @param string $handle Style handle.
 * @param string $href   Stylesheet URL (with ?ver=).
 * @return string
 */
function hil_perf_intercept_font_awesome_tag( $tag, $handle, $href = '' ) {
	if ( HIL_PERF_FA_HANDLE !== $handle || is_admin() || '' === (string) $href ) {
		return $tag;
	}

	$GLOBALS['hil_perf_fa_src'] = (string) $href;

	return '';
}
add_filter( 'style_loader_tag', 'hil_perf_intercept_font_awesome_tag', 999, 3 );

/**
 * Prints the non-blocking loader once, after the tag has been intercepted.
 * Runs late in <head> (styles print at wp_head priority 8) and again in the
 * footer in case the theme's styles are printed late; the second call is a
 * no-op once the loader has been printed.
 */
function hil_perf_print_font_awesome_loader(): void {
	if ( is_admin() || empty( $GLOBALS['hil_perf_fa_src'] ) || ! empty( $GLOBALS['hil_perf_fa_printed'] ) ) {
		return;
	}

	$GLOBALS['hil_perf_fa_printed'] = true;

	// media=print + onload swap: the browser fetches it at low priority without
	// blocking render, then applies it. Same technique as the main site.
	printf(
		"<script data-no-optimize=\"1\">(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=%s;l.media='print';l.crossOrigin='anonymous';l.referrerPolicy='no-referrer';l.onload=function(){this.media='all';this.onload=null;};document.head.appendChild(l);})();</script>\n",
		wp_json_encode( $GLOBALS['hil_perf_fa_src'] )
	);
}
add_action( 'wp_head', 'hil_perf_print_font_awesome_loader', 99 );
add_action( 'wp_footer', 'hil_perf_print_font_awesome_loader', 99 );

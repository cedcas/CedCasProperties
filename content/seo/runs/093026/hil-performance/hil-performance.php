<?php
/**
 * Plugin Name: HIL Performance
 * Description: Loads the theme's Font Awesome icon stylesheet without blocking the first paint. Deactivate to restore the theme's default loading.
 * Version:     1.0.1
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
 * What this does: removes the `font-awesome` handle from WordPress's style
 * queue and injects the same stylesheet from a tiny inline script instead, the
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

/** Fallback if the handle's registered src can't be read. */
const HIL_PERF_FA_FALLBACK_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';

/**
 * Captures the theme's Font Awesome URL, then dequeues it. Runs late so the
 * theme's own enqueue (default priority 10) has already happened.
 */
function hil_perf_take_over_font_awesome(): void {
	if ( is_admin() ) {
		return;
	}

	$styles = wp_styles();

	if ( ! isset( $styles->registered[ HIL_PERF_FA_HANDLE ] ) ) {
		return; // Theme no longer loads it: nothing to do.
	}

	$dep = $styles->registered[ HIL_PERF_FA_HANDLE ];
	$src = $dep->src ? (string) $dep->src : HIL_PERF_FA_FALLBACK_SRC;

	if ( $dep->ver ) {
		$src = add_query_arg( 'ver', $dep->ver, $src );
	}

	$GLOBALS['hil_perf_fa_src'] = $src;

	wp_dequeue_style( HIL_PERF_FA_HANDLE );
}
add_action( 'wp_enqueue_scripts', 'hil_perf_take_over_font_awesome', 100 );

/**
 * Prints the non-blocking loader in <head>.
 */
function hil_perf_print_font_awesome_loader(): void {
	if ( is_admin() || empty( $GLOBALS['hil_perf_fa_src'] ) ) {
		return;
	}

	// media=print + onload swap: the browser fetches it at low priority without
	// blocking render, then applies it. Same technique as the main site.
	printf(
		"<script data-no-optimize=\"1\">(function(){var l=document.createElement('link');l.rel='stylesheet';l.href=%s;l.media='print';l.crossOrigin='anonymous';l.referrerPolicy='no-referrer';l.onload=function(){this.media='all';this.onload=null;};document.head.appendChild(l);})();</script>\n",
		wp_json_encode( $GLOBALS['hil_perf_fa_src'] )
	);
}
add_action( 'wp_head', 'hil_perf_print_font_awesome_loader', 5 );

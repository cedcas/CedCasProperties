<?php
/**
 * Standalone test for includes/social-links.php's rewrite logic.
 *
 * Runs hil_seo_rewrite_social_links() against the two live markup snippets
 * (CTA section + footer .social-links, both captured 2026-10-16) and asserts
 * the expected output. Not a WordPress test suite — stubs the handful of WP
 * functions social-links.php touches at load time so the two pure string
 * functions under test can run outside WordPress.
 *
 * Run: php content/seo/runs/101626/tests/test-social-links.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

function add_action( ...$args ) {}
function apply_filters( $tag, $value ) {
	return $value;
}
function is_admin() {
	return false;
}
function is_feed() {
	return false;
}

require __DIR__ . '/../hil-seo-plugin/includes/social-links.php';

$failures = 0;

function assert_contains( string $haystack, string $needle, string $label ): void {
	global $failures;
	if ( false === strpos( $haystack, $needle ) ) {
		++$failures;
		echo "FAIL: {$label}\n  expected to find: {$needle}\n";
	} else {
		echo "PASS: {$label}\n";
	}
}

function assert_count( string $haystack, string $needle, int $expected, string $label ): void {
	global $failures;
	$actual = substr_count( $haystack, $needle );
	if ( $actual !== $expected ) {
		++$failures;
		echo "FAIL: {$label}\n  expected {$expected} occurrences, got {$actual}\n";
	} else {
		echo "PASS: {$label}\n";
	}
}

// --- Snippet 1: CTA section (live markup, blog homepage, 2026-10-16) ---
$cta = '<div class="cta-section__social reveal reveal-d3"><a href="https://facebook.com/haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a><a href="https://instagram.com/haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram" aria-hidden="true"></i></a><a href="https://tiktok.com/@haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="TikTok"><i class="fa-brands fa-tiktok" aria-hidden="true"></i></a><a href="https://airbnb.com/h/haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="Airbnb"><i class="fa-brands fa-airbnb" aria-hidden="true"></i></a></div>';

$result = hil_seo_rewrite_social_links( $cta );

echo "--- CTA section ---\n";
assert_contains( $result, 'href="https://www.facebook.com/haveninlipa"', 'CTA: Facebook href corrected' );
assert_contains( $result, 'href="https://www.instagram.com/haven_inlipa/"', 'CTA: Instagram href corrected' );
assert_contains( $result, 'href="https://www.tiktok.com/@haven.in.lipa"', 'CTA: TikTok href corrected' );
assert_contains( $result, 'href="https://www.youtube.com/@Haven-in-Lipa"', 'CTA: YouTube anchor inserted' );
assert_contains( $result, 'aria-label="YouTube"', 'CTA: YouTube aria-label set' );
assert_count( $result, 'fa-youtube', 1, 'CTA: exactly one YouTube icon' );
assert_contains( $result, 'href="https://airbnb.com/h/haveninlipa"', 'CTA: Airbnb link untouched' );

$tiktok_pos  = strpos( $result, '@haven.in.lipa' );
$youtube_pos = strpos( $result, '@Haven-in-Lipa' );
$airbnb_pos  = strpos( $result, 'airbnb.com' );

if ( false !== $tiktok_pos && false !== $youtube_pos && false !== $airbnb_pos
	&& $tiktok_pos < $youtube_pos && $youtube_pos < $airbnb_pos ) {
	echo "PASS: CTA: YouTube anchor sits immediately after TikTok, before Airbnb\n";
} else {
	++$failures;
	echo "FAIL: CTA: YouTube anchor is not positioned immediately after TikTok\n";
}

$result_twice = hil_seo_rewrite_social_links( $result );
assert_count( $result_twice, 'fa-youtube', 1, 'CTA: idempotent on a second pass' );

// --- Snippet 2: footer .social-links block (same four anchors, class="social-link") ---
$footer = '<div class="social-links"><a href="https://facebook.com/haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="Facebook" class="social-link"><i class="fa-brands fa-facebook-f" aria-hidden="true"></i></a><a href="https://instagram.com/haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="social-link"><i class="fa-brands fa-instagram" aria-hidden="true"></i></a><a href="https://tiktok.com/@haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="TikTok" class="social-link"><i class="fa-brands fa-tiktok" aria-hidden="true"></i></a><a href="https://airbnb.com/h/haveninlipa" target="_blank" rel="noopener noreferrer" aria-label="Airbnb" class="social-link"><i class="fa-brands fa-airbnb" aria-hidden="true"></i></a></div>';

$result2 = hil_seo_rewrite_social_links( $footer );

echo "\n--- Footer .social-links ---\n";
assert_contains( $result2, 'href="https://www.facebook.com/haveninlipa"', 'Footer: Facebook href corrected' );
assert_contains( $result2, 'href="https://www.instagram.com/haven_inlipa/"', 'Footer: Instagram href corrected' );
assert_contains( $result2, 'href="https://www.tiktok.com/@haven.in.lipa"', 'Footer: TikTok href corrected' );
assert_contains( $result2, 'href="https://www.youtube.com/@Haven-in-Lipa"', 'Footer: YouTube anchor inserted' );
assert_contains( $result2, 'aria-label="YouTube"', 'Footer: YouTube aria-label set' );
assert_count( $result2, 'class="social-link"', 5, 'Footer: YouTube anchor clones class="social-link" (5 anchors total)' );
assert_count( $result2, 'fa-youtube', 1, 'Footer: exactly one YouTube icon' );
assert_contains( $result2, 'href="https://airbnb.com/h/haveninlipa"', 'Footer: Airbnb link untouched' );

$result2_twice = hil_seo_rewrite_social_links( $result2 );
assert_count( $result2_twice, 'fa-youtube', 1, 'Footer: idempotent on a second pass' );

echo "\n";
if ( $failures > 0 ) {
	echo "{$failures} assertion(s) failed.\n";
	exit( 1 );
}

echo "All assertions passed.\n";
exit( 0 );

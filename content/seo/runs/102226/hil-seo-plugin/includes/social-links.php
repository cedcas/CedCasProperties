<?php
/**
 * Corrects the theme's hardcoded social icon links on the front end.
 *
 * The `haveninlipa-blog` theme (source not in this repo — see
 * docs/HIL Blog Technical Specification.md -> Theme) hardcodes four social
 * anchors in two places (the CTA section and the footer `.social-links`
 * block): Facebook, Instagram, TikTok, Airbnb. Three of the four hrefs are
 * wrong (bare domain Instagram/TikTok links, and a TikTok handle that was
 * never live), and there is no YouTube icon at all, even though the
 * Organization schema (includes/schema.php, 1.1.9) now lists a YouTube
 * channel. Editing the live theme files directly risks a white screen and
 * the source isn't in this repo to patch properly, so this module corrects
 * the rendered HTML instead — one plugin upload, survives theme edits, and
 * is undone by deactivating this plugin or this filter. As of 1.1.10, the
 * Airbnb anchor's href is also rewritten: Cedric decided (2026-10-22) that
 * `https://airbnb.com/h/haveninlipa` is not a valid vanity link — it
 * redirects to the generic `airbnb.com/s/homes` search page, not a HIL
 * listing — and that the fix is to repoint it at direct booking
 * (`https://haveninlipa.com/properties`), never at an individual Airbnb
 * listing. See src/lib/local-business-schema.ts's comment on the parallel
 * main-site decision (no Airbnb `sameAs`/listing link anywhere on
 * haveninlipa.com either).
 *
 * Front-end only: skips wp-admin, REST, AJAX, cron, and feeds. Runs via
 * output buffering started on `template_redirect`, scoped to HTML responses,
 * so it never touches an admin screen, a JSON response, or an RSS feed.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether this module is active. A master switch independent of the
 * `hil_seo_cutover` flags in includes/cutover.php — those gate the
 * Yoast-migration SEO output modules; this one is a theme-markup
 * correctness fix unrelated to that migration, so it defaults ON.
 *
 * @since 1.1.9
 * @return bool
 */
function hil_seo_social_links_enabled(): bool {
	/**
	 * Filters whether the theme social-link correction runs at all.
	 *
	 * @since 1.1.9
	 * @param bool $enabled Whether the module is active.
	 */
	return (bool) apply_filters( 'hil_seo_fix_social_links', true );
}

/**
 * Whether the current request is a front-end page view this module should
 * touch — never wp-admin, REST, AJAX, cron, or a feed.
 *
 * @since 1.1.9
 * @return bool
 */
function hil_seo_social_links_should_run(): bool {
	if ( ! hil_seo_social_links_enabled() ) {
		return false;
	}

	if ( is_admin() ) {
		return false;
	}

	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return false;
	}

	if ( defined( 'DOING_AJAX' ) && DOING_AJAX ) {
		return false;
	}

	if ( defined( 'DOING_CRON' ) && DOING_CRON ) {
		return false;
	}

	if ( is_feed() ) {
		return false;
	}

	return true;
}

/**
 * Whether the response being buffered looks like an HTML document, based on
 * any Content-Type header already sent. WordPress front-end templates don't
 * usually send an explicit one (the server/PHP default is HTML), so the
 * absence of a Content-Type header is treated as HTML too; only an
 * explicit non-HTML Content-Type opts out.
 *
 * @since 1.1.9
 * @return bool
 */
function hil_seo_social_links_is_html_response(): bool {
	foreach ( headers_list() as $header ) {
		if ( 0 === stripos( $header, 'Content-Type:' ) ) {
			return false !== stripos( $header, 'text/html' );
		}
	}

	return true;
}

/**
 * Builds a YouTube anchor by cloning a TikTok anchor's full markup —
 * attributes, classes, and all — and only swapping the href, the
 * aria-label, and the Font Awesome icon class. Cloning instead of building a
 * fresh tag from scratch is what makes the result correct in both the CTA
 * section (plain anchor, no class) and the footer (`class="social-link"`)
 * without the module needing to know which container it's in.
 *
 * @since 1.1.9
 * @param string $tiktok_anchor Full `<a ...>...</a>` markup of a TikTok anchor.
 * @return string
 */
function hil_seo_youtube_anchor_from_tiktok( string $tiktok_anchor ): string {
	$anchor = (string) preg_replace( '/href="[^"]*"/i', 'href="https://www.youtube.com/@Haven-in-Lipa"', $tiktok_anchor, 1 );
	$anchor = (string) preg_replace( '/aria-label="TikTok"/i', 'aria-label="YouTube"', $anchor, 1 );
	$anchor = (string) preg_replace( '/fa-tiktok/i', 'fa-youtube', $anchor, 1 );

	return $anchor;
}

/**
 * Rewrites the theme's hardcoded Airbnb anchor href to the direct-booking
 * `/properties` page. Matches any scheme (`http`/`https`) and `www.`
 * variant of `airbnb.com/h/haveninlipa`, with or without a trailing slash,
 * so it still corrects the link even if the theme's markup drifts to one of
 * those equivalent forms. Only the `href` attribute value changes — the
 * anchor's `target`, `rel`, `aria-label`, and icon markup are left as-is.
 *
 * @since 1.1.10
 * @param string $html Full response body.
 * @return string
 */
function hil_seo_rewrite_airbnb_href( string $html ): string {
	$rewritten = preg_replace(
		'/href="https?:\/\/(?:www\.)?airbnb\.com\/h\/haveninlipa\/?"/i',
		'href="https://haveninlipa.com/properties"',
		$html
	);

	return null !== $rewritten ? $rewritten : $html;
}

/**
 * Rewrites the theme's hardcoded social anchors in a block of HTML:
 * corrects the Instagram, TikTok, and Facebook hrefs, then inserts a cloned
 * YouTube anchor immediately after each (corrected) TikTok anchor. The
 * YouTube insertion is idempotent per occurrence — a TikTok anchor already
 * immediately followed by a YouTube link of this channel is left alone, so
 * running this twice over the same markup (e.g. a nested buffer) can't
 * double the icon.
 *
 * Plain string/regex replacement, not a DOM parser — scoped tightly to the
 * known anchors so it can't touch unrelated markup, and immune to attribute
 * order or whitespace differences between the CTA and footer instances.
 *
 * @since 1.1.9 Instagram/TikTok/Facebook href corrections and the YouTube anchor insertion.
 * @since 1.1.10 Airbnb href rewritten to the direct-booking `/properties` page.
 * @param string $html Full response body.
 * @return string
 */
function hil_seo_rewrite_social_links( string $html ): string {
	if ( '' === $html ) {
		return $html;
	}

	$html = str_replace(
		array(
			'href="https://instagram.com/haveninlipa"',
			'href="https://tiktok.com/@haveninlipa"',
			'href="https://facebook.com/haveninlipa"',
		),
		array(
			'href="https://www.instagram.com/haven_inlipa/"',
			'href="https://www.tiktok.com/@haven.in.lipa"',
			'href="https://www.facebook.com/haveninlipa"',
		),
		$html
	);

	$html = hil_seo_rewrite_airbnb_href( $html );

	// The tempered `(?:[^<]|<(?!\/a>))*` token (not `.*?`) stops the TikTok
	// anchor's own body from ever matching past its *own* closing `</a>` —
	// with a plain `.*?`, a failed lookahead below made the engine backtrack
	// into swallowing an already-inserted YouTube anchor as part of the same
	// group, defeating idempotency (a YouTube anchor would get cloned a
	// second and third time on a repeat pass over the same markup).
	$with_youtube = preg_replace_callback(
		'/(<a\b[^>]*href="https:\/\/www\.tiktok\.com\/@haven\.in\.lipa"[^>]*>(?:[^<]|<(?!\/a>))*<\/a>)(?!\s*<a\b[^>]*href="https:\/\/www\.youtube\.com\/@Haven-in-Lipa")/is',
		static function ( array $matches ): string {
			return $matches[1] . hil_seo_youtube_anchor_from_tiktok( $matches[1] );
		},
		$html
	);

	return null !== $with_youtube ? $with_youtube : $html;
}

/**
 * Output buffer callback registered by `hil_seo_social_links_start_buffer()`.
 *
 * @since 1.1.9
 * @param string $html Buffered response body.
 * @return string
 */
function hil_seo_social_links_ob_callback( string $html ): string {
	if ( ! hil_seo_social_links_is_html_response() ) {
		return $html;
	}

	return hil_seo_rewrite_social_links( $html );
}

/**
 * Starts the output buffer for eligible front-end requests.
 *
 * @since 1.1.9
 * @return void
 */
function hil_seo_social_links_start_buffer(): void {
	if ( ! hil_seo_social_links_should_run() ) {
		return;
	}

	ob_start( 'hil_seo_social_links_ob_callback' );
}
add_action( 'template_redirect', 'hil_seo_social_links_start_buffer', 0 );

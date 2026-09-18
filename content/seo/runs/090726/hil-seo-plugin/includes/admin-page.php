<?php
/**
 * Administrator-only "HIL SEO — Migration / Cutover" screen.
 *
 * This is the primary interface for Migration Plan Stage 8 onward — flipping
 * a cutover flag here calls the exact same hil_seo_set_cutover_flag()
 * function the REST route (cutover.php) uses, so the two interfaces can
 * never disagree and both write to the same audit log.
 *
 * Gated at manage_options in three independent places: the menu registration
 * itself (so Editors never see the menu item at all), the top of the render
 * function (defense in depth if the menu check is ever bypassed by a direct
 * URL visit), and the POST handler (so even a crafted request can't act
 * without the capability). The Analyst's Editor-role account has never been
 * able to reach this screen and this file does not change that — see
 * SEO-DEC-019's ceiling and SEO-DEC-025's finding that flipping a flag is
 * Administrator-only by design.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Registers the top-level admin menu. capability => 'manage_options' means
 * WordPress never renders this menu item for a role that lacks it — an
 * Editor's wp-admin sidebar shows nothing for this plugin beyond the post
 * metabox and list columns from editor-fields.php.
 *
 * @since 1.1.0
 * @return void
 */
function hil_seo_register_admin_menu(): void {
	add_menu_page(
		__( 'HIL SEO — Migration / Cutover', 'hil-seo' ),
		__( 'HIL SEO', 'hil-seo' ),
		'manage_options',
		'hil-seo-cutover',
		'hil_seo_render_cutover_page',
		'dashicons-shield',
		80
	);
}
add_action( 'admin_menu', 'hil_seo_register_admin_menu' );

/**
 * Human labels and one-line descriptions for each module.
 *
 * @since 1.1.0
 * @return array<string, array{label: string, description: string}>
 */
function hil_seo_module_info(): array {
	return array(
		'meta'      => array(
			'label'       => __( 'Meta descriptions (+ Open Graph / Twitter)', 'hil-seo' ),
			'description' => __( 'Pure content — no indexing consequence if briefly wrong. Lowest risk.', 'hil-seo' ),
		),
		'title'     => array(
			'label'       => __( 'SEO titles (+ global title-suffix fix)', 'hil-seo' ),
			'description' => __( 'Overrides the document <title> tag and fixes the inconsistent archive-suffix bug found in the Current-State Audit.', 'hil-seo' ),
		),
		'canonical' => array(
			'label'       => __( 'Canonical URL overrides', 'hil-seo' ),
			'description' => __( 'No post currently has a canonical override set — enabling this is a no-op today. Safe to enable alongside titles.', 'hil-seo' ),
		),
		'robots'    => array(
			'label'       => __( 'Robots directives (index/noindex, follow/nofollow)', 'hil-seo' ),
			'description' => __( 'HIGHEST RISK. Controls whether thin archives (tag/category/author/search) stay out of search results. A mistake here is the one that could silently drop a page from Google.', 'hil-seo' ),
		),
		'schema'    => array(
			'label'       => __( 'Structured data (JSON-LD schema)', 'hil-seo' ),
			'description' => __( 'Organization, WebSite, Person, BlogPosting, BreadcrumbList. Validate with Google Rich Results Test after enabling.', 'hil-seo' ),
		),
		'sitemap'   => array(
			'label'       => __( 'Sitemap transition (WordPress core /wp-sitemap.xml)', 'hil-seo' ),
			'description' => __( 'Makes this plugin\'s noindex-exclusion filters active on core\'s sitemap, AND corrects Yoast\'s virtual robots.txt "Sitemap:" line to point at /wp-sitemap.xml instead of /sitemap_index.xml (Yoast stays active and keeps writing everything else in robots.txt — this only rewrites that one line, in place, so there\'s never a duplicate). Enable last — depends on the robots module already being correct.', 'hil-seo' ),
		),
	);
}

/**
 * Per-module verification guidance shown before an Administrator enables it —
 * the exact checks HIL_SEO_Implementation_Plan.md §3 already specifies.
 *
 * @since 1.1.0
 * @return array<string, string>
 */
function hil_seo_module_verification_guidance(): array {
	return array(
		'meta'      => __( 'Spot-check 3–5 live pages\' meta description (use a cache-busting query string, e.g. ?nocache=1 — LiteSpeed can serve a stale page otherwise) against the approved values in HIL_SEO_Metadata_Backfill.xlsx. Confirm og:description and twitter:description match.', 'hil-seo' ),
		'title'     => __( 'Confirm no page shows a doubled suffix (e.g. "... - Haven in Lipa Blog - Haven in Lipa Blog"). Check the homepage, one article, and one archive/tag page specifically — the archive-suffix bug this module fixes only showed on non-article templates.', 'hil-seo' ),
		'canonical' => __( 'Confirm no page renders two <link rel="canonical"> tags. Since no override is currently set on any post, this should be unobservable — if you see a change, stop and investigate before proceeding.', 'hil-seo' ),
		'robots'    => __( 'Immediately re-check these previously-confirmed noindex archives, uncached: /tag/airbnb/, /tag/barako-coffee/, /category/uncategorized/, /category/travel-and-itineraries/, /category/booking-tips/, /category/weekend-getaways/, /category/outdoor-adventures/, /category/getting-here/, and /author/cassandrakim/. Every one must still show "noindex, follow". Also confirm all 34 published/scheduled posts still show "index, follow" (i.e. no robots meta tag at all, matching Yoast\'s own convention).', 'hil-seo' ),
		'schema'    => __( 'Run 2–3 sample URLs through Google\'s Rich Results Test. Confirm exactly one JSON-LD @graph per page (not two — Yoast\'s own schema module must be disabled in Yoast → General → Features before or immediately after this step) and 0 critical errors.', 'hil-seo' ),
		'sitemap'   => __( 'Confirm /wp-sitemap.xml lists all 34 posts and excludes every noindexed archive. Then check robots.txt (cache-busted — this site has a confirmed caching bug) and confirm its "Sitemap:" line now reads /wp-sitemap.xml, exactly once, with no duplicate line. Do this only after the robots module has been verified — the sitemap\'s exclusion logic depends on the same signal.', 'hil-seo' ),
	);
}

/**
 * Verifies the nonce + capability for a POST to this screen. Dies (does not
 * silently continue) on failure — this screen never partially trusts a
 * request.
 *
 * @since 1.1.0
 * @param string $action Nonce action name.
 * @return void
 */
function hil_seo_verify_admin_post( string $action ): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to do this.', 'hil-seo' ), 403 );
	}

	$nonce = isset( $_POST['hil_seo_nonce'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['hil_seo_nonce'] ) ) : '';

	if ( '' === $nonce || ! wp_verify_nonce( $nonce, $action ) ) {
		wp_die( esc_html__( 'Security check failed — please go back and try again.', 'hil-seo' ), 403 );
	}
}

/**
 * Handles the screen's POST actions (module toggle, rollback). Runs on
 * admin_init rather than inline in the render function, so a redirect can
 * happen before any HTML is sent — the standard WordPress admin-page
 * POST/redirect/GET pattern, which also prevents a page refresh from
 * resubmitting the same flag flip twice.
 *
 * @since 1.1.0
 * @return void
 */
function hil_seo_handle_cutover_post(): void {
	if ( ! isset( $_GET['page'] ) || 'hil-seo-cutover' !== $_GET['page'] ) {
		return;
	}

	if ( ! isset( $_POST['hil_seo_action'] ) ) {
		return;
	}

	$action = sanitize_text_field( wp_unslash( (string) $_POST['hil_seo_action'] ) );

	if ( 'toggle_module' === $action ) {
		hil_seo_verify_admin_post( 'hil_seo_toggle_module' );

		$module = isset( $_POST['module'] ) ? sanitize_text_field( wp_unslash( (string) $_POST['module'] ) ) : '';
		$known  = array_keys( hil_seo_module_info() );

		if ( ! in_array( $module, $known, true ) ) {
			wp_die( esc_html__( 'Unknown module.', 'hil-seo' ), 400 );
		}

		if ( empty( $_POST['confirm_verification'] ) ) {
			wp_safe_redirect( add_query_arg( array( 'page' => 'hil-seo-cutover', 'hil_seo_error' => 'unconfirmed' ), admin_url( 'admin.php' ) ) );
			exit;
		}

		$new_value = ! empty( $_POST['new_value'] );
		hil_seo_set_cutover_flag( $module, $new_value );

		wp_safe_redirect(
			add_query_arg(
				array( 'page' => 'hil-seo-cutover', 'hil_seo_done' => $module ),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	if ( 'rollback' === $action ) {
		hil_seo_verify_admin_post( 'hil_seo_rollback' );

		if ( empty( $_POST['confirm_rollback'] ) ) {
			wp_safe_redirect( add_query_arg( array( 'page' => 'hil-seo-cutover', 'hil_seo_error' => 'unconfirmed' ), admin_url( 'admin.php' ) ) );
			exit;
		}

		foreach ( array_keys( hil_seo_module_info() ) as $module ) {
			hil_seo_set_cutover_flag( $module, false );
		}

		wp_safe_redirect( add_query_arg( array( 'page' => 'hil-seo-cutover', 'hil_seo_done' => 'rollback' ), admin_url( 'admin.php' ) ) );
		exit;
	}
}
add_action( 'admin_init', 'hil_seo_handle_cutover_post' );

/**
 * Renders the screen.
 *
 * @since 1.1.0
 * @return void
 */
function hil_seo_render_cutover_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to access this page.', 'hil-seo' ), 403 );
	}

	$flags     = hil_seo_get_cutover_flags();
	$log       = hil_seo_get_cutover_log();
	$info      = hil_seo_module_info();
	$guidance  = hil_seo_module_verification_guidance();
	$order     = hil_seo_cutover_order();

	$done  = isset( $_GET['hil_seo_done'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['hil_seo_done'] ) ) : '';
	$error = isset( $_GET['hil_seo_error'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['hil_seo_error'] ) ) : '';
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'HIL SEO — Migration / Cutover', 'hil-seo' ); ?></h1>
		<p>
			<?php esc_html_e( 'Administrator-only. Each module below controls one piece of live, public search output. Yoast SEO remains active and continues rendering every module still shown OFF here — nothing here changes what visitors or Google see until you turn a module ON.', 'hil-seo' ); ?>
		</p>

		<?php if ( 'unconfirmed' === $error ) : ?>
			<div class="notice notice-error"><p><?php esc_html_e( 'Action cancelled — the required confirmation checkbox was not checked.', 'hil-seo' ); ?></p></div>
		<?php endif; ?>

		<?php if ( 'rollback' === $done ) : ?>
			<div class="notice notice-success"><p><?php esc_html_e( 'Rollback complete — every module is now OFF. Yoast\'s output (wherever it hasn\'t been separately disabled) is what production renders again.', 'hil-seo' ); ?></p></div>
		<?php elseif ( '' !== $done && isset( $info[ $done ] ) ) : ?>
			<div class="notice notice-success"><p>
				<?php
				printf(
					/* translators: %s: module label. */
					esc_html__( '"%s" is now %s.', 'hil-seo' ),
					esc_html( $info[ $done ]['label'] ),
					$flags[ $done ] ? esc_html__( 'ON — live on production', 'hil-seo' ) : esc_html__( 'OFF', 'hil-seo' )
				);
				?>
			</p></div>
		<?php endif; ?>

		<table class="widefat striped" style="margin-top:1em;">
			<thead>
				<tr>
					<th style="width:20%;"><?php esc_html_e( 'Module', 'hil-seo' ); ?></th>
					<th style="width:10%;"><?php esc_html_e( 'State', 'hil-seo' ); ?></th>
					<th style="width:18%;"><?php esc_html_e( 'Prerequisites', 'hil-seo' ); ?></th>
					<th style="width:16%;"><?php esc_html_e( 'Last changed', 'hil-seo' ); ?></th>
					<th style="width:24%;"><?php esc_html_e( 'Verification required', 'hil-seo' ); ?></th>
					<th style="width:12%;"><?php esc_html_e( 'Action', 'hil-seo' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $order as $module ) :
					$meta       = $info[ $module ];
					$is_on      = ! empty( $flags[ $module ] );
					$unmet      = hil_seo_unmet_prerequisites( $module );
					$log_entry  = $log[ $module ] ?? null;
					?>
					<tr>
						<td>
							<strong><?php echo esc_html( $meta['label'] ); ?></strong>
							<p class="description"><?php echo esc_html( $meta['description'] ); ?></p>
						</td>
						<td>
							<?php if ( $is_on ) : ?>
								<span style="color:#00a32a;font-weight:600;">● <?php esc_html_e( 'ON', 'hil-seo' ); ?></span>
							<?php else : ?>
								<span style="color:#787c82;font-weight:600;">○ <?php esc_html_e( 'OFF', 'hil-seo' ); ?></span>
							<?php endif; ?>
						</td>
						<td>
							<?php if ( empty( $unmet ) ) : ?>
								<span style="color:#00a32a;"><?php esc_html_e( 'Met', 'hil-seo' ); ?></span>
							<?php else : ?>
								<span style="color:#d63638;">
									<?php
									printf(
										/* translators: %s: comma-separated list of module labels. */
										esc_html__( 'Not enabled yet: %s', 'hil-seo' ),
										esc_html( implode( ', ', array_map( static fn( $m ) => $info[ $m ]['label'], $unmet ) ) )
									);
									?>
								</span>
							<?php endif; ?>
						</td>
						<td>
							<?php if ( $log_entry ) : ?>
								<?php echo esc_html( $log_entry['changed_at'] ); ?><br>
								<span class="description">
									<?php
									printf(
										/* translators: %s: WordPress user login. */
										esc_html__( 'by %s', 'hil-seo' ),
										esc_html( $log_entry['changed_by'] )
									);
									?>
								</span>
							<?php else : ?>
								<span class="description"><?php esc_html_e( 'Never changed', 'hil-seo' ); ?></span>
							<?php endif; ?>
						</td>
						<td><span class="description"><?php echo esc_html( $guidance[ $module ] ); ?></span></td>
						<td>
							<form method="post" onsubmit="return hilSeoConfirmToggle(this, '<?php echo esc_js( $meta['label'] ); ?>', <?php echo $is_on ? 'true' : 'false'; ?>);">
								<?php wp_nonce_field( 'hil_seo_toggle_module', 'hil_seo_nonce' ); ?>
								<input type="hidden" name="hil_seo_action" value="toggle_module">
								<input type="hidden" name="module" value="<?php echo esc_attr( $module ); ?>">
								<input type="hidden" name="new_value" value="<?php echo $is_on ? '0' : '1'; ?>">
								<label style="display:block;margin-bottom:.5em;font-weight:normal;font-size:12px;">
									<input type="checkbox" name="confirm_verification" value="1" required>
									<?php esc_html_e( 'I have completed the verification above.', 'hil-seo' ); ?>
								</label>
								<?php if ( $is_on ) : ?>
									<button type="submit" class="button"><?php esc_html_e( 'Turn OFF', 'hil-seo' ); ?></button>
								<?php else : ?>
									<button type="submit" class="button button-primary"><?php esc_html_e( 'Turn ON (live)', 'hil-seo' ); ?></button>
								<?php endif; ?>
							</form>
						</td>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>

		<h2 style="margin-top:2em;color:#d63638;"><?php esc_html_e( 'Emergency Rollback', 'hil-seo' ); ?></h2>
		<div style="background:#fcf0f1;border-left:4px solid #d63638;padding:1em 1.4em;max-width:800px;">
			<p><?php esc_html_e( 'Turns every module above OFF in one action. Yoast\'s own output (for any module you haven\'t separately disabled in Yoast\'s settings) resumes immediately. Nothing is deleted — no post meta, no plugin data, no Yoast configuration is touched. This is the fast half of the documented rollback procedure; see HIL_Yoast_Migration_and_Rollback_Plan.md §2 for the full checklist (re-enabling any Yoast module you\'d disabled, purging cache afterward).', 'hil-seo' ); ?></p>
			<form method="post" onsubmit="return confirm('<?php echo esc_js( __( 'This immediately turns OFF every HIL SEO output module. Yoast\'s output (where still enabled) takes back over. Continue?', 'hil-seo' ) ); ?>');">
				<?php wp_nonce_field( 'hil_seo_rollback', 'hil_seo_nonce' ); ?>
				<input type="hidden" name="hil_seo_action" value="rollback">
				<label style="display:block;margin-bottom:.5em;">
					<input type="checkbox" name="confirm_rollback" value="1" required>
					<?php esc_html_e( 'I understand this reverts all HIL SEO output to OFF immediately.', 'hil-seo' ); ?>
				</label>
				<button type="submit" class="button" style="background:#d63638;border-color:#d63638;color:#fff;">
					<?php esc_html_e( 'Roll back — turn everything OFF', 'hil-seo' ); ?>
				</button>
			</form>
		</div>

		<h2 style="margin-top:2em;"><?php esc_html_e( 'After all modules are ON: cache purge and Yoast deactivation', 'hil-seo' ); ?></h2>
		<div style="background:#f0f6fc;border-left:4px solid #2271b1;padding:1em 1.4em;max-width:800px;">
			<h3><?php esc_html_e( '1. Purge the LiteSpeed cache', 'hil-seo' ); ?></h3>
			<p><?php esc_html_e( 'Do this after every module above is verified, and again after the sitemap/robots.txt change below — this site has a confirmed, reproducible caching bug (a page can serve a stale <title> for weeks after an edit), so no verification step on this site should be trusted against a cached response.', 'hil-seo' ); ?></p>
			<ol>
				<li><?php esc_html_e( 'WP Admin sidebar → LiteSpeed Cache → Toolbox (or the "Purge All" button in the top admin bar, if present).', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Click Purge All.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Re-check a handful of live URLs with a cache-busting query string (e.g. ?nocache=1) to confirm the purge took effect before trusting any subsequent bare-URL check.', 'hil-seo' ); ?></li>
			</ol>

			<h3><?php esc_html_e( '2. Add the sitemap redirect; robots.txt corrects itself', 'hil-seo' ); ?></h3>
			<p><?php esc_html_e( 'robots.txt\'s "Sitemap:" line is corrected automatically the moment the Sitemap module above is turned ON — this plugin rewrites Yoast\'s existing virtual robots.txt output in place (no physical robots.txt file exists on this site; Yoast generates it on the fly, and this plugin\'s filter runs after Yoast\'s own). Turning the Sitemap module OFF, or using Emergency Rollback, restores Yoast\'s original line automatically on the next request — nothing to undo by hand either way. Cache-bust when checking (?nocache=1) since this site has a confirmed caching bug on robots.txt-adjacent responses.', 'hil-seo' ); ?></p>
			<p><?php esc_html_e( 'What still needs a manual step here: in the Redirection plugin, add a 301 from /sitemap_index.xml to /wp-sitemap.xml (for anyone/anything with the old URL bookmarked or cached elsewhere), and resubmit /wp-sitemap.xml in Google Search Console.', 'hil-seo' ); ?></p>

			<h3><?php esc_html_e( '3. Deactivate Yoast SEO', 'hil-seo' ); ?></h3>
			<p><?php esc_html_e( 'Only after every module above is ON and verified, and step 1–2 are done:', 'hil-seo' ); ?></p>
			<ol>
				<li><?php esc_html_e( 'WP Admin → Plugins → find "Yoast SEO" → click Deactivate. Do NOT click Delete — deactivating preserves Yoast\'s own settings and data, which is what makes rollback fast if something is found wrong later.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Purge cache again immediately after deactivating.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Re-run the full verification pass one more time against production (cache-busted): all 34 posts\' titles/descriptions/robots, the noindex archives, and the Rich Results Test.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Monitor Search Console Coverage for at least one crawl cycle for any unexpected drop.', 'hil-seo' ); ?></li>
			</ol>
			<p><strong><?php esc_html_e( 'Rollback if anything looks wrong after deactivating Yoast:', 'hil-seo' ); ?></strong> <?php esc_html_e( 'WP Admin → Plugins → Yoast SEO → Activate (restores its exact prior configuration — deactivating a plugin never deletes its settings). Then use the Emergency Rollback button above. Then purge cache again.', 'hil-seo' ); ?></p>
		</div>
	</div>
	<script>
	function hilSeoConfirmToggle(form, moduleLabel, isCurrentlyOn) {
		var action = isCurrentlyOn ? 'Turn OFF' : 'Turn ON (live on production)';
		return confirm(action + ' — ' + moduleLabel + '?\n\nThis changes what every visitor and Google sees immediately.');
	}
	</script>
	<?php
}

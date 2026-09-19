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
			'description' => __( 'Makes this plugin\'s noindex-exclusion filters active on core\'s sitemap (noindexed posts are left out; category/tag/author archives are left out because they are noindex), and guarantees the virtual robots.txt carries exactly one "Sitemap: /wp-sitemap.xml" line once core is actually serving that sitemap. IMPORTANT: while Yoast\'s own XML-sitemap feature is on, core\'s sitemap is switched off and Yoast redirects /wp-sitemap.xml to /sitemap_index.xml — this flag alone does not make /wp-sitemap.xml work. See "Sitemap transition" below for the required order.', 'hil-seo' ),
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
		'schema'    => __( 'Run 2–3 sample URLs through Google\'s Rich Results Test. Expect exactly one JSON-LD @graph per page and 0 critical errors. NOTE: while Yoast is active it also prints its own @graph (and its own description / Open Graph / Twitter tags), so two of each is expected until Yoast is deactivated — Yoast has no setting that turns off just its description or schema output. Judge the schema on the final pass after Yoast is deactivated.', 'hil-seo' ),
		'sitemap'   => __( 'Do NOT rely on this toggle alone. First follow the "Sitemap transition" steps below (Yoast\'s XML-sitemap feature must be off before /wp-sitemap.xml can respond). Then confirm /wp-sitemap.xml returns HTTP 200 and lists every published post (and no noindexed archive or author URL), and that the robots.txt "Sitemap:" line reads /wp-sitemap.xml exactly once. Check both cache-busted — this site has a confirmed caching bug.', 'hil-seo' ),
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

	if ( 'save_default_image' === $action ) {
		hil_seo_verify_admin_post( 'hil_seo_save_default_image' );

		$attachment_id = isset( $_POST['default_image_id'] ) ? absint( wp_unslash( (string) $_POST['default_image_id'] ) ) : 0;
		$result        = 'cleared';

		if ( 0 === $attachment_id ) {
			delete_option( 'hil_seo_default_social_image' );
		} elseif ( wp_attachment_is_image( $attachment_id ) ) {
			update_option( 'hil_seo_default_social_image', $attachment_id, true );
			$result = 'saved';
		} else {
			$result = 'bad';
		}

		wp_safe_redirect( add_query_arg( array( 'page' => 'hil-seo-cutover', 'hil_seo_image' => $result ), admin_url( 'admin.php' ) ) );
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

		<?php $image_result = isset( $_GET['hil_seo_image'] ) ? sanitize_text_field( wp_unslash( (string) $_GET['hil_seo_image'] ) ) : ''; ?>
		<?php if ( 'saved' === $image_result ) : ?>
			<div class="notice notice-success"><p><?php esc_html_e( 'Default social image / logo saved.', 'hil-seo' ); ?></p></div>
		<?php elseif ( 'cleared' === $image_result ) : ?>
			<div class="notice notice-success"><p><?php esc_html_e( 'Default social image / logo cleared.', 'hil-seo' ); ?></p></div>
		<?php elseif ( 'bad' === $image_result ) : ?>
			<div class="notice notice-error"><p><?php esc_html_e( 'That ID is not an image in the Media Library — nothing was changed.', 'hil-seo' ); ?></p></div>
		<?php endif; ?>

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

		<?php $status = hil_seo_status_snapshot(); ?>
		<div style="background:#fff;border:1px solid #c3c4c7;padding:.4em 1.2em .8em;max-width:800px;margin-top:1em;">
			<h2 style="margin-top:.6em;"><?php esc_html_e( 'Status (read-only)', 'hil-seo' ); ?></h2>
			<ul style="margin:0 0 0 1.2em;list-style:disc;">
				<li>
					<?php esc_html_e( 'HIL SEO plugin version:', 'hil-seo' ); ?>
					<strong><?php echo esc_html( $status['version'] ); ?></strong>
				</li>
				<li>
					<?php esc_html_e( 'Yoast SEO:', 'hil-seo' ); ?>
					<strong>
						<?php
						echo $status['yoast_active']
							? esc_html( sprintf( /* translators: %s: Yoast version. */ __( 'active (v%s)', 'hil-seo' ), (string) $status['yoast_version'] ) )
							: esc_html__( 'not active', 'hil-seo' );
						?>
					</strong>
					<?php if ( $status['yoast_active'] ) : ?>
						— <?php esc_html_e( 'its XML sitemaps feature is', 'hil-seo' ); ?>
						<strong><?php echo $status['yoast_xml_sitemap'] ? esc_html__( 'ON', 'hil-seo' ) : esc_html__( 'OFF', 'hil-seo' ); ?></strong>
					<?php endif; ?>
				</li>
				<li>
					<?php esc_html_e( 'WordPress core /wp-sitemap.xml is being served:', 'hil-seo' ); ?>
					<strong style="color:<?php echo $status['core_sitemaps_enabled'] ? '#00a32a' : '#d63638'; ?>;">
						<?php echo $status['core_sitemaps_enabled'] ? esc_html__( 'YES', 'hil-seo' ) : esc_html__( 'NO', 'hil-seo' ); ?>
					</strong>
					<?php if ( ! $status['core_sitemaps_enabled'] && $status['yoast_xml_sitemap'] ) : ?>
						<span class="description">— <?php esc_html_e( 'expected while Yoast\'s XML sitemaps feature is ON; Yoast\'s /sitemap_index.xml is the live sitemap until that feature is turned off (see "Sitemap transition" below).', 'hil-seo' ); ?></span>
					<?php endif; ?>
				</li>
				<li>
					<?php esc_html_e( 'Default social image / logo (Media Library ID):', 'hil-seo' ); ?>
					<strong><?php echo $status['default_social_image_id'] ? esc_html( (string) $status['default_social_image_id'] ) : esc_html__( 'not set', 'hil-seo' ); ?></strong>
					<span class="description">— <?php esc_html_e( 'used for the blog homepage\'s og:image / Twitter image and the Organization logo in schema. Yoast supplied this before the cutover; set it here so it survives Yoast\'s removal.', 'hil-seo' ); ?></span>
					<form method="post" style="margin-top:.5em;">
						<?php wp_nonce_field( 'hil_seo_save_default_image', 'hil_seo_nonce' ); ?>
						<input type="hidden" name="hil_seo_action" value="save_default_image">
						<input type="number" min="0" name="default_image_id" value="<?php echo esc_attr( (string) $status['default_social_image_id'] ); ?>" style="width:110px;">
						<button type="submit" class="button"><?php esc_html_e( 'Save', 'hil-seo' ); ?></button>
						<span class="description"><?php esc_html_e( 'Enter 0 to clear.', 'hil-seo' ); ?></span>
					</form>
				</li>
			</ul>
		</div>

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
			<p><?php esc_html_e( 'Turns every module above OFF in one action. Yoast\'s own output (for any module you haven\'t separately disabled in Yoast\'s settings) resumes immediately. Nothing is deleted — no post meta, no plugin data, no Yoast configuration is touched. This is the fast half of the documented rollback procedure; see HIL_Yoast_Migration_and_Rollback_Plan.md §2 for the full checklist. If the sitemap transition below has already been done, the rest of the rollback is: reactivate Yoast if it was deactivated, turn Yoast\'s XML sitemaps feature back ON, DISABLE the Redirection rule for /sitemap_index.xml (otherwise the two redirects loop), then purge the cache.', 'hil-seo' ); ?></p>
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

		<h2 style="margin-top:2em;"><?php esc_html_e( 'Sitemap transition, cache purge and Yoast deactivation (SEO-DEC-026 order)', 'hil-seo' ); ?></h2>
		<div style="background:#f0f6fc;border-left:4px solid #2271b1;padding:1em 1.4em;max-width:800px;">
			<p><strong><?php esc_html_e( 'Why the order matters:', 'hil-seo' ); ?></strong> <?php esc_html_e( 'while Yoast\'s XML sitemaps feature is ON, Yoast redirects /wp-sitemap.xml to /sitemap_index.xml and core\'s sitemap is switched off. A Redirection rule sending /sitemap_index.xml to /wp-sitemap.xml at that moment creates an endless loop and leaves the site with NO working sitemap (this happened on 2026-09-19). Follow the steps in this order, and check the result of each one before starting the next. At every step at least one sitemap URL must return HTTP 200.', 'hil-seo' ); ?></p>

			<h3><?php esc_html_e( '1. Make sure the old-sitemap redirect is OFF', 'hil-seo' ); ?></h3>
			<ol>
				<li><?php esc_html_e( 'WP Admin → Tools → Redirection → Redirects tab. If a rule for /sitemap_index.xml is enabled, hover its row and click Disable (do not delete it).', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Check: /sitemap_index.xml?nocache=1 returns Yoast\'s sitemap (HTTP 200).', 'hil-seo' ); ?></li>
			</ol>

			<h3><?php esc_html_e( '2. Turn Yoast\'s XML sitemaps feature OFF (Yoast stays active)', 'hil-seo' ); ?></h3>
			<ol>
				<li><?php esc_html_e( 'WP Admin → Yoast SEO → Settings → Site features → XML sitemaps → switch OFF → Save changes. (If you cannot find it, use the Settings search box and search "XML sitemaps".)', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Immediately open /wp-sitemap.xml?nocache=1. It must return HTTP 200 and show a sitemap index. The Status panel above should now say core /wp-sitemap.xml is being served: YES.', 'hil-seo' ); ?></li>
				<li><strong><?php esc_html_e( 'If it does not return 200: switch XML sitemaps back ON immediately and stop — /sitemap_index.xml is then the working sitemap again.', 'hil-seo' ); ?></strong></li>
			</ol>

			<h3><?php esc_html_e( '3. Turn the old-sitemap redirect back ON', 'hil-seo' ); ?></h3>
			<ol>
				<li><?php esc_html_e( 'Only after step 2 passed: Tools → Redirection → hover the /sitemap_index.xml rule → Enable. It must be a 301 to /wp-sitemap.xml.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Check: /sitemap_index.xml redirects once to /wp-sitemap.xml, which returns 200 (no further redirect).', 'hil-seo' ); ?></li>
			</ol>

			<h3><?php esc_html_e( '4. Purge the LiteSpeed cache', 'hil-seo' ); ?></h3>
			<p><?php esc_html_e( 'This site has a confirmed, reproducible caching problem (pages and robots.txt are cached for up to 7 days), so no check should be trusted against a cached response. Do this after step 3 and again after Yoast is deactivated.', 'hil-seo' ); ?></p>
			<ol>
				<li><?php esc_html_e( 'WP Admin sidebar → LiteSpeed Cache → Toolbox → Purge tab → Purge All.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Confirm robots.txt shows a single "Sitemap: …/wp-sitemap.xml" line and no /sitemap_index.xml line.', 'hil-seo' ); ?></li>
			</ol>

			<h3><?php esc_html_e( '5. Google Search Console', 'hil-seo' ); ?></h3>
			<p><?php esc_html_e( 'Submit /wp-sitemap.xml under Sitemaps for the blog property. Leave the old sitemap_index.xml entry until the new one shows Success, then remove it.', 'hil-seo' ); ?></p>

			<h3><?php esc_html_e( '6. Deactivate Yoast SEO (never Delete)', 'hil-seo' ); ?></h3>
			<p><?php esc_html_e( 'Only after steps 1–5 are done and verified:', 'hil-seo' ); ?></p>
			<ol>
				<li><?php esc_html_e( 'WP Admin → Plugins → Installed Plugins → Yoast SEO → Deactivate. Do NOT click Delete — deactivating preserves Yoast\'s settings and data, which is what keeps rollback fast.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Purge the LiteSpeed cache again immediately.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Re-run the full cache-busted verification: titles, descriptions, canonicals, robots, exactly one schema graph and one set of Open Graph/Twitter tags per page, the noindex archives, both sitemap URLs and robots.txt.', 'hil-seo' ); ?></li>
				<li><?php esc_html_e( 'Monitor Search Console Coverage for at least one crawl cycle.', 'hil-seo' ); ?></li>
			</ol>
			<p><strong><?php esc_html_e( 'Rollback if anything looks wrong:', 'hil-seo' ); ?></strong> <?php esc_html_e( '(a) Plugins → Yoast SEO → Activate. (b) Yoast SEO → Settings → Site features → XML sitemaps → ON. (c) Tools → Redirection → DISABLE the /sitemap_index.xml rule. (d) Use the Emergency Rollback button above. (e) Purge the LiteSpeed cache. (f) Confirm /sitemap_index.xml returns 200. Do (b) and (c) together — either one alone leaves a loop or a missing sitemap.', 'hil-seo' ); ?></p>
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

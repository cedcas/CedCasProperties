<?php
/**
 * Editorial workflow support — the metabox, computed validation warnings, and
 * admin-list columns from HIL_Custom_SEO_Plugin_Requirements.md §4.
 *
 * Deliberately NOT a readability score, a traffic light, or keyword-density
 * percentages — the brief calls that "Yoast's scoring theater" by name and
 * asks for it not to be rebuilt. Every check below exists because it catches
 * a real, specific failure mode already seen in this project (a leftover
 * placeholder, a noindex left on by accident, a missing description) — not
 * because Yoast happens to have a similar-sounding feature.
 *
 * @package HILSEO
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Scans post content for unresolved placeholders using the convention from
 * HIL_SEO_Draft_Posting_Workflow.md §3: [OWNER IMAGE: ...] and
 * [OWNER VERIFY: ...]. This is the single highest-value check in this file —
 * direct mechanical enforcement of the brief's core requirement that Cedric
 * never has to eyeball a draft looking for leftover placeholders.
 *
 * @since 1.0.0
 * @param string $content Raw post content.
 * @return array<int, string> Each match, verbatim, for display in the warning.
 */
function hil_seo_find_placeholders( string $content ): array {
	if ( '' === $content || false === strpos( $content, '[OWNER' ) ) {
		return array();
	}

	preg_match_all( '/\[OWNER (?:IMAGE|VERIFY):[^\]]*\]/', $content, $matches );

	return $matches[0] ?? array();
}

/**
 * Computes the full set of validation warnings for a post. Always computed
 * fresh, never stored — see Requirements doc §4 for why: a cached warning can
 * go stale the moment the thing it warns about changes, and a false-green
 * cached status is worse than recomputing on every page load.
 *
 * @since 1.0.0
 * @param WP_Post $post Post.
 * @return array<int, string> Human-readable warning strings.
 */
function hil_seo_get_validation_warnings( WP_Post $post ): array {
	$warnings = array();

	$description = hil_seo_get_meta_description( $post );

	if ( '' === $description ) {
		$warnings[] = __( 'Missing meta description.', 'hil-seo' );
	} elseif ( mb_strlen( $description ) > 160 ) {
		$warnings[] = sprintf(
			/* translators: %d: character count. */
			__( 'Meta description is %d characters — longer than the ~155–160 guideline.', 'hil-seo' ),
			mb_strlen( $description )
		);
	}

	$focus_keyword = trim( (string) get_post_meta( $post->ID, 'hil_focus_keyword', true ) );

	if ( '' === $focus_keyword ) {
		$warnings[] = __( 'Missing focus keyword.', 'hil-seo' );
	}

	$title = hil_seo_resolve_title( $post );

	if ( mb_strlen( $title ) > 65 ) {
		$warnings[] = sprintf(
			/* translators: %d: character count. */
			__( 'SEO title is %d characters — longer than the ~60–65 guideline (may truncate in search results).', 'hil-seo' ),
			mb_strlen( $title )
		);
	}

	$canonical = trim( (string) get_post_meta( $post->ID, 'hil_canonical_url', true ) );

	if ( '' !== $canonical ) {
		$host       = wp_parse_url( $canonical, PHP_URL_HOST );
		$site_host  = wp_parse_url( home_url(), PHP_URL_HOST );

		if ( $host && $site_host && $host !== $site_host ) {
			$warnings[] = sprintf(
				/* translators: %s: the off-domain host. */
				__( 'Canonical URL points off-domain (%s) — confirm this is deliberate.', 'hil-seo' ),
				$host
			);
		}
	}

	// The real footgun this project has specifically flagged: noindex left on
	// a published post silently drops it from search with no visible symptom
	// on the page itself.
	$robots_index = (string) get_post_meta( $post->ID, 'hil_robots_index', true );

	if ( 'noindex' === $robots_index && 'publish' === $post->post_status ) {
		$warnings[] = __( 'Robots set to noindex on a PUBLISHED post — this post will not appear in search results. Confirm this is intentional.', 'hil-seo' );
	}

	$placeholders = hil_seo_find_placeholders( (string) $post->post_content );

	if ( $placeholders ) {
		$warnings[] = sprintf(
			/* translators: %d: number of unresolved placeholders. */
			_n(
				'%d unresolved placeholder remains in the body (search for "[OWNER").',
				'%d unresolved placeholders remain in the body (search for "[OWNER").',
				count( $placeholders ),
				'hil-seo'
			),
			count( $placeholders )
		);
	}

	if ( ! has_post_thumbnail( $post ) ) {
		$warnings[] = __( 'No featured image set.', 'hil-seo' );
	}

	return $warnings;
}

/**
 * Registers the metabox.
 *
 * @since 1.0.0
 * @return void
 */
function hil_seo_add_metabox(): void {
	foreach ( array( 'post', 'page' ) as $post_type ) {
		add_meta_box(
			'hil-seo-fields',
			__( 'SEO (HIL)', 'hil-seo' ),
			'hil_seo_render_metabox',
			$post_type,
			'normal',
			'high'
		);
	}
}
add_action( 'add_meta_boxes', 'hil_seo_add_metabox' );

/**
 * Renders the metabox.
 *
 * @since 1.0.0
 * @param WP_Post $post Current post.
 * @return void
 */
function hil_seo_render_metabox( $post ): void {
	wp_nonce_field( 'hil_seo_save_fields', 'hil_seo_fields_nonce' );

	$get = static fn( $key ) => (string) get_post_meta( $post->ID, $key, true );

	$warnings = hil_seo_get_validation_warnings( $post );

	if ( $warnings ) {
		echo '<div style="background:#fcf0f1;border-left:4px solid #d63638;padding:10px 12px;margin-bottom:14px;">';
		echo '<strong>' . esc_html__( 'Warnings', 'hil-seo' ) . '</strong><ul style="margin:6px 0 0 18px;list-style:disc;">';
		foreach ( $warnings as $warning ) {
			echo '<li>' . esc_html( $warning ) . '</li>';
		}
		echo '</ul></div>';
	}

	?>
	<table class="form-table" style="margin-top:0;">
		<tr>
			<th><label for="hil_focus_keyword"><?php esc_html_e( 'Focus keyword', 'hil-seo' ); ?></label></th>
			<td>
				<input type="text" class="widefat" id="hil_focus_keyword" name="hil_focus_keyword" value="<?php echo esc_attr( $get( 'hil_focus_keyword' ) ); ?>">
				<p class="description"><?php esc_html_e( 'Editorial/tracking only — does not itself influence Google rankings. Drives the Keyword Master sync.', 'hil-seo' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="hil_secondary_keywords"><?php esc_html_e( 'Secondary keywords', 'hil-seo' ); ?></label></th>
			<td><input type="text" class="widefat" id="hil_secondary_keywords" name="hil_secondary_keywords" value="<?php echo esc_attr( $get( 'hil_secondary_keywords' ) ); ?>" placeholder="<?php esc_attr_e( 'comma, separated, terms', 'hil-seo' ); ?>"></td>
		</tr>
		<tr>
			<th><label for="hil_seo_title"><?php esc_html_e( 'SEO title', 'hil-seo' ); ?></label></th>
			<td>
				<input type="text" class="widefat" id="hil_seo_title" name="hil_seo_title" value="<?php echo esc_attr( $get( 'hil_seo_title' ) ); ?>" placeholder="<?php echo esc_attr( get_the_title( $post ) . ' - ' . hil_seo_get_title_suffix() ); ?>">
				<p class="description"><?php esc_html_e( 'Full title including the brand suffix. Leave empty to use the title + suffix shown as the placeholder above.', 'hil-seo' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="hil_meta_description"><?php esc_html_e( 'Meta description', 'hil-seo' ); ?></label></th>
			<td><textarea class="widefat" rows="3" id="hil_meta_description" name="hil_meta_description"><?php echo esc_textarea( $get( 'hil_meta_description' ) ); ?></textarea></td>
		</tr>
		<tr>
			<th><label for="hil_canonical_url"><?php esc_html_e( 'Canonical URL override', 'hil-seo' ); ?></label></th>
			<td><input type="url" class="widefat" id="hil_canonical_url" name="hil_canonical_url" value="<?php echo esc_attr( $get( 'hil_canonical_url' ) ); ?>" placeholder="<?php echo esc_attr( get_permalink( $post ) ); ?>"></td>
		</tr>
		<tr>
			<th><?php esc_html_e( 'Robots', 'hil-seo' ); ?></th>
			<td>
				<select name="hil_robots_index">
					<?php foreach ( array( 'default', 'index', 'noindex' ) as $opt ) : ?>
						<option value="<?php echo esc_attr( $opt ); ?>" <?php selected( $get( 'hil_robots_index' ), $opt ); ?>><?php echo esc_html( $opt ); ?></option>
					<?php endforeach; ?>
				</select>
				<select name="hil_robots_follow">
					<?php foreach ( array( 'default', 'follow', 'nofollow' ) as $opt ) : ?>
						<option value="<?php echo esc_attr( $opt ); ?>" <?php selected( $get( 'hil_robots_follow' ), $opt ); ?>><?php echo esc_html( $opt ); ?></option>
					<?php endforeach; ?>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="hil_schema_type"><?php esc_html_e( 'Schema type', 'hil-seo' ); ?></label></th>
			<td>
				<select id="hil_schema_type" name="hil_schema_type">
					<?php foreach ( array( 'blogposting', 'webpage', 'none' ) as $opt ) : ?>
						<option value="<?php echo esc_attr( $opt ); ?>" <?php selected( $get( 'hil_schema_type' ), $opt ); ?>><?php echo esc_html( $opt ); ?></option>
					<?php endforeach; ?>
				</select>
			</td>
		</tr>
		<tr>
			<th><label for="hil_social_image"><?php esc_html_e( 'Social image (OG/Twitter) override', 'hil-seo' ); ?></label></th>
			<td>
				<?php
				$social_image_id = (int) $get( 'hil_social_image' );
				?>
				<input type="hidden" id="hil_social_image" name="hil_social_image" value="<?php echo esc_attr( (string) $social_image_id ); ?>">
				<div id="hil_social_image_preview">
					<?php if ( $social_image_id ) : ?>
						<?php echo wp_get_attachment_image( $social_image_id, array( 200, 200 ) ); ?>
					<?php endif; ?>
				</div>
				<button type="button" class="button" id="hil_social_image_button"><?php esc_html_e( 'Choose image', 'hil-seo' ); ?></button>
				<button type="button" class="button" id="hil_social_image_clear" <?php echo $social_image_id ? '' : 'style="display:none;"'; ?>><?php esc_html_e( 'Remove', 'hil-seo' ); ?></button>
				<p class="description"><?php esc_html_e( 'Leave empty to fall back to the featured image, then the site logo.', 'hil-seo' ); ?></p>
			</td>
		</tr>
		<tr>
			<th><label for="hil_seo_status"><?php esc_html_e( 'SEO completion status', 'hil-seo' ); ?></label></th>
			<td>
				<select id="hil_seo_status" name="hil_seo_status">
					<?php foreach ( array( 'not_started', 'in_progress', 'complete' ) as $opt ) : ?>
						<option value="<?php echo esc_attr( $opt ); ?>" <?php selected( $get( 'hil_seo_status' ), $opt ); ?>><?php echo esc_html( str_replace( '_', ' ', $opt ) ); ?></option>
					<?php endforeach; ?>
				</select>
				<p class="description"><?php esc_html_e( 'Set by the Analyst — never auto-computed from field presence.', 'hil-seo' ); ?></p>
			</td>
		</tr>
	</table>
	<script>
	(function(){
		var frame;
		var button = document.getElementById('hil_social_image_button');
		var clearBtn = document.getElementById('hil_social_image_clear');
		if (!button || typeof wp === 'undefined' || !wp.media) { return; }
		button.addEventListener('click', function(e){
			e.preventDefault();
			if (frame) { frame.open(); return; }
			frame = wp.media({ title: 'Choose social image', multiple: false });
			frame.on('select', function(){
				var attachment = frame.state().get('selection').first().toJSON();
				var src = (attachment.sizes && attachment.sizes.medium) ? attachment.sizes.medium.url : attachment.url;
				document.getElementById('hil_social_image').value = attachment.id;
				document.getElementById('hil_social_image_preview').innerHTML =
					'<img src="' + src + '" style="max-width:200px;height:auto;">';
				clearBtn.style.display = '';
			});
			frame.open();
		});
		clearBtn.addEventListener('click', function(e){
			e.preventDefault();
			document.getElementById('hil_social_image').value = '0';
			document.getElementById('hil_social_image_preview').innerHTML = '';
			clearBtn.style.display = 'none';
		});
	})();
	</script>
	<?php
}

/**
 * Enqueues the media modal script only on post edit screens — avoids loading
 * wp.media everywhere for a field only the metabox above uses.
 *
 * @since 1.0.0
 * @param string $hook Current admin page.
 * @return void
 */
function hil_seo_enqueue_media( string $hook ): void {
	if ( 'post.php' !== $hook && 'post-new.php' !== $hook ) {
		return;
	}

	wp_enqueue_media();
}
add_action( 'admin_enqueue_scripts', 'hil_seo_enqueue_media' );

/**
 * Saves the metabox fields.
 *
 * @since 1.0.0
 * @param int $post_id Post ID.
 * @return void
 */
function hil_seo_save_metabox( int $post_id ): void {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( wp_is_post_revision( $post_id ) ) {
		return;
	}

	$nonce = isset( $_POST['hil_seo_fields_nonce'] )
		? sanitize_text_field( wp_unslash( (string) $_POST['hil_seo_fields_nonce'] ) )
		: '';

	// No nonce means this save didn't come from this metabox (a REST write
	// from the Analyst's own tooling, which already went through
	// register_post_meta's own sanitization) — bail rather than blank fields
	// from an absent $_POST, same guard tms-core's editor-fields.php uses.
	if ( '' === $nonce || ! wp_verify_nonce( $nonce, 'hil_seo_save_fields' ) ) {
		return;
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	$schema = hil_seo_get_meta_schema();

	foreach ( $schema as $key => $args ) {
		if ( ! isset( $_POST[ $key ] ) ) {
			continue;
		}

		$raw = wp_unslash( $_POST[ $key ] );

		if ( 'hil_meta_description' === $key ) {
			$value = sanitize_textarea_field( $raw );
		} elseif ( is_callable( $args['sanitize_callback'] ) ) {
			$value = call_user_func( $args['sanitize_callback'], $raw );
		} else {
			$value = sanitize_text_field( $raw );
		}

		update_post_meta( $post_id, $key, $value );
	}
}
add_action( 'save_post', 'hil_seo_save_metabox' );

/**
 * Adds SEO status / focus keyword / warning-count columns to the Posts list.
 *
 * Direct model of tms-core's tms_core_register_editor_field_columns() — a
 * field buried in a metabox is invisible at a glance across many posts.
 *
 * @since 1.0.0
 * @param array<string, string> $columns Existing columns.
 * @return array<string, string>
 */
function hil_seo_add_list_columns( array $columns ): array {
	$date = $columns['date'] ?? '';
	unset( $columns['date'] );

	$columns['hil_seo_status']  = __( 'SEO Status', 'hil-seo' );
	$columns['hil_seo_kw']      = __( 'Focus KW', 'hil-seo' );
	$columns['hil_seo_warnings'] = __( 'Warnings', 'hil-seo' );

	if ( $date ) {
		$columns['date'] = $date;
	}

	return $columns;
}
add_filter( 'manage_post_posts_columns', 'hil_seo_add_list_columns' );

/**
 * Renders the added list columns.
 *
 * @since 1.0.0
 * @param string $column  Column key.
 * @param int    $post_id Post ID.
 * @return void
 */
function hil_seo_render_list_column( string $column, int $post_id ): void {
	$post = get_post( $post_id );

	if ( ! $post ) {
		return;
	}

	if ( 'hil_seo_status' === $column ) {
		$status = (string) get_post_meta( $post_id, 'hil_seo_status', true );
		$labels = array(
			'complete'    => '<span style="color:#00a32a;">' . esc_html__( 'Complete', 'hil-seo' ) . '</span>',
			'in_progress' => '<span style="color:#996800;">' . esc_html__( 'In progress', 'hil-seo' ) . '</span>',
		);
		echo $labels[ $status ] ?? '<span style="color:#b32d2e;">' . esc_html__( 'Not started', 'hil-seo' ) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed strings above.
		return;
	}

	if ( 'hil_seo_kw' === $column ) {
		$kw = trim( (string) get_post_meta( $post_id, 'hil_focus_keyword', true ) );
		echo $kw ? esc_html( $kw ) : '<span style="color:#b32d2e;">' . esc_html__( 'Not set', 'hil-seo' ) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed string above.
		return;
	}

	if ( 'hil_seo_warnings' === $column ) {
		$count = count( hil_seo_get_validation_warnings( $post ) );

		if ( 0 === $count ) {
			echo '<span style="color:#00a32a;">' . esc_html__( 'None', 'hil-seo' ) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		} else {
			printf( '<span style="color:#d63638;font-weight:600;">%d</span>', (int) $count ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
	}
}
add_action( 'manage_post_posts_custom_column', 'hil_seo_render_list_column', 10, 2 );

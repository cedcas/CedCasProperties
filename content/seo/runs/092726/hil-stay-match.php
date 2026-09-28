<?php
/**
 * Plugin Name: HIL — Stay Match
 * Description: Contextual property recommendation for blog articles. Reads a per-post
 *              "intent" phrase, scores it against /api/properties.json's bestForSegments,
 *              and renders a confidence-gated recommendation (single pick / two options /
 *              5-property ladder). See 081526/Stay_Match_Engine_ClaudeCode.md for the brief.
 * Version:     1.0.2
 * Author:      HavenInLipa
 *
 * 1.0.2 (2026-09-27): every Stay Match href carries ?hil_sm=<property|book>&hil_sm_post=<slug>
 *   so haveninlipa.com can record a landing-side `stay_match_arrival` (the blog-side click
 *   beacon can't be verified on its own); editor/preview views are tagged instead of counted
 *   as reader traffic; click handler hardened (text-node targets, non-primary clicks,
 *   beacon transport). See docs/HIL Blog Technical Specification.md → Stay Match.
 */

if (!defined('ABSPATH')) exit;

define('HIL_SM_FEED_URL', 'https://haveninlipa.com/api/properties.json');
define('HIL_SM_TRANSIENT', 'hil_stay_match_feed');
define('HIL_SM_CACHE_SECONDS', HOUR_IN_SECONDS);
define('HIL_SM_SNAPSHOT_OPTION', 'hil_stay_match_feed_snapshot'); // last known-good, never expires

/* ────────────────────────────────────────────────────────────────────────────
   1. The intent field — the pilot enrolls a post by setting this. Empty means
   "not enrolled": the post renders exactly as it does today, untouched. This
   is the rollout mechanism the brief describes — expanding beyond the pilot
   is "set this field on more posts," not a code or config change.
   ──────────────────────────────────────────────────────────────────────────── */

add_action('init', function () {
  register_post_meta('post', '_hil_stay_intent', [
    'show_in_rest'  => true, // lets the field be set via the REST API (e.g. an Application Password), not just the editor
    'single'        => true,
    'type'          => 'string',
    'auth_callback' => function () { return current_user_can('edit_posts'); },
  ]);
});

add_action('add_meta_boxes', function () {
  add_meta_box(
    'hil_stay_match',
    'Stay Match',
    'hil_sm_render_meta_box',
    'post',
    'side',
    'high'
  );
});

function hil_sm_render_meta_box($post) {
  wp_nonce_field('hil_sm_save_meta', 'hil_sm_nonce');
  $value = get_post_meta($post->ID, '_hil_stay_intent', true);
  ?>
  <p>
    <label for="hil_sm_intent"><strong>Trip intent</strong> — a few descriptive words, not one tag.</label>
  </p>
  <input type="text" id="hil_sm_intent" name="hil_sm_intent" style="width:100%"
         value="<?php echo esc_attr($value); ?>"
         placeholder="e.g. barkada 12 to 15 people, romantic weekend for two, remote work digital nomad" />
  <p style="color:#666;font-size:12px;">
    Blank = this post is not enrolled and renders unchanged. Include group-size numbers when they
    matter (they disambiguate between the three Mickey configurations far better than "barkada" alone).
    Scored against each property's live "best for" copy — see the render on the front end after saving.
  </p>
  <?php
}

add_action('save_post_post', function ($post_id) {
  if (!isset($_POST['hil_sm_nonce']) || !wp_verify_nonce($_POST['hil_sm_nonce'], 'hil_sm_save_meta')) return;
  if (!current_user_can('edit_post', $post_id)) return;
  if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
  $intent = isset($_POST['hil_sm_intent']) ? sanitize_text_field(wp_unslash($_POST['hil_sm_intent'])) : '';
  update_post_meta($post_id, '_hil_stay_intent', $intent);
});

/* ────────────────────────────────────────────────────────────────────────────
   2. Feed — server-side fetch, cached on the same 1h cadence as the feed's own
   s-maxage, so this is not a per-pageview request. Two-tier fallback: a fresh
   transient (1h), then a permanent snapshot option that only ever updates on a
   successful fetch, so the very worst case is a stale-but-once-real feed
   rather than nothing at all. Only if the snapshot has never been populated
   (fresh install, first fetch fails) do we fall through to the name-only
   safety ladder below, which carries no price and so can't drift.
   ──────────────────────────────────────────────────────────────────────────── */

function hil_sm_get_properties() {
  $cached = get_transient(HIL_SM_TRANSIENT);
  if ($cached !== false) return $cached;

  $response = wp_remote_get(HIL_SM_FEED_URL, ['timeout' => 5]);
  if (!is_wp_error($response) && wp_remote_retrieve_response_code($response) === 200) {
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (is_array($body) && isset($body['properties']) && is_array($body['properties'])) {
      $properties = $body['properties'];
      set_transient(HIL_SM_TRANSIENT, $properties, HIL_SM_CACHE_SECONDS);
      update_option(HIL_SM_SNAPSHOT_OPTION, $properties, false);
      return $properties;
    }
  }

  // Feed unreachable or malformed — serve the last known-good snapshot rather
  // than nothing. A one-hour-old (or older) price beats no recommendation.
  $snapshot = get_option(HIL_SM_SNAPSHOT_OPTION, false);
  return is_array($snapshot) ? $snapshot : [];
}

/* ────────────────────────────────────────────────────────────────────────────
   3. Scoring — token-overlap between the intent phrase and each property's
   bestForSegments (title weighted 3x, body 1x), substring-matched rather than
   exact-equal so "couple"/"couples", "family"/"families" etc. still hit
   without a stemmer. This is a first-pass heuristic, not a trained model —
   the brief expects the thresholds and matching to be retuned after a month
   of stay_match_click -> booking_confirmed data. Don't read precision into it.
   ──────────────────────────────────────────────────────────────────────────── */

function hil_sm_tokenize($text) {
  $text = strtolower((string) $text);
  preg_match_all('/[a-z0-9]+/', $text, $m);
  $stopwords = ['a','an','the','and','or','for','to','in','on','with','of','at','is','are','be'];
  return array_values(array_filter($m[0], function ($t) use ($stopwords) {
    if (in_array($t, $stopwords, true)) return false;
    if (ctype_digit($t)) return strlen($t) <= 2; // group-size numbers (5, 7, 11, 15...), not years/prices
    return strlen($t) >= 3;
  }));
}

function hil_sm_tokens_match($a, $b) {
  if (ctype_digit($a) || ctype_digit($b)) return $a === $b; // numbers must match exactly — "1" inside "15" is noise
  return stripos($a, $b) !== false || stripos($b, $a) !== false;
}

function hil_sm_overlap_score($intentTokens, $textTokens) {
  $score = 0;
  foreach ($intentTokens as $it) {
    foreach ($textTokens as $tt) {
      if (hil_sm_tokens_match($it, $tt)) { $score++; break; }
    }
  }
  return $score;
}

/**
 * Scores every property in the feed against the intent phrase and returns
 * them ranked best-first, each carrying the winning segment (for the reason
 * copy) and a 0..1 normalized score.
 */
function hil_sm_score_properties($intentPhrase, $properties) {
  $intentTokens = hil_sm_tokenize($intentPhrase);
  if (empty($intentTokens) || empty($properties)) return [];

  $ceiling = 3 * count($intentTokens); // best possible: every intent token hits every segment title
  $results = [];

  foreach ($properties as $property) {
    $segments = isset($property['bestForSegments']) && is_array($property['bestForSegments'])
      ? $property['bestForSegments'] : [];
    $best = null;
    $bestScore = -1;
    foreach ($segments as $segment) {
      $titleTokens = hil_sm_tokenize($segment['title'] ?? '');
      $bodyTokens  = hil_sm_tokenize($segment['body'] ?? '');
      $raw = 3 * hil_sm_overlap_score($intentTokens, $titleTokens)
           + 1 * hil_sm_overlap_score($intentTokens, $bodyTokens);
      if ($raw > $bestScore) { $bestScore = $raw; $best = $segment; }
    }
    if ($best === null || $bestScore <= 0) continue;
    $results[] = [
      'property' => $property,
      'segment'  => $best,
      'score'    => min(1.0, $bestScore / max(1, $ceiling)),
    ];
  }

  usort($results, fn($a, $b) => $b['score'] <=> $a['score']);
  return $results;
}

/* ────────────────────────────────────────────────────────────────────────────
   4. Confidence gate — decides what renders. Bottom gate matters as much as
   the top: a confident-sounding wrong pick is worse than the honest ladder.
   ──────────────────────────────────────────────────────────────────────────── */

function hil_sm_pick_tier($ranked) {
  if (empty($ranked)) return ['tier' => 'ladder', 'confidence' => 0];
  $top = $ranked[0]['score'];
  $second = isset($ranked[1]) ? $ranked[1]['score'] : 0;
  if ($top >= 0.7 && ($top - $second) >= 0.15) {
    return ['tier' => 'single', 'confidence' => $top];
  }
  if ($top >= 0.4) {
    return ['tier' => 'double', 'confidence' => $top];
  }
  return ['tier' => 'ladder', 'confidence' => $top];
}

/* ────────────────────────────────────────────────────────────────────────────
   5. Rendering
   ──────────────────────────────────────────────────────────────────────────── */

function hil_sm_price_line($property) {
  $prefix = !empty($property['priceFrom']) ? 'From ' : '';
  $price = number_format((float) ($property['pricePerNight'] ?? 0));
  return $prefix . '&#8369;' . $price . '/night';
}

/**
 * Appends the landing-confirmation params (1.0.2). Not UTMs on purpose — UTMs would
 * start a new GA4 session on haveninlipa.com and overwrite the reader's real source.
 * The main site fires `stay_match_arrival` and strips both params on arrival; its
 * pages carry absolute canonicals, so the params can't create duplicate URLs.
 */
function hil_sm_link($url, $destination, $postSlug) {
  if (empty($url) || $url === '#') return '#';
  return add_query_arg([
    'hil_sm'      => $destination,
    'hil_sm_post' => rawurlencode((string) $postSlug),
  ], $url);
}

function hil_sm_card($property, $reasonTitle, $reasonBody, $postSlug, $confidence, $intent) {
  $slug = esc_attr($property['slug'] ?? '');
  ob_start();
  ?>
  <div class="hil-sm-card">
    <div class="hil-sm-card-body">
      <h4><?php echo esc_html($property['name'] ?? ''); ?></h4>
      <p class="hil-sm-price"><?php echo hil_sm_price_line($property); ?></p>
      <?php if ($reasonTitle): ?><p class="hil-sm-reason-title"><?php echo esc_html($reasonTitle); ?></p><?php endif; ?>
      <?php if ($reasonBody): ?><p class="hil-sm-reason-body"><?php echo esc_html($reasonBody); ?></p><?php endif; ?>
      <div class="hil-sm-ctas">
        <a href="<?php echo esc_url(hil_sm_link($property['url'] ?? '', 'property', $postSlug)); ?>"
           data-analytics="stay_match_click" data-property="<?php echo $slug; ?>"
           data-destination="property" data-confidence="<?php echo esc_attr($confidence); ?>"
           data-intent="<?php echo esc_attr($intent); ?>" data-post-slug="<?php echo esc_attr($postSlug); ?>">See the home &rsaquo;</a>
        <a href="<?php echo esc_url(hil_sm_link($property['bookUrl'] ?? '', 'book', $postSlug)); ?>" class="hil-sm-book"
           data-analytics="stay_match_click" data-property="<?php echo $slug; ?>"
           data-destination="book" data-confidence="<?php echo esc_attr($confidence); ?>"
           data-intent="<?php echo esc_attr($intent); ?>" data-post-slug="<?php echo esc_attr($postSlug); ?>">Check dates &rsaquo;</a>
      </div>
    </div>
  </div>
  <?php
  return ob_get_clean();
}

function hil_sm_render($intent, $postSlug) {
  $properties = hil_sm_get_properties();

  // Never once fetched successfully — the assured-safe fallback, no prices.
  if (empty($properties)) {
    return hil_sm_render_ladder([], $postSlug, $intent, 0, true);
  }

  $ranked = hil_sm_score_properties($intent, $properties);
  $decision = hil_sm_pick_tier($ranked);
  $confidence = round($decision['confidence'], 2);

  if ($decision['tier'] === 'single') {
    $top = $ranked[0];
    ob_start();
    ?>
    <div class="hil-sm hil-sm-single" data-analytics="stay_match_view" data-confidence="<?php echo esc_attr($confidence); ?>"
         data-intent="<?php echo esc_attr($intent); ?>" data-post-slug="<?php echo esc_attr($postSlug); ?>"
         data-property="<?php echo esc_attr($top['property']['slug'] ?? ''); ?>">
      <p class="hil-sm-eyebrow">Where to stay for this trip</p>
      <?php echo hil_sm_card($top['property'], $top['segment']['title'] ?? '', $top['segment']['body'] ?? '', $postSlug, $confidence, $intent); ?>
    </div>
    <?php
    return ob_get_clean();
  }

  if ($decision['tier'] === 'double') {
    $picks = array_slice($ranked, 0, 2);
    ob_start();
    ?>
    <div class="hil-sm hil-sm-double" data-analytics="stay_match_view" data-confidence="<?php echo esc_attr($confidence); ?>"
         data-intent="<?php echo esc_attr($intent); ?>" data-post-slug="<?php echo esc_attr($postSlug); ?>" data-property="">
      <p class="hil-sm-eyebrow">Two good fits for this trip</p>
      <div class="hil-sm-grid">
        <?php foreach ($picks as $p): ?>
          <?php echo hil_sm_card($p['property'], $p['segment']['title'] ?? '', '', $postSlug, $confidence, $intent); ?>
        <?php endforeach; ?>
      </div>
    </div>
    <?php
    return ob_get_clean();
  }

  return hil_sm_render_ladder($properties, $postSlug, $intent, $confidence, false);
}

/** The proven fallback — every property, no editorializing. Never empty, never a spinner. */
function hil_sm_render_ladder($properties, $postSlug, $intent, $confidence, $noPriceSafetyNet) {
  // Assured-safe last resort: the feed has never once been reachable. Names +
  // links only, no prices, so this can never go stale/wrong the way a cached
  // price could — see the header note on the two-tier feed cache above.
  if ($noPriceSafetyNet) {
    $fallback = [
      ['name' => 'Cozy 1BR Haven', 'url' => 'https://haveninlipa.com/properties/cozy-1-bedroom'],
      ['name' => 'Spacious 2BR Getaway', 'url' => 'https://haveninlipa.com/properties/spacious-2-bedroom'],
      ['name' => 'Mickey in Lipa — Sleeps 7', 'url' => 'https://haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7'],
      ['name' => 'Mickey in Lipa — Sleeps 11', 'url' => 'https://haveninlipa.com/properties/mickey-in-lipa--family-house--sleeps-11'],
      ['name' => 'Mickey in Lipa — Sleeps 15', 'url' => 'https://haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15'],
    ];
    ob_start();
    ?>
    <div class="hil-sm hil-sm-ladder" data-analytics="stay_match_view" data-confidence="0"
         data-intent="<?php echo esc_attr($intent); ?>" data-post-slug="<?php echo esc_attr($postSlug); ?>" data-property="">
      <p class="hil-sm-eyebrow">Where to stay</p>
      <ul class="hil-sm-ladder-list">
        <?php foreach ($fallback as $f): ?>
          <li><a href="<?php echo esc_url(hil_sm_link($f['url'], 'property', $postSlug)); ?>" data-analytics="stay_match_click" data-destination="property"
                 data-confidence="0" data-intent="<?php echo esc_attr($intent); ?>" data-post-slug="<?php echo esc_attr($postSlug); ?>">
            <?php echo esc_html($f['name']); ?> &rsaquo;</a></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <?php
    return ob_get_clean();
  }

  ob_start();
  ?>
  <div class="hil-sm hil-sm-ladder" data-analytics="stay_match_view" data-confidence="<?php echo esc_attr($confidence); ?>"
       data-intent="<?php echo esc_attr($intent); ?>" data-post-slug="<?php echo esc_attr($postSlug); ?>" data-property="">
    <p class="hil-sm-eyebrow">Where to stay</p>
    <ul class="hil-sm-ladder-list">
      <?php foreach ($properties as $p): ?>
        <li>
          <a href="<?php echo esc_url(hil_sm_link($p['url'] ?? '', 'property', $postSlug)); ?>" data-analytics="stay_match_click"
             data-property="<?php echo esc_attr($p['slug'] ?? ''); ?>" data-destination="property"
             data-confidence="<?php echo esc_attr($confidence); ?>" data-intent="<?php echo esc_attr($intent); ?>"
             data-post-slug="<?php echo esc_attr($postSlug); ?>">
            <?php echo esc_html($p['name'] ?? ''); ?> &mdash; <?php echo hil_sm_price_line($p); ?> &rsaquo;
          </a>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>
  <?php
  return ob_get_clean();
}

/* ────────────────────────────────────────────────────────────────────────────
   6. Injection — right after the first H2 (matches the existing editorial
   convention for "Where to stay" callouts: above the fold of value, not
   buried at the end). Falls back to prepending if the post has no H2. Only
   fires on the enrolled pilot posts — see the meta field gate at the top.
   ──────────────────────────────────────────────────────────────────────────── */

add_filter('the_content', function ($content) {
  if (!is_singular('post') || !in_the_loop() || !is_main_query()) return $content;

  $post_id = get_the_ID();
  $intent = get_post_meta($post_id, '_hil_stay_intent', true);
  if (empty($intent)) return $content; // not enrolled — untouched

  $post_slug = get_post_field('post_name', $post_id);
  $block = hil_sm_render($intent, $post_slug);

  $pos = stripos($content, '</h2>');
  if ($pos !== false) {
    $pos += strlen('</h2>');
    return substr($content, 0, $pos) . $block . substr($content, $pos);
  }
  return $block . $content;
});

/* ────────────────────────────────────────────────────────────────────────────
   7. Styles + GA4 events. track() mirrors the Next.js app's helper
   (analytics.ts) so both domains report through the same convention, per the
   brief's "do not introduce a second tracking pattern." gtag.js is already on
   this theme via Site Kit — confirmed on the live site (G-2SV2PXYB7T).
   ──────────────────────────────────────────────────────────────────────────── */

add_action('wp_head', function () {
  if (!is_singular('post')) return;
  ?>
  <style>
    .hil-sm { margin: 1.75em 0; padding: 1.25em; background: #F9F5EE; border: 1px solid #C4A862; border-radius: 10px; }
    .hil-sm-eyebrow { margin: 0 0 .75em; font-size: .8em; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: #3B5323; }
    .hil-sm-grid { display: grid; grid-template-columns: 1fr; gap: 1em; }
    @media (min-width: 640px) { .hil-sm-grid { grid-template-columns: 1fr 1fr; } }
    .hil-sm-card { background: #fff; border-radius: 8px; padding: 1em; }
    .hil-sm-card h4 { margin: 0 0 .25em; color: #2C2C2C; }
    .hil-sm-price { margin: 0 0 .5em; font-weight: 700; color: #3B5323; }
    .hil-sm-reason-title { margin: 0 0 .25em; font-weight: 600; color: #2C2C2C; }
    .hil-sm-reason-body { margin: 0 0 .75em; color: #555; font-size: .95em; }
    .hil-sm-ctas { display: flex; gap: .75em; flex-wrap: wrap; }
    .hil-sm-ctas a { text-decoration: none; font-weight: 600; color: #3B5323; }
    .hil-sm-ctas a.hil-sm-book { color: #C4A862; }
    .hil-sm-ladder-list { margin: 0; padding-left: 1.2em; }
    .hil-sm-ladder-list a { color: #3B5323; font-weight: 600; text-decoration: none; }
  </style>
  <?php
}, 20);

add_action('wp_footer', function () {
  if (!is_singular('post')) return;
  // 1.0.2: previews and not-yet-published posts render at /?p=<id>[&preview=true], which
  // GA4's pagePath reports as "/" (query stripped). Those views are editors, not readers.
  $unpublished = is_preview() || get_post_status() !== 'publish';
  ?>
  <script>
  (function () {
    // Editors (WordPress adds body.logged-in) and previews are tagged, not dropped:
    // traffic_type=internal feeds GA4's Internal Traffic filter, debug_mode the
    // Developer-traffic filter. Both are checked client-side so a cached page can't
    // carry another visitor's flags.
    var unpublished = <?php echo $unpublished ? 'true' : 'false'; ?> ||
      /[?&](preview=true|p=\d+|preview_id=)/.test(window.location.search);
    var editor = document.body && document.body.classList.contains('logged-in');

    function track(event, params) {
      if (typeof window.gtag !== 'function') return;
      var isProd = window.location.hostname === 'blog.haveninlipa.com';
      var payload = Object.assign({}, params || {});
      if (!isProd || unpublished) payload.debug_mode = true;
      if (editor || unpublished) payload.traffic_type = 'internal';
      window.gtag('event', event, payload);
    }

    function eventParams(el) {
      return {
        property: el.getAttribute('data-property') || '',
        confidence: parseFloat(el.getAttribute('data-confidence')) || 0,
        intent: el.getAttribute('data-intent') || '',
        post_slug: el.getAttribute('data-post-slug') || '',
      };
    }

    document.querySelectorAll('[data-analytics="stay_match_view"]').forEach(function (el) {
      if (!('IntersectionObserver' in window)) { track('stay_match_view', eventParams(el)); return; }
      var seen = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !seen) {
            seen = true;
            track('stay_match_view', eventParams(el));
            io.unobserve(el);
          }
        });
      }, { threshold: 0.5 });
      io.observe(el);
    });

    // A plain <a href> click starts navigating immediately, and the browser can
    // tear the page down before gtag's request actually goes out — the click
    // reliably fires, but the beacon isn't guaranteed to land before the page
    // does. Delay navigation briefly via gtag's own event_callback/event_timeout
    // (its documented pattern for exactly this), with a JS-side fallback timer
    // so a slow, missing, or blocked callback (ad blockers eat these) never
    // actually traps the click — the reader always ends up on the page.
    document.addEventListener('click', function (e) {
      // 1.0.2: a click can target a text node in some engines, which has no closest().
      var t = e.target;
      if (t && t.nodeType === 3) t = t.parentNode;
      if (!t || typeof t.closest !== 'function') return;
      var el = t.closest('[data-analytics="stay_match_click"]');
      if (!el) return;

      var href = el.getAttribute('href');
      var opensNewTab = el.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
      var params = eventParams(el);
      params.destination = el.getAttribute('data-destination') || '';
      params.transport_type = 'beacon';

      if (!href || href === '#' || opensNewTab || e.defaultPrevented || typeof window.gtag !== 'function') {
        track('stay_match_click', params);
        return;
      }

      e.preventDefault();
      var navigated = false;
      var go = function () {
        if (navigated) return;
        navigated = true;
        window.location.href = href;
      };
      params.event_callback = go;
      params.event_timeout = 500;
      track('stay_match_click', params);
      setTimeout(go, 500);
    });
  })();
  </script>
  <?php
}, 20);

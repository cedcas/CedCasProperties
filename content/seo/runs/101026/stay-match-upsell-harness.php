<?php
/**
 * Standalone harness for Stay Match v1.0.3's upsell-segment fix.
 *
 * Proves the "Groups of 12 or more" bug and its fix without a WordPress
 * install: stubs the handful of WP functions the plugin file calls at
 * top-level load (add_action/add_filter/register_post_meta — all no-ops
 * here, since we only need the pure scoring functions below them), then
 * calls hil_sm_score_properties() directly with a fixture mirroring the real
 * /api/properties.json content for the three Mickey configurations
 * (prisma/property-content/mickey-content.ts).
 *
 * Run:  php content/seo/runs/101026/stay-match-upsell-harness.php
 */

define('ABSPATH', __DIR__);
define('HOUR_IN_SECONDS', 3600);
function add_action(...$args) {}
function add_filter(...$args) {}
function register_post_meta(...$args) {}

require __DIR__ . '/hil-stay-match.php';

$properties = [
  [
    'slug' => 'mickey-in-lipa--family-staycation--sleeps-7',
    'name' => 'Mickey in Lipa — Sleeps 7',
    'url' => 'https://haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7',
    'bookUrl' => 'https://haveninlipa.com/properties/mickey-in-lipa--family-staycation--sleeps-7/book',
    'pricePerNight' => 3200,
    'bestForSegments' => [
      [
        'title' => 'Couples and small families',
        'body' => 'The one-bedroom configuration comfortably fits a couple or small family.',
        'internalLinkUrl' => 'https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/',
      ],
      [
        'title' => 'Groups of 6 to 7',
        'body' => 'For a bigger group, the 2-bedroom configuration sleeps up to 11.',
        'internalLinkUrl' => '/properties/mickey-in-lipa--family-house--sleeps-11',
      ],
    ],
  ],
  [
    'slug' => 'mickey-in-lipa--family-house--sleeps-11',
    'name' => 'Mickey in Lipa — Sleeps 11',
    'url' => 'https://haveninlipa.com/properties/mickey-in-lipa--family-house--sleeps-11',
    'bookUrl' => 'https://haveninlipa.com/properties/mickey-in-lipa--family-house--sleeps-11/book',
    'pricePerNight' => 4200,
    // Mirrors SLEEPS_11.bestForSegments in prisma/property-content/mickey-content.ts.
    'bestForSegments' => [
      [
        'title' => "Families who want a kids' room",
        'body' => 'Parents take the master bedroom; the kids get their own themed bunk room.',
        'internalLinkUrl' => 'https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/',
      ],
      [
        'title' => 'Reunions and birthday weekends',
        'body' => 'Sleeping eleven is comfortable here, not crammed.',
        'internalLinkUrl' => 'https://blog.haveninlipa.com/taal-volcano-day-trip-from-lipa-city-2026-updated-guide/',
      ],
      [
        // THE BUG: this is an upsell to Sleeps 15, not a claim that Sleeps 11
        // itself fits 12+ — pre-1.0.3 scoring let it win anyway.
        'title' => 'Groups of 12 or more',
        'body' => 'The rate covers 9 guests and this configuration sleeps up to 11. For a bigger reunion or barkada, the full-house configuration opens a second bunk room and sleeps up to 15.',
        'internalLinkUrl' => '/properties/mickey-in-lipa--full-family-house--sleeps-15',
      ],
    ],
  ],
  [
    'slug' => 'mickey-in-lipa--full-family-house--sleeps-15',
    'name' => 'Mickey in Lipa — Sleeps 15',
    'url' => 'https://haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15',
    'bookUrl' => 'https://haveninlipa.com/properties/mickey-in-lipa--full-family-house--sleeps-15/book',
    'pricePerNight' => 7000,
    // Mirrors SLEEPS_15.bestForSegments.
    'bestForSegments' => [
      [
        'title' => 'Reunions and multi-generation trips',
        'body' => 'Three sleeping zones keep grandparents, parents, and kids each in their own space.',
        'internalLinkUrl' => 'https://blog.haveninlipa.com/family-staycation-lipa-city-batangas/',
      ],
      [
        'title' => 'Barkada weekends, 12 to 15 people',
        'body' => 'Sleeping fifteen here is comfortable, not crammed. Cook as a team and regroup for dinner.',
        'internalLinkUrl' => 'https://blog.haveninlipa.com/taal-volcano-day-trip-from-lipa-city-2026-updated-guide/',
      ],
      [
        'title' => 'Birthdays and celebrations',
        'body' => 'The rate covers 13 guests; the house sleeps up to 15.',
        'internalLinkUrl' => '/properties/mickey-in-lipa--family-house--sleeps-11',
      ],
    ],
  ],
];

$intent = 'groups of 12 or more barkada reunion';
$ranked = hil_sm_score_properties($intent, $properties);

echo "Intent: \"$intent\"\n\n";
echo "Ranked results (best first):\n";
foreach ($ranked as $i => $r) {
  printf(
    "  %d. %-45s score=%.2f  winning segment: \"%s\"\n",
    $i + 1,
    $r['property']['slug'],
    $r['score'],
    $r['segment']['title']
  );
}

$decision = hil_sm_pick_tier($ranked);
echo "\nDecision tier: {$decision['tier']} (confidence " . round($decision['confidence'], 2) . ")\n";

$top = $ranked[0]['property']['slug'] ?? null;
echo "\n" . ($top === 'mickey-in-lipa--full-family-house--sleeps-15'
  ? "PASS — Sleeps 15 now scores first for a 12+ group intent.\n"
  : "FAIL — expected Sleeps 15 first, got: " . ($top ?? 'none') . "\n");

if ($top !== 'mickey-in-lipa--full-family-house--sleeps-15') {
  exit(1);
}

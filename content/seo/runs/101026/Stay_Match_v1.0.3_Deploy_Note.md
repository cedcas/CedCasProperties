# Stay Match v1.0.3 — Deploy Note (2026-10-10)

**Owner action required: Cedric uploads this to WordPress.** It cannot be deployed from the
repository — `blog/` is gitignored and the blog is deployed separately. Nothing in this
note has been applied to `blog.haveninlipa.com`.

- **Artifact:** `content/seo/runs/101026/hil-stay-match.php` (v1.0.3), based on the live
  v1.0.2 source (`content/seo/runs/092726/hil-stay-match.php`).
- **Bug fixed:** Mickey Sleeps 11's `bestForSegments` includes a "Groups of 12 or more"
  entry whose `internalLinkUrl` is `/properties/mickey-in-lipa--full-family-house--sleeps-15`
  — i.e. it's an upsell ("too small for 12+, see the bigger house"), not a claim that Sleeps
  11 itself fits 12+ people. `hil_sm_score_properties()` scored it anyway, so a "groups of 12
  or more" / "barkada 12-15" blog intent confidently (tier `single`, confidence 0.73)
  recommended the 11-guest-max house over the 15-guest one.
- **Fix:** `hil_sm_segment_points_to_other_property($segment, $property)` — a segment is
  skipped during scoring (for that property only) when its `internalLinkUrl` resolves to a
  `/properties/<slug>` page for a **different** property than the one being scored. Blog
  links and a property's link to its own page are unaffected.
- **Harness:** `content/seo/runs/101026/stay-match-upsell-harness.php` — a standalone PHP
  script (no WordPress needed) reproducing the real Sleeps 7/11/15 `bestForSegments` content
  from `prisma/property-content/mickey-content.ts`. Run: `php content/seo/runs/101026/stay-match-upsell-harness.php`.
  - **Before (v1.0.2):** `groups of 12 or more barkada reunion` → Sleeps 11 first, score 0.73, tier `single`.
  - **After (v1.0.3):** same intent → **Sleeps 15 first**, score 0.40, tier `double` (paired with Sleeps 11's genuine "Reunions and birthday weekends" segment).

## Deploy steps (Cedric)

1. Zip the file as `hil-stay-match.php.zip` → WP Admin → Plugins → Add New → Upload Plugin →
   replace current. Confirm the version shows **1.0.3**.
2. Purge LiteSpeed **and** the Hostinger CDN (hPanel → `blog.haveninlipa.com` → CDN → Flush
   cache).
3. Spot-check: on a post enrolled with an intent like "barkada 12 to 15 people" or "big
   family reunion," the rendered Stay Match block should surface Sleeps 15 (alone, or paired
   with Sleeps 11 — never Sleeps 11 alone for a stated 12+ group).

**Rollback:** re-upload v1.0.2. No main-site change, no database change — this is a
same-file logic fix with no other behavior difference from v1.0.2.

## Alternative/additional fix proposed (needs Owner decision, not applied here)

Retitle the Sleeps 11 segment from "Groups of 12 or more" to something that doesn't read as
a capacity claim for Sleeps 11 itself — e.g. **"Bigger group? See the full house"** — via the
existing admin Property-form editor for `bestForSegments` (DEC-015's narrow-field pattern; no
direct DB script). This is a content change, not a plugin change, and is independent of the
v1.0.3 code fix above: either one closes the mis-recommendation on its own, but the wording
fix also improves the segment's own clarity on the property page itself (where the Stay Match
plugin doesn't apply, and the same upsell phrasing currently reads as a self-claim there too).
Not implemented — proposing in this note per the task's "Owner approval" requirement; Cedric
decides whether to additionally make this copy change.

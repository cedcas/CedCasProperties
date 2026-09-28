# Stay Match v1.0.2 — Deploy Note (2026-09-27)

**Owner action required: Cedric uploads this to WordPress.** It cannot be deployed from the
repository — `blog/` is gitignored and the blog is deployed separately. Nothing in this
note has been applied to `blog.haveninlipa.com`.

- **Artifact:** `content/seo/runs/092726/hil-stay-match.php` (v1.0.2), based on the live
  v1.0.1 source (`blog/plugin/hil-stay-match.php`, as checked on 2026-09-27).
- **Main-site counterpart:** `stay_match_arrival` in `src/lib/stay-match-arrival.ts` /
  `src/components/Analytics.tsx` (branch `fix/analytics-tracking`, PR against `dev`).
  **Order doesn't matter.** Without the plugin update the main-site code does nothing. If the
  plugin goes live before the main-site code, the extra params just stay in the URL (the
  property pages have absolute canonicals, so no duplicate-URL issue) until the main site
  ships.

## What changes

1. Every Stay Match link (single, double, ladder and the no-feed fallback ladder) gets
   `?hil_sm=<property|book>&hil_sm_post=<post_slug>` via `add_query_arg`. The main site fires
   `stay_match_arrival` (`destination`, `post_slug`, `property`) once, then strips both params
   with `history.replaceState`. These are deliberately **not UTMs**: UTMs would start a new
   GA4 session and overwrite the reader's real source.
2. Views and clicks from **previews / unpublished posts** (`/?p=<id>`, `preview=true`) are
   sent with `debug_mode` + `traffic_type: 'internal'`, and from **logged-in editors**
   (`body.logged-in`) with `traffic_type: 'internal'`. They are still sent (tagging can be
   undone); they only leave reports once the GA4 Internal Traffic / Developer-traffic filters
   are Active.
3. The click handler is hardened: it handles text-node targets (no `closest()`), leaves
   non-primary/modified clicks and `#` links to the browser, respects `defaultPrevented`, and
   adds `transport_type: 'beacon'`. The `stay_match_click` event name and params are the same
   as before.

## Deploy steps (Cedric)

1. Zip the file as `hil-stay-match.php.zip` → WP Admin → Plugins → Add New → Upload Plugin →
   replace current. Confirm the version shows **1.0.2**.
2. Purge LiteSpeed **and** the Hostinger CDN (hPanel → `blog.haveninlipa.com` → CDN → Flush
   cache).
3. Check on an enrolled published post while **logged out** (private window):
   `document.querySelector('[data-analytics="stay_match_click"]').href` should end in
   `?hil_sm=property&hil_sm_post=<slug>`.
4. Click "See the home": the address bar on haveninlipa.com should drop the `hil_sm` params
   after a moment, and GA4 Realtime should show `stay_match_arrival` (once the main-site change
   is live on production).

**Rollback:** re-upload v1.0.1. The main site ignores missing params.

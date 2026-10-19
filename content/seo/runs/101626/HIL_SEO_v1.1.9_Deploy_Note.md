# hil-seo v1.1.9: Deploy Note (2026-10-16)

**Cedric uploads this to WordPress.** Nothing in this note has been applied to `blog.haveninlipa.com` yet.

- **Upload this file:** `content/seo/runs/101626/hil-seo-plugin.zip` (v1.1.9). It is built on the live v1.1.8. The folder inside is still `hil-seo-plugin/`, so WordPress replaces the installed plugin.
- **Why:** two separate problems, both about the same four social profiles.
  1. The Organization schema's `sameAs` TikTok entry, `https://www.tiktok.com/@haven_inlipa`, was never a live handle, and the schema had no YouTube entry even though HIL has a YouTube channel.
  2. The theme's own hardcoded social icons (CTA section + footer) point Instagram and TikTok at bare, non-`www` domains that redirect poorly or 404-adjacent, and the Facebook link is missing `www.` too — and there is no YouTube icon at all. Confirmed live on the blog homepage 2026-10-16 (`/workspace/hil-blog-social/live-home.html`): exactly the three wrong hrefs, no YouTube link.

## What changes

1. **Organization schema (`includes/schema.php`)** — `sameAs` is now, in order:
   `https://www.facebook.com/haveninlipa`, `https://www.instagram.com/haven_inlipa/`,
   `https://www.tiktok.com/@haven.in.lipa`, `https://www.youtube.com/@Haven-in-Lipa`,
   `https://haveninlipa.com`. Facebook and Instagram are unchanged from 1.1.8; TikTok is
   corrected; YouTube is new; the non-social `haveninlipa.com` entry keeps its position
   after the four socials.
2. **New module, `includes/social-links.php`** — front-end only, gated by its own filter
   (`hil_seo_fix_social_links`, default **on**, independent of the Yoast-cutover flags).
   On every front-end HTML page view it:
   - Corrects the theme's hardcoded Instagram, TikTok, and Facebook `href`s to the same
     corrected URLs as the schema above.
   - Inserts a YouTube icon anchor immediately after each TikTok anchor, cloned from that
     anchor's own markup (so it picks up `class="social-link"` in the footer, and no class
     in the CTA section, without the module needing to know which container it's in).
   - Never runs on `wp-admin`, REST, AJAX, cron, or feed requests, and never edits a theme
     file — it rewrites the rendered HTML via an output buffer started on `template_redirect`.
   - Is idempotent: running it twice over the same markup does not produce a second YouTube
     icon.
3. Nothing else changes. The 1.1.7 blog-homepage meta description setting and the 1.1.8
   Facebook schema fix both carry forward untouched.

**Known gap, not fixed here:** the main rental app's own `LocalBusiness`/`LodgingBusiness`
schema (`src/lib/local-business-schema.ts`) still lists the old
`https://www.tiktok.com/@haven_inlipa` and has no YouTube entry — it was already
documented as not fully aligned with the blog's Organization graph (see that file's
docblock and `docs/HIL_COMPLETION_LOG.md`, 2026-10-10 entry, re: the Airbnb entry gap).
This deploy widens that gap by one more field. Fixing it is a separate, Owner-approved
app-side change — out of scope for this plugin build.

## Deploy steps (Cedric)

1. **Upload:** WP Admin → Plugins → Add New Plugin → Upload Plugin → `hil-seo-plugin.zip` → Install Now → **Replace current with uploaded**. Check that the version shows **1.1.9**.
2. **Purge both caches:** LiteSpeed → Toolbox → **Purge All**, then hPanel → `blog.haveninlipa.com` → CDN → **Flush cache**.
3. Tell Claude. Claude checks:
   - The live Organization JSON-LD on the blog homepage shows the five `sameAs` URLs above, in order.
   - The CTA section and footer social icons on the blog homepage link to the corrected Facebook/Instagram/TikTok URLs and show a new YouTube icon right after TikTok, linking to `https://www.youtube.com/@Haven-in-Lipa`.
   - The Airbnb icon is unchanged.
   - View-source (not just rendered page) to confirm the theme files themselves weren't touched — only the plugin changed.

**Rollback:** re-upload v1.1.8 (`content/seo/runs/100426/hil-seo-plugin.zip`), then purge both caches. This removes the YouTube icon/schema entry and reverts the TikTok schema URL and the theme-link corrections in one step, since all of it lives in the plugin, not the theme.

**Disabling just the social-link fix (keeping schema/SEO output on 1.1.9):** add
`add_filter( 'hil_seo_fix_social_links', '__return_false' );` (e.g. via a site-specific
snippet) — no re-upload needed.

# hil-seo v1.1.10: Deploy Note (2026-10-22)

**Cedric uploads this to WordPress.** Nothing in this note has been applied to `blog.haveninlipa.com` yet.

- **Upload this file:** `content/seo/runs/102226/hil-seo-v1.1.10.zip` (v1.1.10). **The live site is still on 1.1.8** — the 1.1.9 artifact (`content/seo/runs/101626/`) was built but never uploaded (see `docs/HIL Blog Technical Specification.md`). 1.1.10 is built on top of that unreleased 1.1.9 artifact and carries all of its changes forward (Organization schema YouTube entry + TikTok URL fix, the Instagram/TikTok/Facebook href corrections, the YouTube icon insertion) plus the new Airbnb fix below, so this upload goes straight from the live 1.1.8 to 1.1.10 — 1.1.9 is never installed on its own. The folder inside is still `hil-seo-plugin/`, so WordPress replaces the installed plugin.
- **Why:** the theme's hardcoded Airbnb icon (CTA section + footer) links to `https://airbnb.com/h/haveninlipa`. That vanity link is not valid — it redirects to Airbnb's generic `https://www.airbnb.com/s/homes` search page, not any Haven in Lipa listing (resolved and confirmed 2026-10-22). Cedric's decision the same day: repoint it to direct booking (`https://haveninlipa.com/properties`) rather than to a real Airbnb listing, and do not add an individual Airbnb listing link anywhere on either site.

## What changes

1. **`includes/social-links.php`** — the same output-buffer module that already corrects the theme's Instagram/TikTok/Facebook hrefs and inserts the YouTube icon (1.1.9) now also rewrites the Airbnb anchor's `href`:
   - `https://airbnb.com/h/haveninlipa` → `https://haveninlipa.com/properties`.
   - Matches any scheme (`http`/`https`) and `www.` variant, with or without a trailing slash — so the fix still applies even if the theme markup drifts to one of those equivalent forms.
   - Only the `href` changes. `target`, `rel`, `aria-label="Airbnb"`, and the Font Awesome `fa-airbnb` icon are left exactly as they are — this is a link-destination fix, not a rebrand of the icon. (Cedric may want the icon/label revisited separately; out of scope here.)
   - Runs in the same front-end-only, idempotent pass as the existing corrections — no new filter, no new cutover flag.
2. Nothing else changes. The 1.1.9 Organization schema `sameAs` fields (Facebook/Instagram/TikTok/YouTube) and every other module carry forward untouched. The Organization schema has never included an Airbnb entry, so there is nothing to change there.

**Scope note (SEO-DEC-006):** the content freeze applies to blog article content, not to template/plugin code. This is a template/link fix — no post content, title, or schedule is touched.

## Deploy steps (Cedric)

1. **Upload:** WP Admin → Plugins → Add New Plugin → Upload Plugin → `hil-seo-v1.1.10.zip` → Install Now → **Replace current with uploaded**. Check that the version shows **1.1.10**.
2. **Purge both caches:** LiteSpeed → Toolbox → **Purge All**, then hPanel → `blog.haveninlipa.com` → CDN → **Flush cache**.
3. Tell Claude. Claude checks:
   - View-source on the blog homepage: the CTA section's and footer's Airbnb anchor now reads `href="https://haveninlipa.com/properties"` and no `airbnb.com` href remains anywhere in the rendered HTML.
   - The Airbnb icon's `aria-label`, `target`, `rel`, and `fa-airbnb` class are unchanged — only the destination moved.
   - The other three icons (Facebook/Instagram/TikTok) and the YouTube icon inserted by 1.1.9 are unaffected.
   - View-source (not just rendered page) to confirm the theme files themselves weren't touched — only the plugin changed.

**Rollback:** re-upload the live v1.1.8 (`content/seo/runs/100426/hil-seo-plugin.zip`), then purge both caches — 1.1.9 was never installed, so there is no intermediate version to roll back to. This restores the (broken) `airbnb.com/h/haveninlipa` link and drops the YouTube icon/schema entry and TikTok URL fix, since all of it lives in the plugin, not the theme.

**Disabling just the social-link fix (keeping schema/SEO output on 1.1.10):** add
`add_filter( 'hil_seo_fix_social_links', '__return_false' );` (e.g. via a site-specific
snippet) — no re-upload needed. This also re-exposes the broken Airbnb link, since the
same module owns both corrections.

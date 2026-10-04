# hil-seo v1.1.8: Deploy Note (2026-10-04)

**Cedric uploads this to WordPress.** Nothing in this note has been applied to `blog.haveninlipa.com` yet.

- **Upload this file:** `content/seo/runs/100426/hil-seo-plugin.zip` (v1.1.8). It is built on the live v1.1.7. The folder inside is still `hil-seo-plugin/`, so WordPress replaces the installed plugin.
- **Why:** the two sites named the same Facebook page with two different addresses in their structured data.
  - Main site: `facebook.com/haveninlipa`.
  - Blog: `facebook.com/profile.php?id=61572535599006`, which redirects to the first (checked 2026-10-04).

## What changes

- The blog's Organization structured data now lists `https://www.facebook.com/haveninlipa`, the same URL the main site uses.
- Nothing else changes. The **Blog homepage meta description** saved in 1.1.7 is a stored setting, and updating the plugin keeps it.

## Deploy steps (Cedric)

1. **Upload:** WP Admin → Plugins → Add New Plugin → Upload Plugin → `hil-seo-plugin.zip` → Install Now → **Replace current with uploaded**. Check that the version shows **1.1.8**.
2. **Purge both caches:** LiteSpeed → Toolbox → **Purge All**, then hPanel → `blog.haveninlipa.com` → CDN → **Flush cache**.
3. Tell Claude. Claude checks the live structured data on the blog homepage and one post, and that the homepage description is still the 143-character text.

**Rollback:** re-upload v1.1.7 (`content/seo/runs/093026/hil-seo-plugin.zip`), then purge both caches.

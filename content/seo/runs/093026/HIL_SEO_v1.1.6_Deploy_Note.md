# hil-seo v1.1.6: Deploy Note (2026-09-30)

**Cedric uploads this to WordPress.** It cannot be deployed from the repository. Nothing in this note has been applied to `blog.haveninlipa.com` yet.

- **Upload this file:** `content/seo/runs/093026/hil-seo-plugin.zip` (v1.1.6).
  - It is built on the live v1.1.5 source. `content/seo/runs/090726/hil-seo-plugin.zip` was confirmed byte-identical to that source before this change.
  - The folder inside the zip is still `hil-seo-plugin/`, so WordPress replaces the installed plugin rather than adding a second copy.
- **Why:** 2026-09-30 SEO audit, MEDIUM #9. Post titles ran up to 132 characters, largely because of the 21-character " - Haven in Lipa Blog" suffix. Owner decision, 2026-09-30: drop the suffix only when the full title would be longer than about 60 characters.

## What changes

1. **The suffix is dropped when the title would be too long.** For posts and pages, the `<title>`, `og:title` and `twitter:title` lose " - Haven in Lipa Blog" when the full title would exceed 60 characters.
   - This applies to the per-post **SEO title override** (`hil_seo_title`) as well as the automatic title. Posts backfilled from Yoast have the suffix inside the override.
   - Length is counted on the readable text, so `&#8217;` counts as one character.
2. **Nothing else changes:** blog homepage and `/page/N/` titles, archive titles, canonicals, meta descriptions, robots, sitemap, schema, and every cutover flag, setting and post meta value.
3. **Expected result on today's 29 posts:**
   - **All 29 lose the suffix.** No post title plus the suffix fits in 60 characters.
   - **26 are still over 60 characters** on their own text (61–111), so Google will still cut them off.
   - Shortening those is an editorial task: write a shorter **SEO title** in the post's HIL SEO box, with no suffix. That is not part of this release.
   - The longest are post 489 (pilgrimage guide, 111), post 205 (Mickey coming soon, 107), posts 307 and 552 (103 each), and post 355 (rainy day, 97).

## Deploy steps (Cedric)

1. **Upload:** WP Admin → Plugins → Add New Plugin → **Upload Plugin** → choose `hil-seo-plugin.zip` → Install Now → **Replace current with uploaded**.
2. **Confirm the version:** the Plugins list should show HIL SEO **1.1.6**, still Active. WP Admin → HIL SEO should look unchanged.
3. **Purge both caches:**
   - LiteSpeed Cache → Toolbox → **Purge All**.
   - Then hPanel → `blog.haveninlipa.com` → CDN → **Flush cache**.
4. **Check while logged out** (private window). View source on these pages and read the `<title>`:

   | Page | Expected `<title>` |
   |---|---|
   | `/solo-travel-guide-lipa/` | `Solo Travel Guide to Lipa: A Quiet, Affordable Base Near Manila`, with no suffix |
   | `/best-lomi-lipa-city/` | Starts `Lomi in Lipa City: A Local's Guide…`, with no suffix |
   | Blog homepage `/` | Unchanged: `Haven in Lipa Blog - Travel, Stay & Explore Lipa City` |
   | `/page/2/` | Unchanged: `Haven in Lipa Blog - Page 2 of 3 - Travel, Stay & Explore Lipa City` |
   | Any post | `og:title` matches that post's `<title>` |

5. Tell Claude when it's live. Claude re-crawls all 29 post titles and confirms the results.

**Rollback:** re-upload `content/seo/runs/090726/hil-seo-plugin.zip` (v1.1.5) the same way, then purge both caches. No data changes in either direction.

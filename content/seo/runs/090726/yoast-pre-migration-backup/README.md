# Yoast Pre-Migration Backup

Captured: 2026-09-07, as Migration Plan Stage 1 ("Export and preserve Yoast metadata and global settings").

This is a live, unauthenticated + authenticated REST pull of every piece of Yoast-owned output on `blog.haveninlipa.com`, taken immediately before the `hil-seo` plugin was activated on the site. It is the ground truth for the Migration Plan's Stage 5 ("compare Yoast and custom output URL by URL") and the rollback procedure's verification step.

## Files

- `published_posts_yoast_state.json` — all 27 published posts, full `yoast_head_json` (title, description, canonical, robots, OG/Twitter, schema markers) plus core fields (slug, status, dates, author, categories, tags).
- `scheduled_posts_yoast_state.json` — the 7 scheduled (`future`) posts, same shape, pulled via the authenticated Editor/Author credential since these aren't publicly visible.
- `categories.json`, `tags.json` — full taxonomy list with each term's Yoast-rendered state (title, robots) where present.
- `author_2_cassandrakim.json`, `author_3_haven.json` — the two author archive pages' full Yoast output, including each `Person` schema node — the baseline for verifying the SEO-DEC-021 author reassignment doesn't silently change what these archives render.
- `robots.txt` — Yoast's current robots.txt block, including its `Sitemap:` line (will change per SEO-DEC-020 at cutover).
- `sitemap_index.xml`, `post-sitemap.xml` — Yoast's current sitemap output (28 URLs: 27 posts + homepage).

## How this gets used

Every one of these files is a "before" snapshot. The parity check (Migration Plan Stage 5) diffs `hil-seo`'s `/wp-json/hil-seo/v1/preview/<id>` output against the matching post's entry in `published_posts_yoast_state.json`/`scheduled_posts_yoast_state.json` — any difference must be either a deliberate, approved improvement (e.g. the SEO-DEC-023 "1 hour from Manila" rewrite) or a bug to fix before cutover, never an unexplained gap.

Do not overwrite these files on a later run — if a second backup is ever needed, it goes in a new dated folder, so this one stays a fixed reference point for the 2026-09-07 cutover specifically.

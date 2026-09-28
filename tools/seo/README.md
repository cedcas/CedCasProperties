# tools/seo/ — HIL-specific SEO reporting/sync scripts

Migrated verbatim from `/VSCode/seo/content for HavenInLipa/Tools/` on 2026-09-17, as part
of the SEO/content governance consolidation (see
`content/seo/README.md` and `docs/HIL_SEO_SPECIFICATION.md`). These are one-off/periodic
Python utilities used to build HIL's SEO deliverables and sync its tracking workbook —
not part of the Next.js application, not run in CI, and not imported by anything under
`src/`.

Only genuinely HIL-specific scripts were migrated (all reference `haveninlipa` by name or
operate on HIL's own tracker/report files). Generic shared tooling used across the
`/VSCode/seo` workspace's other clients was left in place there, not forked here.

## What's here

- `README_wordpress_access.md` — original notes on WordPress REST API access used by
  these scripts (Application Password based; see `docs/HIL_SEO_SPECIFICATION.md` for the
  current credential-handling policy).
- `generate_haveninlipa_*report*.py` — dated report generators (Apr15 → Aug16), each
  producing one of the archived `.docx`/`.pdf` deliverables now in
  `content/seo/archive/legacy-deliverables/`.
- `generate_haveninlipa_keyword_tracker.py`, `option2_haveninlipa_keyword_tracker.py`,
  `update_haveninlipa_keyword_tracker.py` — build/update the keyword tracker workbook
  (`content/seo/analytics/HavenInLipa_SEO_Tracker.xlsx`).
- `sync_page_indexing_083126.py`, `sync_page_indexing_202607.py`,
  `add_kpi_baseline_aug14.py`, `add_kpi_dashboard.py`, `add_role_column.py`,
  `add_striking_distance_column.py`, `fix_indexing_colors_083126.py` — dated,
  single-use sync/patch scripts against the tracker workbook.
- `audit_internal_links.py`, `generate_blogger_guide.py`,
  `generate_featured_image_inventory.py`, `haveninlipa_config.py`, `wp_client.py` —
  supporting utilities and shared config/client code for the scripts above.

## Requirements and safety

These scripts were written to run from the shared `/VSCode/seo` workspace and reference
file paths, Python packages, and possibly credentials specific to that environment (see
`README_wordpress_access.md`). They are preserved here for provenance and future reuse,
**not verified to run as-is from this location** — check imports and paths before
executing any of them again. Never run a script that writes to WordPress or the tracker
without confirming its target and getting sign-off first, per
`docs/HIL_SEO_SPECIFICATION.md`'s approval-gate rules.

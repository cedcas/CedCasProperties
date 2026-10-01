# hil-seo v1.1.7: Deploy Note (2026-10-01)

**Cedric uploads this to WordPress.** Nothing in this note has been applied to `blog.haveninlipa.com` yet.

- **Upload this file:** `content/seo/runs/093026/hil-seo-plugin.zip` (v1.1.7). It is built on the live v1.1.6. The folder inside is still `hil-seo-plugin/`, so WordPress replaces the installed plugin.
- **Why:** 2026-09-30 SEO audit, LOW finding. The blog homepage meta description is the site tagline, "Travel, Stay & Explore Lipa City", which is only 32 characters. The tagline can't simply be lengthened, because the same text also builds:
  - the homepage `<title>` ("Haven in Lipa Blog - <tagline>")
  - the WebSite structured-data description
  - the theme's homepage heading

## What changes

- **New setting on WP Admin → HIL SEO:** "Blog homepage meta description" (Administrator only), with a character counter.
- **Where it's used:** the meta, og and Twitter description on the blog homepage and `/page/N/` **only**.
- **When it's empty,** the homepage falls back to the tagline, which is today's behavior. So installing the update changes nothing until you save the setting.
- **Unchanged:** the homepage title, structured data, theme heading, and every post.

## Suggested description (143 characters)

```
Local guides to Lipa City, Batangas: things to do, where to eat, Taal day trips and weekend itineraries, plus where to stay with Haven in Lipa.
```

It has no travel times, prices or claims that could go stale (SEO-DEC-023/028), and it names the blog's main topics.

## Deploy steps (Cedric)

1. **Upload:** WP Admin → Plugins → Add New Plugin → Upload Plugin → `hil-seo-plugin.zip` → Install Now → **Replace current with uploaded**. Check that the version shows **1.1.7**.
2. **Enter the description:** WP Admin → **HIL SEO** (the Migration / Cutover screen). In the status list, find **Blog homepage meta description**. Paste the text above into the box, then click **Save description**. A green "saved" notice should appear, and the counter should read 143.
3. **Purge both caches:** LiteSpeed → Toolbox → **Purge All**, then hPanel → `blog.haveninlipa.com` → CDN → **Flush cache**.
4. **Check while logged out:** view source on `https://blog.haveninlipa.com/` in a private window.
   - `<meta name="description">` shows the new text.
   - `<title>` is unchanged: `Haven in Lipa Blog - Travel, Stay & Explore Lipa City`.
5. Optional: in Google Search Console, request indexing for `https://blog.haveninlipa.com/`.

**Rollback:** clear the box and click Save. The homepage falls back to the tagline. Or re-upload v1.1.6.

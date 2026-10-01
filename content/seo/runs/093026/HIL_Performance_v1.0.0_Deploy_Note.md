# HIL Performance: Deploy Note (2026-09-30), current version **1.0.1**

> **1.0.1 (same day):** 1.0.0 was live but didn't help. Its `<noscript>` fallback `<link>` was picked up by LiteSpeed CSS Combine, which treats links inside `<noscript>` as combinable. That put all of Font Awesome straight back into the render-blocking combined file (verified live: a 155 KB bundle with 15 Font Awesome headers, plus the cdnjs icon fonts chained off it in PageSpeed's network tree, and the score stayed at 65).
>
> 1.0.1 removes that fallback. Visitors with JavaScript disabled now get no icons, which are decorative.
>
> **Upgrade:** upload the new zip and choose **Replace current with uploaded**, then **purge both caches**. LiteSpeed must rebuild its combined CSS without Font Awesome.
>
> **Success check:** the combined `…/litespeed/css/…css` file no longer references `cdnjs…/webfonts`. In PageSpeed, the `fa-*.woff2` files no longer hang off the combined CSS in **Network dependency tree**.

**Cedric uploads this to WordPress.** It is a new plugin. Nothing in this note has been applied to `blog.haveninlipa.com` yet.

- **Upload this file:** `content/seo/runs/093026/hil-performance.zip`. It contains one file, `hil-performance/hil-performance.php`.
- **Why:** blog PageSpeed (mobile) was 65–67, with First Contentful Paint at 3.9 s. About 3.3 s of that was render-blocking requests. The single largest one was the theme's full Font Awesome stylesheet from cdnjs, at about 1,050 ms, and the page uses only about 14 icons.

## What it does

1. **Removes the theme's Font Awesome stylesheet** (handle `font-awesome`) from WordPress's normal stylesheet queue.
2. **Loads the same file without blocking the page.** A tiny script in `<head>` loads it in the background, the same technique the main site uses.
   - The script is marked `data-no-optimize="1"`, so LiteSpeed doesn't combine or defer it.
   - With LiteSpeed CSS Combine ON, Font Awesome would otherwise be folded into the combined render-blocking file.
3. **No `<noscript>` copy** (removed in 1.0.1, see above).
4. **Does nothing in wp-admin,** and does nothing if the theme ever stops loading Font Awesome.

**Visible effect:** icons such as the clock, calendar and social icons may appear a fraction of a second after the text on a slow connection. Nothing else changes: no settings, no database writes, no theme edits.

## Deploy steps (Cedric)

1. Go to **WP Admin → Plugins → Add New Plugin → Upload Plugin**. Choose `hil-performance.zip`, click **Install Now**, then **Activate**.
2. **Purge both caches:**
   - LiteSpeed Cache → Toolbox → **Purge All**
   - hPanel → `blog.haveninlipa.com` → CDN → **Flush cache**
3. **Check by eye** in a private window: the blog homepage plus two posts. The icons (reading time, dates, social links, related posts) should all appear, and the layout should be unchanged.
4. **Re-run PageSpeed (Mobile)** on `/solo-travel-guide-lipa/`.
   - `cdnjs…/all.min.css` should no longer be listed under **Render-blocking requests**.
   - Note the new score and First Contentful Paint (3.9 s before).
5. Tell Claude. Claude checks the live `<head>` for the loader and confirms the separate render-blocking link is gone.

**Rollback:** WP Admin → Plugins → **Deactivate** HIL Performance, then purge both caches. The theme loads Font Awesome its normal way again.

## Next, once this is measured

Compare PageSpeed with LiteSpeed **HTML Settings → Load Google Fonts Asynchronously** ON against OFF, and keep whichever scores better. When ON, it adds the 600 ms `webfontloader.min.js` blocking script; when OFF, the Google Fonts stylesheet blocks instead.

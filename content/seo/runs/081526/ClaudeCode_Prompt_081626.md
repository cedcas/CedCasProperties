# Claude Code Prompt — HIL, 2026-08-16

> Paste everything below the line into Claude Code in the HAVENINLIPA repo.
> Three fixes from the Full Audit (run 081526). All three are independent. Task 1 is the substantial one.

---

Read these first and follow their conventions — do not restate or duplicate what they already cover:
- `About HIL/HIL Website Technical Specification.md` (Database Schema → Property; File Structure; Security → CSP)
- `About HIL/HIL SEO Technical Specification.md` (sitemap, canonicals, JSON-LD, `normalizePricingProse`)
- `About HIL/HIL Blog Technical Specification.md` (the `/api/properties.json` feed — Task 1 is its in-app sibling)

Update `About HIL/HIL Commits.md` and the relevant spec for anything you ship.

**Full page copy for Task 1 and Task 3 is in the audit deliverables** — use it rather than writing your own:
`/Volumes/Files and Cloud/Dropbox/VSCode (non-Git)/seo/content for HavenInLipa/081526/MoneyPage_02_Properties_Index.md`

---

## Task 1 — `/properties` index page (currently a 404)

**Why:** `haveninlipa.com/properties` returns **404**, and `/properties/` 308s into it — a path that looks real and isn't. It was linked from the five biggest blog articles until 2026-08-16, and is still linked from things we don't control: external sites, the Google Business Profile, old social posts, LLM citations. The site also has **no inventory index at all** — the property grid exists only on the homepage, so lodging intent has nowhere to land. This page is additionally the fallback surface for the upcoming Stay Match component (its `<0.4` confidence tier).

**Route:** `src/app/properties/page.tsx` — a sibling of the existing `[slug]/page.tsx`.

### ⚠️ Two traps, both already paid for once

1. **Query Prisma directly. Do NOT fetch `/api/properties.json` from inside the app.** That feed exists so WordPress can read live data across an origin boundary; the app self-fetching its own route adds a network hop and a failure mode for nothing. Use the **same gate as the feed and the public grid** — `where: { isActive: true, pricePerNight: { gt: 0 } }, orderBy: { createdAt: 'desc' }` — so the two surfaces can never disagree. *(This supersedes the "fetch the feed" note in the money-page draft, which was written before the route existed.)*

2. **Do NOT use `export const revalidate`.** That form runs the Prisma query at **build** time, which fails CI outright (the lint/build workflow has no database) and would bake a transient DB error into a static asset. This is exactly what `2dc488b` fixed on the feed route. Follow that precedent: `export const dynamic = "force-dynamic"` plus an explicit `s-maxage` on the response.

### Behaviour

- Reuse **`extraGuestFeeApplies()`** from `src/lib/occupancy.ts` for the "From" price prefix — do not reimplement the predicate. `PropertyCard` gates on it (`57ab099`) so flat-price listings never imply an increase that cannot happen.
- Run any seeded prose you render (`tagline`) through **`normalizePricingProse()`**, exactly as `generateMetadata` and the feed do.
- Reuse `PropertyCard` if it fits; extract a shared component rather than duplicating card markup.
- Both CTAs need the existing `data-analytics` / `data-property` hooks so `check_availability` and `book_click` fire consistently.
- Handle an empty result set: render the page copy and a contact prompt, never an empty grid or a throw.

### Metadata & schema

- **Title:** `Our Homes in Lipa City, Batangas — 5 Private Rentals | Haven in Lipa`
- **Description:** in the money-page draft
- Self-canonical (the root layout defaults to `/` — see the metadata-inheritance gotcha in the SEO spec)
- **`ItemList`** of the property URLs + **`BreadcrumbList`** (Home → Our Homes)
- ⛔ **No `Offer` / `priceSpecification`.** Those were stripped from the property pages for triggering "invalid itemtype" and "invalid object type for priceSpecification" critical errors — do not reintroduce the pattern.
- Add to `src/app/sitemap.ts` at **priority 0.9**, `changeFrequency: 'weekly'`.

**Done when:** `curl -s -o /dev/null -w "%{http_code}" https://haveninlipa.com/properties` returns **200**; `/properties/` resolves to it in one hop; all five listings render with rates matching the DB (1500 / 2800 / 2500 / 4500 / 6500 at time of writing); the "From" prefix matches what each homepage card shows today; and Rich Results Test reports 0 critical.

---

## Task 2 — `/contact` returns 404

**Why:** `haveninlipa.com/contact` is a hard 404. It was linked from five blog articles until 8/16 (now repointed to `/#contact`), but external links, the GBP profile and old social posts still point at it.

The contact form lives on the homepage at `#contact`. There is no separate contact page and this task does not create one.

**Fix:** add a permanent redirect in `next.config.ts`:

```
/contact  →  /#contact   (permanent)
```

Check which layer owns routing before editing — `next.config.ts` redirects, middleware, or the Hostinger/Vercel domain config — and put it where the existing redirects live.

**Done when:** `/contact` resolves to the homepage contact section in one hop, with no 404 in the chain.

---

## Task 3 — `/about` describes 2 of 5 properties

**Why:** `/about` is indexed and in the sitemap, and its body copy reads **"Our two properties"**, listing only the Spacious 2BR and Cozy 1BR. The three Mickey in Lipa houses have been live since 2026-06-18 and appear nowhere in the page's content — only in the site-wide nav. This is the page carrying `Person` schema for Melody and doing the trust work for direct booking, and it omits the **sleeps-15 flagship**, which is the single listing the wedding and large-group strategy depends on.

**Fix:** rewrite the "Our two properties" section to cover all five.

- Rename the heading — "Our five homes" or similar. The phrase "two properties" must not survive anywhere on the page.
- Same source of truth as Task 1: **Prisma, same gate**. Do not hardcode names, guest counts or prices — this section going stale is the defect being fixed, and hardcoding guarantees it recurs.
- Keep Melody's voice and the existing structure; this is a section rewrite, not a page rewrite.
- Add a link to the new `/properties` page.
- Leave the `Person` / `Place` / `LocalBusiness` JSON-LD alone.

**Done when:** `/about` names all five homes with live guest counts, the string "two properties" is gone, and the page still validates clean.

---

## Shipping

Same flow as PR #9:

1. Branch from `dev`, commit each task separately with a descriptive message.
2. Append the commits to `About HIL/HIL Commits.md` with their Type (`HIL Website` / `HIL SEO`).
3. Update `About HIL/HIL SEO Technical Specification.md` — the sitemap entry list changes, and `/properties` is a new indexed route with its own schema.
4. Open a PR to `main`, merge, deploy.
5. **Verify on production, not on the preview** — `dev.haveninlipa.com` sits behind Vercel SSO.

⚠️ **A merge to `main` is not a deploy.** On 8/15 all three SEO commits were pushed to `dev` and the specs were updated to describe them as shipped, while production still 404'd for a day. Confirm the live URLs return 200 before reporting done.

Note: CI Build and Lint are **already red on `main`** for pre-existing reasons unrelated to this work (main's own DB-less build fails at `/_not-found`; Lint has 8 errors in untouched files). Don't try to fix those here — but don't let them mask a genuine failure in these three tasks either.

**Post-deploy:** request indexing in GSC for `/properties` and `/about`.

---

## Explicitly NOT in scope

- **`/staycation` and `/weddings-accommodation`.** Both are drafted in the same `081526/` folder, but `/weddings-accommodation` is blocked on a fact-check (drive times to named venues) and `/staycation` requires a WordPress-side 301 that has to be sequenced with in-body link repointing. They come as a separate brief.
- **The Stay Match component.** Separate brief, already delivered — `081526/Stay_Match_Engine_ClaudeCode.md`.
- **Blog-side changes.** Repointing the five evergreens from `/#properties` to `/properties` is a WordPress edit, not a repo change. It happens after Task 1 is live.
- **The CI failures on `main`.** Pre-existing and unrelated.

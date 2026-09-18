# ✅ RESOLVED — Task 1 is live in production

**Date:** 2026-08-15 · **Closed 2026-08-16 after PR #9**
**For:** Cedric → developer
**Status:** ✅ resolved — **Stay Match is unblocked**

---

## ✅ Closed — verified on production after PR #9

`6d38e42` merged `dev` → `main` and deployed. Full verification against the original "done when" criteria:

| Check | Result |
|---|---|
| `GET /api/properties.json` | **200**, `{ count: 5 }` |
| Prices | 1500 / 2800 / 2500 / 4500 / 6500 — all match the DB |
| `url` / `bookUrl` host | **apex** — `NEXTAUTH_URL` resolves correctly, the risk flagged below did not materialise |
| Prose drift | **0 mismatches.** Every `heroSummary` amount equals its `pricePerNight`; no extra-guest-fee literals anywhere in the prose |
| Every URL the feed publishes | **19/19 resolve 200** — 5 property pages, 5 `/book`, 5 blob images, 4 blog links, *including* the previously-dead `mt-maculot` slug |
| `priceFrom` | `true` on all 5 (each has a fee > 0 and max > included) — consistent with what the cards render |
| CORS | `Access-Control-Allow-Origin: https://blog.haveninlipa.com` + `Vary: Origin` |
| Edge cache | `x-vercel-cache: HIT`, `age` climbing — ~1 origin hit/hour as designed |
| `robots.txt` | **`Disallow: /admin`** and **`Disallow: /api`** — trailing-slash defect fixed |

### A fourth commit landed, and it's a good one

`2dc488b` — *serve properties.json dynamically with an edge cache, not via ISR.* `export const revalidate = 3600` was running the Prisma query at **build** time, which broke CI (no database in the lint/build workflow) and, more importantly, would have let a transient DB error during a production build get baked into a static asset and served to the blog for a full hour. Now `force-dynamic` with an explicit `s-maxage=3600`: same one-hour edge cache, same origin load, but a bad moment costs one request instead of 3,600 seconds of them.

The downstream response header reads a bare `cache-control: public` — that is Vercel consuming `s-maxage` / `stale-while-revalidate` at the edge, not a stripped directive. Confirmed working via `x-vercel-cache: HIT`.

### 📌 Two items this leaves open

1. **The Blog spec now describes this route incorrectly.** It states the route is "statically prerendered with `export const revalidate = 3600`… verified as `○ /api/properties.json 1h` in the build output. The handler takes no `request` argument, which is what keeps it static." It is now `force-dynamic` (`ƒ`). Update it — and keep the *reason*, because "don't use ISR here" is exactly the kind of thing that gets silently reverted by someone optimising later.
2. **`main` was merged with CI red.** The developer flagged this as pre-existing and unrelated — main's own code fails the DB-less build at `/_not-found`, and Lint has 8 errors in untouched files. Plausible, and not this PR's fault. But it means CI currently cannot tell anyone when something genuinely breaks, which is worth fixing on its own schedule.

---

<details>
<summary>Original note, kept for the record — the findings that produced this fix</summary>

## 🔄 Interim update — re-checked after the first push

The developer committed and pushed. That closes half the gap, and the commits are clean:

| Commit | Message |
|---|---|
| `f66295e` | feat(seo): public read-only property feed at `/api/properties.json` |
| `f2535a8` | fix(seo): disallow `/admin` and `/api` as prefixes, not just `/admin/` and `/api/` |
| `95cc36e` | fix(seo): derive Mickey review aggregates; stop seeding drift-prone prose |

Working tree is clean and nothing is unpushed. **But all three are on `origin/dev`, not `main`.** `origin/main` still tops out at `4e5cf70` (2026-08-09), with `dev` three commits ahead.

Production is unchanged:

```
curl -s -o /dev/null -w "%{http_code}" "https://haveninlipa.com/api/properties.json?cb=1"   → 404
curl -s https://haveninlipa.com/robots.txt | grep -i disallow                               → /admin/  /api/   (trailing slashes)
```

Both checked cache-busted and with `no-cache` headers, so this is not a stale edge read. Property pages re-verified: prices and review counts identical, nothing regressed.

**The one remaining step is: merge `dev` → `main` and deploy.**

> `dev.haveninlipa.com` is behind Vercel SSO and redirects to a login page. It cannot be used to verify the feed without auth — and more importantly, **WordPress could not fetch from it either**, so the preview deployment cannot substitute for the apex when Stay Match ships. The feed has to be live on `haveninlipa.com`.

The rest of this note stands as written; the original "untracked files" description below is superseded by the table above, but every verification step and both spec corrections still apply.

---

## What I checked and what I found

The three `About HIL/` specs were rewritten on 2026-08-15 describing all three tasks as done. I verified each against production rather than against the specs. Two of the three are genuinely live. **Task 1 is not deployed at all.**

```
curl -s -o /dev/null -w "%{http_code}" https://haveninlipa.com/api/properties.json
→ 404
```

The route file exists — `src/app/api/properties.json/route.ts`, written 2026-08-15, 5,710 bytes, and it's good code. But it is **untracked on branch `dev`**. `git log` on `main` stops at `d1a98ef` (2026-08-09), and `HIL Commits.md` has no entry past that date either.

Uncommitted alongside it on `dev`:

| File | Consequence of not shipping |
|---|---|
| `src/app/api/properties.json/` *(untracked)* | Feed 404s — Stay Match cannot be built against it |
| `src/app/robots.ts` *(modified)* | The `/admin` prefix fix isn't live |
| `prisma/seed-property-seo.ts` *(modified)* | Repo and prod DB have diverged |
| `prisma/seed-property-seo-mickey.ts` *(modified)* | Same |

Production `robots.txt` still reads:

```
Disallow: /admin/
Disallow: /api/
```

— with the trailing slashes, i.e. the exact defect the SEO spec describes as fixed. `/admin` is still crawlable and still 307s into disallowed space.

**Task 3 is the exception, and the reason the gap is easy to miss.** The review aggregates *are* live — seeds run against the prod DB directly, so the data landed even though the code didn't. I verified the JSON-LD on all five property pages:

| Listing | `reviewCount` in live JSON-LD |
|---|---|
| `cozy-1-bedroom` | 32 |
| `spacious-2-bedroom` | 21 |
| `…--sleeps-7` | 47 |
| `…--sleeps-11` | 23 |
| `…--sleeps-15` | 46 |

So one task's *data* shipped while its *code* sat uncommitted — which is exactly the state that reads as "everything's done" from the outside.

---

## What's needed

1. Commit the four paths above on `dev`, merge to `main`, deploy.
2. Append the commits to `HIL Commits.md` with their Type (the spec's own protocol — it's currently three entries behind).
3. **Verify after deploy, not before:**

```bash
curl -s https://haveninlipa.com/api/properties.json | jq '.count, .properties[] | {slug, pricePerNight, priceFrom}'
# expect: count 5 · cozy-1-bedroom 1500 · sleeps-15 6500

curl -s https://haveninlipa.com/robots.txt | grep -i disallow
# expect: /admin and /api — no trailing slashes
```

### One deploy check that could silently break the feed

The route sets:

```ts
const BASE_URL = process.env.NEXTAUTH_URL || "https://haveninlipa.com";
```

`NEXTAUTH_URL` is set in the Vercel production environment for auth. If it points anywhere other than the apex — a preview URL, `dev.haveninlipa.com`, a trailing-slash variant — then **every** `url`, `bookUrl`, and absolutised `bestForSegments[].internalLinkUrl` in the feed is wrong, and the blog would publish those links at scale. The fallback only protects the case where the variable is unset.

Worth confirming the resolved value in the deployed output rather than assuming, since a feed whose whole purpose is killing link and price drift is a bad place to introduce a new drift source.

---

## Two spec corrections

These are Cedric's specs to edit, not mine — flagging for accuracy since future sessions read them as ground truth.

**1. Blog spec overstates the dead-slug severity.** It records "Dead internal slugs (hard 404, no redirect) — 7 slugs, 12 in-body links, 6 articles." I traced all eight renamed slugs today; every one **301s in a single hop to a live 200**:

```
/best-lomi-lipa-city-local-guide/            → 301 → /best-lomi-lipa-city/            → 200
/casa-de-segunda-lipa-heritage-walk/         → 301 → /casa-de-segunda-lipa-city/      → 200
/holy-week-getaway-lipa/                     → 301 → /holy-week-in-lipa-…-manila/     → 200
/mt-maculot-hiking-guide-2026-cuenca-rockies/→ 301 → /mt-maculot-…-where-to-stay-…/   → 200
/where-to-pray-reflect-rest-lipa-carmel-…/   → 301 → /lipa-pilgrimage-guide/          → 200
/coming-soon-disney-inspired-family-house-…/ → 301 → /mickey-in-lipa-coming-soon/     → 200
/lipa-barako-coffee-heritage-where-to-drink/ → 301 → /lipa-barako-coffee-heritage/    → 200
```

That's WordPress core's `_wp_old_slug_redirect` doing its job. The links cost a hop; they are not broken.

**This does not weaken the Redirection-plugin recommendation** — `_wp_old_slug_redirect` only fires while the old-slug meta survives, it can be lost on migrations or bulk edits, and it gives you no 404 log to catch the next occurrence. Install it. But the fix is durability insurance, not triage on 12 broken links, and the priority should reflect that.

**2. The original two listings still carry literal aggregates.** The SEO spec notes this itself: `seed-property-seo.ts` hardcodes 32 / 21 while the actual active testimonial counts are 37 / 24. The Mickey seed now derives from `reviewAggregate(propertyId)`. Converting the other two is a small change that removes a drift surface of exactly the kind the spec argues against elsewhere — and it's under-reporting real social proof by 5 and 3 reviews on the two oldest, best-established listings.

---

## Why this matters beyond the one route

The Stay Match engine is the top open item from the 8/14 pivot, and this feed is its only prerequisite. The brief is written and ready ([Stay_Match_Engine_ClaudeCode.md](Stay_Match_Engine_ClaudeCode.md)) — but the WordPress component cannot ship until `/api/properties.json` answers 200 on the apex. Everything else in that brief is unblocked; this is the one hard dependency.

</details>

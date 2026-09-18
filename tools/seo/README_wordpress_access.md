# WordPress REST access — where the credentials live

**Set up 2026-08-16.**

## Location

```
~/.config/haveninlipa/wordpress.env      (chmod 600)
```

**Deliberately outside this Dropbox folder.** The SEO project is in a synced directory — anything here is copied to Dropbox's servers and visible to anyone with access to the shared folder. Credentials don't belong in that blast radius.

**Do not copy it into the project**, and don't paste the Application Password into any file here, a brief, or a chat message.

## What Cedric fills in

Two fields: `WP_USERNAME` and `WP_APP_PASSWORD`. Everything else is pre-set.

- **Username, not email.** Application Passwords authenticate against `user_login`; an email address fails with a 401 that reads like a wrong password.
- **Dedicated user, Editor role** — `netcoresolutions`. Editor can create and edit posts and nothing else. Administrator is more access than the job needs.
- **Generate at:** WP Admin → Users → Profile → Application Passwords. Shown once. Revocable instantly from the same screen, without affecting Cedric's own login.

## Safety rails, enforced by config rather than by memory

| Variable | Default | Effect |
|---|---|---|
| `WP_DEFAULT_STATUS` | `draft` | New posts land as drafts — Cedric adds images and schedules |
| `WP_ALLOW_PUBLISH` | `false` | Can update already-published bodies and create drafts; **cannot** publish or unpublish |
| `WP_REQUIRE_DIFF` | `true` | Fetch and show the change before writing |
| `WP_PROTECTED_POST_IDS` | *(empty)* | Post IDs to never touch, whatever an instruction says |

## Two standing constraints

**1. REST only. Never the database.**
Editing through REST goes *through* WordPress, so revisions are created and cache-purge hooks fire. On 2026-08-16 a **correct** direct-SQL update was invisible on the live site until the object cache was flushed by hand — plus raw SQL risks corrupting serialized data in `wp_options` / `wp_postmeta`. No DB credentials in that env file.

**2. Yoast SEO fields are not writable yet.**
Only `footnotes` is registered as exposed post meta. The `hil-expose-focuskw` plugin registers the focus keyphrase for **read** only. Writing meta titles/descriptions needs `show_in_rest` plus a write-capable `auth_callback` on `_yoast_wpseo_metadesc` and `_yoast_wpseo_title` — a change to the blog's plugin, which is the developer's call.

**Until then: body copy yes, Yoast SEO fields no.** Worth knowing because article #9's stale price was in exactly that field.

## Rollout

| Phase | Scope | Gate |
|---|---|---|
| **1** | Update existing posts; new posts as drafts | Starts with the 5 Maculot itinerary notices — mechanical, urgent, every change diffable |
| **2** | Publish corrections directly to live posts | After Phase 1 runs clean |
| **3** | Publish new articles | Only if 1–2 run clean; flip `WP_ALLOW_PUBLISH` |

## Unchanged either way

Every change still gets logged in [PROJECT_STATUS.md](../PROJECT_STATUS.md). This project has caught four unverified facts in a week because everything is written down and re-verified — direct write access shouldn't quietly erode that audit trail.

The main site (`haveninlipa.com`, Next.js) stays out of scope. That's the developer's, per the standing ownership boundary.

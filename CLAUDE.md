# CedCas Properties — Claude Context

## Project Overview

CedCas Properties is a full-stack property rental website for a short-term rental business based in Lipa City, Batangas, Philippines. It is a direct-booking alternative to Airbnb — guests can browse listings, view photo galleries, pick dates, and book with QR-based payment (GCash or BPI). An admin panel lets the owner manage listings, images, and bookings.

**Live URL:** `haveninlipa.com`
**Repo:** `github.com/cedcas/CedCasProperties`
**Branch strategy:** `dev` for development, `main` for production (Vercel auto-deploys on push to `main`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| ORM | Prisma 5 |
| Database | MySQL (Hostinger, `srv1284.hstgr.io`) |
| Auth | NextAuth v5 beta (JWT sessions) |
| File Storage | Vercel Blob (property images) |
| Email | Hostinger SMTP (`customerservice@haveninlipa.com`) |
| Hosting | Vercel (app) + Hostinger (DB + domain) |
| Payments | Static QR codes — GCash + BPI InstaPay (manual verification) |

### Brand Colors (Tailwind CSS v4 custom tokens in `globals.css`)
- `--color-charcoal: #2C2C2C`
- `--color-forest: #3B5323`
- `--color-gold: #C4A862`
- `--color-cream: #F9F5EE`

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string (Hostinger) |
| `NEXTAUTH_SECRET` | JWT signing secret (min 32 chars) |
| `NEXTAUTH_URL` | App base URL (e.g. `https://haveninlipa.com`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `SMTP_HOST` | Hostinger SMTP host (`smtp.hostinger.com`) |
| `SMTP_PORT` | Hostinger SMTP port (`465`) |
| `SMTP_USER` | Hostinger email address (`customerservice@haveninlipa.com`) |
| `SMTP_PASS` | Hostinger email password |

---

## Build & Deployment

**Build command (runs on every Vercel deploy):**
```
prisma db push --skip-generate && prisma generate && next build
```
This syncs the DB schema and regenerates the Prisma client before every build.

**Seed admin user:**
```
npm run seed
```
Uses `prisma/seed.ts` to create the initial admin account (bcrypt-hashed password).

**Seed testimonials:**
```
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-testimonials.ts
```

---

## Database Schema (Prisma)

### Models
- **Property** — slug, name, description, type (2BR/3BR/Studio etc.), pricePerNight, location, bedrooms, bathrooms, maxGuests, images (JSON array), featuredImage, amenities (JSON array), isFeatured, isActive, airbnbIcsUrl
- **Booking** — propertyId, guestName, guestEmail, guestPhone, checkIn, checkOut, guests, totalPrice, status (pending/confirmed/cancelled), paymentMethod (gcash/bpi), notes
- **Testimonial** — propertyId, name, location, rating, message, isActive — testimonials are **per-property**, not site-wide
- **ContactMessage** — name, email, phone, subject, message, isRead
- **AdminUser** — email (unique), password (bcrypt), name

---

## File Structure

```
src/
  app/
    page.tsx                          # Homepage
    layout.tsx                        # Root layout
    globals.css                       # Tailwind v4 + brand tokens
    properties/[slug]/
      page.tsx                        # Property detail page (gallery, dates, availability)
      book/page.tsx                   # 2-step booking flow
    admin/
      layout.tsx                      # Admin layout (force dynamic — no caching)
      login/page.tsx                  # NextAuth login
      dashboard/page.tsx
      properties/page.tsx
      properties/[id]/page.tsx        # Edit property
      properties/new/page.tsx
      bookings/page.tsx
      messages/page.tsx
      testimonials/page.tsx
    api/
      auth/[...nextauth]/route.ts     # NextAuth handler
      bookings/route.ts               # POST — create booking
      availability/[slug]/route.ts    # GET — check dates vs DB + Airbnb iCal
      calendar/[slug]/route.ts        # GET — export .ics feed (Airbnb import)
      contact/route.ts                # POST — contact form
      admin/bookings/[id]/route.ts    # PATCH — update booking status (triggers confirmation email)
      admin/properties/route.ts       # GET/POST properties
      admin/properties/[id]/route.ts  # GET/PATCH/DELETE property
      admin/properties/[id]/images/route.ts  # POST/DELETE images (Vercel Blob)
      admin/messages/[id]/route.ts    # PATCH — mark message read
      admin/testimonials/route.ts     # GET/POST testimonials
      admin/testimonials/[id]/route.ts # PATCH/DELETE testimonial
  components/
    layout/
      Navbar.tsx                      # Nav with working anchor links from any page
      Footer.tsx                      # Social media links (real URLs)
    sections/
      Hero.tsx
      Properties.tsx                  # Property listing cards with pagination
      Testimonials.tsx                # Per-property testimonials with "Show More"
      WhyUs.tsx
      DiscoverLipa.tsx                # Discover Lipa City section
      ContactForm.tsx
    ui/
      PropertyCard.tsx
      PropertyGallery.tsx             # Airbnb-style grid + lightbox thumbnail strip
      BookingCard.tsx
      TestimonialList.tsx
      ScrollReveal.tsx
    admin/
      AdminSidebar.tsx
      PropertyForm.tsx
      ImageManager.tsx
      BookingStatusSelect.tsx
      DeleteButton.tsx
      MarkReadButton.tsx
      AddTestimonialForm.tsx
      TestimonialToggle.tsx
    booking/
      BookingForm.tsx                 # 2-step: guest details → QR payment
  lib/
    auth.ts                           # NextAuth config
    prisma.ts                         # Prisma client singleton
  middleware.ts                       # Protects /admin routes (NextAuth)
prisma/
  schema.prisma
  seed.ts                             # Seeds admin user
  seed-testimonials.ts                # Seeds testimonials per property
public/
  qr/
    gcash.jpg                         # GCash payment QR (one QR for all properties)
    bpi.png                           # BPI payment QR (one QR for all properties)
  brand-assets/
    Logo.png
    Transparent Logo.png
    Brand Guideline.png
```

---

## Key Features Built

### Public Site
- Homepage with Hero, Properties listing, Testimonials, Why Us, Discover Lipa City, Contact Form sections
- Property details page with Airbnb-style photo gallery (grid layout + lightbox with thumbnail strip)
- Date picker (check-in / check-out) with live nights and total price calculation
- Availability checking against DB bookings **and** Airbnb iCal feed
- 2-step booking flow:
  1. Guest details form with Airbnb savings comparison banner
  2. GCash or BPI QR code payment screen with "I Paid" submission
- Dates must be selected before booking is allowed
- Navbar anchor links work from any page (not just homepage)
- "Book Your Stay Today" CTA links to `#properties`
- Per-property testimonials with "Show More" pagination (not site-wide)

### Admin Panel (`/admin`)
- Protected by NextAuth JWT — middleware blocks unauthenticated access
- Admin layout uses `export const dynamic = 'force-dynamic'` to prevent sidebar caching
- Property CRUD with image upload (Vercel Blob), featured image selection
- Booking management — view all, update status (pending → confirmed → cancelled)
- Contact message inbox with read/unread tracking
- Testimonials management per property (add, toggle active, delete)

### Airbnb iCal Sync
- **Export:** `/api/calendar/[slug]` generates a `.ics` feed for each property (Airbnb imports this)
- **Import:** Admin can save an Airbnb `.ics` URL per property (`airbnbIcsUrl` field); availability checker fetches and parses it to block those dates

### Email Notifications (Hostinger SMTP via `src/lib/email.ts`)
Sends from `customerservice@haveninlipa.com` using Nodemailer + Hostinger SMTP.

| Trigger | Recipient | Content |
|---|---|---|
| Guest submits booking | Admin | Full guest details + payment method |
| Guest submits booking | Booker | Acknowledgment — pending payment verification |
| Admin confirms booking | Booker | Full booking confirmation with stay summary |
| Admin confirms booking | Admin | Confirmation summary with guest contact |

---

## Important Decisions & Context

- **No brand name in public-facing copy** — use generic phrasing like "our properties" instead of "CedCas Properties" in body text (the logo handles branding)
- **One generic QR per payment method** — a single `gcash.jpg` and a single `bpi.png` in `public/qr/` are used for every property (no per-property variants). Scales to any new property without QR work. SRI verification uses one hash per method (`NEXT_PUBLIC_QR_HASH_GCASH`, `NEXT_PUBLIC_QR_HASH_BPI`); rotating a QR requires regenerating the hash and redeploying.
- **Mobile-first QR payment UX** — booker is assumed to be on a single mobile device. The QR card in `src/components/booking/PaymentQR.tsx` provides a "Save QR to Photos" button (capability-based fallback chain: Web Share API → `<a download>` → long-press hint), a tap-to-copy amount chip, and numbered step-by-step instructions tailored per payment method.
- **Testimonials are per-property** — moved from site-wide to property-level; each property has its own testimonials tab in admin
- **Hostinger SMTP over Resend** — migrated from Resend to Nodemailer/Hostinger SMTP (`customerservice@haveninlipa.com`) because Resend was restricted to the old `cedcasproperties.com` domain and could not send from `haveninlipa.com` without domain verification. Transporter is created at runtime (not module-level) to avoid Vercel build-time initialization errors. Requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in Vercel env vars.
- **`.npmrc`** — present to handle peer dependency issues

---

## Unified Role Model (added 2026-09-17, DEC-018)

As of the 2026-09-17 workspace consolidation, this repository is the single authoritative
workspace for HIL's web/application, WordPress/blog, SEO governance, content workflows,
accessibility/QA, security/privacy/compliance, deployment, and technical documentation.
Work is organized as **coordinated responsibilities, not separate agents or workspaces**
— one person (Cedric, assisted by Claude) carries all of them, and a single change
routinely touches several at once. Naming them exists so nothing gets silently skipped,
not to create a division of labor.

1. **Product and HIL Operations Owner** (Cedric) — final say on scope, publishing,
   pricing/policy facts, and every Owner-only action tracked in
   `About HIL/HIL_PROJECT_STATUS.md` (Airbnb sibling cross-link unlink, GBP/GA4 console
   confirmations, WordPress scheduling/publishing, designating a safe test booking,
   `main` branch protection). Claude never takes an Owner-only action on Cedric's behalf.
2. **WordPress / Blog Engineer** — `blog.haveninlipa.com`: WordPress core configuration,
   the Yoast → `hil-seo` cutover (`About HIL/HIL_DECISIONS.md` → Migrated SEO Decisions,
   `SEO-DEC-019`–`025`), LiteSpeed Cache / Site Kit / EWWW / YARPP / Redirection plugin
   behavior, and this repo's custom plugin *source* (`blog/plugin/hil-expose-focuskw.php`,
   `hil-stay-match.php`, `hil-seo`'s packaged builds in `content/seo/runs/`). **Never
   edits WordPress core.** Note HIL's blog is plain WordPress, not a GeneratePress child
   theme — don't import theme-layer conventions from other projects.
3. **Vercel / Application Engineer** — the Next.js app: booking flow, admin panel,
   Prisma/MySQL, Vercel deploys, CI (`.github/workflows/`). Owns the Hard Constraints
   implicit in `About HIL/HIL_DECISIONS.md` (DEC-001 through DEC-017).
4. **Technical SEO Engineer** — URL/permalink structure, redirects, canonicals,
   robots/noindex behavior, sitemaps, and schema/JSON-LD correctness across **both**
   `haveninlipa.com` and `blog.haveninlipa.com`. Owns the technical sections of
   `docs/HIL_SEO_SPECIFICATION.md` and `About HIL/HIL SEO Technical Specification.md`.
5. **SEO Content Workflow Engineer** — blog briefs, outlines, on-page copy, internal
   linking, Stay Match intent enrollment (`_hil_stay_intent`) — gated by the direct
   WordPress editing rule (`SEO-DEC-009`/`SEO-DEC-010`: modify stays published, create is
   always a draft, `WP_ALLOW_PUBLISH=false`) and never ahead of an approval gate recorded
   in `docs/HIL_SEO_SPECIFICATION.md`.
6. **Accessibility and QA Engineer** — manual browser/keyboard verification (e.g. the
   still-open `/faq` check in `HIL_PROJECT_STATUS.md`), image alt text coverage, mobile
   layout/CLS regressions (e.g. the sticky booking bar). HIL has no formally adopted
   accessibility standard documented yet — treat WCAG 2.2 AA as the working target until
   the Owner adopts one explicitly, and say so rather than implying a standard exists.
7. **Security, Privacy, and Compliance Reviewer** — secrets/credentials handling (`.env`
   never committed, WordPress Application Passwords held outside Dropbox), guest
   PII/payment-terminology rules (`SEO-DEC-013`–`018`), and the sensitive-data
   restrictions documented in `content/seo/README.md`.
8. **Deployment and Release Engineer** — the standing reminder that **a merge to `main`
   is not a deploy** ([DEC-006](About%20HIL/HIL_DECISIONS.md)) — verify the live URL and
   the Vercel deployments API, not just the merge. Owns the CI/production build
   separation ([DEC-017](About%20HIL/HIL_DECISIONS.md)) and the open branch-protection gap
   on `main`.
9. **Technical Documentation Owner** — keeps `About HIL/*`, `docs/HIL_SEO_SPECIFICATION.md`,
   and `content/seo/` internally consistent and current. Owns the Session Wrap-up
   Protocol below.

### Mandatory impact review before calling anything complete

Before considering any change finished, check it against every row below that plausibly
applies — most non-trivial changes touch more than one. This review does not expand
scope — it is a checklist for what to verify, not license to do unrequested work in any
of these dimensions.

| Dimension | Check |
|---|---|
| Application/web behavior | Does this respect the architecture recorded in `About HIL/HIL_DECISIONS.md` (DEC-001–017)? Any change to booking, availability, pricing, or admin logic reviewed against the relevant `DEC-###`? |
| WordPress/blog behavior | Any Yoast/`hil-seo`/LiteSpeed/plugin-state change? Does it stay inside the approved cutover sequence in `docs/HIL_SEO_SPECIFICATION.md` §3 — no unauthorized step skipped or reordered? |
| SEO | Any URL, redirect, canonical, meta, robots, or schema change on either site? Does it stay inside `docs/HIL_SEO_SPECIFICATION.md`'s approval gates? |
| Content | Any guest-facing wording change? Does it respect the compliance-sensitive boundaries in `SEO-DEC-013`–`018` (payment terminology, deposit/ID silence, no arrival-procedure detail, no rebooking-offer language)? |
| Accessibility | Alt text, focus/keyboard behavior, mobile layout/CLS, contrast — see role 6 above. |
| Security/privacy/compliance | Any secret, credential, guest PII, or sensitive export touched or logged? Does a `content/seo/` addition respect its sensitive-data restrictions? |
| Analytics and measurement | Does this affect GA4 events, the `Listing` dimension, or `stay_match_view`/`stay_match_click`? Is any GA4 claim checked against the 2026-08-09 collection-gap boundary (`docs/HIL_SEO_SPECIFICATION.md` §14) before being treated as valid? |
| Testing/validation | Have relevant checks run (`npm run lint`, typecheck, `npm test`, `npm run build:app`)? For a booking/payment change, has it been verified against a safe, non-real-guest path? |
| Deployment/release state | Does the reply distinguish "committed" from "merged to `main`" from "confirmed live" (DEC-006)? Is a manual Owner step being handed off explicitly? |
| Documentation/governance | Does `HIL_PROJECT_STATUS.md`, `HIL_DECISIONS.md`, `HIL_COMPLETION_LOG.md`, `HIL Commits.md`, or `docs/HIL_SEO_SPECIFICATION.md` need updating per the rules in this file? |
| HIL/PinasBNB boundary impact | Does this touch anything that could blur `haveninlipa.com` / `blog.haveninlipa.com` and `haven-in-lipa.pinasbnb.pro`'s separation, or misrepresent HIL as an independent external PinasBNB customer? If PinasBNB is referenced at all, flag it — this boundary is not yet documented as a `DEC-###` (see `docs/HIL_SEO_SPECIFICATION.md` §1). |

## Documentation & Context Loading (read this first)

The HIL technical record in `About HIL/` is a **layered documentation system** (est. 2026-09-06). Load progressively — never pull in a larger historical source when a smaller authoritative one already answers the question:

1. Read [HIL_PROJECT_STATUS.md](About%20HIL/HIL_PROJECT_STATUS.md) — current state, what's in progress, blocked, next.
2. Read [HIL_DECISIONS.md](About%20HIL/HIL_DECISIONS.md) — durable *why* behind the architecture, so you don't re-litigate a settled decision.
3. Read only the relevant section(s) of the applicable spec — [Website](About%20HIL/HIL%20Website%20Technical%20Specification.md) / [SEO](About%20HIL/HIL%20SEO%20Technical%20Specification.md) / [Blog](About%20HIL/HIL%20Blog%20Technical%20Specification.md) — for *how* the current system works. Read Blog/SEO specs only when the task crosses those boundaries.
4. Check [HIL_COMPLETION_LOG.md](About%20HIL/HIL_COMPLETION_LOG.md) only if you need historical confirmation that something already shipped.
5. Inspect GitHub/code/[HIL Commits.md](About%20HIL/HIL%20Commits.md) only when needed to resolve ambiguity, validate current implementation, or do the requested work — this does not license skipping source-code inspection when implementation safety requires it.

The index at [HIL Technical Specification.md](About%20HIL/HIL%20Technical%20Specification.md) lists all five layers with full paths.

## Session Wrap-up Protocol

**Trigger phrase:** when the user says **"We're done for today"** (or a close variant), run these actions — no other input needed:

1. **Update the docs in `About HIL/`** — these are the durable technical record; keep them in sync with the code. The SEO developer has **live read access to `About HIL/*`**, so an update here reaches them without any extra sharing step. Note the folder is **gitignored** (`.gitignore:47`) — it is intentionally not versioned, so nothing here appears in a commit or PR. Order matters — update in this sequence so `HIL_PROJECT_STATUS.md` reflects the final state:

   a. **[HIL Commits.md](About%20HIL/HIL%20Commits.md)** — append **every commit pushed to `main` since the last logged hash**, newest at the top, with its **Type** (`HIL Website` / `HIL Blog` / `HIL SEO`, or a combination). Get them with `git log --oneline <last-logged-hash>..main`. Include the *why* in parentheses, not just the subject line. Flag merge commits with their `git revert -m 1 <hash>` rollback.
   b. **The relevant focused spec** — [Website](About%20HIL/HIL%20Website%20Technical%20Specification.md), [SEO](About%20HIL/HIL%20SEO%20Technical%20Specification.md), or [Blog](About%20HIL/HIL%20Blog%20Technical%20Specification.md) — only if the current *implementation* changed. Add/update only the sections this session touched. Don't rewrite a whole file — surgically update the affected sections, include `src/...` paths, and record gotchas/false positives, not just what shipped. Refresh that document's `> **Last updated:**` stamp. This file describes **how the system works now** — not a status log; if something is a completed phase or a queued next step, it belongs in (c) or (d) below instead.
   c. **[HIL_DECISIONS.md](About%20HIL/HIL_DECISIONS.md)** — only if a durable, cross-session decision was actually made this session (not every implementation choice — see the file's own header for what qualifies). Add a new `DEC-NNN` entry.
   d. **[HIL_COMPLETION_LOG.md](About%20HIL/HIL_COMPLETION_LOG.md)** — add a concise entry if a meaningful work package/feature was completed this session. Don't log every commit — group into the logical feature.
   e. **[HIL_PROJECT_STATUS.md](About%20HIL/HIL_PROJECT_STATUS.md)** — update **last**, so it reflects the final current state: move finished items to Recently Completed, update In Progress / Blocked / Next, and re-set the Active Gate if it changed. Keep it under ~100 lines — this file must never accumulate history.
   f. [HIL Technical Specification.md](About%20HIL/HIL%20Technical%20Specification.md) normally needs no change — only touch it if a whole new spec document is added or retired. ⛔ **Do not add a `## Recent Commits` block to it** — that block was deliberately retired.

2. **Save a "session handoff" memory**
   - Write a `project`-type memory named `session-handoff.md` (overwrite any previous one — only the latest matters).
   - Body should answer: *what did we ship, what's half-done, what's queued next, any gotchas in the working tree* (uncommitted changes, migrations not yet run on prod, etc.).
   - Also note the deploy state: whether the session's work has been committed/pushed, **whether it is actually live on production** (a merge to `main` is not a deploy — see [DEC-006](About%20HIL/HIL_DECISIONS.md)), and what manual steps still need doing — seed scripts, GSC indexing requests, WordPress-side edits, owner fact-checks.

Both actions are part of the same "end of session" commit — don't ask for confirmation, just do them when the trigger phrase appears.

---

## Upcoming Features (Planned)

See [HIL Upcoming Features.md](About%20HIL/HIL%20Upcoming%20Features.md) for dated pointers to in-progress feature plans, and [HIL Punch List.md](About%20HIL/HIL%20Punch%20List.md) (pre-launch, mostly historical — the site has since launched) for the original launch checklist. High-priority items from the original roadmap, status as of 2026-09-06 (see [HIL_COMPLETION_LOG.md](About%20HIL/HIL_COMPLETION_LOG.md) for when/how the shipped ones landed):
1. ✅ **Stripe** as 3rd payment option (with 6% fee notice) — shipped
2. ✅ **Discount Code System** (fixed PHP or percentage) — shipped
3. ✅ **Daily Rate Flexibility** (weekday/weekend + date overrides) — shipped
4. ✅ **Calendar View** for admin showing availability, daily rates, and blocks — shipped as `/admin/calendar` (2026-08-06); does not show guest names on the grid the way the original spec envisioned
5. ⏳ **Membership Portal** (returning guest login, booking history, wishlist, loyalty points) — not started; see [HIL Upcoming Features.md](About%20HIL/HIL%20Upcoming%20Features.md) for the related Guest Portal / KYC planning note
6. ⏳ **Guest Reviews & Ratings** — not started as a guest-facing feature (admin-authored `Testimonial` rows exist today, but there is no guest self-service review/rating flow)

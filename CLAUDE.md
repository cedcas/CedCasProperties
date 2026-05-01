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

## Session Wrap-up Protocol

**Trigger phrase:** when the user says **"We're done for today"** (or a close variant), run these two actions — no other input needed:

1. **Update [About HIL/HIL Technical Specification.md](About%20HIL/HIL%20Technical%20Specification.md)**
   - This file is the durable technical record of the system. Keep it in sync with the code.
   - Add/update sections that cover what changed this session: new models, new routes, new admin pages, new env vars, new crons, new libs, retired code, migration steps.
   - Don't rewrite the whole file — surgically update the affected sections. Include file paths (`src/...`) so future devs can jump to code.
   - If the file doesn't exist yet, create it with a full technical snapshot of the current codebase state.

2. **Save a "session handoff" memory**
   - Write a `project`-type memory named `session-handoff.md` (overwrite any previous one — only the latest matters).
   - Body should answer: *what did we ship, what's half-done, what's queued next, any gotchas in the working tree* (uncommitted changes, migrations not yet run on prod, etc.).
   - Also note the deploy state: whether the session's work has been committed/pushed, and what manual steps (e.g. seed scripts) still need to run on prod.

Both actions are part of the same "end of session" commit — don't ask for confirmation, just do them when the trigger phrase appears.

---

## Upcoming Features (Planned)

See [CCP Upcoming Features.md](CCP Upcoming Features.md) for the full roadmap. High-priority items:
1. **Stripe** as 3rd payment option (with 6% fee notice)
2. **Discount Code System** (fixed PHP or percentage)
3. **Daily Rate Flexibility** (weekday/weekend + date overrides)
4. **Calendar View** for admin showing guest names, availability, daily rates
5. **Membership Portal** (returning guest login, booking history, wishlist, loyalty points)
6. **Guest Reviews & Ratings**

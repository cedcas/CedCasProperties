# CedCas Properties — Claude Context

## Project Overview

CedCas Properties is a full-stack property rental website for a short-term rental business based in Lipa City, Batangas, Philippines. It is a direct-booking alternative to Airbnb — guests can browse listings, view photo galleries, pick dates, and book with QR-based payment (GCash or BPI). An admin panel lets the owner manage listings, images, and bookings.

**Live URL:** `dev.cedcasproperties.com`
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
| Email | Resend API (`noreply@cedcasproperties.com`) |
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
| `NEXTAUTH_URL` | App base URL (e.g. `https://dev.cedcasproperties.com`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob storage token |
| `RESEND_API_KEY` | Resend API key for transactional email |

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
    gcash.jpg                         # Default GCash QR
    gcash-1br.jpg                     # 1BR-specific GCash QR
    gcash-2br.jpg                     # 2BR-specific GCash QR
    bpi.png                           # Default BPI QR
    bpi-1br.png                       # 1BR-specific BPI QR
    bpi-2br.png                       # 2BR-specific BPI QR
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

### Email Notifications (Resend)
| Trigger | Recipient | Content |
|---|---|---|
| Guest submits booking | Admin | Full guest details + payment method |
| Guest submits booking | Booker | Acknowledgment — pending payment verification |
| Admin confirms booking | Booker | Full booking confirmation with stay summary |
| Admin confirms booking | Admin | Confirmation summary with guest contact |

---

## Important Decisions & Context

- **No brand name in public-facing copy** — use generic phrasing like "our properties" instead of "CedCas Properties" in body text (the logo handles branding)
- **QR codes are per-property** — `gcash-1br.jpg`, `bpi-1br.png`, etc. in `public/qr/`; updating requires a new git commit + deploy
- **Testimonials are per-property** — moved from site-wide to property-level; each property has its own testimonials tab in admin
- **Resend over SMTP** — switched from nodemailer/SMTP to Resend API to fix Vercel build-time initialization errors
- **`.npmrc`** — present to handle peer dependency issues

---

## Upcoming Features (Planned)

See [CCP Upcoming Features.md](CCP Upcoming Features.md) for the full roadmap. High-priority items:
1. **Stripe** as 3rd payment option (with 6% fee notice)
2. **Discount Code System** (fixed PHP or percentage)
3. **Daily Rate Flexibility** (weekday/weekend + date overrides)
4. **Calendar View** for admin showing guest names, availability, daily rates
5. **Membership Portal** (returning guest login, booking history, wishlist, loyalty points)
6. **Guest Reviews & Ratings**

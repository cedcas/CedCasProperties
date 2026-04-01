# HavenInLipa

A modern property rental platform built with Next.js, Prisma, and MySQL. Enables property listing, booking management, and admin controls for HavenInLipa.

[![CI](https://github.com/cedcas/CedCasProperties/actions/workflows/ci.yml/badge.svg)](https://github.com/cedcas/CedCasProperties/actions/workflows/ci.yml)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **ORM**: Prisma with MySQL
- **Auth**: NextAuth.js
- **Storage**: Vercel Blob
- **Email**: Resend / Nodemailer
- **Deployment**: Vercel

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Admin dashboard
│   ├── api/                # API routes
│   ├── properties/         # Property listing & detail pages
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/
│   ├── admin/              # Admin-specific components
│   ├── booking/            # Booking flow components
│   ├── sections/           # Page section components
│   └── ui/                 # Shared UI components
└── lib/                    # Utility functions & shared logic

prisma/
├── schema.prisma           # Database schema
└── seed.ts                 # Database seed script

public/                     # Static assets
.github/
└── workflows/
    └── ci.yml              # CI/CD pipeline (lint + type-check + build)
```

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — deployed to Vercel automatically |
| `dev` | Integration branch — all features merge here first |
| `feature/*` | Individual feature work — branch off `dev` |
| `fix/*` | Bug fixes — branch off `dev` (or `main` for hotfixes) |

**Workflow:**
1. Create a `feature/<name>` branch from `dev`
2. Open a PR targeting `dev`
3. CI must pass (lint, type-check, build) before merging
4. Periodically, `dev` is merged to `main` for a production release

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL database
- `.env.local` file (see below)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string |
| `NEXTAUTH_SECRET` | Random 32+ char string (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Base URL of the app (`http://localhost:3000` for local) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for image uploads |
| `RESEND_API_KEY` | Resend API key for transactional email |

### Development

```bash
npm install
cp .env.example .env.local   # fill in your values
npx prisma db push
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed Database

```bash
npm run seed
```

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Type Check

```bash
npm run typecheck
```

### Format

```bash
npm run format          # format all files
npm run format:check    # check formatting without writing
```

## CI/CD

GitHub Actions runs on every push and PR to `main` and `dev`:

| Job | What it checks |
|-----|---------------|
| **Lint** | ESLint rules pass |
| **Type Check** | TypeScript compiles without errors |
| **Build** | Prisma generate + Next.js production build succeeds |

All three jobs must pass before a PR can be merged.

## Environments

| Environment | Branch | URL | Database |
|-------------|--------|-----|----------|
| **Production** | `main` | Vercel production domain | Hostinger MySQL (production) |
| **Development** | local | `http://localhost:3000` | Local MySQL or Hostinger dev DB |

### Production Deployment (Vercel)

Vercel is connected to the `main` branch. Pushes to `main` trigger an automatic deployment.

**Required Vercel environment variables** (set in the Vercel project dashboard):

- `DATABASE_URL` — production Hostinger MySQL URL
- `NEXTAUTH_SECRET` — production secret (different from local)
- `NEXTAUTH_URL` — production domain (e.g. `https://haveninlipa.com`)
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token
- `RESEND_API_KEY` — Resend key

**To deploy manually** (if needed):

```bash
npm i -g vercel
vercel --prod
```

### Staging

There is no dedicated staging environment. Use Vercel preview deployments for testing:
- Any PR or push to `dev` automatically generates a Vercel preview URL.
- Preview deployments inherit production environment variables by default — configure separate preview vars in the Vercel dashboard if isolation is needed.

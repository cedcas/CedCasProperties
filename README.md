# CedCas Properties

A modern property rental platform built with Next.js, Prisma, and MySQL. Enables property listing, booking management, and admin controls for CedCas Properties.

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
    └── ci.yml              # CI/CD pipeline (lint + build)
```

## Branching Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production — deployed to Vercel |
| `dev` | Integration branch — all features merge here first |
| `feature/*` | Individual feature work — branch off `dev` |
| `fix/*` | Bug fixes — branch off `dev` (or `main` for hotfixes) |

**Workflow:**
1. Create a `feature/<name>` branch from `dev`
2. Open a PR targeting `dev`
3. After review and CI passing, merge to `dev`
4. Periodically, `dev` is merged to `main` for a production release

## Getting Started

### Prerequisites

- Node.js 20+
- MySQL database
- `.env.local` file (see below)

### Environment Variables

```env
DATABASE_URL=mysql://user:password@localhost:3306/cedcas
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
RESEND_API_KEY=your-resend-key
```

### Development

```bash
npm install
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

## CI/CD

GitHub Actions runs on every push and PR to `main` and `dev`:

- **Lint**: ESLint check
- **Build**: Prisma generate + Next.js production build

Deployments to production are handled automatically by Vercel on merge to `main`.

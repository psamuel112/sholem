# TPI Homes and Properties

Real estate website for TPI Homes and Properties Limited, built as a Next.js frontend
backed by Strapi 5 as the content management system. Administrators manage every piece
of site content — properties, services, homepage sections, company info and inquiries —
from the Strapi admin panel without touching frontend code.

```
tpi-homes/
├── backend/     Strapi 5 CMS (content types, admin panel, REST API, media library)
├── frontend/    Next.js 15 App Router site (TypeScript, Tailwind CSS v4)
└── tools/       Content extraction helper used to seed the CMS
```

## Stack

| Layer    | Technology                                              |
| -------- | ------------------------------------------------------- |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend  | Strapi 5, SQLite (dev) / PostgreSQL (production)        |
| Icons    | lucide-react                                            |
| Rendering| ISR — static pages revalidated on a timer               |

---

## Local development

Requires Node.js 20+ (Node 22 recommended) and npm.

### 1. Backend (Strapi)

```bash
cd backend
npm install
cp .env.example .env      # then fill in the secrets, see below
npm run develop           # http://localhost:1337/admin
```

On first run Strapi asks you to create an admin user. Generate the required secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

`backend/.env` keys:

| Variable | Purpose |
| -------- | ------- |
| `HOST`, `PORT` | Bind address (defaults `0.0.0.0:1337`) |
| `APP_KEYS` | Comma-separated session keys (4 recommended) |
| `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY` | Strapi secrets — unique per environment |
| `DATABASE_CLIENT` | `sqlite` locally, `postgres` in production |
| `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`, `DATABASE_SSL` | PostgreSQL connection |
| `DATABASE_FILENAME` | SQLite path (default `.tmp/data.db`) |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed to call the API |
| `INQUIRY_NOTIFICATION_EMAIL` | Where new inquiry notifications are logged/sent |

**Seeding.** `npm run seed` populates the CMS from `backend/data/site-content.json`
(properties, services, posts, cities, property types, features, homepage, about page and
global settings) and uploads the accompanying images into the media library. The script is
idempotent — it matches on slug, so re-running updates rather than duplicates.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev               # http://localhost:3000
```

`frontend/.env.local` keys:

| Variable | Purpose |
| -------- | ------- |
| `NEXT_PUBLIC_STRAPI_URL` | Strapi base URL, e.g. `http://localhost:1337` |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL — drives SEO metadata and the sitemap |
| `NEXT_PUBLIC_REVALIDATE` | ISR window in seconds (default `60`) |
| `STRAPI_API_TOKEN` | Optional read-only token if the Public role is locked down |
| `NEXT_PUBLIC_GA_ID` | Optional Google Analytics measurement ID |

Start Strapi before the frontend — pages fetch their content at build/request time.

---

## Content management

Everything editable lives in the Strapi admin at `/admin`.

### Collection types

| Type | What editors control |
| ---- | -------------------- |
| **Property** | Title, slug, location, city, property type, offer type, price, size, bedrooms/bathrooms, description, features, gallery, documents (C of O etc.), featured flag, SEO fields |
| **Service** | Title, slug, summary, description, icon, image, bullet points, CTA, display order |
| **Post** | News/updates — title, slug, excerpt, cover image, body, author |
| **City**, **Property type**, **Offer type**, **Feature** | Taxonomies powering the listing filters |
| **Inquiry** | Read-only capture of website submissions (name, email, phone, message, type, related property/service, status) |

### Single types

| Type | What editors control |
| ---- | -------------------- |
| **Homepage** | Hero slides, intro copy, "why choose us" points, stats, featured property/service selection, CTA band |
| **About page** | Story, mission, vision, core values, company details |
| **Global** | Site name, tagline, logo, phone numbers, email, WhatsApp number, office address and hours, social links, Google Maps embed |

Publish/unpublish works through Strapi's draft & publish. Unpublished entries never
reach the public API, so they disappear from the site until published again.

### Adding a property

1. **Content Manager → Property → Create new entry**
2. Fill the details, pick a city / property type / offer type, upload gallery images
3. Tick **Featured** to surface it on the homepage
4. **Save**, then **Publish**

The new listing appears once the ISR window elapses (default 60s) or after a redeploy.

### Inquiries

Form submissions POST to `/api/inquiries` and are stored as Inquiry entries, viewable in
the admin with a status field for triage. The frontend also offers WhatsApp and
`mailto:` fallbacks, so leads still land even if the API is unreachable. Set
`INQUIRY_NOTIFICATION_EMAIL` to get notified of new submissions.

Public write access is limited to `create` on this one collection — inquiries cannot be
listed, read, updated or deleted through the public API.

---

## Deployment

### Strapi backend

Strapi needs a persistent filesystem or object storage, so deploy it as a long-running
service (Railway, Render, Fly.io, DigitalOcean App Platform or a VPS) — not to a
serverless platform.

1. Provision a PostgreSQL database and set `DATABASE_CLIENT=postgres` plus the connection
   variables. Enable `DATABASE_SSL=true` for managed providers.
2. Set all Strapi secrets to fresh production values — never reuse development keys.
3. Set `CORS_ORIGINS` to your production frontend origin(s).
4. Build and start:
   ```bash
   npm ci && npm run build && npm run start
   ```
5. Configure media storage. The default local provider loses uploads on redeploy for
   ephemeral filesystems, so install a provider such as
   `@strapi/provider-upload-cloudinary` or `@strapi/provider-upload-aws-s3` and configure
   it in `config/plugins.js`.
6. Create the admin user on first boot, then set Public role permissions to `find` and
   `findOne` for the content types plus `create` on Inquiry.

### Next.js frontend

Deploy to Vercel, Netlify or any Node host.

1. Set the root directory to `frontend`
2. Environment variables: `NEXT_PUBLIC_STRAPI_URL` (production Strapi URL),
   `NEXT_PUBLIC_SITE_URL` (production domain), plus `STRAPI_API_TOKEN` and
   `NEXT_PUBLIC_GA_ID` if used
3. Build command `npm run build`, start command `npm run start`
4. Add your Strapi/CDN hostname to `images.remotePatterns` in `next.config.ts` so
   `next/image` will optimise CMS media

### Domain, SSL and DNS

Point the apex/`www` record at the frontend host and a subdomain such as
`cms.yourdomain.com` at Strapi. Both Vercel and the managed backend hosts issue and renew
Let's Encrypt certificates automatically; on a VPS use Certbot with nginx as a reverse
proxy. Update `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STRAPI_URL` and `CORS_ORIGINS` to the
real hostnames once DNS resolves.

### Post-deploy checklist

- [ ] Homepage, listings, property detail, services, about, contact and news all load
- [ ] Property images render (correct `remotePatterns` and upload provider)
- [ ] Filters on `/properties` return expected results
- [ ] Contact and property-request forms create Inquiry entries in the admin
- [ ] WhatsApp and phone links open correctly on a real mobile device
- [ ] `/robots.txt` and `/sitemap.xml` return production URLs
- [ ] Submit the sitemap to Google Search Console
- [ ] Publishing a change in Strapi appears on the site after the ISR window
- [ ] Layout checked at 375px, 768px, 1024px and 1440px widths

---

## Useful commands

```bash
# Frontend
npm run dev            # dev server
npm run build          # production build
npm run start          # serve the build
npm run lint           # eslint
npx tsc --noEmit       # typecheck

# Backend
npm run develop        # dev with autoreload
npm run build          # build the admin panel
npm run start          # production server
npm run seed           # seed/refresh CMS content
```

## Implementation notes

- **Rendering.** Pages use ISR via `export const revalidate`. Content edits go live
  without a redeploy. `/properties` is dynamic because it reads filter search params.
- **SEO.** Per-page metadata with Open Graph tags, `generateStaticParams` for
  property/service/post routes, a sitemap generated from CMS content, `robots.txt`,
  semantic HTML and alt text sourced from the media library.
- **Resilience.** `lib/strapi.ts` fetch helpers return `null` or empty arrays on failure
  so a CMS outage renders empty states rather than a broken page.
- **Accessibility.** Skip link, labelled form fields with inline validation messages,
  `aria-current` on active navigation, keyboard-accessible gallery and mobile drawer,
  and visible focus rings.

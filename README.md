# Prestige Motors Showroom

Production-ready used-car showroom and sales operations platform built with Next.js, TypeScript, Tailwind CSS, Prisma, Neon PostgreSQL, Cloudinary, Google Gemini, NextAuth, and optional Resend email delivery.

The public site helps buyers discover, compare, finance, and enquire about vehicles. The protected admin workspace turns those interactions into organised leads, appointments, appraisals, alerts, and measurable follow-up.

## Customer Conversion Suite

- Responsive showroom with search, filters, sorting, loading and empty states, SEO metadata, sitemap, structured vehicle data, and detailed photo galleries.
- Browser-based saved shortlist and a side-by-side comparison workspace for up to four vehicles.
- Finance calculator for indicative deposit, loan term, interest, monthly payment, and total repayment estimates.
- Test-drive and showroom appointment booking with live availability and collision-safe slot validation.
- Trade-in appraisal requests with vehicle details, condition notes, and supporting image uploads.
- New-stock and price-drop alerts with confirmation, unsubscribe support, and customer contact preferences.
- Inventory-aware Gemini buyer assistant with a resilient rule-based fallback when Gemini is not configured.
- AI-to-CRM lead handoff, so a buyer can share contact details without leaving the assistant flow.
- Vehicle trust packs with inspection state, ownership and service information, supporting documents, and downloadable PDF reports for verified vehicles.
- Enquiry, phone, WhatsApp, gallery, shortlist, comparison, finance, booking, trade-in, alert, AI, and trust-report conversion tracking.

Finance results are estimates only and are not lending offers. Trust information is displayed only from the data entered and verified by the dealership.

## Admin and CRM Workspace

- NextAuth credentials login backed by Prisma administrators.
- Inventory management for creating, editing, deleting, and changing vehicle availability, with price-history recording.
- Drag-and-drop multi-image upload with previews, MIME and size validation, Sharp WebP optimisation, and Cloudinary delivery in production.
- Enquiry management with status updates and deletion.
- Lead pipeline with source, priority, status, assignment, notes, and next-follow-up scheduling.
- Appointment workspace for test drives and showroom visits, including confirmation and status management.
- Trade-in appraisal queue for reviewing submissions, images, values, and appraisal progress.
- Stock-alert subscriptions and an in-app notification centre for new leads, appointments, trade-ins, follow-ups, and matches.
- Sales analytics covering acquisition and conversion events, funnel performance, customer contact actions, and vehicle engagement.
- Trust-pack editor for inspection status, highlights, service and ownership details, warranty information, and supporting documents.

## Automation and Notifications

`vercel.json` schedules one authenticated engagement job at `01:00 UTC` every day, which is `09:00 Malaysia Time (MYT, UTC+8)`. The job:

- creates admin reminders for leads whose follow-up time is due;
- reminds customers about confirmed appointments occurring within the next 24 hours;
- finds matching newly listed vehicles and recorded price drops for active alerts;
- sends configured email notifications and records the outcome in the admin notification centre.

Set `CRON_SECRET` in Vercel so scheduled requests can authenticate with `/api/cron/engagement`. Do not expose this endpoint secret in browser code.

Resend delivery is optional. When `RESEND_API_KEY` and a verified `ALERT_FROM_EMAIL` sender are configured, the application can send transactional emails for leads, enquiries, appointments, trade-ins, and stock alerts. Without Resend, submissions are still saved and surfaced to administrators for manual follow-up.

Email alerts are sent automatically when email delivery is configured. Selecting SMS or WhatsApp currently records the customer's preferred contact method and creates a manual-follow-up notification; the application does not send SMS or WhatsApp messages automatically until a compatible messaging provider is integrated.

## Architecture

- **Vercel:** hosts the Next.js application, API routes, server-side rendering, scheduled engagement job, and deployment pipeline.
- **Neon PostgreSQL:** stores administrators, inventory, enquiries, leads, appointments, trade-ins, alerts, notifications, analytics, price history, and trust-pack data.
- **Cloudinary:** provides durable production storage and delivery for vehicle and trade-in images. Local development can fall back to local file storage.
- **Google Gemini:** powers contextual inventory answers in the buyer assistant when configured; a local recommendation fallback keeps the assistant usable without an API key.
- **Resend:** optionally delivers transactional and alert email from a verified sender domain.

## Tech Stack

- Next.js App Router, React, and TypeScript
- Tailwind CSS
- Prisma ORM and PostgreSQL
- NextAuth credentials authentication
- Vercel AI SDK and Google Gemini
- Cloudinary and Sharp image optimisation
- Resend REST API email delivery
- PDF-lib trust-report generation
- Zod validation

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env
```

On PowerShell, use `Copy-Item .env.example .env` instead.

3. Start PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

4. Apply the committed migrations and seed the administrator and sample data:

```bash
npm run db:deploy
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Start from `.env.example`. Use separate secrets for local, preview, and production environments, and store production values in Vercel rather than committing an environment file.

### Core production configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL connection used by the running application. |
| `DIRECT_URL` | Neon direct PostgreSQL connection used by Prisma migrations. |
| `NEXTAUTH_URL` | Exact deployed HTTPS origin. |
| `NEXTAUTH_SECRET` | Strong random secret of at least 32 characters. |
| `NEXT_PUBLIC_SITE_URL` | Public deployed origin used for links, metadata, reports, and emails. |
| `ADMIN_EMAIL` | Administrator email created or updated by the seed step. |
| `ADMIN_PASSWORD` | Strong administrator password used by the seed step. |
| `DEALER_NAME` | Dealership name shown across the site and messages. |
| `DEALER_PHONE` | Customer-facing telephone number. |
| `DEALER_WHATSAPP` | Customer-facing WhatsApp number, including country code. |
| `DEALER_EMAIL` | Customer-facing and internal notification address. |
| `CRON_SECRET` | Strong secret that protects the daily engagement endpoint. |

`DEALER_ADDRESS` and `DEALER_HOURS` are optional display details.

### Image storage

| Variable | Purpose |
| --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name. |
| `CLOUDINARY_API_KEY` | Server-side Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Server-side Cloudinary API secret. |
| `CLOUDINARY_UPLOAD_FOLDER` | Optional upload folder; defaults to the project folder in `.env.example`. |

Configure all three Cloudinary credentials for production. Vercel's filesystem is ephemeral and must not be treated as permanent upload storage.

### Optional AI and email services

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Server-side Google AI Studio key for the buyer assistant. |
| `GEMINI_MODEL` | Gemini model identifier; the example file supplies a default. |
| `RESEND_API_KEY` | Server-side Resend key for transactional email delivery. |
| `ALERT_FROM_EMAIL` | Resend sender in `Name <email@verified-domain>` format. |

Never give secrets a `NEXT_PUBLIC_` prefix. `NEXT_PUBLIC_SITE_URL` is intentionally public; database, authentication, Cloudinary, Gemini, cron, and Resend credentials are not.

## Admin Access

The seed script creates or updates one administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The values in `.env.example` are development placeholders only. Replace both before deploying, use a unique password, and rotate it immediately if it is ever exposed.

Customers see the showroom first; the admin login remains deliberately unobtrusive.

## Vercel, Neon, and Cloudinary Deployment

1. Create the Neon database and copy its pooled URL to `DATABASE_URL` and direct URL to `DIRECT_URL`.
2. Create a Cloudinary account and add its three server-side credentials. Production uploads should not rely on local fallback storage.
3. Import the GitHub repository into Vercel and add the production environment variables listed above.
4. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the final Vercel or custom-domain HTTPS origin.
5. Set a strong `CRON_SECRET`. Vercel uses it as the bearer token for the scheduled engagement request.
6. Optionally configure Gemini and Resend. Verify the sender domain before setting `ALERT_FROM_EMAIL`.
7. Deploy and smoke-test the public enquiry, assistant, booking, trade-in, alert, and administrator flows.

The configured Vercel build command is:

```bash
npm run vercel-build
```

It runs `prisma generate`, `prisma migrate deploy`, the idempotent seed/admin setup, and `next build`. Commit and review migration files before deployment, back up important production data before schema changes, and use `prisma migrate deploy` rather than `prisma migrate dev` in production. Do not run competing production deployments that may attempt schema changes at the same time.

After changing any production environment variable, redeploy so the application uses the new value. Check the Vercel build, function, and cron logs after the first deployment and after database migrations.

## Docker Deployment

The included Compose file runs PostgreSQL and the Next.js app:

```bash
docker compose up --build
```

The `web` service runs migrations and seed data before starting. Vehicle uploads are persisted in the `car-uploads` Docker volume. Resend, Gemini, and Cloudinary remain optional integrations, but durable image storage is recommended outside local development.

## Gemini Assistant Setup

The assistant works in two modes:

- With `GEMINI_API_KEY`, it answers buyer questions using the live inventory context and can hand qualified interest into the CRM.
- Without `GEMINI_API_KEY`, it returns basic rule-based vehicle suggestions so the customer flow remains available.

Create a key in [Google AI Studio](https://aistudio.google.com/), add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` to the Vercel production environment, then redeploy.

Keep the key server-side. Do not paste it into frontend code, GitHub, screenshots, or public messages. Free AI usage can have provider limits; do not ask customers to submit identity card numbers, banking information, or other sensitive documents through chat.

## Production Safety Checklist

- Use strong, unique values for `NEXTAUTH_SECRET`, `CRON_SECRET`, and the administrator password.
- Keep all `.env*` files containing real credentials out of Git.
- Use HTTPS origins for `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL`.
- Use Neon `DIRECT_URL` for migrations and the pooled `DATABASE_URL` at runtime.
- Store production images in Cloudinary, not the Vercel filesystem.
- Verify the Resend sender domain and monitor delivery before relying on automated email.
- Treat SMS and WhatsApp subscriptions as manual follow-up until a messaging provider is connected.
- Review trust-pack content before marking a vehicle verified and publishing its PDF report.
- Back up production data and review each committed Prisma migration before deploying it.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run prisma:generate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

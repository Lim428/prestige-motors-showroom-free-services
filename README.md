# Prestige Motors Showroom

Production-ready second-hand car dealership website built with Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Cloudinary uploads, Google Gemini buyer assistant, and NextAuth credentials authentication.

## Features

- Public showroom homepage with responsive vehicle cards, large imagery, search, filters, sorting, loading states, empty states, and SEO metadata.
- Vehicle detail pages with gallery, full specifications, description, features, contact button, WhatsApp link, enquiry form, related vehicles, and structured data.
- Floating AI buyer assistant that can recommend current vehicles by budget, fuel type, transmission, and buyer needs.
- Admin-only authentication with NextAuth credentials and Prisma-backed administrators.
- Admin dashboard for creating, editing, deleting, and changing vehicle status.
- Drag-and-drop multi-image upload with previews, MIME and size validation, and Sharp WebP optimization.
- Customer enquiry management with status updates and deletion.
- Secure API routes, Zod validation, Prisma schema, PostgreSQL migration, free-tier deployment support, and seed data.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- Cloudinary image uploads
- Google Gemini API assistant
- NextAuth
- Sharp image optimization
- Zod validation

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env
```

3. Start PostgreSQL with Docker:

```bash
docker compose up -d postgres
```

4. Run migrations and seed the database:

```bash
npm run db:deploy
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Admin Access

The seed script creates one administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

Default values from `.env.example`:

- Email: `admin@prestigemotors.local`
- Password: `ChangeThisAdminPassword!2026`

Change these before deploying. Customers see the showroom first; the login link is intentionally small in the top-right corner.

## Docker Deployment

The included Compose file runs PostgreSQL and the Next.js app:

```bash
docker compose up --build
```

The `web` service runs migrations and seed data before starting. Vehicle uploads are persisted in the `car-uploads` Docker volume.

## Free-Tier Deployment

This project can run on free-friendly services:

- Vercel Hobby for the Next.js website
- Neon Free for PostgreSQL
- Cloudinary Free for uploaded car photos

Create accounts on Vercel, Neon, and Cloudinary. In Vercel, import the GitHub repository and add these environment variables:

```bash
DATABASE_URL="your-neon-pooled-postgres-url"
DIRECT_URL="your-neon-direct-postgres-url"
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"
NEXTAUTH_SECRET="a-long-random-secret"
NEXT_PUBLIC_SITE_URL="https://your-vercel-domain.vercel.app"
ADMIN_EMAIL="your-admin-email"
ADMIN_PASSWORD="your-admin-password"
DEALER_NAME="Prestige Motors"
DEALER_PHONE="your-phone-number"
DEALER_WHATSAPP="your-whatsapp-number"
DEALER_EMAIL="your-email"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_UPLOAD_FOLDER="prestige-motors/cars"
GEMINI_API_KEY="your-google-ai-studio-gemini-key"
GEMINI_MODEL="gemini-3.5-flash-lite"
```

The Vercel build command runs Prisma migrations and seed/admin setup automatically:

```bash
npm run vercel-build
```

Uploaded car photos go to Cloudinary when the Cloudinary variables are present. Local development still falls back to local file storage.

For Neon, use the pooled connection string for `DATABASE_URL` and the direct connection string for `DIRECT_URL`. Prisma uses `DIRECT_URL` for migrations, which avoids migration lock timeouts on pooled connections.

## Free AI Assistant Setup

The assistant works in two modes:

- With `GEMINI_API_KEY`: it uses Gemini to answer buyer questions using your live inventory.
- Without `GEMINI_API_KEY`: it still gives basic rule-based vehicle suggestions, so the website does not break.

Step-by-step:

1. Open [Google AI Studio](https://aistudio.google.com/).
2. Sign in with your Google account.
3. Go to **Get API key**.
4. Create or copy a Gemini API key.
5. In Vercel, open your project.
6. Go to **Settings** > **Environment Variables**.
7. Add:

```bash
GEMINI_API_KEY="paste-your-key-here"
GEMINI_MODEL="gemini-3.5-flash-lite"
```

8. Make sure the environment is **Production**.
9. Save the variables.
10. Redeploy the latest deployment.

Keep the AI key only in Vercel environment variables. Do not paste it into frontend code, GitHub, screenshots, or public messages.

Free AI usage has limits and may use submitted prompts to improve the provider's products. Keep the assistant for normal buyer questions only, and do not ask customers to send identity card numbers, bank details, or private documents through the chat.

## Production Notes

- Set a strong `NEXTAUTH_SECRET`.
- Point `DATABASE_URL` to a managed PostgreSQL database.
- Set `NEXT_PUBLIC_SITE_URL` and `NEXTAUTH_URL` to the deployed origin.
- For Vercel/free-tier hosting, keep uploaded images in Cloudinary by setting the Cloudinary variables.
- Keep `GEMINI_API_KEY` server-side in Vercel only. Never expose it with a `NEXT_PUBLIC_` prefix.
- Use HTTPS in production so admin credentials and enquiry submissions are encrypted in transit.

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run db:deploy
npm run db:seed
npm run db:studio
```

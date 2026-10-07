# Libaas

**[View the live website →](https://libaasst0re.netlify.app/)**

A Kashmiri clothing storefront with a responsive catalogue, shopping bag, checkout, order tracking and an admin dashboard.

## Features

- Product variants, image galleries, saved items and stock management
- Server-validated pricing, discounts and Razorpay checkout
- Order receipts, shipment notifications and customer enquiries
- Approved admin accounts, database row-level security and signed payment webhooks
- Responsive layouts, keyboard navigation and reduced-motion support

## Stack

Next.js, React, TypeScript, GSAP, Supabase Postgres/Auth/Storage, Razorpay, Resend and Netlify. Money is stored as integer paise.

## Local development

Requires Node.js 22 or newer.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Configure the services in `.env.local`. The catalogue also runs with local content when the backend is not configured. Apply `supabase/schema.sql`, `supabase/part2.sql` and `supabase/part5.sql` in that order. Create a confirmed Supabase Auth account matching `ADMIN_EMAIL`, disable public signups, then run `npm run seed` to populate the catalogue and admin membership.

## Environment variables

All values in `.env.example` are empty. Runtime variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `ALLOW_LIVE_PAYMENTS`
- `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL`, `ADMIN_EMAIL`

Optional test configuration: `ADMIN_TEST_PASSWORD`, `TEST_EMAIL_DOMAIN`, `TEST_PHONE`, `TEST_CARD_NUMBER`, `TEST_CARD_EXPIRY`, `TEST_CARD_CVV`. Browser tests require Playwright browsers (`npx playwright install`). Payment integration tests require Razorpay Test Mode; live payments are disabled by default. Customer email requires a verified sending domain.

## Validation

```sh
npm run check
npm run test:money
npm run test:payments
npm run test:admin-data
npm run test:store-fixes
npm run shots
npm run check:secrets
```

`npm run build` builds the production app; `npm start` serves it. `npm run optimize` creates responsive images from `images/`. Browser integration tests use the configured backend; isolated transaction tests use an in-memory database.

## Hosting

The included `netlify.toml` configures the Next.js server runtime. Set the runtime environment variables in Netlify and configure the Razorpay webhook at `/api/razorpay/webhook/`. Private keys remain server-side; public access is limited by database policies and server validation.

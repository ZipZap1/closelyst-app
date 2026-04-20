# closelyst — app

Next.js 15 scaffold for the salon/clinic no-show reducer. Sibling `../landing/` is the marketing page.

**Status: scaffold only** (HAC-12). The BSP/SMS integration, reminder engine, and onboarding UI are tracked separately and will be built by the engineer hire (HAC-1 / HAC-8).

## What's here

- Next.js 15 App Router with a placeholder homepage.
- Two API route stubs that return `501 Not Implemented`:
  - `POST /api/messaging/inbound` — future webhook receiver.
  - `POST /api/messaging/send` — future template sender.
- Drizzle ORM schema in `src/db/schema/` mirroring the [HAC-11 data-model](../HAC/issues/HAC-11#document-data-model) (8 tables: tenant, location, staff, customer, booking, reminder, waitlist_entry, reply_event).
- `withTenant(tenantId, fn)` helper in `src/db/client.ts` for RLS-scoped transactions.
- Generated migration in `drizzle/` plus hand-written prelude (extensions) and RLS policy migration.

## Scripts

- `npm run dev` — Next.js dev server
- `npm run typecheck` — `tsc --noEmit`
- `npm run db:generate` — regenerate Drizzle migration from schema
- `npm run db:push` — apply schema to `DATABASE_URL`

## Environment

See `.env.example`. `DATABASE_URL` is required once the engineer hire wires real persistence.

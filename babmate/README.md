# 밥메이트

A mobile-first Korean social dining app for Seoul National University. Next.js App Router, React, TypeScript, Tailwind CSS, a shadcn-style CVA button, Lucide, and Supabase. It is for finding company over meals, not dating.

## Run

```sh
npm install
npm run dev
```

On PowerShell with script execution disabled, use `npm.cmd`. Open http://127.0.0.1:3000. With no Supabase environment variables, the app runs in clearly labeled local demo mode. Demo meals, profiles, messages, blocks, and reports are stored only in this browser. Reports in demo mode are not delivered to anyone. Use a fresh browser context or clear `babmate-demo-v1` to reset. Sample photos are illustrative; cafeteria menus, pricing, and availability are not live data.

## Architecture

- `src/components/babmate.tsx`: landing/discovery, meal details, create/edit, my meals, profile, chat and safety interactions. Screens use client state; detail/create/chat appear as accessible dialogs. There are no shareable meal URLs yet.
- `src/lib/data.ts`: domain types, realistic demo data, Seoul timezone formatting, email and attendance validation.
- `src/lib/supabase.ts`: optional browser Supabase client. Only a publishable/anon key belongs here. Never use a service-role key in public variables.
- `supabase/migrations/202611050001_initial.sql`: schema, signup trigger, RLS, transactional RPCs, grants, capacity triggers, and Realtime publication.
- Static Next.js export is served by Sites; Supabase handles identity, database transactions, and realtime. `NEXT_PUBLIC_*` values are embedded at build time, so changing them requires rebuilding and redeploying.

## Connect a real Supabase project

1. Create a fresh Supabase project. Run the migration in the SQL editor. It rejects non-`snu.ac.kr` signups and requires a confirmed auth identity for student-only operations. Apply before adding users. Use a separate migration/backfill if integrating with an existing user database.
2. Enable email authentication and email confirmation. Configure SMTP for reliable email delivery. Add the deployed origin and local development origin to Auth → URL Configuration redirect allowlist. Keep anonymous sign-in disabled. Do not use social providers or administrator auto-confirm as substitutes for school-email verification.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your project. Keep service-role credentials private.
4. Restart development or rebuild/deploy. Request an email link using a real SNU address. Authentication returns to `/` and the Supabase client handles the session. Test with at least two real SNU accounts before a club launch.
5. Chat subscribes to Realtime INSERT events and refreshes every 10 seconds as a fallback. The migration adds messages to the publication. RLS checks participant access for every read and insert. Leaving revokes access to subsequent API reads/writes; already-read messages cannot be erased from another person's memory or device.
6. Operators review `reports` through a trusted Supabase console; clients cannot read them. Assign an actual club moderator and a report-handling process before launch. There is no moderation dashboard or notification delivery service in this build.

## No-show approach

Participants can confirm from 30 minutes before to 15 minutes after the meal starts, then self-check-in from 15 minutes before to 60 minutes after. SQL enforces both windows. An easy leave action makes the seat available immediately. Hosts can cancel or edit; editing resets attendance so a changed plan cannot retain stale confirmations. Group text chat helps coordinate a specific meeting point.

These are voluntary coordination measures, not proof of physical attendance. No GPS, deposits, reliability scores, automatic seat release, push notifications, punitive bans, or voice/video calls are implemented. The interface explains the timing but does not send background reminders.

## Validation

```sh
npm run typecheck
npm test
node scripts/test-database.mjs
npm run build
npm start
# In another terminal, after installing Chromium:
npx playwright install chromium
node scripts/test-browser.mjs
```

The database suite runs the actual migration in embedded PostgreSQL (PGlite), with simulated Supabase auth roles and identities. It checks email verification, capacity enforcement, bypass prevention, chat access, leaving, cancellation, attendance, blocking, and reports. It does not validate hosted Supabase email delivery, Realtime transport, or concurrent network transactions; the last-seat strategy uses a Postgres row lock plus an insert trigger and requires a hosted concurrency smoke test before launch.

Browser checks use a fresh context against the production export on port 3001 and save screenshots under `artifacts/`. Tests cover filters, join/chat, persistence, create/edit/cancel, profile, leave/chat revocation and layout widths from 320 to 1440 pixels.

## Assets

Food images are bundled from Unsplash (see the photo IDs in `scripts/download-assets.mjs`); photos illustrate the experience rather than actual SNU dishes. Pretendard is bundled with its SIL Open Font License in `public/fonts/LICENSE.txt`. Design takes the restraint and spacing of the supplied Stanford Ventures reference, with a warmer dining identity.

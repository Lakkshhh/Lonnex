# Lonnex

Lonnex is a loan repayment planning web app that helps people compare payoff strategies, test what-if scenarios, and get agent-backed guidance on what to do next. The goal is to make repayment planning feel clear, practical, and less overwhelming.

## Architecture

The project is built with Next.js using the App Router, TypeScript, Tailwind CSS, and Recharts. The current app includes:

- a marketing homepage in `src/app/page.tsx`
- authentication flows in `src/app/login/page.tsx` and `src/app/reset-password/page.tsx`
- a signed-in workspace in `src/app/homepage/page.tsx`
- API routes under `src/app/api/auth/` for login, signup, and reset password
- a browser Supabase client in `src/lib/supabase.ts` and a server helper in `src/lib/supabase-server.ts`

Client-side reads use Supabase directly for workspace data, while auth and write-oriented actions are handled through API routes. User profile data is stored separately in `public.profiles`, which is used to fetch display usernames instead of relying on auth metadata.

## Status

This project is still under active development, and the product, workflows, and connected data features are still being built out.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The project will be deployed after the whole website has been made.

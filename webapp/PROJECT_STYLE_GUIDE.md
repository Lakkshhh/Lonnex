# Lonnex Project Style Guide

This file defines the visual and product-language rules that should stay consistent across the entire Lonnex web app.

Before making UI, UX, copy, or branding changes in this project, review this file and keep the implementation aligned with it.

## Product Positioning

- Product name: `Lonnex`
- Product type: loan repayment planning web app
- Product promise: help people understand the smartest way to pay off their loans, compare strategies, test scenarios, and get clear agent-backed guidance
- Tone: calm, useful, human, intelligent, and reassuring

## Brand Personality

- Lonnex should feel like a trusted financial planning product, not a generic fintech dashboard.
- The interface should feel modern and premium, but never flashy or noisy.
- Copy should reduce stress and confusion.
- The product should feel mathematically credible and emotionally approachable at the same time.

## Color Theme

Use the existing project tokens in `src/app/globals.css` as the source of truth.

- Background: warm off-white / parchment tone
  - `--background: #f2efe7`
- Primary text: deep forest green
  - `--foreground: #10241b`
- Secondary text: muted green-gray
  - `--muted: #5b6d63`
- Primary accent: rich dark green
  - `--accent: #1f6b4f`
  - `--accent-deep: #123b2d`
- Soft accent / highlight: pale mint green
  - `--accent-soft: #d9ecde`
- Borders / dividers:
  - `--line: rgba(16, 36, 27, 0.12)`

### Color Rules

- Dark green is the core accent across buttons, highlights, charts, and emphasis.
- Avoid introducing new accent colors unless there is a strong product reason.
- Surfaces should stay soft, airy, and lightly translucent rather than stark white.
- Avoid harsh black, bright blue, purple, or saturated neon colors.

## Typography

There are three font roles in the project:

- Brand font: `Syne`
  - Use for the `Lonnex` wordmark or brand-specific lockups only.
- Display font: `Fraunces`
  - Use for major marketing headlines and section titles.
- Sans font: `Geist`
  - Use for body copy, labels, UI text, navigation, cards, buttons, and supporting text.

### Typography Rules

- Headlines should feel elegant and editorial, not corporate.
- Body text should remain highly readable and calm.
- Avoid mixing too many text styles in one area.
- Use uppercase micro-labels sparingly for section eyebrows, status labels, and small chart headings.

## Layout Principles

- Keep layouts spacious, clean, and premium.
- Prefer large visual sections with a clear purpose.
- Avoid clutter, dense dashboard-card grids, or too many competing callouts.
- Use rounded containers and soft borders instead of heavy boxed UI.
- Keep section widths consistent with the current `max-w-7xl` layout system.

### Spacing Rules

- Generous whitespace is good, but it should feel intentional.
- Avoid empty vertical gaps that feel like unused space.
- Tighten visual modules when a card or chart does not need extra height.
- Related content should stay visually grouped.

## Header Rules

- The header should remain fixed at the top of the viewport.
- Header content should be minimal:
  - left: `Lonnex`
  - right: profile / account icon
- The header should visually blend into the page with translucency and blur.
- Do not add extra nav items unless explicitly requested.

## Buttons And Interaction

- Primary actions should use dark green fills or subtle bordered treatments.
- Avoid too many repeated CTAs in the same viewport.
- CTA copy should be short and direct.
- Anchor links should scroll smoothly where appropriate.
- Hover states should feel refined and subtle, not overly animated.

## Hero Section Rules

- The hero should clearly explain what Lonnex does within a few seconds.
- It should combine:
  - one strong headline
  - one concise supporting paragraph
  - one clear secondary action
  - one relevant product-style visual
- Hero visuals should feel tied to the product, not abstract decoration for its own sake.

## Product Visuals

- Visuals should reflect loan planning, strategy comparison, monthly decisions, and AI-guided recommendations.
- Prefer product-shaped compositions such as:
  - ranking cards
  - strategy comparison modules
  - payment summaries
  - monthly action guidance
  - charts with clear meaning
- Avoid illustrations that look disconnected from the product’s actual function.

## Chart Rules

- Charts should use names and labels that match the actual modeled strategies.
- Current strategy set:
  - Avalanche
  - Snowball
  - Standard
  - Minimum only
- Charts should stay interactive when possible.
- Chart legends and labels should be readable without extra explanation.
- Do not leave unnecessary white space under charts.

## Copy Guidelines

- Write for someone who is overwhelmed by loan choices, not someone who already understands repayment jargon.
- Use plain, helpful language without sounding simplistic.
- Do not overuse phrases like `plain-English`.
- Emphasize:
  - smartest payoff order
  - how much each strategy saves
  - what to do this month
  - AI agent support
- Avoid repeating the same selling line in multiple sections.

## Strategy Language

Whenever strategy names appear, keep them consistent:

- `Avalanche`
- `Snowball`
- `Standard`
- `Minimum only`

Descriptions should remain mathematically grounded, easy to understand, and non-hypey.

## AI Agent Positioning

- AI agents are a core differentiator and should be presented as useful, structured, and trustworthy.
- They should feel like specialized helpers that turn the numbers into guidance.
- Avoid making the product sound like a generic chatbot.

## Consistency Checklist

Before finalizing any UI or copy change, verify:

- The page still feels like Lonnex and not a generic SaaS template.
- Colors stay within the existing green / warm neutral system.
- Fonts are used in their intended roles.
- The layout feels premium and uncluttered.
- Copy is approachable and specific to loan repayment planning.
- Strategy names are consistent.
- AI agents are described clearly and credibly where relevant.
- Charts, cards, and visuals feel product-relevant.

## Source Of Truth

When implementation details conflict with assumptions, prefer these files:

- `PROJECT_STYLE_GUIDE.md` for visual and copy consistency
- `src/app/globals.css` for theme variables
- `src/app/layout.tsx` for font setup
- `src/app/page.tsx` for current homepage patterns

## Data & Auth Conventions

- Always fetch the logged-in user via `supabase.auth.getUser()` and use their `user.id` to query user-specific tables.
- Never use the email or any `@` prefixed value as a display name.
- Always source the display username from the `public.profiles` table using the user id, not from the auth object directly.
- When displaying a personalised greeting, use the `username` field from `public.profiles` and render it in the same font, size, and weight as the surrounding text with no special styling.
- For all Supabase reads on the client side, use the existing client at `src/lib/supabase.ts` directly.
- Only create API routes under `src/app/api/` for writes, deletes, and auth operations.
- All tables must have RLS enabled and a matching insert policy or client-side inserts will silently fail with a `400` error.

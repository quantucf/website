# Quantitative Finance Club @ UCF Website

The public Astro website for the Quantitative Finance Club @ UCF.

## Stack

- Astro
- TypeScript
- Tailwind CSS
- pnpm
- Node 24 LTS

## Setup

```text
nvm use
pnpm install
pnpm dev
```

## Structure

- `src/pages/`: routes and page composition
- `src/layouts/`: shared page shells and metadata
- `src/components/`: layout, section, navigation, and UI components
- `src/content/`: events, officers, posts, projects, and sponsors
- `src/data/`: site-wide content and public links
- `src/lib/`: shared constants and helpers
- `src/styles/`: global styles and theme tokens
- `public/`: static assets and crawler files

## Content

Collection schemas are defined in `src/content.config.ts`. Site-wide links and
contact details are defined in `src/data/site-content.ts`.

An event with an unknown date omits `startDate` and displays `TBD`. Use a
`YYYY-MM-DD` value when only the date is confirmed, or an ISO 8601 datetime with
an offset when the time is also confirmed.

## SEO

SEO and crawler configuration is maintained in:

- `src/layouts/BaseLayout.astro`
- `src/lib/site.ts`
- `src/lib/structured-data.ts`
- `src/pages/sitemap.xml.ts`
- `public/robots.txt`
- `public/llms.txt`

## Validation

```text
pnpm format:check
pnpm lint
pnpm check
pnpm build
pnpm test
```

Run `pnpm build` and `pnpm test` sequentially because both write to `dist/`.

## Workflow

Development, branching, pull-request, and commit requirements are documented in
`AGENTS.md`. `CLAUDE.md` delegates to the same instructions.

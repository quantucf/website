# Quantitative Finance Club @ UCF

[![CI](https://github.com/quantucf/website/actions/workflows/ci.yml/badge.svg)](https://github.com/quantucf/website/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

The source for [quantucf.com](https://quantucf.com), the official website of the
Quantitative Finance Club at the University of Central Florida. The site shares
club events, research projects, posts, officers, sponsors, and membership
information.

## Features

- Schema-validated content collections for events, officers, posts, projects,
  and sponsors
- Upcoming and past event listings with localized dates and archive pagination
- Project and post archives generated from Markdown content
- Responsive light and dark themes with accessible navigation and landmarks
- Canonical metadata, Open Graph and Twitter cards, JSON-LD, sitemap, robots,
  and `llms.txt` support
- Automated checks for formatting, linting, types, routes, links, accessibility,
  metadata, structured data, and content policy

## Technology

- [Astro](https://astro.build/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [pnpm](https://pnpm.io/)
- Node.js 24 LTS

## Getting started

### Prerequisites

- Node.js 24, matching `.nvmrc`
- pnpm 11

No environment variables are required for local development or production
builds.

### Installation

```sh
git clone https://github.com/quantucf/website.git
cd website
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

Astro prints the local development URL when the server starts.

## Commands

| Command             | Purpose                                       |
| ------------------- | --------------------------------------------- |
| `pnpm dev`          | Start the local development server            |
| `pnpm build`        | Generate the production site in `dist/`       |
| `pnpm preview`      | Preview the production build locally          |
| `pnpm format`       | Format supported files with Prettier          |
| `pnpm format:check` | Check formatting without modifying files      |
| `pnpm lint`         | Lint the repository with ESLint               |
| `pnpm check`        | Run Astro and TypeScript diagnostics          |
| `pnpm test`         | Build the site and run the Node.js test suite |

Run the complete local validation sequence before opening a pull request:

```sh
pnpm format:check
pnpm lint
pnpm check
pnpm build
pnpm test
```

Run `pnpm build` and `pnpm test` sequentially because both write to `dist/`.

## Project structure

```text
.
├── public/                Static assets and crawler files
├── src/
│   ├── components/        Layout, navigation, section, and UI components
│   ├── content/           Markdown content collections and templates
│   ├── data/              Site-wide links and contact information
│   ├── layouts/           Shared page shell and document metadata
│   ├── lib/               Content, event, archive, and metadata helpers
│   ├── pages/             File-based routes
│   └── styles/            Global styles and theme tokens
├── tests/                 Configuration, content, unit, and output tests
├── astro.config.ts        Astro and Tailwind configuration
├── src/content.config.ts  Content collection schemas
└── vercel.json            Vercel build configuration
```

## Managing content

The site uses Astro content collections defined in
[`src/content.config.ts`](src/content.config.ts). Each collection directory
contains a hidden `.template.md` file with every supported frontmatter field:

| Collection | Template                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| Events     | [`src/content/events/.template.md`](src/content/events/.template.md)     |
| Officers   | [`src/content/officers/.template.md`](src/content/officers/.template.md) |
| Posts      | [`src/content/posts/.template.md`](src/content/posts/.template.md)       |
| Projects   | [`src/content/projects/.template.md`](src/content/projects/.template.md) |
| Sponsors   | [`src/content/sponsors/.template.md`](src/content/sponsors/.template.md) |

Copy the relevant template, remove the leading period from the new filename,
and replace its example values. The filename becomes the entry's URL slug where
the collection has detail pages.

Site-wide contact details and public channels are maintained in
[`src/data/site-content.ts`](src/data/site-content.ts). Shared topic labels and
event types are defined in [`src/lib/content.ts`](src/lib/content.ts) and
[`src/lib/events.ts`](src/lib/events.ts).

## Deployment

The repository is configured for static deployment on Vercel. Vercel installs
dependencies with the frozen pnpm lockfile, runs `pnpm build`, and publishes
`dist/`. The production origin used for canonical URLs and the sitemap is
`https://quantucf.com`.

## Contributing

1. Create a focused branch from `main`.
2. Make a small, coherent change.
3. Run the complete validation sequence.
4. Commit using `<type>(<scope>): <summary>`.
5. Push the branch and open a pull request.

Repository-specific engineering and review requirements are documented in
[`AGENTS.md`](AGENTS.md).

## License

This project is available under the [MIT License](LICENSE).

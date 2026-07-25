# Website

Source code for [quantucf.com](https://quantucf.com/).

## Tech Stack

- [Astro](https://astro.build/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [pnpm](https://pnpm.io/)
- Node.js 24 LTS

## Local Development

### Prerequisites

- Node.js 24, matching `.nvmrc`
- pnpm 11

### Setup

```sh
git clone https://github.com/quantucf/website.git
cd website
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

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

Before opening a pull request, please run the following validation sequence:

```sh
pnpm format
pnpm lint
pnpm check
pnpm test
```

## Project Structure

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

## Managing Content

Content schemas are defined in
[`src/content.config.ts`](src/content.config.ts). Use the corresponding template
when adding new content:

| Collection | Template                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| Events     | [`src/content/events/.template.md`](src/content/events/.template.md)     |
| Officers   | [`src/content/officers/.template.md`](src/content/officers/.template.md) |
| Posts      | [`src/content/posts/.template.md`](src/content/posts/.template.md)       |
| Projects   | [`src/content/projects/.template.md`](src/content/projects/.template.md) |
| Sponsors   | [`src/content/sponsors/.template.md`](src/content/sponsors/.template.md) |

Site-wide links and contact details are in
[`src/data/site-content.ts`](src/data/site-content.ts). Topic labels and event
types are defined in [`src/lib/content.ts`](src/lib/content.ts) and
[`src/lib/events.ts`](src/lib/events.ts).

## Deployment

Pushing to a feature branch creates a Vercel Preview deployment. Pushing
to `main` deploys to production.

## Contributing

1. Create a feature branch from `main`.
2. Make changes based on logical units of work.
3. Run the complete validation sequence.
4. Commit using the [Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/#summary) (`<type>(<scope>): <summary>`).
5. Push the branch and open a pull request.

## License

This project is available under the [MIT License](LICENSE).

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

No environment variables are required for local development or production
builds.

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

Run the complete local validation sequence before opening a pull request:

```sh
pnpm format:check
pnpm lint
pnpm check
pnpm build
pnpm test
```

Run `pnpm build` and `pnpm test` sequentially because both write to `dist/`.

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
when adding content:

| Collection | Template                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| Events     | [`src/content/events/.template.md`](src/content/events/.template.md)     |
| Officers   | [`src/content/officers/.template.md`](src/content/officers/.template.md) |
| Posts      | [`src/content/posts/.template.md`](src/content/posts/.template.md)       |
| Projects   | [`src/content/projects/.template.md`](src/content/projects/.template.md) |
| Sponsors   | [`src/content/sponsors/.template.md`](src/content/sponsors/.template.md) |

Copy the relevant template, rename the copy, and replace the example values.
The filename is used in the URL for events, posts, and projects.

Site-wide links and contact details are in
[`src/data/site-content.ts`](src/data/site-content.ts). Topic labels and event
types are defined in [`src/lib/content.ts`](src/lib/content.ts) and
[`src/lib/events.ts`](src/lib/events.ts).

## Deployment

Pushes to branches other than `main` create Vercel Preview deployments. Pushes
to `main` deploy to production at [quantucf.com](https://quantucf.com/).

## Contributing

1. Create a focused branch from `main`.
2. Make a small, coherent change.
3. Run the complete validation sequence.
4. Commit using `<type>(<scope>): <summary>`.
5. Push the branch and open a pull request.

## License

This project is available under the [MIT License](LICENSE).

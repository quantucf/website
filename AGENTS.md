# AGENTS.md

## Project

This repository contains the public website for the Quantitative Finance Club @ UCF.

## Stack

- Astro
- TypeScript
- Tailwind CSS
- pnpm
- Node 24 LTS

## Core Rules

- Use Astro components by default.
- Use React only for components that require client-side interactivity.
- Do not add another frontend framework.
- Do not add a UI component library unless explicitly requested.
- Do not mix package managers.
- Use pnpm only.
- Keep content separate from layout when practical.
- Prefer Astro content collections for events, officers, projects, posts, and sponsors.
- Treat `src/content.config.ts` as the source of truth for collection fields.
- Do not add editorial, launch-editing, or other meta-comments to source files.
- Add documentation only when it records an operational process that is not
  evident from the code, configuration, or `README.md`.

## Development Commands

```text
nvm use
pnpm install
pnpm dev
```

## Validation

Before considering work complete, run:

```text
pnpm format:check
pnpm lint
pnpm check
pnpm build
pnpm test
```

If a command fails, fix the issue before marking the task complete. If the failure is unrelated to the current task, document it clearly.

## Coding Style

- Keep components small and readable.
- Avoid premature abstraction.
- Prefer semantic HTML.
- Use accessible labels, landmarks, and heading hierarchy.
- Use TypeScript for configuration and data schemas.
- Avoid hardcoded repeated content that belongs in content collections.
- Prefer explicit names over clever names.
- Keep page files thin; pages should compose layouts, sections, and content.

## Git Style

Commits must follow the full Conventional Commits format:

```text
<type>(<scope>): <meaningful summary>
```

Examples:

```text
feat(events): add event listing page
content(officers): add initial executive board profiles
fix(nav): correct mobile menu focus handling
style(hero): refine home page spacing
refactor(cards): extract shared card shell component
docs(content): document event collection schema
chore(deps): pin pnpm package manager version
```

Rules:

- Include a scope.
- Use a meaningful, specific summary.
- Do not use generic messages like `update`, `changes`, `fix stuff`, or `wip`.
- Keep each commit focused on one logical change.

Allowed types:

- `feat`
- `fix`
- `content`
- `style`
- `refactor`
- `docs`
- `test`
- `chore`
- `build`
- `ci`
- `perf`

## Branches and Pull Requests

- Confirm work is on an appropriately named branch before editing.
- Do not commit directly to `main`.
- Use conventional branch prefixes such as `feature/`, `bugfix/`, `hotfix/`,
  `refactor/`, `docs/`, or `chore/`.
- Do not use tool-specific branch prefixes.
- Keep each branch and pull request focused on one coherent concern.
- After validation, push the branch and open a pull request unless the user
  explicitly requests local-only work.
- Use a concise, factual pull-request title and description that summarise the
  motivation, changes, and validation performed.
- Do not merge pull requests, rewrite shared history, force-push, or delete
  remote branches without explicit authorisation.

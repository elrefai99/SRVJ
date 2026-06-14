# Repository Guidelines

## Project Structure & Module Organization

SRVJ is a Vue 3, Vite, TypeScript diagram editor using Vue Flow, Pinia, and UnoCSS. Application code lives in `src/`: `views/` contains route screens, `components/` reusable UI, `stores/` Pinia state, `composables/` shared behavior, `types/` domain types, and `utils/` helpers. Global CSS is in `src/style.css`; static assets belong in `public/`.

`src/stores/diagram.ts` is the source of truth for nodes, edges, selection, and undo/redo. Keep diagram state changes centralized there, with `DiagramCanvas.vue` forwarding Vue Flow events into store actions.

## Build, Test, and Development Commands

Use `pnpm` from the repository root.

- `pnpm install` installs dependencies from `pnpm-lock.yaml`.
- `pnpm dev` starts the Vite dev server.
- `pnpm type-check` runs `vue-tsc --noEmit`; this is the main quality gate.
- `pnpm build` type-checks and creates the production build.
- `pnpm preview` serves the production build locally.

## Coding Style & Naming Conventions

Use TypeScript, Vue Composition API, and `<script setup>`. Component files use PascalCase, for example `DiagramToolbar.vue`; composables use `useX.ts`; stores use domain names such as `diagram.ts`.

The `@/` alias maps to `src/`. Auto-imports are configured, but explicit imports are acceptable. Do not edit generated files such as `src/auto-imports.d.ts` or `src/components.d.ts`.

Style templates with UnoCSS utilities. Icon classes come from Iconify, for example `i-mdi-trash-can-outline`; dynamically generated icon classes must be safelisted in `uno.config.ts`.

## Testing Guidelines

There is currently no automated test suite, ESLint, or Prettier config. Run `pnpm type-check` before submitting changes, and run `pnpm build` for larger or deployment-related work. If tests are added, document the new command and keep test files near the code they cover or in a clearly named test directory.

## Commit & Pull Request Guidelines

Recent commits follow Conventional Commit-style prefixes such as `feat:` and `chore:`. Keep commits focused and imperative, for example `feat: add edge label editing`.

Pull requests should include a short summary, verification commands, and screenshots or recordings for visible UI changes. Link related issues when available. Highlight changes to persistence, undo/redo, or Vue Flow event handling because they affect saved diagrams and editor behavior.

## Agent-Specific Instructions

Replace node objects instead of mutating nested node data in place so Vue Flow re-renders:

```ts
this.nodes = this.nodes.map((node) =>
  node.id === id ? { ...node, data: { ...node.data, label } } : node,
)
```

Mutating store actions should call `commit()` before changing diagram state unless they are high-frequency Vue Flow handlers already bracketed elsewhere.

## Permissions

Global rule:

- Ask the user first before making any code change.
- Show the intended change for review when possible.
- Wait for the user to accept or reject the change before editing project code.

### Allow

- Read tracked project files needed for the task.
- Read source code under `src/`, configuration under `config/`, and docs such as `README.md`, `CLAUDE.md`, and this file.
- Create new source or documentation files when they are required for the requested change.
- Edit application code, route files, models, middleware, utilities, tests, and markdown documentation.
- Update `package.json` when the task explicitly requires script or dependency changes.
- Run safe repo-local commands such as `rg`, `ls`, `sed`, `git status`, `pnpm lint`, and `pnpm test`.

### Deny

- Do not read, print, or copy secrets from `.env`, `.env.dev`, or any credential file.
- Do not modify `.env`, `.env.dev`, or other secret-bearing files unless the user explicitly asks.
- Do not modify `node_modules/`, generated caches, or log files.
- Do not change `pnpm-lock.yaml` unless dependency work is part of the task.
- Do not delete files, rename major directories, or rewrite large parts of the codebase without explicit approval.
- Do not run destructive git or shell commands such as `git reset --hard`, `git checkout --`, or broad `rm` operations.
- Do not alter deployment/infrastructure files (`Dockerfile`, `docker-compose.yml`, `ecosystem.config.cjs`) unless the task explicitly requires it.

# Repository Guidelines

## Project Structure & Module Organization

This is a pnpm TypeScript backend for an Express 5 API with Prisma/Postgres and BullMQ workers. Source lives in `src/`. API domains are under `src/module/<domain>/`, usually split into module, controller, service, DTO, and middleware files. Shared infrastructure is in `src/config/`, helpers in `src/functions/` and `src/utils/`, middleware in `src/middleware/`, and jobs in `src/MessageQueue/`. Prisma schema and migrations live in `prisma/`; generated Prisma client output goes to `src/generated/` and is not committed.

## Build, Test, and Development Commands

- `pnpm install`: install dependencies using the locked pnpm workspace.
- `pnpm dev:local`: run the API locally through nodemon/tsx.
- `pnpm dev`: run the API plus `src/MessageQueue/index.ts`; requires Redis configuration.
- `pnpm build`: generate Prisma client, compile with `tsconfig.build.json`, and copy generated output into `dist/`.
- `pnpm start`: run the compiled API and worker.
- `pnpm lint`: run ESLint across the repository.
- `pnpm test`: run Jest unit tests when the runner is installed.
- `pnpm test:e2e`: run Vitest e2e tests when the runner is installed.

CI uses Node 20 and runs Prisma generation plus `pnpm build`.

## Coding Style & Naming Conventions

Use TypeScript and follow the shared `@mohamed-elrefai/tsconfigs` settings. Keep imports of `src/config/dotenv` first in entry points that read environment variables. Match the casing already used in each domain; this repo has lowercase folders and folders such as `Controller`, `Service`, and `DTO`. Prefer one route controller per file, keep Prisma/business logic inside service classes, use zod DTOs, and import generated Prisma types from `src/generated/prisma`.

## Testing Guidelines

The build excludes `**/*.test.ts` and `**/*spec.ts`; place unit tests near the code or under `test/` using those suffixes. Use `supertest` for HTTP flows. E2E tests should exercise real routes and cover auth, database, Redis, and worker behavior only when services are available. Run `pnpm build` before opening a PR because CI validates compilation.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit-style subjects such as `feat: ...` and `fix: ...`. Keep commits focused and imperative. PRs should include a short description, linked issue when relevant, Prisma migration notes, environment variable changes, and test/build results.

## Security & Configuration Tips

Do not commit `.env`, `.env.dev`, generated Prisma files, logs, or build output. Use `.env.example` as the public template. Keep PASETO key names and existing misspellings intact where code references them. Reuse the shared Prisma and Redis clients unless working in the separate message-queue process.

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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is an early-stage scaffold. The bootstrap layer (server, middleware, config, logging,
metrics) is in place, but feature code is not. `src/app.module.ts` — where all feature routers
register — is currently empty, so the API exposes only `/api/health` and `/metrics`.

Several `package.json` scripts point at infrastructure that does not exist yet. Before relying on
them, confirm the prerequisite exists:

- `pnpm dev` / `pnpm start` spawn a second process at `src/MessageQueue/index.ts` (a BullMQ worker)
  — that directory does not exist yet, so this process crashes. Use `pnpm dev:local` until the
  queue worker is created.
- `pnpm build` runs `tsc -p tsconfig.build.json` — that file does not exist yet. The base config
  comes from the `@mohamed-elrefai/tsconfigs` package (see its `tsconfig.json`, which sets
  `rootDir: src`, `outDir: dist`, CommonJS, decorators on); a local `tsconfig.json` / build config
  must extend it.
- `pnpm test` (jest) and `pnpm test:e2e` (vitest) — neither runner is installed yet. `supertest` is
  the only test dependency present.

When adding any of these, prefer wiring it to match the existing script names rather than renaming.

## Commands

- Install: `pnpm install` (pnpm is required — see `pnpm-workspace.yaml`, `pnpm-lock.yaml`)
- Generate Prisma client: `npx prisma generate` — **required before the app compiles.** Code imports
  `PrismaClient` from `generated/prisma` (the schema's generator `output`), not `@prisma/client`.
  This directory is not committed.
- Run migrations: `npx prisma migrate dev` (config is `prisma.config.ts`, not the schema block)
- Seed: `npx prisma db seed` (runs `prisma/seeds/seed.ts` — not present yet)
- Dev (local, no queue worker): `pnpm dev:local`
- Lint: `pnpm lint` (`eslint .`)
- Dependency upgrades (taze): `pnpm taze:patch`, `pnpm taze:back`, etc.

## Environment

`src/config/dotenv.ts` selects the env file by `NODE_ENV`: `development` → `.env.dev`, anything else
→ `.env`. **`import './config/dotenv'` must run before any module that reads `process.env`** — this
is why `src/app.ts` and `prisma.config.ts` import it on their very first line. Preserve that
ordering when adding new entry points.

Key vars read in code: `PORT`, `API_LINK`, `DATABASE_URL`, `SITE_URL_TEST` / `SITE_URL_LIVE` (CORS
allowlist), `SITE_API_URL` (CSP), `REDIS_CACHE_DEV` / `REDIS_CACHE_LIVE`, `CLOUDINARY_*`, `LOG_LEVEL`.

## Architecture

Request bootstrap flow, all wired in `src/app.ts`:

1. `src/config/dotenv` (first import) → load env.
2. Global `process` handlers for `unhandledRejection` / `uncaughtException` (log via pino, flush,
   exit).
3. Create Express app + raw `http.Server` + Socket.IO (`ioSocket` is exported for use elsewhere;
   the http server, not the Express app, is what `.listen`s).
4. `appConfig(app)` then `appModule(app)`, then health/metrics/404 routes.
5. `startServer()` connects Prisma and Redis in parallel before listening.

**`src/app.config.ts`** owns all global middleware, applied in this order: helmet (with CSP + HSTS),
`express.json({ limit: '75mb' })`, urlencoded, static mounts (`/v0/cdn`, `/v0/public`), CORS
(origin-allowlist callback, credentials on), cookie-parser, morgan (tees to stdout **and**
`logs/app.log`), express-useragent, a custom middleware that augments each request
(`req.lang`, `req.mobileApp`, `req.clientIP` from CF/proxy headers) and records prom-client metrics,
and finally the rate `limiter`. New global middleware generally belongs here; per-feature middleware
belongs with its router.

**`src/app.module.ts`** is the single place to register feature routers. Add new domains here.

**Data / infra layer (`src/config/`):**
- `prisma.ts` — single shared `PrismaClient` using the `PrismaPg` driver adapter over a `pg.Pool`.
  Import this default export everywhere; do not instantiate new clients.
- `postgres-url.ts` — rewrites `DATABASE_URL`'s `sslmode` to `verify-full` for `prefer`/`require`/
  `verify-ca`. The Pool connection string flows through this.
- `redis.ts` — shared `redis` client + `redisConfig()` connector; default export is the client.
- `cloudinary.ts` — configured Cloudinary v2 (media uploads via `sharp`/`multer`/`streamifier`).

**Utilities (`src/utils/`):**
- `logger.ts` — pino. Use `createLogger("Context")` for module-scoped child loggers rather than the
  raw `logger`. Sensitive paths (auth headers, cookies, `*.password`, `*.token`, `*.secret`) are
  redacted automatically; tests are silenced; dev uses pretty output, prod writes JSON to
  `logs/app.log`.
- `limit-request.ts` — `limiter` (global, 350/5min) and `authlimiter` (5/2min, skips successes) for
  auth routes. Both key on `req.clientIP`.
- `api-requesthandler.ts` — `asyncHandler(fn)` wrapper for async route handlers.

## Stack notes

- Express **5** and Prisma **7** — both have breaking changes vs. their previous majors; verify API
  shapes against the installed versions rather than older docs.
- Auth tokens use `paseto` (not JWT); password hashing uses `bcryptjs`.
- Background jobs are intended to run on `bullmq` (Redis-backed) under `src/MessageQueue/`, with
  `bull-arena` for inspection — not yet built.
- Realtime uses `socket.io` via the exported `ioSocket`.
- Validation uses `zod`.

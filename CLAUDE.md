# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

SRVJ is a collaborative diagram/project backend (Express 5 + Prisma 7 + Postgres). The bootstrap
layer and three feature domains are live: **authentication**, **user**, and **project** (registered
in `src/app.module.ts`). A BullMQ email worker exists under `src/MessageQueue/`. Beyond the feature
routers, the app also exposes `/api/health` and `/metrics`.

Test runners are configured in `package.json` (`jest` for `test`, `vitest` for `test:e2e`) but
**neither jest nor vitest is installed** — only `supertest` is present. Install the runner before
relying on those scripts.

## Commands

- Install: `pnpm install` (pnpm is required — see `pnpm-workspace.yaml`, `pnpm-lock.yaml`)
- Generate Prisma client: `npx prisma generate` — **required before the app compiles.** Code imports
  `PrismaClient` from `src/generated/prisma` (the schema's generator `output`), not `@prisma/client`.
  This directory is gitignored / not committed.
- Run migrations: `npx prisma migrate dev` (datasource/config is `prisma.config.ts`; the schema's
  `datasource db` block intentionally omits `url`)
- Seed: `npx prisma db seed` (runs `prisma/seeds/seed.ts` — not present yet)
- Dev (app only, recommended): `pnpm dev:local` — runs `nodemon`, which execs `tsx ./src/app.ts`.
- Dev (app + email worker): `pnpm dev` — also spawns `src/MessageQueue/index.ts`; requires a
  reachable Redis (`REDIS_CACHE_DEV`) or the worker process crashes.
- Build: `pnpm build` — `prisma generate && tsc -p tsconfig.build.json`, then copies
  `src/generated` into `dist/src/` (tsc excludes generated output). `tsconfig.build.json` extends
  the root `tsconfig.json`, which extends `@mohamed-elrefai/tsconfigs`.
- Start (prod): `pnpm start` — runs compiled `dist/src/app.js` + the worker via `tsconfig-paths`.
- Lint: `pnpm lint` (`eslint .`)
- Dependency upgrades (taze): `pnpm taze:patch`, `pnpm taze:back`, etc.

## Environment

`src/config/dotenv.ts` selects the env file by `NODE_ENV`: `development` → `.env.dev`, anything else
→ `.env`. **`import './config/dotenv'` must be the first import in any entry point that reads
`process.env`** — `src/app.ts`, `prisma.config.ts`, `src/MessageQueue/index.ts`, and
`src/MessageQueue/worker.emails.ts` all do this. Preserve that ordering when adding entry points.

Key vars read in code: `PORT`, `API_LINK`, `DATABASE_URL`, `SITE_URL_TEST` / `SITE_URL_LIVE` (CORS
allowlist), `SITE_API_URL` (CSP), `REDIS_CACHE_DEV` / `REDIS_CACHE_LIVE`, `CLOUDINARY_*`, `LOG_LEVEL`,
`API_KEY_SALT` (bcrypt rounds), `GOOGLE_CLIENT_ID`, `EMAIL`, and the PASETO PEM keys below.

PASETO keys are loaded from env as raw PEM strings (with literal `\n`) via `src/utils/loadKey.ts`,
which normalizes them. The key env names are referenced by string literal in code:
`ACCESS_PRIVATE_KEY` / `ACCESS_PUBLICE_KEY` (note the spelling), `REFRESH_PRIVATE_KEY` /
`REFRESH_PUBLIC_KEY`, `PENDING_PRIVATE_KEY`, `PRIVATE_FORGET_PASSWORD_SECRET_KY`.

## Architecture

### Bootstrap (`src/app.ts`)
1. `./config/dotenv` (first import) → load env.
2. Global `process` handlers for `unhandledRejection` / `uncaughtException` (log via pino).
3. Express app + raw `http.Server` + Socket.IO (`ioSocket` is exported; the http server, not the
   Express app, is what `.listen`s).
4. `appConfig(app)` → `appModule(app)` → health / metrics / 404 routes.
5. `startServer()` connects Prisma and Redis in parallel, then listens.

### Global middleware (`src/app.config.ts`)
Applied in order: helmet (CSP + HSTS), `express.json({ limit: '75mb' })`, urlencoded, static mounts
(`/v0/cdn`, `/v0/public`), CORS (origin-allowlist callback, credentials on), cookie-parser, morgan
(tees to stdout **and** `logs/app.log`), express-useragent, a custom middleware augmenting each
request (`req.lang`, `req.mobileApp`, `req.clientIP` from CF/proxy headers) + prom-client metrics,
and the rate `limiter`. New global middleware generally belongs here; per-feature middleware belongs
with its router. `allowedOrigins` is exported from here and reused by the Socket.IO CORS config.

### Feature modules (`src/module/<domain>/`)
`src/app.module.ts` is the single place routers register (mounted at `/api/v1/<domain>`, loaded
lazily via `require(...).default`). Each domain follows a consistent layered shape:

- **`<domain>.module.ts`** — the `express.Router`; wires middleware → controller per route.
- **`<domain>.controller.ts`** — a barrel re-exporting controllers from `controller/` (or `Controller/`).
- **`controller/*.controller.ts`** — one file per route. Validate, call the service, shape the HTTP
  response. All wrapped in `asyncHandler`.
- **`service/base.<domain>.service.ts`** — a `Base*` class holding the Prisma/business logic.
  Controllers `new` it per request. Services return plain `{ success, error, message, data }`
  objects (they don't throw); controllers translate that into status codes.
- **`DTO/index.dto.ts`** (or `DTO/index.ts`) — zod schemas; the inferred type is the DTO type.

Casing is inconsistent across domains (`user/` uses `Controller/`, `Service/`, `Middleware/`;
`authentication/`/`project/` use lowercase). Match the casing of the domain you're editing.

### Auth & request identity
- Tokens are **PASETO v4** (`paseto` lib), not JWT. `token_PASETO(payload, type, expiresIn?)` in
  `module/authentication/utils/paseto.utils.ts` signs `access` / `refresh` / `forget_password` /
  `pending` tokens, each with its own private key. Passwords use `bcryptjs` (`API_KEY_SALT` rounds).
- Login/refresh set httpOnly `access_token` + `refresh_token` cookies; the access token is also
  returned in the JSON body.
- Two auth guards exist and are **near-duplicates** — keep them in sync when changing auth:
  `src/middleware/user/user.middleware.ts` (`userMiddleware`, selects only `id`) and
  `src/module/user/Middleware/me.middleware.ts` (`meMiddleware`, selects the fuller profile). Both
  verify the **access** public key and set `req.user`.
- `req.user`, `req.lang`, `req.clientIP`, `req.useragent`, `req.geo` are declared in
  `src/types/express/index.d.ts` (all loosely typed as `any`).

### Error handling — known gap
`asyncHandler` (`src/utils/api-requesthandler.ts`) is a thin wrapper that just returns the handler's
promise; Express 5 auto-forwards rejections. `AppError` (`src/utils/errors/app-error.ts`) provides
typed static constructors (`AppError.badRequest`, `.unauthorized`, etc.) and a matching
`errorHandler` (`src/utils/errors/errorHandler.ts`) exists — **but `errorHandler` is not currently
registered** in `app.ts`/`app.config.ts`, so thrown `AppError`s fall through to Express's default
handler. Controllers therefore mostly hand-roll JSON error responses inline. If you wire the central
handler, register it last (after routes). The errorHandler also contains Mongoose-specific branches
that are inapplicable here (this project is Postgres/Prisma).

### Data / infra layer (`src/config/`)
- `prisma.ts` — single shared `PrismaClient` over `PrismaPg` driver adapter on a `pg.Pool`. Import
  this default export everywhere; never instantiate a new client (the MessageQueue worker creates
  its own pool/client intentionally, since it's a separate process).
- `postgres-url.ts` — rewrites `DATABASE_URL`'s `sslmode` to `verify-full` for `prefer`/`require`/
  `verify-ca`. The Pool connection string flows through this.
- `redis.ts` — shared `redis` client + `redisConfig()` connector; default export is the client.
- `cloudinary.ts` — configured Cloudinary v2 (media via `sharp`/`multer`/`streamifier`).

### Caching & uploads (`src/functions/`)
- `redis/cache.service.fun.ts` — `cacheService` class (`getData`/`setData`/`setExData`/`deleteData`/
  `deleteByPattern`). Keys are JSON-stringified before use. Pair with `cache.invalidation.ts`.
- `upload/` — avatar generation + image processing (`avatarProfile`, `avatarProcess`,
  content-type detection). New users get a generated avatar; updates run through `avatarProcess`.

### Background jobs (`src/MessageQueue/`)
Separate process started by `src/MessageQueue/index.ts` (own Prisma client + signal handlers), which
requires `worker.emails.ts`. BullMQ queue `emailQueue` (`emails/Queue/queue.email.ts`,
`addJobToQueue(name, data)`); the worker dispatches by `data.type` (`login` / `register`) to HTML
templates in `emails/template/` sent via Resend (`provider/resend.ts`). Controllers enqueue with
`addJobToQueue("login", emailBody)` after the response path. Redis connection comes from
`REDIS_CACHE_DEV` / `REDIS_CACHE_LIVE` by `NODE_ENV`. `bull-arena` is a dependency for queue
inspection.

### Data model (`prisma/schema.prisma`)
Postgres, `@@map`'d snake_case tables. Every model has an `Int @id @default(autoincrement())` **and**
a separate `site_id String @unique @default(uuid())` — the integer is the internal PK; `site_id` is
the public/external identifier. Core entities: `User`, `Project` (owner + `ProjectMember` roles via
`ProjectRole`/`ProjectVisibility` enums), `Diagram` (+ `DiagramVersion` history, JSON `nodes`/
`edges`), `ShareLink`. The generator output is `../src/generated/prisma`; import `Prisma` types from
there too (e.g. `Prisma.UserUpdateInput`).

## Utilities (`src/utils/`)
- `logger.ts` — pino. Use `createLogger("Context")` for module-scoped child loggers over the raw
  `logger`. Sensitive paths (auth headers, cookies, `*.password`, `*.token`, `*.secret`) are
  redacted; tests are silenced; dev uses pretty output, prod writes JSON to `logs/app.log`.
- `limit-request.ts` — `limiter` (global, 350/5min) and `authlimiter` (5/2min, skips successes) for
  auth routes. Both key on `req.clientIP`.
- `getLocation.ts` — geo lookup from the request, used in login-notification emails.

## Stack notes

- **Express 5** and **Prisma 7** — both have breaking changes vs. previous majors; verify API shapes
  against installed versions, not older docs. Express 5 auto-catches rejected async handlers.
- Auth: `paseto` (not JWT) + `bcryptjs`. Validation: `zod` v4. Realtime: `socket.io` via `ioSocket`.
- Background jobs: `bullmq` (Redis) + `resend` for email; `bull-arena` for inspection.
- A few legacy console logs say "MongoDB" — the project is Postgres/Prisma; ignore the wording.

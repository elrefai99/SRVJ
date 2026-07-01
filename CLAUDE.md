# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

SRVJ is a collaborative diagram/project backend on a **dual datastore**: Express 5 + Prisma 7 +
Postgres for the relational domains, and **Mongoose 8 + MongoDB** for the diagram document store
(see below). The bootstrap layer and five feature domains are live (registered in
`src/app.module.ts`, mounted under `/api/v1`): **authentication**, **user**, **project**,
**notification** (SSE + Redis pub/sub), and **emails** (open/click tracking). Two BullMQ workers
(`emailQueue`, `notificationQueue`) live under `src/MessageQueue/`. Beyond the feature routers, the
app also exposes `/api/health` and `/metrics`.

`src/module/diagram/` is **partially scaffolded but not yet wired** — its Mongoose schemas
(`schema/diagram.schema.ts`, `schema/diagram.version.schema.ts`) and `@types/index.d.ts` exist, but
`diagram.module.ts` / `diagram.controller.ts` are empty and the domain is **not** registered in
`app.module.ts`. The Diagram/DiagramVersion models were intentionally **moved out of Prisma into
Mongoose** (`nodes`/`edges`/`metadata` as `Schema.Types.Mixed`); don't expect them in
`prisma/schema.prisma`. `src/collab/` (`server.ts`, `auth.ts`) is an empty stub for the future
real-time collaboration layer.

A standalone **MCP server** lives in `mcp/` (run with `pnpm mcp`); see the MCP section below.

The test runner is **Vitest** (`vitest.config.ts`, configured and installed). Jest is no longer
used. `supertest` is present for HTTP-level tests.

## Commands

- Install: `pnpm install` (pnpm is required — see `pnpm-workspace.yaml`, `pnpm-lock.yaml`)
- Generate Prisma client: `npx prisma generate` — **required before the app compiles.** Code imports
  `PrismaClient` from `src/generated/prisma` (the schema's generator `output`), not `@prisma/client`.
  This directory is gitignored / not committed.
- Run migrations: `npx prisma migrate dev` (datasource/config is `prisma.config.ts`; the schema's
  `datasource db` block intentionally omits `url`)
- Seed: `npx prisma db seed` (runs `prisma/seeds/seed.ts` — not present yet)
- Dev (app + workers): `pnpm dev:local` — `concurrently` runs `nodemon` (app) **and**
  `ts-node ./src/MessageQueue/index.ts` (workers). `pnpm dev` is the same but forces
  `NODE_ENV=development` on both. (Note: both scripts spawn the worker process, which needs a
  reachable Redis via `REDIS_CACHE_BULLMQ` plus Mongo + Postgres or it crashes.) `nodemon` execs the
  app entry; the worker `index.ts` connects its **own** Prisma client and Mongoose connection, then
  requires both `worker.emails.ts` and `worker.notification.ts`.
- Build: `pnpm build` — `prisma generate && tsc -p tsconfig.build.json && node scripts/copy-generated.mjs`
  (the final step copies `src/generated` into `dist/src/`, since tsc excludes generated output).
  `tsconfig.build.json` extends the root `tsconfig.json`, which extends `@mohamed-elrefai/tsconfigs`.
- Start (prod): `pnpm start` — `concurrently` runs compiled `dist/src/app.js` +
  `dist/src/MessageQueue/index.js`, both via `tsconfig-paths/register`.
- Test: `pnpm test` (`vitest run`), `pnpm test:watch`, `pnpm test:cov` (v8 coverage),
  `pnpm test:local` (`NODE_ENV=test`). Vitest sets `NODE_ENV=test`, enables globals, uses the
  `node` environment, includes `src/**/*.{test,spec}.ts`, and aliases `@` → `src/`. Run a single
  file with `pnpm vitest run path/to/file.test.ts` (or `-t "name"` to filter by test name).
- MCP server: `pnpm mcp` (`tsx ./mcp/index.ts`) — see the MCP section below.
- Lint: `pnpm lint` (`eslint .`)
- Dependency upgrades (taze): `pnpm taze:patch`, `pnpm taze:back`, etc.

## Environment

`src/config/dotenv.ts` selects the env file by `NODE_ENV`: `development` → `.env.dev`, anything else
→ `.env`. **`import './config/dotenv'` must be the first import in any entry point that reads
`process.env`** — `src/app.ts`, `prisma.config.ts`, `src/MessageQueue/index.ts`,
`src/MessageQueue/worker.emails.ts`, and `mcp/index.ts` all do this. Preserve that ordering when
adding entry points.

Key vars read in code: `PORT`, `API_LINK`, `DATABASE_URL`, `MONGODB_URI` (Mongoose connection, read
in both `src/config/mongoDB.ts` and the worker `index.ts`), `SITE_URL_TEST` / `SITE_URL_LIVE` (CORS
allowlist), `SITE_API_URL` (CSP), `CLOUDINARY_*`, `LOG_LEVEL`, `API_KEY_SALT` (bcrypt rounds),
`GOOGLE_CLIENT_ID`, `EMAIL`, and the PASETO PEM keys below. There are **two distinct Redis configs**:
`REDIS_CACHE_DEV` / `REDIS_CACHE_LIVE` (selected by `NODE_ENV`) drive the shared cache client in
`src/config/redis.ts`, while `REDIS_CACHE_BULLMQ` is a single URL used by both BullMQ queues/workers
**and** the notifications pub/sub (`src/module/Notifications/shared/redis.ts`) — don't conflate them.

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
5. `startServer()` connects MongoDB (`mongoDBConfig()`, `src/config/mongoDB.ts` — retries 5× then
   `process.exit(1)`), Prisma (`prisma.$connect()`), Redis (`redisConfig()`), and `startSubscriber()`
   (the notifications pub/sub listener, see below) **all in parallel via `Promise.all`**, then
   listens. Only runs when `NODE_ENV !== 'test'`.

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

Casing is inconsistent across domains (`user/` and `emails/` use `Controller/`/`Service/`;
`authentication/`/`project/`/`Notifications/` use lowercase `controller/`/`service/`). Match the
casing of the domain you're editing. Some domains deviate from the standard layered shape:
`emails/` is a public open/click tracker (no auth, no DTO; `service/based.emails.service.ts` flips
`seen`/`click` flags on the `Emails` row), and `Notifications/` adds `shared/`, `utils/`, and an SSE
`stream` route rather than a plain request/response service.

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

### Real-time notifications (SSE + Redis pub/sub)
Notifications fan out across instances over a Redis pub/sub channel (`"notifications"`), not
Socket.IO. The flow: `POST /api/v1/notification/publish` enqueues a `notificationQueue` job →
`worker.notification` (`notifications/jobs/job.process.notification.ts`) persists a `Notification`
row and `redis.publish("notifications", payload)` → `startSubscriber()` (`src/config/subscriber.ts`,
wired in `app.ts`) subscribes and writes SSE frames to matching clients. `GET /stream` is the SSE
endpoint; live connections are held in an **in-process** `Map<userId, Set<SSEClient>>`
(`Notifications/utils/client.ts`), so each app instance only pushes to its own connected tabs — the
pub/sub is what bridges instances. All three routes are guarded by `userMiddleware`.

### Background jobs (`src/MessageQueue/`)
Separate process started by `src/MessageQueue/index.ts` (own Prisma client + own `mongoose.connect`
+ `SIGTERM`/`SIGINT` handlers that disconnect both), which connects Postgres and MongoDB in parallel
then requires **both** `worker.emails.ts` and `worker.notification.ts`. Two BullMQ
queues, each with its own `add*ToQueue(name, data)` helper and `removeOnComplete`/`removeOnFail` age
configs:
- `emailQueue` (`emails/Queue/queue.email.ts`, `addJobToQueue`) — worker dispatches by `data.type`
  (`login` / `register`; `invite` template also exists) to HTML templates in `emails/template/` sent
  via Resend (`provider/resend.ts`). Controllers enqueue with `addJobToQueue("login", emailBody)`
  after the response path.
- `notificationQueue` (`notifications/Queue/queue.notification.ts`, `addNotificationJobToQueue`) —
  feeds the pub/sub flow above.

Both queues/workers connect via `REDIS_CACHE_BULLMQ` (a single URL, **not** the `_DEV`/`_LIVE` cache
vars). `bull-arena` is a dependency for queue inspection.

### Data model — Postgres (`prisma/schema.prisma`)
Postgres, `@@map`'d snake_case tables. Every model has an `Int @id @default(autoincrement())` **and**
a separate `site_id String @unique @default(uuid())` — the integer is the internal PK; `site_id` is
the public/external identifier. Core entities: `User`, `Project` (owner + `ProjectMember` roles via
`ProjectRole`/`ProjectVisibility` enums), `ShareLink`, `InviteProjects` (project invites,
`InviteFrom`/`InviteTo` relations), `Notification` (`fromUserId`/`toUserId`, `isRead`), and `Emails`
(open/click tracking by `email_id`). **`Diagram`/`DiagramVersion` are no longer here** — they were
moved to MongoDB. The generator output is `../src/generated/prisma`; import `Prisma` types from
there too (e.g. `Prisma.UserUpdateInput`).

### Data model — MongoDB (`src/module/diagram/schema/`)
The diagram document store uses **Mongoose 8**. `diagram.schema.ts` (`diagramModel`) and
`diagram.version.schema.ts` (`diagramVersionModel`) mirror the Postgres convention of a
`site_id` uuid alongside Mongo's `_id`. `nodes`, `edges`, and `metadata` are `Schema.Types.Mixed`
(arbitrary JSON), `timestamps: true`. `IDiagram` / `IDiagramVersion` interfaces live in
`src/module/diagram/@types/index.d.ts`. The connection is opened by `mongoDBConfig()` in the app and
a separate `mongoose.connect()` in the worker process — both read `MONGODB_URI`.

## Scripts (`scripts/`)
- `copy-generated.mjs` — copies `src/generated/` into `dist/src/` post-build (tsc excludes it).
- `removeFiles.ts` — utility for cleaning up files; invoked via the `removeFiles` npm script.

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
- **Dual datastore**: Prisma/Postgres for relational domains, Mongoose/MongoDB for diagrams. The
  "MongoDB" wording in startup logs is now real (it used to be legacy mislabeling). `mongoose` and
  `jsonwebtoken` are both in `package.json`; auth still uses `paseto`/`bcryptjs`, not `jsonwebtoken`.
- Auth: `paseto` (not JWT) + `bcryptjs`. Validation: `zod` v4. Realtime: `socket.io` (`ioSocket`) is
  set up in `app.ts`, but the live notifications feature uses **SSE + Redis pub/sub**, not Socket.IO.
- Background jobs: `bullmq` (Redis) + `resend` for email; `bull-arena` for inspection.

## MCP server (`mcp/`)
A standalone Model Context Protocol server (`@modelcontextprotocol/sdk`) over **stdio**, run with
`pnpm mcp` (`tsx ./mcp/index.ts`). It loads `../src/config/dotenv` first, then reuses the app's data
layer (`mcp/functions/*` query Prisma/Mongo). `mcp/index.ts` registers tools and dispatches by name
in a single `CallToolRequestSchema` handler. Tool definitions live in `mcp/tools/` (re-exported via
`mcp/tools/index.ts` as `user`, `notification`, `system`): `get_last_users`, `get_username_data`,
`total_users`, `get_last_notification`, `get_feature_example`, `get_project_architecture`. The
`project_architecture` tool (`mcp/CallTool/project_architecture.ts`) returns the canonical feature
folder layout new domains must follow — keep it in sync with the layered shape described above.

## Strict Rules

- Never add comments to the code.
- Do not generate `//` comments.
- Do not generate `/* */` comments.
- Do not generate JSDoc comments (`/** */`).
- The final code must contain zero comments of any kind.

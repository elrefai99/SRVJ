# Codebase File Reference — `src/`

Every file in `src/`, grouped by area, with what it does and why it exists. Feature-domain files
(`src/module/<domain>/`) are summarized here and documented in depth under each
[service folder](./README.md#domains).

---

## Bootstrap (app entry)

| File | What | Why |
|------|------|-----|
| `app.ts` | Express app + raw `http.Server` + Socket.IO. Registers health/metrics/404, mounts `errorHandler` last, attaches collab WS, and `startServer()` connects Mongo + Prisma + Redis + the notifications subscriber in parallel, then listens. | Single composition root; the http server (not the Express app) is what listens so WebSocket upgrades can share the port. |
| `app.config.ts` | Global middleware in order: CORS → helmet → **compression** → json(2mb) → urlencoded → cookies → static → morgan(dev only) → useragent → request augmentation + Prometheus metrics → rate limiter. Exports `allowedOrigins`. | One place for cross-cutting middleware; `allowedOrigins` is reused by Socket.IO and collab CORS. |
| `app.module.ts` | Mounts each domain router under `/api/v1/<domain>`. | Single registration point for feature routers. |
| `gen-import.ts` | **Auto-generated** barrel: lazy CJS getters re-exporting most modules. | Lets files import many symbols from one barrel without circular-dependency crashes. Do not edit by hand. |
| `gen-app-config.ts` | **Auto-generated** re-export of `gen-import`. | App-config barrel variant. |

---

## `config/` — data & infra connections

| File | What | Why |
|------|------|-----|
| `dotenv.ts` | Loads `.env.dev` (development) or `.env`. | Must be the **first import** in every entry point that reads `process.env`. |
| `prisma.ts` | Single shared `PrismaClient` over `PrismaPg` on a tuned `pg.Pool` (`max`, idle/connect timeouts). | One pooled client app-wide; never instantiate another in-process. |
| `postgres-url.ts` | Rewrites `sslmode` to `verify-full` for `prefer`/`require`/`verify-ca`. | Enforces strict TLS verification on the DB connection. |
| `redis.ts` | Shared cache Redis client (`REDIS_CACHE_DEV`/`_LIVE`) + `redisConfig()` connector. | Hot-read cache; distinct from the BullMQ/pub-sub Redis. |
| `mongoDB.ts` | `mongoDBConfig()` — connects Mongoose, retries 5× then exits. | Diagram document store connection with startup resilience. |
| `cloudinary.ts` | Configured Cloudinary v2 client. | Avatar/image storage + CDN. |
| `subscriber.ts` | `startSubscriber()` — subscribes to the Redis `"notifications"` channel and writes SSE frames to local clients. | Bridges pub/sub events to this instance's held SSE connections. |

---

## `collab/` — realtime diagram collaboration (Yjs over WebSocket)

| File | What | Why |
|------|------|-----|
| `index.ts` | `attachCollab(server)` — handles WS `upgrade` on `/collab`, checks origin, parses the diagram `site_id`, authenticates, authorizes, then hands the socket to the room server. Rejects with codes 4400/4401/4403/4404. | Gatekeeps the WS handshake before any document data flows. |
| `server.ts` | Per-diagram `Room`: a Yjs `Y.Doc` + awareness, broadcasts sync/awareness updates, debounced persistence, ping/pong liveness, tears down + persists when the last client leaves. | Core CRDT sync engine; one in-memory room per open diagram. |
| `auth.ts` | Verifies the access PASETO from cookie/Bearer, extracts `site_id` from the URL, resolves diagram access. | Reuses the same identity + RBAC as the REST layer for WS. |
| `role.ts` | `canWriteDiagram(role)` — EDITOR+ may write. | Read-only viewers can sync but not mutate the doc. |
| `persistence.ts` | `loadDocument` (Yjs binary snapshot, else seed from the Mongo diagram) / `storeDocument` (encode state to `Buffer`, upsert, and project `nodes`/`edges`/`metadata` back to the diagram doc). | Durable CRDT state across sessions + keeps the queryable diagram in sync. |
| `env.ts` | Cookie name + collab path + debounce constants. | Centralized collab tunables. |

> Why WebSocket here (not SSE): collaboration is **bidirectional** binary CRDT traffic; SSE is
> one-way and is used only for notifications.

---

## `MessageQueue/` — background workers (separate process)

| File | What | Why |
|------|------|-----|
| `index.ts` | Worker process entry: own Prisma client + own `mongoose.connect`, SIGTERM/SIGINT handlers, then `require`s both workers. | Workers run as a **separate process** with their own connections. |
| `worker.emails.ts` | BullMQ `Worker` on `emailQueue` → `jobProcessor`. | Consumes email jobs off `REDIS_CACHE_BULLMQ`. |
| `worker.notification.ts` | BullMQ `Worker` on `notificationQueue` → `jobNotificationProcessor`. | Consumes notification jobs. |
| `emails/Queue/queue.email.ts` | `emailQueue` + `addJobToQueue` with remove-on-complete/fail ages. | Producer side of email jobs. |
| `emails/jobs/job.process.emails.ts` | Dispatches by `data.type` (login/register/invite) to an HTML template, sends via Resend. | Maps a job to a rendered email. |
| `emails/template/*.ts` | `login` / `register` / `invite` HTML builders (+ template `@types`). | Transactional email bodies. |
| `provider/resend.ts` | `resendFunction` — sends via **Resend** and records an `Emails` row (for open/click tracking). | Single email-provider integration + tracking seed. |
| `notifications/Queue/queue.notification.ts` | `notificationQueue` + `addNotificationJobToQueue`. | Producer side of notification fan-out. |
| `notifications/jobs/job.process.notification.ts` | Persists a `Notification` row, then `redis.publish("notifications", payload)`. | Durable persistence + cross-instance publish. |

---

## `middleware/`

| File | What | Why |
|------|------|-----|
| `user/user.middleware.ts` | `userMiddleware` — verifies access PASETO + `token_version`, then serves the user from Redis (`user:${id}`, 300s) or Postgres. | Lean auth guard reused across domains; cache-first to avoid a DB hit per request. |
| `validateDTO.ts` | `validateDTO(schema)` — `safeParse`s `req.body`, replaces it with parsed data, or forwards `AppError.badRequest`. | Reusable zod request validator. |
| `multer/index.ts` | `uploadAvatar` — single image, ≤ 5MB, image-MIME only, in memory. | Hardened avatar upload before processing. |

---

## `functions/`

| File | What | Why |
|------|------|-----|
| `redis/cache.service.fun.ts` | `cacheService` — `getData`/`setData`/`setExData`/`deleteData`/`deleteByPattern` (keys JSON-stringified). | Thin typed cache helper over the Redis client. |
| `redis/cache.invalidation.ts` | `invalidateUserProjectsCache` — SCAN-deletes a user's `projects:` keys. | Busts list cache on writes. |
| `upload/avatar.image.fun.ts` | `avatarProfile` — generates an initials avatar (sharp + SVG, random brand color, Arabic/English detection) and uploads to Cloudinary. | New users get a generated avatar. |
| `upload/image.process.ts` | `avatarProcess` / `imageProcess` / `imagesUpload` — resize/convert to webp and upload. | Processes user-supplied images. |
| `upload/image.contenttype.ts` | `getContentType(filename)` — extension → MIME. | Content-type detection helper. |

---

## `utils/`

| File | What | Why |
|------|------|-----|
| `api-requesthandler.ts` | `asyncHandler` — thin wrapper returning the handler promise. | Express 5 auto-forwards rejections, so this just standardizes signatures. |
| `errors/app-error.ts` | `AppError` + typed static constructors (`badRequest`/`unauthorized`/…). | Operational errors with status codes. |
| `errors/errorHandler.ts` | Central error middleware: maps `AppError` → status, hides stacks, generic 500. | Registered last in `app.ts`; one place for error responses. |
| `loadKey.ts` | `loadPrivateKey`/`loadPubliceKey` — normalize literal-`\n` PEM env strings into `KeyObject`s. | PASETO keys are stored as raw PEM in env. |
| `limit-request.ts` | `limiter` (global 350/5min) + `authlimiter` (5/2min, skips successes), IPv6-safe keying. | Rate limiting. |
| `getLocation.ts` | Geo string from Cloudflare headers. | Used in login-notification emails. |
| `logger.ts` | pino: pretty in dev, JSON file in prod, silenced in tests; redacts secrets. `createLogger(ctx)` for child loggers. | Structured, secret-safe logging. |
| `authenticated-user.ts` | `getAuthenticatedUser(req)` — typed `req.user` or throws 401. | Safe accessor for the authed user. |
| `uuid.ts` | `generateUUID()` — dashless uuid v4. | Compact ids (e.g. email tracking `site_id`). |

---

## Types & test scaffolding

| File | What | Why |
|------|------|-----|
| `@types/index.d.ts` | `IUser` interface. | Shared user shape for `req.user`. |
| `types/express/index.d.ts` | Augments Express `Request` (`user`, `lang`, `clientIP`, `useragent`, `geo`, `diagramAccess`, `projectRole`). | Types the request properties set by middleware. |
| `__mocks__/prisma.ts` | `prismaMock` — deep-mocked `PrismaClient`. | DB-free unit tests. |
| `__mocks__/index.ts` | Wires `vi.mock("@/prisma")` + resets per test. | Auto-reset mock between tests. |
| `generated/` | Prisma client output (gitignored). | Generated by `prisma generate`; imported as `src/generated/prisma`. |

---

## `module/<domain>/` — feature domains

Each domain follows the layered shape (`*.module.ts` router → `*.controller.ts` barrel →
`controller/*` → `service/base.*` → `DTO/*`). Per-domain deep docs:

| Domain | Endpoints + tech |
|--------|------------------|
| authentication | [authentication.md](./authentication/authentication.md) · [tech.md](./authentication/tech.md) |
| user | [user.md](./user/user.md) · [tech.md](./user/tech.md) |
| project | [project.md](./project/project.md) · [tech.md](./project/tech.md) |
| Notifications | [notifications.md](./notifications/notifications.md) · [tech.md](./notifications/tech.md) |
| emails | [emails.md](./emails/emails.md) · [tech.md](./emails/tech.md) |
| diagram | [diagram.md](./diagram/diagram.md) · [tech.md](./diagram/tech.md) |

Common per-domain files: `@types/index.d.ts` (domain types), `utils/*` (e.g. `paseto.utils.ts`,
`project/utils/token.ts` invite JWT, `Notifications/utils/{client,sseFormat}.ts`), `schema/*`
(diagram Mongoose models incl. `diagram.ydoc.schema.ts` for the CRDT buffer), and
`__test__/*` / `*.spec.ts` (Vitest tests co-located with the code).

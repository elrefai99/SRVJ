# SRVJ Backend — API & Service Documentation

Per-domain reference for every endpoint mounted under `/api/v1`. Each domain doc lists its
routes, the middleware chain, request/response shape, the service that does the work, and **why
each technology was chosen** for that domain.

## Domains

| Domain | Base path | Doc |
|--------|-----------|-----|
| Authentication | `/api/v1/auth` | [authentication.md](./authentication/authentication.md) |
| User | `/api/v1/user` | [user.md](./user/user.md) |
| Project | `/api/v1/project` | [project.md](./project/project.md) |
| Notifications | `/api/v1/notification` | [notifications.md](./notifications/notifications.md) |
| Emails (tracking) | `/api/v1/emails` | [emails.md](./emails/emails.md) |
| Diagram | `/api/v1/diagram` | [diagram.md](./diagram/diagram.md) |

Operational endpoints outside the domain routers: `GET /api/health`, `GET /metrics`
(Prometheus, guarded by `METRICS_TOKEN`).

**Full file-by-file map of `src/` (bootstrap, config, collab, workers, middleware, utils):**
[codebase.md](./codebase.md).

## Global stack and why

| Concern | Tech | Why here |
|---------|------|----------|
| HTTP framework | **Express 5** | Auto-forwards rejected async handlers, so `asyncHandler` stays a thin wrapper; mature middleware ecosystem. |
| Relational data | **Prisma 7 + Postgres** (`pg` driver adapter) | Type-safe queries, migrations, relations for users/projects/invites/notifications. |
| Document data | **Mongoose 8 + MongoDB** | Diagrams are arbitrary JSON (`nodes`/`edges`/`metadata` as `Mixed`); a schemaless document store fits better than rigid SQL columns. |
| Auth tokens | **PASETO v4** (`paseto`) | Fixed, non-negotiable crypto (no `alg` confusion attacks like JWT); separate keypairs per token type. |
| Password hashing | **bcryptjs** | Slow, salted hashing; rounds tuned via `API_KEY_SALT`. |
| Validation | **zod v4** | Schema is the source of truth; inferred TS types keep DTOs and runtime checks in sync. |
| Cache / pub-sub | **Redis** | Shared cache client for hot reads, plus a separate URL for BullMQ and the notifications pub/sub. |
| Background jobs | **BullMQ** | Durable Redis-backed queues for email + notification fan-out, off the request path. |
| Transactional email | **Resend** | Simple API; HTML templates rendered in the worker. |
| Rate limiting | **express-rate-limit** | IP-keyed throttling; strict limiter on auth routes. |
| Realtime | **SSE + Redis pub/sub** (notifications), **Yjs** (diagram collab, scaffolded) | SSE is one-way server→client and cheap; pub/sub bridges app instances. |
| Compression | **compression (gzip)** | Shrinks large diagram/list JSON payloads on the wire. |

## Conventions

- **Service objects** return `{ success, error, message, data }` — they do not throw. Controllers
  translate that into HTTP status codes.
- Every Postgres row has an internal `Int id` plus a public `site_id` (uuid). External APIs use
  `site_id`, never the integer.
- Auth guards verify the **access** PASETO key and set `req.user`. `userMiddleware` (lean) and
  `meMiddleware` (full profile) both cache the user in Redis under `user:${id}`.

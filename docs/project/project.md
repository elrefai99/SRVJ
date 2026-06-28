# Project — `/api/v1/project`

CRUD for projects plus the invite/membership flow. Projects live in Postgres; each project owns one
diagram document in MongoDB created alongside it.

Source: `src/module/project/`. Service: `service/base.project.service.ts` (`BasedProject`).

## Endpoints

### `POST /create`
- **Middleware:** `userMiddleware` → `validateDTO(createProjectDTO)`
- **Body:** `{ title, description, visibility: PRIVATE|PUBLIC|UNLISTED }`
- **Flow:** `createService` creates the project + an `OWNER` `ProjectMember` in a single
  `prisma.$transaction`, then creates the Mongo diagram + first version, then invalidates the
  owner's project-list cache.
- **Why a transaction:** project and owner-membership must both exist or neither — one round-trip,
  no half-created project.

### `GET /`
- **Middleware:** `userMiddleware`
- **Query:** `page`, `limit`, `search`
- **Flow:** `getService` is **cache-first** (`projects:${user}:${page}:${limit}:${search}`, 300s
  TTL). On miss it runs the list query (projects the user owns **or** is a member of, active,
  optional title search) and the matching `count` in parallel, then joins each project's diagram
  document from MongoDB by `site_id`.
- **Why:** the dashboard's most-hit read; caching plus a parallel list+count keeps it fast.

### `PUT /edit/:id`
- **Middleware:** `userMiddleware` → `validateDTO(editProjectDTO)`
- **Flow:** `editService` updates only owner-scoped fields that were provided, then busts the cache.
  Ownership is enforced in the `where` (`ownerId = user`), so a non-owner edit matches nothing.

### `DELETE /delete/:id`
- **Middleware:** `userMiddleware`
- **Flow:** `deleteService` verifies ownership, soft-deletes the project + its members in a
  transaction, then **hard-deletes** the project's diagram + diagram versions from MongoDB, then
  busts the cache. Returns `404` if not owned/found.

### `POST /invite`
- **Middleware:** `userMiddleware`
- **Flow:** `inviteService` validates the inviter owns the project and creates an `InviteProjects`
  row (`status = inactive`) addressed by email.

### `PATCH /invite/accept/:id`
- **Middleware:** `userMiddleware`
- **Flow:** `acceptInviteService` flips the invite to `active`/`delete` based on the decision and, on
  accept, creates a `ProjectMember`, then busts the accepting user's cache.

### `GET /invite/get`
- **No auth guard** — the caller proves identity by holding a signed invite token.
- **Flow:** `getInvitesService` verifies the **JWT** invite token (`HS256`) and returns the pending
  invite for that email. Invalid token returns `{ token: true }`.

## Why this tech

- **Prisma transactions** — keep project+member and project soft-delete+member soft-delete atomic.
- **Redis list cache, per `user:page:limit:search`** — collapses the dashboard read to a cache hit;
  invalidated on any write that affects the owner's list.
- **Dual write (Postgres + MongoDB)** — relational truth (ownership, membership, visibility) stays in
  Postgres; the freeform diagram payload lives in MongoDB and is joined in only when listing.
- **JWT (HS256) for invite links, not PASETO** — invites are short-lived (6h), shareable, stateless
  bearer tokens for an unauthenticated recipient; a symmetric signed token is the right tool and is
  kept separate from the PASETO session system.
- **zod `editProjectDTO` with all-optional fields** — supports partial updates while still bounding
  every field's size.
- **Ownership enforced in the query `where`, not after fetch** — avoids a check-then-act race and
  means an unauthorized id simply matches zero rows.

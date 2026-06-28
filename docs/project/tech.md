# Project — Tech Stack

Path: `src/module/project/` · Base route: `/api/v1/project`

| Tech | What it is | Why used here |
|------|------------|---------------|
| **Prisma + Postgres** | Type-safe relational ORM. | Source of truth for projects, members, invites, visibility, ownership. |
| **Prisma `$transaction`** | Atomic multi-statement DB op. | Project + `OWNER` member created together; project + members soft-deleted together. All-or-nothing. |
| **Mongoose + MongoDB** | Document ORM. | Each project owns one diagram document; created with the project, hard-deleted with it. |
| **Redis cache** (`projects:${user}:${page}:${limit}:${search}`, 300s TTL) | Key/value cache. | Dashboard list is the hottest read; cached and invalidated on any owner-affecting write. |
| **zod v4** | Validation + inferred types. | `createProjectDTO` (required) / `editProjectDTO` (all-optional, partial update); bounds every field. |
| **jsonwebtoken (HS256)** | Symmetric signed tokens. | Invite links: short-lived (6h), shareable, stateless bearer tokens for an unauthenticated recipient — kept separate from the PASETO session system. |
| **Query-level ownership** (`where: { ownerId }`) | Authorization in the SQL filter. | Edit/delete match zero rows for non-owners — avoids check-then-act races. |
| **`Promise.all` (list + count)** | Parallel queries. | List page and total count run together to cut latency. |

## Key concepts explained

### ACID transactions
A transaction groups statements so they **all commit or all roll back** — never half-applied.
- **Here:** `prisma.$transaction` wraps project + `OWNER` member creation, and project + members
  soft-delete. If the second write fails, the first is undone — no project without an owner row.

### Cache invalidation by key pattern
Cached list keys encode their inputs (`projects:${user}:${page}:${limit}:${search}`). A write that
changes a user's list deletes the matching keys so the next read rebuilds fresh.
- **Why per-input keys:** different pages/searches are independent cache entries; invalidation
  targets one user's set rather than flushing everything.

### Symmetric vs asymmetric tokens (why JWT for invites, PASETO for sessions)
- **Asymmetric (PASETO, sessions):** private key signs, public key verifies — good when verification
  happens in many places and the signer must stay exclusive.
- **Symmetric (JWT HS256, invites):** one shared secret signs and verifies. Invites are short-lived
  (6h), self-contained, single-purpose bearer links for an unauthenticated recipient — a symmetric
  signed token is simpler and intentionally separate from the session system.

### Authorization in the query (check-and-act safety)
Ownership is part of the SQL `where` (`ownerId = user`) instead of "fetch, then compare in JS".
- **Why:** removes the time-of-check/time-of-use gap and means an unauthorized id simply matches
  zero rows — no separate 403 branch to get wrong.

### Polyglot persistence
Relational facts (ownership, membership, visibility) in Postgres; the freeform diagram document in
MongoDB. Each store is used for the data shape it handles best, joined at read time by `site_id`.

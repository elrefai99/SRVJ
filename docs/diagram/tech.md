# Diagram — Tech Stack

Path: `src/module/diagram/` · Base route: `/api/v1/diagram`

| Tech | What it is | Why used here |
|------|------------|---------------|
| **Mongoose + MongoDB** | Document ORM. | Diagram `nodes`/`edges`/`metadata` are arbitrary, deeply-nested JSON (`Schema.Types.Mixed`) that changes shape per diagram — a document store fits far better than rigid SQL columns. |
| **Prisma + Postgres** | Relational ORM. | Holds the authorization data — project ownership, membership, visibility — resolved per request. |
| **`resolveDiagramAccess`** | Cross-store access resolver. | One helper does the Mongo→Postgres hop (diagram → project → caller role) so controllers never re-implement access checks. |
| **RBAC middleware** (`authorizeDiagram(action)`) | Role-gated guard. | Role rank `VIEWER<EDITOR<OWNER`; each action declares a minimum role. `PUBLIC` projects allow `view` to non-members. Centralizes permission logic. |
| **Append-only versioning** (`DiagramVersion`) | New row per save/restore. | Never rewrites history — gives an audit trail and safe restore; restore is just another forward version. |
| **zod v4** (`updateDiagramDTO`) | Validation + inferred types. | Validates `nodes`/`edges` arrays + optional `metadata` on save. |
| **Yjs** (`diagramYDocModel`, CRDT `state` as `Buffer`) | Conflict-free replicated data type. | Realtime collaborative editing — multiple editors merge concurrent changes without a central lock; binary state persists between sessions. Scaffolded for `src/collab/`. |
| **`Promise.all` + pagination** | Parallel queries. | Version list + `countDocuments` run together; history paginated `version` desc. |
| **Redis cache invalidation** | Bust project-list cache. | Save/restore invalidates the owner's project-list cache so embedded diagram data stays fresh. |

## Key concepts explained

### CRDT — Conflict-free Replicated Data Type
A data structure designed so that **concurrent edits from many users merge automatically** into the
same final state, with no central server deciding order and no locks. Each replica applies operations
locally and exchanges updates; the math guarantees everyone converges.
- **The problem it solves:** two people drag the same node at the same time. With a naive "last write
  wins" you lose one edit; with locking you block the other user. A CRDT merges both deterministically.
- **Yjs** is a CRDT implementation for shared documents. The merged document is encoded as a compact
  **binary state** (a `Buffer`), which is what `diagramYDocModel` persists so a session can resume.
- **Why here:** diagrams are collaboratively edited in realtime; CRDTs give multi-user editing
  without a central lock or a server round-trip per keystroke. (Wired for the `src/collab/` layer.)

### RBAC — Role-Based Access Control
Permissions are attached to **roles**, and users get roles; code checks the role, not the user.
- Here: `VIEWER < EDITOR < OWNER` ranked numerically; each action declares a minimum role
  (`view→VIEWER`, `edit/restore→EDITOR`, `delete→OWNER`). `authorizeDiagram(action)` compares ranks.
- **Why:** one table drives all permission decisions; routes just name the action they need, so
  access rules stay consistent and in one place.

### Append-only / event-sourced versioning
Instead of overwriting the document, every save/restore **writes a new immutable version row**; the
live diagram points at the latest.
- **Why:** full history/audit trail, and "restore" is safe — it doesn't rewind by deleting, it
  appends the old content as a brand-new version going forward.

### Polyglot persistence (Mongo + Postgres)
Using **different databases for different data shapes** in one app.
- Freeform diagram JSON → MongoDB (schemaless, nested). Relational ownership/membership → Postgres
  (joins, constraints). `resolveDiagramAccess` stitches the two per request.

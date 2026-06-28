# Diagram — `/api/v1/diagram`

Read and version-management for diagram documents. Diagrams are stored in **MongoDB** (freeform
`nodes`/`edges`/`metadata`); access is gated by the parent project's role/visibility resolved from
**Postgres**.

Source: `src/module/diagram/`. Service: `service/base.diagram.service.ts` (`BasedDiagram`).
Authorization: `middleware/authorize.diagram.ts`, `service/resolve.access.ts`,
`middleware/role.constant.ts`.

## Authorization model

Every route runs `userMiddleware` then `authorizeDiagram(action)`:

1. `resolveDiagramAccess` finds the diagram (Mongo) → its project (Postgres) → the caller's role.
2. Role rank: `VIEWER(1) < EDITOR(2) < OWNER(3)`. Each action has a minimum role:
   `view→VIEWER`, `edit/restore→EDITOR`, `delete/manage→OWNER`.
3. A `PUBLIC` project allows `view` to non-members (treated as `VIEWER`); otherwise a non-member is
   `403`. Insufficient role is `403`; unknown diagram is `404`.
4. On success it sets `req.diagramAccess` and `req.projectRole`.

## Endpoints

### `GET /:siteId`
- **Guard:** `authorizeDiagram("view")`
- **Flow:** `getDiagramService` loads the diagram by `site_id` and returns normalized
  `nodes`/`edges`/`metadata` (arrays defaulted, never null).

### `GET /:projectId/versions`
- **Guard:** `authorizeDiagram("view")`
- **Flow:** `getVersionsService` paginates the version history (`sort version desc`) with a parallel
  `countDocuments`.

### `GET /:projectId/versions/:versionId`
- **Guard:** `authorizeDiagram("view")`
- **Flow:** `getVersionService` returns one version by its `site_id`.

### `POST /:projectId/versions/:versionId/restore`
- **Guard:** `authorizeDiagram("restore")` (EDITOR+)
- **Flow:** `restoreVersionService` copies the chosen version's `nodes`/`edges`/`metadata` onto the
  live diagram, bumps `version`, and **appends a new version** recording the restore (history is
  never rewritten). Then invalidates the project-list cache.

> `updateDiagramService` + `updateDiagramDTO` exist for saving edits (validated `nodes`/`edges`,
> optional `metadata`) and likewise snapshot a new version on every save. The realtime collaborative
> editing path is **Yjs** (`schema/diagram.ydoc.schema.ts` stores the CRDT `state` as a `Buffer`),
> scaffolded for the future `src/collab/` layer.

## Why this tech

- **MongoDB for the document, Postgres for access** — `nodes`/`edges`/`metadata` are arbitrary,
  deeply nested JSON that changes shape per diagram; a `Mixed` document store fits far better than
  rigid SQL columns. Authorization data (ownership, membership, visibility) is relational, so it
  stays in Postgres and is resolved per request.
- **Append-only versioning** — every save/restore writes a new `DiagramVersion` rather than mutating
  history, giving an audit trail and safe restore. Restore itself is just another forward version.
- **Centralized RBAC middleware** — `authorizeDiagram(action)` + the role-rank table keep
  permission logic in one place; routes only declare the action they need.
- **Cross-store resolution in one helper** (`resolveDiagramAccess`) — a single function does the
  Mongo→Postgres hop so controllers never re-implement access checks.
- **Yjs CRDT for collaboration** — conflict-free replicated data type lets multiple editors merge
  concurrent changes without a central lock; the binary `state` persists between sessions.

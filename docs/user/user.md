# User — `/api/v1/user`

Profile read, update (with avatar upload), and soft-delete for the authenticated user.

Source: `src/module/user/`. Service: `Service/base.user.service.ts` (`BaseUser`).

## Endpoints

### `GET /me`
- **Middleware:** `meMiddleware`
- **Flow:** `meMiddleware` verifies the access PASETO, checks `token_version`, then serves the
  profile from Redis (`user:${id}`, 300s TTL) or falls back to Postgres and back-fills the cache.
  `profileController` returns `req.user` (id, fullname, email, username, avatar).
- **Why:** this endpoint is hit on nearly every page load, so it is cache-first to avoid a DB
  round-trip per request.

### `PUT /update`
- **Middleware:** `userMiddleware` → `uploadAvatar` (multer) → controller
- **Body:** `multipart/form-data` with optional `img` file + `fullname`.
- **Flow:** `uploadAvatar` accepts a **single image ≤ 5MB** in memory; `BaseUser.update_profile`
  runs the image through `avatarProcess` (sharp/Cloudinary), updates the row, then invalidates the
  user's caches — `user:${id}` **and** the project-list caches of every project the user belongs to.
- **Why cache invalidation here:** the cached `user:${id}` object includes the avatar, and the
  member's avatar is embedded in project-list responses, so both must be busted on update.

### `DELETE /delete`
- **Middleware:** `userMiddleware`
- **Flow:** `BaseUser.delete_profile` soft-deletes (sets `status = inactive`) and invalidates caches.
- **Why soft delete:** preserves referential history (projects, notifications, invites) and allows
  recovery; status filtering hides the account everywhere.

## Why this tech

- **multer `memoryStorage` + size/type/count limits** — uploads are validated (image MIME only,
  ≤ 5MB, exactly one file) before touching disk or a CDN, keeping the upload path cheap and
  DoS-resistant.
- **sharp** — fast native image processing for avatar normalization/resizing.
- **Redis cache (`user:${id}`)** — turns the hot `GET /me` and every `userMiddleware`-guarded
  request into a cache read instead of a Postgres query.
- **Soft delete via `tableStatus`** — every query filters `status = active`, so one enum flips the
  account off without cascading hard deletes.
- **Two guards (`meMiddleware` vs `userMiddleware`)** — `me` selects the fuller profile for the
  profile screen; the lean guard is reused across other domains. Both share the same Redis key so
  the cache stays coherent.

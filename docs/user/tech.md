# User — Tech Stack

Path: `src/module/user/` · Base route: `/api/v1/user`

| Tech | What it is | Why used here |
|------|------------|---------------|
| **PASETO v4** (`paseto`) | Token verification. | `meMiddleware` / `userMiddleware` verify the access token + `token_version` before serving profile. |
| **Redis cache** (`user:${id}`, 300s TTL) | In-memory key/value store. | `GET /me` and every guarded request is cache-first to avoid a Postgres hit per request. Busted on profile update. |
| **multer** (`memoryStorage`) | Multipart file upload parser. | Avatar upload: holds the file in memory, limited to a single image ≤ 5MB before any processing. |
| **sharp** | Native image processing. | `avatarProcess` resizes/normalizes the uploaded avatar fast. |
| **Cloudinary** | Media CDN/storage. | Stores the processed avatar and returns its URL. |
| **zod v4** | Validation + inferred types. | `updateProfileDTO` bounds `fullname` and shapes the update payload. |
| **Prisma + Postgres** | Relational ORM. | Profile update; soft-delete via `status = inactive`. |
| **Soft delete** (`tableStatus` enum) | Status flag instead of row removal. | Preserves referential history (projects/notifications/invites) and allows recovery; every query filters `status = active`. |

## Key concepts explained

### Cache-aside (lazy caching)
The app checks the cache first; on a **miss** it reads the DB and writes the result back to the cache
for next time.
- **Here:** `user:${id}` in Redis with a 300s TTL. `GET /me` and every guarded request become a
  Redis read instead of a Postgres query.
- **Invalidation:** on profile update the key is deleted so stale data can't linger; the **TTL** is a
  safety net that bounds staleness even if an invalidation is missed.

### Soft delete
Deleting = flipping `status` to `inactive`/`delete`, not removing the row.
- **Why:** other tables reference the user (projects, notifications, invites); a hard delete would
  cascade or orphan them. A status flag hides the account everywhere (queries filter `status =
  active`) and keeps recovery possible.

### Upload hardening
The avatar upload is constrained **before** processing: image MIME only, ≤ 5MB, exactly one file,
held in memory (`multer.memoryStorage`).
- **Why:** rejects oversized/non-image payloads early — less CPU/memory spent, smaller DoS surface —
  then **sharp** normalizes the image and Cloudinary stores it.

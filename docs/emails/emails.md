# Emails (tracking) — `/api/v1/emails`

Public open/click tracking for outbound transactional emails. These endpoints are hit by the
recipient's mail client (tracking pixel) and by clicked links — **no auth, no DTO**.

Source: `src/module/emails/`. Service: `service/based.emails.service.ts` (`BasedEmails`).

> Sending of email is a separate concern handled by the BullMQ `emailQueue` worker via **Resend**
> with HTML templates (`MessageQueue/emails/`). This domain only records engagement.

## Endpoints

### `GET /opened`
- **No auth.** Query carries the `email_id`.
- **Flow:** `opendService` finds the matching `Emails` row that has not yet been seen and flips
  `seen = true`. Idempotent — a second open is a no-op.
- **Why:** served as a 1×1 tracking pixel; the mail client requesting the image is the "open" signal.

### `GET /click`
- **No auth.** Query carries the `email_id`.
- **Flow:** `clickService` flips `click = true` on the first click; subsequent clicks are no-ops.
- **Why:** the tracked link redirects through this endpoint to record the click.

## Why this tech

- **No auth / no DTO by design** — the caller is an email client or a link redirect, not a logged-in
  user; there is no session to verify. The only input is an opaque `email_id`.
- **First-touch idempotency** (`seen: false` / `click: false` in the `where`) — duplicate pixel
  loads and double clicks do not double-count and avoid an extra write.
- **Plain Prisma flag flips** — engagement is a boolean per email; no service result envelope or
  business logic is needed beyond find-and-update.
- **Sending lives in the worker, tracking lives here** — keeps the public, unauthenticated surface
  minimal and separate from the queue/provider integration.

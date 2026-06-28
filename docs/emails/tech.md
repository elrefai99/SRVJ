# Emails (tracking) — Tech Stack

Path: `src/module/emails/` · Base route: `/api/v1/emails`

Public open/click tracking for outbound email. Sending itself is handled by the BullMQ `emailQueue`
worker; this domain only records engagement.

| Tech | What it is | Why used here |
|------|------------|---------------|
| **Prisma + Postgres** | Relational ORM. | Flips `seen` / `click` booleans on the `Emails` row by `email_id`. |
| **No auth / no DTO** | Open public endpoints. | Caller is a mail client (tracking pixel) or a link redirect, not a logged-in user — no session to verify; only input is an opaque `email_id`. |
| **First-touch idempotency** (`where: { seen: false }` / `{ click: false }`) | Guard in the query. | Duplicate pixel loads / double clicks don't double-count and skip an extra write. |
| **Resend** (in the worker, not here) | Transactional email API. | Sends the HTML templates whose opens/clicks this domain tracks. Listed for context. |
| **BullMQ** (`emailQueue`, in the worker) | Job queue. | Dispatches email sends by type off the request path. Listed for context. |

## Key concepts explained

### Email open/click tracking
- **Open tracking:** the email embeds a tiny 1×1 image whose URL points at `/opened?...email_id`.
  When the recipient's mail client loads images, it requests that pixel — the request itself is the
  "opened" signal.
- **Click tracking:** outbound links route through `/click?...email_id` which records the click then
  redirects to the real destination.
- **Why public/no-auth:** the caller is a mail client or a redirect, never a logged-in user — there's
  no session to verify; the only input is the opaque `email_id`.

### Idempotency
An operation that has the **same effect whether applied once or many times**.
- **Here:** the `where` includes `seen: false` / `click: false`, so the first open/click flips the
  flag and every repeat is a no-op. Mail clients re-load pixels and users double-click; idempotency
  keeps counts honest and avoids redundant writes.

### Producer/consumer split
This domain (the **consumer-facing tracker**) is deliberately separate from sending. Sending is a
**producer** path: BullMQ `emailQueue` → Resend with HTML templates, in the worker process.
- **Why:** keeps the public, unauthenticated surface tiny and isolated from the queue/provider code.

# Notifications — Tech Stack

Path: `src/module/Notifications/` · Base route: `/api/v1/notification`

| Tech | What it is | Why used here |
|------|------------|---------------|
| **SSE (Server-Sent Events)** | One-way server→client stream over plain HTTP. | `/stream` pushes notifications live. One-way, auto-reconnecting, no extra protocol, cheap to hold open — fits notifications better than WebSocket. |
| **In-process client map** (`Map<userId, Set<SSEClient>>`) | Per-instance registry of open connections. | One entry per tab/device; fastest way to address sockets this instance physically holds. |
| **Redis pub/sub** (channel `"notifications"`) | Fan-out messaging. | Connections are in-process, so an event published on instance A reaches a tab held by instance B via the shared channel. |
| **BullMQ** (`notificationQueue`) | Redis-backed job queue. | `/publish` enqueues and returns instantly; the worker persists + publishes durably with retry, off the request path. |
| **Prisma + Postgres** | Relational ORM. | Persists each `Notification` row so `/list` can serve history to tabs that were offline. |
| **`REDIS_CACHE_BULLMQ`** | Dedicated Redis URL. | Pub/sub + BullMQ share this connection, kept distinct from the read-cache Redis (`_DEV`/`_LIVE`). |
| **uuid** | Unique id generator. | Each notification payload gets a stable `id` for the SSE `id:` field / dedupe. |

## Pipeline
`POST /publish` → `notificationQueue` → worker persists row + `redis.publish("notifications")` →
`startSubscriber()` on every instance → SSE frame to matching local clients.

## Key concepts explained

### SSE — Server-Sent Events
A one-way streaming channel: the client opens a normal HTTP request to `/stream`, and the server
keeps it open and writes events whenever it wants (`event:`, `data:`, `id:`, `retry:` text frames).
The browser's native `EventSource` auto-reconnects and resumes from the last `id`.
- **vs WebSocket:** WebSocket is a full-duplex binary protocol (separate upgrade handshake, both
  sides talk). Notifications only need server→client text, so the heavier WebSocket buys nothing.
- **vs polling:** polling re-requests on a timer (latency + wasted calls). SSE pushes instantly over
  one held connection.
- **Why here:** notifications are server-initiated, one-way, text — SSE is the cheapest fit, and it's
  plain HTTP so it passes through proxies/load balancers without protocol upgrades.

### Pub/Sub (publish–subscribe)
A messaging pattern: publishers send to a named **channel**, subscribers listening on that channel
all receive a copy. Sender and receivers are decoupled — neither knows the other.
- **Why here:** the app runs as **multiple instances**, and each SSE connection lives in the memory
  of one instance only. When instance A must notify a user whose tab is held by instance B, A
  `publish`es to the `"notifications"` channel; every instance is subscribed, and whichever one
  holds that tab writes the SSE frame. Pub/sub is the bridge across instances.

### Message queue (BullMQ)
A durable buffer of jobs. Producers `add` jobs; workers pull and process them with retries and
backoff, decoupled in time from the producer.
- **Why here:** `POST /publish` returns immediately after enqueuing; the worker does the slower
  persist-then-publish work. A burst of events can't stall API requests, and a transient failure
  retries instead of being lost.

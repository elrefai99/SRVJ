# Notifications — `/api/v1/notification`

Realtime user notifications over **Server-Sent Events (SSE)**, fanned out across app instances with
**Redis pub/sub**, and persisted in Postgres. Delivery is decoupled from publishing by a **BullMQ**
queue.

Source: `src/module/Notifications/`. Live connections: `utils/client.ts`
(`Map<userId, Set<SSEClient>>`, in-process). Pub/sub client: `shared/redis.ts`.

## Endpoints

### `GET /stream`
- **Middleware:** `userMiddleware`
- **Flow:** `streamController` sets SSE headers (`text/event-stream`, no-cache, keep-alive,
  `X-Accel-Buffering: no`), registers this tab's `res` in the in-process `clients` map under the
  user id, writes an initial `: connected` comment, and removes the connection on `req.close`.
- **Why one entry per tab:** each open tab/device is its own `SSEClient`, so the same user can
  receive on multiple devices.

### `GET /list`
- **Middleware:** `userMiddleware`
- **Flow:** `listController` returns the user's stored notifications from Postgres (history for tabs
  that were offline when the event fired).

### `PATCH /seen`
- **Middleware:** `userMiddleware`
- **Flow:** `seenController` marks notifications read (`isRead = true`).

### `POST /publish`
> Registered in the controller barrel; enqueues rather than delivering directly.
- **Flow:** `publishController` builds a `NotificationPayload` (uuid id, sender = `req.user.id`,
  target, type, title, message, timestamp) and enqueues it on `notificationQueue` via
  `addNotificationJobToQueue`. The response returns immediately.

## Delivery pipeline (why it is split)

```
POST /publish ─▶ notificationQueue (BullMQ)
                      │
            worker.notification: persist Notification row in Postgres
                      │
            redis.publish("notifications", payload)
                      │
   startSubscriber() on every app instance receives the message
                      │
   writes an SSE frame to matching clients in THAT instance's map
```

- **SSE, not WebSocket/Socket.IO** — notifications are one-way (server→client). SSE is plain HTTP,
  auto-reconnects, needs no extra protocol, and is cheaper to hold open. (Socket.IO is wired in
  `app.ts` but the notifications feature intentionally does not use it.)
- **In-process client map** — an app instance can only write to sockets it physically holds; the map
  is the fastest way to address them.
- **Redis pub/sub bridges instances** — because connections are in-process, a notification published
  on instance A must reach the user's tab held by instance B; the `"notifications"` channel fans the
  payload to every instance, each of which pushes to its own connected tabs.
- **BullMQ between publish and delivery** — publishing returns instantly; the worker does the
  persistence + publish durably and with retry, so a burst of events does not block API requests.
- **Two Redis configs, kept distinct** — pub/sub and BullMQ use `REDIS_CACHE_BULLMQ`; the read cache
  uses `REDIS_CACHE_DEV`/`_LIVE`.

# Authentication — `/api/v1/auth`

Handles registration, login, token refresh, logout, and Google sign-in. Issues **PASETO v4**
tokens as httpOnly cookies (access + refresh) and also returns the access token in the JSON body.

Source: `src/module/authentication/`. Service: `service/base.auth.service.ts` (`BaseAuth`).
Token helper: `utils/paseto.utils.ts` (`token_PASETO`, `TOKEN_VERSION`).

## Endpoints

### `POST /register`
- **Middleware:** `authlimiter` → `validateDTO(RegisterDTO)`
- **Body:** `{ fullname, email, password }` — password must be 8–64 chars with upper/lower/number/special.
- **Flow:** `BaseAuth.create_user` checks email is free, hashes the password with **bcrypt**
  (`API_KEY_SALT` rounds), creates the user, generates an avatar (`avatarProfile`), stores it.
- **Returns:** `201`-style success with new user id, or rejects duplicate email.

### `POST /login`
- **Middleware:** `authlimiter` → `validateDTO(LoginDTO)`
- **Body:** `{ email, password }`
- **Flow:** `BaseAuth.login_service` looks up the active user and `bcrypt.compare`s the password.
  On success it mints `access` (2-day) and `refresh` (30-day) PASETO tokens carrying
  `access_device` (browser), sets both as `httpOnly; secure; sameSite=none` cookies, enqueues a
  **login-notification email** via BullMQ (`addJobToQueue("login", ...)`), and returns the access
  token in the body.
- **Failure message** is deliberately generic (`Invalid email or password`) to avoid user enumeration.

### `POST /refresh`
- **Middleware:** `authlimiter`
- **Flow:** rejects disallowed `Origin`, reads the `refresh_token` cookie, verifies it against the
  **refresh** public key, checks `token_version === TOKEN_VERSION`, confirms the user is still
  active, then **rotates** both access and refresh cookies.
- **Why rotation + origin + version:** limits the blast radius of a stolen refresh token and lets us
  invalidate every outstanding token globally by bumping `TOKEN_VERSION`.

### `POST /logout`
- Clears `access_token` and `refresh_token` cookies. No body, no auth.

### `POST /google`
- **Middleware:** `authlimiter`
- **Body:** Google ID token.
- **Flow:** `BaseAuth.googleService` verifies the ID token with **google-auth-library**
  (`OAuth2Client.verifyIdToken`), requires `email_verified`, then links the `googleId` to an
  existing account matched by verified email, or creates a new account.

## Why this tech

- **PASETO v4, not JWT** — PASETO fixes the algorithm, eliminating the `alg=none` / algorithm-confusion
  class of JWT bugs. Each token type (`access` / `refresh` / `forget_password` / `pending`) is signed
  with its **own** private key, so leaking one key does not compromise the others.
- **httpOnly + secure + sameSite=none cookies** — keeps tokens out of JS (XSS resistance) while still
  allowing the separate frontend origin to send them (credentials CORS).
- **`token_version` claim** — a cheap global revocation switch; no per-token blacklist store needed.
- **bcryptjs** — adaptive, salted password hashing; cost is tunable as hardware improves.
- **google-auth-library** — verifies Google's signature and audience server-side; the client never
  proves identity by itself.
- **zod DTOs** — enforce password strength and email validity before any DB work; the inferred type
  is reused as the service argument type.
- **express-rate-limit (`authlimiter`, 5/2min, skips successes)** — blunts credential-stuffing and
  brute-force against `/login`, `/register`, `/refresh`, `/google`.
- **BullMQ for the login email** — the security-notification email is sent off the request path so a
  slow email provider never delays the login response.

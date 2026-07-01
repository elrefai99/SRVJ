# Authentication — Tech Stack

Path: `src/module/authentication/` · Base route: `/api/v1/auth`

| Tech | What it is | Why used here |
|------|------------|---------------|
| **PASETO v4** (`paseto`) | Platform-agnostic security tokens with a fixed algorithm. | Session tokens. Fixed crypto removes JWT `alg`-confusion bugs. Separate keypair per token type (access / refresh / forget_password / pending) so one leaked key isn't total compromise. |
| **bcryptjs** | Adaptive salted password hashing. | Hash passwords on register; `bcrypt.compare` on login. Cost tuned by `API_KEY_SALT`. |
| **google-auth-library** (`OAuth2Client`) | Verifies Google ID tokens server-side. | `/google` sign-in: validates signature + audience + `email_verified` before trusting identity. |
| **zod v4** | Schema validation; inferred TS types. | `RegisterDTO` / `LoginDTO` enforce email validity + password strength (8–64, upper/lower/number/special) before any DB work. |
| **express-rate-limit** (`authlimiter`) | IP-keyed request throttling. | 5/2min on login/register/refresh/google; blunts credential-stuffing and brute-force. |
| **httpOnly cookies** (`access_token`, `refresh_token`) | Cookies unreadable by JS. | Keeps tokens out of JS (XSS-resistant); `secure; sameSite=none` lets the separate frontend origin send them. |
| **`token_version` claim** | Version number embedded in every token. | Global revocation switch — bump the constant to invalidate all outstanding tokens, no blacklist store. |
| **BullMQ** (`emailQueue`) | Redis-backed job queue. | Login-notification email enqueued off the response path so a slow provider never delays login. |
| **Prisma + Postgres** | Type-safe relational ORM. | User lookups/creates; `status = active` filtering. |

## Key concepts explained

### PASETO — Platform-Agnostic Security Tokens
A signed/encrypted token format like JWT, but the algorithm is **fixed by the version** (v4) instead
of chosen in the token header.
- **The JWT problem it avoids:** JWT lets the token declare its own `alg`. Attackers abuse this
  (`alg=none`, or swapping RS256→HS256 to sign with the public key). PASETO removes the choice, so
  that whole bug class disappears.
- **Here:** v4 public-key tokens (`V4.sign`/`V4.verify`). Each token **type** (access / refresh /
  forget_password / pending) uses its **own keypair**, so a leaked key compromises only that type.

### Token rotation + versioning
- **Rotation:** on `/refresh`, both access **and** refresh tokens are reissued. A stolen refresh
  token has a short useful life because the legitimate client keeps rotating it forward.
- **`token_version`:** a number baked into every token and re-checked on verify. Bump the server
  constant and every previously-issued token instantly fails — global logout without storing a
  per-token blacklist.

### Password hashing vs encryption (bcrypt)
Hashing is **one-way** (you can't get the password back); encryption is reversible. Passwords must be
hashed.
- **bcrypt** is *deliberately slow* and **salts** each hash (so identical passwords hash differently
  and rainbow tables are useless). The work factor (`API_KEY_SALT` rounds) is raised over time as
  hardware gets faster. Login uses `bcrypt.compare`, never decryption.

### Rate limiting
Capping requests per client per window. `authlimiter` = 5 per 2 min on auth routes, keyed by client
IP, skipping successful requests.
- **Why:** makes online password-guessing / credential-stuffing impractical without hurting normal
  users.

### Anti-enumeration
Login returns the same generic `Invalid email or password` whether the email exists or the password
is wrong — so an attacker can't probe which emails are registered.

# SRVJ Backend

SRVJ is a TypeScript backend for the SRVJ application. It provides a REST API, authentication, project and diagram services, notifications, background workers, and real-time collaboration.

## Stack

- Node.js 22 and Express 5
- PostgreSQL through Prisma
- MongoDB through Mongoose for diagram documents
- Redis for caching, pub/sub, and BullMQ jobs
- TypeScript, Zod, and Vitest

## Requirements

- Node.js 22
- pnpm 11.6.0 (the version declared by `package.json`)
- PostgreSQL, MongoDB, and Redis instances

Docker Desktop with Docker Compose is useful for local development. The development Compose file starts the API and two Redis instances; PostgreSQL and MongoDB must be available separately.

## Get started

Install dependencies from the lockfile:

```sh
pnpm install --frozen-lockfile
```

Create a development environment file by copying `.env.example` to `.env.dev`, then replace its `XXXX` placeholders with your local values. Keep `.env.dev` private; it is ignored by Git. The app loads `.env.dev` when `NODE_ENV=development` and `.env` otherwise.

At minimum, configure the PostgreSQL `DATABASE_URL`, MongoDB `MONGODB_URI`, API `PORT`, and Redis connection URLs. Set up the credentials for integrations you use, such as Google sign-in, Cloudinary, and Resend. See [.env.example](.env.example) for the full variable list.

Start the API and background workers:

```sh
pnpm dev
```

The development script uses Unix-style environment assignments. On Windows, run it in WSL or use Docker Compose:

```sh
docker compose -f docker-compose.dev.yml up --build
```

The Compose app expects `.env.dev`. Its Redis services are available to the app at `redis-cache:6379` and `redis-bullmq:6379` inside the Compose network; the latter is published to host port `6380`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the API and message-queue worker in development mode |
| `pnpm dev:local` | Run the API and worker without setting `NODE_ENV` in the script |
| `pnpm build` | Generate the Prisma client, compile TypeScript, and copy generated output |
| `pnpm start` | Run the compiled API and worker |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run the Vitest unit test suite |
| `pnpm test:e2e` | Run the Vitest suite with verbose reporting |

## API

API domain routes are mounted under `/api/v1`:

- `/auth` - authentication
- `/user` - user profiles
- `/project` - projects and invitations
- `/notification` - notifications
- `/emails` - email tracking
- `/diagram` - diagrams

Operational endpoints are `GET /api/health` and `GET /metrics`. If `METRICS_TOKEN` is configured, metrics requests must include `Authorization: Bearer <token>`.

See [docs/README.md](docs/README.md) for domain documentation and [docs/codebase.md](docs/codebase.md) for the source tree reference.

## Docker

`docker-compose.dev.yml` is for local development. `docker-compose.yml` builds the production image and starts the API, Redis, and Leoxy services. Both Compose configurations require environment values from the relevant `.env.dev` or `.env` file. Database services are not included in these Compose files.

The production image uses `Dockerfile`; `Dockerfile.dev` is used by the development Compose setup.

## CI

GitHub Actions installs dependencies with `pnpm install --frozen-lockfile`, runs `pnpm build`, validates the Docker Compose configuration, and checks the Docker image build.

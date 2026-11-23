# =============== #
# Stage 1: Build  #
# =============== #
FROM node:22 AS builder

WORKDIR /app

# `prisma generate` only reads the schema to emit client types — it never
# opens a DB connection — so a placeholder satisfies prisma.config.ts's
# env("DATABASE_URL") without ever putting a real credential in an image layer.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN mkdir -p dist/src/generated && cp -r src/generated/* dist/src/generated/

RUN npm run build


# =================== #
# Stage 2: Production #
# =================== #
FROM node:22

WORKDIR /app

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm pm2
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node ecosystem.config.cjs ./
COPY --chown=node:node package.json ./dist/package.json

RUN mkdir -p /app/logs && chown -R node:node /app/logs

USER node

EXPOSE 9000

CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]

# =============== #
# Stage 1: Build  #
# =============== #
FROM node:22 AS builder

WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm
RUN pnpm install -f

COPY . .

RUN npx prisma generate
RUN mkdir -p dist/src/generated && cp -r src/generated/* dist/src/generated/

RUN npm run build


# =================== #
# Stage 2: Production #
# =================== #
FROM node:22

WORKDIR /app

COPY package*.json ./
RUN npm install -g pnpm
RUN pnpm install -f
RUN npm install -g pm2

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma ./prisma

COPY package.json ./dist/package.json
COPY . .

EXPOSE 9000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]

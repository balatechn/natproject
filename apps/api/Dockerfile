# ============================================================
# NAT Project — API (NestJS + Prisma)
# Monorepo: pnpm workspaces
# ============================================================

# ---- Base ----
FROM node:20-alpine AS base
RUN apk add --no-cache python3 make g++ && \
    npm install -g pnpm@9.12.0

# ---- Dependencies ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# ---- Builder ----
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY packages/ packages/
COPY apps/api/ apps/api/
# Restore workspace node_modules symlinks for the API
COPY --from=deps /app/apps/api/node_modules apps/api/node_modules
WORKDIR /app/apps/api
RUN pnpm build && npx prisma generate

# ---- Runner ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules from builder (includes Prisma client + native deps)
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/apps/api/node_modules apps/api/node_modules
COPY --from=builder /app/packages packages

# Copy built output
COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/apps/api/prisma apps/api/prisma

WORKDIR /app/apps/api

EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

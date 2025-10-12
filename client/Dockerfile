# ─── STAGE 1: Install pnpm ────────────────────────────────────────────────────────────
FROM node:23-alpine AS node-with-pnpm
RUN npm install -g pnpm@latest

# ─── STAGE 2: Copy libs ───────────────────────────────────────────────────────────────
FROM node-with-pnpm AS base
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml ./

RUN pnpm -r install

# ─── STAGE 3: Build ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY . .
COPY --from=base /app/node_modules node_modules/

RUN pnpm -r run build

# ─── λ ────────────────────────────────────────────────────────────────────────────────
FROM base AS client
WORKDIR /app
COPY --from=builder /app/.next .next

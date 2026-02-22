FROM node:22-alpine AS base

# ── 依存関係インストール ──────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 開発用ステージ ────────────────────────────────────
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

# ── 本番ビルド ────────────────────────────────────────
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npx prisma generate
RUN npm run build

# ── 本番実行ステージ ──────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# prismaのマイグレーション実行用にnode_modulesをまるごとコピー
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
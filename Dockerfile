# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund
RUN npx prisma generate

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npx esbuild server/index.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node20 \
      --outfile=dist/server.mjs \
      --packages=external \
      --sourcemap=inline
RUN npx esbuild server/start.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node20 \
      --outfile=dist/start.mjs \
      --packages=external
RUN npx esbuild server/seeds/defaultAdmin.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node20 \
      --outfile=dist/seed-admin.mjs \
      --packages=external
RUN npx esbuild server/seeds/pipelineStages.ts \
      --bundle \
      --platform=node \
      --format=esm \
      --target=node20 \
      --outfile=dist/seed-stages.mjs \
      --packages=external

FROM base AS prod-deps
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev --legacy-peer-deps --no-audit --no-fund
RUN npm install --no-save prisma@7.4.2 --legacy-peer-deps
RUN npx prisma generate

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat \
      && addgroup -S nodejs \
      && adduser -S nextjs -G nodejs
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nextjs:nodejs /app/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/next.config.* ./
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
EXPOSE 3001
USER nextjs
CMD ["node", "dist/start.mjs"]

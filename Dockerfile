# WebAnime - Next.js 16 + Tailwind 4 Production Dockerfile (Port 1234)
FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# 2. Build Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Ensure next.config has no output:standalone needed for this simple copy strategy
RUN npm run build

# 3. Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=1234
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files for production (with correct ownership for nextjs user to write prerender cache)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts

# Ensure prerender cache dirs are writable (Next 16 .segments)
RUN mkdir -p /app/.next/cache /app/.next/server && chown -R nextjs:nodejs /app/.next

USER nextjs

EXPOSE 1234

# Next.js respects PORT env, but explicitly pass -p for clarity
CMD ["sh", "-c", "npx next start -p 1234 -H 0.0.0.0"]

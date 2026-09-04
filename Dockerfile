# WebAnime - Next.js 16 + Tailwind 4 Production Dockerfile (Port 1234)
FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Install dependencies (P2.6: --no-audit/--no-fund skip advisory/funding
# lookups — identical node_modules, faster + quieter layer rebuilds).
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# 2. Build Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* are embedded into client JS at build time (not readable from
# container runtime). They must be supplied as build args so production builds
# bake the real origin instead of the localhost fallback.
# Compose passes these through from the VPS .env / shell environment.
# Local default (empty) preserves dev-usable localhost fallback.
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_HLS_BASE_URL=""
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_HLS_BASE_URL=${NEXT_PUBLIC_HLS_BASE_URL}
# Ensure next.config has no output:standalone needed for this simple copy strategy
RUN npm run build

# 3. Production Runner
FROM node:22-alpine AS runner
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

# Lightweight healthcheck — uses wget (available in node:22-alpine) and works as non-root
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:1234/api/health | grep -q '"status":"ok"' || exit 1

# Next.js respects PORT env, but explicitly pass -p for clarity
CMD ["sh", "-c", "npx next start -p 1234 -H 0.0.0.0"]

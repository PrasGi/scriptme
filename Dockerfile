# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./

# Reduce ECONNRESET / network flakes in CI (Jenkins, etc.)
RUN npm config set fetch-timeout 120000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Optional: pass build args in Jenkins for proxy, e.g. --build-arg HTTP_PROXY=... HTTPS_PROXY=...
ARG HTTP_PROXY
ARG HTTPS_PROXY
ENV HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY}

# Retry npm ci on network failure (common in CI)
RUN npm ci --legacy-peer-deps || \
    (sleep 20 && npm ci --legacy-peer-deps) || \
    (sleep 45 && npm ci --legacy-peer-deps)

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy env so Next.js "Collecting page data" does not throw (lib/db.ts checks at import)
ENV MONGODB_URI=mongodb://build:placeholder@localhost:27017/scriptminder?authSource=admin
RUN npm run build

# Stage 3: Runner (Next.js app)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

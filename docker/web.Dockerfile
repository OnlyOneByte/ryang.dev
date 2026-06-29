# Astro SSR app, built and served with Bun.
# Build context is the REPO ROOT (so the workspace install resolves):
#   docker build -f docker/web.Dockerfile -t ryangdev-web .
# (compose sets context: .. and dockerfile: ../docker/web.Dockerfile)

# ---- deps: install workspace dependencies ----
FROM oven/bun:1 AS deps
WORKDIR /repo
COPY package.json bun.lockb* ./
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile || bun install

# ---- build: compile the Astro server bundle ----
FROM oven/bun:1 AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
COPY . .
WORKDIR /repo/apps/web
RUN bun run build

# ---- runtime: minimal server image ----
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
# Astro node adapter (standalone) emits dist/server/entry.mjs + dist/client
COPY --from=build /repo/apps/web/dist ./dist
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 4321
CMD ["bun", "./dist/server/entry.mjs"]

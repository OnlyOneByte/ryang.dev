# Astro SSR app, built and served with Bun.
# Build context is the REPO ROOT (so the workspace install resolves):
#   docker build -f docker/web.Dockerfile -t ryangdev-web .
# (compose sets context: .. and dockerfile: ../docker/web.Dockerfile)

# ---- deps: install workspace dependencies (cached layer for the build) ----
FROM oven/bun:1 AS deps
WORKDIR /repo
# Copy the workspace manifests + the TEXT lockfile (bun 1.3+ writes bun.lock,
# not the legacy binary bun.lockb). --frozen-lockfile validates the WHOLE
# workspace graph, so every member's package.json must be present — there's
# currently only apps/web (packages/* is empty). No `|| bun install` fallback:
# a frozen-lockfile failure must be LOUD (matches CI), not silently unpinned.
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile

# ---- build: compile the Astro server bundle ----
FROM oven/bun:1 AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules
# .dockerignore excludes node_modules/dist/.astro/.git, so this brings only
# source — it does NOT clobber the installed node_modules from the deps stage.
COPY . .
WORKDIR /repo/apps/web
RUN bun run build

# ---- runtime: minimal server image ----
FROM oven/bun:1-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
# The standalone server bundle EXTERNALIZES native deps as bare imports
# (@node-rs/argon2 for the recruiter unlock, @resvg/resvg-js for OG cards), so
# they must resolve from node_modules at runtime — they are NOT in the bundle.
# Copied node_modules lose their workspace symlinks AND can carry the wrong
# platform binary, so re-install fresh here against the lockfile. This recreates
# the exact dev layout (root + apps/web node_modules), so the bare imports
# resolve when the server runs from /repo/apps/web/dist. --production drops the
# 3 dev-only deps (typescript/@astrojs/check/@types/bun); none are needed to run.
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
RUN bun install --frozen-lockfile --production
# Astro node adapter (standalone) emits dist/server/entry.mjs + dist/client.
COPY --from=build --chown=bun:bun /repo/apps/web/dist ./apps/web/dist
WORKDIR /repo/apps/web
# Drop root: run the server as the unprivileged `bun` user shipped by the image.
USER bun
EXPOSE 4321
CMD ["bun", "./dist/server/entry.mjs"]

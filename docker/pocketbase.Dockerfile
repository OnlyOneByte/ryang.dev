# OPTIONAL: reproducible, self-contained Pocketbase image with hooks baked in.
#
# Day-to-day, compose volume-mounts services/pocketbase/pb_hooks/ into the
# upstream image (edit a hook → restart, no rebuild). Use THIS Dockerfile when
# you want an immutable, registry-pullable image whose behavior doesn't depend
# on host files (e.g. shipping to another host):
#
#   docker build -f docker/pocketbase.Dockerfile -t ryangdev-pocketbase .
#
# Pinned (not :latest): the pb_hooks REQUIRE the v0.23+ JSVM API, and a floating
# tag could silently drift BELOW that floor and break moderation. Keep this in
# lockstep with POCKETBASE_TAG in infra/.env.example.
FROM ghcr.io/muchobien/pocketbase:0.28.4

# Bake hooks + migrations into the image. Paths MUST match this image's
# entrypoint, which serves with --dir=/pb_data --hooksDir=/pb_hooks
# (root-level, NOT /pb/...). Copying to /pb/pb_hooks would mean the server's
# --hooksDir=/pb_hooks finds nothing → moderation hook silently never registers
# → public self-approve. (Verified: probe returned approved:true with the old
# /pb/ paths.) Keep these aligned with infra/docker-compose.yml mounts.
COPY services/pocketbase/pb_hooks/ /pb_hooks/
COPY services/pocketbase/pb_migrations/ /pb_migrations/

EXPOSE 8090
# Entry/cmd inherited from the base image (serves on 0.0.0.0:8090).

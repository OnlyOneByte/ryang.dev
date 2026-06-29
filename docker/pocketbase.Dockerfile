# OPTIONAL: reproducible, self-contained Pocketbase image with hooks baked in.
#
# Day-to-day, compose volume-mounts services/pocketbase/pb_hooks/ into the
# upstream image (edit a hook → restart, no rebuild). Use THIS Dockerfile when
# you want an immutable, registry-pullable image whose behavior doesn't depend
# on host files (e.g. shipping to another host):
#
#   docker build -f docker/pocketbase.Dockerfile -t ryangdev-pocketbase .
#
# Pin a real version tag in production instead of `latest`.
FROM ghcr.io/muchobien/pocketbase:latest

# Bake hooks + schema into the image.
COPY services/pocketbase/pb_hooks/ /pb/pb_hooks/
COPY services/pocketbase/pb_migrations/ /pb/pb_migrations/

EXPOSE 8090
# Entry/cmd inherited from the base image (serves on 0.0.0.0:8090).

#!/usr/bin/env bash
# Pocketbase smoke test — proves the write model actually ENFORCES, not just
# that the build is green. Post-proxy contract: the browser never writes to PB;
# createRule is null on the moderated collections (service-token-only via the
# web app's /api/* routes), so a raw public POST must be REJECTED. Catches: a
# createRule that regressed back to "" (public writes), the schema importing as
# empty-fielded shells (old format), and public read leaks.
#
# Two modes:
#   1. CI / local: this script creates a superuser + imports the schema itself.
#      Requires PB_BIN (path to the pocketbase binary inside the container) OR
#      runs the superuser-create via `docker exec` when PB_CONTAINER is set.
#   2. Against a LIVE box: set PB_SUPERUSER_EMAIL/PASSWORD for an existing
#      superuser and SKIP_BOOTSTRAP=1 (schema already imported); it runs only
#      the probe. Substitute PB_URL=https://pb.ryang.dev.
#
# Env:
#   PB_URL                 default http://localhost:8090
#   PB_SUPERUSER_EMAIL     superuser identity        (default smoke@test.local)
#   PB_SUPERUSER_PASSWORD  superuser password        (default SmokePass123456)
#   PB_CONTAINER           docker container id/name for superuser-create (CI)
#   SCHEMA_FILE            path to pb_schema.json     (default alongside this script)
#   SKIP_BOOTSTRAP=1       don't create superuser / import schema (live box)
#
# Exits non-zero on ANY failure so CI fails loudly.
set -euo pipefail

PB_URL="${PB_URL:-http://localhost:8090}"
PB_URL="${PB_URL%/}"
EMAIL="${PB_SUPERUSER_EMAIL:-smoke@test.local}"
PASSWORD="${PB_SUPERUSER_PASSWORD:-SmokePass123456}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="${SCHEMA_FILE:-$HERE/pb_schema.json}"

fail() { echo "✗ SMOKE FAIL: $*" >&2; exit 1; }
pass() { echo "✓ $*"; }

# ---- 0. wait for PB to answer ----
for i in $(seq 1 30); do
  if curl -fsS "$PB_URL/api/health" >/dev/null 2>&1; then break; fi
  [ "$i" = 30 ] && fail "PB did not become healthy at $PB_URL"
  sleep 1
done
pass "PB healthy at $PB_URL"

# ---- 1. bootstrap (skip when testing a live box) ----
if [ "${SKIP_BOOTSTRAP:-0}" != "1" ]; then
  if [ -n "${PB_CONTAINER:-}" ]; then
    docker exec "$PB_CONTAINER" /usr/local/bin/pocketbase superuser create "$EMAIL" "$PASSWORD" --dir=/pb_data >/dev/null 2>&1 \
      || fail "superuser create failed (check binary path + --dir)"
    pass "superuser created"
  fi
fi

# ---- 2. authenticate ----
TOKEN="$(curl -fsS -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H 'Content-Type: application/json' \
  -d "{\"identity\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)"
[ -n "$TOKEN" ] || fail "superuser auth failed (wrong creds, or superuser written to a different --dir than the server reads)"
pass "authenticated"

# ---- 3. import schema (asserts 204 — catches old-format / empty-field regressions) ----
if [ "${SKIP_BOOTSTRAP:-0}" != "1" ]; then
  BODY="$(python3 -c "import json,sys;cols=json.load(open('$SCHEMA_FILE'));print(json.dumps({'collections':cols,'deleteMissing':False}))")"
  CODE="$(curl -fsS -o /dev/null -w '%{http_code}' -X PUT "$PB_URL/api/collections/import" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$BODY" || true)"
  [ "$CODE" = "204" ] || fail "schema import returned $CODE (expected 204). Likely pb_schema.json is in the pre-0.23 'schema' format → collections import with zero fields."
  pass "schema imported (204)"
  # prove fields actually materialized (the silent old-format failure mode)
  NFIELDS="$(curl -fsS "$PB_URL/api/collections/guestbook" -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json;print(len([f for f in json.load(sys.stdin).get('fields',[]) if not f.get('system')]))")"
  [ "$NFIELDS" -ge 4 ] || fail "guestbook imported with $NFIELDS custom fields (expected >=4) — schema format regression"
  pass "guestbook has $NFIELDS custom fields"
fi

# ---- 4. THE PROBE: public (unauthenticated) POST must be REJECTED ----
# Post-proxy model: the browser never writes to PB directly. createRule is null
# on guestbook/comments/reactions/scores/contact_messages/egg_finds → only the
# service token (via the web app's /api/* routes) may create. A raw internet
# POST must be blocked (403/400), NOT accepted-and-moderated.
gb_code="$(curl -fsS -o /dev/null -w '%{http_code}' -X POST "$PB_URL/api/collections/guestbook/records" \
  -H 'Content-Type: application/json' \
  -d '{"name":"smoke-probe","message":"public write should be blocked","approved":true}' || true)"
[ "$gb_code" != "200" ] || fail "public guestbook create returned 200 (expected blocked). createRule is not null — anyone can write/self-approve."
pass "public guestbook create blocked ($gb_code)"

# ---- 5. nothing leaked: the probe row must NOT be publicly listable ----
COUNT="$(curl -fsS "$PB_URL/api/collections/guestbook/records?perPage=50" \
  | grep -c '"name":"smoke-probe"' || true)"
[ "$COUNT" = "0" ] || fail "smoke-probe row is publicly listable ($COUNT) — a public write slipped through"
pass "probe row not publicly listable"

# ---- 6. scores: public create must be blocked (404 leaderboard integrity) ----
sc_code="$(curl -fsS -o /dev/null -w '%{http_code}' -X POST "$PB_URL/api/collections/scores/records" \
  -H 'Content-Type: application/json' \
  -d '{"initials":"HAX","score":999999,"approved":true}' || true)"
[ "$sc_code" != "200" ] || fail "public scores create returned 200 (expected blocked) — a forged 999999 could reach the board"
pass "public scores create blocked ($sc_code)"

# ---- 7. reactions + egg_finds: public create AND public list both blocked ----
re_code="$(curl -fsS -o /dev/null -w '%{http_code}' -X POST "$PB_URL/api/collections/reactions/records" \
  -H 'Content-Type: application/json' -d '{"targetType":"post","targetId":"x","emoji":"fire","sessionHash":"x"}' || true)"
[ "$re_code" != "200" ] || fail "public reactions create returned 200 (expected blocked) — tallies would be spoofable"
re_list="$(curl -fsS -o /dev/null -w '%{http_code}' "$PB_URL/api/collections/reactions/records" || true)"
[ "$re_list" != "200" ] || fail "reactions is publicly listable (expected blocked) — reads go through /api/reactions now"
ef_code="$(curl -fsS -o /dev/null -w '%{http_code}' -X POST "$PB_URL/api/collections/egg_finds/records" \
  -H 'Content-Type: application/json' -d '{"sessionHash":"x","fragment":"__complete__"}' || true)"
[ "$ef_code" != "200" ] || fail "egg_finds public create succeeded (expected blocked) — counter is spoofable"
ef_list="$(curl -fsS -o /dev/null -w '%{http_code}' "$PB_URL/api/collections/egg_finds/records" || true)"
[ "$ef_list" != "200" ] || fail "egg_finds is publicly listable (expected blocked) — completer hashes would leak"
pass "reactions + egg_finds: public create + list both blocked (service-token only)"

echo "✓✓ Pocketbase smoke test PASSED"

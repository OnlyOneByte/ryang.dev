#!/usr/bin/env bash
# Pocketbase smoke test — proves the moderation hook actually ENFORCES, not just
# that the build is green. Catches the whole class of bugs that a passing build
# hides: hooks not loading (wrong --hooksDir path), hooks throwing at runtime
# (JSVM scoping / wrong API), and a schema that imports as empty-fielded shells.
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

# ---- 4. THE PROBE: public POST trying to self-approve must be forced to approved=false ----
RESP="$(curl -fsS -X POST "$PB_URL/api/collections/guestbook/records" \
  -H 'Content-Type: application/json' \
  -d '{"name":"smoke-probe","message":"self-approve test","approved":true}')"
APPROVED="$(echo "$RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('approved'))" 2>/dev/null || echo "ERR")"
[ "$APPROVED" = "False" ] || fail "self-approve probe returned approved=$APPROVED (expected False). The moderation hook is NOT enforcing — hooks didn't load or threw at runtime."
pass "self-approve forced to approved=false"

# ---- 5. the probe row must NOT be publicly listable (listRule approved=true) ----
COUNT="$(curl -fsS "$PB_URL/api/collections/guestbook/records?perPage=50" \
  | grep -c '"name":"smoke-probe"' || true)"
[ "$COUNT" = "0" ] || fail "smoke-probe row is publicly listable ($COUNT) — moderation/listRule not enforcing"
pass "probe row not publicly listable"

echo "✓✓ Pocketbase smoke test PASSED"

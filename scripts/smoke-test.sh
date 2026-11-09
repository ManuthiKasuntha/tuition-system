#!/usr/bin/env bash
# TuitionHub smoke test - checks that the running application really works.
#
# Usage:
#   bash scripts/smoke-test.sh [BASE_URL] [--full]
#
#   BASE_URL  defaults to http://localhost:3000
#   --full    also registers a teacher + student, creates a class, enrolls,
#             and deletes the class again. (Creates "smoke_..." user accounts,
#             so Jenkins runs --full only against a temporary test stack.)
#
# Needs only bash and curl. Exits with a non-zero code on the first failure,
# which makes the Jenkins stage fail and stops the deployment.

set -euo pipefail

BASE_URL="http://localhost:3000"
FULL=false
for arg in "$@"; do
  case "$arg" in
    --full) FULL=true ;;
    *) BASE_URL="${arg%/}" ;;
  esac
done

PASS=0
pass() { echo "  [PASS] $1"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $1"; [ -n "${2:-}" ] && echo "         response: $2"; exit 1; }

# request METHOD PATH [JSON_BODY] [TOKEN]  -> sets $STATUS and $BODY
request() {
  local method="$1" path="$2" data="${3:-}" token="${4:-}"
  local args=(-s -o /tmp/smoke_body.$$ -w '%{http_code}' -X "$method" "$BASE_URL$path"
              -H 'Content-Type: application/json' --max-time 20)
  [ -n "$data" ] && args+=(--data "$data")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  STATUS=$(curl "${args[@]}" || echo "000")
  BODY=$(cat /tmp/smoke_body.$$ 2>/dev/null || true)
  rm -f /tmp/smoke_body.$$
}

# Pull a simple string value out of JSON without needing jq
json_str() { echo "$BODY" | grep -o "\"$1\":\"[^\"]*\"" | head -1 | cut -d'"' -f4; }
json_num() { echo "$BODY" | grep -o "\"$1\":[0-9]*" | head -1 | cut -d: -f2; }

echo "Smoke testing $BASE_URL (full=$FULL)"

# 1. Wait for the site to come up (containers may still be starting)
for i in $(seq 1 30); do
  request GET /api/health
  [ "$STATUS" = "200" ] && break
  echo "  waiting for application... ($i/30, HTTP $STATUS)"
  sleep 3
done

# 2. Basic checks (safe to run against production - they create no data)
[ "$STATUS" = "200" ] && echo "$BODY" | grep -q '"database":"up"' \
  && pass "GET /api/health -> backend up, MySQL reachable" || fail "/api/health" "$STATUS $BODY"

request GET /
[ "$STATUS" = "200" ] && echo "$BODY" | grep -qi '<div id="root">' \
  && pass "GET / -> React app served by Nginx" || fail "frontend index.html" "$STATUS"

request GET /dashboard
[ "$STATUS" = "200" ] && pass "GET /dashboard -> SPA routing works" || fail "SPA fallback" "$STATUS"

request GET /api/meta
[ "$STATUS" = "200" ] && echo "$BODY" | grep -q '"subjects"' \
  && pass "GET /api/meta -> Nginx proxies /api to backend" || fail "/api/meta" "$STATUS $BODY"

request GET /api/classes
[ "$STATUS" = "401" ] && pass "GET /api/classes without login -> 401 (auth enforced)" || fail "auth guard" "$STATUS $BODY"

if [ "$FULL" = true ]; then
  ID="$(date +%s)$RANDOM"
  PW="Smoke${RANDOM}pass1"

  # 3. Teacher registration + login
  request POST /api/auth/register "{\"fullName\":\"Smoke Teacher\",\"username\":\"smoke_t_$ID\",\"email\":\"smoke_t_$ID@example.com\",\"password\":\"$PW\",\"role\":\"teacher\",\"district\":\"Colombo\",\"subjects\":[\"Mathematics\"],\"grades\":[\"Grade 10\"]}"
  [ "$STATUS" = "201" ] && pass "register teacher" || fail "register teacher" "$STATUS $BODY"

  request POST /api/auth/login "{\"identifier\":\"smoke_t_$ID\",\"password\":\"$PW\"}"
  T_TOKEN=$(json_str token)
  [ "$STATUS" = "200" ] && [ -n "$T_TOKEN" ] && pass "teacher login returns JWT" || fail "teacher login" "$STATUS $BODY"

  request POST /api/auth/login "{\"identifier\":\"smoke_t_$ID\",\"password\":\"wrongPassword1\"}"
  [ "$STATUS" = "401" ] && pass "wrong password rejected" || fail "wrong password" "$STATUS"

  # 4. Class management
  request POST /api/classes '{"title":"Smoke Test Class","subject":"Mathematics","grade":"Grade 10","medium":"English","fee":1000}' "$T_TOKEN"
  CLASS_ID=$(json_num id)
  [ "$STATUS" = "201" ] && [ -n "$CLASS_ID" ] && pass "teacher creates class #$CLASS_ID" || fail "create class" "$STATUS $BODY"

  # 5. Student registration + role check + enrolment
  request POST /api/auth/register "{\"fullName\":\"Smoke Student\",\"username\":\"smoke_s_$ID\",\"email\":\"smoke_s_$ID@example.com\",\"password\":\"$PW\",\"role\":\"student\",\"district\":\"Gampaha\",\"subjects\":[\"Mathematics\"],\"currentGrade\":\"Grade 10\"}"
  S_TOKEN=$(json_str token)
  [ "$STATUS" = "201" ] && [ -n "$S_TOKEN" ] && pass "register student" || fail "register student" "$STATUS $BODY"

  request POST /api/classes '{"title":"Not allowed","subject":"Mathematics","grade":"Grade 10","medium":"English"}' "$S_TOKEN"
  [ "$STATUS" = "403" ] && pass "student cannot create class (role check)" || fail "role check" "$STATUS $BODY"

  request POST "/api/classes/$CLASS_ID/enroll" "" "$S_TOKEN"
  [ "$STATUS" = "201" ] && pass "student enrolls in class" || fail "enroll" "$STATUS $BODY"

  request GET /api/classes/mine "" "$S_TOKEN"
  echo "$BODY" | grep -q "\"id\":$CLASS_ID," && pass "class appears in student's 'my classes'" || fail "my classes" "$STATUS $BODY"

  request GET "/api/classes/$CLASS_ID/students" "" "$T_TOKEN"
  echo "$BODY" | grep -q "smoke_s_$ID" && pass "teacher sees enrolled student" || fail "list students" "$STATUS $BODY"

  # 6. Clean up the test class (users remain; there is no delete-account API)
  request DELETE "/api/classes/$CLASS_ID" "" "$T_TOKEN"
  [ "$STATUS" = "204" ] && pass "teacher deletes class" || fail "delete class" "$STATUS $BODY"
fi

echo "All $PASS smoke tests passed."

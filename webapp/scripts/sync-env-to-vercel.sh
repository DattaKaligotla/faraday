#!/usr/bin/env bash
# Push the relevant subset of webapp/.env into a Vercel project's environment
# variables, plus the base64-encoded Firebase service-account JSON.
#
# Why this talks to the REST API instead of `vercel env add`: Vercel CLI
# v53.x silently records empty values when input is piped or redirected,
# regardless of trailing-newline tricks. The REST API works deterministically.
#
# Usage:
#   webapp/scripts/sync-env-to-vercel.sh                 # production env (default)
#   webapp/scripts/sync-env-to-vercel.sh preview
#   webapp/scripts/sync-env-to-vercel.sh production preview development
#
# Requirements:
#   - `vercel login` already done (so ~/Library/Application Support/com.vercel.cli/auth.json exists)
#   - `vercel link` already done in webapp/ (so webapp/.vercel/project.json exists)
#   - python3 on PATH (macOS ships it)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEBAPP="$ROOT/webapp"
ENV_FILE="$WEBAPP/.env"
VERCEL_LINK="$WEBAPP/.vercel/project.json"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE not found" >&2
  exit 1
fi
if [[ ! -f "$VERCEL_LINK" ]]; then
  echo "error: $VERCEL_LINK not found — run 'vercel link' from webapp/ first" >&2
  exit 1
fi

# Vercel CLI auth token (macOS path; the Linux path is different).
AUTH_JSON="$HOME/Library/Application Support/com.vercel.cli/auth.json"
if [[ ! -f "$AUTH_JSON" ]]; then
  AUTH_JSON="$HOME/.local/share/com.vercel.cli/auth.json"
fi
if [[ ! -f "$AUTH_JSON" ]]; then
  echo "error: vercel auth not found — run 'vercel login'" >&2
  exit 1
fi

VERCEL_TOKEN="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["token"])' "$AUTH_JSON")"
PROJECT_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["projectId"])' "$VERCEL_LINK")"
TEAM_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["orgId"])' "$VERCEL_LINK")"

if [[ -z "$VERCEL_TOKEN" || -z "$PROJECT_ID" || -z "$TEAM_ID" ]]; then
  echo "error: failed to extract token / project / team" >&2
  exit 1
fi

# Targets default to production. Vercel API target slugs: production, preview, development.
TARGETS=("$@")
if [[ ${#TARGETS[@]} -eq 0 ]]; then TARGETS=("production"); fi

# Source webapp/.env into this shell.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# Resolve service-account JSON (absolute or webapp-relative).
SA_PATH=""
if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  if [[ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
    SA_PATH="$GOOGLE_APPLICATION_CREDENTIALS"
  elif [[ -f "$WEBAPP/$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
    SA_PATH="$WEBAPP/$GOOGLE_APPLICATION_CREDENTIALS"
  fi
fi
if [[ -z "$SA_PATH" ]]; then
  echo "error: could not locate Firebase service-account JSON" >&2
  exit 1
fi

FIREBASE_SERVICE_ACCOUNT_BASE64="$(base64 < "$SA_PATH" | tr -d '\n')"

# Multi-line PEM → single-line with literal \n. The webapp's github-app.ts
# already turns these back into real newlines at runtime.
if [[ -n "${GITHUB_APP_PRIVATE_KEY:-}" ]]; then
  GITHUB_APP_PRIVATE_KEY="${GITHUB_APP_PRIVATE_KEY//$'\n'/\\n}"
fi

NAMES=(
  ALLOWED_ORIGINS
  FIREBASE_PROJECT_ID
  FIREBASE_SERVICE_ACCOUNT_BASE64
  GITHUB_APP_ID
  GITHUB_APP_PRIVATE_KEY
  GITHUB_APP_SLUG
  GITHUB_WEBHOOK_SECRET
  SESSION_SECRET
  AWS_REGION
  AWS_BEARER_TOKEN_BEDROCK
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_SESSION_TOKEN
  BEDROCK_MODEL
  ANTHROPIC_MODEL
  ANTHROPIC_SMALL_FAST_MODEL
)

API_BASE="https://api.vercel.com"
HDR_AUTH=(-H "Authorization: Bearer $VERCEL_TOKEN")

# List existing env vars once per run, then look up IDs for deletes.
LIST_JSON="$(curl -fsS "${HDR_AUTH[@]}" \
  "$API_BASE/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID&decrypt=false")"

FIND_IDS_PY='
import json, os, sys
key = sys.argv[1]
targets = set(sys.argv[2:])
data = json.load(sys.stdin)
for e in data.get("envs", []):
    if e.get("key") != key:
        continue
    if set(e.get("target", [])) & targets:
        print(e["id"])
'

# Returns the env IDs (one per line) whose `key` matches and whose `target`
# array intersects the requested targets. Reads the env list JSON from stdin.
find_env_ids() {
  local key="$1"; shift
  python3 -c "$FIND_IDS_PY" "$key" "$@"
}

delete_env() {
  local id="$1"
  curl -fsS -X DELETE "${HDR_AUTH[@]}" \
    "$API_BASE/v9/projects/$PROJECT_ID/env/$id?teamId=$TEAM_ID" >/dev/null
}

BUILD_BODY_PY='
import json, sys
key, value, *targets = sys.argv[1:]
sys.stdout.write(json.dumps({
    "key": key,
    "value": value,
    "type": "encrypted",
    "target": targets,
}))
'

create_env() {
  local key="$1" value="$2"; shift 2
  local body
  body="$(python3 -c "$BUILD_BODY_PY" "$key" "$value" "$@")"
  curl -fsS -X POST "${HDR_AUTH[@]}" \
    -H "Content-Type: application/json" \
    --data-binary "$body" \
    "$API_BASE/v10/projects/$PROJECT_ID/env?teamId=$TEAM_ID&upsert=true" >/dev/null
}

echo "Targets: ${TARGETS[*]}"
echo

push_var() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "  skip $name (empty)"
    return
  fi
  # Best-effort delete of any overlapping existing entries (idempotency).
  local ids
  ids="$(printf '%s' "$LIST_JSON" | find_env_ids "$name" "${TARGETS[@]}")"
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    delete_env "$id" || true
  done <<< "$ids"

  if create_env "$name" "$value" "${TARGETS[@]}"; then
    printf "  %-38s -> %s\n" "$name" "$(IFS=,; echo "${TARGETS[*]}")"
  else
    echo "  FAILED to set $name" >&2
    return 1
  fi
}

for name in "${NAMES[@]}"; do
  push_var "$name"
done

# Verify every non-empty source var landed with a non-empty value.
echo
echo "Verifying values landed in Vercel (${TARGETS[0]}):"
VERIFY_JSON="$(curl -fsS "${HDR_AUTH[@]}" \
  "$API_BASE/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID&decrypt=true")"

VERIFY_PY='
import json, sys
key, target = sys.argv[1], sys.argv[2]
data = json.load(sys.stdin)
for e in data.get("envs", []):
    if e.get("key") == key and target in (e.get("target") or []):
        v = e.get("value") or ""
        print(f"OK len={len(v)}")
        break
else:
    print("MISSING")
'

for name in "${NAMES[@]}"; do
  if [[ -z "${!name:-}" ]]; then continue; fi
  result="$(printf '%s' "$VERIFY_JSON" | python3 -c "$VERIFY_PY" "$name" "${TARGETS[0]}")"
  if [[ "$result" == OK* ]]; then
    printf "  %-38s %s\n" "$name" "$result"
  else
    printf "  %-38s !! %s\n" "$name" "$result" >&2
  fi
done

echo
echo "Done. Reminders:"
echo "  - Set FRONTEND_URL in the Vercel UI to your production URL"
echo "    (it controls the GitHub App setup callback redirect target)."
echo "  - If the GitHub App's Setup URL still points at localhost, update it"
echo "    to https://<your-vercel-domain>/api/integration/github/setup."
echo
echo "Trigger a redeploy with:  vercel --prod"

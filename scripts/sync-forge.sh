#!/usr/bin/env bash
# Sync package/ from this monorepo to the standalone Faraday-Stack/forge repo.
# The forge repo is the source of truth for npm provenance — it's what
# `npm publish --provenance` attests against. Local dev still happens here.
#
# Usage:
#   scripts/sync-forge.sh           # push current package/ state to forge:main
#   scripts/sync-forge.sh <branch>  # push to forge:<branch>
set -euo pipefail

BRANCH="${1:-main}"
REMOTE="forge"

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  git remote add "$REMOTE" git@github.com:Faraday-Stack/forge.git
fi

git subtree push --prefix=package "$REMOTE" "$BRANCH"

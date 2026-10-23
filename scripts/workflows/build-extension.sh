#!/usr/bin/env bash

# Builds the extension in CI.
#
# Usage: scripts/workflows/build-extension.sh <dev|production> [mainnet-fork]
#
# - dev: starts .env from the PR's testing env block (ENV_BLOCK, written
#   verbatim, never interpreted) and marks analytics as BETA.
# - production: appends to any existing .env, marking analytics as PROD, or as
#   BETA for the mainnet fork build.
# - mainnet-fork: renames the built zips with a -fork suffix, so they can sit
#   alongside the regular build's zips.
#
# Build secrets and settings (RPC URLs, API keys, USE_MAINNET_FORK, ...) come
# from the calling step's environment.

set -euo pipefail

variant="${1:?Usage: build-extension.sh <dev|production> [mainnet-fork]}"
fork="${2:-}"

if [ -n "$fork" ] && [ "$fork" != "mainnet-fork" ]; then
  echo "Unknown build option: $fork" >&2
  exit 1
fi

case "$variant" in
  dev)
    printf '%s\n' "${ENV_BLOCK:-}" > .env
    analytics_source="BETA"
    ;;
  production)
    if [ "$fork" = "mainnet-fork" ]; then
      analytics_source="BETA"
    else
      analytics_source="PROD"
    fi
    ;;
  *)
    echo "Unknown build variant: $variant" >&2
    exit 1
    ;;
esac

echo "USE_ANALYTICS_SOURCE=\"$analytics_source\"" >> .env

bun run build

if [ "$fork" = "mainnet-fork" ]; then
  # shellcheck disable=SC2016 # $1 is expanded by the inner sh, not here.
  find dist -name "*.zip" -exec sh -c 'mv "$1" "${1%.zip}-fork.zip"' _ {} \;
fi

#!/usr/bin/env bash

# Starts the mainnet fork that the e2e fork tests run against. Runs anvil in
# the foreground; background it (`./ci/start-anvil.sh &`) to run tests
# alongside it, and use stop-anvil.sh to shut it down so its fork cache is
# flushed to disk.
#
# CHAIN_API_URL must point at an archive-capable Ethereum mainnet RPC, since
# the fork starts at a fixed, historical block.

set -euo pipefail

: "${CHAIN_API_URL:?Set CHAIN_API_URL to an archive-capable Ethereum mainnet RPC URL}"

# Defaults come from fork.env, which CI also reads; the environment overrides
# them.
FORK_ENV="$(cd "$(dirname "$0")" && pwd)/fork.env"
FORKING_BLOCK="${FORKING_BLOCK:-$(sed -n "s/^FORKING_BLOCK=//p" "$FORK_ENV")}"
MAINNET_FORK_CHAIN_ID="${MAINNET_FORK_CHAIN_ID:-$(sed -n "s/^MAINNET_FORK_CHAIN_ID=//p" "$FORK_ENV")}"
PID_FILE="${ANVIL_PID_FILE:-${TMPDIR:-/tmp}/taho-ci-anvil.pid}"

# exec keeps the PID, so the PID file points at anvil itself.
echo $$ > "$PID_FILE"
exec anvil --quiet --state-interval 10 \
  --chain-id "$MAINNET_FORK_CHAIN_ID" --port 8545 \
  --fork-block-number "$FORKING_BLOCK" --fork-url "$CHAIN_API_URL" \
  --fork-chain-id 1 --fork-retry-backoff 100 --timeout 40000 \
  --gas-limit 65000000

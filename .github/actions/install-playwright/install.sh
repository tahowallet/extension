#!/usr/bin/env bash

# Installs Playwright's Chromium and its system dependencies, retrying
# attempts that fail or stall.
#
# Expects CACHE_HIT to be "true" when the browser was restored from cache, in
# which case only the system packages are installed.
#
# Each attempt is capped, since a stalled apt mirror or browser download
# otherwise hangs the job with no output.
#
# The cap stops the Playwright CLI, but the sudo'd apt-get it started can
# outlive it and keep holding the dpkg lock while it finishes a slow download.
# Rather than failing on that lock, later attempts wait for it
# (DPkg::Lock::Timeout), which also lets the earlier apt-get finish its work
# instead of being killed mid-install.

set -euo pipefail

echo 'DPkg::Lock::Timeout "180";' |
  sudo tee /etc/apt/apt.conf.d/90-playwright-lock-timeout > /dev/null

if [ "${CACHE_HIT:-}" = "true" ]; then
  install=(bunx playwright install-deps chromium)
else
  install=(bunx playwright install --with-deps chromium)
fi

for attempt in 1 2 3; do
  if timeout 180 "${install[@]}"; then
    exit 0
  fi
  echo "::warning::Playwright install attempt $attempt failed or timed out"
  sleep $((attempt * 10))
done

echo "::error::Playwright install failed after 3 attempts"
exit 1

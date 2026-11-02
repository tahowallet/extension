#!/usr/bin/env bash

# Installs a pinned Chrome for Testing build for the e2e tests to run in
# place of Playwright's bundled Chromium, and points them at it through
# E2E_CHROME_EXECUTABLE.
#
# This exists to run a browser with security fixes that Playwright's bundled
# build doesn't have yet. Keep the version on the same milestone as
# Playwright's Chromium so the driver and browser agree, and drop the
# override once a Playwright release bundles a build at least this new.
#
# Expects CHROME_FOR_TESTING_VERSION and CHROME_FOR_TESTING_SHA256. Installs
# to ~/.cache/chrome-for-testing, which the action caches.

set -euo pipefail

CHROME_FOR_TESTING_DIR="$HOME/.cache/chrome-for-testing"

executable="$CHROME_FOR_TESTING_DIR/chrome-linux64/chrome"

if [ ! -x "$executable" ]; then
  url="https://storage.googleapis.com/chrome-for-testing-public/$CHROME_FOR_TESTING_VERSION/linux64/chrome-linux64.zip"
  zip="$RUNNER_TEMP/chrome-linux64.zip"

  for attempt in 1 2 3; do
    if curl --fail --silent --show-error --location --max-time 300 \
      --output "$zip" "$url"; then
      break
    fi
    if [ "$attempt" = 3 ]; then
      echo "::error::Chrome for Testing download failed after 3 attempts"
      exit 1
    fi
    echo "::warning::Chrome for Testing download attempt $attempt failed"
    sleep $((attempt * 10))
  done

  echo "$CHROME_FOR_TESTING_SHA256  $zip" | sha256sum --check --strict

  rm -rf "$CHROME_FOR_TESTING_DIR"
  mkdir -p "$CHROME_FOR_TESTING_DIR"
  unzip -q "$zip" -d "$CHROME_FOR_TESTING_DIR"
  rm "$zip"
fi

"$executable" --version
echo "E2E_CHROME_EXECUTABLE=$executable" >> "$GITHUB_ENV"

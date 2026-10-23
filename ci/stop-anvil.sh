#!/usr/bin/env bash

# This script sends a SIGINT to the anvil started by start-anvil.sh so it
# flushes its cache to disk and terminates properly

PID_FILE="${ANVIL_PID_FILE:-${TMPDIR:-/tmp}/taho-ci-anvil.pid}"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
else
  # Fall back to the oldest anvil process if start-anvil.sh wasn't used.
  PID=$(pgrep -o anvil)
fi

while kill -2 "$PID" 2>/dev/null; do
  sleep 1
done

rm -f "$PID_FILE"

echo "Process $PID has exited"

SIZE=$(du -sh $HOME/.foundry/cache | awk '{print $1}')

echo "Cache size: $SIZE"

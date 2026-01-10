#!/usr/bin/env bash

# This script sends a SIGINT to anvil so it flushes its cache
# to disk and terminates properly

PID=$(pgrep -o anvil)
while kill -2 "$PID" 2>/dev/null; do
  sleep 1; 
done;

echo "Process $PID has exited";

SIZE=$(du -sh $HOME/.foundry/cache | awk '{print $1}')

echo "Cache size: $SIZE"
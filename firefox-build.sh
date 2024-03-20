#!/bin/env sh

if command -v nerdctl &> /dev/null; then
  ctrmanager=nerdctl
elif command -v docker &> /dev/null; then
  ctrmanager=docker
elif command -v podman &> /dev/null; then
  ctrmanager=podman
else
  echo "Installing a container manager" >&2
  exit
fi

echo "--- Let's clean up from earlier ---"
rm firefox.zip
rm -rf dist
$ctrmanager image rm --force tally-ho-image:latest || true

echo "--- Build extension ---"
$ctrmanager build -t tally-ho-image:latest --output=dist --target=dist .

echo "--- Let's clean up ---"

$ctrmanager image rm --force tally-ho-image:latest || true

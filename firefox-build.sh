#!/bin/bash

echo "--- Let's clean up from earlier ---"
rm firefox.zip
docker container rm -f tally-ho-container || true
docker image rm --force tally-ho-image:latest || true

echo "--- Build extension ---"
docker build --no-cache -t tally-ho-image:latest .
docker create --name tally-ho-container tally-ho-image

echo "--- Copy build output to host ---"
docker cp tally-ho-container:/tally-ho/dist/firefox.zip ./firefox.zip

echo "--- Let's clean up ---"
docker container rm -f tally-ho-container || true
docker image rm --force tally-ho-image:latest || true

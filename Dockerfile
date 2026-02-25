FROM oven/bun:1 AS bun-base
FROM node:16-alpine AS build

WORKDIR /tally-ho

COPY --from=bun-base /usr/local/bin/bun /usr/local/bin/bun

COPY . .

RUN mv .env.prod .env
RUN apk add --no-cache python3 py3-pip git make bash && ln -sf python3 /usr/bin/python
# sqlite compile throws an error during install, but it does not cause any problem so we are ignoring it
RUN bun install || true
ENV SUPPORT_BROWSER="firefox"
RUN bun run build

FROM scratch AS dist

COPY --from=build /tally-ho/dist .

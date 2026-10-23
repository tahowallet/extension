FROM oven/bun:1.4.4-alpine AS build

WORKDIR /tally-ho

COPY . .

RUN mv .env.prod .env
RUN apk add --no-cache python3 py3-pip git make bash && ln -sf python3 /usr/bin/python
# sqlite compile throws an error during install, but it does not cause any problem so we are ignoring it
RUN bun install || true
ENV SUPPORT_BROWSER="firefox"
RUN bun run build

FROM scratch AS dist

COPY --from=build /tally-ho/dist .

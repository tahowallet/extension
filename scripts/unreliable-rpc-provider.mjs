/* eslint-disable */
/**
 * This is a simple proxy server that will randomly throttle or timeout
 * requests and is used to test the reliability of the SerialFallbackProvider.
 */
import http from "http"
import fetch from "node-fetch"
import _ from "lodash"

const PORT = 9000

const throttleResponse = {
  jsonrpc: "2 .0 ",
  id: null,
  error: "Whomp, too many requests",
}
1
/**
 *  Returns a function that will return true `chance` percent of the time.
 */
function makeChance(chance) {
  return () => Math.random() < chance / 100
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const isThrottled = makeChance(20)
const isTimeout = makeChance(20)

const stats = { timeout: 0, throttle: 0, proxied: 0 }

/**
 * Time until the server will timeout a request and close the socket.
 */
const RESPONSE_TIMEOUT = 20_000

const server = http.createServer(async (req, res) => {
  const payload = JSON.stringify(throttleResponse)

  const url = new URL(req.url, `http://${req.headers.host}`)

  const targetURL = url.searchParams.get("rpc")

  if (!targetURL) {
    res.writeHead(500).end("missing target url")
    return
  }

  if (isThrottled()) {
    stats.throttle += 1

    res
      .writeHead(429, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
        "Access-Control-Allow-Origin": "no-cors",
      })
      .end(payload)
  } else if (isTimeout()) {
    stats.timeout += 1

    await wait(RESPONSE_TIMEOUT)
    res.destroy()
  } else {
    stats.proxied += 1

    const data = await new Promise((resolve, rej) => {
      let body = ""
      req
        .on("data", (chunk) => {
          body += chunk
        })
        .on("end", () => {
          resolve(body)
        })
        .on("error", () => {
          rej()
          req.destroy()
        })
    })

    fetch(targetURL, {
      method: req.method,
      ...(req.method === "POST" ? { body: data } : {}),
      headers: _.omit(req.headers, "host"),
    })
      .then(async (targetResponse) => {
        const body = await targetResponse.text()
        res
          .writeHead(targetResponse.status, {
            "Content-Type": "application/json",
          })
          .end(body)
      })
      .catch((err) => {
        console.log("Error retrieving: ", targetURL, err)
        res.writeHead(500).end()
      })
  }
})

server.listen(PORT)

setInterval(() => console.log(stats), 5000)

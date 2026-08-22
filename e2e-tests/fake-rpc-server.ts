#!/usr/bin/env bun
/**
 * A JSON-RPC endpoint the e2e tests own, so a network can be pointed at
 * something real and then have it taken away.
 *
 * Self-contained on purpose: no imports, no dependencies, run by the Playwright
 * fixture as a child process. It prints
 *
 *     fake-rpc listening <url>
 *
 * once bound, which is what the fixture waits for — the port is chosen by the
 * OS so parallel workers cannot collide, and there is nothing to guess at or
 * sleep for.
 *
 * Answers the handful of methods the wallet asks on its own initiative: a chain
 * ID for the save-time probe, and enough of a chain behind it that the network
 * reads as healthy rather than as broken for some unrelated reason.
 *
 * Control it by POSTing JSON to /__control:
 *
 *     { "mode": "answering" | "hanging" | "refusing" }
 *     { "chainId": "137" }
 *
 * `hanging` accepts requests and never replies; `refusing` fails them at once.
 * Both read as unreachable to the wallet, but they are different failures and
 * the tests want to produce each.
 *
 * Every response carries permissive CORS headers, and preflights are answered
 * even while hanging. The extension declares no `host_permissions`, so its
 * service worker is subject to CORS like any page, and the public endpoints it
 * normally talks to allow all origins. Without that here the browser refuses
 * the request before the wallet ever sees it — and a preflight refused while
 * hanging would fail fast, which is the opposite of the slow timeout that mode
 * exists to produce.
 */

/**
 * The slice of Bun's API this uses, declared here rather than pulled from
 * `bun-types`. Keeps the file dependency-free, which is the point of it, and
 * gives the repo's own typecheck — which knows nothing about Bun — something
 * to go on.
 */
declare const Bun: {
  serve(options: {
    port: number
    hostname: string
    fetch: (request: Request) => Response | Promise<Response>
  }): { port: number }
}

type Mode = "answering" | "hanging" | "refusing"

const chainIdArgument = process.argv[2]

if (chainIdArgument === undefined) {
  process.stderr.write("usage: fake-rpc-server.ts <chain-id>\n")
  process.exit(1)
}

let mode: Mode = "answering"
let chainIdHex = `0x${Number(chainIdArgument).toString(16)}`

const resultsByMethod = (): { [method: string]: unknown } => ({
  eth_chainId: chainIdHex,
  net_version: String(Number(chainIdHex)),
  eth_blockNumber: "0x1",
  eth_getBalance: "0x0",
  eth_getCode: "0x",
  eth_call: "0x",
  eth_getLogs: [],
  eth_getTransactionCount: "0x0",
  eth_gasPrice: "0x3b9aca00",
  eth_maxPriorityFeePerGas: "0x3b9aca00",
  eth_estimateGas: "0x5208",
  eth_getBlockByNumber: {
    number: "0x1",
    hash: `0x${"11".repeat(32)}`,
    parentHash: `0x${"00".repeat(32)}`,
    timestamp: "0x0",
    baseFeePerGas: "0x3b9aca00",
    gasLimit: "0x1c9c380",
    gasUsed: "0x0",
    transactions: [],
  },
  eth_feeHistory: {
    oldestBlock: "0x1",
    baseFeePerGas: ["0x3b9aca00", "0x3b9aca00"],
    gasUsedRatio: [0],
    reward: [["0x3b9aca00"]],
  },
})

const replyTo = ({ id, method }: { id: unknown; method: string }): unknown => {
  const results = resultsByMethod()

  if (!(method in results)) {
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `unsupported in test: ${method}` },
    }
  }

  return { jsonrpc: "2.0", id, result: results[method] }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
}

const server = Bun.serve({
  port: 0,
  hostname: "127.0.0.1",
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    const { pathname } = new URL(request.url)

    if (pathname === "/__control") {
      const control = (await request.json()) as {
        mode?: Mode
        chainId?: string
      }

      if (control.mode !== undefined) {
        mode = control.mode
      }
      if (control.chainId !== undefined) {
        chainIdHex = `0x${Number(control.chainId).toString(16)}`
      }

      return new Response("ok", { headers: CORS_HEADERS })
    }

    if (mode === "refusing") {
      return new Response(null, { status: 502, headers: CORS_HEADERS })
    }

    if (mode === "hanging") {
      // Never settles. The wallet has to decide this has failed on its own
      // timeout, the slower of the two failures and the one likelier to catch
      // a missing timeout in our own code.
      return new Promise<Response>(() => {})
    }

    const body = await request.json()

    // Requests arrive batched as often as not, and a batch has to come back as
    // an array of the same length or ethers rejects the whole thing.
    const result = Array.isArray(body)
      ? body.map((single) => replyTo(single))
      : replyTo(body as { id: unknown; method: string })

    return Response.json(result, { headers: CORS_HEADERS })
  },
})

process.stdout.write(`fake-rpc listening http://127.0.0.1:${server.port}\n`)

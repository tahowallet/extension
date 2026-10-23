import { JsonRpcProvider, Networkish } from "@ethersproject/providers"
import { deepCopy } from "@ethersproject/properties"
import { ConnectionInfo, fetchJson } from "@ethersproject/web"
import logger from "../../lib/logger"

type RPCPayload = {
  method: string
  params: unknown[]
  id: number
  jsonrpc: "2.0"
}

type RPCResponse = RPCResponseResult | RPCResponseError

type RPCResponseError = {
  id: number
  error: {
    code: number
    message: string
    data?: unknown
  }
  jsonrpc: "2.0"
}

type RPCResponseResult = {
  id: number
  result: unknown
  jsonrpc: "2.0"
}

type RPCPendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  payload: RPCPayload
}

type RPCOptions = {
  /**
   * Maximum number of requests to be batched
   * @default 10 requests
   */
  maxBatchLength?: number
}

/**
 * Maximum size in bytes of the batch
 * @default 1Mb
 */
const MAX_BATCH_BYTE_SIZE = 1_048_576 // 1mb

/**
 * How long to wait to aggregate requests
 * Should be kept at minimum, to keep request time at a normal level
 * @default 10ms
 */
const BATCH_STALL_TIME = 10 // 10ms

const defaultOptions = {
  maxBatchLength: 10, // Seems to work fine for public rpcs
}

const makeSerializableError = (
  message: string,
  code?: number,
  data?: unknown,
) => {
  const error = new Error()
  Object.assign(error, { message, code, data })
  return error
}

/**
 * Custom JSON-RPC provider that supports batching and optimized request handling
 *
 * This provider works similarly to ethers `JsonRpcBatchProvider` albeit with a
 * few differences: It allows configuring maximum batch size and the time window
 * to aggregate requests into a batch. Additionally, it can fallback to individual
 * requests if necessary.
 *
 * It also features `disconnect`/`reconnect` methods to manage polling and clear
 * pending requests in specific scenarios (e.g. network errors)
 *
 */
export default class TahoRPCProvider extends JsonRpcProvider {
  // Requests queued in this provider
  private pending: RPCPendingRequest[] = []

  #options: Required<RPCOptions>

  // Tracks whether this provider is currently accepting requests
  #destroyed = false

  #sendTimer: ReturnType<typeof setTimeout> | null = null

  #errorToBatch = new WeakMap<WeakKey, RPCPendingRequest[]>()

  constructor(
    url?: ConnectionInfo | string,
    network?: Networkish,
    options?: RPCOptions,
  ) {
    super(url, network)

    this.#options = { ...defaultOptions, ...options }
  }

  private async sendNextBatch() {
    // This prevents queueing multiple batches simultaneously
    if (this.#sendTimer) {
      return
    }

    this.#sendTimer = setTimeout(async () => {
      this.#sendTimer = null

      const batch: RPCPendingRequest[] = []

      const trackBatchError = (err: Error) => {
        this.#errorToBatch.set(err, batch)
        return err
      }

      while (this.pending.length > 0) {
        batch.push(this.pending.shift() as RPCPendingRequest)

        if (batch.length === this.#options.maxBatchLength) {
          break
        }
      }

      // Enforce max batch size
      while (
        JSON.stringify(batch.map(({ payload }) => payload)).length >
        MAX_BATCH_BYTE_SIZE
      ) {
        this.pending.unshift(batch.pop() as RPCPendingRequest)

        if (batch.length === 0) {
          throw new Error("INVALID_MAX_BATCH_SIZE")
        }
      }

      if (this.pending.length) {
        // If there are still pending requests, start building another batch
        this.sendNextBatch()
      }

      const request = batch.map(({ payload }) => payload)

      this.emit("debug", {
        action: "requestBatch",
        request: deepCopy(request),
        provider: this,
      })

      fetchJson(
        this.connection,
        // Some RPCs will reject batch payloads even if they send a single
        // request (e.g. flashbots)
        JSON.stringify(request.length === 1 ? request[0] : request),
      )
        .then((response) => {
          const wrappedResponse: RPCResponse[] = Array.isArray(response)
            ? response
            : [response]

          this.emit("debug", {
            action: "response",
            request,
            response,
            provider: this,
          })

          // For cases where a batch is sent and a single error object is returned
          // e.g. batch size exceeded
          if (batch.length > 1 && !Array.isArray(response)) {
            batch.forEach(({ reject }) => {
              reject(
                trackBatchError(
                  makeSerializableError(
                    response?.error?.message ?? "INVALID_RESPONSE",
                    response?.error?.code,
                    { response, batch },
                  ),
                ),
              )
            })
          }

          batch.forEach(({ payload: { id }, reject, resolve }) => {
            const match = wrappedResponse.find((resp) => id === resp.id)

            if (!match) {
              reject(
                trackBatchError(
                  makeSerializableError("bad response", -32000, {
                    response,
                    batch,
                  }),
                ),
              )
              return
            }

            if ("error" in match) {
              reject(
                trackBatchError(
                  makeSerializableError(match.error.message, match.error.code, {
                    response: match,
                    batch,
                  }),
                ),
              )
            } else {
              resolve(match.result)
            }
          })
        })
        .catch((error) => {
          this.emit("debug", {
            action: "response",
            error,
            request,
            provider: this,
          })

          // Any other error during fetch should propagate
          batch.forEach(({ reject }) => reject(trackBatchError(error)))
        })
    }, BATCH_STALL_TIME)
  }

  override send(method: string, params: unknown[]): Promise<unknown> {
    if (this.#destroyed) {
      return Promise.reject(new Error("NETWORK_ERROR"))
    }

    const promise = new Promise((resolve, reject) => {
      this.pending.push({
        resolve,
        reject,
        // oxlint-disable-next-line no-plusplus
        payload: { method, params, id: this._nextId++, jsonrpc: "2.0" },
      })
    })

    this.sendNextBatch()
    return promise
  }

  /**
   * Drops any pending requests and disables polling
   */
  disconnect() {
    this.#destroyed = true
    this.polling = false
    if (this.#sendTimer) clearTimeout(this.#sendTimer)

    this.pending.forEach((request) =>
      // This error will increase retry count, even though request hasn't been sent
      request.reject(new Error("NETWORK_ERROR")),
    )

    this.pending = []
  }

  async reconnect() {
    this.#destroyed = false
    this.polling = true
  }

  setOptions(settings: RPCOptions): void {
    Object.assign(this.#options, settings)
  }

  getOptions(): Readonly<Required<RPCOptions>> {
    return { ...this.#options }
  }

  /**
   * Useful for adjusting batch limits
   * @param err The error returned as the response
   * @returns The associated batch sent
   */
  getBatchFromError(err: unknown): RPCPendingRequest[] {
    if (
      typeof err !== "object" ||
      err === null ||
      !this.#errorToBatch.has(err)
    ) {
      throw logger.buildError(
        `Could not retrieve batch using error: ${err} as reference`,
      )
    }

    return this.#errorToBatch.get(err)!
  }
}

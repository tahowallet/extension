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
   * @default 20 requests
   */
  maxBatchLength?: number
  /**
   * Maximum length in bytes of the batch
   * @default 1Mb
   */
  maxBatchSize?: number
  /**
   * How long to wait to aggregate requests
   * @default 100ms
   */
  batchStallTime?: number
}

const defaultOptions = {
  maxBatchLength: 20,
  // eslint-disable-next-line no-bitwise
  maxBatchSize: 1 << 20, // 1Mb
  batchStallTime: 100,
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
 * TODO: This should be able to fallback into a standard rpc provider
 * if batches are unsupported
 */
export default class TahoRPCProvider extends JsonRpcProvider {
  // Requests queued in this provider
  private pending: RPCPendingRequest[] = []

  #options: Required<RPCOptions>

  // Tracks whether this provider is currently accepting requests
  #destroyed = false

  #sendTimer: NodeJS.Timer | null = null

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

    this.#sendTimer = setTimeout(() => {
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
        this.#options.maxBatchSize
      ) {
        this.pending.unshift(batch.pop() as RPCPendingRequest)

        if (batch.length === 0) {
          throw new Error("INVALID_MAX_BATCH_SIZE")
        }
      }

      if (this.pending.length) {
        // if there are still pending requests, schedule another batch for sending
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

          if (batch.length > 1 && !Array.isArray(response)) {
            batch.forEach(({ reject }) => {
              reject(
                trackBatchError(
                  makeSerializableError(
                    response?.error?.message ?? "INVALID_RESPONSE",
                    response?.error?.code,
                    response,
                  ),
                ),
              )
            })
          }

          batch.forEach(({ payload: { id }, reject, resolve }) => {
            const match = wrappedResponse.find((resp) => id === resp.id)

            if (!match) {
              reject(
                trackBatchError(makeSerializableError("bad response", -32000)),
              )
              return
            }

            if ("error" in match) {
              reject(
                trackBatchError(
                  makeSerializableError(
                    match.error.message,
                    match.error.code,
                    match.error.data,
                  ),
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
    }, this.#options.batchStallTime)
  }

  override send(method: string, params: unknown[]): Promise<unknown> {
    if (this.#destroyed) {
      return Promise.reject(new Error("PROVIDER_DESTROYED"))
    }

    const promise = new Promise((resolve, reject) => {
      this.pending.push({
        resolve,
        reject,
        // eslint-disable-next-line no-plusplus, no-underscore-dangle
        payload: { method, params, id: this._nextId++, jsonrpc: "2.0" },
      })
    })

    this.sendNextBatch()
    return promise
  }

  /**
   * Drops any pending requests
   */
  async destroy() {
    this.#destroyed = true

    if (this.#sendTimer) clearTimeout(this.#sendTimer)

    this.pending.forEach((request) =>
      request.reject(new Error("PROVIDER_DESTROYED")),
    )

    this.pending = []
  }

  async reconnect() {
    this.#destroyed = false
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

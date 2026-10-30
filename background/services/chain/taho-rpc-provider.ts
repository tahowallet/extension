import { JsonRpcProvider, Networkish } from "@ethersproject/providers"
import { deepCopy } from "@ethersproject/properties"
import { ConnectionInfo, fetchJson } from "@ethersproject/web"
import logger from "../../lib/logger"
import { getErrorType } from "./errors"

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

/** How long to wait before resending a batch the endpoint found too large. */
const BATCH_SHRINK_RETRY_DELAY = 500

const isBatchLimitMessage = (message: unknown) =>
  getErrorType(String(message), "") === "batch-limit-exceeded"

/** Whether a response or error says the batch was too large. */
function rejectsBatchSize(responseOrError: unknown): boolean {
  if (responseOrError instanceof Error) {
    return isBatchLimitMessage(responseOrError.message)
  }
  const responses = Array.isArray(responseOrError)
    ? responseOrError
    : [responseOrError]
  return responses.some((response) =>
    isBatchLimitMessage(
      (response as RPCResponseError | undefined)?.error?.message,
    ),
  )
}

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

      this.postBatch(
        // Some RPCs will reject batch payloads even if they send a single
        // request (e.g. flashbots)
        JSON.stringify(request.length === 1 ? request[0] : request),
      )
        .then((response) => {
          if (batch.length > 1 && rejectsBatchSize(response)) {
            this.resendInSmallerBatches(batch)
            return
          }

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
            const { error } = response as Partial<RPCResponseError>
            batch.forEach(({ reject }) => {
              reject(
                makeSerializableError(
                  error?.message ?? "INVALID_RESPONSE",
                  error?.code,
                  { response, batch },
                ),
              )
            })
          }

          batch.forEach(({ payload: { id }, reject, resolve }) => {
            const match = wrappedResponse.find((resp) => id === resp.id)

            if (!match) {
              reject(
                makeSerializableError("bad response", -32000, {
                  response,
                  batch,
                }),
              )
              return
            }

            if ("error" in match) {
              reject(
                makeSerializableError(match.error.message, match.error.code, {
                  response: match,
                  batch,
                }),
              )
            } else {
              resolve(match.result)
            }
          })
        })
        .catch((error) => {
          if (batch.length > 1 && rejectsBatchSize(error)) {
            this.resendInSmallerBatches(batch)
            return
          }

          this.emit("debug", {
            action: "response",
            error,
            request,
            provider: this,
          })

          // Any other error during fetch should propagate
          batch.forEach(({ reject }) => reject(error))
        })
    }, BATCH_STALL_TIME)
  }

  protected postBatch(body: string): Promise<RPCResponse | RPCResponse[]> {
    return fetchJson(this.connection, body)
  }

  /**
   * Halves the batch size, unless a smaller batch already set it lower, and
   * queues the batch's requests to go out again.
   */
  private resendInSmallerBatches(batch: RPCPendingRequest[]): void {
    if (batch.length <= this.#options.maxBatchLength) {
      this.#options.maxBatchLength = Math.max(Math.floor(batch.length / 2), 1)
      logger.debug(
        "Setting a max batch size of",
        this.#options.maxBatchLength,
        "for rpc",
        this.connection.url,
      )
    }

    this.pending.unshift(...batch)
    setTimeout(() => this.sendNextBatch(), BATCH_SHRINK_RETRY_DELAY)
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
}

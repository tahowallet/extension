import { utils } from "ethers"
import { isTransientFetchJsonError } from "../fetching"

// Errors built exactly the way @ethersproject/web 5.7.1's fetchJson throws
// them (lib/index.js), rather than by calling fetchJson itself: other test
// files mock @ethersproject/web, and bun's module mocks are process-wide.
//  - "timeout": makeError("timeout", TIMEOUT, { requestBody, requestMethod,
//    timeout, url })
//  - "missing response" (no response at all): throwError("missing
//    response", SERVER_ERROR, { requestBody, requestMethod, serverError,
//    url }), with no status.
//  - "bad response" (non-2xx): throwError("bad response", SERVER_ERROR,
//    { status, headers, body, requestBody, requestMethod, url })
const webLogger = new utils.Logger("web/5.7.1")
const url = "https://api.example.com/"

const timeoutError = () =>
  webLogger.makeError("timeout", utils.Logger.errors.TIMEOUT, {
    requestBody: null,
    requestMethod: "GET",
    timeout: 120000,
    url,
  })

const missingResponseError = () =>
  webLogger.makeError("missing response", utils.Logger.errors.SERVER_ERROR, {
    requestBody: null,
    requestMethod: "GET",
    serverError: new TypeError("fetch failed"),
    url,
  })

const badResponseError = (status: number) =>
  webLogger.makeError("bad response", utils.Logger.errors.SERVER_ERROR, {
    status,
    headers: {},
    body: "{}",
    requestBody: null,
    requestMethod: "GET",
    url,
  })

describe("isTransientFetchJsonError", () => {
  it("retries 5xx responses", () => {
    expect(isTransientFetchJsonError(badResponseError(500))).toBe(true)
    expect(isTransientFetchJsonError(badResponseError(503))).toBe(true)
  })

  it("doesn't retry 4xx responses", () => {
    expect(isTransientFetchJsonError(badResponseError(400))).toBe(false)
    expect(isTransientFetchJsonError(badResponseError(404))).toBe(false)
  })

  it("retries requests that get no response", () => {
    expect(isTransientFetchJsonError(missingResponseError())).toBe(true)
  })

  it("retries timeouts", () => {
    expect(isTransientFetchJsonError(timeoutError())).toBe(true)
  })

  it("doesn't retry other errors", () => {
    expect(isTransientFetchJsonError(new Error("plain error"))).toBe(false)
    expect(isTransientFetchJsonError(undefined)).toBe(false)
    expect(isTransientFetchJsonError("SERVER_ERROR")).toBe(false)
  })
})

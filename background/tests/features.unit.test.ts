// Flags are read when the module loads, so it's imported after the
// environment is set.
let features: typeof import("../features")

beforeAll(async () => {
  process.env.SWITCH_RUNTIME_FLAGS = "true"
  process.env.SUPPORT_MEZO_NETWORK = "true"
  // The query string loads a fresh copy; test setup may have imported one.
  features = (await import(
    "../features?switch-runtime-flags" as string
  )) as typeof import("../features")
})

describe("isEnabled with SWITCH_RUNTIME_FLAGS on", () => {
  afterEach(() => {
    features.storage.clear()
  })

  it("reads runtime flags from the environment", () => {
    expect(features.isEnabled("SUPPORT_MEZO_NETWORK")).toBe(true)
    expect(features.isDisabled("SUPPORT_MEZO_NETWORK")).toBe(false)
  })

  it("lets in-memory settings override the environment", () => {
    features.storage.set("SUPPORT_MEZO_NETWORK", "false")

    expect(features.isEnabled("SUPPORT_MEZO_NETWORK")).toBe(false)
  })
})

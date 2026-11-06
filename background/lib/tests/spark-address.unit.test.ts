import {
  isSparkAddress,
  sparkAddressNetwork,
  toSparkAddress,
} from "../spark-address"

// Real addresses returned by the Spark SDK against Spark's regtest operators.
const REGTEST_ADDRESS =
  "sparkrt1pgssy6vty7krpze82ecm8j39gd35v35aqjjmhftc4culawsavkyh564u2uv8v0"
const EVM_ADDRESS = "0x99b36fDbC582D113aF36A21EBa06BFEAb7b9bE12"

describe("Spark addresses", () => {
  it("recognizes a regtest address and its network", () => {
    expect(sparkAddressNetwork(REGTEST_ADDRESS)).toBe("REGTEST")
    expect(isSparkAddress(REGTEST_ADDRESS)).toBe(true)
    expect(isSparkAddress(REGTEST_ADDRESS, "REGTEST")).toBe(true)
    expect(isSparkAddress(REGTEST_ADDRESS, "MAINNET")).toBe(false)
  })

  it("rejects EVM addresses, garbage and bad checksums", () => {
    expect(isSparkAddress(EVM_ADDRESS)).toBe(false)
    expect(isSparkAddress("spark1notanaddress")).toBe(false)
    expect(isSparkAddress(undefined)).toBe(false)
    const corrupted = `${REGTEST_ADDRESS.slice(0, -1)}${
      REGTEST_ADDRESS.endsWith("q") ? "p" : "q"
    }`
    expect(isSparkAddress(corrupted)).toBe(false)
  })

  it("rejects bitcoin addresses that are valid bech32m", () => {
    expect(
      isSparkAddress(
        "bcrt1pt52jgxnm3v6373wl6fze7m6skh225g0mvr0fv4uslamsvgd8ss9sjuj57l",
      ),
    ).toBe(false)
  })

  it("normalizes user input and enforces the network", () => {
    expect(toSparkAddress(`  ${REGTEST_ADDRESS.toUpperCase()} `)).toBe(
      REGTEST_ADDRESS,
    )
    expect(() => toSparkAddress(REGTEST_ADDRESS, "MAINNET")).toThrow(/mainnet/)
    expect(() => toSparkAddress(EVM_ADDRESS)).toThrow()
  })

  it("only tags canonical lowercase addresses", () => {
    expect(isSparkAddress(REGTEST_ADDRESS.toUpperCase())).toBe(false)
  })
})

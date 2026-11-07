import { truncateAddress } from "../utils"

describe("truncateAddress", () => {
  it("abbreviates hex addresses as before", () => {
    expect(truncateAddress("0x99b36fDbC582D113aF36A21EBa06BFEAb7b9bE12")).toBe(
      "0x99b3…9bE12",
    )
  })

  it("keeps a bech32 address's network prefix", () => {
    expect(
      truncateAddress(
        "sparkrt1pgssya57xvd3avs5eqhdnpelmpaf9e6mlhvwzdtcx2hua26c0dfmglezf65z7t",
      ),
    ).toBe("sparkrt1pgss…5z7t")
    expect(
      truncateAddress(
        "spark1pgss9q2u59r2gpjpnay8z79q6dr409afj5ln4huguvlc3evpkdsmskxerhrqp0",
      ),
    ).toBe("spark1pgss…rqp0")
  })
})

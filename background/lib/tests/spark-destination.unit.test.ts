import { validateSparkDestination } from "../spark-destination"
import { decodeLightningInvoice } from "../lightning-invoice"

const REGTEST_ADDRESS =
  "sparkrt1pgss9q2u59r2gpjpnay8z79q6dr409afj5ln4huguvlc3evpkdsmskxerhrqp0"
const INVOICE_2100_SATS =
  "lnbcrt21u1p4wul0ppp5s86mapepz8m2p3f4r5xkuq04fjluqwnvlvzvm4993wzqyucp7ujqsp5q7yp0rsk7e5r69l3e6j7l9javpkjpzzxwq0flvcwzkrdy75v98dqxq9z0rgqnp4qtlyk6hxw5h4hrdfdkd4nh2rv0mwyyqvdtakr3dv6m4vvsmfshvg6rzjqgp0s738klwqef7yr8yu54vv3wfuk4psv46x5laf6l6v5x4lwwahvqqqqrusum7gtyqqqqqqqqqqqqqq9qcqzpudq0w3sksmeqw3jhxaq9qyyssqky3ps6jcvd6rxh8273trazgj6ehql2lklvqahpeqt6v8y65gh4p8g7xp65vw3x9tfpqnvu2w38jvqlaxxt9a9jre3htc40x0rwjmttsp8wldk7"
const EXPIRES_AT = decodeLightningInvoice(INVOICE_2100_SATS, {
  now: 0,
}).expiresAt
const NOW = EXPIRES_AT - 60

describe("Spark destinations", () => {
  it("accepts a Spark address on the account's network", () => {
    expect(validateSparkDestination(REGTEST_ADDRESS, "REGTEST", NOW)).toEqual({
      ok: true,
      destination: { kind: "spark", address: REGTEST_ADDRESS },
    })
  })

  it("rejects a Spark address from the other network", () => {
    expect(validateSparkDestination(REGTEST_ADDRESS, "MAINNET", NOW)).toEqual({
      ok: false,
      error: "wrong-network",
    })
  })

  it("accepts a Lightning invoice and takes its amount", () => {
    const result = validateSparkDestination(INVOICE_2100_SATS, "REGTEST", NOW)
    expect(result.ok && result.destination).toMatchObject({
      kind: "lightning",
      address: INVOICE_2100_SATS,
      amount: 2100n,
      name: "taho test",
    })
  })

  it("rejects expired, wrong-network and non-destination input", () => {
    expect(
      validateSparkDestination(INVOICE_2100_SATS, "REGTEST", EXPIRES_AT + 1),
    ).toEqual({ ok: false, error: "expired-invoice" })
    expect(validateSparkDestination(INVOICE_2100_SATS, "MAINNET", NOW)).toEqual(
      { ok: false, error: "wrong-network" },
    )
    expect(
      validateSparkDestination(
        "0x99b36fDbC582D113aF36A21EBa06BFEAb7b9bE12",
        "REGTEST",
        NOW,
      ),
    ).toEqual({ ok: false, error: "not-a-destination" })
  })
})

import {
  decodeLightningInvoice,
  InvalidLightningInvoiceError,
  isLightningInvoice,
  looksLikeLightningInvoice,
} from "../lightning-invoice"

// Real regtest invoices created with the Spark SDK; `now` is pinned so the
// tests don't depend on their expiry.
const INVOICE_2100_SATS =
  "lnbcrt21u1p4wul0ppp5s86mapepz8m2p3f4r5xkuq04fjluqwnvlvzvm4993wzqyucp7ujqsp5q7yp0rsk7e5r69l3e6j7l9javpkjpzzxwq0flvcwzkrdy75v98dqxq9z0rgqnp4qtlyk6hxw5h4hrdfdkd4nh2rv0mwyyqvdtakr3dv6m4vvsmfshvg6rzjqgp0s738klwqef7yr8yu54vv3wfuk4psv46x5laf6l6v5x4lwwahvqqqqrusum7gtyqqqqqqqqqqqqqq9qcqzpudq0w3sksmeqw3jhxaq9qyyssqky3ps6jcvd6rxh8273trazgj6ehql2lklvqahpeqt6v8y65gh4p8g7xp65vw3x9tfpqnvu2w38jvqlaxxt9a9jre3htc40x0rwjmttsp8wldk7"
const ZERO_AMOUNT_INVOICE =
  "lnbcrt1p4wul0ppp5yx9aelmmq49y8uw9lfj560qd999nh6pgf40yafh7zvyan6k63tjqsp505neea9fy94sxafpdpslc24fmrlg8ntpndtfn4j3wnhjuvz5swrsxq9z0rgqnp4qtlyk6hxw5h4hrdfdkd4nh2rv0mwyyqvdtakr3dv6m4vvsmfshvg6rzjqgp0s738klwqef7yr8yu54vv3wfuk4psv46x5laf6l6v5x4lwwahvqqqqrusum7gtyqqqqqqqqqqqqqq9qcqzpudq0w3sksmeq0fjhymc9qyyssqth9lc5xzk0c84c8h8npv0z4ckpaq3s3lzvhwwymm6mevmvpm769srm2ctuee837qkmf6r40nyarmxcwrtjkxng5q3kwdvva23kjge2qp34x0v0"
const EXPIRES_AT = decodeLightningInvoice(INVOICE_2100_SATS, {
  now: 0,
}).expiresAt

function reason(call: () => unknown): string | undefined {
  try {
    call()
  } catch (error) {
    return error instanceof InvalidLightningInvoiceError
      ? error.reason
      : "other"
  }
  return undefined
}

describe("Lightning invoices", () => {
  const now = EXPIRES_AT - 60

  it("decodes amount, network and description", () => {
    const decoded = decodeLightningInvoice(INVOICE_2100_SATS, { now })
    expect(decoded.network).toBe("REGTEST")
    expect(decoded.amountSats).toBe(2100n)
    expect(decoded.description).toBe("taho test")
  })

  it("treats zero-amount invoices as payer-chosen amounts", () => {
    const decoded = decodeLightningInvoice(ZERO_AMOUNT_INVOICE, { now })
    expect(decoded.amountSats).toBeUndefined()
  })

  it("accepts a lightning: URI and mixed case", () => {
    const decoded = decodeLightningInvoice(
      `lightning:${INVOICE_2100_SATS.toUpperCase()}`,
      { now },
    )
    expect(decoded.invoice).toBe(INVOICE_2100_SATS)
  })

  it("rejects the wrong network, expiry and garbage", () => {
    expect(
      reason(() =>
        decodeLightningInvoice(INVOICE_2100_SATS, { network: "MAINNET", now }),
      ),
    ).toBe("wrong-network")
    expect(
      reason(() =>
        decodeLightningInvoice(INVOICE_2100_SATS, { now: EXPIRES_AT + 1 }),
      ),
    ).toBe("expired")
    expect(reason(() => decodeLightningInvoice("lnbcrt1nope", { now }))).toBe(
      "not-an-invoice",
    )
    const corrupted = `${INVOICE_2100_SATS.slice(0, -1)}${
      INVOICE_2100_SATS.endsWith("q") ? "p" : "q"
    }`
    expect(reason(() => decodeLightningInvoice(corrupted, { now }))).toBe(
      "not-an-invoice",
    )
  })

  it("distinguishes invoices from addresses", () => {
    expect(looksLikeLightningInvoice(INVOICE_2100_SATS)).toBe(true)
    expect(isLightningInvoice(INVOICE_2100_SATS)).toBe(true)
    expect(
      looksLikeLightningInvoice(
        "sparkrt1pgss9q2u59r2gpjpnay8z79q6dr409afj5ln4huguvlc3evpkdsmskxerhrqp0",
      ),
    ).toBe(false)
  })
})

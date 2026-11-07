import { decode } from "light-bolt11-decoder"
import type { SparkNetworkType } from "../networks"
import type { LightningInvoice } from "../types"

// BOLT-11 human-readable prefixes by Bitcoin network. Regtest's `lnbcrt`
// starts with mainnet's `lnbc`, so match the longest prefix first.
const INVOICE_PREFIXES: [SparkNetworkType, string][] = [
  ["REGTEST", "lnbcrt"],
  ["MAINNET", "lnbc"],
]

export type DecodedLightningInvoice = {
  invoice: LightningInvoice
  network: SparkNetworkType
  /** Undefined for zero-amount invoices, where the payer picks the amount. */
  amountSats: bigint | undefined
  description: string | undefined
  /** Unix time in seconds. */
  expiresAt: number
}

export type LightningInvoiceError =
  | "not-an-invoice"
  | "wrong-network"
  | "expired"
  | "sub-satoshi-amount"

export class InvalidLightningInvoiceError extends Error {
  constructor(readonly reason: LightningInvoiceError) {
    super(`Invalid Lightning invoice: ${reason}`)
    this.name = "InvalidLightningInvoiceError"
  }
}

function stripScheme(candidate: string): string {
  return candidate
    .trim()
    .replace(/^lightning:/i, "")
    .toLowerCase()
}

/**
 * Cheap syntactic check, for deciding which validator a destination field
 * should use; does not verify the checksum.
 */
export function looksLikeLightningInvoice(candidate: string): boolean {
  return /^ln(bc|bcrt|tb|tbs)[0-9]/.test(stripScheme(candidate))
}

/**
 * Decode and validate a BOLT-11 invoice: checksum, network (when given) and
 * expiry relative to `now` (Unix seconds). Throws an
 * `InvalidLightningInvoiceError` describing the first problem found.
 */
export function decodeLightningInvoice(
  candidate: string,
  {
    network,
    now = Math.floor(Date.now() / 1000),
  }: { network?: SparkNetworkType; now?: number } = {},
): DecodedLightningInvoice {
  const invoice = stripScheme(candidate)

  let sections: ReturnType<typeof decode>["sections"]
  let expiry: number | undefined
  try {
    const decoded = decode(invoice)
    sections = decoded.sections
    expiry = decoded.expiry
  } catch {
    throw new InvalidLightningInvoiceError("not-an-invoice")
  }

  const invoiceNetwork = INVOICE_PREFIXES.find(([, prefix]) =>
    invoice.startsWith(prefix),
  )?.[0]
  if (invoiceNetwork === undefined) {
    throw new InvalidLightningInvoiceError("wrong-network")
  }
  if (network !== undefined && invoiceNetwork !== network) {
    throw new InvalidLightningInvoiceError("wrong-network")
  }

  const section = <N extends string>(name: N) =>
    sections.find((candidateSection) => candidateSection.name === name) as
      | { name: N; value?: unknown }
      | undefined

  const millisatoshis = section("amount")?.value
  let amountSats: bigint | undefined
  if (typeof millisatoshis === "string" && millisatoshis !== "") {
    const msat = BigInt(millisatoshis)
    if (msat % 1000n !== 0n) {
      throw new InvalidLightningInvoiceError("sub-satoshi-amount")
    }
    amountSats = msat / 1000n
  }

  const timestamp = section("timestamp")?.value
  const expiresAt =
    (typeof timestamp === "number" ? timestamp : 0) + (expiry ?? 3600)
  if (expiresAt <= now) {
    throw new InvalidLightningInvoiceError("expired")
  }

  const description = section("description")?.value

  return {
    invoice: invoice as LightningInvoice,
    network: invoiceNetwork,
    amountSats: amountSats === 0n ? undefined : amountSats,
    description: typeof description === "string" ? description : undefined,
    expiresAt,
  }
}

export function toLightningInvoice(
  candidate: string,
  network?: SparkNetworkType,
): LightningInvoice {
  return decodeLightningInvoice(candidate, { network }).invoice
}

export function isLightningInvoice(
  candidate: unknown,
): candidate is LightningInvoice {
  return (
    typeof candidate === "string" &&
    INVOICE_PREFIXES.some(([, prefix]) => candidate.startsWith(prefix))
  )
}

import type { SparkNetworkType } from "../networks"
import type { LightningInvoice, SparkAddress } from "../types"
import { sparkAddressNetwork, toSparkAddress } from "./spark-address"
import {
  decodeLightningInvoice,
  InvalidLightningInvoiceError,
  looksLikeLightningInvoice,
} from "./lightning-invoice"

/**
 * Where a Spark account can send: another Spark address, or a Lightning
 * invoice paid from the Spark balance (which may fix the amount).
 */
export type SparkDestination =
  | { kind: "spark"; address: SparkAddress }
  | {
      kind: "lightning"
      address: LightningInvoice
      /** Set when the invoice fixes the amount, in satoshis. */
      amount?: bigint
      /** The invoice's description, shown in place of a name. */
      name?: string
    }

export type SparkDestinationError =
  | "not-a-destination"
  | "wrong-network"
  | "expired-invoice"
  | "invalid-invoice"

export type SparkDestinationValidation =
  | { ok: true; destination: SparkDestination }
  | { ok: false; error: SparkDestinationError }

/**
 * Validate user input as a destination for a Spark account on `network`:
 * a Spark address for that network, or an unexpired Lightning invoice for
 * the same Bitcoin network.
 */
export function validateSparkDestination(
  input: string,
  network: SparkNetworkType,
  now?: number,
): SparkDestinationValidation {
  const trimmed = input.trim()

  if (looksLikeLightningInvoice(trimmed)) {
    try {
      const invoice = decodeLightningInvoice(trimmed, { network, now })
      return {
        ok: true,
        destination: {
          kind: "lightning",
          address: invoice.invoice,
          amount: invoice.amountSats,
          name: invoice.description,
        },
      }
    } catch (error) {
      if (error instanceof InvalidLightningInvoiceError) {
        switch (error.reason) {
          case "wrong-network":
            return { ok: false, error: "wrong-network" }
          case "expired":
            return { ok: false, error: "expired-invoice" }
          default:
            return { ok: false, error: "invalid-invoice" }
        }
      }
      return { ok: false, error: "invalid-invoice" }
    }
  }

  const addressNetwork = sparkAddressNetwork(trimmed)
  if (addressNetwork === undefined) {
    return { ok: false, error: "not-a-destination" }
  }
  if (addressNetwork !== network) {
    return { ok: false, error: "wrong-network" }
  }
  return {
    ok: true,
    destination: { kind: "spark", address: toSparkAddress(trimmed, network) },
  }
}

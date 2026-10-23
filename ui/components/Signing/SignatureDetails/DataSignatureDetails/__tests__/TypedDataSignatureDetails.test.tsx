import React from "react"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import type {
  EnrichedSignTypedDataRequest,
  SafeTransactionSignTypedDataAnnotation,
} from "@tallyho/tally-background/services/enrichment"
import { renderWithProviders } from "../../../../../tests/test-utils"
import TypedDataSignatureDetails from "../TypedDataSignatureDetails"

const SAFE = "0x1111111111111111111111111111111111111111"
const ZERO = "0x0000000000000000000000000000000000000000"

const safeTxRequest = (
  annotation: Omit<
    SafeTransactionSignTypedDataAnnotation,
    "type" | "safeAddress"
  >,
): EnrichedSignTypedDataRequest => ({
  account: {
    address: "0x2222222222222222222222222222222222222222",
    network: ETHEREUM,
  },
  typedData: {
    primaryType: "SafeTx",
    domain: { chainId: 1, verifyingContract: SAFE },
    types: {},
    message: {
      to: "0x4444444444444444444444444444444444444444",
      value: "0",
      data: "0x",
      operation: 0,
      safeTxGas: "0",
      baseGas: "0",
      gasPrice: "0",
      gasToken: ZERO,
      refundReceiver: ZERO,
      nonce: 7,
    },
  },
  annotation: { type: "safe-transaction", safeAddress: SAFE, ...annotation },
})

describe("TypedDataSignatureDetails for a Safe transaction", () => {
  it("shows the Safe's simulated balance changes and the simulation caveat", () => {
    const ui = renderWithProviders(
      <TypedDataSignatureDetails
        typedDataRequest={safeTxRequest({
          simulation: {
            status: "success",
            balanceChanges: [
              {
                direction: "out",
                assetSymbol: "ETH",
                localizedDecimalAmount: "1.5",
              },
            ],
          },
          queuedBefore: 2,
        })}
      />,
    )

    expect(ui.getByText("Simulated Safe balance changes")).toBeInTheDocument()
    expect(ui.getByText("-1.5")).toBeInTheDocument()
    expect(
      ui.getByText("Simulated as if all required owners had signed."),
    ).toBeInTheDocument()
    expect(
      ui.getByText(
        "2 earlier Safe transactions are still queued. The simulation doesn't include them.",
      ),
    ).toBeInTheDocument()
    // The raw SafeTx fields are still shown alongside.
    expect(ui.getByText("SafeTx")).toBeInTheDocument()
  })

  it("warns when the simulation reverts", () => {
    const ui = renderWithProviders(
      <TypedDataSignatureDetails
        typedDataRequest={safeTxRequest({
          simulation: {
            status: "reverted",
            revertReason: "A call in this Safe transaction reverts (GS013)",
            balanceChanges: [],
          },
        })}
      />,
    )

    expect(
      ui.getByText("Simulation shows this Safe transaction will fail"),
    ).toBeInTheDocument()
    expect(ui.queryByText("Simulated Safe balance changes")).toBeNull()
  })

  it("warns about a used nonce even without a simulation", () => {
    const ui = renderWithProviders(
      <TypedDataSignatureDetails
        typedDataRequest={safeTxRequest({ nonceAlreadyUsed: true })}
      />,
    )

    expect(
      ui.getByText(
        "This Safe transaction's nonce has already been used, so it can never execute.",
      ),
    ).toBeInTheDocument()
    expect(
      ui.queryByText("Simulated as if all required owners had signed."),
    ).toBeNull()
  })
})

import React from "react"
import { within } from "@testing-library/react"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import type {
  EnrichedSignTypedDataRequest,
  SafeTransactionSignTypedDataAnnotation,
} from "@tallyho/tally-background/services/enrichment"
import { renderWithProviders } from "../../../../../tests/test-utils"
import TypedDataSignatureDetails from "../TypedDataSignatureDetails"

const SAFE = "0x1111111111111111111111111111111111111111"
const ZERO = "0x0000000000000000000000000000000000000000"
const RECIPIENT = "0x4444444444444444444444444444444444444444"

const precedes = (first: Element, second: Element) =>
  // eslint-disable-next-line no-bitwise
  !!(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

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
                counterparty: { address: RECIPIENT, name: "vitalik.eth" },
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
    // The simulation leads in the signature card; the Safe's name and its
    // raw fields follow in a card of their own.
    const cards =
      ui.container.querySelectorAll<HTMLElement>(".primary_info_card")
    expect(cards).toHaveLength(2)
    const [simulationCard, fieldsCard] = cards
    expect(simulationCard).toHaveTextContent("Your signature is required")
    expect(simulationCard).toHaveTextContent("Simulated Safe balance changes")
    expect(simulationCard).not.toHaveTextContent("SafeTx")
    // The recipient of the outflow, by name.
    expect(within(simulationCard).getByText("To")).toBeTruthy()
    expect(within(simulationCard).getByText("vitalik.eth")).toBeTruthy()
    expect(fieldsCard).not.toHaveTextContent("Your signature is required")
    expect(fieldsCard).toHaveTextContent("Safe")
    expect(fieldsCard).toHaveTextContent("SafeTx")
    expect(precedes(simulationCard, fieldsCard)).toBe(true)
  })

  it("keeps a single card when there's nothing simulated to show", () => {
    const ui = renderWithProviders(
      <TypedDataSignatureDetails typedDataRequest={safeTxRequest({})} />,
    )

    const cards =
      ui.container.querySelectorAll<HTMLElement>(".primary_info_card")
    expect(cards).toHaveLength(1)
    expect(cards[0]).toHaveTextContent("Your signature is required")
    expect(cards[0]).toHaveTextContent("SafeTx")
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

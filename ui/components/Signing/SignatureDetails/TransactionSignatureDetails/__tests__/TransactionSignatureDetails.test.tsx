import React from "react"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import { createTransactionRequest } from "@tallyho/tally-background/tests/factories"
import type { ContractInteraction } from "@tallyho/tally-background/services/enrichment"
import { renderWithProviders } from "../../../../../tests/test-utils"
import TransactionSignatureDetails from ".."

const POOL = "0x9eef87f4c08d8934cb2a3309df4dec5635338115"

const contractInteraction = (
  annotation: Partial<Omit<ContractInteraction, "type">> = {},
): ContractInteraction => ({
  type: "contract-interaction",
  timestamp: 0,
  blockTimestamp: undefined,
  contractInfo: {
    address: POOL,
    network: ETHEREUM,
    annotation: {
      timestamp: 0,
      hasCode: true,
      balance: {
        address: POOL,
        network: ETHEREUM,
        assetAmount: { asset: ETHEREUM.baseAsset, amount: 0n },
        dataSource: "local",
        retrievedAt: 0,
      },
    },
  },
  ...annotation,
})

const renderDetails = (
  annotation?: Partial<Omit<ContractInteraction, "type">>,
) =>
  renderWithProviders(
    <TransactionSignatureDetails
      transactionRequest={{
        ...createTransactionRequest({ to: POOL, input: "0xa9059cbb" }),
        annotation: contractInteraction(annotation),
      }}
    />,
  )

describe("TransactionSignatureDetails", () => {
  it("keeps contract interactions to Details and Raw data tabs", () => {
    const ui = renderDetails()

    expect(ui.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Details",
      "Raw data",
    ])
  })

  it("shows the simulation below the details", () => {
    const ui = renderDetails({ simulationStatus: "success" })

    const fee = ui.getByText("Estimated network fee")
    const simulation = ui.getByText("Simulation")
    // eslint-disable-next-line no-bitwise
    expect(
      fee.compareDocumentPosition(simulation) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(ui.getByText("Your account")).toBeInTheDocument()
  })

  it("warns about a revert once", () => {
    const ui = renderDetails({
      simulationStatus: "reverted",
      simulationRevertReason: "execution reverted: nope",
      warnings: ["simulation-reverted"],
    })

    expect(
      ui.getAllByText("Simulation shows this transaction will fail"),
    ).toHaveLength(1)
  })
})

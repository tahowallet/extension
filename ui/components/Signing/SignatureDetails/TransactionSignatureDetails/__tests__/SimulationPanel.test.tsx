import React from "react"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import {
  createSmartContractAsset,
  createTransactionRequest,
} from "@tallyho/tally-background/tests/factories"
import type {
  AssetTransfer,
  ContractInteraction,
  EnrichedAddressOnNetwork,
} from "@tallyho/tally-background/services/enrichment"
import { renderWithProviders } from "../../../../../tests/test-utils"
import SimulationPanel from "../SimulationPanel"

const USER = "0x208e94d5661a73360d9387d3ca169e5c130090cd"
const POOL = "0x9eef87f4c08d8934cb2a3309df4dec5635338115"

const enrichedAddress = (address: string): EnrichedAddressOnNetwork => ({
  address,
  network: ETHEREUM,
  annotation: {
    timestamp: 0,
    hasCode: false,
    balance: {
      address,
      network: ETHEREUM,
      assetAmount: { asset: ETHEREUM.baseAsset, amount: 0n },
      dataSource: "local",
      retrievedAt: 0,
    },
  },
})

const transfer = (sender: string, recipient: string): AssetTransfer => ({
  type: "asset-transfer",
  timestamp: 0,
  blockTimestamp: undefined,
  sender: enrichedAddress(sender),
  recipient: enrichedAddress(recipient),
  assetAmount: {
    asset: createSmartContractAsset({ symbol: "USDC" }),
    amount: 1n,
    decimalAmount: 1,
    localizedDecimalAmount: "100",
  },
})

const renderPanel = (annotation: Partial<Omit<ContractInteraction, "type">>) =>
  renderWithProviders(
    <SimulationPanel
      transactionRequest={{
        ...createTransactionRequest({ from: USER }),
        annotation: {
          type: "contract-interaction",
          timestamp: 0,
          blockTimestamp: undefined,
          contractInfo: enrichedAddress(POOL),
          ...annotation,
        },
      }}
    />,
  )

describe("SimulationPanel", () => {
  it("says when no simulation ran", () => {
    const ui = renderPanel({})
    expect(
      ui.getByText("Simulation isn't available for this transaction."),
    ).toBeInTheDocument()
  })

  it("lists the simulated balance changes", () => {
    const ui = renderPanel({
      simulationStatus: "success",
      subannotations: [transfer(USER, POOL)],
    })
    expect(ui.getByText("Your account")).toBeInTheDocument()
    expect(ui.getByText("-100")).toBeInTheDocument()
  })

  it("distinguishes a simulation where nothing moved", () => {
    const ui = renderPanel({ simulationStatus: "success" })
    expect(ui.getByText("No balance changes")).toBeInTheDocument()
    expect(
      ui.queryByText("Simulation isn't available for this transaction."),
    ).toBeNull()
  })

  it("leaves a revert to the details' warning", () => {
    const ui = renderPanel({
      simulationStatus: "reverted",
      simulationRevertReason: "execution reverted: nope",
    })
    expect(ui.container).toBeEmptyDOMElement()
  })
})

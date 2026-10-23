import React from "react"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import {
  createSmartContractAsset,
  createTransactionRequest,
} from "@tallyho/tally-background/tests/factories"
import {
  AssetTransfer,
  EnrichedAddressOnNetwork,
  TransactionAnnotation,
} from "@tallyho/tally-background/services/enrichment"
import { renderWithProviders } from "../../../../../../tests/test-utils"
import SimulatedBalanceChanges from "../SimulatedBalanceChanges"

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

const transfer = (
  sender: string,
  recipient: string,
  symbol: string,
  localizedDecimalAmount: string,
): AssetTransfer => ({
  type: "asset-transfer",
  timestamp: 0,
  blockTimestamp: undefined,
  sender: enrichedAddress(sender),
  recipient: enrichedAddress(recipient),
  assetAmount: {
    asset: createSmartContractAsset({ symbol }),
    amount: 1n,
    decimalAmount: 1,
    localizedDecimalAmount,
  },
})

const annotationWith = (
  subannotations?: TransactionAnnotation[],
): TransactionAnnotation => ({
  type: "contract-interaction",
  timestamp: 0,
  blockTimestamp: undefined,
  contractInfo: enrichedAddress(POOL),
  subannotations,
})

describe("SimulatedBalanceChanges", () => {
  const transactionRequest = createTransactionRequest({ from: USER })

  it("lists the user's simulated outflows and inflows", () => {
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotationWith([
          transfer(USER, POOL, "USDC", "100"),
          transfer(POOL, USER, "DAI", "99.5"),
        ])}
      />,
    )

    expect(ui.getByText("Simulated balance changes")).toBeInTheDocument()
    expect(ui.getByText("-100")).toBeInTheDocument()
    expect(ui.getByText("+99.5")).toBeInTheDocument()
  })

  it("renders nothing without transfers involving the user", () => {
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotationWith(undefined)}
      />,
    )

    expect(ui.container).toBeEmptyDOMElement()
  })
})

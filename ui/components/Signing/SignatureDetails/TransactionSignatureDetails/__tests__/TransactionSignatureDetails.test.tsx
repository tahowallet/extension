import React from "react"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import { createTransactionRequest } from "@tallyho/tally-background/tests/factories"
import { renderWithProviders } from "../../../../../tests/test-utils"
import TransactionSignatureDetails from ".."

const POOL = "0x9eef87f4c08d8934cb2a3309df4dec5635338115"

describe("TransactionSignatureDetails", () => {
  it("puts contract interactions in the tabbed interface", () => {
    const ui = renderWithProviders(
      <TransactionSignatureDetails
        transactionRequest={{
          ...createTransactionRequest({ to: POOL, input: "0xa9059cbb" }),
          annotation: {
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
          },
        }}
      />,
    )

    expect(ui.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Details",
      "Simulation",
      "Raw data",
    ])
  })
})

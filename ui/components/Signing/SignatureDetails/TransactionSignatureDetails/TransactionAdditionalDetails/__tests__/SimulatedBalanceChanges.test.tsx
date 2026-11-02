import React from "react"
import userEvent from "@testing-library/user-event"
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

    expect(ui.getByText("Your account")).toBeInTheDocument()
    expect(ui.getByText("-100")).toBeInTheDocument()
    expect(ui.getByText("+99.5")).toBeInTheDocument()
    // Both rows name the pool: as recipient of the outflow, sender of the
    // inflow.
    expect(ui.getByText("To")).toBeInTheDocument()
    expect(ui.getByText("From")).toBeInTheDocument()
  })

  it("lists the executor and the Safe separately for a Safe transaction", () => {
    const SAFE = "0x1111111111111111111111111111111111111111"
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={{
          ...annotationWith([
            transfer(SAFE, POOL, "USDC", "250"),
            // A refund or payout to the executing owner.
            transfer(SAFE, USER, "DAI", "3"),
          ]),
          simulatedSafeAddress: SAFE,
        }}
      />,
    )

    const [account, safe] =
      ui.container.querySelectorAll<HTMLElement>(".simulated_changes")
    expect(account).toHaveTextContent("Your account")
    expect(account).toHaveTextContent("+3")
    expect(safe).toHaveTextContent("Safe")
    expect(safe).toHaveTextContent("-250")
    expect(safe).toHaveTextContent("-3")
  })

  it("says so per party when nothing moved", () => {
    const SAFE = "0x1111111111111111111111111111111111111111"
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={{ ...annotationWith([]), simulatedSafeAddress: SAFE }}
      />,
    )

    expect(ui.getByText("Your account")).toBeInTheDocument()
    expect(ui.getByText("Safe")).toBeInTheDocument()
    expect(ui.getAllByText("No balance changes")).toHaveLength(2)
  })

  it("puts the amount beside the token and the counterparty on the same row", () => {
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotationWith([transfer(USER, POOL, "USDC", "100")])}
      />,
    )

    const row = ui.getByText("-100").closest(".simulated_changes_row")
    expect(row).toHaveTextContent(/-100\s*USDC.*To/)
    // The icon is scaled to the text rather than the 32px "small" size.
    expect(row?.querySelector(".token_icon_wrap.custom_size")).not.toBeNull()
  })

  it("shows the empty state beside its label", () => {
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotationWith([])}
      />,
    )

    expect(
      ui.getByText("No balance changes").closest(".simulated_changes_row"),
    ).toHaveTextContent("Your account")
  })

  it("shows a counterparty's resolved name in place of its address", () => {
    const named = transfer(USER, POOL, "USDC", "100")
    named.recipient.annotation.nameRecord = {
      from: { addressOnNetwork: { address: POOL, network: ETHEREUM } },
      resolved: {
        nameOnNetwork: { name: "pool.eth", network: ETHEREUM },
        expiresAt: Number.MAX_SAFE_INTEGER,
      },
      system: "ENS",
    }
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotationWith([named])}
      />,
    )

    expect(ui.getByText("pool.eth")).toBeInTheDocument()
  })

  it("marks tokens the wallet doesn't track", async () => {
    const untracked = {
      ...transfer(USER, POOL, "USDC", "100"),
      untrackedAsset: true,
    }
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotationWith([untracked])}
      />,
    )

    // An icon sized to the row's 14px text, not a text label.
    const icon = ui.getByRole("img", { name: "Untracked token" })
    expect(ui.queryByText("Untracked token")).toBeNull()
    expect(icon.className).toMatch(/\bicon\b/)

    await userEvent.hover(icon)
    expect(ui.getByText(/You don't track this token/)).toBeInTheDocument()
  })

  it("shows an empty account section without transfers involving the user", () => {
    const ui = renderWithProviders(
      <SimulatedBalanceChanges
        transactionRequest={transactionRequest}
        annotation={annotationWith(undefined)}
      />,
    )

    expect(ui.getByText("No balance changes")).toBeInTheDocument()
    expect(ui.queryByText("Safe")).toBeNull()
  })
})

import React from "react"
import { MemoryRouter } from "react-router-dom"
import { ETHEREUM, ETH } from "@tallyho/tally-background/constants"
import { getFullAssetID } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import { createAccountState, TEST_ADDRESS } from "../../../tests/factories"
import WalletAccountBalanceControl from "../WalletAccountBalanceControl"
import { renderWithProviders } from "../../../tests/test-utils"

type BalanceControlProps = React.ComponentProps<
  typeof WalletAccountBalanceControl
>

// Merged as an object rather than through destructuring defaults, since some
// of these cases need to pass `balance: undefined` and mean it.
const renderBalanceControl = (overrides: Partial<BalanceControlProps> = {}) => {
  const props: BalanceControlProps = {
    balance: "1,234.56",
    initializationLoadingTimeExpired: true,
    isNetworkUnreachable: false,
    ...overrides,
  }

  return renderWithProviders(
    <MemoryRouter>
      <WalletAccountBalanceControl
        balance={props.balance}
        initializationLoadingTimeExpired={
          props.initializationLoadingTimeExpired
        }
        isNetworkUnreachable={props.isNetworkUnreachable}
      />
    </MemoryRouter>,
    {
      preloadedState: {
        account: createAccountState({
          accountsData: {
            evm: {
              [ETHEREUM.chainID]: {
                [TEST_ADDRESS]: {
                  address: TEST_ADDRESS,
                  network: ETHEREUM,
                  balances: {
                    [getFullAssetID(ETH)]: {
                      amount: 1n,
                      // 2023-03-14T09:26:00Z, so the rendered time is fixed
                      retrievedAt: 1678785960000,
                      dataSource: "local" as const,
                    },
                  },
                  ens: {},
                  defaultName: "Test",
                  defaultAvatar: "",
                },
              },
            },
          },
        }),
        ui: {
          ...uiInitialState,
          selectedAccount: { address: TEST_ADDRESS, network: ETHEREUM },
        },
      },
    },
  )
}

describe("WalletAccountBalanceControl", () => {
  it("shows the balance while the network answers", () => {
    const ui = renderBalanceControl()

    expect(ui.getByTestId("wallet_balance")).toHaveTextContent("$1,234.56")
  })

  it("still shows zero as zero when that is what the chain said", () => {
    const ui = renderBalanceControl({ balance: "0.00" })

    expect(ui.getByTestId("wallet_balance")).toHaveTextContent("$0.00")
  })

  it("refuses to pass off a stale balance as current", () => {
    const ui = renderBalanceControl({ isNetworkUnreachable: true })

    // Neither the last known figure nor a zero: both would read as a claim
    // about what this account holds right now, which we cannot make.
    const balance = ui.getByTestId("wallet_balance")
    expect(balance).not.toHaveTextContent("1,234.56")
    expect(balance).not.toHaveTextContent("$0")
    expect(balance).toHaveTextContent("—")
  })

  it("does not spin a loader for a number that is not coming", () => {
    const ui = renderBalanceControl({
      balance: undefined,
      initializationLoadingTimeExpired: false,
      isNetworkUnreachable: true,
    })

    expect(ui.queryByTestId("account_balance_loader")).not.toBeInTheDocument()
    expect(ui.getByTestId("wallet_balance")).toHaveTextContent("—")
  })

  it("keeps today's loading behavior while the network is fine", () => {
    const ui = renderBalanceControl({
      balance: undefined,
      initializationLoadingTimeExpired: false,
    })

    expect(ui.getByTestId("account_balance_loader")).toBeInTheDocument()
  })

  it("says when the withheld balance was last a real one", () => {
    // The placeholder alone says only that we cannot see; this says how old
    // what we last saw is, which is what tells the user whether to worry.
    const ui = renderBalanceControl({ isNetworkUnreachable: true })

    expect(ui.getByText(/Last updated/)).toBeVisible()
  })

  it("says nothing about staleness while the network answers", () => {
    const ui = renderBalanceControl()

    expect(ui.queryByText(/Last updated/)).not.toBeInTheDocument()
  })
})

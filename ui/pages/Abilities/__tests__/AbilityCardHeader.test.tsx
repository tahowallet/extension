import { ETHEREUM } from "@tallyho/tally-background/constants"
import { createAccountData } from "@tallyho/tally-background/tests/factories"
import React from "react"
import {
  createAbility,
  createAccountState,
  TEST_ADDRESS,
} from "../../../tests/factories"
import { renderWithProviders } from "../../../tests/test-utils"
import AbilityCardHeader from "../AbilityCardHeader"

describe("AbilityCardHeader", () => {
  it("should display an ENS name", () => {
    const account = createAccountState()
    const accountData = account.accountsData.evm[ETHEREUM.chainID][
      TEST_ADDRESS
    ] as { ens: { name: string } }

    const ui = renderWithProviders(
      <AbilityCardHeader ability={createAbility()} />,
      {
        preloadedState: { account },
      }
    )

    expect(ui.queryByText(accountData.ens.name)).toBeInTheDocument()
  })

  it("should display a shortened address when an ENS name is unavailable", () => {
    const account = createAccountState()
    const accountData = createAccountData({ ens: {} })
    account.accountsData.evm[ETHEREUM.chainID][TEST_ADDRESS] = accountData

    const ui = renderWithProviders(
      <AbilityCardHeader ability={createAbility()} />,
      {
        preloadedState: { account },
      }
    )

    expect(ui.queryByText("0x208e…090cd")).toBeInTheDocument()
  })
})

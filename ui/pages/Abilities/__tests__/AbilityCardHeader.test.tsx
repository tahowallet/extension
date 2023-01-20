import { ETHEREUM } from "@tallyho/tally-background/constants"
import { Ability } from "@tallyho/tally-background/services/abilities"
import React from "react"
import {
  createAccountData,
  createAccountState,
  TEST_ADDRESS,
} from "../../../tests/factories"
import { renderWithProviders } from "../../../tests/test-utils"
import AbilityCardHeader from "../AbilityCardHeader"

const ABILITY: Ability = {
  type: "mint",
  title: "Test Ability",
  description: null,
  abilityId: "",
  linkUrl: "",
  completed: false,
  removedFromUi: false,
  address: TEST_ADDRESS,
  requirement: {
    type: "hold",
    address: "",
  },
}

describe("AbilityCardHeader", () => {
  it("should display ENS name", async () => {
    const account = createAccountState()
    const accountData = account.accountsData.evm[ETHEREUM.chainID][
      TEST_ADDRESS
    ] as { ens: { name: string } }

    const ui = renderWithProviders(<AbilityCardHeader ability={ABILITY} />, {
      preloadedState: { account },
    })

    expect(ui.queryByText(accountData.ens.name)).toBeInTheDocument()
  })

  it("should display a shortened address when ENS name is unavailable", async () => {
    const account = createAccountState()
    const accountData = createAccountData({ ens: {} })
    account.accountsData.evm[ETHEREUM.chainID][TEST_ADDRESS] = accountData

    const ui = renderWithProviders(<AbilityCardHeader ability={ABILITY} />, {
      preloadedState: { account },
    })

    expect(ui.queryByText("0x208e…090cd")).toBeInTheDocument()
  })
})

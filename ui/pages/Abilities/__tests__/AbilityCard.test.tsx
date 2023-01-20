import { Ability } from "@tallyho/tally-background/services/abilities"
import React from "react"
import { renderWithProviders } from "../../../tests/test-utils"
import { i18n } from "../../../_locales/i18n"
import AbilityCard from "../AbilityCard"
import { createAccountState, TEST_ADDRESS } from "../../../tests/factories"

const TIME_DETAILS = {
  close: i18n.t("abilities.timeCloses"),
  start: i18n.t("abilities.timeStarting"),
}

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

describe("AbilityCard", () => {
  it("should render a component", async () => {
    const ui = renderWithProviders(<AbilityCard ability={ABILITY} />, {
      preloadedState: { account: createAccountState() },
    })

    expect(ui.getByText(ABILITY.title)).toBeInTheDocument()
  })

  it("should not display the time detail message", async () => {
    const ui = renderWithProviders(<AbilityCard ability={ABILITY} />, {
      preloadedState: { account: createAccountState() },
    })

    expect(ui.queryByText(TIME_DETAILS.start)).not.toBeInTheDocument()
    expect(ui.queryByText(TIME_DETAILS.close)).not.toBeInTheDocument()
  })

  it("should display a message that the ability starts within month", async () => {
    // The ability start date is in two weeks
    const date = new Date()
    date.setDate(date.getDate() + 2 * 7)

    const ui = renderWithProviders(
      <AbilityCard ability={{ ...ABILITY, openAt: date.toDateString() }} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.start)).toBeInTheDocument()
  })

  it("should display a message that the ability closes within month", async () => {
    // The deadline for closing ability is in two weeks
    const date = new Date()
    date.setDate(date.getDate() + 2 * 7)

    const ui = renderWithProviders(
      <AbilityCard ability={{ ...ABILITY, closeAt: date.toDateString() }} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.close)).toBeInTheDocument()
  })

  it("should not display the time detail message when the ability date is not in the next month", async () => {
    // Start in 5 weeks
    const openAt = new Date()
    openAt.setDate(openAt.getDate() + 5 * 7)
    // Closing in 7 weeks
    const closeAt = new Date()
    closeAt.setDate(closeAt.getDate() + 7 * 7)

    const ui = renderWithProviders(
      <AbilityCard
        ability={{
          ...ABILITY,
          openAt: openAt.toDateString(),
          closeAt: closeAt.toDateString(),
        }}
      />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.start)).not.toBeInTheDocument()
    expect(ui.queryByText(TIME_DETAILS.close)).not.toBeInTheDocument()
  })
})

import React from "react"
import { renderWithProviders } from "../../../tests/test-utils"
import { i18n } from "../../../_locales/i18n"
import AbilityCard from "../AbilityCard"
import { createAbility, createAccountState } from "../../../tests/factories"

const TIME_DETAILS = {
  close: i18n.t("abilities.timeCloses"),
  start: i18n.t("abilities.timeStarting"),
}

describe("AbilityCard", () => {
  it("should render a component", () => {
    const ability = createAbility()
    const ui = renderWithProviders(<AbilityCard ability={ability} />, {
      preloadedState: { account: createAccountState() },
    })

    expect(ui.getByText(ability.title)).toBeInTheDocument()
  })

  it("should not display the time detail message", () => {
    const ui = renderWithProviders(<AbilityCard ability={createAbility()} />, {
      preloadedState: { account: createAccountState() },
    })

    expect(ui.queryByText(TIME_DETAILS.start)).not.toBeInTheDocument()
    expect(ui.queryByText(TIME_DETAILS.close)).not.toBeInTheDocument()
  })

  it("should display a message that the ability starts within a month", () => {
    // The ability start date is in two weeks
    const date = new Date()
    date.setDate(date.getDate() + 2 * 7)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ openAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.start)).toBeInTheDocument()
  })

  it("should display a message that the ability closes within a month", () => {
    // The deadline for closing ability is in two weeks
    const date = new Date()
    date.setDate(date.getDate() + 2 * 7)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ closeAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.close)).toBeInTheDocument()
  })

  it("should not display the time detail message when the date does not occur within 30 consecutive days", () => {
    // Start in 5 weeks
    const openAt = new Date()
    openAt.setDate(openAt.getDate() + 5 * 7)
    // Closing in 7 weeks
    const closeAt = new Date()
    closeAt.setDate(closeAt.getDate() + 7 * 7)

    const ui = renderWithProviders(
      <AbilityCard
        ability={createAbility({
          openAt: openAt.toDateString(),
          closeAt: closeAt.toDateString(),
        })}
      />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.start)).not.toBeInTheDocument()
    expect(ui.queryByText(TIME_DETAILS.close)).not.toBeInTheDocument()
  })

  it("should not display the time detail message when the ability is expired", () => {
    const date = new Date()
    date.setDate(date.getDate() - 1)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ closeAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.start)).not.toBeInTheDocument()
    expect(ui.queryByText(TIME_DETAILS.close)).not.toBeInTheDocument()
  })

  it("should not display the time detail message when the ability is open", () => {
    const date = new Date()
    date.setDate(date.getDate() - 1)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ openAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )
    expect(ui.queryByText(TIME_DETAILS.start)).not.toBeInTheDocument()
    expect(ui.queryByText(TIME_DETAILS.close)).not.toBeInTheDocument()
  })
})

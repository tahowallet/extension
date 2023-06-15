import React from "react"
import { renderWithProviders } from "../../../tests/test-utils"
import AbilityCard from "../AbilityCard"
import { createAbility, createAccountState } from "../../../tests/factories"

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

    const timeDetails = ui.container.getElementsByClassName("time_details")[0]
    expect(timeDetails).toBeUndefined()
  })

  it("should display a message that the ability closes in 7 days", () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ closeAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )

    expect(ui.queryByText("Closes in 7 days")).toBeInTheDocument()
  })

  it("should display a message that the ability closes in one day", () => {
    const date = new Date()
    date.setDate(date.getDate() + 1)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ closeAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )

    expect(ui.queryByText("Closes in 1 day")).toBeInTheDocument()
  })

  it("should not display a message that the ability closes in 31 days", () => {
    const date = new Date()
    date.setDate(date.getDate() + 31)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ closeAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )

    const timeDetails = ui.container.getElementsByClassName("time_details")[0]
    expect(timeDetails).toBeUndefined()
  })

  it("should display a message that the ability is starting in 7 days", () => {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ openAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )

    expect(ui.queryByText("Starting in 7 days")).toBeInTheDocument()
  })

  it("should display a message that the ability is starting in one day", () => {
    const date = new Date()
    date.setDate(date.getDate() + 1)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ openAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )

    expect(ui.queryByText("Starting in 1 day")).toBeInTheDocument()
  })

  it("should not display a message that the ability is starting in 31 days", () => {
    const date = new Date()
    date.setDate(date.getDate() + 31)

    const ui = renderWithProviders(
      <AbilityCard ability={createAbility({ openAt: date.toDateString() })} />,
      {
        preloadedState: { account: createAccountState() },
      }
    )

    const timeDetails = ui.container.getElementsByClassName("time_details")[0]
    expect(timeDetails).toBeUndefined()
  })

  it("should not display the time detail message when the date does not occur within 30 consecutive days", () => {
    // Starting in 5 weeks
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

    const timeDetails = ui.container.getElementsByClassName("time_details")[0]
    expect(timeDetails).toBeUndefined()
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

    const timeDetails = ui.container.getElementsByClassName("time_details")[0]
    expect(timeDetails).toBeUndefined()
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

    const timeDetails = ui.container.getElementsByClassName("time_details")[0]
    expect(timeDetails).toBeUndefined()
  })
})

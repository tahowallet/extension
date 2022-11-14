import React from "react"
import { hardcodedMainCurrencySign } from "@tallyho/tally-background/redux-slices/utils/constants"
import PriceDetails from "../PriceDetails"
import { renderWithProviders } from "../../../utils/test-utils"

describe("PriceDetails", () => {
  test("should display amount main currency", () => {
    const amount = "1"
    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency={amount}
        priceImpact={undefined}
        isPriceDetailsLoaded
      />
    )
    expect(ui.getByText(`${hardcodedMainCurrencySign}${amount}`)).toBeVisible()
  })

  test("should display that amount is lower than 0", () => {
    const amount = "0.00"
    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency={amount}
        priceImpact={undefined}
        isPriceDetailsLoaded
      />
    )
    expect(ui.getByText(`<${hardcodedMainCurrencySign}${amount}`)).toBeVisible()
  })

  test("should display 0.00 when price is loading", () => {
    const amount = "0.00"
    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={undefined}
        isPriceDetailsLoaded={false}
      />,
      {}
    )
    expect(ui.getByText(`${hardcodedMainCurrencySign}${amount}`)).toBeVisible()
  })

  test("should display price impact", () => {
    const priceImpact = 2

    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency="1"
        priceImpact={priceImpact}
        isPriceDetailsLoaded
      />
    )

    expect(ui.getByText(`(${priceImpact}%)`)).toBeVisible()
  })

  test("should not display price impact when is undefined", () => {
    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={undefined}
        isPriceDetailsLoaded
      />
    )

    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })

  test("should not display price impact when is 0", () => {
    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={0}
        isPriceDetailsLoaded
      />
    )

    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })

  test("should display info when price is unknown", () => {
    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={0}
        isPriceDetailsLoaded
      />
    )

    expect(ui.getByText("No price information")).toBeVisible()
    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })

  test("should not display price impact when it is below 1%", () => {
    const priceImpact = 1

    const ui = renderWithProviders(
      <PriceDetails
        amountMainCurrency="1"
        priceImpact={priceImpact}
        isPriceDetailsLoaded
      />
    )

    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })
})

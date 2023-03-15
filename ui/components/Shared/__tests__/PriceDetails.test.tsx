import React from "react"
import { hardcodedMainCurrencySign } from "@tallyho/tally-background/redux-slices/utils/constants"
import { render } from "@testing-library/react"
import PriceDetails from "../PriceDetails"

describe("PriceDetails", () => {
  test("should display amount main currency", () => {
    const amount = "1"
    const ui = render(
      <PriceDetails
        amountMainCurrency={amount}
        priceImpact={undefined}
        isLoading={false}
        mainCurrencySign={hardcodedMainCurrencySign}
      />
    )
    expect(ui.getByText(`${hardcodedMainCurrencySign}${amount}`)).toBeVisible()
  })

  test("should display that amount is lower than 0", () => {
    const amount = "0.00"
    const ui = render(
      <PriceDetails
        amountMainCurrency={amount}
        priceImpact={undefined}
        isLoading={false}
        mainCurrencySign={hardcodedMainCurrencySign}
      />
    )
    expect(ui.getByText(`<${hardcodedMainCurrencySign}${amount}`)).toBeVisible()
  })

  test("should not display price details when price is loading", () => {
    const amount = "0.00"
    const ui = render(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={undefined}
        isLoading
        mainCurrencySign={hardcodedMainCurrencySign}
      />,
      {}
    )
    expect(
      ui.queryByText(`${hardcodedMainCurrencySign}${amount}`)
    ).not.toBeInTheDocument()
    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })

  test("should display price impact", () => {
    const priceImpact = 2

    const ui = render(
      <PriceDetails
        amountMainCurrency="1"
        priceImpact={priceImpact}
        isLoading={false}
        mainCurrencySign={hardcodedMainCurrencySign}
      />
    )

    expect(ui.getByText(`(${priceImpact}%)`)).toBeVisible()
  })

  test("should not display price impact when is undefined", () => {
    const ui = render(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={undefined}
        isLoading={false}
        mainCurrencySign={hardcodedMainCurrencySign}
      />
    )

    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })

  test("should not display price impact when is 0", () => {
    const ui = render(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={0}
        isLoading={false}
        mainCurrencySign={hardcodedMainCurrencySign}
      />
    )

    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })

  test("should display info when price is unknown", () => {
    const ui = render(
      <PriceDetails
        amountMainCurrency={undefined}
        priceImpact={0}
        isLoading={false}
        mainCurrencySign={hardcodedMainCurrencySign}
      />
    )

    expect(ui.getByText("No price information")).toBeVisible()
    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })

  test("should not display price impact when it is below 1%", () => {
    const priceImpact = 1

    const ui = render(
      <PriceDetails
        amountMainCurrency="1"
        priceImpact={priceImpact}
        isLoading={false}
        mainCurrencySign={hardcodedMainCurrencySign}
      />
    )

    expect(ui.queryByTestId("price_impact_percent")).not.toBeInTheDocument()
  })
})

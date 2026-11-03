import React, { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  ARBITRUM_ONE,
  AVALANCHE,
  BINANCE_SMART_CHAIN,
  ETHEREUM,
  OPTIMISM,
  POLYGON,
} from "@tallyho/tally-background/constants"
import FullTabNetworkFilter, {
  NetworkFilterOption,
} from "../FullTabNetworkFilter"

const options: NetworkFilterOption[] = [
  { network: ETHEREUM, count: 5 },
  { network: OPTIMISM, count: 2 },
  { network: POLYGON, count: 1 },
  { network: ARBITRUM_ONE, count: 0 },
  { network: AVALANCHE, count: 3 },
  { network: BINANCE_SMART_CHAIN, count: 4 },
]

function Harness({ onChange }: { onChange?: (s: Set<string>) => void }) {
  const [selected, setSelected] = useState(
    new Set(options.map(({ network }) => network.chainID)),
  )
  return (
    <FullTabNetworkFilter
      options={options}
      selected={selected}
      onChange={(next) => {
        setSelected(next)
        onChange?.(next)
      }}
    />
  )
}

describe("FullTabNetworkFilter", () => {
  it("stacks the first few networks and summarizes the rest", () => {
    render(<Harness />)

    expect(screen.getByText("+2 more")).toBeInTheDocument()
  })

  it("lists every network with its count when opened", async () => {
    render(<Harness />)

    await userEvent.click(screen.getByRole("button", { name: "Networks" }))

    const menu = screen.getByRole("dialog", { name: "Networks" })
    expect(menu).toHaveTextContent("Ethereum5")
    expect(menu).toHaveTextContent("BNB Chain4")
    // The all-networks row totals every network's count.
    expect(menu).toHaveTextContent("Networks15")
  })

  it("deselects networks one at a time", async () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Networks" }))

    const [, ethereumCheckbox] = screen.getAllByRole("checkbox")
    await userEvent.click(ethereumCheckbox)
    expect(onChange).toHaveBeenLastCalledWith(
      new Set(
        options
          .map(({ network }) => network.chainID)
          .filter((chainID) => chainID !== ETHEREUM.chainID),
      ),
    )

    await userEvent.click(screen.getByRole("checkbox", { name: /Optimism/ }))
    expect(onChange).toHaveBeenLastCalledWith(
      new Set(
        options
          .map(({ network }) => network.chainID)
          .filter(
            (chainID) =>
              chainID !== ETHEREUM.chainID && chainID !== OPTIMISM.chainID,
          ),
      ),
    )
    // Four of six shown now, so nothing is summarized.
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument()
  })

  it("selects and deselects every network at once", async () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Networks" }))

    await userEvent.click(screen.getAllByRole("checkbox")[0])
    expect(onChange).toHaveBeenLastCalledWith(new Set())

    await userEvent.click(screen.getAllByRole("checkbox")[0])
    expect(onChange).toHaveBeenLastCalledWith(
      new Set(options.map(({ network }) => network.chainID)),
    )
  })
})

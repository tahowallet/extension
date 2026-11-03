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
const allChainIDs = options.map(({ network }) => network.chainID)

function Harness({ onChange }: { onChange?: (s: Set<string>) => void }) {
  const [selected, setSelected] = useState(new Set(allChainIDs))
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

const openFilter = () =>
  userEvent.click(screen.getByRole("button", { expanded: false }))

describe("FullTabNetworkFilter", () => {
  it("stacks three icons and an ellipsis past four, with a summary", () => {
    render(<Harness />)

    expect(screen.getByTestId("network_stack_more")).toBeInTheDocument()
    expect(screen.getByText("Ethereum and 5 more")).toBeInTheDocument()
  })

  it("lists every network with its count when opened", async () => {
    render(<Harness />)
    await openFilter()

    expect(screen.getByRole("checkbox", { name: /Ethereum/ })).toBeChecked()
    expect(
      screen.getByRole("checkbox", { name: /BNB Chain/ }),
    ).toHaveAccessibleName("BNB Chain 4")
    // The all-networks row totals every network's count.
    expect(screen.getByRole("checkbox", { name: "Networks 15" })).toBeChecked()
  })

  it("deselects networks one at a time", async () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    await openFilter()

    await userEvent.click(screen.getByRole("checkbox", { name: /Ethereum/ }))
    await userEvent.click(screen.getByText("Optimism"))

    expect(onChange).toHaveBeenLastCalledWith(
      new Set(
        allChainIDs.filter(
          (chainID) =>
            chainID !== ETHEREUM.chainID && chainID !== OPTIMISM.chainID,
        ),
      ),
    )
    // Four networks fit in the stack without an ellipsis.
    expect(screen.queryByTestId("network_stack_more")).not.toBeInTheDocument()
    expect(screen.getByText("Polygon and 3 more")).toBeInTheDocument()
    expect(
      screen.getByRole("checkbox", { name: "Networks 15" }),
    ).toHaveProperty("indeterminate", true)
  })

  it("selects and deselects every network at once", async () => {
    const onChange = jest.fn()
    render(<Harness onChange={onChange} />)
    await openFilter()

    const all = screen.getByRole("checkbox", { name: "Networks 15" })
    await userEvent.click(all)
    expect(onChange).toHaveBeenLastCalledWith(new Set())

    await userEvent.click(all)
    expect(onChange).toHaveBeenLastCalledWith(new Set(allChainIDs))
  })
})

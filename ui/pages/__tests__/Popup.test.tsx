import React, { ReactElement, ReactNode } from "react"
import { act, fireEvent, waitFor } from "@testing-library/react"
import {
  ARBITRUM_ONE,
  ETHEREUM,
  OPTIMISM,
} from "@tallyho/tally-background/constants"
import {
  initialState as networksInitialState,
  setEVMNetworks,
} from "@tallyho/tally-background/redux-slices/networks"
import { initialState as uiInitialState } from "@tallyho/tally-background/redux-slices/ui"
import NetworkUnreachableBanner from "../../components/Wallet/NetworkUnreachableBanner"
import NetworkUnreachableWarning from "../../components/Shared/NetworkUnreachableWarning"
import SettingsCustomNetworks from "../Settings/SettingsCustomNetworks"
import { Main } from "../Popup"
import { renderWithProviders } from "../../tests/test-utils"

jest.mock("webextension-polyfill", () => ({
  runtime: { connect: () => ({ disconnect: () => {} }) },
}))

jest.mock("../Settings/CustomNetworkEditForm", () => ({
  __esModule: true,
  EDIT_FORM_MENU_HEIGHT: "500px",
  default: ({ network }: { network: { name: string } }) => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const react = require("react")
    return react.createElement("div", null, `editing ${network.name}`)
  },
}))

jest.mock("../../components/Core/CorePage", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}))

function WarningsPage(): ReactElement {
  return (
    <>
      <NetworkUnreachableBanner network={OPTIMISM} />
      <NetworkUnreachableWarning chainID={OPTIMISM.chainID} />
    </>
  )
}

// The real page list drags in every page of the extension; the shell's own
// routing and transitions are what matter here.
jest.mock("../../routes/routes", () => ({
  __esModule: true,
  default: [
    {
      path: "/settings/custom-networks",
      Component: SettingsCustomNetworks,
      hasTabBar: true,
      hasTopBar: false,
      persistOnClose: true,
    },
    {
      path: "/",
      Component: WarningsPage,
      hasTabBar: true,
      hasTopBar: false,
      persistOnClose: true,
    },
  ],
}))

const renderPopup = () =>
  renderWithProviders(<Main />, {
    preloadedState: {
      networks: {
        ...networksInitialState,
        evmNetworks: {
          [ETHEREUM.chainID]: ETHEREUM,
          [OPTIMISM.chainID]: OPTIMISM,
        },
      },
      ui: { ...uiInitialState, routeHistoryEntries: [{ pathname: "/" }] },
    },
  })

// Long enough for the page transition to finish and drop the outgoing page.
const settleTransition = () =>
  act(() => new Promise((resolve) => setTimeout(resolve, 500)))

describe("Popup", () => {
  it("opens the RPC settings for an unreachable network from its banner", async () => {
    const ui = renderPopup()

    fireEvent.click(ui.getByRole("button", { name: /RPC settings/i }))
    await settleTransition()

    await waitFor(() =>
      expect(ui.getAllByText(`editing ${OPTIMISM.name}`)).toHaveLength(1),
    )
  })

  it("opens the RPC settings for an unreachable network from its warning", async () => {
    const ui = renderPopup()

    fireEvent.mouseEnter(ui.getByLabelText("Network connection problem"))
    fireEvent.click(ui.getByRole("link", { name: /RPC configuration/ }))
    await settleTransition()

    await waitFor(() =>
      expect(ui.getAllByText(`editing ${OPTIMISM.name}`)).toHaveLength(1),
    )
  })

  it("leaves the RPC settings closed once the user closes them", async () => {
    const ui = renderPopup()

    fireEvent.click(ui.getByRole("button", { name: /RPC settings/i }))
    await settleTransition()
    // The edit form's slide-up comes first; the delete confirmation follows.
    fireEvent.click(ui.getAllByRole("button", { name: "Close menu" })[0])
    act(() => {
      ui.store.dispatch(setEVMNetworks([ETHEREUM, OPTIMISM, ARBITRUM_ONE]))
    })
    await settleTransition()

    expect(ui.queryByText(`editing ${OPTIMISM.name}`)).not.toBeInTheDocument()
  })
})

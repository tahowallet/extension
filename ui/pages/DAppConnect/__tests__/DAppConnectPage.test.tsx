import React from "react"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import { ETHEREUM, POLYGON } from "@tallyho/tally-background/constants"
import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { renderWithProviders } from "../../../tests/test-utils"
import { TEST_ADDRESS } from "../../../tests/factories"
import DAppConnectPage from "../DAppConnectPage"

const ACCOUNT_TOTAL: AccountTotal = {
  address: TEST_ADDRESS,
  network: ETHEREUM,
  shortenedAddress: "0x208e…90cd",
  accountType: AccountType.ReadOnly,
  signerId: null,
  path: null,
  accountSigner: ReadOnlyAccountSigner,
  name: "Test account",
}

const PERMISSION: PermissionRequest = {
  key: `https://app.test_${TEST_ADDRESS}_${POLYGON.chainID}`,
  origin: "https://app.test",
  faviconUrl: "",
  title: "Test dApp",
  state: "request",
  accountAddress: TEST_ADDRESS,
  chainID: POLYGON.chainID,
}

const renderPage = (additionalNetwork?: typeof POLYGON) =>
  renderWithProviders(
    <DAppConnectPage
      permission={PERMISSION}
      currentAccountTotal={ACCOUNT_TOTAL}
      additionalNetwork={additionalNetwork}
      denyPermission={() => Promise.resolve()}
      grantPermission={() => Promise.resolve()}
    />,
  )

describe("DAppConnectPage", () => {
  test("should ask to connect a new dApp", () => {
    const ui = renderPage()

    expect(ui.getByText("Connect to dApp")).toBeVisible()
    expect(ui.getByRole("button", { name: "Connect" })).toBeVisible()
    expect(ui.queryByText(/Allow .* to use/)).toBeNull()
  })

  test("should ask about the network for an additional network", () => {
    const ui = renderPage(POLYGON)

    expect(ui.getByText("Allow another network")).toBeVisible()
    expect(
      ui.getByText(`Allow Test dApp to use ${POLYGON.name}?`),
    ).toBeVisible()
    expect(ui.getByText(POLYGON.name)).toBeVisible()
    expect(ui.getByRole("button", { name: "Allow" })).toBeVisible()
    expect(ui.queryByText("Connect to dApp")).toBeNull()
  })
})

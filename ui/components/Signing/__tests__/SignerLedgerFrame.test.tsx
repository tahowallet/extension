import React from "react"
import { MemoryRouter } from "react-router-dom"
import { ETHEREUM } from "@tallyho/tally-background/constants"
import { initialState as ledgerInitialState } from "@tallyho/tally-background/redux-slices/ledger"
import type { SignOperationType } from "@tallyho/tally-background/redux-slices/signing"
import type { LedgerAccountSigner } from "@tallyho/tally-background/services/ledger"
import { createTransactionRequest } from "@tallyho/tally-background/tests/factories"
import SignerLedgerFrame from "../Signer/SignerLedger/SignerLedgerFrame"
import { renderWithProviders } from "../../../tests/test-utils"
import { TEST_ADDRESS } from "../../../tests/factories"

const DEVICE_ID = "LEDGER_NANO_X_0x1111111111111111111111111111111111111111"

const signer: LedgerAccountSigner = {
  type: "ledger",
  deviceID: DEVICE_ID,
  path: "44'/60'/0'/0/0",
}

const account = { address: TEST_ADDRESS, network: ETHEREUM }

const personalMessage = {
  account,
  messageType: "eip191",
  signingData: "Hello",
  rawSigningData: "0x48656c6c6f",
} as SignOperationType

const typedData = {
  account,
  typedData: {
    domain: { name: "Test", chainId: 1 },
    types: { Test: [{ name: "contents", type: "string" }] },
    primaryType: "Test",
    message: { contents: "Hello" },
  },
} as SignOperationType

const transaction = (input: string | null) =>
  createTransactionRequest({ from: TEST_ADDRESS, input })

beforeEach(() => {
  jest.spyOn(document, "hasFocus").mockReturnValue(true)
})

afterEach(() => {
  jest.restoreAllMocks()
})

const renderFrame = (
  request: SignOperationType,
  isArbitraryDataSigningEnabled: boolean,
) =>
  renderWithProviders(
    <MemoryRouter>
      <SignerLedgerFrame
        request={request}
        signer={signer}
        signingAddress={account}
        renderedSigningData={<div />}
        signingActionLabelI18nKey="signTransaction.confirmButtonLabel"
        signActionCreator={() => ({ type: "sign" })}
        rejectActionCreator={() => ({ type: "reject" })}
      >
        <div>details</div>
      </SignerLedgerFrame>
    </MemoryRouter>,
    {
      preloadedState: {
        ledger: {
          ...ledgerInitialState,
          currentDeviceID: DEVICE_ID,
          usbDeviceCount: 1,
          devices: {
            [DEVICE_ID]: {
              id: DEVICE_ID,
              accounts: {},
              status: "available",
              isArbitraryDataSigningEnabled,
              displayDetails: { messageSigningDisplayLength: 255 },
            },
          },
        },
      },
    },
  )

const expectSignable = (ui: ReturnType<typeof renderFrame>) => {
  expect(ui.getByRole("button", { name: "Sign" })).toBeInTheDocument()
  expect(ui.queryByRole("button", { name: "Check Error" })).toBeNull()
}

const expectBlindSigningRequired = (ui: ReturnType<typeof renderFrame>) => {
  expect(ui.getByRole("button", { name: "Check Error" })).toBeInTheDocument()
  expect(ui.queryByRole("button", { name: "Sign" })).toBeNull()
}

describe("SignerLedgerFrame", () => {
  describe("with blind signing off", () => {
    it("signs a personal message", () => {
      expectSignable(renderFrame(personalMessage, false))
    })

    it("signs a transaction without calldata", () => {
      expectSignable(renderFrame(transaction(null), false))
    })

    it("asks for blind signing for a transaction with calldata", () => {
      expectBlindSigningRequired(renderFrame(transaction("0xa9059cbb"), false))
    })

    it("asks for blind signing for typed data", () => {
      expectBlindSigningRequired(renderFrame(typedData, false))
    })
  })

  describe("with blind signing on", () => {
    it("signs a transaction with calldata", () => {
      expectSignable(renderFrame(transaction("0xa9059cbb"), true))
    })

    it("signs typed data", () => {
      expectSignable(renderFrame(typedData, true))
    })
  })
})

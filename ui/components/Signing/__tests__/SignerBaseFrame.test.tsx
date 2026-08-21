import React from "react"
import { MemoryRouter } from "react-router-dom"
import { OPTIMISM } from "@tallyho/tally-background/constants"
import { initialState as networksInitialState } from "@tallyho/tally-background/redux-slices/networks"
import {
  initialState as transactionConstructionInitialState,
  TransactionConstructionStatus,
} from "@tallyho/tally-background/redux-slices/transaction-construction"
import { initialState as signingInitialState } from "@tallyho/tally-background/redux-slices/signing"
import SignerBaseFrame from "../Signer/SignerBaseFrame"
import { renderWithProviders } from "../../../tests/test-utils"

const SIGN_LABEL = "Sign"

// The sign button holds itself back for a moment whenever the window loses
// focus, and jsdom reports a document that never had it.
beforeEach(() => {
  jest.spyOn(document, "hasFocus").mockReturnValue(true)
})

afterEach(() => {
  jest.restoreAllMocks()
})

type Options = {
  /**
   * Present for a transaction request, absent for a message or typed-data one,
   * exactly as the real slice has it.
   */
  transactionNetwork?: typeof OPTIMISM
  unreachableChainID?: string
}

const renderFrame = ({ transactionNetwork, unreachableChainID }: Options) => {
  const isTransaction = transactionNetwork !== undefined

  return renderWithProviders(
    <MemoryRouter>
      <SignerBaseFrame
        signingActionLabel={SIGN_LABEL}
        onConfirm={() => {}}
        onReject={() => {}}
      >
        <div>details</div>
      </SignerBaseFrame>
    </MemoryRouter>,
    {
      preloadedState: {
        networks: {
          ...networksInitialState,
          unreachableNetworks:
            unreachableChainID === undefined
              ? {}
              : { [unreachableChainID]: true },
        },
        // The signing button unlocks on a loaded transaction or a pending
        // message request, so a frame rendered without either would be
        // disabled for reasons that have nothing to do with reachability.
        transactionConstruction: {
          ...transactionConstructionInitialState,
          status: isTransaction
            ? TransactionConstructionStatus.Loaded
            : transactionConstructionInitialState.status,
          // Only the network is read on this path; the rest of a request would
          // be noise here.
          transactionRequest: isTransaction
            ? ({ network: transactionNetwork } as never)
            : undefined,
        },
        signing: {
          ...signingInitialState,
          // A message-signing request carries the account it is for, and the
          // account carries the network — the same unreachable one.
          signDataRequest: isTransaction
            ? undefined
            : ({
                rawSigningData: "0x00",
                account: { address: "0x0", network: OPTIMISM },
              } as never),
        },
      },
    },
  )
}

const signButton = (ui: ReturnType<typeof renderFrame>) =>
  ui.getByRole("button", { name: SIGN_LABEL })

// SharedButton disables itself with a class and suppressed pointer events
// rather than the DOM attribute, so that is what there is to assert on.
const expectSignable = (ui: ReturnType<typeof renderFrame>) =>
  expect(signButton(ui)).not.toHaveClass("disabled")

const expectNotSignable = (ui: ReturnType<typeof renderFrame>) =>
  expect(signButton(ui)).toHaveClass("disabled")

describe("SignerBaseFrame", () => {
  it("signs a transaction on a network that answers", () => {
    const ui = renderFrame({ transactionNetwork: OPTIMISM })

    expectSignable(ui)
  })

  it("refuses to sign a transaction on a network it cannot read", () => {
    // Neither the fee estimate nor the account's transaction count can be
    // confirmed, and both are part of what the user would be signing.
    const ui = renderFrame({
      transactionNetwork: OPTIMISM,
      unreachableChainID: OPTIMISM.chainID,
    })

    // The warning icon lives on the network in the top bar, which this frame
    // does not render; here the button and its tooltip carry the message.
    expectNotSignable(ui)
  })

  it("still signs a message on a network it cannot read", () => {
    // This frame is shared with message and typed-data signing, neither of
    // which needs anything from the chain, so neither should be blocked by it.
    const ui = renderFrame({ unreachableChainID: OPTIMISM.chainID })

    expectSignable(ui)
  })

  it("leaves an unrelated network's outage out of it", () => {
    const ui = renderFrame({
      transactionNetwork: OPTIMISM,
      unreachableChainID: "137",
    })

    expectSignable(ui)
  })
})

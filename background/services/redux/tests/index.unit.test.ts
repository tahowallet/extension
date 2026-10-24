import Emittery from "emittery"
import ReduxService from ".."
import { POLYGON } from "../../../constants"

describe("ReduxService", () => {
  it("marks account activity when an origin switches networks", async () => {
    const address = "0x0000000000000000000000000000000000000001"
    const internalEthereumProviderService = { emitter: new Emittery() }
    const markAccountActivity = jest.fn(() => Promise.resolve())

    // Only the services the networkSwitchedForOrigin listeners use.
    const service = {
      internalEthereumProviderService,
      chainService: { markAccountActivity },
      preferenceService: {
        getSelectedAccount: () =>
          Promise.resolve({ address, network: POLYGON }),
      },
      providerBridgeService: {
        notifyContentScriptsAboutNetworkChange: () => Promise.resolve(),
      },
      store: { dispatch: jest.fn() },
    }

    await ReduxService.prototype.connectInternalEthereumProviderService.call(
      service,
    )
    await internalEthereumProviderService.emitter.emit(
      "networkSwitchedForOrigin",
      { origin: "https://switch.test", network: POLYGON },
    )

    expect(markAccountActivity).toHaveBeenCalledWith({
      address,
      network: POLYGON,
    })
  })
})

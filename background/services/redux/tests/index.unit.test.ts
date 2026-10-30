import Emittery from "emittery"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import ReduxService from ".."
import { ETHEREUM, POLYGON } from "../../../constants"
import { emitter as dappEmitter } from "../../../redux-slices/dapp"
import { emitter as uiEmitter } from "../../../redux-slices/ui"
import { AnalyticsEvent } from "../../../lib/posthog"

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

  describe("on a granted permission", () => {
    const origin = "https://grant.test"
    const request: PermissionRequest = {
      key: `${origin}_0x0000000000000000000000000000000000000001`,
      origin,
      faviconUrl: "",
      title: "Test",
      state: "allow",
      accountAddress: "0x0000000000000000000000000000000000000001",
    }

    let grantPermission: ReturnType<typeof jest.fn>
    let sendAnalyticsEvent: ReturnType<typeof jest.fn>

    beforeEach(async () => {
      grantPermission = jest.fn(() => Promise.resolve())
      sendAnalyticsEvent = jest.fn()

      // Only the services the provider bridge listeners use.
      const service = {
        providerBridgeService: { emitter: new Emittery(), grantPermission },
        chainService: { supportedNetworks: [ETHEREUM, POLYGON] },
        internalEthereumProviderService: {
          getCurrentOrDefaultNetworkForOrigin: () => Promise.resolve(POLYGON),
        },
        analyticsService: { sendAnalyticsEvent },
        campaignService: { checkMezoSatsDrop: jest.fn() },
        store: { dispatch: jest.fn() },
      }

      await ReduxService.prototype.connectProviderBridgeService.call(service)
    })

    afterEach(() => {
      dappEmitter.clearListeners()
      uiEmitter.clearListeners()
    })

    it("grants a request without a chainID on every supported network", async () => {
      await dappEmitter.emit("grantPermission", request)

      expect(grantPermission.mock.calls).toEqual([
        [{ ...request, chainID: ETHEREUM.chainID }],
        [{ ...request, chainID: POLYGON.chainID }],
      ])
      expect(sendAnalyticsEvent).toHaveBeenCalledWith(
        AnalyticsEvent.DAPP_CONNECTED,
        { origin, chainId: POLYGON.chainID },
      )
    })

    it("grants a request with a chainID on that network alone", async () => {
      await dappEmitter.emit("grantPermission", {
        ...request,
        chainID: ETHEREUM.chainID,
      })

      expect(grantPermission.mock.calls).toEqual([
        [{ ...request, chainID: ETHEREUM.chainID }],
      ])
      expect(sendAnalyticsEvent).toHaveBeenCalledWith(
        AnalyticsEvent.DAPP_CONNECTED,
        { origin, chainId: ETHEREUM.chainID },
      )
    })
  })
})

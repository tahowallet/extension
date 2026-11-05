import Emittery from "emittery"
import { PermissionRequest } from "@tallyho/provider-bridge-shared"
import ReduxService from ".."
import {
  ARBITRUM_NOVA,
  DEFAULT_NETWORKS,
  ETHEREUM,
  POLYGON,
} from "../../../constants"
import { setEVMNetworks } from "../../../redux-slices/networks"
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
        chainService: { getSupportedNetworks: () => [ETHEREUM, POLYGON] },
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

  describe("removeUnlistedChainData", () => {
    const FORK_CHAIN_ID = "73571"
    const CUSTOM = { ...POLYGON, name: "Still Listed", chainID: "558" }

    /**
     * Returns a stand-in for the services the sweep uses, where every service
     * holds data for mainnet, a listed custom network, a built-in network
     * missing from the list, and a removed fork.
     */
    const serviceWith = (listed = [...DEFAULT_NETWORKS, CUSTOM]) => {
      const held = () =>
        Promise.resolve(
          new Set([
            ETHEREUM.chainID,
            CUSTOM.chainID,
            ARBITRUM_NOVA.chainID,
            FORK_CHAIN_ID,
          ]),
        )
      const removers = Array.from({ length: 4 }, () =>
        jest.fn((_: string) => Promise.resolve(1)),
      )
      const [chain, indexing, history, nfts] = removers.map(
        (removeChainData) => ({ getChainIDsWithData: held, removeChainData }),
      )
      const dispatch = jest.fn()
      const service = {
        chainService: { ...chain, getSupportedNetworks: () => listed },
        indexingService: indexing,
        historyService: history,
        nftsService: nfts,
        store: { dispatch },
      }
      return { service, removers, dispatch }
    }

    it("removes every service's data for chains missing from the list", async () => {
      const { service, removers, dispatch } = serviceWith()

      const deleted =
        await ReduxService.prototype.removeUnlistedChainData.call(service)

      // Built-in networks stay, listed or not, as does a listed custom
      // network, whether or not its endpoints answer.
      removers.forEach((remover) =>
        expect(remover.mock.calls).toEqual([[FORK_CHAIN_ID]]),
      )
      expect(deleted).toBe(4)
      // Redux is pruned again, for data loaded before it was deleted.
      expect(dispatch).toHaveBeenCalledWith(
        setEVMNetworks([...DEFAULT_NETWORKS, CUSTOM]),
      )
    })

    it("removes nothing by a partial list", async () => {
      const { service, removers, dispatch } = serviceWith([ETHEREUM])

      await ReduxService.prototype.removeUnlistedChainData.call(service)

      removers.forEach((remover) => expect(remover).not.toHaveBeenCalled())
      expect(dispatch).not.toHaveBeenCalled()
    })
  })
})

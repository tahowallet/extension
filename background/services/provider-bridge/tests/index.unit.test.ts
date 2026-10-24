import {
  EIP1193_ERROR_CODES,
  PermissionRequest,
} from "@tallyho/provider-bridge-shared"
import sinon from "sinon"
import browser from "webextension-polyfill"
import { waitFor } from "@testing-library/dom"
import * as popupUtils from "../show-popup"
import * as featureFlags from "../../../features"
import { createProviderBridgeService } from "../../../tests/factories"
import InternalEthereumProviderService, {
  AddEthereumChainParameter,
} from "../../internal-ethereum-provider"
import ProviderBridgeService from "../index"
import { validateAddEthereumChainParameter } from "../utils"
import { ETHEREUM, POLYGON } from "../../../constants"
import { sameChainID, toHexChainID } from "../../../networks"

const WINDOW = {
  focused: true,
  incognito: false,
  alwaysOnTop: true,
}

const CHAIN_ID = "1"
const ADDRESS = "0x0000000000000000000000000000000000000000"

const BASE_DATA = {
  enablingPermission: {
    key: `https://app.test_${"0x0000000000000000000000000000000000000000"}_${CHAIN_ID}`,
    origin: "https://app.test",
    faviconUrl: "https://app.test/favicon.png",
    title: "Test",
    state: "allow",
    accountAddress: ADDRESS,
    chainID: CHAIN_ID,
  } as PermissionRequest,
  origin: "https://app.test",
}

const PARAMS = {
  eth_accounts: ["Test", "https://app.test/favicon.png"],
  eth_sendTransaction: [
    {
      from: ADDRESS,
      data: Date.now().toString(),
      gasPrice: "0xf4240",
      to: "0x1111111111111111111111111111111111111111",
    },
  ],
}
describe("ProviderBridgeService", () => {
  let providerBridgeService: ProviderBridgeService
  const sandbox = sinon.createSandbox()

  beforeEach(async () => {
    browser.windows.getCurrent = jest.fn(() => Promise.resolve(WINDOW))
    browser.windows.create = jest.fn(() => Promise.resolve(WINDOW))
    providerBridgeService = await createProviderBridgeService()
    await providerBridgeService.startService()
    sandbox.restore()
  })

  afterEach(async () => {
    await providerBridgeService.stopService()
    jest.clearAllMocks()
  })

  describe("routeContentScriptRPCRequest", () => {
    it("eth_accounts should return the account address owned by the client", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_accounts"
      const params = PARAMS[method]

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        method,
        params,
        origin,
      )
      expect(response).toEqual([enablingPermission.accountAddress])
    })

    it("eth_sendTransaction should call routeSafeRequest when a user has permission to sign", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_sendTransaction"
      const params = PARAMS[method]
      const stub = sandbox.stub(providerBridgeService, "routeSafeRequest")

      await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        method,
        params,
        origin,
      )

      expect(stub.called).toBe(true)
    })

    it("eth_sendTransaction should not call routeSafeRequest when a user has not permission to sign", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_sendTransaction"
      const params = PARAMS[method]
      const stub = sandbox.stub(providerBridgeService, "routeSafeRequest")

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        { ...enablingPermission, state: "deny" },
        method,
        params,
        origin,
      )

      expect(stub.called).toBe(false)
      expect(response).toBe(EIP1193_ERROR_CODES.unauthorized)
    })

    it("should wait for user confirmation before calling wallet_AddEtherumChain", async () => {
      const params = [
        {
          chainId: "0xfa",
          chainName: "Fantom Opera",
          nativeCurrency: { name: "Fantom", symbol: "FTM", decimals: 18 },
          rpcUrls: [
            "https://fantom-mainnet.gateway.pokt.network/v1/lb/62759259ea1b320039c9e7ac",
            "https://rpc.ftm.tools",
            "https://rpc.ankr.com/fantom",
            "https://rpc.fantom.network",
          ],
          blockExplorerUrls: ["https://ftmscan.com"],
        },
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "some site",
        "favicon.png",
      ]

      const { enablingPermission } = BASE_DATA

      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
      const showPopupSpy = jest.spyOn(popupUtils, "default")

      const request = providerBridgeService.routeContentScriptRPCRequest(
        {
          ...enablingPermission,
        },
        "wallet_addEthereumChain",
        params,
        enablingPermission.origin,
      )

      // @ts-expect-error private access to reference the service
      const IEP = providerBridgeService.internalEthereumProviderService
      const spy = jest.spyOn(IEP, "routeSafeRPCRequest")

      // wait until popup is set up
      await waitFor(() => expect(showPopupSpy).toHaveBeenCalled())

      const validatedPayload = validateAddEthereumChainParameter(
        params[0] as AddEthereumChainParameter,
      )

      await waitFor(() =>
        expect(providerBridgeService.getNewCustomRPCDetails("0")).toEqual({
          ...validatedPayload,
          favicon: "favicon.png",
          siteTitle: "some site",
        }),
      )

      expect(spy).not.toHaveBeenCalled()
      providerBridgeService.handleAddNetworkRequest("0", true)

      await waitFor(() =>
        expect(spy).toHaveBeenCalledWith(
          "wallet_addEthereumChain",
          [validatedPayload, "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"],
          BASE_DATA.origin,
        ),
      )

      await expect(request).resolves.toEqual(null) // resolves without errors
    })

    it("should skip user confirmation if the network already exists", async () => {
      const params = [
        {
          chainId: "1",
          chainName: "Ethereum Mainnet",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          iconUrl: undefined,
          rpcUrls: ["booyan"],
          blockExplorerUrls: ["https://etherscan.io"],
        },
        "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        "some site",
        "favicon.png",
      ]

      const { enablingPermission } = BASE_DATA

      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
      const showPopupSpy = jest.spyOn(popupUtils, "default")

      const internalEthereumProvider =
        // @ts-expect-error private access to reference the service
        providerBridgeService.internalEthereumProviderService
      jest
        .spyOn(internalEthereumProvider, "getTrackedNetworkByChainId")
        .mockImplementation(() => Promise.resolve(ETHEREUM))
      const internalEthereumProviderSpy = jest.spyOn(
        internalEthereumProvider,
        "routeSafeRPCRequest",
      )
      jest
        // @ts-expect-error private access to reference the service
        .spyOn(providerBridgeService.preferenceService, "getSelectedAccount")
        .mockImplementation(() =>
          Promise.resolve({ address: ADDRESS, network: ETHEREUM }),
        )
      await providerBridgeService.grantPermission(enablingPermission)

      const request = providerBridgeService.routeContentScriptRPCRequest(
        {
          ...enablingPermission,
        },
        "wallet_addEthereumChain",
        params,
        enablingPermission.origin,
      )

      await waitFor(() =>
        expect(internalEthereumProviderSpy).toHaveBeenCalledWith(
          "wallet_addEthereumChain",
          params,
          BASE_DATA.origin,
        ),
      )

      // expect no popup
      expect(showPopupSpy).not.toHaveBeenCalled()
      await expect(request).resolves.toEqual(null) // resolves without errors

      await providerBridgeService.revokePermissionsForOrigin(BASE_DATA.origin)
    })

    it("should report a switch to an unknown chain as unrecognized", async () => {
      const { enablingPermission, origin } = BASE_DATA

      const internalEthereumProvider =
        // @ts-expect-error private access to reference the service
        providerBridgeService.internalEthereumProviderService
      jest
        .spyOn(internalEthereumProvider, "getTrackedNetworkByChainId")
        .mockImplementation(() => Promise.resolve(undefined))

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        "wallet_switchEthereumChain",
        [{ chainId: "0x1a4" }],
        origin,
      )

      expect(response).toEqual(EIP1193_ERROR_CODES.unrecognizedChainId)
    })
  })

  describe.each([
    {
      method: "wallet_switchEthereumChain",
      paramsFor: (chainID: string): unknown[] => [
        { chainId: toHexChainID(chainID) },
      ],
    },
    {
      method: "wallet_addEthereumChain",
      paramsFor: (chainID: string): unknown[] => [
        {
          chainId: toHexChainID(chainID),
          chainName: "Polygon",
          nativeCurrency: { name: "Matic", symbol: "MATIC", decimals: 18 },
          rpcUrls: ["https://polygon-rpc.com"],
          blockExplorerUrls: ["https://polygonscan.com"],
        },
        ADDRESS,
        "Test",
        "https://switch.test/favicon.png",
      ],
    },
  ])("$method to a tracked chain", ({ method, paramsFor }) => {
    const origin = "https://switch.test"
    const enablingPermission: PermissionRequest = {
      ...BASE_DATA.enablingPermission,
      key: `${origin}_${ADDRESS}_${ETHEREUM.chainID}`,
      origin,
      chainID: ETHEREUM.chainID,
    }

    let internalEthereumProvider: InternalEthereumProviderService

    beforeEach(async () => {
      internalEthereumProvider =
        // @ts-expect-error private access to reference the service
        providerBridgeService.internalEthereumProviderService

      jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)
      jest
        // @ts-expect-error private access to reference the service
        .spyOn(providerBridgeService.preferenceService, "getSelectedAccount")
        .mockImplementation(() =>
          Promise.resolve({ address: ADDRESS, network: ETHEREUM }),
        )
      jest
        .spyOn(internalEthereumProvider, "getTrackedNetworkByChainId")
        .mockImplementation((chainID) =>
          Promise.resolve(
            [ETHEREUM, POLYGON].find((network) =>
              sameChainID(network.chainID, chainID),
            ),
          ),
        )

      // The origin is connected on Ethereum only, as if Polygon had been
      // added after the site was connected.
      await providerBridgeService.grantPermission(enablingPermission)
      await internalEthereumProvider.switchToSupportedNetwork(origin, ETHEREUM)
    })

    afterEach(async () => {
      await providerBridgeService.revokePermissionsForOrigin(origin)
    })

    it("should reject a chain the origin has no permission on", async () => {
      const switchSpy = jest.spyOn(
        internalEthereumProvider,
        "switchToSupportedNetwork",
      )
      const showPopupSpy = jest.spyOn(popupUtils, "default")

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        method,
        paramsFor(POLYGON.chainID),
        origin,
      )

      expect(response).toEqual(EIP1193_ERROR_CODES.unauthorized)
      expect(switchSpy).not.toHaveBeenCalled()
      expect(showPopupSpy).not.toHaveBeenCalled()
      expect(
        (
          await internalEthereumProvider.getCurrentOrDefaultNetworkForOrigin(
            origin,
          )
        ).chainID,
      ).toEqual(ETHEREUM.chainID)
      expect(
        await providerBridgeService.checkPermission(origin, POLYGON.chainID),
      ).toBeUndefined()
    })

    it("should switch to a chain the origin has permission on", async () => {
      await providerBridgeService.grantPermission({
        ...enablingPermission,
        key: `${origin}_${ADDRESS}_${POLYGON.chainID}`,
        chainID: POLYGON.chainID,
      })

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        method,
        paramsFor(POLYGON.chainID),
        origin,
      )

      expect(response).toBeNull()
      await waitFor(async () =>
        expect(
          (
            await internalEthereumProvider.getCurrentOrDefaultNetworkForOrigin(
              origin,
            )
          ).chainID,
        ).toEqual(POLYGON.chainID),
      )
    })
  })

  describe("denyOrRevokePermission", () => {
    const origin = "https://revoke.test"
    const ACCOUNT_A = "0x1111111111111111111111111111111111111111"
    const ACCOUNT_B = "0x2222222222222222222222222222222222222222"
    const NETWORKS = [ETHEREUM, POLYGON]

    const permissionFor = (
      accountAddress: string,
      chainID: string,
    ): PermissionRequest => ({
      ...BASE_DATA.enablingPermission,
      key: `${origin}_${accountAddress}_${chainID}`,
      origin,
      accountAddress,
      chainID,
    })

    const storedPermission = (accountAddress: string, chainID: string) =>
      // @ts-expect-error private access to inspect stored rows directly
      providerBridgeService.db.checkPermission(origin, accountAddress, chainID)

    // Mirrors the redux fan-out, which revokes a permission on every
    // supported network.
    const revokeOnAllNetworks = (accountAddress: string) =>
      Promise.all(
        NETWORKS.map((network) =>
          providerBridgeService.denyOrRevokePermission({
            ...permissionFor(accountAddress, network.chainID),
            state: "deny",
          }),
        ),
      )

    let notifySpy: ReturnType<typeof jest.spyOn>
    let unsetNetworkSpy: ReturnType<typeof jest.spyOn>

    beforeEach(async () => {
      jest
        // @ts-expect-error private access to reference the service
        .spyOn(providerBridgeService.preferenceService, "getSelectedAccount")
        .mockImplementation(() =>
          Promise.resolve({ address: ACCOUNT_B, network: ETHEREUM }),
        )
      notifySpy = jest.spyOn(
        providerBridgeService,
        "notifyContentScriptsAboutAddressChange",
      )
      unsetNetworkSpy = jest.spyOn(
        // @ts-expect-error private access to reference the service
        providerBridgeService.internalEthereumProviderService,
        "unsetCurrentNetworkForOrigin",
      )

      await Promise.all(
        [ACCOUNT_A, ACCOUNT_B].flatMap((accountAddress) =>
          NETWORKS.map((network) =>
            providerBridgeService.grantPermission(
              permissionFor(accountAddress, network.chainID),
            ),
          ),
        ),
      )
    })

    afterEach(async () => {
      await providerBridgeService.revokePermissionsForOrigin(origin)
    })

    it("should revoke a non-selected account's permission on every chain", async () => {
      await revokeOnAllNetworks(ACCOUNT_A)

      await Promise.all(
        NETWORKS.map(async (network) => {
          expect(
            await storedPermission(ACCOUNT_A, network.chainID),
          ).toBeUndefined()
          expect(
            await storedPermission(ACCOUNT_B, network.chainID),
          ).toMatchObject({ state: "allow", accountAddress: ACCOUNT_B })
        }),
      )

      // The site only sees the selected account, so nothing it can observe
      // has changed.
      expect(notifySpy).not.toHaveBeenCalled()
      expect(unsetNetworkSpy).not.toHaveBeenCalled()
    })

    it("should revoke the selected account's permission and notify the site", async () => {
      await revokeOnAllNetworks(ACCOUNT_B)

      await Promise.all(
        NETWORKS.map(async (network) => {
          expect(
            await storedPermission(ACCOUNT_B, network.chainID),
          ).toBeUndefined()
          expect(
            await storedPermission(ACCOUNT_A, network.chainID),
          ).toMatchObject({ state: "allow", accountAddress: ACCOUNT_A })
        }),
      )

      expect(notifySpy).toHaveBeenCalled()
      expect(unsetNetworkSpy).toHaveBeenCalledTimes(NETWORKS.length)
    })
  })

  describe("onMessageListener", () => {
    const origin = "https://messages.test"

    const send = async (method: string, params: unknown[] = []) => {
      const postMessage = jest.fn()
      const portEvent = () => ({
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn(() => false),
        hasListeners: jest.fn(() => false),
      })
      const port: Required<browser.Runtime.Port> = {
        name: "test",
        sender: { url: `${origin}/page` },
        error: new Error("unused"),
        postMessage,
        disconnect: jest.fn(),
        onMessage: portEvent(),
        onDisconnect: portEvent(),
      }

      await providerBridgeService.onMessageListener(port, {
        id: "1",
        request: { method, params },
      })
      expect(postMessage).toHaveBeenCalledTimes(1)
      return postMessage.mock.calls[0][0].result
    }

    beforeEach(() => {
      jest
        // @ts-expect-error private access to reference the service
        .spyOn(providerBridgeService.preferenceService, "getSelectedAccount")
        .mockImplementation(() =>
          Promise.resolve({ address: ADDRESS, network: ETHEREUM }),
        )
    })

    afterEach(async () => {
      await providerBridgeService.revokePermissionsForOrigin(origin)
    })

    describe("for a site that isn't connected", () => {
      it.each(["wallet_getCapabilities", "wallet_sendCalls"])(
        "should reject unsupported %s with 4200",
        async (method) => {
          expect(await send(method)).toMatchObject({
            code: EIP1193_ERROR_CODES.unsupportedMethod.code,
          })
        },
      )

      it("should reject supported methods with 4100", async () => {
        expect(
          await send("eth_sendTransaction", PARAMS.eth_sendTransaction),
        ).toMatchObject({ code: EIP1193_ERROR_CODES.unauthorized.code })
      })
    })

    describe("for a connected site", () => {
      beforeEach(async () => {
        await providerBridgeService.grantPermission({
          ...BASE_DATA.enablingPermission,
          key: `${origin}_${ADDRESS}_${ETHEREUM.chainID}`,
          origin,
          chainID: ETHEREUM.chainID,
        })
      })

      it("should reject unsupported methods with 4200", async () => {
        expect(await send("wallet_getCapabilities")).toMatchObject({
          code: EIP1193_ERROR_CODES.unsupportedMethod.code,
        })
      })

      it.each([
        "eth_requestAccounts",
        "wallet_requestPermissions",
        "wallet_getPermissions",
      ])("should handle provider bridge method %s", async (method) => {
        expect(await send(method, ["Test", "favicon.png"])).toEqual(
          expect.arrayContaining([expect.anything()]),
        )
      })

      it("should handle wallet_revokePermissions", async () => {
        expect(await send("wallet_revokePermissions")).toBeNull()
        expect(
          await providerBridgeService.checkPermission(origin, ETHEREUM.chainID),
        ).toBeUndefined()
      })
    })
  })
})

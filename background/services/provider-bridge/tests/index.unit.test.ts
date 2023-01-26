import {
  EIP1193_ERROR_CODES,
  PermissionRequest,
} from "@tallyho/provider-bridge-shared"
import sinon from "sinon"
import browser from "webextension-polyfill"
import { createProviderBridgeService } from "../../../tests/factories"
import ProviderBridgeService from "../index"

const WINDOW = {
  focused: true,
  incognito: false,
  alwaysOnTop: true,
}

const chainID = "1"
const accountAddress = "0x0000000000000000000000000000000000000000"

const BASE_DATA = {
  enablingPermission: {
    key: `https://app.test_${"0x0000000000000000000000000000000000000000"}_${chainID}`,
    origin: "https://app.test",
    faviconUrl: "https://app.test/favicon.png",
    title: "Test",
    state: "allow",
    accountAddress,
    chainID,
  } as PermissionRequest,
  origin: "https://app.test",
}

const PARAMS = {
  eth_accounts: ["Test", "https://app.test/favicon.png"],
  eth_sendTransaction: [
    {
      from: accountAddress,
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
        origin
      )
      expect(response).toEqual([enablingPermission.accountAddress])
    })

    it("eth_sendTransaction should call routeSafeRequest when user has permission to sign", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_sendTransaction"
      const params = PARAMS[method]
      const stub = sandbox.stub(providerBridgeService, "routeSafeRequest")

      await providerBridgeService.routeContentScriptRPCRequest(
        enablingPermission,
        method,
        params,
        origin
      )

      expect(stub.called).toBe(true)
    })

    it("eth_sendTransaction should not call routeSafeRequest when user has not permission to sign", async () => {
      const { enablingPermission, origin } = BASE_DATA
      const method = "eth_sendTransaction"
      const params = PARAMS[method]
      const stub = sandbox.stub(providerBridgeService, "routeSafeRequest")

      const response = await providerBridgeService.routeContentScriptRPCRequest(
        { ...enablingPermission, state: "deny" },
        method,
        params,
        origin
      )

      expect(stub.called).toBe(false)
      expect(response).toBe(EIP1193_ERROR_CODES.unauthorized)
    })
  })
})

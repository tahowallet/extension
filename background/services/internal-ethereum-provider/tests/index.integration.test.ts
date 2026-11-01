import sinon from "sinon"
import { EIP1193_ERROR_CODES } from "@tallyho/provider-bridge-shared"
import InternalEthereumProviderService from ".."
import * as featureFlags from "../../../features"
import { waitFor } from "@testing-library/dom"
import { EVMNetwork, toHexChainID } from "../../../networks"
import {
  createChainService,
  createInternalEthereumProviderService,
} from "../../../tests/factories"
import { validateAddEthereumChainParameter } from "../../provider-bridge/utils"
import { ETHEREUM, POLYGON } from "../../../constants"
import { SignTypedDataRequest } from "../../../utils/signing"
import type { EIP712TypedData } from "../../../types"

const TEST_ADDRESS = "0x208e94d5661a73360d9387d3ca169e5c130090cd"

describe("Internal Ethereum Provider Service", () => {
  const sandbox = sinon.createSandbox()
  let IEPService: InternalEthereumProviderService

  beforeEach(async () => {
    sandbox.restore()
    IEPService = await createInternalEthereumProviderService()
    await IEPService.startService()
  })

  afterEach(async () => {
    await IEPService.stopService()
  })

  it("should correctly persist chains sent in via wallet_addEthereumChain", async () => {
    const chainService = createChainService()

    jest.spyOn(featureFlags, "isEnabled").mockImplementation(() => true)

    IEPService = await createInternalEthereumProviderService({ chainService })
    const startedChainService = await chainService
    await startedChainService.startService()
    await IEPService.startService()
    const method = "wallet_addEthereumChain"
    const origin = "https://chainlist.org"

    const EIP3085Params = [
      validateAddEthereumChainParameter({
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
      }),
      "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    ]

    await IEPService.routeSafeRPCRequest(method, EIP3085Params, origin)

    expect(
      startedChainService
        .getSupportedNetworks()
        .find((network: EVMNetwork) => network.name === "Fantom Opera"),
    ).toBeTruthy()
  })

  it("should persist a wallet_switchEthereumChain before resolving it", async () => {
    const origin = "https://switch.test"

    jest
      .spyOn(IEPService, "getTrackedNetworkByChainId")
      .mockImplementation(() => Promise.resolve(POLYGON))
    // Listeners can take a while; the switch shouldn't wait on them.
    const switchedListener = jest.fn(() => new Promise<void>(() => {}))
    IEPService.emitter.on("networkSwitchedForOrigin", switchedListener)

    const switchResult = await IEPService.routeSafeRPCRequest(
      "wallet_switchEthereumChain",
      [{ chainId: toHexChainID(POLYGON.chainID) }],
      origin,
    )
    expect(switchResult).toBeNull()

    const chainId = await IEPService.routeSafeRPCRequest(
      "eth_chainId",
      [],
      origin,
    )
    expect(chainId).toEqual(toHexChainID(POLYGON.chainID))

    await waitFor(() =>
      expect(switchedListener).toHaveBeenCalledWith({
        origin,
        network: POLYGON,
      }),
    )
  })

  it.each([
    "wallet_getCapabilities",
    "eth_decrypt",
    "wallet_requestPermissions",
  ])("should reject unsupported method %s with 4200", async (method) => {
    const error: unknown = await IEPService.routeSafeRPCRequest(
      method,
      [],
      "https://unsupported.test",
    ).then(
      () => undefined,
      (rejection: unknown) => rejection,
    )

    expect(error).toMatchObject({
      eip1193Error: EIP1193_ERROR_CODES.unsupportedMethod,
    })
  })

  it("should reject a wallet_switchEthereumChain to an unknown chain with 4902", async () => {
    jest
      .spyOn(IEPService, "getTrackedNetworkByChainId")
      .mockImplementation(() => Promise.resolve(undefined))

    const error: unknown = await IEPService.routeSafeRPCRequest(
      "wallet_switchEthereumChain",
      [{ chainId: "0x1a4" }],
      "https://switch.test",
    ).then(
      () => undefined,
      (rejection: unknown) => rejection,
    )

    expect(error).toMatchObject({
      eip1193Error: EIP1193_ERROR_CODES.unrecognizedChainId,
    })
    expect(EIP1193_ERROR_CODES.unrecognizedChainId.code).toEqual(4902)
  })

  it.each(["", "_v1", "_v3", "_v4"])(
    "should filter out fields not specified in 'types' of eth_signTypedData",
    async (version) => {
      const method = `eth_signTypedData${version}`
      const origin = ""

      const types = {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Request: [{ name: "text", type: "string" }],
      }

      const primaryType = "Request"

      const domain = {
        name: "EIP-712 Test",
        version: "1",
        chainId: "1",
        verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
      }

      const EIP712Object: EIP712TypedData = {
        types,
        domain,
        primaryType,
        message: {
          "": "This should be removed",
          "text ": "This should be removed",
          " text": "This should be removed",
          text: "This is correct",
        },
      }

      const EIP712ObjectFiltered: SignTypedDataRequest = {
        account: {
          address: TEST_ADDRESS,
          network: ETHEREUM,
        },
        typedData: {
          types,
          domain,
          primaryType,
          message: { text: "This is correct" },
        },
      }

      const EIP712Params = [TEST_ADDRESS, JSON.stringify(EIP712Object)]

      jest.spyOn(IEPService.emitter, "emit")

      IEPService.emitter.on("signTypedDataRequest", ({ resolver }) => {
        resolver("") // We have to manually resolve promise here
      })

      await IEPService.routeSafeRPCRequest(method, EIP712Params, origin)

      expect(IEPService.emitter.emit).toHaveBeenCalledWith(
        "signTypedDataRequest",
        expect.objectContaining({
          payload: EIP712ObjectFiltered,
        }),
      )
    },
  )
})

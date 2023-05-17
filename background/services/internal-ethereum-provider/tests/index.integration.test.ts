import sinon from "sinon"
import InternalEthereumProviderService from ".."
import * as featureFlags from "../../../features"
import { EVMNetwork } from "../../../networks"
import {
  createChainService,
  createInternalEthereumProviderService,
} from "../../../tests/factories"
import { validateAddEthereumChainParameter } from "../../provider-bridge/utils"
import { ETHEREUM } from "../../../constants"
import { SignTypedDataRequest } from "../../../utils/signing"
import { EIP712TypedData } from "../../../types"

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
    const METHOD = "wallet_addEthereumChain"
    const ORIGIN = "https://chainlist.org"

    const EIP3085_PARAMS = [
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

    await IEPService.routeSafeRPCRequest(METHOD, EIP3085_PARAMS, ORIGIN)

    expect(
      startedChainService.supportedNetworks.find(
        (network: EVMNetwork) => network.name === "Fantom Opera"
      )
    ).toBeTruthy()
  })

  it("should filter out fields not specified in 'types' of eth_signTypedData_v4", async () => {
    const METHOD = "eth_signTypedData_v4"
    const ORIGIN = ""

    const types = {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      Request: [{ name: "message", type: "string" }],
    }

    const primaryType = "Request"

    const domain = {
      name: "EIP-712 Test",
      version: "1",
      chainId: "1",
      verifyingContract: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    }

    const EIP712_OBJECT: EIP712TypedData = {
      types,
      domain,
      primaryType,
      message: {
        "": "This should be removed",
        "message ": "This should be removed",
        " message": "This should be removed",
        message: "This is correct",
      },
    }

    const EIP712_OBJECT_FILTERED: SignTypedDataRequest = {
      account: {
        address: TEST_ADDRESS,
        network: ETHEREUM,
      },
      typedData: {
        types,
        domain,
        primaryType,
        message: { message: "This is correct" },
      },
    }

    const EIP712_PARAMS = [TEST_ADDRESS, JSON.stringify(EIP712_OBJECT)]

    jest.spyOn(IEPService.emitter, "emit")

    IEPService.emitter.on("signTypedDataRequest", ({ resolver }) => {
      resolver("") // We have to manually resolve promise here
    })

    await IEPService.routeSafeRPCRequest(METHOD, EIP712_PARAMS, ORIGIN)

    expect(IEPService.emitter.emit).toHaveBeenCalledWith(
      "signTypedDataRequest",
      expect.objectContaining({
        payload: EIP712_OBJECT_FILTERED,
      })
    )
  })
})

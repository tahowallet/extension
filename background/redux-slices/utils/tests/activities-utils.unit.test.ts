import { utils } from "ethers"
import { ETHEREUM } from "../../../constants"
import {
  createAnyEVMTransaction,
  createSmartContractAsset,
} from "../../../tests/factories"
import type {
  AssetTransfer,
  EnrichedAddressOnNetwork,
  EnrichedEVMTransaction,
} from "../../../services/enrichment"
import { encodeExecTransaction } from "../../../services/enrichment/safe"
import { getActivityDetails } from "../activities-utils"

const EXECUTOR = "0x2222222222222222222222222222222222222222"
const SAFE = utils.getAddress("0x1111111111111111111111111111111111111111")
const RECIPIENT = "0x4444444444444444444444444444444444444444"
const ZERO = "0x0000000000000000000000000000000000000000"

const enrichedAddress = (address: string): EnrichedAddressOnNetwork => ({
  address,
  network: ETHEREUM,
  annotation: {
    timestamp: 0,
    hasCode: false,
    balance: {
      address,
      network: ETHEREUM,
      assetAmount: { asset: ETHEREUM.baseAsset, amount: 0n },
      dataSource: "local",
      retrievedAt: 0,
    },
  },
})

const safeOutflow: AssetTransfer = {
  type: "asset-transfer",
  timestamp: 0,
  blockTimestamp: undefined,
  sender: enrichedAddress(SAFE),
  recipient: enrichedAddress(RECIPIENT),
  assetAmount: {
    asset: createSmartContractAsset({ symbol: "MYST" }),
    amount: 1n,
    decimalAmount: 250,
    localizedDecimalAmount: "250",
  },
}

const transaction = (input: string): EnrichedEVMTransaction => ({
  ...createAnyEVMTransaction({
    network: ETHEREUM,
    from: EXECUTOR,
    to: SAFE,
    input,
  }),
  annotation: {
    type: "contract-interaction",
    timestamp: 0,
    blockTimestamp: undefined,
    contractInfo: enrichedAddress(SAFE),
    subannotations: [safeOutflow],
  },
})

const execTransaction = encodeExecTransaction(
  {
    to: RECIPIENT,
    value: 0n,
    data: "0x",
    operation: 0,
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: ZERO,
    refundReceiver: ZERO,
  },
  "0x",
)

describe("getActivityDetails", () => {
  it("lists a Safe's transfers when the transaction executes one", () => {
    expect(getActivityDetails(transaction(execTransaction))).toContainEqual({
      assetIconUrl: expect.any(String),
      assetSymbol: "MYST",
      label: "Safe · MYST",
      value: "-250",
    })
  })

  it("doesn't list other addresses' transfers otherwise", () => {
    expect(
      getActivityDetails(transaction("0xa9059cbb")).map(({ label }) => label),
    ).not.toContain("Safe · MYST")
  })
})

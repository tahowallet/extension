import { BigNumber, ethers } from "ethers"
import { EventFragment, Fragment, FunctionFragment } from "ethers/lib/utils"
import { EVMLog } from "../networks"
import { HexString } from "../types"
import { ERC20_FUNCTIONS } from "./erc20"

// This seems to be the general ABI for wrapped assets.  There is no standard or EIP - but it seems to be
// what is in use in the wild, for example:
// WETH: https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2#code
// WMATIC: https://polygonscan.com/address/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270#code
export const WRAPPED_ASSET_FUNCTIONS = {
  ...ERC20_FUNCTIONS,
  deposit: FunctionFragment.from("deposit() public payable"),
  withdraw: FunctionFragment.from("withdraw(uint amount) public"),
}

const WRAPPED_ASSET_EVENTS = {
  Deposit: EventFragment.from("Deposit(address indexed dst, uint amount)"),
  Withdrawal: EventFragment.from(
    "Withdrawal(address indexed src, uint amount)"
  ),
}

export const WRAPPED_ASSET_ABI = Object.values<Fragment>(
  WRAPPED_ASSET_FUNCTIONS
).concat(Object.values(WRAPPED_ASSET_EVENTS))

export const WRAPPED_ASSET_INTERFACE = new ethers.utils.Interface(
  WRAPPED_ASSET_ABI
)

export type WrappedAssetDepositLog = {
  contractAddress: string
  amount: bigint
  senderAddress: HexString
  recipientAddress: HexString
}

/**
 * Parses the given list of EVM logs, returning information on any contained
 * Wrapped Deposits.
 *
 * Note that the returned data should only be considered valid if the logs are
 * from a known asset address; this function does not check the asset address,
 * it only tries to blindly parse each log as if it were an ERC20 Deposit
 * event.
 *
 * @param logs An arbitrary list of EVMLogs, some of which may represent ERC20
 *        `Deposit` events.
 * @return Information on any logs that were parsable as `Deposit` or `Withdrawal`
 *         events. This does _not_ mean they are guaranteed to be Wrapped
 *         `Deposit` or `Withdrawal` events, simply that they can be parsed as such.
 */
export function parseLogsForWrappedDepositsAndWithdrawals(
  logs: EVMLog[]
): WrappedAssetDepositLog[] {
  return logs
    .map(({ contractAddress, data, topics }) => {
      try {
        const decodedDeposit = WRAPPED_ASSET_INTERFACE.decodeEventLog(
          WRAPPED_ASSET_EVENTS.Deposit,
          data,
          topics
        )

        if (
          typeof decodedDeposit.wad !== "undefined" &&
          typeof decodedDeposit.dst !== "undefined"
        ) {
          return {
            contractAddress,
            amount: (decodedDeposit.wad as BigNumber).toBigInt(),
            recipientAddress: decodedDeposit.dst,
            senderAddress: contractAddress,
          }
        }
      } catch (e) {
        // swallow the error if we can't decode a Deposit - try to decode Withdrawal
      }
      try {
        const decodedWithdrawal = WRAPPED_ASSET_INTERFACE.decodeEventLog(
          WRAPPED_ASSET_EVENTS.Withdrawal,
          data,
          topics
        )

        if (
          typeof decodedWithdrawal.wad !== "undefined" &&
          typeof decodedWithdrawal.src !== "undefined"
        ) {
          return {
            contractAddress,
            amount: (decodedWithdrawal.wad as BigNumber).toBigInt(),
            recipientAddress: contractAddress,
            senderAddress: decodedWithdrawal.src,
          }
        }
      } catch (_) {
        return undefined
      }
      return undefined
    })
    .filter(
      (info): info is WrappedAssetDepositLog => typeof info !== "undefined"
    )
}

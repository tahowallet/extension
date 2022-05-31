import { BigNumber, ethers } from "ethers"
import { EventFragment, Fragment, FunctionFragment } from "ethers/lib/utils"
import { EVMLog } from "../networks"
import { HexString } from "../types"

export const WRAPPED_ASSET_FUNCTIONS = {
  allowance: FunctionFragment.from(
    "allowance(address owner, address spender) view returns (uint256)"
  ),
  approve: FunctionFragment.from(
    "approve(address guy, uint256 wad) returns (bool)"
  ),
  balanceOf: FunctionFragment.from(
    "balanceOf(address owner) view returns (uint256)"
  ),
  decimals: FunctionFragment.from("decimals() view returns (uint8)"),
  name: FunctionFragment.from("name() view returns (string)"),
  symbol: FunctionFragment.from("symbol() view returns (string)"),
  totalSupply: FunctionFragment.from("totalSupply() view returns (uint256)"),
  transfer: FunctionFragment.from(
    "transfer(address to, uint wad) returns (bool)"
  ),
  transferFrom: FunctionFragment.from(
    "transferFrom(address src, address dst, uint wad) returns (bool)"
  ),
}

const WRAPPED_ASSET_EVENTS = {
  // What the heck does `wad` stand for?
  Deposit: EventFragment.from("Deposit(address indexed dst, uint wad)"),
  Withdrawal: EventFragment.from("Withdrawal(address indexed src, uint wad)"),
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
            // This makes sense... right?  e.g. you send the WETH contract ETH and it gives you MATIC.  Other option here is to have recipientAddress and senderAddress be equivalent.
            senderAddress: contractAddress,
          }
        }

        const decodedWithdrawal = WRAPPED_ASSET_INTERFACE.decodeEventLog(
          WRAPPED_ASSET_EVENTS.Deposit,
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
        return undefined
      } catch (_) {
        return undefined
      }
    })
    .filter(
      (info): info is WrappedAssetDepositLog => typeof info !== "undefined"
    )
}

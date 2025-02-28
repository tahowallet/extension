import { Interface } from "ethers/lib/utils"
import { AnyEVMTransaction, sameNetwork } from "../networks"
import { MEZO_TESTNET } from "../constants"
import { sameEVMAddress } from "./utils"

const BORROWER_CONTRACT_ADDRESS = "0x20fAeA18B6a1D0FCDBCcFfFe3d164314744baF30"

const BorrowerABI = new Interface([
  "function openTrove(uint256 _maxFeePercentage, uint256 debtAmount, uint256 _assetAmount, address _upperHint, address _lowerHint)",
])

// eslint-disable-next-line import/prefer-default-export
export const checkIsBorrowingTx = (tx: AnyEVMTransaction) => {
  if (
    !sameNetwork(tx.network, MEZO_TESTNET) ||
    !tx.blockHash ||
    !sameEVMAddress(tx.to, BORROWER_CONTRACT_ADDRESS)
  ) {
    return false
  }

  try {
    const data = BorrowerABI.decodeFunctionData("openTrove", tx.input ?? "")
    return data.debtAmount > 0n
  } catch (error) {
    return false
  }
}

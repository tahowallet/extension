import { Interface } from "ethers/lib/utils"
import { ConfirmedEVMTransaction, sameNetwork } from "../networks"
import { MEZO_TESTNET } from "../constants"
import { sameEVMAddress } from "./utils"
import MATSNET_NFT_CAMPAIGN from "../services/campaign/matsnet-nft"

const BORROWER_CONTRACT_ADDRESS = "0x20fAeA18B6a1D0FCDBCcFfFe3d164314744baF30"

const BorrowerABI = new Interface([
  "function openTrove(uint256 _maxFeePercentage, uint256 debtAmount, uint256 _assetAmount, address _upperHint, address _lowerHint)",
])

const NFTContractAbi = new Interface([
  "function mint(string calldata installId, bytes calldata signature)",
])

// eslint-disable-next-line import/prefer-default-export
export const checkIsBorrowingTx = (tx: ConfirmedEVMTransaction) => {
  if (
    !sameNetwork(tx.network, MEZO_TESTNET) ||
    !tx.blockHash ||
    !sameEVMAddress(tx.to, BORROWER_CONTRACT_ADDRESS) ||
    tx.status === 0
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

export const checkIsMintTx = (tx: ConfirmedEVMTransaction) => {
  if (
    !sameNetwork(tx.network, MEZO_TESTNET) ||
    !tx.blockHash ||
    !sameEVMAddress(tx.to, MATSNET_NFT_CAMPAIGN.nftContract) ||
    tx.status === 0
  ) {
    return false
  }

  try {
    const data = NFTContractAbi.decodeFunctionData("mint", tx.input ?? "")
    return !!data.installId
  } catch (error) {
    return false
  }
}

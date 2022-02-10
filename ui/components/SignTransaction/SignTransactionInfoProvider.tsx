import { parseERC20Tx } from "@tallyho/tally-background/lib/erc20"
import { selectTransactionData } from "@tallyho/tally-background/redux-slices/transaction-construction"
import { TransactionDescription } from "ethers/lib/utils"
import React, { ReactElement } from "react"
import { useBackgroundSelector } from "../../hooks"
import { SignTransactionInfo } from "./SignTransactionInfoBaseProvider"
import SignTransactionSignInfoProvider from "./SignTransactionSignInfoProvider"
import SignTransactionSpendAssetInfoProvider from "./SignTransactionSpendAssetInfoProvider"
import SignTransactionSwapAssetInfoProvider from "./SignTransactionSwapAssetInfoProvider"
import SignTransactionTransferInfoProvider from "./SignTransactionTransferInfoProvider"

export interface SignLocationState {
  assetSymbol: string
  amount: number
  signType: SignType
  to: string
  value: string | number
}

export enum SignType {
  Sign = "sign",
  SignSwap = "sign-swap",
  SignSpend = "sign-spend",
  SignTransfer = "sign-transfer",
}

export function getSignType(
  parsedTx: TransactionDescription | undefined
): SignType {
  if (parsedTx?.name === "approve") {
    return SignType.SignSpend
  }
  return SignType.Sign
}

/**
 * Creates transaction type-specific UI blocks and provides them to children.
 */
export default function SignTransactionInfoProvider({
  children,
  location,
}: {
  children: (info: SignTransactionInfo) => ReactElement
  location: { state?: SignLocationState }
}): ReactElement {
  const transactionDetails = useBackgroundSelector(selectTransactionData)

  const parsedTx = parseERC20Tx(transactionDetails?.input ?? "")

  const { assetSymbol, amount, to, value, signType } = location?.state ?? {
    signType: getSignType(parsedTx),
  }

  if (!transactionDetails) return <></>

  switch (signType) {
    case SignType.SignSwap:
      return (
        <SignTransactionSwapAssetInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          parsedTx={parsedTx}
        />
      )
    case SignType.SignSpend:
      return (
        <SignTransactionSpendAssetInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          parsedTx={parsedTx}
        />
      )
    case SignType.SignTransfer:
      if (
        assetSymbol === undefined ||
        amount === undefined ||
        to === undefined ||
        value === undefined
      ) {
        return <></>
      }

      return (
        <SignTransactionTransferInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          parsedTx={parsedTx}
          token={assetSymbol}
          amount={amount}
          destination={to}
          localizedValue={value}
        />
      )
    case SignType.Sign:
      return (
        <SignTransactionSignInfoProvider
          inner={children}
          transactionDetails={transactionDetails}
          parsedTx={parsedTx}
        />
      )
    default:
      return <></>
  }
}

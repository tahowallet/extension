import React, { ReactElement } from "react"

import {
  selectDefaultWallet,
  setNewDefaultWalletValue,
} from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedIcon from "../Shared/SharedIcon"
import SharedToggleButton from "../Shared/SharedToggleButton"

export default function DAppConnectionDefaultToggle(): ReactElement {
  const dispatch = useBackgroundDispatch()

  const isDefaultWallet = useBackgroundSelector(selectDefaultWallet)
  const toggleDefaultWallet = (defaultWalletValue: boolean) => {
    dispatch(setNewDefaultWalletValue(defaultWalletValue))
  }

  const hasDetectedOtherWallets = true

  return (
    <>
      {hasDetectedOtherWallets && (
        <p className="default_wallet">
          Connect to website using:
          <SharedIcon
            width={20}
            icon="taho-connect-icon.svg"
            ariaLabel="Taho"
            color={isDefaultWallet ? "var(--success)" : "var(--green-20)"}
            onClick={() => toggleDefaultWallet(true)}
          />
          <SharedToggleButton
            onChange={(toggleValue) => toggleDefaultWallet(toggleValue)}
            onColor="var(--success)"
            offColor="var(--white)"
            value={isDefaultWallet}
            leftToRight={false}
          />
          <SharedIcon
            width={24}
            icon="other-wallet-connect-icon.svg"
            ariaLabel="Other Wallet"
            color={isDefaultWallet ? "var(--green-20)" : "var(--white)"}
            onClick={() => toggleDefaultWallet(false)}
          />
        </p>
      )}
      <style jsx>{`
        .default_wallet {
          margin: 0;

          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;

          font-weight: 500;
          color: var(--green-20);
        }
      `}</style>
    </>
  )
}

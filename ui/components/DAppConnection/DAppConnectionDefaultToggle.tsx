import React, { ReactElement } from "react"

import {
  selectDefaultWallet,
  setNewDefaultWalletValue,
} from "@tallyho/tally-background/redux-slices/ui"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedIcon from "../Shared/SharedIcon"
import SharedToggleButton from "../Shared/SharedToggleButton"

type Props = {
  /**
   * Renders as a button instead of a toggle. In this mode, always set the
   * specified value (true means always setting Taho as default, false means
   * always setting Taho as non-default), even if that value is already set.
   */
  alwaysForceSelection?: "taho" | "other"
}

export default function DAppConnectionDefaultToggle({
  alwaysForceSelection,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "topMenu" })

  const dispatch = useBackgroundDispatch()

  const isDefaultWallet = useBackgroundSelector(selectDefaultWallet)
  const setDefaultWallet = (defaultWalletValue: boolean) => {
    // If renderAsButtonForValue is set, interactions will always set
    // that value for defaultWallet.
    const finalValue =
      alwaysForceSelection === undefined
        ? defaultWalletValue
        : alwaysForceSelection === "taho"

    dispatch(setNewDefaultWalletValue(finalValue))
  }

  // If renderAsButtonForValue is set, we will always display that value for
  // defaultWallet.
  const defaultIsSelected =
    alwaysForceSelection === undefined
      ? isDefaultWallet
      : alwaysForceSelection === "taho"

  // TODO Read this from background information.
  const hasDetectedOtherWallets = true

  return (
    <>
      {hasDetectedOtherWallets && (
        <p className="default_wallet">
          {alwaysForceSelection === undefined ? t("connectToWebsiteUsing") : ""}
          <SharedIcon
            width={20}
            icon="taho-connect-icon.svg"
            ariaLabel={t("setTahoAsDefault")}
            color={defaultIsSelected ? "var(--success)" : "var(--green-20)"}
            onClick={() => setDefaultWallet(true)}
          />
          <SharedToggleButton
            onChange={(toggleValue) => setDefaultWallet(toggleValue)}
            onColor="var(--success)"
            offColor="var(--white)"
            value={defaultIsSelected}
            leftToRight={false}
          />
          <SharedIcon
            width={24}
            icon="other-wallet-connect-icon.svg"
            ariaLabel={t("setOtherAsDefault")}
            color={defaultIsSelected ? "var(--green-20)" : "var(--white)"}
            onClick={() => setDefaultWallet(false)}
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

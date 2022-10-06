import { removeAccount } from "@tallyho/tally-background/redux-slices/accounts"
import {
  AccountTotal,
  selectAccountSignersByAddress,
  selectKeyringByAddress,
} from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useDispatch } from "react-redux"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { useHistory } from "react-router-dom"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useTranslation } from "react-i18next"
import SharedButton from "../Shared/SharedButton"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import { useAreKeyringsUnlocked, useBackgroundSelector } from "../../hooks"
import AccountItemActionHeader from "./AccountItemActionHeader"
import { posthogEvent } from "../../../background/lib/posthog"

interface AccountItemRemovalConfirmProps {
  account: AccountTotal
  close: () => void
}

const RegularWarning = () => {
  const { t } = useTranslation()
  return <span>{t("accounts.accountItem.regularWarning")}</span>
}

const LoudWarning = () => {
  const { t } = useTranslation()
  return (
    <span>
      <h3>{t("accounts.accountItem.loudWarningTitle")}</h3>
      {t("accounts.accountItem.loudWarningBody")}
    </span>
  )
}

export default function AccountItemRemovalConfirm({
  account,
  close,
}: AccountItemRemovalConfirmProps): ReactElement {
  const { address, network } = account

  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem",
  })
  const dispatch = useDispatch()
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const history = useHistory()
  const keyring = useBackgroundSelector(selectKeyringByAddress(address))
  const { selectedAddress, accountsData } = useBackgroundSelector((state) => ({
    selectedAddress: state.ui.selectedAccount.address,
    accountsData: state.account.accountsData,
  }))
  const accountSigners = useBackgroundSelector(selectAccountSignersByAddress)
  const readOnlyAccount = typeof keyring === "undefined"
  const lastAddressInKeyring = keyring?.addresses.length === 1
  const showLoudWarning = readOnlyAccount || lastAddressInKeyring
  return (
    <div className="remove_address_option">
      <div className="header">
        <AccountItemActionHeader
          label={t("removeAddress")}
          icon="garbage@2x.png"
          color="var(--error)"
        />
      </div>
      <ul>
        <li className="account_container">
          <li className="standard_width">
            <SharedAccountItemSummary
              accountTotal={account}
              isSelected={false}
            />
          </li>
        </li>
      </ul>
      <div className="remove_address_details">
        {showLoudWarning ? <LoudWarning /> : <RegularWarning />}
      </div>
      <div className="button_container">
        <SharedButton
          type="secondary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
        >
          {t("cancel")}
        </SharedButton>
        <SharedButton
          type="primary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            // don't prompt for unlock if removing read-only account.
            if (readOnlyAccount || areKeyringsUnlocked) {
              posthogEvent("Wallet Removed")
              dispatch(
                removeAccount({
                  addressOnNetwork: { address, network },
                  signerType: accountSigners[address]?.type,
                })
              )
              if (sameEVMAddress(selectedAddress, address)) {
                const newAddress = Object.keys(
                  accountsData.evm[network.chainID]
                ).find((accountAddress) => accountAddress !== address)
                if (newAddress) {
                  dispatch(
                    setNewSelectedAccount({
                      address: newAddress,
                      network,
                    })
                  )
                }
              }
              close()
            } else {
              history.push("/keyring/unlock")
            }
          }}
        >
          {t("removeConfirm")}
        </SharedButton>
      </div>
      <style jsx>{`
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          height: 52px;
        }
        .header {
          height: 24px;
        }
        .remove_address_option {
          margin-left: 20px;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 95%;
        }
        .remove_address_details {
          display: flex;
          flex-direction: column;
          line-height: 24px;
          font-size 16px;
        }
        .button_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .account_container {
          margin-top: -10px;
          background-color: var(--hunter-green);
          padding: 5px;
          border-radius: 16px;
        }
      `}</style>
    </div>
  )
}

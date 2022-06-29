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
import SharedButton from "../Shared/SharedButton"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import { useAreKeyringsUnlocked, useBackgroundSelector } from "../../hooks"
import AccountItemActionHeader from "./AccountItemActionHeader"

interface AccountItemRemovalConfirmProps {
  account: AccountTotal
  close: () => void
}

const RegularWarning = (
  <span>
    Removing this address doesn&apos;t delete your recovery phrase or any
    private keys. Instead it just hides it from the extension and you won&apos;t
    be able to use it until you add it back.
  </span>
)

const LoudWarning = (
  <span>
    <h3>
      Removing this address will remove its associated account from the UI.
    </h3>{" "}
    Are you sure you want to proceed?
  </span>
)

export default function AccountItemRemovalConfirm({
  account,
  close,
}: AccountItemRemovalConfirmProps): ReactElement {
  const { address, network } = account

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
          label="Remove address"
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
        {showLoudWarning ? LoudWarning : RegularWarning}
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
          Cancel
        </SharedButton>
        <SharedButton
          type="primary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            // don't prompt for unlock if removing read-only account.
            if (readOnlyAccount || areKeyringsUnlocked) {
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
          Yes, I want to remove it
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

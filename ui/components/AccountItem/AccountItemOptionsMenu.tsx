import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useBackgroundDispatch } from "../../hooks"
import SharedDropdown from "../Shared/SharedDropDown"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import AccountItemEditName from "./AccountItemEditName"
import AccountItemRemovalConfirm from "./AccountItemRemovalConfirm"
import ShowPrivateKey from "../AccountsBackup/ShowPrivateKey"

type AccountItemOptionsMenuProps = {
  accountTotal: AccountTotal
  accountType: AccountType
}

export default function AccountItemOptionsMenu({
  accountTotal,
  accountType,
}: AccountItemOptionsMenuProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem",
  })
  const dispatch = useBackgroundDispatch()
  const { address, network } = accountTotal
  const [showAddressRemoveConfirm, setShowAddressRemoveConfirm] =
    useState(false)
  const [showPrivateKeyMenu, setShowPrivateKeyMenu] = useState(false)
  const [showEditName, setShowEditName] = useState(false)

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(address)
    dispatch(setSnackbarMessage("Address copied to clipboard"))
  }, [address, dispatch])

  const getCustomOptions = useCallback(() => {
    switch (accountType) {
      case AccountType.PrivateKey:
        return isEnabled(FeatureFlags.SUPPORT_PRIV_KEYS)
          ? [
              {
                key: "key",
                icon: "icons/s/key.svg",
                label: t("showPrivateKey.header"),
                onClick: () => {
                  setShowPrivateKeyMenu(true)
                },
              },
            ]
          : []
      default:
        return []
    }
  }, [accountType, t])

  return (
    <div className="options_menu_wrap">
      <SharedSlideUpMenu
        size="custom"
        customSize="304px"
        isOpen={showEditName}
        close={(e) => {
          e?.stopPropagation()
          setShowEditName(false)
        }}
      >
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "default" }}
        >
          <AccountItemEditName
            addressOnNetwork={{ address, network }}
            account={accountTotal}
            close={() => setShowEditName(false)}
          />
        </div>
      </SharedSlideUpMenu>
      <SharedSlideUpMenu
        size="custom"
        customSize="336px"
        isOpen={showAddressRemoveConfirm}
        close={(e) => {
          e?.stopPropagation()
          setShowAddressRemoveConfirm(false)
        }}
      >
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "default" }}
        >
          <AccountItemRemovalConfirm
            account={accountTotal}
            close={() => setShowAddressRemoveConfirm(false)}
          />
        </div>
      </SharedSlideUpMenu>
      <SharedSlideUpMenu
        isOpen={showPrivateKeyMenu}
        size="custom"
        customSize="580px"
        close={(e) => {
          e?.stopPropagation()
          setShowPrivateKeyMenu(false)
        }}
      >
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "default" }}
        >
          <ShowPrivateKey account={accountTotal} />
        </div>
      </SharedSlideUpMenu>
      <SharedDropdown
        toggler={(toggle) => (
          <button
            type="button"
            className="icon_settings"
            role="menu"
            onClick={() => toggle()}
            tabIndex={0}
          />
        )}
        options={[
          {
            key: "edit",
            icon: "icons/s/edit.svg",
            label: t("editName"),
            onClick: () => {
              setShowEditName(true)
            },
          },
          {
            key: "copy",
            icon: "icons/s/copy.svg",
            label: t("copyAddress"),
            onClick: () => {
              copyAddress()
            },
          },
          ...getCustomOptions(),
          {
            key: "remove",
            icon: "garbage@2x.png",
            label: t("removeAddress"),
            onClick: () => {
              setShowAddressRemoveConfirm(true)
            },
            color: "var(--error)",
            hoverColor: "var(--error-80)",
          },
        ]}
      />

      <style jsx>
        {`
          .icon_settings {
            mask-image: url("./images/more_dots@2x.png");
            mask-repeat: no-repeat;
            mask-position: center;
            background-color: var(--green-60);
            mask-size: 20%;
            width: 4px;
            height: 20px;
            border: 10px solid transparent;
          }
          .icon_settings:hover {
            background-color: var(--green-40);
          }
        `}
      </style>
    </div>
  )
}

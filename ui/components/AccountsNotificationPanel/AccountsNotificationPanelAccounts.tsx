import React, {
  ReactElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  setNewSelectedAccount,
  setSnackbarMessage,
  updateSignerTitle,
} from "@tallyho/tally-background/redux-slices/ui"
import { deriveAddress } from "@tallyho/tally-background/redux-slices/keyrings"
import { ROOTSTOCK } from "@tallyho/tally-background/constants"
import {
  AccountTotal,
  selectCurrentNetworkAccountTotalsByCategory,
  selectCurrentAccount,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { useHistory } from "react-router-dom"
import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import {
  normalizeEVMAddress,
  sameEVMAddress,
} from "@tallyho/tally-background/lib/utils"
import { clearSignature } from "@tallyho/tally-background/redux-slices/earn"
import { resetClaimFlow } from "@tallyho/tally-background/redux-slices/claim"
import { useTranslation } from "react-i18next"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { AccountSigner } from "@tallyho/tally-background/services/signing"
import { isSameAccountSignerWithId } from "@tallyho/tally-background/utils/signing"
import SharedButton from "../Shared/SharedButton"
import {
  useBackgroundDispatch,
  useBackgroundSelector,
  useAreKeyringsUnlocked,
} from "../../hooks"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import AccountItemOptionsMenu from "../AccountItem/AccountItemOptionsMenu"
import { i18n } from "../../_locales/i18n"
import SharedIcon from "../Shared/SharedIcon"
import SharedDropdown from "../Shared/SharedDropDown"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import EditSectionForm from "./EditSectionForm"
import SigningButton from "./SigningButton"
import ShowMnemonic from "../AccountsBackup/ShowMnemonic"

type WalletTypeInfo = {
  title: string
  icon: string
  category: string
}

const accountTypes = [
  AccountType.Internal,
  AccountType.Imported,
  AccountType.PrivateKey,
  AccountType.Ledger,
  AccountType.ReadOnly,
]

export const walletTypeDetails: { [key in AccountType]: WalletTypeInfo } = {
  [AccountType.ReadOnly]: {
    title: i18n.t("accounts.notificationPanel.readOnly"),
    icon: "./images/eye@2x.png",
    category: i18n.t("accounts.notificationPanel.category.readOnly"),
  },
  [AccountType.Imported]: {
    title: i18n.t("accounts.notificationPanel.import"),
    icon: "./images/imported@2x.png",
    category: i18n.t("accounts.notificationPanel.category.others"),
  },
  [AccountType.Internal]: {
    title: i18n.t("accounts.notificationPanel.internal"),
    icon: "./images/stars_grey.svg",
    category: i18n.t("accounts.notificationPanel.category.others"),
  },
  [AccountType.PrivateKey]: {
    title: i18n.t("accounts.notificationPanel.privateKey"),
    icon: "./images/key.svg",
    category: i18n.t("accounts.notificationPanel.category.others"),
  },
  [AccountType.Ledger]: {
    title: i18n.t("accounts.notificationPanel.ledger"),
    icon: "./images/ledger_icon.svg",
    category: i18n.t("accounts.notificationPanel.category.ledger"),
  },
}

const shouldAddHeader = (
  existingAccountTypes: AccountType[],
  currentAccountType: AccountType
): boolean => {
  switch (currentAccountType) {
    case AccountType.Ledger:
    case AccountType.ReadOnly:
    case AccountType.Internal:
      return true
    case AccountType.Imported:
      return !existingAccountTypes.includes(AccountType.Internal)
    case AccountType.PrivateKey:
      return !(
        existingAccountTypes.includes(AccountType.Internal) ||
        existingAccountTypes.includes(AccountType.Imported)
      )
    default:
      throw Error("Unknown account type")
  }
}

function WalletTypeHeader({
  accountType,
  accountTotals,
  onClickAddAddress,
  walletNumber,
  path,
  accountSigner,
}: {
  accountType: AccountType
  accountTotals: AccountTotal[]
  onClickAddAddress?: () => void
  accountSigner: AccountSigner
  walletNumber?: number
  path?: string | null
}) {
  const { t } = useTranslation()
  const { title, icon } = walletTypeDetails[accountType]
  const dispatch = useBackgroundDispatch()

  const settingsBySigner = useBackgroundSelector(
    (state) => state.ui.accountSignerSettings
  )
  const signerSettings =
    accountSigner.type !== "read-only"
      ? settingsBySigner.find(({ signer }) =>
          isSameAccountSignerWithId(signer, accountSigner)
        )
      : undefined

  const sectionCustomName = signerSettings?.title

  const sectionTitle = useMemo(() => {
    if (
      accountType === AccountType.ReadOnly ||
      accountType === AccountType.PrivateKey
    )
      return title

    let networkName = "" // Only for Rootstock
    if (path === ROOTSTOCK.derivationPath) networkName = `(${ROOTSTOCK.name})`

    if (sectionCustomName) return `${sectionCustomName} ${networkName}`

    return `${title} ${walletNumber} ${networkName}`
  }, [accountType, title, sectionCustomName, walletNumber, path])

  const history = useHistory()
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const [showEditMenu, setShowEditMenu] = useState(false)
  const [showExportMnemonicMenu, setShowExportMnemonicMenu] = useState(false)

  const hasMnemonic =
    accountType === AccountType.Imported || accountType === AccountType.Internal

  return (
    <>
      {accountSigner.type !== "read-only" && (
        <SharedSlideUpMenu
          size="small"
          isOpen={showEditMenu}
          close={(e) => {
            e.stopPropagation()
            setShowEditMenu(false)
          }}
        >
          <EditSectionForm
            onSubmit={(newName) => {
              if (newName) {
                dispatch(updateSignerTitle([accountSigner, newName]))
              }
              setShowEditMenu(false)
            }}
            onCancel={() => setShowEditMenu(false)}
            accountTypeIcon={walletTypeDetails[accountType].icon}
            currentName={sectionTitle}
          />
        </SharedSlideUpMenu>
      )}
      <header className="wallet_title">
        <h2 className="left">
          <div className="icon_wrap">
            <div className="icon" />
          </div>
          {sectionTitle}
        </h2>
        {accountType !== AccountType.ReadOnly && (
          <SharedDropdown
            toggler={(toggle) => (
              <SharedIcon
                color="var(--green-40)"
                customStyles="cursor: pointer;"
                width={24}
                onClick={() => toggle()}
                icon="settings.svg"
              />
            )}
            options={[
              {
                key: "edit",
                icon: "icons/s/edit.svg",
                label: t("accounts.accountItem.editName"),
                onClick: () => setShowEditMenu(true),
              },
              onClickAddAddress && {
                key: "addAddress",
                onClick: () => {
                  if (areKeyringsUnlocked) {
                    onClickAddAddress()
                  } else {
                    history.push("/keyring/unlock")
                  }
                },
                icon: "icons/s/add.svg",
                label: t("accounts.notificationPanel.addAddress"),
              },
              hasMnemonic
                ? {
                    key: "showMnemonic",
                    onClick: () => setShowExportMnemonicMenu(true),
                    icon: "icons/s/lock.svg",
                    label: t("accounts.accountItem.showMnemonic.header"),
                  }
                : undefined,
            ]}
          />
        )}
      </header>
      <SharedSlideUpMenu
        isOpen={showExportMnemonicMenu}
        close={(e) => {
          e?.stopPropagation()
          setShowExportMnemonicMenu(false)
        }}
      >
        <ShowMnemonic accounts={accountTotals} walletTitle={sectionTitle} />
      </SharedSlideUpMenu>
      <style jsx>{`
        .wallet_title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 16px;
          padding-right: 4px;
        }
        .wallet_title > h2 {
          color: var(--green-40);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          padding: 0px 12px 0px 24px;
          margin: 8px 0px;
        }
        .icon_wrap {
          background-color: var(--green-60);
          margin: 0 7px 0 0;
          border-radius: 4px;
        }
        .icon {
          mask-image: url("${icon}");
          mask-size: cover;
          background-color: var(--green-20);
          width: 24px;
          height: 24px;
        }
        .icon_wallet {
          background: url("./images/wallet_kind_icon@2x.png") center no-repeat;
          background-size: cover;
          width: 24px;
          height: 24px;
          margin-right: 8px;
        }
        .icon_edit {
          background: url("./images/edit@2x.png") center no-repeat;
          background-size: cover;
          width: 13px;
          height: 13px;
          margin-left: 8px;
        }
        .left {
          align-items: center;
          display: flex;
        }
        .right {
          align-items: center;
          margin-right: 4px;
        }
      `}</style>
    </>
  )
}

type Props = {
  onCurrentAddressChange: (newAddress: string) => void
}

export default function AccountsNotificationPanelAccounts({
  onCurrentAddressChange,
}: Props): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const history = useHistory()
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)
  const areKeyringsUnlocked = useAreKeyringsUnlocked(false)
  const isMounted = useRef(false)

  const accountTotals = useBackgroundSelector(
    selectCurrentNetworkAccountTotalsByCategory
  )

  const [pendingSelectedAddress, setPendingSelectedAddress] = useState("")

  const selectedAccountAddress =
    useBackgroundSelector(selectCurrentAccount).address

  const updateCurrentAccount = (address: string) => {
    dispatch(clearSignature())
    setPendingSelectedAddress(address)
    dispatch(
      setNewSelectedAccount({
        address,
        network: selectedNetwork,
      })
    )
  }

  useEffect(() => {
    if (
      pendingSelectedAddress !== "" &&
      pendingSelectedAddress === selectedAccountAddress
    ) {
      onCurrentAddressChange(pendingSelectedAddress)
      setPendingSelectedAddress("")
    }
  }, [onCurrentAddressChange, pendingSelectedAddress, selectedAccountAddress])

  useEffect(() => {
    // Prevents notifications from displaying when the component is not yet mounted
    if (!isMounted.current) {
      isMounted.current = true
    } else if (!areKeyringsUnlocked) {
      dispatch(setSnackbarMessage(t("accounts.notificationPanel.snackbar")))
    }
  }, [history, areKeyringsUnlocked, dispatch, t])

  const existingAccountTypes = accountTypes.filter(
    (type) => (accountTotals[type]?.length ?? 0) > 0
  )

  return (
    <div className="switcher_wrap">
      {existingAccountTypes.map((accountType) => {
        // Known-non-null due to above filter.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const accountTotalsByType = accountTotals[accountType]!.reduce(
          (acc, accountTypeTotal) => {
            if (accountTypeTotal.keyringId) {
              acc[accountTypeTotal.keyringId] ??= []
              // Known-non-null due to above ??=
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              acc[accountTypeTotal.keyringId].push(accountTypeTotal)
            } else {
              acc.readOnly ??= []
              acc.readOnly.push(accountTypeTotal)
            }
            return acc
          },
          {} as { [keyringId: string]: AccountTotal[] }
        )

        return (
          <>
            {shouldAddHeader(existingAccountTypes, accountType) && (
              <div className="category_wrap simple_text">
                <p className="category_title">
                  {walletTypeDetails[accountType].category}
                </p>
                {isEnabled(FeatureFlags.SUPPORT_KEYRING_LOCKING) &&
                  (accountType === AccountType.Imported ||
                    accountType === AccountType.Internal) && (
                    <SigningButton
                      onCurrentAddressChange={onCurrentAddressChange}
                    />
                  )}
              </div>
            )}
            {Object.values(accountTotalsByType).map(
              (accountTotalsByKeyringId, idx) => {
                return (
                  <section key={accountType}>
                    <WalletTypeHeader
                      accountType={accountType}
                      walletNumber={idx + 1}
                      path={accountTotalsByKeyringId[0].path}
                      accountSigner={accountTotalsByKeyringId[0].accountSigner}
                      accountTotals={accountTotalsByKeyringId}
                      onClickAddAddress={
                        accountType === "imported" || accountType === "internal"
                          ? () => {
                              if (accountTotalsByKeyringId[0].keyringId) {
                                dispatch(
                                  deriveAddress(
                                    accountTotalsByKeyringId[0].keyringId
                                  )
                                )
                              }
                            }
                          : undefined
                      }
                    />
                    <ul>
                      {accountTotalsByKeyringId.map((accountTotal) => {
                        const normalizedAddress = normalizeEVMAddress(
                          accountTotal.address
                        )

                        const isSelected = sameEVMAddress(
                          normalizedAddress,
                          selectedAccountAddress
                        )

                        return (
                          <li
                            key={normalizedAddress}
                            // We use these event handlers in leiu of :hover so that we can prevent child hovering
                            // from affecting the hover state of this li.
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--hunter-green)"
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.backgroundColor =
                                "var(--hunter-green)"
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = ""
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = ""
                            }}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  updateCurrentAccount(normalizedAddress)
                                }
                              }}
                              onClick={() => {
                                dispatch(resetClaimFlow())
                                updateCurrentAccount(normalizedAddress)
                              }}
                            >
                              <SharedAccountItemSummary
                                key={normalizedAddress}
                                accountTotal={accountTotal}
                                isSelected={isSelected}
                              >
                                <AccountItemOptionsMenu
                                  accountTotal={accountTotal}
                                  accountType={accountType}
                                />
                              </SharedAccountItemSummary>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )
              }
            )}
          </>
        )
      })}
      <footer>
        <SharedButton
          type="tertiary"
          size="medium"
          iconSmall="add"
          iconPosition="left"
          onClick={() => {
            if (isEnabled(FeatureFlags.SUPPORT_TABBED_ONBOARDING)) {
              window.open("/tab.html#onboarding")
              window.close()
            } else {
              history.push("/onboarding/add-wallet")
            }
          }}
        >
          {t("accounts.notificationPanel.addWallet")}
        </SharedButton>
      </footer>
      <style jsx>
        {`
          ul {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            align-content: center;
            margin-bottom: 8px;
          }
          section:last-of-type {
            margin-bottom: 16px;
          }
          li {
            width: 100%;
            box-sizing: border-box;
            padding: 8px 0px 8px 24px;
            cursor: pointer;
          }
          footer {
            width: 100%;
            height: 48px;
            background-color: var(--hunter-green);
            position: fixed;
            bottom: 0px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 0px 12px;
            box-sizing: border-box;
          }
          .switcher_wrap {
            height: 432px;
            overflow-y: scroll;
            border-top: 1px solid var(--green-120);
          }
          .category_wrap {
            display: flex;
            justify-content: space-between;
            background-color: var(--hunter-green);
            padding: 8px 10px 8px 24px;
          }
          .category_title {
            color: var(--green-60);
          }
          p {
            margin: 0;
          }
        `}
      </style>
    </div>
  )
}

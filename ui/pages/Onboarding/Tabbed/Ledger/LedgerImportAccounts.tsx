import {
  addLedgerAccount,
  fetchAddress,
  fetchBalance,
  importLedgerAccounts,
  LedgerDeviceState,
} from "@tallyho/tally-background/redux-slices/ledger"
import React, { ReactElement, useEffect, useState } from "react"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../../hooks"
import SharedButton from "../../../../components/Shared/SharedButton"
import LedgerContinueButton from "../../../../components/Ledger/LedgerContinueButton"
import LedgerPanelContainer from "../../../../components/Ledger/LedgerPanelContainer"
import OnboardingDerivationPathSelectAlt from "../../../../components/Onboarding/OnboardingDerivationPathSelect"
import { blockExplorer } from "../../../../utils/constants"
import SharedCheckbox from "../../../../components/Shared/SharedCheckbox"

const addressesPerPage = 6

function usePageData({
  device,
  pageIndex,
  parentPath,
  network,
}: {
  device: LedgerDeviceState
  parentPath: string
  pageIndex: number
  network: EVMNetwork
}) {
  const dispatch = useBackgroundDispatch()

  const [selectedStates, setSelectedStates] = useState<
    Record<string, boolean | undefined>
  >({})

  const paths: string[] = []

  const firstIndex = pageIndex * addressesPerPage
  const lastIndex = (pageIndex + 1) * addressesPerPage - 1
  for (let i = firstIndex; i <= lastIndex; i += 1) {
    if (parentPath.includes("x")) {
      const formattedString = parentPath.slice().replace("x", `${i}`)
      paths.push(formattedString)
    } else {
      paths.push(`${parentPath}/${i}`)
    }
  }

  const items = paths.map((path) => {
    const account = device.accounts[path] ?? null
    const address = account?.address ?? null
    return {
      path,
      account,
      address,
      balance: account?.balance[network.chainID] ?? null,
      isSelected: (selectedStates[path] ?? false) && address !== null,
      setSelected: (selected: boolean) => {
        setSelectedStates((states) => ({ ...states, [path]: selected }))
      },
    }
  })

  useEffect(() => {
    const nextUnresolvedAccount = items.find((item) => item.account === null)
    if (!nextUnresolvedAccount) return
    const { path } = nextUnresolvedAccount
    dispatch(addLedgerAccount({ deviceID: device.id, path }))
  }, [device.id, dispatch, items])

  useEffect(() => {
    const nextUnresolvedAddress = items.find((item) => item.address === null)
    if (!nextUnresolvedAddress) return
    const { account } = nextUnresolvedAddress
    if (!account) return
    const { path, fetchingAddress } = account
    if (!path || fetchingAddress) return
    dispatch(fetchAddress({ deviceID: device.id, path }))
  }, [device.id, dispatch, items])

  useEffect(() => {
    const nextUnresolvedBalance = items.find((item) => item.balance === null)
    if (!nextUnresolvedBalance) return
    const { path, account } = nextUnresolvedBalance
    if (!account) return
    const { address } = account
    if (!address) return
    dispatch(
      fetchBalance({
        deviceID: device.id,
        path,
        address,
        network,
      }),
    )
  }, [device.id, dispatch, items, network])

  const selectedAccounts = items.flatMap((item) => {
    if (!selectedStates[item.path]) return []
    if (!item.account) return []
    const { path, address } = item.account
    if (!address) return []
    return [{ path, address }]
  })

  return { firstIndex, lastIndex, items, selectedAccounts }
}

function LedgerAccountList({
  device,
  parentPath,
  onConnect,
}: {
  device: LedgerDeviceState
  parentPath: string
  onConnect: () => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding",
  })
  const [pageIndex, setPageIndex] = useState(0)
  const selectedNetwork = useBackgroundSelector(selectCurrentNetwork)

  const pageData = usePageData({
    device,
    parentPath,
    pageIndex,
    network: selectedNetwork,
  })
  const dispatch = useBackgroundDispatch()

  return (
    <>
      <div className="addresses">
        <div className="item-list">
          {pageData.items.map(
            ({ path, address, balance, isSelected, setSelected }) => (
              <div className="item" key={path}>
                <SharedCheckbox
                  size={20}
                  checked={isSelected}
                  disabled={address == null}
                  onChange={(value) => setSelected(value)}
                />
                {address === null && <div className="address_loading" />}
                {address !== null && (
                  <>
                    <div className="address" title={address}>
                      {address.slice(0, 4)}...
                      {address.slice(address.length - 4)}
                    </div>
                    {balance === null && <div className="balance_loading" />}
                    {balance !== null && (
                      <div className="balance">
                        {balance} {selectedNetwork.baseAsset.symbol}
                      </div>
                    )}
                    <div className="etherscan_link_container">
                      <SharedButton
                        type="tertiaryGray"
                        size="medium"
                        iconMedium="new-tab"
                        onClick={() => {
                          window
                            .open(
                              `${
                                blockExplorer[selectedNetwork.chainID].url
                              }/address/${address}`,
                              "_blank",
                            )
                            ?.focus()
                        }}
                      >
                        {/* No label. FIXME: is this ok for a11y? */}
                      </SharedButton>
                    </div>
                  </>
                )}
              </div>
            ),
          )}
        </div>
        <div className="pagination">
          <div className="previous_button">
            <SharedButton
              isDisabled={pageIndex === 0}
              onClick={() => {
                setPageIndex((i) => i - 1)
              }}
              size="medium"
              type="tertiary"
            >
              {t("previous")}
            </SharedButton>
          </div>
          <div className="current_page">
            {pageData.firstIndex} - {pageData.lastIndex}
          </div>
          <div className="next_button">
            <SharedButton
              onClick={() => {
                setPageIndex((i) => i + 1)
              }}
              size="medium"
              type="tertiary"
            >
              {t("next")}
            </SharedButton>
          </div>
        </div>
      </div>
      <LedgerContinueButton
        isDisabled={pageData.selectedAccounts.length === 0}
        onClick={() => {
          dispatch(
            importLedgerAccounts({ accounts: pageData.selectedAccounts }),
          )
          onConnect()
        }}
      >
        {t("connectSelectedLedger")}
      </LedgerContinueButton>

      <style jsx>{`
        .addresses {
          margin: 0.5rem 0;
          padding: 1rem;
          border-radius: 4px;
          background: var(--green-95);
        }

        .item {
          display: flex;
          align-items: center;
          padding: 0 0.5rem;
        }

        .address_loading,
        .balance_loading {
          height: 1.5rem;
          border-radius: 2px;
          background: linear-gradient(
            to right,
            var(--green-80),
            var(--green-95),
            var(--green-80)
          );
        }

        .address_loading {
          flex: 1;
          margin: 0.5rem 0;
        }

        .balance_loading {
          flex: 0 1 6rem;
          margin: 0.5rem 0;
          margin-left: auto;
        }

        .address,
        .balance {
          font-size: 16px;
          line-height: 40px;

          color: var(--green-40);
        }

        .balance {
          flex: 1;
          text-align: right;
        }

        .etherscan_link_container {
          margin-left: 0.5rem;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0.5rem 0.5rem 0;
        }

        .previous_button,
        .current_page,
        .next_button {
          display: flex;
          flex: 1 0 0;
        }

        .current_page {
          justify-content: center;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--green-40);
        }

        .next_button {
          justify-content: flex-end;
        }
      `}</style>
    </>
  )
}

export default function LedgerImportAccounts({
  device,
  onConnect,
}: {
  device: LedgerDeviceState
  onConnect: () => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "ledger.onboarding",
  })
  const [parentPath, setParentPath] = useState<string | null>(null)

  return (
    <>
      <LedgerPanelContainer
        indicatorImage="connected"
        heading={t("selectLedgeraccounts")}
        subHeading={t("connectSelectedLedger")}
      >
        <div className="derivation_path">
          <OnboardingDerivationPathSelectAlt
            onChange={(value) => {
              setParentPath(value)
            }}
          />
        </div>
        {parentPath !== null && (
          <LedgerAccountList
            device={device}
            parentPath={parentPath}
            onConnect={onConnect}
          />
        )}
      </LedgerPanelContainer>
      <style jsx>{`
        .derivation_path {
          margin: 0.5rem 0;
          padding: 1rem 1.5rem;
          border-radius: 4px;
          background: var(--green-95);
        }
      `}</style>
    </>
  )
}

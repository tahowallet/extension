import {
  connectLedger,
  fetchAddress,
  fetchBalance,
  importLedgerAccounts,
  LedgerAccountState,
  resizeAccounts,
  setPath,
} from "@tallyho/tally-background/redux-slices/ledger"
import classNames from "classnames"
import React, { ReactElement, useEffect, useState } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSelect from "../Shared/SharedSelect"
import LedgerContinueButton from "./LedgerContinueButton"
import LedgerPanelContainer from "./LedgerPanelContainer"

const addressesPerPage = 6

function usePageData(pageIndex: number) {
  const { nonce, accounts } = useBackgroundSelector((state) => state.ledger)
  const dispatch = useBackgroundDispatch()

  const [selectedStates, setSelectedStates] = useState<
    Record<number, boolean | undefined>
  >({})

  const indexes: number[] = []

  const firstIndex = pageIndex * addressesPerPage
  const lastIndex = (pageIndex + 1) * addressesPerPage
  for (let i = firstIndex; i < lastIndex; i += 1) {
    indexes.push(i)
  }

  useEffect(() => {
    if (accounts.length < lastIndex) {
      dispatch(resizeAccounts(lastIndex))
    }
  }, [accounts.length, dispatch, lastIndex])

  const items = indexes.map((index) => {
    const account = accounts[index] as LedgerAccountState | undefined
    const address = account?.address ?? null
    return {
      index,
      account,
      address,
      ethBalance: account?.balance ?? null,
      isSelected: (selectedStates[index] ?? false) && address !== null,
      setSelected: (selected: boolean) => {
        setSelectedStates((states) => ({ ...states, [index]: selected }))
      },
    }
  })

  useEffect(() => {
    const nextUnresolvedAddress = items.find((item) => item.address === null)
    if (!nextUnresolvedAddress) return
    const { index, account } = nextUnresolvedAddress
    if (!account) return
    const { path, fetchingAddress } = account
    if (!path || fetchingAddress) return
    dispatch(fetchAddress({ nonce, index, path }))
  }, [accounts.length, dispatch, items, lastIndex, nonce])

  useEffect(() => {
    const nextUnresolvedBalance = items.find((item) => item.ethBalance === null)
    if (!nextUnresolvedBalance) return
    const { index, account } = nextUnresolvedBalance
    if (!account) return
    const { address, fetchingBalance } = account
    if (!address || fetchingBalance) return
    dispatch(fetchBalance({ index, address }))
  }, [accounts.length, dispatch, items, lastIndex])

  const selectedAccounts = items.flatMap((item) => {
    if (!selectedStates[item.index]) return []
    if (!item.account) return []
    const { path, address } = item.account
    if (!address) return []
    return [{ path, address }]
  })

  return { firstIndex, lastIndex, items, selectedAccounts }
}

function LedgerAccountList({
  onConnect,
}: {
  onConnect: () => void
}): ReactElement {
  const [pageIndex, setPageIndex] = useState(0)

  const pageData = usePageData(pageIndex)
  const dispatch = useBackgroundDispatch()

  return (
    <>
      <div className="addresses">
        <div className="item-list">
          {pageData.items.map(
            ({ index, address, ethBalance, isSelected, setSelected }) => (
              <div className="item" key={index}>
                <label className="checkbox-label">
                  {/* TODO: Share this implementation of checkbox. */}
                  <input
                    className="checkbox-input"
                    type="checkbox"
                    disabled={address === null}
                    checked={isSelected}
                    onChange={(event) => {
                      setSelected(event.currentTarget.checked)
                    }}
                  />
                  <div
                    className={classNames("checkbox-box", {
                      selected: isSelected,
                      disabled: address === null,
                    })}
                  />
                </label>
                {address === null && <div className="address-loading" />}
                {address !== null && (
                  <>
                    <div className="address" title={address}>
                      {address.slice(0, 4)}...
                      {address.slice(address.length - 4)}
                    </div>
                    {ethBalance === null && <div className="balance-loading" />}
                    {ethBalance !== null && (
                      <div className="balance">{ethBalance} ETH</div>
                    )}
                    <div className="etherscan-link-container">
                      <SharedButton
                        type="tertiaryGray"
                        size="medium"
                        icon="external"
                        iconSize="secondaryMedium"
                        onClick={() => {
                          window
                            .open(
                              `https://etherscan.io/address/${address}`,
                              "_blank"
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
            )
          )}
        </div>
        <div className="pagination">
          <div className="previous-button">
            <SharedButton
              isDisabled={pageIndex === 0}
              onClick={() => {
                setPageIndex((i) => i - 1)
              }}
              size="medium"
              type="tertiary"
            >
              Previous
            </SharedButton>
          </div>
          <div className="current-page">
            {pageData.firstIndex} - {pageData.lastIndex}
          </div>
          <div className="next-button">
            <SharedButton
              onClick={() => {
                setPageIndex((i) => i + 1)
              }}
              size="medium"
              type="tertiary"
            >
              Next
            </SharedButton>
          </div>
        </div>
      </div>
      <LedgerContinueButton
        isDisabled={pageData.selectedAccounts.length === 0}
        onClick={() => {
          dispatch(
            importLedgerAccounts({ accounts: pageData.selectedAccounts })
          )
          onConnect()
        }}
      >
        Connect selected
      </LedgerContinueButton>

      <style jsx>{`
        .addresses {
          margin: 0.5rem 0;
          padding: 1rem;
          border-radius: 4px;
          background: var(--hunter-green);
        }

        .item {
          display: flex;
          align-items: center;
          padding: 0 0.5rem;
        }

        .checkbox-label {
          margin: unset;
          line-height: unset;
          margin-right: 1rem;
        }

        .checkbox-input {
          display: none;
        }

        .checkbox-box {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 2px;
          box-sizing: border-box;
          cursor: pointer;
        }

        .checkbox-box.disabled {
          background: var(--green-80);
        }

        .checkbox-box:not(.selected) {
          border: 2px solid var(--green-60);
        }

        .checkbox-box.selected {
          background-color: var(--trophy-gold);
        }

        .checkbox-box.selected::before {
          content: "";
          display: block;
          margin: 0.25rem;
          width: 0.75rem;
          height: 0.75rem;
          background: no-repeat center / cover url("/images/checkmark@2x.png");
        }

        .address-loading,
        .balance-loading {
          height: 1.5rem;
          border-radius: 2px;
          background: linear-gradient(
            to right,
            var(--green-80),
            var(--green-95),
            var(--green-80)
          );
        }

        .address-loading {
          flex: 1;
          margin: 0.5rem 0;
        }

        .balance-loading {
          flex: 0 1 6rem;
          margin: 0.5rem 0;
          margin-left: auto;
        }

        .address,
        .balance {
          font-family: Segment;
          font-style: normal;
          font-weight: normal;
          font-size: 16px;
          line-height: 40px;

          color: var(--green-40);
        }

        .balance {
          flex: 1;
          text-align: right;
        }

        .etherscan-link-container {
          margin-left: 0.5rem;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 0.5rem 0.5rem 0;
        }

        .previous-button,
        .current-page,
        .next-button {
          display: flex;
          flex: 1 0 0;
        }

        .current-page {
          justify-content: center;
          font-family: Segment;
          font-style: normal;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--green-40);
        }

        .next-button {
          justify-content: flex-end;
        }
      `}</style>
    </>
  )
}

export default function LedgerImportSelectAccountsScreen({
  onConnect,
}: {
  onConnect: () => void
}): ReactElement {
  const dispatch = useBackgroundDispatch()
  const { nonce, connected, parentPath } = useBackgroundSelector(
    (state) => state.ledger
  )
  useEffect(() => {
    dispatch(connectLedger({ nonce }))
  }, [dispatch, nonce])

  return (
    <>
      {!connected && (
        <LedgerPanelContainer
          indicatorImageSrc="/images/connect_ledger_indicator_disconnected.svg"
          heading="Connecting..."
        />
      )}
      {connected && (
        <LedgerPanelContainer
          indicatorImageSrc="/images/connect_ledger_indicator_connected.svg"
          heading="Select ledger accounts"
          subHeading="You can select as many as you want"
        >
          <div className="derivation-path">
            <SharedSelect
              options={[
                { label: `m'/44'/60'/0'`, value: `m'/44'/60'/0'` },
                { label: `m'/44'/60'`, value: `m'/44'/60'` },
              ]}
              placeholder="Select derivation path"
              onChange={(value) => {
                dispatch(setPath(value))
              }}
            />
          </div>
          {parentPath !== null && <LedgerAccountList onConnect={onConnect} />}
        </LedgerPanelContainer>
      )}
      <style jsx>{`
        .derivation-path {
          margin: 0.5rem 0;
          padding: 1rem 1.5rem;
          border-radius: 4px;
          background: var(--hunter-green);
        }
      `}</style>
    </>
  )
}

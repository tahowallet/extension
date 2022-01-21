import classNames from "classnames"
import React, { ReactElement, useEffect, useState } from "react"
import SharedButton from "../Shared/SharedButton"
import SharedSelect from "../Shared/SharedSelect"
import LedgerContinueButton from "./LedgerContinueButton"
import LedgerPanelContainer from "./LedgerPanelContainer"

const addressesPerPage = 6

function useFakePageData(pageIndex: number) {
  const [addresses, setAddresses] = useState<
    Record<number, string | undefined>
  >({})
  const [ethBalances, setEthBalances] = useState<
    Record<number, string | undefined>
  >({})
  const [selectedStates, setSelectedStates] = useState<
    Record<number, boolean | undefined>
  >({})

  const indexes: number[] = []

  const firstIndex = pageIndex * addressesPerPage + 1
  const lastIndex = (pageIndex + 1) * addressesPerPage
  for (let i = firstIndex - 1; i < lastIndex; i += 1) {
    indexes.push(i)
  }

  useEffect(() => {
    let nextIndex = 0
    let nextBalanceIndex = -1
    const interval = setInterval(() => {
      if (Math.random() < 0.5) {
        setAddresses((oldAddresses) => ({
          ...oldAddresses,
          [nextIndex]: `0xa4...D3f5`,
        }))
        nextIndex += 1
      } else if (Math.random() < 0.5) {
        const amountString = (10 ** (Math.random() * 5 - 2)).toLocaleString(
          undefined,
          { maximumFractionDigits: 4, minimumFractionDigits: 4 }
        )
        setEthBalances((oldBalances) => ({
          ...oldBalances,
          [nextBalanceIndex]: `${amountString} ETH`,
        }))
        nextBalanceIndex += 1
      }
    }, 500)

    return () => {
      clearInterval(interval)
    }
  }, [])

  const items = indexes.map((index) => ({
    index,
    address: addresses[index] ?? null,
    ethBalance: ethBalances[index] ?? null,
    isSelected: selectedStates[index] ?? false,
    setSelected: (selected: boolean) => {
      setSelectedStates((states) => ({ ...states, [index]: selected }))
    },
  }))

  const selectedCount = Object.values(selectedStates).filter((x) => x).length

  return { firstIndex, lastIndex, items, selectedCount }
}

function LedgerAccountList({
  onConnect,
}: {
  onConnect: () => void
}): ReactElement {
  const [pageIndex, setPageIndex] = useState(0)
  const pageData = useFakePageData(pageIndex)

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
                    checked={isSelected}
                    onChange={(event) => {
                      setSelected(event.currentTarget.checked)
                    }}
                  />
                  <div
                    className={classNames("checkbox-box", {
                      selected: isSelected,
                    })}
                  />
                </label>
                {address === null && <div className="address-loading" />}
                {address !== null && (
                  <>
                    <div className="address">{address}</div>
                    {ethBalance === null && <div className="balance-loading" />}
                    {ethBalance !== null && (
                      <div className="balance">{ethBalance}</div>
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
        isDisabled={pageData.selectedCount === 0}
        onClick={onConnect}
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
  const [derivationPath, setDerivationPath] = useState<string | null>(null)

  return (
    <>
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
              setDerivationPath(value)
            }}
          />
        </div>
        {derivationPath !== null && <LedgerAccountList onConnect={onConnect} />}
      </LedgerPanelContainer>
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

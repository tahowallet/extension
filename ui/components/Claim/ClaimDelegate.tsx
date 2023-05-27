import React, { ReactElement, useState, useCallback } from "react"
import {
  chooseDelegate,
  Delegate,
  selectClaimSelections,
} from "@tallyho/tally-background/redux-slices/claim"
import { isAddress } from "@ethersproject/address"

import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import ClaimAmountBanner from "./ClaimAmountBanner"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedAddressAvatar from "../Shared/SharedAddressAvatar"

function CustomDelegatePanel({
  selectedDelegate,
}: {
  selectedDelegate: Delegate
}) {
  const dispatch = useBackgroundDispatch()
  const [errorMessage, setErrorMessage] = useState("")
  const [addressInputValue, setAddressInputValue] = useState(
    selectedDelegate.enteredBy === "custom"
      ? selectedDelegate.address
      : undefined
  )

  const clearSelectedDelegate = useCallback(() => {
    if (selectedDelegate.enteredBy === "custom") {
      dispatch(chooseDelegate(undefined))
    }
  }, [dispatch, selectedDelegate.enteredBy])

  const handleAddressInputChange = useCallback(
    (value: string) => {
      if (isAddress(value)) {
        setErrorMessage("")
        dispatch(chooseDelegate({ address: value, enteredBy: "custom" }))
      } else if (value.length > 10) {
        // Clear selected delegate when not valid
        setErrorMessage("Invalid address")
        clearSelectedDelegate()
      } else {
        // Clear selected delegate when not long enough
        clearSelectedDelegate()
      }
      setAddressInputValue(value)
    },
    [dispatch, clearSelectedDelegate]
  )

  return (
    <div>
      <p>
        Delegate yourself or somebody else. We advice you only do this if the
        person you delegate plans to be active in DAO votings.
      </p>
      <SharedInput
        label="Delegate with an address"
        value={addressInputValue}
        onChange={handleAddressInputChange}
        errorMessage={errorMessage}
      />
      <style jsx>{`
        p {
          color: var(--green-40);
          font-size: 16px;
          line-height: 24px;
          margin-bottom: 40px;
        }
      `}</style>
    </div>
  )
}

export default function ClaimDelegate(props: {
  delegates: Delegate[]
  claimAmount: number
}): ReactElement {
  const { delegates, claimAmount } = props
  const { selectedDelegate } = useBackgroundSelector(selectClaimSelections)

  const [panelNumber, setPanelNumber] = useState(0)

  const dispatch = useBackgroundDispatch()

  return (
    <div>
      <ClaimAmountBanner amount={claimAmount} showLabel showBonus />
      <div className="claim standard_width">
        <div className="title">Choose a delegate!</div>
        <div className="description">
          Delegates are your north-star, you trust them to represent you in a
          DAO voting.
        </div>
        <div className="switcher_wrap">
          <SharedPanelSwitcher
            setPanelNumber={setPanelNumber}
            panelNumber={panelNumber}
            panelNames={["List of delegates", "Custom delegation"]}
          />
        </div>
        {panelNumber === 0 ? (
          <ul className="delegates">
            {delegates.map((delegate) => (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(chooseDelegate(delegate))
                  }}
                >
                  <div className="delegate">
                    <input
                      type="radio"
                      name="delegate"
                      id={delegate.address}
                      className="radio"
                      checked={delegate.address === selectedDelegate.address}
                      readOnly
                    />
                    <label
                      className="delegate_details"
                      htmlFor={delegate.ensName}
                    >
                      <SharedAddressAvatar
                        address={delegate.address ?? ""}
                        url={delegate?.avatar}
                      />
                      <div className="delegate_info">
                        <div className="name ellipsis">
                          {delegate.ensName && delegate.ensName.length > 0
                            ? delegate.ensName
                            : delegate.truncatedAddress}
                        </div>
                        {/* <span className="count">123 Votes</span> */}
                        <div className="pitch">
                          <SharedButton
                            type="tertiaryGray"
                            size="small"
                            onClick={() => {
                              window
                                .open(delegate.applicationLink, "_blank")
                                ?.focus()
                            }}
                          >
                            See pitch
                          </SharedButton>
                        </div>
                      </div>
                    </label>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <CustomDelegatePanel selectedDelegate={selectedDelegate} />
        )}
      </div>
      <style jsx>
        {`
          .switcher_wrap {
            width: 100vw;
            margin-left: -17px;
          }
          .title {
            height: 32px;
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            margin-top: 25px;
            margin-bottom: 11px;
          }
          .description {
            font-size: 16px;
            line-height: 24px;
            color: var(--green-40);
            margin-bottom: 30px;
          }
          .claim {
            display: flex;
            flex-flow: column;
            flex-grow: 1;
          }
          .delegate {
            display: flex;
            align-items: center;
            width: 100%;
            margin-bottom: 20px;
            padding-top: 20px;
          }
          .delegate_details {
            display: contents;
            align-items: center;
            width: 100%;
            cursor: pointer;
            box-sizing: border-box;
          }
          .delegate_info {
            display: flex;
            width: 100%;
            justify-content: space-between;
            margin-left: 12px;
            width: 275px;
          }
          .radio {
            all: revert;
            cursor: pointer;
            margin-right: 10px;
          }
          .name {
            color: var(--green-20);
            font-size: 16px;
            font-weight: 500;
            display: block;
            line-height: 32px;
            width: 175px;
          }
          .delegates {
            background-color: var(--hunter-green);
            margin-left: -16px;
            padding: 0px 16px;
            width: 384px;
            box-sizing: border-box;
          }
          .count {
            color: var(--green-60);
            font-size: 16px;
            font-weight: 500;
          }
        `}
      </style>
    </div>
  )
}

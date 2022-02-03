import React, { ReactElement, useState } from "react"
import { selectDelegate } from "@tallyho/tally-background/redux-slices/claim"
import { useBackgroundDispatch } from "../../hooks"

import ClaimAmountBanner from "./ClaimAmountBanner"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"

// TODO: replace any
export default function ClaimDelegate(props: {
  delegates: any[]
  claimAmount: number
}): ReactElement {
  const { delegates, claimAmount } = props
  const [panelNumber, setPanelNumber] = useState(0)
  const dispatch = useBackgroundDispatch()

  return (
    <div>
      <ClaimAmountBanner amount={claimAmount} />
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
            {delegates.map((delegate) => {
              return (
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(selectDelegate(delegate))
                    }}
                  >
                    <div className="delegate">
                      <input
                        type="radio"
                        name="delegate"
                        id={delegate.ensName}
                        className="radio"
                      />
                      <label
                        className="delegate_details"
                        htmlFor={delegate.ensName}
                      >
                        <div className="icon" />
                        <div className="delegate_info">
                          <div className="name">{delegate.ensName}</div>
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
              )
            })}
          </ul>
        ) : (
          <div>
            <p>
              Delegate yourself or somebody else. We advice you only do this if
              the person you delegate plans to be active in DAO votings.
            </p>
            <SharedInput label="Delegate with ENS or address" />
          </div>
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
          }
          .name {
            color: var(--green-20);
            font-size: 16px;
            font-weight: 500;
            display: flex;
            flex-direction: column;
            line-height: 32px;
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
          .icon {
            width: 40px;
            height: 40px;
            margin-left: 10px;
            background-color: #006ae3;
            border-radius: 999px;
            flex-shrink: 0;
          }
          p {
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            margin-bottom: 40px;
          }
        `}
      </style>
    </div>
  )
}

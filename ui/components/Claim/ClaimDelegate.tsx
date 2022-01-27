import React, { ReactElement, useState } from "react"
import ClaimAmountBanner from "./ClaimAmountBanner"
import SharedPanelSwitcher from "../Shared/SharedPanelSwitcher"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"

// TODO: replace any
export default function ClaimDelegate(props: {
  delegates: any[]
}): ReactElement {
  const { delegates } = props
  const [panelNumber, setPanelNumber] = useState(0)

  return (
    <div>
      <ClaimAmountBanner />
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
          <>
            {delegates.map((delegate) => {
              return (
                <div className="delegate">
                  <input type="radio" name="delegate" className="radio" />
                  <div className="delegate_details">
                    <div className="icon" />
                    <div className="delegate_info">
                      <div className="name">
                        {delegate.name}
                        <span className="count">123 Votes</span>
                      </div>
                      <div className="pitch">
                        <SharedButton type="tertiaryGray" size="small">
                          See pitch
                        </SharedButton>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
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
            display: flex;
            align-items: center;
            width: 100%;
          }
          .delegate_info {
            display: flex;
            width: 100%;
            justify-content: space-between;
            margin-left: 12px;
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

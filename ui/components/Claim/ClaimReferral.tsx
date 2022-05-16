import React, { ReactElement } from "react"
import {
  chooseDAO,
  selectClaimSelections,
  DAO,
} from "@tallyho/tally-background/redux-slices/claim"
import { formatCurrencyAmount } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { selectMainCurrencySymbol } from "@tallyho/tally-background/redux-slices/selectors"
import classNames from "classnames"
import ClaimAmountBanner from "./ClaimAmountBanner"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"

function DAOButton(props: {
  address: string
  name: string
  avatar: string
  isActive: boolean
}) {
  const { address, name, avatar, isActive } = props
  const dispatch = useBackgroundDispatch()

  return (
    <button
      type="button"
      className={classNames("option", { active: isActive })}
      onClick={() => {
        dispatch(chooseDAO({ address, name, avatar }))
      }}
    >
      <div className="icon" />
      <div className="name">{name}</div>
      <div className="radio" />
      <style jsx>{`
        .option {
          width: 168px;
          height: 136px;
          border-radius: 8px;
          background-color: var(--green-95);
          margin-bottom: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          box-shadow: var(--shadow);
        }
        .icon {
          width: 48px;
          height: 48px;
          background-color: #006ae3;
          border-radius: 200px;
          margin-bottom: 8px;
          background: url("./images/DAOs/${avatar}");
          background-size: cover;
        }
        .radio {
          width: 16px;
          height: 16px;
          border: 2px solid var(--green-60);
          border-radius: 200px;
          margin-top: 8px;
          box-sizing: border-box;
        }
        .option:hover {
          background-color: var(--green-80);
        }
        .active .radio {
          border: 5px solid var(--trophy-gold);
        }
      `}</style>
    </button>
  )
}

export default function ClaimReferral(props: {
  DAOs: DAO[]
  claimAmount: number
}): ReactElement {
  const { DAOs, claimAmount } = props
  const { selectedDAO } = useBackgroundSelector(selectClaimSelections)
  const mainCurrency = useBackgroundSelector(selectMainCurrencySymbol)
  const amountWithBonus = formatCurrencyAmount(
    mainCurrency,
    claimAmount * 0.05,
    2
  )

  return (
    <div className="claim standard_width">
      <ClaimAmountBanner amount={claimAmount} showLabel />
      <div className="title">
        Get a bonus of
        <div className="highlight">{amountWithBonus}</div>
        DOGGO!
      </div>
      <div className="description">
        {`Select a Project/DAO to share the bonus with! You each receive ${amountWithBonus} DOGGO!`}
      </div>
      <div className="options">
        {DAOs.map(({ address, name, avatar }) => {
          return (
            <DAOButton
              address={address}
              name={name}
              avatar={avatar}
              isActive={selectedDAO?.name === name}
            />
          )
        })}
      </div>
      <style jsx>
        {`
          .claim {
            display: flex;
            flex-flow: column;
            flex-grow: 1;
          }
          .title {
            height: 32px;
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            display: flex;
            align-items: center;
            margin-top: 25px;
            margin-bottom: 11px;
          }
          .description {
            font-size: 16px;
            line-height: 24px;
            color: var(--green-40);
            margin-bottom: 30px;
          }
          .options {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
          }
          .highlight {
            color: var(--success);
            font-size: 36px;
            font-weight: 500;
            line-height: 42px;
            font-family: Quincy CF;
            margin: 0px 8px;
          }
        `}
      </style>
    </div>
  )
}

import React, { ReactElement } from "react"
import {
  HIDE_ADD_SEED,
  HIDE_CREATE_PHRASE,
} from "@tallyho/tally-background/features/features"
import { useHistory } from "react-router-dom"
import { isLedgerSupported } from "@tallyho/tally-background/services/ledger"
import SharedButton from "../../components/Shared/SharedButton"

const accountCreateButtonInfos = [
  {
    title: "Add exising accounts",
    items: [
      {
        label: "Import recovery phrase",
        icon: "./images/metamask_icon@2x.png",
        url: "/onboarding/import-metamask",
        featureFlag: HIDE_ADD_SEED,
      },
      {
        label: "Connect to Ledger",
        icon: "./images/ledger_icon@2x.png",
        onClick: () => {
          window.open("/tab.html#/ledger", "_blank")?.focus()
          window.close()
        },
        featureFlag: isLedgerSupported,
      },
      {
        label: "Read-only address",
        icon: "./images/preview_icon@2x.png",
        url: "/onboarding/view-only-wallet",
        featureFlag: true,
      },
    ],
  },
  {
    title: "Add new recovery phrase",
    items: [
      {
        label: "Create new wallet",
        icon: "./images/tally_circle_icon@2x.png",
        url: "/onboarding/onboarding-interstitial-create-phrase",
        featureFlag: HIDE_CREATE_PHRASE,
      },
    ],
  },
]

export default function OnboardingStartTheHunt(): ReactElement {
  const history = useHistory()

  return (
    <section className="start_wrap">
      <div className="top standard_width">
        <h1>Add accounts</h1>
        <button
          type="button"
          aria-label="close"
          className="icon_close"
          onClick={() => {
            history.push("/")
          }}
        />
      </div>
      <ul className="standard_width">
        {accountCreateButtonInfos.map((creationSection) => {
          return (
            <>
              <li className="label_small">{creationSection.title}</li>
              {creationSection.items.map((addWalletAction) => {
                return (
                  <SharedButton
                    type="unstyled"
                    size="medium"
                    linkTo={addWalletAction.url}
                    onClick={addWalletAction.onClick}
                  >
                    <li className="option standard_width">
                      <div className="left">
                        <img
                          className="icon preview_icon"
                          src={addWalletAction.icon}
                          alt={`${addWalletAction.label} icon`}
                        />

                        {addWalletAction.label}
                      </div>

                      <div className="icon_chevron_right" />
                    </li>
                  </SharedButton>
                )
              })}
            </>
          )
        })}
      </ul>
      <style jsx>
        {`
          section {
            padding-top: 15px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: var(--hunter-green);
          }
          .top {
            display: flex;
            width: 100%;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
          }
          h1 {
            color: #fff;
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
          }
          .label_small {
            margin-bottom: 16px;
            display: block;
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            display: flex;
            align-items: center;
          }
          .option {
            display: flex;
            height: 64px;
            border-radius: 16px;
            background-color: var(--green-95);
            align-items: center;
            padding: 16px;
            box-sizing: border-box;
            margin-bottom: 24px;
            color: var(--green-40);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            justify-content: space-between;
          }
          .option:hover {
            background-color: var(--green-80);
          }
          .icon {
            width: 32px;
            height: 32px;
            background-color: var(--gold-20);
            border-radius: 8px;
            margin-right: 10px;
          }
          .label_small:last-of-type {
            margin-top: 70px;
          }
          .icon_chevron_right {
            mask-image: url("./images/chevron_right@2x.png");
            mask-size: cover;
            background-color: var(--green-40);
            width: 16px;
            height: 16px;
          }
          .left {
            display: flex;
            align-items: center;
          }
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            width: 11px;
            height: 11px;
            background-color: var(--green-40);
            margin-right: 10px;
            margin-top: 2px;
          }
          .icon_close:hover {
            background-color: var(--green-20);
          }
        `}
      </style>
    </section>
  )
}

import React, { ReactElement } from "react"
import { isLedgerSupported } from "@tallyho/tally-background/services/ledger"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedIcon from "../../../components/Shared/SharedIcon"

const accountCreateButtonInfos = [
  {
    items: [
      {
        label: "Import recovery phrase",
        icon: "./images/add_wallet/import.svg",
        url: "/onboarding/import-seed/set-password",
        isAvailable: true,
      },
      {
        label: "Connect to Ledger",
        icon: "./images/add_wallet/ledger.svg",
        url: "/onboarding/ledger",
        isAvailable: isLedgerSupported,
      },
      {
        label: "Read-only address",
        icon: "./images/add_wallet/preview.svg",
        url: "/onboarding/view-only-wallet",
        isAvailable: true,
      },
    ],
  },
]

function AddWalletRow({
  icon,
  url,
  children,
  onClick,
}: {
  icon: string
  children: React.ReactNode
  url?: string
  onClick?: () => void
}) {
  return (
    <li>
      <SharedButton
        type="unstyled"
        size="medium"
        linkTo={url}
        onClick={onClick}
      >
        <div className="option standard_width">
          <div className="left">
            <img
              className="icon preview_icon"
              src={icon}
              alt={`${icon} icon`}
            />
            {children}
          </div>

          <div className="icon_chevron_right" />
          <SharedIcon
            icon="chevron_right.svg"
            width={16}
            color="var(--green-40)"
          />
        </div>
      </SharedButton>
      <style jsx>{`
        .left {
          display: flex;
          align-items: center;
        }
        .option {
          display: flex;
          height: auto;
          border-radius: 0;
          background-color: var(--green-95);
          align-items: center;
          padding: 20px 0;
          box-sizing: border-box;
          margin-bottom: 0px;
          color: var(--green-40);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          justify-content: space-between;
        }
        .option:hover {
          color: var(--trophy-gold);
        }
        .option:hover button {
          background-color: var(--trophy-gold) !important;
        }
        li:nth-of-type(2) .option {
          border-top: 1px solid black;
          border-bottom: 1px solid black;
        }
        .icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          margin-right: 10px;
        }
      `}</style>
    </li>
  )
}

export default function AddWallet(): ReactElement {
  return (
    <>
      <div className="button_sections_wrap">
        {accountCreateButtonInfos.map((creationSection) => {
          return (
            <section>
              <div className="illustration_section">
                <div className="illustration" />
                <div className="forest" />
              </div>
              <div className="bottom_content">
                <h1 className="bottom_title">Use existing wallet</h1>
              </div>
              <ul>
                {creationSection.items.map(
                  ({ label, icon, url, isAvailable }) =>
                    isAvailable ? (
                      <AddWalletRow icon={icon} url={url}>
                        {label}
                      </AddWalletRow>
                    ) : (
                      <></>
                    )
                )}
              </ul>
            </section>
          )
        })}
      </div>

      <style jsx>
        {`
          section {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          ul {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: var(--green-95);
            border-radius: 1em;
            padding: 1em;
          }
          li {
            border-top: 1px solid black;
          }
          .button_sections_wrap {
            height: 500px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .top {
            display: flex;
            width: 100%;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            padding-top: 68.5px;
          }
          h1 {
            font-family: "Quincy CF";
            font-weight: 500;
            font-size: 46px;
            line-height: 42px;
            margin: 1em auto;
          }
          h2 {
            width: 100%;
            margin-bottom: 16px;
            display: block;
            color: var(--green-40);
            font-size: 16px;
            line-height: 24px;
            display: flex;
            align-items: center;
          }
          .icon_close {
            mask-image: url("./images/close.svg");
            mask-size: cover;
            width: 11px;
            height: 11px;
            margin-right: 10px;
            margin-top: 2px;
          }
          .icon_close:hover {
            background-color: var(--green-20);
          }
          .illustration {
            background: url("./images/doggo_gold.svg");
            background-size: cover;
            width: 120px;
            height: 120px;
            flex-shrink: 0;
            left: 0;
            right: 0;
            margin: 0 auto;
            margin-top: 0;
            position: absolute;
            animation: fadeIn ease 0.5s;
          }
          .forest {
            background-size: cover;
            width: 384px;
            height: 141px;
            align-self: flex-end;
            justify-self: flex-end;
            z-index: 1;
          }
        `}
      </style>
    </>
  )
}

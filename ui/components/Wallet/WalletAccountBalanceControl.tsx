import React, { ReactElement, useCallback, useState } from "react"
import classNames from "classnames"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"

function ReadOnlyNotice(): ReactElement {
  return (
    <div className="notice_wrap">
      <div className="icon_eye" />
      Read-only mode
      <style jsx>{`
        .notice_wrap {
          width: 177px;
          height: 40px;
          background: rgba(238, 178, 24, 0.1);
          border-radius: 2px;
          margin-top: 12px;
          font-weight: 500;
          font-size: 16px;
          display: flex;
          align-items: center;
          border-left: solid 2px var(--attention);
        }
        .icon_eye {
          background: url("./images/eye@2x.png");
          background-size: cover;
          width: 24px;
          height: 24px;
          margin: 0px 7px 0px 10px;
        }
      `}</style>
    </div>
  )
}

interface Props {
  balance: string
  initializationLoadingTimeExpired: boolean
}

export default function WalletAccountBalanceControl(
  props: Props
): ReactElement {
  const { balance, initializationLoadingTimeExpired } = props
  const keyringImport = useBackgroundSelector(
    (state) => state.keyrings.importing
  )
  const [openReceiveMenu, setOpenReceiveMenu] = useState(false)
  const hasSavedSeed = window.localStorage.getItem("hasSavedSeed")

  /*
   * Check to see if a keyring has been imported.
   * If not, we can assume they're using a read-only wallet.
   * Currently the wallet tab incorrectly merges all accounts
   * together. So we'll need to,
   * TODO: Give this multi-account support.
   */
  const isViewOnlyWallet = keyringImport !== "done"

  const handleClick = useCallback(() => {
    setOpenReceiveMenu((currentlyOpen) => !currentlyOpen)
  }, [])

  // An arbitrary minimum balance overrides loading state
  // to give the user faster results.
  const shouldIndicateLoading =
    !initializationLoadingTimeExpired && !(parseInt(balance, 10) > 10)

  return (
    <>
      <SharedSlideUpMenu isOpen={openReceiveMenu} close={handleClick}>
        {Receive()}
      </SharedSlideUpMenu>
      <div className="wrap">
        <div
          className={classNames("balance_label", {
            balance_label_loading: shouldIndicateLoading,
          })}
        >
          Total account balance
        </div>
        <span className="balance_area">
          <span
            className={classNames("balance", {
              balance_loading: shouldIndicateLoading,
            })}
          >
            <span className="dollar_sign">$</span>
            {balance}
          </span>
        </span>
        {isViewOnlyWallet ? (
          <ReadOnlyNotice />
        ) : (
          <>
            {hasSavedSeed ? (
              <div className="send_receive_button_wrap">
                <SharedButton
                  icon="send"
                  size="medium"
                  type="primary"
                  linkTo="/send"
                >
                  Send
                </SharedButton>
                <SharedButton
                  onClick={handleClick}
                  icon="receive"
                  size="medium"
                  type="primary"
                >
                  Receive
                </SharedButton>
              </div>
            ) : (
              <div className="save_seed_button_wrap">
                <SharedButton
                  icon="arrow_right"
                  iconSize="large"
                  size="large"
                  type="warning"
                  linkTo="/onboarding/2"
                >
                  First, secure your recovery seed
                </SharedButton>
              </div>
            )}
          </>
        )}
      </div>
      <style jsx>
        {`
          .wrap {
            height: 146px;
            display: flex;
            justify-contnet: space-between;
            align-items: center;
            flex-direction: column;
          }
          .balance_area {
            height: 48px;
          }
          .balance {
            color: #ffffff;
            font-size: 36px;
            font-weight: 500;
            line-height: 48px;
            display: flex;
            align-items: center;
          }
          .send_receive_button_wrap {
            margin-top: 18px;
            display: flex;
            width: 223px;
            justify-content: space-between;
          }
          .balance_label {
            width: 160px;
            height: 24px;
            color: var(--green-40);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
          }
          .dollar_sign {
            width: 14px;
            height: 32px;
            color: var(--green-40);
            font-size: 22px;
            font-weight: 500;
            line-height: 32px;
            text-align: center;
            margin-right: 4px;
            margin-left: -14px;
          }
          .save_seed_button_wrap {
            margin-top: 10px;
          }
          .balance_label_loading {
            opacity: 0;
          }
          .balance_loading {
            background-color: var(--hunter-green);
            color: rgba(0, 0, 0, 0);
            border-radius: 14px;
            animation: pulse 1.1s infinite;
            transform: translateY(-10px);
            width: 250px;
          }
          .balance_loading .dollar_sign {
            color: rgba(0, 0, 0, 0);
          }
          @keyframes pulse {
            0% {
              background-color: var(--hunter-green);
            }
            50% {
              background-color: var(--green-95);
            }
            100 {
              background-color: var(--hunter-green);
            }
          }
        `}
      </style>
    </>
  )
}

WalletAccountBalanceControl.defaultProps = {
  balance: "",
}

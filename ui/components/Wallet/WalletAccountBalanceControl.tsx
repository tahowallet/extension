import React, { ReactElement, useCallback, useState } from "react"
import classNames from "classnames"
import { selectCurrentAccountSigningMethod } from "@tallyho/tally-background/redux-slices/selectors"
import { HIDE_SEND_BUTTON } from "@tallyho/tally-background/features/features"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"

interface Props {
  balance?: string
  initializationLoadingTimeExpired: boolean
}

export default function WalletAccountBalanceControl(
  props: Props
): ReactElement {
  const { balance, initializationLoadingTimeExpired } = props
  const [openReceiveMenu, setOpenReceiveMenu] = useState(false)

  // TODO When non-imported accounts are supported, generalize this.
  const hasSavedSeed = true

  const currentAccountSigningMethod = useBackgroundSelector(
    selectCurrentAccountSigningMethod
  )

  const handleClick = useCallback(() => {
    setOpenReceiveMenu((currentlyOpen) => !currentlyOpen)
  }, [])

  const shouldIndicateLoading =
    !initializationLoadingTimeExpired && typeof balance === "undefined"

  return (
    <>
      <SharedSlideUpMenu isOpen={openReceiveMenu} close={handleClick}>
        <Receive />
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
            {balance ?? 0}
          </span>
        </span>
        <div className="balance_actions">
          {currentAccountSigningMethod && !HIDE_SEND_BUTTON ? (
            <>
              {hasSavedSeed ? (
                <div className="send_receive_button_wrap">
                  <SharedButton
                    icon="send"
                    size="medium"
                    type="tertiary"
                    linkTo="/send"
                    iconPosition="left"
                  >
                    Send
                  </SharedButton>
                  <SharedButton
                    onClick={handleClick}
                    icon="receive"
                    size="medium"
                    type="tertiary"
                    iconPosition="left"
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
          ) : (
            <SharedButton
              linkTo="/onboarding/importMetamask"
              size="medium"
              type="tertiary"
            >
              Upgrade wallet
            </SharedButton>
          )}
        </div>
      </div>
      <style jsx>
        {`
          .wrap {
            display: flex;
            justify-contnet: space-between;
            align-items: center;
            flex-direction: column;
            box-sizing: border-box;
            padding-top: 6px;
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
            display: flex;
            width: 180px;
            justify-content: space-between;
          }
          .balance_actions {
            margin-bottom: 20px;
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
            height: 100%;
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

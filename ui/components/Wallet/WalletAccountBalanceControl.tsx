import React, { ReactElement, useCallback, useState } from "react"
import classNames from "classnames"
import { useDispatch } from "react-redux"
import { refreshBackgroundPage } from "@tallyho/tally-background/redux-slices/ui"
import { selectCurrentAccountSigningMethod } from "@tallyho/tally-background/redux-slices/selectors"
import { HIDE_SEND_BUTTON } from "@tallyho/tally-background/features/features"
import { useBackgroundSelector, useLocalStorage } from "../../hooks"
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
          margin-top: 6px;
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

function BalanceReloader(): ReactElement {
  const dispatch = useDispatch()

  const [isSpinning, setIsSpinning] = useState(false)

  // 0 = never
  const [timeWhenLastReloaded, setTimeWhenLastReloaded] = useLocalStorage(
    "timeWhenLastReloaded",
    "0"
  )

  const loadingTimeMs = 15000
  const timeGapBetweenRunningReloadMs = 60000 * 2

  return (
    <button
      type="button"
      disabled={isSpinning}
      className={classNames("reload", { spinning: isSpinning })}
      onClick={() => {
        const currentTime = new Date().getTime()
        setIsSpinning(true)

        // Appear to spin regardless if too recent. Only refresh
        // background page if timeGapBetweenRunningReloadMs is met.
        if (
          Number(timeWhenLastReloaded) + timeGapBetweenRunningReloadMs <
          currentTime
        ) {
          setTimeWhenLastReloaded(`${currentTime}`)
          dispatch(refreshBackgroundPage())
        }
        setTimeout(() => {
          setIsSpinning(false)
          window.location.reload()
        }, loadingTimeMs)
      }}
    >
      <style jsx>{`
        .reload {
          mask-image: url("./images/reload@2x.png");
          mask-size: cover;
          background-color: #fff;
          width: 17px;
          height: 17px;
          margin-left: 10px;
        }
        .reload:hover {
          background-color: var(--trophy-gold);
        }
        .reload:disabled {
          pointer-events: none;
        }
        .spinning {
          animation: spin 1s cubic-bezier(0.65, 0, 0.35, 1) infinite;
        }
        .spinning:hover {
          background-color: #fff;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  )
}

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
            {!shouldIndicateLoading && <BalanceReloader />}
          </span>
        </span>
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
          <ReadOnlyNotice />
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

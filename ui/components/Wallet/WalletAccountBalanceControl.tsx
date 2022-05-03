import React, { ReactElement, useCallback, useState } from "react"
import classNames from "classnames"
import { useDispatch } from "react-redux"
import { refreshBackgroundPage } from "@tallyho/tally-background/redux-slices/ui"
import { selectCurrentAccountSigningMethod } from "@tallyho/tally-background/redux-slices/selectors"
import { useBackgroundSelector, useLocalStorage } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"
import t from "../../utils/i18n"

function ReadOnlyNotice(): ReactElement {
  return (
    <div className="notice_wrap">
      <div className="icon_eye" />
      {t("readOnlyNotice")}
      <style jsx>{`
        .notice_wrap {
          width: 177px;
          height: 40px;
          background: rgba(238, 178, 24, 0.1);
          border-radius: 2px;
          margin: 6px 0 10px;
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
        <SharedSkeletonLoader
          height={48}
          width={250}
          borderRadius={14}
          customStyles="margin: 12px 0"
          isLoaded={!shouldIndicateLoading}
        >
          <div className="balance_label">{t("totalAccountBalance")}</div>
          <span className="balance_area">
            <span className="balance">
              <span className="dollar_sign">$</span>
              {balance ?? 0}
              <BalanceReloader />
            </span>
          </span>
        </SharedSkeletonLoader>

        <SharedSkeletonLoader
          isLoaded={!shouldIndicateLoading}
          width={180}
          customStyles="margin-bottom: 10px;"
        >
          {currentAccountSigningMethod ? (
            <>
              {hasSavedSeed ? (
                <div className="send_receive_button_wrap">
                  <SharedButton
                    iconSmall="send"
                    size="medium"
                    type="tertiary"
                    linkTo="/send"
                    iconPosition="left"
                  >
                    Send
                  </SharedButton>
                  <SharedButton
                    onClick={handleClick}
                    iconSmall="receive"
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
                    iconSmall="arrow-right"
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
        </SharedSkeletonLoader>
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
        `}
      </style>
    </>
  )
}

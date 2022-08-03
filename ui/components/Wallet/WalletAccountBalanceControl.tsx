import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { useDispatch } from "react-redux"
import { refreshBackgroundPage } from "@tallyho/tally-background/redux-slices/ui"
import { selectCurrentAccountSigner } from "@tallyho/tally-background/redux-slices/selectors"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { USE_BALANCE_RELOADER } from "@tallyho/tally-background/features"
import { useBackgroundSelector, useLocalStorage } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"
import ReadOnlyNotice from "../Shared/ReadOnlyNotice"

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
  const { t } = useTranslation()
  const { balance, initializationLoadingTimeExpired } = props
  const [openReceiveMenu, setOpenReceiveMenu] = useState(false)

  // TODO When non-imported accounts are supported, generalize this.
  const hasSavedSeed = true

  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)

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
          <div className="balance_label">{t("wallet.totalAccountBalance")}</div>
          <span className="balance_area">
            <span className="balance">
              <span className="dollar_sign">$</span>
              {balance ?? 0}
              {USE_BALANCE_RELOADER && <BalanceReloader />}
            </span>
          </span>
        </SharedSkeletonLoader>

        <SharedSkeletonLoader
          isLoaded={!shouldIndicateLoading}
          height={24}
          width={180}
          customStyles="margin-bottom: 10px;"
        >
          <ReadOnlyNotice />
          {currentAccountSigner !== ReadOnlyAccountSigner && (
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
                    {t("wallet.send")}
                  </SharedButton>
                  <SharedButton
                    onClick={handleClick}
                    iconSmall="receive"
                    size="medium"
                    type="tertiary"
                    iconPosition="left"
                  >
                    {t("wallet.receive")}
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
                    {t("wallet.secureSeed")}
                  </SharedButton>
                </div>
              )}
            </>
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

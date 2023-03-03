import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  selectCurrentAccountSigner,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import classNames from "classnames"
import { useHistory } from "react-router-dom"
import { NETWORKS_SUPPORTING_SWAPS } from "@tallyho/tally-background/constants"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"
import ReadOnlyNotice from "../Shared/ReadOnlyNotice"
import SharedSquareButton from "../Shared/SharedSquareButton"

type ActionButtonsProps = {
  onReceive: () => void
}

function ActionButtons(props: ActionButtonsProps): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet",
  })
  const { onReceive } = props
  const history = useHistory()
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

  return (
    <div
      className={classNames("action_buttons_wrap", {
        with_icons: isEnabled(FeatureFlags.SUPPORT_NFT_TAB),
      })}
    >
      {isEnabled(FeatureFlags.SUPPORT_NFT_TAB) ? (
        <>
          <div className="button_wrap">
            <SharedSquareButton
              icon="icons/s/send.svg"
              ariaLabel={t("send")}
              onClick={() => history.push("/send")}
            >
              {t("send")}
            </SharedSquareButton>
          </div>
          {NETWORKS_SUPPORTING_SWAPS.has(currentNetwork.chainID) && (
            <div className="button_wrap">
              <SharedSquareButton
                icon="icons/s/swap.svg"
                ariaLabel={t("swap")}
                onClick={() => history.push("/swap")}
                iconColor={{
                  color: "var(--trophy-gold)",
                  hoverColor: "var(--gold-80)",
                }}
              >
                {t("swap")}
              </SharedSquareButton>
            </div>
          )}
          <div className="button_wrap">
            <SharedSquareButton
              icon="icons/s/receive.svg"
              ariaLabel={t("receive")}
              onClick={onReceive}
            >
              {t("receive")}
            </SharedSquareButton>
          </div>
        </>
      ) : (
        <>
          <SharedButton
            iconSmall="send"
            size="medium"
            type="tertiary"
            linkTo="/send"
            iconPosition="left"
          >
            {t("send")}
          </SharedButton>
          <SharedButton
            onClick={onReceive}
            iconSmall="receive"
            size="medium"
            type="tertiary"
            iconPosition="left"
          >
            {t("receive")}
          </SharedButton>
        </>
      )}
      <style jsx>
        {`
          .action_buttons_wrap {
            display: flex;
            width: 180px;
            gap: 16px;
            justify-content: center;
          }
          .action_buttons_wrap.with_icons {
            margin: 8px 0 32px;
            gap: 0;
          }
          .button_wrap {
            margin: 0 7px;
            width: 50px;
            text-align: center;
          }
        `}
      </style>
    </div>
  )
}
interface Props {
  balance?: string
  initializationLoadingTimeExpired: boolean
}

export default function WalletAccountBalanceControl(
  props: Props
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet",
  })
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
          <div className="balance_label">{t("totalAccountBalance")}</div>
          <span className="balance_area">
            <span className="balance" data-testid="wallet_balance">
              <span className="dollar_sign">$</span>
              {balance ?? 0}
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
                <ActionButtons onReceive={handleClick} />
              ) : (
                <div className="save_seed_button_wrap">
                  <SharedButton
                    iconSmall="arrow-right"
                    size="large"
                    type="warning"
                    linkTo="/onboarding/2"
                  >
                    {t("secureSeed")}
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

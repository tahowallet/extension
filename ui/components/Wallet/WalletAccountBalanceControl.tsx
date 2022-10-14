import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { selectCurrentAccountSigner } from "@tallyho/tally-background/redux-slices/selectors"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { FeatureFlagTypes, isEnabled } from "@tallyho/tally-background/features"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"
import ReadOnlyNotice from "../Shared/ReadOnlyNotice"
import BalanceReloader from "../BalanceReloader/BalanceReloader"

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
              {isEnabled(FeatureFlagTypes.USE_BALANCE_RELOADER) && (
                <BalanceReloader />
              )}
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

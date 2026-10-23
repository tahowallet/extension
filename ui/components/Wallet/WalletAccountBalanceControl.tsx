import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  selectCurrentAccountSigner,
  selectCurrentNetwork,
} from "@tallyho/tally-background/redux-slices/selectors"
import { ReadOnlyAccountSigner } from "@tallyho/tally-background/services/signing"
import { useHistory } from "react-router-dom"
import { networkSupportsSwaps } from "@tallyho/tally-background/lib/0x-swap"
import { useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import Receive from "../../pages/Receive"
import ReadOnlyNotice from "../Shared/ReadOnlyNotice"
import SharedSquareButton from "../Shared/SharedSquareButton"
import SharedTooltip from "../Shared/SharedTooltip"
import BalanceLastUpdated from "./BalanceLastUpdated"

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
    <div className="action_buttons_wrap">
      <div className="button_wrap">
        <SharedSquareButton
          icon="icons/s/send.svg"
          ariaLabel={t("send")}
          onClick={() => history.push("/send")}
        >
          {t("send")}
        </SharedSquareButton>
      </div>
      {networkSupportsSwaps(currentNetwork.chainID) ? (
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
      ) : (
        <div className="button_wrap">
          <SharedTooltip
            type="dark"
            width={180}
            height={48}
            horizontalPosition="center"
            verticalPosition="bottom"
            horizontalShift={22}
            style={{
              marginLeft: "0",
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
            IconComponent={() => (
              <SharedSquareButton
                icon="icons/s/swap.svg"
                ariaLabel={t("swap")}
                iconColor={{
                  color: "#3A6565",
                  hoverColor: "#3A6565",
                }}
                disabled
              >
                {t("swap")}
              </SharedSquareButton>
            )}
          >
            <div className="centered_tooltip">
              <div>{t("swapDisabledOne")}</div>
              <div>{t("swapDisabledTwo")}</div>
            </div>
          </SharedTooltip>
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
      <style jsx>
        {`
          .action_buttons_wrap {
            display: flex;
            width: 180px;
            justify-content: center;
            margin: 8px 0 32px;
          }
          .button_wrap {
            margin: 0 7px;
            width: 50px;
            text-align: center;
          }
          .centered_tooltip {
            display: flex;
            font-size: 14px;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
        `}
      </style>
    </div>
  )
}
interface Props {
  balance?: string
  initializationLoadingTimeExpired: boolean
  isNetworkUnreachable: boolean
}

export default function WalletAccountBalanceControl(
  props: Props,
): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet",
  })
  const { t: tUnreachable } = useTranslation("translation", {
    keyPrefix: "networkUnreachable",
  })
  const { balance, initializationLoadingTimeExpired, isNetworkUnreachable } =
    props
  const [openReceiveMenu, setOpenReceiveMenu] = useState(false)

  // TODO When non-imported accounts are supported, generalize this.
  const hasSavedSeed = true

  const currentAccountSigner = useBackgroundSelector(selectCurrentAccountSigner)

  const handleClick = useCallback(() => {
    setOpenReceiveMenu((currentlyOpen) => !currentlyOpen)
  }, [])

  // Unreachable is a third state alongside loading and loaded, and the only
  // one of the three we can say something useful about: there is no point
  // spinning a skeleton for a number that is not coming.
  const shouldIndicateLoading =
    !isNetworkUnreachable &&
    !initializationLoadingTimeExpired &&
    typeof balance === "undefined"

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
          testId="account_balance_loader"
          style={{ margin: "12px 0" }}
          isLoaded={!shouldIndicateLoading}
        >
          <div className="balance_label">{t("totalAccountBalance")}</div>
          <span className="balance_area">
            <span className="balance" data-testid="wallet_balance">
              {/*
               * A zero here would be a claim, and the wrong one: an
               * unreachable chain tells us nothing about what this account
               * holds, only that we cannot see it right now.
               */}
              {isNetworkUnreachable ? (
                tUnreachable("balancePlaceholder")
              ) : (
                <>
                  <span className="dollar_sign">$</span>
                  {balance ?? 0}
                </>
              )}
            </span>
          </span>
          {isNetworkUnreachable && <BalanceLastUpdated />}
        </SharedSkeletonLoader>

        <SharedSkeletonLoader
          isLoaded={!shouldIndicateLoading}
          height={24}
          width={180}
          style={{ marginBottom: 10 }}
        >
          <ReadOnlyNotice />
          {currentAccountSigner !== ReadOnlyAccountSigner &&
            (hasSavedSeed ? (
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
            ))}
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
            width: 165px;
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

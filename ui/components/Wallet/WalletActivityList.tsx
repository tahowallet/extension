import React, { ReactElement, useCallback, useEffect, useState } from "react"
import { setShowingActivityDetail } from "@tallyho/tally-background/redux-slices/ui"
import {
  selectCurrentAccount,
  selectCurrentNetwork,
  selectShowingActivityDetail,
} from "@tallyho/tally-background/redux-slices/selectors"
import { useTranslation } from "react-i18next"
import { Activity } from "@tallyho/tally-background/redux-slices/activities"
import { ALCHEMY_SUPPORTED_CHAIN_IDS } from "@tallyho/tally-background/constants"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import WalletActivityDetails from "./WalletActivityDetails"
import WalletActivityListItem from "./WalletActivityListItem"
import { scanWebsite } from "../../utils/constants"
import SharedButton from "../Shared/SharedButton"

type Props = {
  activities: Activity[]
}

export default function WalletActivityList({
  activities,
}: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "wallet.activities",
  })
  const dispatch = useBackgroundDispatch()
  const showingActivityDetail = useBackgroundSelector(
    selectShowingActivityDetail
  )

  // Used to fix Tx Details Slide-up menu should close
  // when extension closes. (#618)
  const [instantlyHideActivityDetails, setInstantlyHideActivityDetails] =
    useState(true)

  const network = useBackgroundSelector(selectCurrentNetwork)
  const scanWebsiteInfo = scanWebsite[network.chainID]

  useEffect(() => {
    setInstantlyHideActivityDetails(true)
    dispatch(setShowingActivityDetail(null))
  }, [dispatch])

  const activityInitiatorAddress =
    useBackgroundSelector(selectCurrentAccount).address

  const openExplorer = useCallback(() => {
    window
      .open(
        `${scanWebsiteInfo.url}/address/${activityInitiatorAddress}`,
        "_blank"
      )
      ?.focus()
  }, [scanWebsiteInfo, activityInitiatorAddress])

  const handleOpen = useCallback(
    (activityItem: Activity) => {
      setInstantlyHideActivityDetails(false)
      dispatch(setShowingActivityDetail(activityItem.hash))
    },
    [dispatch]
  )

  const handleClose = useCallback(() => {
    dispatch(setShowingActivityDetail(null))
  }, [dispatch])

  if (!activities || activities.length === 0)
    return (
      <span>
        {ALCHEMY_SUPPORTED_CHAIN_IDS.has(network.chainID)
          ? t("historicalActivityExplainer")
          : t("defaultHistoricalActivityExplainer")}
        <style jsx>{`
          span {
            width: 316px;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: var(--green-40);
            font-size: 16px;
            text-align: center;
            line-height: 22px;
            margin: 0 auto;
            margin-top: 15px;
          }
        `}</style>
      </span>
    )

  return (
    <>
      {!instantlyHideActivityDetails && (
        <SharedSlideUpMenu isOpen={!!showingActivityDetail} close={handleClose}>
          {showingActivityDetail ? (
            <WalletActivityDetails
              activityItem={showingActivityDetail}
              activityInitiatorAddress={activityInitiatorAddress}
            />
          ) : (
            <></>
          )}
        </SharedSlideUpMenu>
      )}

      <ul>
        {activities.map((activityItem) => {
          if (activityItem) {
            return (
              <WalletActivityListItem
                onClick={() => {
                  handleOpen(activityItem)
                }}
                key={activityItem?.hash}
                activity={activityItem}
                activityInitiatorAddress={activityInitiatorAddress}
              />
            )
          }
          return <></>
        })}
      </ul>
      <span>
        <div className="hand">✋</div>
        <div>{t("endOfList")}</div>
        {scanWebsiteInfo && (
          <div className="row">
            {t("moreHistory")}
            <SharedButton
              type="tertiary"
              size="small"
              iconSmall="new-tab"
              onClick={openExplorer}
              style={{ padding: 0, fontWeight: 400 }}
            >
              {scanWebsiteInfo?.title}
            </SharedButton>
          </div>
        )}
        <style jsx>{`
          span {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: var(--green-20);
            font-size: 16px;
            font-weight: 400;
            line-height: 24px;
            text-align: center;
          }
          .row {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }
          .hand {
            margin: 10px 0px;
            font-size: 22px;
          }
          div:last-child {
            margin-bottom: 40px;
          }
        `}</style>
      </span>
    </>
  )
}

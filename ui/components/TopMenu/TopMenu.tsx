import React, { ReactElement, useState } from "react"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useTranslation } from "react-i18next"
import { setSelectedNetwork } from "@tallyho/tally-background/redux-slices/ui"
import TopMenuProtocolSwitcher from "./TopMenuProtocolSwitcher"
import TopMenuProfileButton from "./TopMenuProfileButton"

import BonusProgramModal from "../BonusProgram/BonusProgramModal"
import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import TopMenuProtocolList from "./TopMenuProtocolList"

import { useBackgroundDispatch } from "../../hooks"
import DAppConnection from "../DAppConnection/DAppConnection"

export default function TopMenu(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "topMenu" })

  const [isProtocolListOpen, setIsProtocolListOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isBonusProgramOpen, setIsBonusProgramOpen] = useState(false)

  const dispatch = useBackgroundDispatch()

  return (
    <>
      <BonusProgramModal
        isOpen={isBonusProgramOpen}
        onClose={() => {
          setIsBonusProgramOpen(false)
        }}
      />
      <SharedSlideUpMenu
        isOpen={isProtocolListOpen}
        isScrollable
        style={{ display: "flex", flexDirection: "column" }}
        close={() => {
          setIsProtocolListOpen(false)
        }}
      >
        <TopMenuProtocolList
          onProtocolChange={(network) => {
            dispatch(setSelectedNetwork(network))
            setIsProtocolListOpen(false)
          }}
        />
      </SharedSlideUpMenu>
      <SharedSlideUpMenu
        isOpen={isNotificationsOpen}
        allowOverflow
        testid="accounts_list_slide_up"
        close={() => {
          setIsNotificationsOpen(false)
        }}
      >
        <AccountsNotificationPanel
          onCurrentAddressChange={() => setIsNotificationsOpen(false)}
        />
      </SharedSlideUpMenu>
      <DAppConnection />
      <nav>
        <TopMenuProtocolSwitcher onClick={() => setIsProtocolListOpen(true)} />
        <div className="profile_group">
          {isEnabled(FeatureFlags.SHOW_TOKEN_FEATURES) && (
            <button
              type="button"
              aria-label={t("rewardsProgram")}
              className="gift_button"
              onClick={() => {
                setIsBonusProgramOpen(!isBonusProgramOpen)
              }}
            />
          )}
          <TopMenuProfileButton
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen)
            }}
          />
        </div>
      </nav>

      <style jsx>
        {`
          nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;

            padding: 0 16px 0 13px;
          }
          .profile_group {
            display: flex;
            align-items: center;
            min-width: 0; // Allow the account address/name to collapse to an ellipsis.
          }
          button {
            border-radius: 12px;
            border: solid 3px var(--hunter-green);
            width: 32px;
            height: 32px;
            margin-right: 2px;
          }
          button:hover {
            background-color: var(--green-80);
          }
          .gift_button {
            background: url("./images/gift@2x.png") center no-repeat;
            background-size: 24px 24px;
          }
        `}
      </style>
    </>
  )
}

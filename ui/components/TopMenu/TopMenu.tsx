import React, { ReactElement, useState } from "react"
import { FeatureFlags, isEnabled } from "@tallyho/tally-background/features"
import { useTranslation } from "react-i18next"
import { setSelectedNetwork } from "@tallyho/tally-background/redux-slices/ui"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import TopMenuProtocolSwitcher from "./TopMenuProtocolSwitcher"
import TopMenuProfileButton from "./TopMenuProfileButton"

import BonusProgramModal from "../BonusProgram/BonusProgramModal"
import AccountsNotificationPanel from "../AccountsNotificationPanel/AccountsNotificationPanel"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"
import SelectNetworkMenuContent from "./SelectNetworkMenuContent"

import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import DAppConnection from "../DAppConnection/DAppConnection"

export default function TopMenu(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "topMenu" })

  const [isProtocolListOpen, setIsProtocolListOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isBonusProgramOpen, setIsBonusProgramOpen] = useState(false)

  const dispatch = useBackgroundDispatch()
  const currentNetwork = useBackgroundSelector(selectCurrentNetwork)

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
        close={() => {
          setIsProtocolListOpen(false)
        }}
      >
        <SelectNetworkMenuContent
          currentNetwork={currentNetwork}
          onNetworkChange={(network) => {
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
            /*
             * The network name gives way before the account name does, so
             * the account side doesn't shrink until its name is past about
             * 200px (the rest is the avatar); past that it collapses to an
             * ellipsis.
             */
            flex-shrink: 0;
            max-width: 240px;
            min-width: 0;
          }
          button {
            border-radius: 12px;
            border: solid 3px var(--hunter-green);
            width: 32px;
            height: 32px;
            margin-right: 2px;
            transition: background-color var(--fade);
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

import { selectFilteredAbilities } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../components/Shared/SharedButton"
import AbilityCard from "./Abilities/AbilityCard"
import { useBackgroundSelector } from "../hooks"
import SharedSlideUpMenu from "../components/Shared/SharedSlideUpMenu"
import AbilityFilter from "./Abilities/AbilityFilter"
import { ONBOARDING_ROOT } from "./Onboarding/Tabbed/Routes"
import SharedFilterTooltip from "../components/Shared/SharedFilterTooltip"
import CorePage from "../components/Core/CorePage"

export default function Abilities(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "abilities",
  })
  const [openFilterMenu, setOpenFilterMenu] = useState(false)
  const abilities = useBackgroundSelector(selectFilteredAbilities)

  const handleToggleClick = useCallback(() => {
    setOpenFilterMenu((currentlyOpen) => !currentlyOpen)
  }, [])

  return (
    <CorePage hasTabBar>
      <section className="standard_width_padded">
        <SharedSlideUpMenu isOpen={openFilterMenu} close={handleToggleClick}>
          <AbilityFilter />
        </SharedSlideUpMenu>
        <div className="content">
          <div className="header">
            <div className="icon_tail logo" />
            <h1>{t("header")}</h1>
            <SharedFilterTooltip
              keyPrefix="abilities"
              isOpen={openFilterMenu}
              setIsOpen={setOpenFilterMenu}
            />
          </div>
          {abilities.length > 0 ? (
            abilities.map((ability, id) => {
              const key = `${ability.abilityId}-${id}`
              return <AbilityCard key={key} ability={ability} />
            })
          ) : (
            <div className="empty_page">
              <div className="icon_tail" />
              <div className="title">{t("emptyState.title")}</div>
              <div className="desc">{t("emptyState.desc")}</div>
              <SharedButton
                type="secondary"
                size="medium"
                iconSmall="add"
                iconPosition="left"
                onClick={() => {
                  window.open(ONBOARDING_ROOT)
                  window.close()
                }}
              >
                {t("emptyState.addBtn")}
              </SharedButton>
            </div>
          )}
        </div>
        <style jsx>
          {`
            .header {
              display: flex;
              flex-direction: row;
              align-items: center;
            }
            h1 {
              font-weight: 500;
              font-size: 22px;
              line-height: 32px;
            }
            section {
              height: 544px;
              width: 100%;
              background: var(--abilities-gradient);
              padding: 0;
              overflow: hidden;
            }
            .content {
              display: flex;
              flex-flow: column;
              padding: 0px 16px;
              height: 100%;
              overflow-y: scroll;
              overflow-x: hidden;
              position: relative;
            }
            .empty_page {
              display: flex;
              flex-direction: column;
              gap: 16px;
              align-items: center;
              margin-top: 24px;
            }
            .title {
              font-family: Quincy CF;
              font-style: normal;
              font-weight: 500;
              font-size: 36px;
              line-height: 42px;
            }
            .desc {
              font-family: Segment;
              font-style: normal;
              font-weight: 500;
              font-size: 16px;
              line-height: 24px;
              color: var(--green-20);
              text-align: center;
            }
            .icon_tail {
              background: url("./images/tail.svg");
              background-size: 82px 82px;
              width: 82px;
              height: 82px;
              border-radius: 24px;
            }
            .logo {
              background-size: 32px 32px;
              width: 32px;
              height: 32px;
              margin-right: 16px;
            }
          `}
        </style>
      </section>
    </CorePage>
  )
}

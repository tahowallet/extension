import { selectFilteredAbilities } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import SharedButton from "../components/Shared/SharedButton"
import AbilityCard from "./Abilities/AbilityCard"

export default function Abilities(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "abilities",
  })
  const abilities = useSelector(selectFilteredAbilities)

  return (
    <>
      <section className="standard_width_padded">
        <div className="header">
          {/* @TODO change icon */}
          <div className="icon_daylight" />
          <h1>{t("header")}</h1>
        </div>
        {abilities.length > 0 ? (
          abilities.map((ability) => (
            <AbilityCard key={ability.abilityId} ability={ability} />
          ))
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
              linkTo="/onboarding/add-wallet"
            >
              {t("emptyState.addBtn")}
            </SharedButton>
          </div>
        )}
      </section>
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
            display: flex;
            flex-flow: column;
            height: 544px;
            width: 100%;
            background: radial-gradient(
                103.39% 72.17% at -5.73% -7.67%,
                rgb(247, 103, 52, 0.5) 0%,
                rgba(19, 48, 46, 0) 100%
              ),
              radial-gradient(
                78.69% 248.21% at 114.77% 133.93%,
                rgba(9, 86, 72, 0.85) 0%,
                rgba(0, 37, 34, 0) 100%
              );
            padding: 0px 24px;
          }
          .icon_daylight {
            background: url("./images/assets/daylight.png");
            background-size: 39px 22px;
            width: 39px;
            height: 22px;
            margin-right: 20px;
          }
          .empty_page {
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: center;
            margin-top: 38px;
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
            background-size: 70px 70px;
            border-radius: 24px;
            width: 64px;
            height: 64px;
          }
        `}
      </style>
    </>
  )
}

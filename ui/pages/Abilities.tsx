import { selectFilteredAbilities } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import AbilityCard from "./Abilities/AbilityCard"

export default function Abilities(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "overview.abilities",
  })
  const abilities = useSelector(selectFilteredAbilities)

  return (
    <>
      <section className="standard_width_padded">
        <div className="title">
          <div className="icon_tail" />
          <h1> {t("title")}</h1>
        </div>
        {abilities.map((ability) => (
          <AbilityCard key={ability.abilityId} ability={ability} />
        ))}
      </section>
      <style jsx>
        {`
          .title {
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
            background-color: var(--hunter-green);
          }
          .icon_tail {
            background: url("./images/tail.svg");
            background-size: 32px 32px;
            width: 32px;
            height: 32px;
            margin-right: 16px;
            border-radius: 24px;
          }
        `}
      </style>
    </>
  )
}

import { selectActiveAbilities } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useSelector } from "react-redux"
import AbilityCard from "./Abilities/AbilityCard"

export default function Abilities(): ReactElement {
  const abilities = useSelector(selectActiveAbilities)

  return (
    <>
      <section className="standard_width_padded">
        <div className="title">
          <div className="icon_daylight" />
          <h1>Daylight Abilities!</h1>
        </div>
        {abilities.map((ability) => (
          <AbilityCard ability={ability} />
        ))}
      </section>
      <style jsx>
        {`
          .title {
            display: flex;
            flex-direction: row;
            align-items: center;
          }
          section {
            display: flex;
            flex-flow: column;
            height: 544px;
            background-color: var(--hunter-green);
          }
          .icon_daylight {
            background: url("./images/assets/daylight.png");
            background-size: 39px 22px;
            width: 39px;
            height: 22px;
            margin-right: 8px;
          }
        `}
      </style>
    </>
  )
}

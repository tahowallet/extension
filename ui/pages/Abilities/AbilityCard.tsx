import { Ability } from "@tallyho/tally-background/services/abilities"
import React, { ReactElement } from "react"

// eslint-disable-next-line import/prefer-default-export
const AbilityCard = ({ ability }: { ability: Ability }): ReactElement => {
  return (
    <>
      <div className="ability_card">
        {ability.type}
        <br />
        {ability.title}
        <br />
        {ability.description?.slice(0, 100)}
        <br />
        {ability.linkUrl}
      </div>
      <style jsx>
        {`
          .ability_card {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;

            width: 310px;
            height: 263px;

            background: rgba(4, 20, 20, 0.4);
            border-radius: 12px;
          }
        `}
      </style>
    </>
  )
}

export default AbilityCard

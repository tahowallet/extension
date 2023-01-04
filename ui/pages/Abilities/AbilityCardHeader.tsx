import React, { ReactElement } from "react"
import { Ability } from "@tallyho/tally-background/services/abilities"
import AbilityLabel from "./AbilityLabel"

const getRequirementLabel = (ability: Ability): string => {
  if (ability.requirement.type === "hold") {
    return `Hold ${ability.requirement.address.slice(0, 6)}...`
  }

  if (ability.requirement.type === "allowList") {
    return `Whitelisted`
  }
  return ""
}

function AbilityCardHeader({ ability }: { ability: Ability }): ReactElement {
  return (
    <>
      <div className="header">
        <AbilityLabel type={ability.type} />
        <div className="requirement_info">
          <span>{getRequirementLabel(ability)}</span>
          <span>{`${ability.address.slice(0, 8)}...`}</span>
        </div>
      </div>
      <style jsx>{`
        .header {
          display: flex;
          width: 100%;
          flex-direction: row;
          align-items: center;
          justify-content: flex-start;
        }
        .requirement_info {
          display: flex;
          flex-direction: row;
          margin-left: 8px;
          width: 100%;
          justify-content: space-between;
          font-family: "Segment";
          font-style: normal;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          align-items: center;
          letter-spacing: 0.03em;
          color: #b4cac9;
        }
      `}</style>
    </>
  )
}

export default AbilityCardHeader

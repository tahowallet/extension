import {
  AbilityType,
  ABILITY_TYPE_COLOR,
} from "@tallyho/tally-background/abilities"
import React, { ReactElement } from "react"
import { capitalize } from "../../utils/textUtils"

function AbilityLabel({ type }: { type: AbilityType }): ReactElement {
  return (
    <>
      <div
        style={{
          color: ABILITY_TYPE_COLOR[type] || "white",
          borderColor: ABILITY_TYPE_COLOR[type] || "white",
        }}
        className="icon_type"
      >
        <span className="label_text">{capitalize(type)}</span>
      </div>
      <style jsx>
        {`
          .icon_type {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 8px;
            height: 24px;
            width: fit-content;
            padding: 0px 8px;

            border: 1.5px solid;
            border-radius: 32px;
          }

          .label_text {
            font-family: "Segment";
            font-style: normal;
            font-weight: 500;
            font-size: 14px;
            line-height: 16px;

            display: flex;
            align-items: center;
            letter-spacing: 0.03em;
          }
        `}
      </style>
    </>
  )
}

export default AbilityLabel

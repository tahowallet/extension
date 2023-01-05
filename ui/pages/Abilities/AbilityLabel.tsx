import React, { ReactElement } from "react"
import type { AbilityType } from "@tallyho/tally-background/services/abilities"
import capitalize from "../../utils/capitalize"

const typeColor = {
  mint: "#20c580",
  airdrop: "#FF1E6F",
  access: "#02C0EA",
}

function AbilityLabel({ type }: { type: AbilityType }): ReactElement {
  return (
    <>
      <div
        style={{
          color: typeColor[type] || "white",
          borderColor: typeColor[type] || "white",
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

import React, { ReactElement } from "react"
import type { AbilityType } from "@tallyho/tally-background/services/abilities"

const AbilityLabel = ({ type }: { type: AbilityType }): ReactElement => {
  return (
    <>
      <div className="icon_type" />
      <style jsx>
        {`
          .icon_type {
            background: url("./images/abilities/${type}@2x.png");
            background-size: cover;
            width: 46px;
            height: 24px;
          }
        `}
      </style>
    </>
  )
}

export default AbilityLabel

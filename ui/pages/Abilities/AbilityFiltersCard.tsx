import { AbilityType } from "@tallyho/tally-background/abilities"
import React, { ReactElement } from "react"
import SharedToggleButton from "../../components/Shared/SharedToggleButton"
import { ABILITY_TYPE_COLOR } from "../../utils/constants"
import { capitalize } from "../../utils/textUtils"

type AbilityFiltersCardProps = {
  type: AbilityType
  description: string
  checked: boolean
  onChange: (toggleValue: boolean) => void
}

function AbilityFiltersCard({
  type,
  description,
  checked,
  onChange,
}: AbilityFiltersCardProps): ReactElement {
  return (
    <div className="content">
      <div className="header">
        <div className="title">{capitalize(type)}</div>
        <SharedToggleButton onChange={onChange} value={checked} />
      </div>
      <div className="simple_text">{description}</div>
      <style jsx>
        {`
          .content {
            background: var(--hunter-green);
            border-radius: 6px;
            padding: 16px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
          }
          .title {
            color: ${ABILITY_TYPE_COLOR[type]};
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
          }
        `}
      </style>
    </div>
  )
}

export default AbilityFiltersCard

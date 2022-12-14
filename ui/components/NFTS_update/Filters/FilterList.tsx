import { Filter } from "@tallyho/tally-background/redux-slices/nfts_update"
import React, { ReactElement } from "react"
import FilterListItem from "./FilterListItem"

export default function FilterList({
  filters,
  onChange,
}: {
  filters: Filter[]
  onChange: (filter: Filter) => void
}): ReactElement {
  return (
    <div className="filter_list">
      {filters.map((item) => (
        <FilterListItem
          key={item.id}
          label={item.name}
          avatarURL={item?.thumbnailURL}
          checked={item.isEnabled}
          onChange={(toggleValue) =>
            onChange({ ...item, isEnabled: toggleValue })
          }
        />
      ))}
      <style jsx>{`
        .filter_list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>
    </div>
  )
}

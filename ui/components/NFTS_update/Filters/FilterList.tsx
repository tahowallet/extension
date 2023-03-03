import { Filter } from "@tallyho/tally-background/redux-slices/nfts_update"
import React from "react"
import SharedSkeletonLoader from "../../Shared/SharedSkeletonLoader"
import SharedToggleItem from "../../Shared/SharedToggleItem"

const HEIGHT = 40

const FilterList = React.forwardRef(
  (
    {
      filters,
      isLoaded = true,
      onChange,
      emptyMessage,
    }: {
      filters: Filter[]
      onChange: (filter: Filter) => void
      isLoaded?: boolean
      emptyMessage?: string
    },
    ref
  ) => {
    return (
      <div
        ref={ref as React.RefObject<HTMLDivElement>}
        className="filter_list"
        role="list"
      >
        {filters.length > 0 ? (
          <>
            {filters.map((item) => (
              <SharedSkeletonLoader
                key={item.id}
                isLoaded={isLoaded}
                height={HEIGHT}
              >
                <SharedToggleItem
                  label={item.name}
                  thumbnailURL={item?.thumbnailURL}
                  checked={item.isEnabled}
                  onChange={(toggleValue) =>
                    onChange({ ...item, isEnabled: toggleValue })
                  }
                />
              </SharedSkeletonLoader>
            ))}
          </>
        ) : (
          emptyMessage && (
            <SharedSkeletonLoader
              isLoaded={isLoaded || filters.length === 0}
              height={HEIGHT}
            >
              <span className="message">{emptyMessage}</span>
            </SharedSkeletonLoader>
          )
        )}
        <style jsx>{`
          .filter_list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .message {
            height: ${HEIGHT}px;
            display: flex;
            align-items: center;
          }
        `}</style>
      </div>
    )
  }
)

export default FilterList

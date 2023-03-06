import { Filter } from "@tallyho/tally-background/redux-slices/nfts_update"
import React from "react"
import SharedSkeletonLoader from "../../Shared/SharedSkeletonLoader"
import SharedToggleItem from "../../Shared/SharedToggleItem"

const HEIGHT = 40

type FilterListProps = {
  filters: Filter[]
  onChange: (filter: Filter) => void
  isLoaded?: boolean
  emptyMessage?: string
  testid?: string
}

const FilterList = React.forwardRef<HTMLDivElement, FilterListProps>(
  (props: FilterListProps, ref) => {
    const {
      filters,
      isLoaded = true,
      onChange,
      emptyMessage,
      testid = "nft_filters_list",
    } = props

    return (
      <div ref={ref} className="filter_list" role="list" data-testid={testid}>
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

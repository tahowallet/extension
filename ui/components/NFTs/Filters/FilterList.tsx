import { Filter } from "@tallyho/tally-background/redux-slices/nfts"
import React, { useCallback } from "react"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { useDispatch } from "react-redux"
import SharedSkeletonLoader from "../../Shared/SharedSkeletonLoader"
import SharedToggleItem from "../../Shared/SharedToggleItem"

const HEIGHT = 40

type FilterListProps = {
  filters: Filter[]
  isAccountFilter?: boolean
  onChange: (filter: Filter) => void
  isLoaded?: boolean
  emptyMessage?: string
  testid?: string
}

const FilterList = React.forwardRef<HTMLDivElement, FilterListProps>(
  (props: FilterListProps, ref) => {
    const {
      filters,
      isAccountFilter = false,
      isLoaded = true,
      onChange,
      emptyMessage,
      testid = "nft_filters_list",
    } = props

    const dispatch = useDispatch()

    const copyAddress = useCallback(
      (address: string) => {
        navigator.clipboard.writeText(address)
        dispatch(setSnackbarMessage("Address copied to clipboard"))
      },
      [dispatch],
    )

    return (
      <div ref={ref} className="filter_list" data-testid={testid}>
        {filters.length > 0 ? (
          <>
            {filters.map((item) => (
              <SharedSkeletonLoader
                key={item.id}
                isLoaded={isLoaded}
                height={HEIGHT}
              >
                {isAccountFilter ? (
                  <button
                    type="button"
                    onClick={() => copyAddress(item.id)}
                    title={`Copy to clipboard:\n${item.id}`}
                  >
                    <SharedToggleItem
                      label={item.name}
                      thumbnailURL={item?.thumbnailURL}
                      checked={item.isEnabled}
                      onChange={(toggleValue) =>
                        onChange({ ...item, isEnabled: toggleValue })
                      }
                    />
                  </button>
                ) : (
                  <SharedToggleItem
                    label={item.name}
                    thumbnailURL={item?.thumbnailURL}
                    checked={item.isEnabled}
                    onChange={(toggleValue) =>
                      onChange({ ...item, isEnabled: toggleValue })
                    }
                  />
                )}
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
  },
)

export default FilterList

import { Filter } from "@tallyho/tally-background/redux-slices/nfts_update"
import React, { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import FilterListItem from "./FilterListItem"

const FilterList = React.forwardRef(
  (
    {
      filters,
      onChange,
    }: {
      filters: Filter[]
      onChange: (filter: Filter) => void
    },
    ref
  ) => {
    const { t } = useTranslation("translation", {
      keyPrefix: "nfts.filters",
    })
    const [items, setItems] = useState<Filter[]>(filters)
    const [isEmpty, setIsEmpty] = useState<boolean>(!filters.length)

    useEffect(() => {
      setItems(filters)
      const timeout = setTimeout(() => {
        setIsEmpty(!filters.length)
      }, 250)
      return () => clearTimeout(timeout)
    }, [filters])

    return (
      <div ref={ref as React.RefObject<HTMLDivElement>} className="filter_list">
        {items.map((item) => (
          <FilterListItem
            key={item.id}
            label={item.name}
            thumbnailURL={item?.thumbnailURL}
            checked={item.isEnabled}
            onChange={(toggleValue) =>
              onChange({ ...item, isEnabled: toggleValue })
            }
          />
        ))}
        {isEmpty && <>{t("noCollections")}</>}
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
)

export default FilterList

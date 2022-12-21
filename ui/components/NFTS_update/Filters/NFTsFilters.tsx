import {
  Filter,
  SortType,
  updateAccountFilter,
  updateCollectionFilter,
  updateSortType,
} from "@tallyho/tally-background/redux-slices/nfts_update"
import { selectCompletedNFTFilters } from "@tallyho/tally-background/redux-slices/selectors"
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import SharedSlideUpMenuPanel from "../../Shared/SharedSlideUpMenuPanel"
import SharedRadio from "../../Shared/SharedRadio"
import FilterList from "./FilterList"
import SharedLoadingSpinner from "../../Shared/SharedLoadingSpinner"

const RADIO_NAME = "sortType"

type RadioBtn = {
  value: SortType
  label: string
}

export default function NFTsFilters(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts.filters",
  })
  const collectionsRef = useRef<HTMLDivElement>()
  const [height, setHeight] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const filters = useBackgroundSelector(selectCompletedNFTFilters)
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (collectionsRef.current) {
      setHeight(collectionsRef.current.offsetHeight)
    }
  }, [collectionsRef])

  const handleUpdateSortType = useCallback(
    (type: SortType) => {
      dispatch(updateSortType(type))
    },
    [dispatch]
  )

  const handleUpdateCollectionFilter = useCallback(
    (filter: Filter) => {
      dispatch(updateCollectionFilter(filter))
    },
    [dispatch]
  )

  const handleUpdateAccountFilter = useCallback(
    (filter: Filter) => {
      setIsLoading(true)
      dispatch(updateAccountFilter(filter)).then(() =>
        setTimeout(() => {
          setIsLoading(false)
        }, 500)
      )
    },
    [dispatch]
  )

  const radioBtns: RadioBtn[] = useMemo(
    () => [
      {
        value: "desc",
        label: t("sortType.priceDesc"),
      },
      {
        value: "asc",
        label: t("sortType.priceAsc"),
      },
      {
        value: "new",
        label: t("sortType.newestAdded"),
      },
      {
        value: "old",
        label: t("sortType.oldestAdded"),
      },
      {
        value: "number",
        label: t("sortType.numberInOneCollection"),
      },
    ],
    [t]
  )

  return (
    <SharedSlideUpMenuPanel header={t("title")}>
      <div className="filters">
        <div>
          <span className="simple_text filter_title">{t("sortTypeTitle")}</span>
          {radioBtns.map(({ value, label }) => (
            <SharedRadio
              key={value}
              id={`radio_${value}`}
              name={RADIO_NAME}
              value={filters.type === value}
              label={label}
              onChange={() => handleUpdateSortType(value)}
            />
          ))}
        </div>
        <div className="simple_text">
          <span className="filter_title">{t("accountsTitle")}</span>
          <FilterList
            filters={filters.accounts}
            onChange={handleUpdateAccountFilter}
          />
        </div>
        <div className="simple_text">
          <span className="filter_title">{t("collectionsTitle")}</span>
          <div
            className={classNames("collections", {
              visible: filters.collections.length > 0 && !isLoading,
            })}
          >
            {isLoading && (
              <div className="spinner">
                <SharedLoadingSpinner size="small" variant="transparent" />
              </div>
            )}
            <FilterList
              ref={collectionsRef}
              filters={filters.collections}
              onChange={handleUpdateCollectionFilter}
            />
          </div>
        </div>
      </div>
      <style jsx>{`
        .filters {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 456px;
          overflow-y: scroll;
          padding: 8px 24px;
        }
        .filter_title {
          display: inline-block;
          margin-bottom: 4px;
          width: 100%;
        }
        .spinner {
          width: 100%;
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 16px 0;
        }
        .collections {
          max-height: 46px;
          overflow: hidden;
          transition: max-height 250ms ease-out;
        }
        .collections.visible {
          max-height: ${height}px;
          transition: max-height 250ms ease-in;
        }
      `}</style>
    </SharedSlideUpMenuPanel>
  )
}

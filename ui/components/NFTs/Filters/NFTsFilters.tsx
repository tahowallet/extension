import {
  Filter,
  SortType,
  updateAccountFilter,
  updateCollectionFilter,
  updateSortType,
} from "@tallyho/tally-background/redux-slices/nfts"
import { selectEnrichedNFTFilters } from "@tallyho/tally-background/redux-slices/selectors"
import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { useBackgroundDispatch, useBackgroundSelector } from "../../../hooks"
import SharedSlideUpMenuPanel from "../../Shared/SharedSlideUpMenuPanel"
import SharedRadio from "../../Shared/SharedRadio"
import FilterList from "./FilterList"
import { i18n } from "../../../_locales/i18n"

type RadioBtn = {
  value: SortType
  label: string
}

const RADIO_NAME = "sortType"
const KEY_PREFIX = "nfts.filters"
const DEFAULT_MAX_HIGHT = 46
const LOADING_DELAY = 1000

const RADIO_BTNS: RadioBtn[] = [
  {
    value: "desc",
    label: i18n.t(`${KEY_PREFIX}.sortType.priceDesc`),
  },
  {
    value: "asc",
    label: i18n.t(`${KEY_PREFIX}.sortType.priceAsc`),
  },
  {
    value: "new",
    label: i18n.t(`${KEY_PREFIX}.sortType.newestAdded`),
  },
  {
    value: "old",
    label: i18n.t(`${KEY_PREFIX}.sortType.oldestAdded`),
  },
  {
    value: "number",
    label: i18n.t(`${KEY_PREFIX}.sortType.numberInOneCollection`),
  },
]

export default function NFTsFilters(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "nfts.filters",
  })
  const collectionsRef = useRef<HTMLDivElement | null>(null)
  const timerRef = useRef<number | null>(null)
  const [maxHeight, setMaxHeight] = useState(DEFAULT_MAX_HIGHT)
  const [isLoading, setIsLoading] = useState(false)
  const filters = useBackgroundSelector(selectEnrichedNFTFilters)
  const dispatch = useBackgroundDispatch()

  useEffect(() => {
    if (collectionsRef.current) {
      setMaxHeight(collectionsRef.current.offsetHeight)
    }
  }, [collectionsRef?.current?.offsetHeight])

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    },
    []
  )

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
      dispatch(updateAccountFilter(filter)).then(() => {
        timerRef.current = window.setTimeout(
          () => setIsLoading(false),
          LOADING_DELAY
        )
      })
    },
    [dispatch]
  )

  return (
    <SharedSlideUpMenuPanel header={t("title")}>
      <div className="filters">
        <span className="simple_text filter_warning">{t("warning")}</span>
        <div>
          <span className="simple_text filter_title">{t("sortTypeTitle")}</span>
          {RADIO_BTNS.map(({ value, label }) => (
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
            testid="nft_account_filters"
          />
        </div>
        <div className="simple_text">
          <span className="filter_title">{t("collectionsTitle")}</span>
          <div
            className={classNames("collections", {
              visible: !isLoading,
            })}
          >
            <FilterList
              ref={collectionsRef}
              isLoaded={!isLoading}
              filters={filters.collections}
              onChange={handleUpdateCollectionFilter}
              emptyMessage={t("noCollections")}
              testid="nft_collection_filters"
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
          padding: 0 24px 8px;
        }
        .filter_title {
          display: inline-block;
          margin-bottom: 4px;
          width: 100%;
        }
        .filter_warning {
          color: var(--green-20);
        }
        .spinner {
          width: 100%;
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 16px 0;
        }
        .collections {
          max-height: ${DEFAULT_MAX_HIGHT}px;
          overflow: hidden;
          transition: max-height 500ms ease-out;
        }
        .collections.visible {
          max-height: ${maxHeight}px;
          transition: max-height 500ms ease-in;
        }
      `}</style>
    </SharedSlideUpMenuPanel>
  )
}

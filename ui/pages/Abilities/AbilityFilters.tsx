import { AbilityType } from "@tallyho/tally-background/abilities"
import {
  Filter,
  AbilityState,
  updateFilterAbilityState,
  updateFilterAbilityType,
} from "@tallyho/tally-background/redux-slices/abilities"
import { selectAbilityFilters } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useCallback } from "react"
import { useTranslation } from "react-i18next"
import SharedRadio from "../../components/Shared/SharedRadio"
import SharedSlideUpMenuPanel from "../../components/Shared/SharedSlideUpMenuPanel"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import { i18n } from "../../_locales/i18n"
import AbilityFiltersCard from "./AbilityFiltersCard"

const RADIO_NAME = "sortType"
const KEY_PREFIX = "abilities.filters"

const RADIO_BTNS: { value: AbilityState; label: string }[] = [
  {
    value: "open",
    label: i18n.t(`${KEY_PREFIX}.abilityState.open`),
  },
  {
    value: "closed",
    label: i18n.t(`${KEY_PREFIX}.abilityState.closed`),
  },
  {
    value: "expired",
    label: i18n.t(`${KEY_PREFIX}.abilityState.expired`),
  },
  {
    value: "all",
    label: i18n.t(`${KEY_PREFIX}.abilityState.all`),
  },
]

const getDescriptionForType = (type: AbilityType): string => {
  switch (type) {
    case "claim":
      return i18n.t(`${KEY_PREFIX}.abilityTypeDesc.claim`)
    case "airdrop":
      return i18n.t(`${KEY_PREFIX}.abilityTypeDesc.airdrop`)
    case "mint":
      return i18n.t(`${KEY_PREFIX}.abilityTypeDesc.mint`)
    default:
      return ""
  }
}

export default function AbilityFilters(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "abilities.filters",
  })
  const filters = useBackgroundSelector(selectAbilityFilters)
  const dispatch = useBackgroundDispatch()

  const handleUpdateFilterAbilityState = useCallback(
    (state: AbilityState) => {
      dispatch(updateFilterAbilityState(state))
    },
    [dispatch]
  )

  const handleUpdateFilterAbilityType = useCallback(
    (filter: Filter) => {
      dispatch(updateFilterAbilityType(filter))
    },
    [dispatch]
  )

  return (
    <SharedSlideUpMenuPanel header={t("title")}>
      <div className="filters">
        <div className="simple_text">
          <span className="filter_title">{t("abilityStateTitle")}</span>
          {RADIO_BTNS.map(({ value, label }) => (
            <SharedRadio
              key={value}
              id={`radio_${value}`}
              name={RADIO_NAME}
              value={filters.state === value}
              label={label}
              onChange={() => handleUpdateFilterAbilityState(value)}
            />
          ))}
        </div>
        <div className="simple_text">
          <span className="filter_title">{t("abilitiesTypesTitle")}</span>
          <div className="filter_list">
            {filters.types.map(({ type, isEnabled }) => (
              <AbilityFiltersCard
                key={type}
                type={type}
                description={getDescriptionForType(type)}
                checked={isEnabled}
                onChange={(toggleValue) =>
                  handleUpdateFilterAbilityType({
                    type,
                    isEnabled: toggleValue,
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .filters {
          display: flex;
          flex-direction: column;
          gap: 24px;
          height: 456px;
          overflow-y: scroll;
          padding: 0 24px 8px;
        }
        .filter_list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter_title {
          display: inline-block;
          margin-bottom: 8px;
          width: 100%;
        }
      `}</style>
    </SharedSlideUpMenuPanel>
  )
}

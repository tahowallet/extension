import { ABILITY_TYPES } from "@tallyho/tally-background/abilities"
import {
  State,
  updateState,
  addType,
  deleteType,
  addAccount,
  deleteAccount,
} from "@tallyho/tally-background/redux-slices/abilities"
import { AccountType } from "@tallyho/tally-background/redux-slices/accounts"
import {
  selectAbilityFilterAccounts,
  selectAbilityFilterState,
  selectAbilityFilterTypes,
  selectAccountTotals,
} from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement, useCallback } from "react"
import { useTranslation } from "react-i18next"
import SharedIcon from "../../components/Shared/SharedIcon"
import SharedRadio from "../../components/Shared/SharedRadio"
import SharedSlideUpMenuPanel from "../../components/Shared/SharedSlideUpMenuPanel"
import SharedToggleItem from "../../components/Shared/SharedToggleItem"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import { i18n } from "../../_locales/i18n"
import AbilityFilterCard from "./AbilityFilterCard"

const RADIO_NAME = "sortType"
const KEY_PREFIX = "abilities.filter"

const RADIO_BTNS: { value: State; label: string }[] = [
  {
    value: "open",
    label: i18n.t(`${KEY_PREFIX}.abilityState.open`),
  },
  {
    value: "completed",
    label: i18n.t(`${KEY_PREFIX}.abilityState.completed`),
  },
  {
    value: "expired",
    label: i18n.t(`${KEY_PREFIX}.abilityState.expired`),
  },
  {
    value: "deleted",
    label: i18n.t(`${KEY_PREFIX}.abilityState.deleted`),
  },
  {
    value: "all",
    label: i18n.t(`${KEY_PREFIX}.abilityState.all`),
  },
]

const ABILITY_TYPE_DESC = {
  vote: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.vote`),
  claim: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.claim`),
  airdrop: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.airdrop`),
  mint: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.mint`),
  access: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.access`),
  product: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.product`),
  event: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.event`),
  article: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.article`),
  result: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.result`),
  misc: i18n.t(`${KEY_PREFIX}.abilityTypeDesc.misc`),
}

export default function AbilityFilter(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "abilities.filter",
  })
  const state = useBackgroundSelector(selectAbilityFilterState)
  const types = useBackgroundSelector(selectAbilityFilterTypes)
  const accounts = useBackgroundSelector(selectAbilityFilterAccounts)
  const accountTotals = useBackgroundSelector(selectAccountTotals)
  const filteredAccountTotals = accountTotals.filter(
    ({ accountType }) => accountType !== AccountType.ReadOnly,
  )
  const dispatch = useBackgroundDispatch()

  const handleUpdateState = useCallback(
    (value: State) => {
      dispatch(updateState(value))
    },
    [dispatch],
  )

  const handleUpdateType = useCallback(
    (value: string, isEnabled: boolean) => {
      if (isEnabled) {
        dispatch(addType(value))
      } else {
        dispatch(deleteType(value))
      }
    },
    [dispatch],
  )

  const handleUpdateAccount = useCallback(
    (value: string, isEnabled: boolean) => {
      if (isEnabled) {
        dispatch(addAccount(value))
      } else {
        dispatch(deleteAccount(value))
      }
    },
    [dispatch],
  )

  return (
    <SharedSlideUpMenuPanel header={t("title")}>
      <div className="filter">
        <div className="simple_text">
          <span className="filter_title">{t("abilityStateTitle")}</span>
          {RADIO_BTNS.map(({ value, label }) => (
            <SharedRadio
              key={value}
              id={`radio_${value}`}
              name={RADIO_NAME}
              value={state === value}
              label={label}
              onChange={() => handleUpdateState(value)}
            />
          ))}
        </div>
        <div className="simple_text">
          <span className="filter_title">{t("abilitiesTypesTitle")}</span>
          <div className="filter_list">
            {ABILITY_TYPES.map((type) => (
              <AbilityFilterCard
                key={type}
                type={type}
                description={ABILITY_TYPE_DESC[type]}
                checked={types.includes(type)}
                onChange={(toggleValue) => handleUpdateType(type, toggleValue)}
              />
            ))}
          </div>
        </div>
        <div className="simple_text">
          <span className="filter_title">{t("accountsTitle")}</span>
          <div className="filter_list">
            {filteredAccountTotals.length > 0 ? (
              filteredAccountTotals.map(({ address, name, avatarURL }) => (
                <SharedToggleItem
                  key={address}
                  label={name || address}
                  thumbnailURL={avatarURL}
                  checked={accounts.includes(address)}
                  onChange={(toggleValue) =>
                    handleUpdateAccount(address, toggleValue)
                  }
                />
              ))
            ) : (
              <span className="no_accounts">{t("noAccounts")}</span>
            )}
          </div>
        </div>
        <span className="accounts_info">
          <SharedIcon
            width={24}
            color="var(--link)"
            icon="icons/m/notif-announcement.svg"
            style={{ flexShrink: 0, marginRight: 18 }}
          />
          <span>{t("accountsReadOnlyInfo")}</span>
        </span>
      </div>
      <style jsx>{`
        .filter {
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
        .accounts_info {
          display: flex;
          margin: 0 16px 0 4px;
          color: var(--green-20);
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
        }
        .no_accounts {
          font-size: 18px;
          color: var(--green-20);
        }
      `}</style>
    </SharedSlideUpMenuPanel>
  )
}

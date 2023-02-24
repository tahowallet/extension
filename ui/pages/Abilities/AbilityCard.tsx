import { Ability } from "@tallyho/tally-background/abilities"
import { completeAbility } from "@tallyho/tally-background/redux-slices/abilities"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../../components/Shared/SharedButton"
import SharedIcon from "../../components/Shared/SharedIcon"
import SharedSlideUpMenu from "../../components/Shared/SharedSlideUpMenu"
import SharedTooltip from "../../components/Shared/SharedTooltip"
import { useBackgroundDispatch } from "../../hooks"
import { i18n } from "../../_locales/i18n"
import AbilityCardHeader from "./AbilityCardHeader"
import AbilityRemovalConfirm from "./AbilityRemovalConfirm"

const DAYS = 30

const getTimeDetails = (ability: Ability): string => {
  const cutOffDate = new Date()
  cutOffDate.setDate(cutOffDate.getDate() + DAYS)

  if (ability.closeAt) {
    const closeDate = new Date(ability.closeAt)
    if (new Date() < closeDate && closeDate < cutOffDate) {
      return i18n.t("abilities.timeCloses")
    }
  }
  if (ability.openAt) {
    const openDate = new Date(ability.openAt)
    if (new Date() < openDate && openDate < cutOffDate) {
      return i18n.t("abilities.timeStarting")
    }
  }

  return ""
}

function AbilityCard({ ability }: { ability: Ability }): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "abilities",
  })
  const [showRemoveAbilityConfirm, setShowRemoveAbilityConfirm] =
    useState(false)

  const dispatch = useBackgroundDispatch()

  const timeDetails = getTimeDetails(ability)

  return (
    <>
      <div className="ability_card">
        <SharedSlideUpMenu
          size="auto"
          isOpen={showRemoveAbilityConfirm}
          close={(e) => {
            e?.stopPropagation()
            setShowRemoveAbilityConfirm(false)
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: "default" }}
          >
            <AbilityRemovalConfirm
              ability={ability}
              close={() => setShowRemoveAbilityConfirm(false)}
            />
          </div>
        </SharedSlideUpMenu>
        <AbilityCardHeader ability={ability} />
        <div title={ability.title} className="title">
          {ability.title}
        </div>
        {timeDetails && (
          <div className="time_details">
            <SharedIcon color="var(--green-40)" width={16} icon="time.svg" />
            <div className="simple_text">{timeDetails}</div>
          </div>
        )}
        {ability.description && (
          <div className="description">{ability.description}</div>
        )}
        {ability.imageUrl && (
          <img className="image" alt="logo" src={ability.imageUrl} />
        )}
        <div className="controls">
          <SharedButton
            type="primary"
            size="medium"
            iconSmall="new-tab"
            onClick={() => {
              window.open(ability.linkUrl, "_blank")?.focus()
            }}
          >
            {t("viewWebsiteBtn")}
          </SharedButton>
          <div className="button_container">
            <SharedTooltip
              horizontalPosition="center"
              width={144}
              verticalPosition="bottom"
              type="dark"
              disabled={ability.completed}
              IconComponent={() => (
                <SharedIcon
                  height={16}
                  width={16}
                  icon="icons/s/mark-read.svg"
                  color="var(--green-40)"
                  customStyles="margin-right: 8px;"
                  hoverColor="var(--success)"
                  disabled={ability.completed}
                  onClick={async () => {
                    await dispatch(
                      completeAbility({
                        address: ability.address,
                        abilityId: ability.abilityId,
                      })
                    )
                    dispatch(setSnackbarMessage(t("snackbar")))
                  }}
                />
              )}
            >
              {t("markBtn")}
            </SharedTooltip>
            <div className="line" />
            <SharedTooltip
              horizontalPosition="center"
              width={50}
              verticalPosition="bottom"
              type="dark"
              isOpen={showRemoveAbilityConfirm}
              disabled={ability.removedFromUi}
              IconComponent={() => (
                <SharedIcon
                  height={16}
                  width={16}
                  icon="icons/s/garbage.svg"
                  color="var(--green-40)"
                  hoverColor="var(--error)"
                  disabled={ability.removedFromUi}
                  onClick={() => {
                    setShowRemoveAbilityConfirm(true)
                  }}
                />
              )}
            >
              {t("deleteBtn")}
            </SharedTooltip>
          </div>
        </div>
      </div>
      <style jsx>
        {`
          .ability_card {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;
            width: 320px;
            max-height: 355px;
            background: rgba(4, 20, 20, 0.4);
            border-radius: 12px;
            margin-bottom: 16px;
          }
          .button_container {
            display: flex;
            flex-direction:row;
            align-items: center;
            height: 100%;
            gap: 8px;
          }
          .title {
            font-family: Segment;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            white-space: nowrap;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            letter-spacing: 0em;
            text-align: left;
            margin-top 8px;
          }
          .description {
            margin-top: 4px;
            height: 48px;
            width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: 'Segment';
            font-style: normal;
            font-weight: 500;
            font-size: 16px;
            line-height: 24px;
            color: #789594;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }
          .image {
            width: 100%;
            height: 115px;
            border-radius: 4px;
            object-fit: cover;
            margin-top: 16px;
          }
          .controls {
            margin-top: 16px;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            width: 100%;
          }
          .line {
            border: 1px solid var(--green-80);
            height: 24px;
          }
          .time_details {
            margin-top: 4px;
            display: flex;
            align-items: center;
            gap: 5px;
          }
        `}
      </style>
    </>
  )
}

export default AbilityCard

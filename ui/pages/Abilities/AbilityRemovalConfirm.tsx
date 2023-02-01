import React, { ReactElement, useEffect, useState } from "react"
import { Ability } from "@tallyho/tally-background/abilities"
import {
  removeAbility,
  reportAndRemoveAbility,
} from "@tallyho/tally-background/redux-slices/abilities"
import { useTranslation } from "react-i18next"

import classNames from "classnames"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../../components/Shared/SharedButton"
import { i18n } from "../../_locales/i18n"
import SharedRadio from "../../components/Shared/SharedRadio"

const RADIO_NAME = "spamReason"
const KEY_PREFIX = "abilities.deleteSlideUpMenu"
const RADIO_BTNS = [
  {
    value: "spam",
    label: i18n.t(`${KEY_PREFIX}.spamReason.spam`),
  },
  {
    value: "inaccurate information",
    label: i18n.t(`${KEY_PREFIX}.spamReason.inaccurateInfo`),
  },
  {
    value: "copyright violation",
    label: i18n.t(`${KEY_PREFIX}.spamReason.copyright`),
  },
  {
    value: "scam",
    label: i18n.t(`${KEY_PREFIX}.spamReason.scam`),
  },
  {
    value: "duplicate",
    label: i18n.t(`${KEY_PREFIX}.spamReason.duplicate`),
  },
]

interface AbilityRemovalConfirmProps {
  ability: Ability
  close: () => void
}

export default function AbilityRemovalConfirm({
  ability,
  close,
}: AbilityRemovalConfirmProps): ReactElement {
  const dispatch = useBackgroundDispatch()

  const { t } = useTranslation("translation")
  const [showSpamReasons, setShowSpamReasons] = useState(false)
  const [spamReason, setSpamReason] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!showSpamReasons) {
      setSpamReason(undefined)
    }
  }, [showSpamReasons])

  const handleDeleteAbility = async () => {
    if (spamReason) {
      await dispatch(
        reportAndRemoveAbility({
          address: ability.address,
          abilitySlug: ability.slug,
          abilityId: ability.abilityId,
          reason: spamReason,
        })
      )
    } else {
      await dispatch(
        removeAbility({
          address: ability.address,
          abilityId: ability.abilityId,
        })
      )
    }
    dispatch(setSnackbarMessage(t(`${KEY_PREFIX}.snackbar`)))
    close()
  }

  return (
    <div className="remove_ability_option">
      <div className="content_container">
        <div className="header">{t(`${KEY_PREFIX}.title`)}</div>
        <div className="remove_ability_details">{t(`${KEY_PREFIX}.desc`)}</div>
        <div className="spam_container">
          <div className="spam_header">
            <div className="spam_prompt">{t(`${KEY_PREFIX}.spamPrompt`)}</div>
            <SharedButton
              type="tertiary"
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                setShowSpamReasons((prevState) => !prevState)
              }}
            >
              {showSpamReasons
                ? t("shared.cancelBtn")
                : t(`${KEY_PREFIX}.reportSpamBtn`)}
            </SharedButton>
          </div>
          <div
            className={classNames("spam_reasons", {
              visible: showSpamReasons,
            })}
          >
            <div className="spam_title simple_text">
              {t(`${KEY_PREFIX}.selectSpamReason`)}
            </div>
            {RADIO_BTNS.map(({ value, label }) => (
              <SharedRadio
                key={value}
                id={`radio_${value}`}
                name={RADIO_NAME}
                value={spamReason === value}
                label={label}
                onChange={() => setSpamReason(value)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="button_container">
        <SharedButton
          type="primary"
          size="medium"
          isDisabled={showSpamReasons ? !spamReason : false}
          onClick={(e) => {
            e.stopPropagation()
            handleDeleteAbility()
          }}
        >
          {t(
            `${KEY_PREFIX}.${showSpamReasons ? "submitSpamBtn" : "submitBtn"}`
          )}
        </SharedButton>
        <SharedButton
          type="tertiary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
        >
          {t("shared.cancelBtn")}
        </SharedButton>
      </div>
      <style jsx>{`
        .header {
            height: 24px;
            font-family: 'Segment';
            font-style: normal;
            font-weight: 600;
            font-size: 18px;
            line-height: 24px;
            color: var(--white);
        }
        .remove_ability_option {
          margin: 0 24px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
          height: 95%;
          font-family: 'Segment';
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-40);
        }
        .remove_ability_details {
          display: flex;
          flex-direction: column;
          line-height: 24px;
          font-size 16px;
        }
        .button_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .spam_header{
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .spam_prompt {
          font-family: 'Segment';
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--white);
        }
        .content_container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .spam_container {
          padding: 8px 12px;
          background-color: var(--hunter-green);
        }
        .spam_reasons {
          opacity: 0;
          max-height: 0px;
          overflow: hidden;
          transition: max-height 500ms, opacity 130ms ease-in;
        }
        .spam_reasons.visible {
          opacity: 1;
          max-height: 212px;
          transition: max-height 500ms ease-in, opacity 130ms ease-in;
        }
        .spam_title {
          margin: 14 0 8px;
        }
      `}</style>
    </div>
  )
}

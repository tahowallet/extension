import React, { ReactElement } from "react"
import { Ability } from "@tallyho/tally-background/services/abilities"
import { removeAbility } from "@tallyho/tally-background/redux-slices/abilities"
import { useTranslation } from "react-i18next"

import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../../components/Shared/SharedButton"

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

  return (
    <div className="remove_ability_option">
      <div className="content_container">
        <div className="header">{t("abilities.deleteSlideUpMenu.title")}</div>
        <div className="remove_ability_details">
          {t("abilities.deleteSlideUpMenu.desc")}
        </div>
        <ul>
          <li className="spam_container">
            <li className="spam_prompt">
              {t("abilities.deleteSlideUpMenu.spamPrompt")}
            </li>
            <SharedButton
              type="tertiary"
              size="small"
              style={{ width: "133px" }}
              onClick={(e) => {
                e.stopPropagation()
                // @TODO Actually report spam
                dispatch(
                  removeAbility({
                    address: ability.address,
                    abilityId: ability.abilityId,
                  })
                )
                close()
              }}
            >
              {t("abilities.deleteSlideUpMenu.reportSpamBtn")}
            </SharedButton>
          </li>
        </ul>
      </div>
      <div className="button_container">
        <SharedButton
          type="primary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            dispatch(
              removeAbility({
                address: ability.address,
                abilityId: ability.abilityId,
              })
            )
            close()
          }}
        >
          {t("abilities.deleteSlideUpMenu.submitBtn")}
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
        li {
          display: flex;
          justify-content: space-between;
          align-items: center;

        }
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
        .spam_container {
          background-color: var(--hunter-green);
          display: flex;
          justify-content: space-between;
          padding: 8px 12px;
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
      `}</style>
    </div>
  )
}

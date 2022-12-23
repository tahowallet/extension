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
      <div className="header">Delete ability?</div>
      <div className="remove_ability_details">
        If you delete an ability you won&apos;t be able to see it anymore
      </div>
      <ul>
        <li className="spam_container">
          <li className="spam_prompt">Is this ability spam?</li>
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
            Yes, report spam
          </SharedButton>
        </li>
      </ul>
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
          Yes, delete
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
            color: #D6EAE9;
        }
        .remove_ability_option {
          margin-left: 20px;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 95%;
          font-family: 'Segment';
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: #789594;
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
          margin-top: -10px;
          background-color: var(--hunter-green);
          padding-left: 12px;
          width: 336px;
          height: 52px;
          display: flex;
          justify-content: space-between;
        }
        .spam_prompt {
          font-family: 'Segment';
          font-style: normal;
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
      `}</style>
    </div>
  )
}

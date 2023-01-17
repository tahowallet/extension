import { toggleHideDescription } from "@tallyho/tally-background/redux-slices/abilities"
import {
  selectAbilityCount,
  selectHideDescription,
} from "@tallyho/tally-background/redux-slices/selectors"
import classNames from "classnames"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useSelector } from "react-redux"
import { useHistory } from "react-router-dom"
import { useBackgroundDispatch } from "../../hooks"
import SharedButton from "../Shared/SharedButton"

export default function AbilitiesHeader(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "overview.abilities",
  })
  const newAbilities = useSelector(selectAbilityCount)
  const hideDescription = useSelector(selectHideDescription)
  const dispatch = useBackgroundDispatch()
  const history = useHistory()

  const ability = {
    // TODO change icons
    icon: newAbilities > 0 ? "dog_abilities" : "dog_abilities",
    countText: newAbilities > 0 ? `${newAbilities} ${t("new")}` : t("none"),
  }

  const handleClick = () => {
    if (!hideDescription) {
      dispatch(toggleHideDescription(true))
    }
    history.push("abilities")
  }

  return (
    <div className="abilities_header">
      <div className="info_container">
        <div className="abilities_info">
          <div className="icon" />
          <div
            className={classNames({
              title: !hideDescription,
            })}
          >
            {t("title")}
          </div>
        </div>
        <div
          tabIndex={0}
          role="button"
          className="ability_count"
          onClick={() => handleClick()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleClick()
            }
          }}
        >
          {ability.countText}
        </div>
      </div>
      {!hideDescription && (
        <div>
          <div className="desc">{t("description")}</div>
          <SharedButton
            type="primary"
            size="medium"
            onClick={() => handleClick()}
          >
            {t("seeAbilities")}
          </SharedButton>
        </div>
      )}

      <style jsx>{`
        .info_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: end;
        }
        .abilities_header {
          background: var(--green-95);
          border-radius: 8px;
          background: radial-gradient(
            51.48% 205.47% at 0% -126.42%,
            #f76734 0%,
            #13302e 100%
          );

          box-shadow: 0px 16px 16px rgba(7, 17, 17, 0.3),
            0px 6px 8px rgba(7, 17, 17, 0.24), 0px 2px 4px rgba(7, 17, 17, 0.34);

          padding: 13px 16px 16px;
          width: 100%;
          box-sizing: border-box;
        }

        .abilities_info {
          display: flex;
          flex-direction: row;
          align-items: end;

          color: var(--white);
          font-weight: 400;
          font-size: 16px;
          line-height: 24px;
        }

        .title {
          font-weight: 600;
          font-size: 18px;
        }

        .ability_count {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          background: var(--hunter-green);
          border-radius: 17px;
          padding: 0px 8px;
          cursor: pointer;
          height: 24px;

          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--${newAbilities > 0 ? "success" : "green-40"});
        }

        .desc {
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
          color: var(--green-20);
          margin: 8px 0 16px;
        }

        .icon {
          background: url("./images/${hideDescription
            ? ability.icon
            : "tail"}.svg");
          background-size: 36px ${hideDescription ? 30 : 36}px;
          width: 36px;
          height: ${hideDescription ? 30 : 36}px;
          margin-right: 14px;
        }
      `}</style>
    </div>
  )
}

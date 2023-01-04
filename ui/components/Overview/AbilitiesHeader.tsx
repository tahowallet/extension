import { selectAbilityCount } from "@tallyho/tally-background/redux-slices/selectors"
import React, { ReactElement } from "react"
import { useSelector } from "react-redux"
import { useHistory } from "react-router-dom"

export default function AbilitiesHeader(): ReactElement {
  const newAbilities = useSelector(selectAbilityCount)
  const history = useHistory()

  const abilityCount = newAbilities > 0 ? `${newAbilities} New` : "None"

  return (
    <>
      <div className="abilities_header">
        <div className="info_container">
          <div className="abilities_info">
            <div className="icon_daylight" />
            <div>Daylight abilities</div>
          </div>
          <div
            onClick={() => {
              history.push("abilities")
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                history.push("abilities")
              }
            }}
            role="button"
            tabIndex={0}
            className="ability_count"
          >
            {abilityCount}
          </div>
        </div>
      </div>
      <style jsx>{`
        .info_container {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
        }
        .abilities_header {
          background: var(--green-95);
          border-radius: 8px;
          color: white;
          background: radial-gradient(
            51.48% 205.47% at 0% -126.42%,
            #f76734 0%,
            #13302e 100%
          );

          width: 352px;
          height: 56px;
          box-shadow: 0px 2px 4px 0px #00141357, 0px 6px 8px 0px #0014133d,
            0px 16px 16px 0px #00141324;

          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .abilities_info {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          font-weight: 400;
        }
        .ability_count {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          background: var(--hunter-green);
          border-radius: 17px;
          padding: 4px 8px 4px 8px;
          color: ${newAbilities > 0 ? "var(--success)" : "var(--green-40)"};
          font-weight: 500;
          cursor: pointer;
        }
        .icon_daylight {
          background: url("./images/assets/daylight.png");
          background-size: 39px 22px;
          width: 39px;
          height: 22px;
          margin-right: 8px;
        }
      `}</style>
    </>
  )
}

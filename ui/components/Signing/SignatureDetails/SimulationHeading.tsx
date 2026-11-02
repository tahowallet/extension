import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"

export default function SimulationHeading(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "signTransaction" })

  return (
    <div className="simulation_heading">
      {t("simulationHeading")}
      <style jsx>{`
        .simulation_heading {
          color: var(--green-20);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
      `}</style>
    </div>
  )
}

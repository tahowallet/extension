import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import type { SparkNetworkType } from "@tallyho/tally-background/networks"
import { selectShowTestNetworks } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector } from "../../hooks"
import SharedRadio from "../Shared/SharedRadio"

/**
 * Spark network for a new Bitcoin account. Regtest is only offered to users
 * who show test networks, matching the network selector; everyone else
 * gets mainnet without a choice to make.
 */
export default function SparkNetworkChoice({
  value,
  onChange,
}: {
  value: SparkNetworkType
  onChange: (value: SparkNetworkType) => void
}): ReactElement | null {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.accountFamily",
  })
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)

  if (!showTestNetworks) {
    return null
  }

  return (
    <div className="choice" role="radiogroup" aria-label={t("sparkNetwork")}>
      {(["MAINNET", "REGTEST"] as const).map((option) => (
        <SharedRadio
          key={option}
          id={`spark_network_${option}`}
          name="spark_network"
          label={t(`sparkNetworks.${option}`)}
          value={value === option}
          onChange={() => onChange(option)}
        />
      ))}
      <style jsx>{`
        .choice {
          display: flex;
          gap: 24px;
          justify-content: center;
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  )
}

import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import type { NetworkFamily } from "@tallyho/tally-background/networks"
import SharedSelect from "../Shared/SharedSelect"

const FAMILIES: NetworkFamily[] = ["EVM", "SPARK"]

/**
 * Which network family to add accounts for from a recovery phrase. The
 * derivation path dropdown below it then offers that family's paths.
 */
export default function OnboardingNetworkFamilySelect({
  value,
  onChange,
}: {
  value: NetworkFamily
  onChange: (family: NetworkFamily) => void
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.networkFamily",
  })

  return (
    <SharedSelect
      label={t("label")}
      options={[
        { value: "EVM", label: t("EVM") },
        { value: "SPARK", label: t("SPARK") },
      ]}
      defaultIndex={FAMILIES.indexOf(value)}
      onChange={(family) => {
        const selected = FAMILIES.find((candidate) => candidate === family)
        if (selected) {
          onChange(selected)
        }
      }}
      width="100%"
    />
  )
}

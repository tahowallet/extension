import {
  FeatureFlagTypes,
  isEnabled,
  RuntimeFlag,
} from "@tallyho/tally-background/features"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { setLocalStorageItem } from "../../hooks"
import BalanceReloader from "../BalanceReloader/BalanceReloader"
import SharedPageHeader from "../Shared/SharedPageHeader"
import SharedToggleButton from "../Shared/SharedToggleButton"

function FeatureFlag(props: { name: string }): ReactElement {
  const { name } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "devPanel.featureFlags.flags",
  })
  const [value, setValue] = useState(isEnabled(FeatureFlagTypes[name]))

  useEffect(() => {
    setLocalStorageItem(name, String(value))
  }, [name, value])

  return (
    <li className="toggle_wrap">
      <span
        className="simple_text"
        title={t(`${name}` as unknown as TemplateStringsArray)}
      >
        {name}
      </span>

      <SharedToggleButton
        onChange={(toggleValue) => setValue(toggleValue)}
        value={value}
      />
      <style jsx>{`
        .toggle_wrap {
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
      `}</style>
    </li>
  )
}

export default function FeatureFlagsPanel(): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "devPanel.featureFlags",
  })

  return (
    <section className="standard_width">
      <SharedPageHeader backPath="/dev" withoutBackText>
        {t("title")} <BalanceReloader />
      </SharedPageHeader>
      <ul className="flags_wrap">
        {Object.keys(RuntimeFlag).map((flagName) => (
          <FeatureFlag key={flagName} name={flagName} />
        ))}
      </ul>
      <style jsx>{`
        section {
          margin-bottom: 35px;
        }
        .flags_wrap {
          display: flex;
          flex-direction: column;
          margin-top: 16px;
        }
      `}</style>
    </section>
  )
}

import {
  FeatureFlags,
  isEnabled,
  RuntimeFlag,
  RuntimeFlagType,
} from "@tallyho/tally-background/features"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import BalanceReloader from "../BalanceReloader/BalanceReloader"
import SharedPageHeader from "../Shared/SharedPageHeader"
import SharedToggleButton from "../Shared/SharedToggleButton"

function FeatureFlag(props: { name: RuntimeFlagType }): ReactElement {
  const { name } = props
  const { t } = useTranslation("translation", {
    keyPrefix: "devPanel.featureFlags.flags",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [value, setValue] = useState(isEnabled(FeatureFlags[name]))

  useEffect(() => {
    ;(async () => {
      setIsSaving(true)
      await browser.storage.local.set({ [name]: String(value) })
      setIsSaving(false)
    })()
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
        disabled={isSaving}
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
        {(Object.keys(RuntimeFlag) as RuntimeFlagType[]).map((flagName) => (
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

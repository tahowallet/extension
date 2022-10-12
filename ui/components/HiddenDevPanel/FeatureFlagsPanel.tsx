import { isEnabled, FeatureFlagTypes } from "@tallyho/tally-background/features"
import React, { ReactElement, useEffect, useState } from "react"
import { setLocalStorageItem } from "../../hooks"
import SharedPageHeader from "../Shared/SharedPageHeader"
import SharedToggleButton from "../Shared/SharedToggleButton"

function FeatureFlag(props: { name: string }): ReactElement {
  const { name } = props
  const [value, setValue] = useState(
    isEnabled(Object.values(FeatureFlagTypes).indexOf(name))
  )

  useEffect(() => {
    setLocalStorageItem(name, String(value))
  }, [name, value])

  return (
    <li className="toggle_wrap">
      <span className="simple_text">{name}</span>
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
  return (
    <section className="standard_width">
      <SharedPageHeader backPath="/dev" withoutBackText>
        Feature Flags
      </SharedPageHeader>
      <ul className="flags_wrap">
        {Object.keys(FeatureFlagTypes)
          .filter((key) => Number.isNaN(+key))
          .map((name) => (
            <FeatureFlag key={name} name={name} />
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

import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { SettingRow, useSettingsGroups } from "../Settings"
import FullTabSection from "../../components/FullTab/FullTabSection"

type Props = {
  group: "general" | "walletOptions"
}

/**
 * The full-tab page for one group of the popup's settings, shown as a
 * section of its own. The general group also includes the default wallet
 * toggle, which the popup shows in its top bar instead.
 */
export default function FullTabSettings({ group }: Props): ReactElement {
  const { t } = useTranslation()
  const { title, items } = useSettingsGroups()[group]

  return (
    <FullTabSection eyebrow={t("settings.mainMenu")} title={title}>
      <ul>
        {items.map((item, index) => (
          <SettingRow
            // Rows without a title are buttons, which all share an empty
            // title, so the index is included to keep their keys unique.
            // oxlint-disable-next-line react/no-array-index-key
            key={`${item.title}-${index}`}
            title={item.title}
            component={item.component}
            tooltip={item.tooltip}
          />
        ))}
      </ul>
      <style jsx>{`
        ul {
          display: block;
          max-width: 560px;
          margin: 0;
          padding: 8px 24px 24px;
          list-style: none;
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
        }
        /* Rows that are only a button, with no title, span the card. */
        ul :global(li > .left:empty) {
          display: none;
        }
        ul :global(li > .left:empty + .right) {
          flex: 1;
        }
        ul :global(li > .left:empty + .right > *) {
          width: 100%;
        }
      `}</style>
    </FullTabSection>
  )
}

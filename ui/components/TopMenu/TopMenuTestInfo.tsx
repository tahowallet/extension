import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedSlideUpMenuPanel from "../Shared/SharedSlideUpMenuPanel"

type Props = {
    buttonText: String
}

export default function TopMenuTestInfo({
    buttonText,
}: Props): ReactElement {
  const { t } = useTranslation()

  return (
    <SharedSlideUpMenuPanel
      header="Test popup"
    >
        <button>{buttonText}</button>
    </SharedSlideUpMenuPanel>
  )
}

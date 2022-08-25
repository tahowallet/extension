import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../../components/Shared/SharedButton"
import SharedIcon from "../../components/Shared/SharedIcon"

export default function SettingButton(props: {
  link: string
  ariaLabel: string
  tPath: string
}): ReactElement {
  const { t } = useTranslation()
  const { link, ariaLabel, tPath } = props

  return (
    <SharedButton type="unstyled" size="medium" linkTo={link}>
      <div className="button_row">
        <div className="action_name">{t(tPath)}</div>
        <SharedIcon
          icon="icons/s/continue.svg"
          width={16}
          color="var(--green-20)"
          ariaLabel={ariaLabel}
        />
        <style jsx>{`
          .action_name {
            color: var(--green-20);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .button_row {
            width: 336px;
            align-items: center;
            justify-content: space-between;
            align-content: center;
            display: flex;
          }
          .button_row:hover > .action_name {
            color: var(--green-5);
          }
        `}</style>
      </div>
    </SharedButton>
  )
}

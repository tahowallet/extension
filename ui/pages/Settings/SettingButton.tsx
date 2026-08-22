import React, { ReactElement } from "react"
import SharedButton from "../../components/Shared/SharedButton"
import SharedIcon from "../../components/Shared/SharedIcon"

/**
 * A settings row: what it does, and a chevron or similar pointing at where it
 * goes.
 *
 * The icon takes no label. The row's own text names the action, and an icon
 * labelled inside a button joins that button's accessible name — so labelling
 * this one would rename every row to say the same thing twice.
 */
export default function SettingButton(props: {
  label: string
  icon: string
  link?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}): ReactElement {
  const { link, label, icon, onClick } = props

  return (
    <SharedButton type="unstyled" size="medium" linkTo={link} onClick={onClick}>
      <div className="button_row">
        <div className="action_name">{label}</div>
        <SharedIcon
          icon={`icons/s/${icon}.svg`}
          width={16}
          color="var(--green-20)"
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

import React, { ReactElement } from "react"

const SIZE = 32
const DEFAULT_COLORS: ColorDetails = {
  color: "var(--green-40)",
  hoverColor: "var(--gold-80)",
}
const DEFAULT_ICON_COLORS: ColorDetails = {
  color: "var(--action-tile)",
  hoverColor: "var(--action-tile-hover)",
}

type ColorDetails = {
  color: string
  hoverColor: string
}

type Props = {
  icon: string
  iconColor?: ColorDetails
  textColor?: ColorDetails
  disabled?: boolean
  size?: number
  ariaLabel?: string
  children: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export default function SharedSquareButton(props: Props): ReactElement {
  const {
    icon,
    iconColor = DEFAULT_ICON_COLORS,
    textColor = DEFAULT_COLORS,
    size = SIZE,
    ariaLabel,
    children,
    disabled,
    onClick,
  } = props

  return (
    <button
      type="button"
      className={!disabled ? "hoverable" : undefined}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <div className="icon_wrap">
        <div className="icon" />
      </div>
      <div className="text">{children}</div>
      <style jsx>
        {`
          button {
            font-size: 12px;
            font-weight: 500;
            line-height: 16px;
            letter-spacing: 0.03em;
            color: ${textColor.color};
            transition: color var(--fade);
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .hoverable:hover {
            color: ${textColor.hoverColor};
          }
          .content_wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .icon_wrap {
            border-radius: 12px;
            width: ${size}px;
            height: ${size}px;
            background-color: ${iconColor.color};
            transition:
              background-color var(--fade),
              box-shadow var(--fade);
          }
          .hoverable:hover .icon_wrap {
            background-color: ${iconColor.hoverColor};
            box-shadow: var(--action-tile-hover-shadow);
          }
          .hoverable:hover .icon {
            background-color: var(--action-tile-hover-icon);
          }
          .icon {
            mask-image: url("./images/${icon}");
            mask-repeat: no-repeat;
            mask-position: center;
            mask-size: cover;
            width: ${size / 2}px;
            height: ${size / 2}px;
            margin: ${size / 4}px;
            background-color: var(--on-accent);
            transition: background-color var(--fade);
          }
        `}
      </style>
    </button>
  )
}

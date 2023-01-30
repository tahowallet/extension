import React, { ReactElement } from "react"

const SIZE = 32
const DEFAULT_COLORS: ColorDetails = {
  color: "var(--green-40)",
  hoverColor: "var(--gold-80)",
}

type ColorDetails = {
  color: string
  hoverColor: string
}

type Props = {
  icon: string
  iconColor: ColorDetails
  textColor: ColorDetails
  size: number
  ariaLabel?: string
  children: React.ReactNode
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

export default function SharedSquareButton(props: Props): ReactElement {
  const { icon, iconColor, textColor, size, ariaLabel, children, onClick } =
    props

  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick}>
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
            transition: color 0.2s;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          button:hover {
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
            transition: background-color 0.2s;
          }
          button:hover .icon_wrap {
            background-color: ${iconColor.hoverColor};
          }
          .icon {
            mask-image: url("./images/${icon}");
            mask-repeat: no-repeat;
            mask-position: center;
            mask-size: cover;
            width: ${size / 2}px;
            height: ${size / 2}px;
            margin: ${size / 4}px;
            background-color: var(--hunter-green);
          }
        `}
      </style>
    </button>
  )
}

SharedSquareButton.defaultProps = {
  iconColor: DEFAULT_COLORS,
  textColor: DEFAULT_COLORS,
  size: SIZE,
}

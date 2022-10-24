import React, { ReactElement } from "react"

type Props = {
  icon: string
  width: number
  height?: number
  color?: string
  hoverColor?: string
  transitionHoverTime: string
  customStyles?: string
  ariaLabel?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function SharedIcon(props: Props): ReactElement {
  const {
    icon,
    width,
    height = width,
    color = "transparent",
    hoverColor = color,
    transitionHoverTime,
    customStyles = "",
    ariaLabel,
    onClick,
  } = props

  return (
    <button
      className="icon"
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <style jsx>{`
        .icon {
          mask-image: url("./images/${icon}");
          mask-size: cover;
          width: ${width}px;
          height: ${height}px;
          cursor: ${onClick ? "pointer" : "auto"};
          background-color: ${color};
          ${customStyles};
          transition: background-color ${transitionHoverTime};
        }
        .icon:hover {
          background-color: ${hoverColor};
        }
      `}</style>
    </button>
  )
}

SharedIcon.defaultProps = {
  transitionHoverTime: "0",
}

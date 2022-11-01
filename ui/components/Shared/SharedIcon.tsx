import React, { ReactElement } from "react"

type Props = {
  icon: string
  width: number
  height?: number
  color?: string
  customStyles?: string
  hoverColor?: string
  transitionHoverTime: string
  ariaLabel?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function SharedIcon(props: Props): ReactElement {
  const {
    icon,
    width,
    height = width,
    color = "transparent",
    customStyles = "",
  } = props

  if ("onClick" in props) {
    const {
      hoverColor = color,
      transitionHoverTime,
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
            cursor: pointer;
            background-color: ${color};
            transition: background-color ${transitionHoverTime};
            ${customStyles};
          }
          .icon:hover {
            background-color: ${hoverColor};
          }
        `}</style>
      </button>
    )
  }

  return (
    <i className="icon">
      <style jsx>{`
        .icon {
          mask-image: url("./images/${icon}");
          mask-size: cover;
          width: ${width}px;
          height: ${height}px;
          background-color: ${color};
          ${customStyles};
        }
      `}</style>
    </i>
  )
}

SharedIcon.defaultProps = {
  transitionHoverTime: "0",
}

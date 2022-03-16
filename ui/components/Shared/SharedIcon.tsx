import classNames from "classnames"
import React, { ReactElement } from "react"

type Props = {
  type: "mask" | "background"
  icon: string
  width: number
  height?: number
  color?: string
  hoverColor?: string
  customStyles?: string
  ariaLabel?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

export default function SharedIcon(props: Props): ReactElement {
  const {
    type,
    icon,
    width,
    height = width,
    color = "transparent",
    hoverColor = color,
    customStyles = "",
    ariaLabel,
    onClick,
  } = props

  return (
    <button
      className={classNames("icon", {
        mask: type === "mask",
        background: type === "background",
      })}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <style jsx>{`
        .mask {
          mask-image: url("./images/${icon}");
          mask-size: cover;
        }
        .background {
          background-image: url("./images/${icon}");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        }
        .icon {
          width: ${width}px;
          height: ${height}px;
          cursor: ${onClick ? "pointer" : "auto"};
          background-color: ${color};
          ${customStyles};
        }
        .icon:hover {
          background-color: ${hoverColor};
        }
      `}</style>
    </button>
  )
}

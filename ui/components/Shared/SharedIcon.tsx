import React, { CSSProperties, ReactElement } from "react"

type Props = {
  icon: string
  width: number
  height?: number
  color?: string
  style?: CSSProperties
  hoverColor?: string
  transitionHoverTime: string
  ariaLabel?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}

export default function SharedIcon(props: Props): ReactElement {
  const { icon, width, height = width, color = "transparent", style } = props

  if ("onClick" in props) {
    const {
      hoverColor = color,
      transitionHoverTime,
      ariaLabel,
      onClick,
      disabled = false,
    } = props

    return (
      <button
        className="icon"
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={ariaLabel}
        aria-label={ariaLabel}
        style={style}
      >
        <style jsx>{`
          .icon {
            mask-image: url("./images/${icon}");
            mask-size: cover;
            width: ${width}px;
            height: ${height}px;
            background-color: ${color};
            transition: background-color ${transitionHoverTime};
          }

          .icon:disabled {
            cursor: unset;
            background-color: var(--green-60);
          }

          .icon:enabled:hover {
            cursor: pointer;
            background-color: ${hoverColor};
          }
        `}</style>
      </button>
    )
  }

  return (
    <i className="icon" style={style}>
      <style jsx>{`
        .icon {
          display: inline-block;
          mask-image: url("./images/${icon}");
          mask-size: cover;
          width: ${width}px;
          height: ${height}px;
          background-color: ${color};
        }
      `}</style>
    </i>
  )
}

SharedIcon.defaultProps = {
  transitionHoverTime: "0",
}

import React, { CSSProperties, ReactElement } from "react"

type Props = {
  id?: string
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
  const {
    id,
    icon,
    width,
    height = width,
    color = "transparent",
    style,
  } = props

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
        id={id}
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

  const { ariaLabel } = props

  return (
    /*
     * Either this icon carries meaning of its own or it does not, and which
     * one is the caller's to say. Given a label it is announced as an image
     * by that name; given none it is hidden outright, rather than left as an
     * unnamed element for assistive technology to guess at.
     *
     * The distinction has to be explicit because a labelled icon is not
     * free: an accessible name inside a button becomes part of that button's
     * name. An icon that merely decorates text already naming the action —
     * every row on the settings page — has to say so, or it renames the row.
     */
    <i
      id={id}
      className="icon"
      style={style}
      role={ariaLabel === undefined ? undefined : "img"}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel === undefined || undefined}
    >
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

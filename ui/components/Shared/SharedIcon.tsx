import React, { ReactElement } from "react"

type Props = {
  icon: string
  width: number
  height?: number
  color?: string
  customStyles?: string
  onClick?: () => void
}

export default function SharedIcon(props: Props): ReactElement {
  const {
    icon,
    width,
    height = width,
    color,
    customStyles = "",
    onClick,
  } = props

  return (
    <button className="icon" type="button" onClick={onClick}>
      <style jsx>{`
        mask-image: url("./images/${icon}.svg");
        mask-size: cover;
        background-color: ${color};
        width: ${width}px;
        height: ${height}px;
        cursor: ${onClick ? "pointer" : "auto"};
        ${customStyles};
      `}</style>
    </button>
  )
}

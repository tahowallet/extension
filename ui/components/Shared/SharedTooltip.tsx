import React, { ReactElement, useState } from "react"

type VerticalPosition = "top" | "bottom"
type HorizontalPosition = "left" | "center" | "right"

interface Props {
  verticalPosition?: VerticalPosition
  horizontalPosition?: HorizontalPosition
  width: number
  height?: number
  children: React.ReactNode
  // TODO: find a better way to tell the IconComponent that the tooltip it open
  IconComponent?: ({
    isShowingTooltip,
  }: {
    isShowingTooltip: boolean
  }) => ReactElement
}

function getHorizontalPosition(horizontal: HorizontalPosition, width: number) {
  switch (horizontal) {
    case "center":
      return `right: -${width / 2 + 4}px;`
    case "right":
      return `right: -${width + 8}px;`
    case "left":
      return `left: -${width + 8}px;`
    default:
      return ""
  }
}

function getVerticalPosition(vertical: VerticalPosition, height: number) {
  switch (vertical) {
    case "bottom":
      return `top: ${height}px; margin-top: 5px;`
    case "top":
      return `bottom: ${height}px; margin-bottom: 5px;`
    default:
      return ""
  }
}

export default function SharedTooltip(props: Props): ReactElement {
  const {
    children,
    verticalPosition = "bottom",
    horizontalPosition = "center",
    width,
    height = 20,
    IconComponent,
  } = props
  const [isShowingTooltip, setIsShowingTooltip] = useState(false)

  return (
    <div
      className="tooltip_wrap"
      onMouseEnter={() => {
        setIsShowingTooltip(true)
      }}
      onMouseLeave={() => {
        setIsShowingTooltip(false)
      }}
    >
      {IconComponent ? (
        <IconComponent isShowingTooltip={isShowingTooltip} />
      ) : (
        <div className="info_icon" />
      )}
      {isShowingTooltip ? <div className="tooltip">{children}</div> : null}
      <style jsx>
        {`
          .tooltip_wrap {
            width: fit-content;
            display: block;
            position: relative;
            padding: 5px 0;
            margin: -5px 0 -5px 8px;
            z-index: 20;
          }
          .info_icon {
            background: url("./images/info@2x.png");
            background-size: cover;
            width: 16px;
            height: 16px;
            display: block;
          }
          .tooltip {
            width: ${width}px;
            position: absolute;
            box-shadow: 0 2px 4px rgba(0, 20, 19, 0.24),
              0 6px 8px rgba(0, 20, 19, 0.14), 0 16px 16px rgba(0, 20, 19, 0.04);
            background-color: var(--green-20);
            color: var(--green-95);
            font-size: 14px;
            font-weight: 500;
            line-height: 20px;
            border-radius: 3px;
            padding: 12px;
            ${getVerticalPosition(verticalPosition, height)}
            ${getHorizontalPosition(horizontalPosition, width)}
          }
        `}
      </style>
    </div>
  )
}

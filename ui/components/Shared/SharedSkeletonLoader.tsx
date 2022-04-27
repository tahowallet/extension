import React, { ReactElement } from "react"
import classNames from "classnames"

export default function SharedSkeletonLoader(props: {
  width?: number
  height?: number
  borderRadius?: number
  margin?: string
  children?: React.ReactNode
  isLoaded?: boolean
}): ReactElement {
  const { width, height, borderRadius, margin, isLoaded, children } = props

  if (isLoaded) return <>{children}</>

  return (
    <div className={classNames("skeleton")}>
      <style jsx>
        {`
          .skeleton {
            width: ${width ? `${width}px` : "100%"};
            height: ${height}px;
            background-color: var(--hunter-green);
            border-radius: ${borderRadius}px;
            margin: ${margin};
            animation: pulse 1.1s infinite;
          }
          @keyframes pulse {
            0% {
              background-color: var(--hunter-green);
            }
            50% {
              background-color: var(--green-95);
            }
            100% {
              background-color: var(--hunter-green);
            }
        `}
      </style>
    </div>
  )
}

SharedSkeletonLoader.defaultProps = {
  height: 24,
  borderRadius: 8,
  margin: "0",
  isLoaded: false,
}

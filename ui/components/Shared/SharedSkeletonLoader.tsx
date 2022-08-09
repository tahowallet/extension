import React, { ReactElement } from "react"
import classNames from "classnames"

export default function SharedSkeletonLoader(props: {
  width?: number
  height?: number
  borderRadius?: number
  children?: React.ReactNode
  isLoaded?: boolean
  customStyles?: string
}): ReactElement {
  const { width, height, borderRadius, isLoaded, customStyles, children } =
    props

  if (isLoaded) return <>{children}</>

  return (
    <div className={classNames("skeleton")}>
      <style jsx>
        {`
          .skeleton {
            width: ${width ? `${width}px` : "100%"};
            height: ${height ? `${height}px` : "100%"};;
            background-color: var(--hunter-green);
            border-radius: ${borderRadius}px;
            animation: pulse 1.1s infinite;
            ${customStyles}
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
  borderRadius: 8,
  isLoaded: false,
  customStyles: "",
}

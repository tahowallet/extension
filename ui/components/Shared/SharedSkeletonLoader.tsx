import React, { ReactElement, ReactNode } from "react"
import classNames from "classnames"

export default function SharedSkeletonLoader(props: {
  width?: number
  height?: number
  borderRadius?: number
  children?: ReactNode
  isLoaded?: boolean
  customStyles?: string
}): ReactElement {
  const { width, height, borderRadius, isLoaded, customStyles, children } =
    props

  // Want to return a ReactElement to make this maximally easy to integrate,
  // whereas children can be a ReactNode; Fragment will let us achieve that.
  // eslint-disable-next-line react/jsx-no-useless-fragment
  if (isLoaded) return <>{children}</>

  return (
    <div className={classNames("skeleton")} data-testid="loading_skeleton">
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

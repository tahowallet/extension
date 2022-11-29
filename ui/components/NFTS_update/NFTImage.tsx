import classNames from "classnames"
import React, { ReactElement, useState } from "react"

const noPreviewLink = "./images/no_preview.svg"

export default function NFTImage({
  width,
  height,
  alt,
  src,
  fit = "cover",
  isAchievement,
}: {
  width?: number
  height?: number
  alt: string
  src?: string
  fit?: string
  isAchievement?: boolean
}): ReactElement {
  const [isLoading, setIsLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState(src || noPreviewLink)

  return (
    <>
      <img
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        className={classNames({
          loading: isLoading,
        })}
        alt={alt}
        src={imageUrl}
        width={width}
        height={height}
        onError={({ currentTarget }) => {
          // eslint-disable-next-line no-param-reassign
          currentTarget.onerror = null // prevents looping
          setImageUrl("./images/no_preview.svg")
          setIsLoading(false)
        }}
      />
      <style jsx>{`
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
        }
        img {
          width: ${width ?? "auto"};
          height: ${height ?? "auto"};
          object-fit: ${fit};
          max-height: ${height ?? "100%"};
          max-width: ${width ?? "100%"};
          border-radius: ${isAchievement ? "100%" : "8px"};
          flex-grow: 1;
        }
        .loading {
          background-color: var(--hunter-green);
          border-radius: ${isAchievement ? "100%" : "8px"};
          animation: pulse 1.1s infinite;
        }
      `}</style>
    </>
  )
}

import classNames from "classnames"
import React, { ReactElement, useState } from "react"

export default function NFTsImage({
  width,
  height,
  alt,
  src,
  fit = "cover",
}: {
  width?: number
  height?: number
  alt: string
  src: string
  fit?: string
}): ReactElement {
  const [isLoading, setIsLoading] = useState(true)
  return (
    <>
      <img
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        className={classNames({
          loading: isLoading,
        })}
        alt={alt}
        src={src}
        width={width}
        height={height}
        onError={({ currentTarget }) => {
          // eslint-disable-next-line no-param-reassign
          currentTarget.onerror = null // prevents looping
          // eslint-disable-next-line no-param-reassign
          currentTarget.src = "./images/no_preview.svg"
          // eslint-disable-next-line no-param-reassign
          currentTarget.className = ""
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
          border-radius: 8px;
          flex-grow: 1;
        }
        .loading {
          background-color: var(--hunter-green);
          border-radius: 8px;
          animation: pulse 1.1s infinite;
        }
      `}</style>
    </>
  )
}

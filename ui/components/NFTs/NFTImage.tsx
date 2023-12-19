import classNames from "classnames"
import React, { CSSProperties, ReactElement, useEffect, useState } from "react"
import noop from "../../utils/noop"

export const noPreviewLink = "./images/no_preview.svg"

type NFTIMageProps = {
  width: number
  height?: number
  alt: string
  src?: string
  highResolutionSrc?: string
  fit?: string
  isBadge?: boolean
  isZoomed?: boolean
  style?: CSSProperties
}

export default function NFTImage({
  width,
  height,
  alt,
  src,
  highResolutionSrc,
  fit = "cover",
  isBadge = false,
  isZoomed = false,
  style,
}: NFTIMageProps): ReactElement {
  const [isLoading, setIsLoading] = useState(true)
  const [imageUrl, setImageUrl] = useState(src || noPreviewLink)

  useEffect(() => {
    if (!highResolutionSrc) {
      return noop
    }

    const img = new Image()
    const handleSuccessfulLoad = () => setImageUrl(highResolutionSrc)

    img.src = highResolutionSrc
    img.addEventListener("load", handleSuccessfulLoad)

    return () => {
      img.removeEventListener("load", handleSuccessfulLoad)
    }
  }, [highResolutionSrc])

  return (
    <>
      <div
        className={classNames("nft_image_wrapper", {
          badge: isBadge,
        })}
        style={style}
      >
        <div className="nft_image_background" />
        <img
          loading="lazy"
          onLoad={() => setIsLoading(false)}
          className={classNames({
            loading: isLoading,
            badge: isBadge,
            zoom: isZoomed,
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
      </div>
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
          width: ${width}px;
          height: ${height ? `${height}px` : "auto"};
          object-fit: ${fit};
          max-height: ${height ?? "100%"};
          max-width: ${width ?? "100%"};
          transform: scale(1);
          flex-grow: 1;
          transition: transform 200ms ease-in-out;
        }
        img.zoom {
          transform: scale(1.5);
        }
        img.badge {
          position: absolute;
          top: 0;
          left: 0;
          width: ${width * 0.8}px;
          height: ${height ? `${height * 0.8}px` : "auto"};
          margin: ${width * 0.1}px;
          border-radius: 100%;
        }
        img.loading {
          background-color: var(--hunter-green);
          border-radius: ${isBadge ? "100%" : "8px"};
          animation: pulse 1.1s infinite;
        }

        .nft_image_wrapper {
          border-radius: 8px;
          overflow: hidden;
        }
        .nft_image_wrapper.badge {
          overflow: hidden;
          position: relative;
          width: ${width}px;
          height: ${height || width + 40}px;
        }
        .nft_image_wrapper.badge .nft_image_background {
          width: 120%;
          height: 120%;
          position: absolute;
          top: -10%;
          left: -10%;
          background: no-repeat center/200% url(${imageUrl});
          filter: blur(20px);
        }
      `}</style>
    </>
  )
}

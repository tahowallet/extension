import React, { ReactElement, useState, useEffect } from "react"
import SharedSkeletonLoader from "../Shared/SharedSkeletonLoader"

const placeholderSrc = "./images/no_preview.svg"

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
  const [imageSrc, setImageSrc] = useState<string>(placeholderSrc)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      setImageSrc(src)
      setIsLoading(false)
    }
    img.onerror = () => {
      setImageSrc(placeholderSrc)
      setIsLoading(false)
    }
  }, [src])

  return (
    <>
      <SharedSkeletonLoader
        isLoaded={!isLoading}
        width={width}
        height={height}
        borderRadius={8}
      >
        <img alt={alt} src={imageSrc} />
      </SharedSkeletonLoader>
      <style jsx>{`
        img {
          width: ${width ?? "auto"};
          height: ${height ?? "auto"};
          object-fit: ${fit};
          max-height: ${height ?? "100%"};
          max-width: ${width ?? "100%"};
          border-radius: 8px;
          flex-grow: 1;
        }
      `}</style>
    </>
  )
}

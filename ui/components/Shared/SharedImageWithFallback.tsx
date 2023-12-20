import React, {
  CSSProperties,
  PropsWithoutRef,
  useEffect,
  useState,
} from "react"
import classNames from "classnames"

// Transparent pixel
const defaultPlaceholder =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

type SharedImageWithFallbackProps = PropsWithoutRef<
  JSX.IntrinsicElements["img"]
> & {
  fallback: string
  placeholder?: string
  style?: CSSProperties
}

export default function SharedImageWithFallback({
  fallback,
  src = fallback,
  width,
  height,
  loading,
  alt,
  className,
  style,
  placeholder = defaultPlaceholder,
}: SharedImageWithFallbackProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(true)
  const [imageSrc, setImageSrc] = useState(placeholder)

  useEffect(() => {
    const img = new Image()
    img.src = src

    const setLoadedImgOrFallback = (href: string) => {
      setIsLoading(false)
      setImageSrc(href)
    }

    const handleSuccessfulLoad = () => setLoadedImgOrFallback(src)
    const handleLoadFailure = () => setLoadedImgOrFallback(fallback)

    img.addEventListener("load", handleSuccessfulLoad)
    img.addEventListener("error", handleLoadFailure)

    return () => {
      img.removeEventListener("load", handleSuccessfulLoad)
      img.removeEventListener("error", handleLoadFailure)
    }
  }, [src, fallback])

  return (
    <>
      <img
        className={classNames(className, { loading: isLoading })}
        src={imageSrc}
        style={style}
        {...{ loading, alt, width, height }}
      />
      <style jsx>
        {`
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

          .loading {
            animation: pulse 1.1s infinite;
          }
        `}
      </style>
    </>
  )
}

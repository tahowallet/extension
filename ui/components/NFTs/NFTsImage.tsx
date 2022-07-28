import React, { ReactElement } from "react"

export default function NFTsImage({
  width,
  height,
  alt,
  src,
}: {
  width?: string
  height?: string
  alt: string
  src: string
}): ReactElement {
  return (
    <>
      <img
        alt={alt}
        src={src}
        onError={({ currentTarget }) => {
          // if NFT is incognito let's display placeholder
          currentTarget.onerror = null // eslint-disable-line no-param-reassign
          currentTarget.src = "./images/empty_bowl@2x.png" // eslint-disable-line no-param-reassign
        }}
      />
      <style jsx>{`
        img {
          width: ${width ?? "auto"};
          height: ${height ?? "auto"};
          object-fit: cover;
          max-height: 100%;
          max-width: 100%;
          border-radius: 8px;
          background-color: var(--green-120);
          flex-grow: 1;
        }
      `}</style>
    </>
  )
}

import React, { ReactElement } from "react"
import SharedIcon from "../Shared/SharedIcon"
import NFTsImage from "./NFTsImage"
import { scanWebsite } from "../../utils/constants"

export default function NFTsSlideUpPreviewContent({
  title,
  src,
  chainID,
  contractAddress,
  tokenID,
}: {
  title: string
  src: string
  chainID: number
  contractAddress: string
  tokenID: number
}): ReactElement {
  return (
    <>
      <header>
        <h1>{title}</h1>
        <SharedIcon
          icon="icons/s/new-tab.svg"
          width={16}
          color="var(--green-40)"
          hoverColor="#fff"
          onClick={() => {
            window
              .open(
                `${scanWebsite[chainID].url}/token/${contractAddress}?a=${tokenID}`,
                "_blank"
              )
              ?.focus()
          }}
        />
      </header>
      <div className="preview">
        <NFTsImage alt={title} src={src} />
      </div>
      <style jsx>{`
        header {
          margin: 0 24px;
          display: flex;
          align-items: center;
        }
        h1 {
          font-size: 18px;
          line-height: 24px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0px;
          margin-right: 8px;
          max-width: calc(100% - 48px);
        }
        .preview {
          display: flex;
          align-items: center;
          justify-items: center;
          margin: 16px 24px;
          height: 460px;
          width: calc(100% - 48px);
        }
      `}</style>
    </>
  )
}

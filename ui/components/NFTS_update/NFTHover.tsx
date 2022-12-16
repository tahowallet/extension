/* eslint-disable no-nested-ternary */
import React, { ReactElement } from "react"
import { i18n, I18nKey } from "../../_locales/i18n"
import SharedIcon from "../Shared/SharedIcon"

const icons: Record<
  "close" | "expand" | "view",
  {
    icon: string
    label: I18nKey
    background: string
    size: number
    style: string
  }
> = {
  close: {
    icon: "close",
    label: i18n.t("nfts.collectionHover.close"),
    background: "var(--green-40)",
    size: 12,
    style: "",
  },
  expand: {
    icon: "chevron",
    label: i18n.t("nfts.collectionHover.expand"),
    background: "var(--success)",
    size: 12,
    style: "margin-bottom: 3px;",
  },
  view: {
    icon: "eye",
    label: i18n.t("nfts.collectionHover.view"),
    background: "var(--trophy-gold)",
    size: 22,
    style: "",
  },
}

const getIcon = (isCollection: boolean, isExpanded: boolean) => {
  if (isCollection) {
    return isExpanded ? icons.close : icons.expand
  }
  return icons.view
}

export default function NFTsHover(props: {
  isCollection?: boolean
  isExpanded?: boolean
  onClick: () => void
}): ReactElement {
  const { isCollection = false, isExpanded = false, onClick } = props

  const { icon, label, background, size, style } = getIcon(
    isCollection,
    isExpanded
  )

  return (
    <button type="button" className="nft_hover" onClick={onClick}>
      <div>{label}</div>
      <div className="nft_hover_icon">
        <SharedIcon
          icon={`${icon}@2x.png`}
          width={size}
          color="var(--hunter-green)"
          customStyles={style}
        />
      </div>
      <style jsx>{`
        .nft_hover {
          opacity: ${isExpanded ? 1 : 0};
          position: absolute;
          top: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 20, 19, 0.75); // --green-120
          border-radius: 4px;
          backdrop-filter: blur(8px);
          font-size: 14px;
          font-weight: 500;
          line-height: 16px;
          letter-spacing: 3%;
          z-index: 1;
          transition: opacity 200ms ease-in-out;
        }
        .nft_hover:hover {
          opacity: 1;
        }
        .nft_hover_icon {
          margin-top: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${background};
          width: 32px;
          height: 32px;
          border-radius: 100%;
        }
      `}</style>
    </button>
  )
}

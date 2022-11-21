/* eslint-disable no-nested-ternary */
import React, { ReactElement } from "react"
import SharedIcon from "../../Shared/SharedIcon"

export default function NFTsHover(props: {
  isCollection?: boolean
  isExpanded?: boolean
  onClick: () => void
}): ReactElement {
  const { isCollection = false, isExpanded = false, onClick } = props

  const label = isCollection
    ? isExpanded
      ? "close"
      : "expand collection"
    : "view details"
  const icon = isCollection ? (isExpanded ? "close" : "chevron") : "eye"
  return (
    <button type="button" className="nft_hover" onClick={onClick}>
      <div className="nft_hover_label">{label}</div>
      <SharedIcon
        icon={`${icon}@2x.png`}
        width={24}
        color="var(--hunter-green)"
      />
      <style jsx>{`
        .nft_hover {
        }
        .nft_hover_label {
        }
      `}</style>
    </button>
  )
}

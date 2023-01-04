import {
  isProbablyEVMAddress,
  truncateAddress,
} from "@tallyho/tally-background/lib/utils"
import React, { ReactElement } from "react"
import SharedToggleButton from "../../Shared/SharedToggleButton"

const STARS_GREY_URL = "./images/stars_grey.svg"

type FilterListItemProps = {
  label: string
  thumbnailURL?: string
  checked: boolean
  onChange: (toggleValue: boolean) => void
}

export default function FilterListItem({
  label,
  thumbnailURL,
  checked,
  onChange,
}: FilterListItemProps): ReactElement {
  return (
    <div className="content">
      <div className="text_wrap">
        <div className="thumbnail" />
        <label className="label ellipsis">
          {isProbablyEVMAddress(label) ? truncateAddress(label) : label}
        </label>
      </div>
      <SharedToggleButton onChange={onChange} value={checked} />
      <style jsx>{`
        .content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 8px 4px 4px;
          background: var(--hunter-green);
          border-radius: 6px;
        }
        .text_wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 85%;
        }
        .thumbnail {
          background: url("${thumbnailURL || STARS_GREY_URL}") center no-repeat;
          background-size: cover;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .label {
          margin-top: 0;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          color: var(--white);
          display: block;
        }
      `}</style>
    </div>
  )
}

import React, { ReactElement } from "react"
import SharedBanner, { CanBeClosedProps } from "../../Shared/SharedBanner"

export default function UnverifiedAssetBanner({
  id,
  title,
  description,
  customStyles,
}: {
  id?: string
  title: string
  description: string
  customStyles?: string
}): ReactElement {
  const props: CanBeClosedProps = id ? { canBeClosed: true, id } : {}
  return (
    <SharedBanner
      icon="notif-attention"
      iconColor="var(--attention)"
      customStyles={customStyles}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <div className="banner">
        <span className="warning_text">{title}</span>
        <span className="simple_text">{description}</span>
      </div>
      <style jsx>{`
        .banner {
          display: flex;
          flex-direction: column;
          width: 84%;
        }
        .warning_text {
          font-size: 16px;
          line-height: 24px;
          font-weight: 500;
          color: var(--attention);
        }
      `}</style>
    </SharedBanner>
  )
}

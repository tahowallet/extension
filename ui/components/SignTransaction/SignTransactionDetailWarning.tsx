import React, { ReactElement } from "react"
import SharedBanner from "../Shared/SharedBanner"
import SharedIcon from "../Shared/SharedIcon"

type DismissableProps =
  | {
      dismissable: true
      onDismiss: () => void
    }
  | {
      dismissable?: false
      onDismiss?: never
    }

type WarningProps = { message: string } & DismissableProps

export default function SignTransactionDetailWarning(
  props: WarningProps
): ReactElement {
  const { message, dismissable = false, onDismiss } = props

  return (
    <>
      <SharedBanner icon="notif-attention" iconColor="var(--attention)">
        {dismissable && (
          <SharedIcon
            onClick={() => onDismiss?.()}
            icon="icons/s/close.svg"
            ariaLabel="close"
            width={16}
            color="var(--green-40)"
            hoverColor="var(--green-20)"
            customStyles={`
              position: absolute;
              top: 12px;
              right: 12px;
            `}
          />
        )}
        <span className="detail_warning">{message}</span>
      </SharedBanner>
      <style jsx>
        {`
          .detail_warning {
            font-size: 16px;
            line-height: 24px;
            font-weight: 500;
            color: var(--attention);
          }
        `}
      </style>
    </>
  )
}

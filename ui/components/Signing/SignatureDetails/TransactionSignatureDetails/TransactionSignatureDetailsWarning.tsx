import React, { ReactElement, useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import SharedBanner from "../../../Shared/SharedBanner"
import SharedIcon from "../../../Shared/SharedIcon"
import { useBackgroundDispatch } from "../../../../hooks"

type DismissableProps =
  | {
      dismissable: true
      onDismiss: () => void
    }
  | {
      dismissable?: false
      onDismiss?: never
    }

type ExpandableProps =
  | {
      details: string
      detailsCopyMessage: string
    }
  | {
      details?: never
      detailsCopyMessage?: never
    }

type WarningProps = {
  message: string
  variant?: "attention" | "error"
} & DismissableProps &
  ExpandableProps

export default function TransactionSignatureDetailsWarning(
  props: WarningProps,
): ReactElement {
  const {
    message,
    variant = "attention",
    dismissable = false,
    onDismiss,
    details,
    detailsCopyMessage,
  } = props

  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const [isExpanded, setIsExpanded] = useState(false)

  const hasDetails = details !== undefined

  const copyDetailsToClipboard = useCallback(() => {
    if (details) {
      navigator.clipboard.writeText(details)
      dispatch(setSnackbarMessage(detailsCopyMessage ?? t("shared.copied")))
    }
  }, [details, detailsCopyMessage, dispatch, t])

  const color = variant === "error" ? "var(--error)" : "var(--attention)"

  const messageContent = hasDetails ? (
    <button
      type="button"
      className="warning_header"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <span className="detail_warning">{message}</span>
      <SharedIcon
        icon="icons/s/arrow-toggle.svg"
        width={16}
        color={color}
        style={{
          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease-in-out",
          marginLeft: 8,
          flexShrink: 0,
        }}
      />
    </button>
  ) : (
    <span className="detail_warning">{message}</span>
  )

  return (
    <>
      <SharedBanner icon="notif-attention" iconColor={color}>
        {dismissable && (
          <SharedIcon
            onClick={() => onDismiss?.()}
            icon="icons/s/close.svg"
            ariaLabel="close"
            width={16}
            color="var(--green-40)"
            hoverColor="var(--green-20)"
            style={{ position: "absolute", top: 12, right: 12 }}
          />
        )}
        {messageContent}
        {hasDetails && isExpanded && (
          <div className="details_section">
            <div className="details_content">
              <pre className="details_text">{details}</pre>
            </div>
            <button
              type="button"
              className="copy_button"
              onClick={copyDetailsToClipboard}
            >
              <SharedIcon
                icon="icons/s/copy.svg"
                width={16}
                color="var(--green-40)"
                hoverColor="var(--green-20)"
              />
              <span>{t("signTransaction.copyError")}</span>
            </button>
          </div>
        )}
      </SharedBanner>
      <style jsx>
        {`
          .warning_header {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            width: 100%;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            text-align: left;
          }
          .detail_warning {
            font-size: 14px;
            line-height: 20px;
            font-weight: 500;
            color: ${color};
          }
          .details_section {
            margin-top: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .details_content {
            background: var(--hunter-green);
            border-radius: 4px;
            padding: 8px;
            max-height: 150px;
            overflow-y: auto;
          }
          .details_text {
            font-family: "Segment", monospace;
            font-size: 12px;
            line-height: 16px;
            color: var(--green-20);
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-all;
          }
          .copy_button {
            display: flex;
            align-items: center;
            gap: 4px;
            background: none;
            border: none;
            padding: 4px 0;
            cursor: pointer;
            color: var(--green-40);
            font-size: 14px;
            transition: color 0.2s;
          }
          .copy_button:hover {
            color: var(--green-20);
          }
        `}
      </style>
    </>
  )
}

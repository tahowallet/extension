import React, { CSSProperties, ReactElement } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import SharedIcon from "./SharedIcon"
import SharedTooltip from "./SharedTooltip"

type Props = {
  /**
   * Edge length of the icon in pixels. The 24px artwork is used above 16px,
   * where the small one starts to look soft.
   */
  size?: number
  /**
   * Applied to the tooltip's wrapper, whose own rule sets a negative vertical
   * margin and an 8px left margin that most callers need to undo.
   */
  style?: CSSProperties
  tooltipWidth?: number
  tooltipHorizontalPosition?: "left" | "center" | "right"
  tooltipVerticalPosition?: "top" | "bottom"
}

/**
 * The warning shown wherever a network the user is relying on cannot be
 * reached: beside its row in the network list, over its logo in the network
 * indicator, and next to the button that would sign against it.
 *
 * Purely presentational, and deliberately so. Whether a given chain is
 * unreachable is the caller's question to answer — the network list needs to
 * answer it for every row at once, which it cannot do if each row asks
 * separately.
 */
export default function NetworkUnreachableWarning({
  size = 16,
  style,
  tooltipWidth = 200,
  tooltipHorizontalPosition = "left",
  tooltipVerticalPosition = "bottom",
}: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "networkUnreachable",
  })

  return (
    <SharedTooltip
      width={tooltipWidth}
      horizontalPosition={tooltipHorizontalPosition}
      verticalPosition={tooltipVerticalPosition}
      style={style}
      IconComponent={() => (
        // SharedIcon only labels itself when it is a button, and this one is
        // not clickable — the tooltip is what it does.
        <span role="img" aria-label={t("iconAriaLabel")}>
          <SharedIcon
            icon={
              size > 16
                ? "icons/m/notif-attention.svg"
                : "icons/s/notif-attention.svg"
            }
            width={size}
            color="var(--attention)"
            style={{ flexShrink: 0, display: "block" }}
          />
        </span>
      )}
    >
      <div className="tooltip_content">
        <Trans
          t={t}
          i18nKey="tooltip"
          components={{ settings: <Link to="/settings/custom-networks" /> }}
        />
        <style jsx>{`
          .tooltip_content :global(a) {
            color: var(--green-95);
            text-decoration: underline;
          }
          .tooltip_content :global(a):hover {
            color: var(--green-40);
          }
        `}</style>
      </div>
    </SharedTooltip>
  )
}

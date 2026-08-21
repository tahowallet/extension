import React, { CSSProperties, ReactElement, useCallback } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import SharedIcon from "./SharedIcon"
import SharedTooltip from "./SharedTooltip"

type Props = {
  /**
   * The chain this warning is about. Given, the tooltip's advice links to that
   * chain's endpoint settings; omitted, the same advice is plain text — which
   * is what a caller wants where following a link would abandon something the
   * user has in flight, a pending signature request most of all.
   */
  chainID?: string
  /** Edge length of the icon in pixels. */
  size?: number
  /**
   * Merged over the tooltip wrapper's own margin, which callers position
   * against rather than around.
   */
  style?: CSSProperties & Record<string, unknown>
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
  chainID,
  size = 16,
  style,
  tooltipHorizontalPosition = "left",
  tooltipVerticalPosition = "bottom",
}: Props): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "networkUnreachable",
  })

  // Stable across renders: SharedTooltip renders this as an element type, so a
  // fresh function each time would remount the icon on every render — and one
  // of these sits in a list that re-renders on every block.
  const iconComponent = useCallback(
    () => (
      <SharedIcon
        icon="icons/s/notif-attention.svg"
        width={size}
        color="var(--attention)"
        ariaLabel={t("iconAriaLabel")}
        style={{ flexShrink: 0, display: "block" }}
      />
    ),
    [size, t],
  )

  return (
    <SharedTooltip
      width={200}
      horizontalPosition={tooltipHorizontalPosition}
      verticalPosition={tooltipVerticalPosition}
      style={{ margin: 0, ...style }}
      IconComponent={iconComponent}
    >
      <div className="tooltip_content">
        <Trans
          t={t}
          i18nKey="tooltip"
          components={{
            settings:
              chainID === undefined ? (
                // Still sound advice without being a link; the sentence reads
                // the same either way.
                <span />
              ) : (
                // Straight to this chain's endpoint list. The list page owns
                // the edit form as a slide-up rather than a route, so the
                // chain is handed over as router state for it to act on.
                <Link
                  to={{
                    pathname: "/settings/custom-networks",
                    state: { editChainID: chainID },
                  }}
                />
              ),
          }}
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

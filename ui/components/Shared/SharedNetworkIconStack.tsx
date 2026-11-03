import React, { ReactElement, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import SharedNetworkIcon from "./SharedNetworkIcon"
import SharedTooltip from "./SharedTooltip"

type Props = {
  networks: EVMNetwork[]
  /**
   * The most icons shown. With more networks than this, one fewer icon is
   * shown, followed by an ellipsis.
   */
  maxIcons?: number
  size?: number
  /**
   * The color of the ring separating overlapping icons; should match what's
   * behind the stack.
   */
  ringColor?: string
  tooltipVerticalPosition?: "top" | "bottom"
  /**
   * An accessible label describing what the stack's networks are for, read by
   * screen readers. Defaults to the address book's wording, which describes
   * the networks a name applies on. Note that there is no default when
   * `tooltip` is off.
   */
  label?: string
  /**
   * The heading shown above the tooltip's list of networks. Defaults to the
   * address book's wording.
   */
  title?: string
  /**
   * Whether hovering the stack shows a tooltip listing its networks. Defaults
   * to `true`. Turn it off when the stack sits inside a control that already
   * lists the networks itself, such as a network filter. Without its tooltip,
   * the stack is treated as decoration and hidden from screen readers, unless
   * it is given an explicit `label`.
   */
  tooltip?: boolean
}

/**
 * Tiny, overlapping icons for a list of networks, with a tooltip listing all of
 * them. Meant for showing which networks something, like a name, applies on;
 * the tooltip scrolls, so the list can be long.
 */
const TOOLTIP_WIDTH = 200

function StackIcons({
  networks,
  isTruncated,
  size,
  ringColor,
  label,
}: {
  networks: EVMNetwork[]
  isTruncated: boolean
  size: number
  ringColor: string
  label: string | undefined
}): ReactElement {
  return (
    <div
      className="stack"
      {...(label === undefined
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label })}
    >
      {networks.map((network) => (
        <div key={network.chainID} className="stack_item">
          <SharedNetworkIcon network={network} size={size} />
        </div>
      ))}
      {isTruncated && (
        <div className="stack_item more" data-testid="network_stack_more">
          <span>…</span>
        </div>
      )}
      <style jsx>{`
        .stack {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          padding-left: ${size / 4}px;
        }
        .stack_item {
          position: relative;
          display: flex;
          width: ${size}px;
          height: ${size}px;
          margin-left: -${size / 4}px;
          border-radius: 50%;
          box-shadow: 0 0 0 2px ${ringColor};
          background-color: ${ringColor};
          overflow: hidden;
        }
        .more {
          align-items: center;
          justify-content: center;
          background-color: var(--green-80);
          color: var(--green-20);
          font-size: ${Math.round(size * 0.75)}px;
          line-height: ${size}px;
          font-weight: 600;
        }
        .more span {
          margin-top: -${Math.round(size / 4)}px;
        }
      `}</style>
    </div>
  )
}

/**
 * Tiny, overlapping icons for a list of networks, with a tooltip listing all of
 * them. Meant for showing which networks something, like a name, applies on;
 * the tooltip scrolls, so the list can be long.
 */
export default function SharedNetworkIconStack({
  networks,
  maxIcons = 4,
  size = 16,
  ringColor = "var(--green-95)",
  tooltipVerticalPosition = "bottom",
  label: labelOverride,
  title,
  tooltip = true,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "addressBook" })

  const isTruncated = networks.length > maxIcons
  const shownNetworks = useMemo(
    () => (isTruncated ? networks.slice(0, maxIcons - 1) : networks),
    [isTruncated, maxIcons, networks],
  )

  const defaultLabel = t("appliesOnNetworks", {
    count: networks.length,
    networks: networks.map(({ name }) => name).join(", "),
  })
  const label = tooltip ? (labelOverride ?? defaultLabel) : labelOverride

  const IconComponent = useCallback(
    () => (
      <StackIcons
        networks={shownNetworks}
        isTruncated={isTruncated}
        size={size}
        ringColor={ringColor}
        label={label}
      />
    ),
    [shownNetworks, isTruncated, size, ringColor, label],
  )

  // Line the tooltip's right edge up with the stack's, so it opens toward the
  // middle of whatever row the stack sits at the end of.
  const iconCount = shownNetworks.length + (isTruncated ? 1 : 0)
  const stackWidth = size + (iconCount - 1) * size * 0.75

  if (!tooltip) return <IconComponent />

  return (
    <SharedTooltip
      verticalPosition={tooltipVerticalPosition}
      horizontalPosition="left"
      horizontalShift={stackWidth + 8}
      width={TOOLTIP_WIDTH}
      height={size}
      style={{ margin: 0, padding: 0 }}
      IconComponent={IconComponent}
    >
      <div className="networks_tooltip">
        <div className="title">
          {title ?? t("appliesOnTitle", { count: networks.length })}
        </div>
        <ul>
          {networks.map((network) => (
            <li key={network.chainID}>
              <SharedNetworkIcon network={network} size={16} />
              <span className="name">{network.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <style jsx>{`
        .networks_tooltip {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .title {
          color: var(--green-40);
          font-size: 12px;
          line-height: 16px;
        }
        ul {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 168px;
          overflow-y: auto;
          margin: 0;
          padding: 0;
        }
        li {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </SharedTooltip>
  )
}

import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { CSSTransition } from "react-transition-group"
import { useTranslation } from "react-i18next"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { useOnClickOutside } from "../../hooks/dom-hooks"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"

export type NetworkFilterOption = {
  network: EVMNetwork
  /** The number of items, such as activities or NFTs, on this network. */
  count: number
}

type Props = {
  options: NetworkFilterOption[]
  /** Chain IDs of the networks shown. */
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  /**
   * The maximum number of icons to show in the network stack. If more
   * networks than this are shown, the stack shows one fewer icon followed by
   * an ellipsis.
   */
  maxIcons?: number
}

const ICON_SIZE = 18

/**
 * Overlapping network icons, drawn the way the address book's "Applies on"
 * indicator (SharedNetworkIconStack, in #3889) draws them: each a quarter
 * under the last, ringed in the background color, ending in an ellipsis
 * when there are more than fit.
 */
function NetworkStack({
  networks,
  maxIcons,
}: {
  networks: EVMNetwork[]
  maxIcons: number
}): ReactElement {
  const isTruncated = networks.length > maxIcons
  const shown = isTruncated ? networks.slice(0, maxIcons - 1) : networks
  return (
    <span className="stack" aria-hidden>
      {shown.map((network) => (
        <span key={network.chainID} className="stack_item">
          <SharedNetworkIcon network={network} size={ICON_SIZE} />
        </span>
      ))}
      {isTruncated && (
        <span className="stack_item more" data-testid="network_stack_more">
          <span>…</span>
        </span>
      )}
      <style jsx>{`
        .stack {
          display: flex;
          align-items: center;
          flex-shrink: 0;
          padding-left: ${ICON_SIZE / 4}px;
        }
        .stack_item {
          position: relative;
          display: flex;
          width: ${ICON_SIZE}px;
          height: ${ICON_SIZE}px;
          margin-left: -${ICON_SIZE / 4}px;
          border-radius: 50%;
          box-shadow: 0 0 0 2px var(--hunter-green);
          background-color: var(--hunter-green);
          overflow: hidden;
        }
        .more {
          align-items: center;
          justify-content: center;
          background-color: var(--green-80);
          color: var(--green-20);
          font-size: ${Math.round(ICON_SIZE * 0.75)}px;
          line-height: ${ICON_SIZE}px;
          font-weight: 600;
        }
        .more span {
          margin-top: -${Math.round(ICON_SIZE / 4)}px;
        }
      `}</style>
    </span>
  )
}

/**
 * Which networks a view shows: the shown networks as a stack of icons with
 * a summary, opening a list of every network with its count, where each can
 * be selected and deselected. All networks are shown by default.
 */
export default function FullTabNetworkFilter({
  options,
  selected,
  onChange,
  maxIcons = 4,
}: Props): ReactElement {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIsOpen(false), [])
  useOnClickOutside(containerRef, close)

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [close, isOpen])

  const shown = options
    .filter(({ network }) => selected.has(network.chainID))
    .map(({ network }) => network)
  const allSelected = shown.length === options.length
  const someSelected = shown.length > 0 && !allSelected
  const total = options.reduce((sum, { count }) => sum + count, 0)

  const setAll = (value: boolean) =>
    onChange(
      value
        ? new Set(options.map(({ network }) => network.chainID))
        : new Set(),
    )

  const toggle = (chainID: string, value: boolean) => {
    const next = new Set(selected)
    if (value) next.add(chainID)
    else next.delete(chainID)
    onChange(next)
  }

  let summary = t("overview.networks")
  if (shown.length === 1) {
    summary = shown[0].name
  } else if (shown.length > 1) {
    summary = t("fullTab.networkFilter.summary", {
      network: shown[0].name,
      count: shown.length - 1,
    })
  }

  return (
    <div className="network_filter" ref={containerRef}>
      <button
        type="button"
        className={`toggle ${isOpen ? "open" : ""}`}
        aria-expanded={isOpen}
        aria-controls="network_filter_options"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="label">{t("overview.networks")}</span>
        {shown.length > 0 && (
          <NetworkStack networks={shown} maxIcons={maxIcons} />
        )}
        <span className="summary">{summary}</span>
        <span className={`chevron ${isOpen ? "open" : ""}`} aria-hidden />
      </button>
      <CSSTransition
        in={isOpen}
        nodeRef={menuRef}
        timeout={200}
        classNames="filter_menu"
        unmountOnExit
      >
        <div className="menu" ref={menuRef}>
          <ul id="network_filter_options" className="options">
            <li className="all">
              <label className="option">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    // The checkbox is indeterminate when some, but not all,
                    // networks are shown.
                    if (input) input.indeterminate = someSelected
                  }}
                  onChange={(event) => setAll(event.target.checked)}
                />
                <span className="name">{t("overview.networks")}</span>
                <span className="count">{total}</span>
              </label>
            </li>
            {options.map(({ network, count }) => (
              <li key={network.chainID}>
                <label className="option">
                  <input
                    type="checkbox"
                    checked={selected.has(network.chainID)}
                    onChange={(event) =>
                      toggle(network.chainID, event.target.checked)
                    }
                  />
                  <SharedNetworkIcon network={network} size={16} />
                  <span className="name">{network.name}</span>
                  <span className="count">{count}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </CSSTransition>
      <style jsx>{`
        /* Keeps the filter and its menu above the content that follows it,
           which may create stacking layers of its own. */
        .network_filter {
          position: relative;
          z-index: var(--z-dropdown);
          display: inline-block;
          align-self: flex-start;
        }
        .toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 4px;
          background-color: var(--hunter-green);
          border: 1px solid var(--green-95);
          color: var(--green-20);
          font-size: 14px;
          line-height: 20px;
          cursor: pointer;
          transition: border-color 0.2s ease;
        }
        .toggle:hover,
        .toggle.open {
          border-color: var(--green-80);
        }
        .label {
          color: var(--green-40);
          flex-shrink: 0;
        }
        .summary {
          white-space: nowrap;
        }
        .chevron {
          flex-shrink: 0;
          width: 12px;
          height: 8px;
          mask: url("./images/chevron_down.svg") center / 12px 8px no-repeat;
          background-color: var(--green-40);
          transition: transform var(--fade);
        }
        .chevron.open {
          transform: rotate(180deg);
        }
        .menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          min-width: 100%;
          box-sizing: border-box;
          padding: 8px 4px;
          border-radius: 4px;
          background: var(--green-95);
          box-shadow: var(--shadow-menu);
          transform-origin: top left;
        }
        .options {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 320px;
          overflow-y: auto;
          margin: 0;
          padding: 0 8px;
        }
        .options li {
          display: block;
        }
        .options li.all {
          padding-bottom: 4px;
          margin-bottom: 2px;
          border-bottom: 1px solid var(--green-80);
        }
        .option {
          cursor: pointer;
          display: flex;
          /* Labels are laid out as columns by default in this codebase. */
          flex-direction: row;
          margin: 0;
          align-items: center;
          gap: 8px;
          min-height: 28px;
          font-size: 14px;
          line-height: 20px;
          color: var(--green-20);
        }
        .option input {
          /* Reverts the global style reset, which would otherwise leave
             checkboxes invisible. */
          all: revert;
          flex-shrink: 0;
          width: 16px;
          height: 16px;
          margin: 0;
          accent-color: var(--trophy-gold);
        }
        .name {
          flex-grow: 1;
          min-width: 0;
          white-space: nowrap;
        }
        .count {
          flex-shrink: 0;
          padding-left: 16px;
          color: var(--green-40);
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }
        .filter_menu-enter {
          opacity: 0;
          transform: translateY(-4px);
        }
        .filter_menu-enter-active {
          opacity: 1;
          transform: none;
          transition:
            opacity 0.2s ease,
            transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .filter_menu-exit-active {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
      `}</style>
    </div>
  )
}

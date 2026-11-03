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
import SharedCheckbox from "../Shared/SharedCheckbox"

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
  /** How many network icons to stack before summarizing the rest. */
  maxIcons?: number
}

/**
 * A compact network filter: the selected networks as overlapping icons, up
 * to a few and then "+N more". Clicking opens the full list with each
 * network's count, where networks can be selected and deselected.
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

  const shown = options.filter(({ network }) => selected.has(network.chainID))
  const stacked = shown.slice(0, maxIcons)
  const overflow = shown.length - stacked.length
  const allSelected = shown.length === options.length

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

  return (
    <div className="network_filter" ref={containerRef}>
      <button
        type="button"
        className={`summary ${isOpen ? "open" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={t("overview.networks")}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="stack">
          {stacked.map(({ network }) => (
            <span className="stack_icon" key={network.chainID}>
              <SharedNetworkIcon network={network} size={22} />
            </span>
          ))}
        </span>
        {overflow > 0 && (
          <span className="overflow">
            {t("fullTab.networkFilter.more", { count: overflow })}
          </span>
        )}
        {shown.length === 0 && (
          <span className="overflow">{t("overview.networks")}</span>
        )}
        <span className="chevron" aria-hidden />
      </button>
      <CSSTransition
        in={isOpen}
        nodeRef={menuRef}
        timeout={200}
        classNames="filter_menu"
        unmountOnExit
      >
        <div
          className="menu"
          ref={menuRef}
          role="dialog"
          aria-label={t("overview.networks")}
        >
          {/* Each row is the checkbox; the box inside is only its picture. */}
          <button
            type="button"
            role="checkbox"
            aria-checked={allSelected}
            className="row all"
            onClick={() => setAll(!allSelected)}
          >
            <span className="box" aria-hidden>
              <SharedCheckbox checked={allSelected} onChange={() => {}} />
            </span>
            <span className="name">{t("overview.networks")}</span>
            <span className="count">
              {options.reduce((sum, { count }) => sum + count, 0)}
            </span>
          </button>
          {options.map(({ network, count }) => (
            <button
              type="button"
              role="checkbox"
              aria-checked={selected.has(network.chainID)}
              className="row"
              key={network.chainID}
              onClick={() =>
                toggle(network.chainID, !selected.has(network.chainID))
              }
            >
              <span className="box" aria-hidden>
                <SharedCheckbox
                  checked={selected.has(network.chainID)}
                  onChange={() => {}}
                />
              </span>
              <SharedNetworkIcon network={network} size={20} />
              <span className="name">{network.name}</span>
              <span className="count">{count}</span>
            </button>
          ))}
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
        .summary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 10px 0 6px;
          border-radius: 18px;
          border: 1px solid var(--green-80);
          color: var(--green-20);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background-color 0.2s ease;
        }
        .summary:hover,
        .summary.open {
          border-color: var(--green-60);
          background: var(--green-95);
        }
        .stack {
          display: inline-flex;
          align-items: center;
        }
        /* Each icon tucks under the previous one, ringed to read apart. */
        .stack_icon {
          display: inline-flex;
          border-radius: 50%;
          box-shadow: 0 0 0 2px var(--hunter-green);
          background: var(--hunter-green);
          transition: margin 0.2s ease;
        }
        .stack_icon + .stack_icon {
          margin-left: -4px;
        }
        .summary:hover .stack_icon + .stack_icon {
          margin-left: 2px;
        }
        .overflow {
          color: var(--green-40);
          white-space: nowrap;
        }
        .chevron {
          width: 12px;
          height: 12px;
          mask-image: url("./images/chevron_down.svg");
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          background: var(--green-40);
          transition: transform 0.2s ease;
        }
        .summary.open .chevron {
          transform: rotate(180deg);
        }
        .menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          z-index: var(--z-dropdown);
          min-width: 260px;
          max-height: 360px;
          overflow-y: auto;
          padding: 8px;
          border-radius: 12px;
          background: var(--green-95);
          box-shadow: var(--shadow-menu);
          display: flex;
          flex-direction: column;
          gap: 2px;
          transform-origin: top left;
        }
        .box {
          display: inline-flex;
          pointer-events: none;
        }
        .row {
          width: 100%;
          text-align: left;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          color: var(--green-20);
          font-size: 14px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }
        .row:hover,
        .row:focus-visible {
          background: var(--green-80);
        }
        .row.all {
          border-bottom: 1px solid var(--green-80);
          border-radius: 8px 8px 0 0;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .name {
          flex: 1;
          white-space: nowrap;
        }
        .count {
          color: var(--green-40);
          font-variant-numeric: tabular-nums;
        }
        .filter_menu-enter {
          opacity: 0;
          transform: translateY(-4px) scale(0.97);
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
          transform: translateY(-4px) scale(0.98);
          transition:
            opacity 0.15s ease,
            transform 0.15s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .stack_icon,
          .chevron {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}

import React, {
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { CSSTransition } from "react-transition-group"
import { useHistory, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { FAQ_URL, FOOTER_ACTIONS, VersionLabel } from "../../pages/Settings"
import { useOnClickOutside } from "../../hooks/dom-hooks"
import SharedIcon from "../Shared/SharedIcon"

/**
 * A question-mark pill button that opens the help center menu. The menu links
 * to the bug report page, the knowledge base and the community channels, and
 * shows the extension's version. It closes on Escape, on a click outside it,
 * or when the user navigates elsewhere.
 */
export default function FullTabHelpMenu(): ReactElement {
  const { t } = useTranslation()
  const history = useHistory()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setIsOpen(false), [])
  useOnClickOutside(containerRef, close)

  const { pathname } = useLocation()
  useEffect(close, [close, pathname])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [close, isOpen])

  return (
    <div className="help" ref={containerRef}>
      <CSSTransition
        in={isOpen}
        nodeRef={menuRef}
        timeout={200}
        classNames="help_menu"
        unmountOnExit
      >
        <div className="menu" ref={menuRef} role="menu">
          <span className="menu_title">{t("settings.group.helpCenter")}</span>
          <button
            type="button"
            role="menuitem"
            className="menu_item"
            onClick={() => {
              close()
              history.push("/settings/export-logs")
            }}
          >
            <span>{t("settings.bugReport")}</span>
            <SharedIcon
              icon="icons/s/continue.svg"
              width={16}
              color="currentColor"
            />
          </button>
          <button
            type="button"
            role="menuitem"
            className="menu_item"
            onClick={() => {
              close()
              window.open(FAQ_URL, "_blank")?.focus()
            }}
          >
            <span>{t("settings.needHelp")}</span>
            <SharedIcon
              icon="icons/s/new-tab.svg"
              width={16}
              color="currentColor"
            />
          </button>
          <div className="menu_footer">
            <div className="socials">
              {FOOTER_ACTIONS.map(({ icon, linkTo }) => (
                <SharedIcon
                  key={icon}
                  icon={`${icon}.svg`}
                  width={18}
                  color="var(--green-40)"
                  hoverColor="var(--trophy-gold)"
                  onClick={() => window.open(linkTo, "_blank")?.focus()}
                />
              ))}
            </div>
            <VersionLabel />
          </div>
        </div>
      </CSSTransition>
      <button
        type="button"
        className={`help_pill ${isOpen ? "open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="question" aria-hidden>
          ?
        </span>
        <span className="label">{t("settings.group.helpCenter")}</span>
      </button>
      <style jsx>{`
        .help {
          position: relative;
        }
        /* At rest, only the question mark is shown. The label slides out
           when the pill is hovered or has keyboard focus, and while the menu
           is open. */
        .help_pill {
          display: inline-flex;
          align-items: center;
          gap: 0;
          height: 36px;
          padding: 0 6px;
          border-radius: 18px;
          color: var(--green-20);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition:
            color 0.2s ease,
            gap 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
            padding 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .label {
          max-width: 0;
          overflow: hidden;
          white-space: nowrap;
          opacity: 0;
          transform: translateX(-4px);
          transition:
            max-width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
            opacity 0.2s ease,
            transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .help_pill:hover,
        .help_pill:focus-visible,
        .help_pill.open {
          gap: 8px;
          padding: 0 16px 0 6px;
          color: var(--text-strong);
        }
        .help_pill:hover .label,
        .help_pill:focus-visible .label,
        .help_pill.open .label {
          max-width: 120px;
          opacity: 1;
          transform: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .help_pill,
          .label,
          .question {
            transition: none;
          }
        }
        .question {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--trophy-gold);
          color: var(--on-accent);
          font-weight: 700;
          transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        /* The question mark spins once as the label slides out. */
        .help_pill:hover .question,
        .help_pill:focus-visible .question,
        .help_pill.open .question {
          transform: rotate(360deg);
        }
        .menu {
          position: absolute;
          left: 0;
          bottom: calc(100% + 12px);
          width: 248px;
          padding: 16px 8px 0;
          box-sizing: border-box;
          background: var(--green-95);
          border-radius: 12px;
          box-shadow: var(--shadow-menu);
          display: flex;
          flex-direction: column;
          transform-origin: bottom left;
          z-index: var(--z-dropdown);
        }
        .menu_title {
          padding: 0 12px 8px;
          color: var(--green-40);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .menu_item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 8px;
          color: var(--green-20);
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition:
            background-color 0.15s ease,
            color 0.15s ease;
        }
        .menu_item:hover {
          background: var(--green-80);
          color: var(--trophy-gold);
        }
        .menu_footer {
          margin-top: 8px;
          border-top: 1px solid var(--green-80);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 12px;
        }
        .socials {
          display: flex;
          gap: 20px;
        }
        .menu_footer :global(.version) {
          padding: 8px 0 12px;
        }
        .menu_footer :global(.version button) {
          font-size: 12px;
        }
        .help_menu-enter {
          opacity: 0;
          transform: translateY(6px) scale(0.96);
        }
        .help_menu-enter-active {
          opacity: 1;
          transform: none;
          transition:
            opacity 0.2s ease,
            transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .help_menu-exit {
          opacity: 1;
        }
        .help_menu-exit-active {
          opacity: 0;
          transform: translateY(6px) scale(0.96);
          transition:
            opacity 0.15s ease,
            transform 0.15s ease;
        }
      `}</style>
    </div>
  )
}

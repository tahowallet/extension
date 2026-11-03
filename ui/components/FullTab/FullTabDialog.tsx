import React, { ReactElement, ReactNode, useEffect, useRef } from "react"
import { CSSTransition } from "react-transition-group"

type Props = {
  isOpen: boolean
  onClose: () => void
  label: string
  children: ReactNode
}

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false

/**
 * A popup-width dialog shown over the full-tab view. It is used for content
 * that the popup would show in a slide-up menu, such as activity details.
 * The dialog closes when the user presses Escape or clicks outside it.
 */
export default function FullTabDialog({
  isOpen,
  onClose,
  label,
  children,
}: Props): ReactElement {
  const nodeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onClose])

  return (
    <CSSTransition
      in={isOpen}
      nodeRef={nodeRef}
      timeout={prefersReducedMotion() ? 0 : 250}
      classNames="dialog"
      unmountOnExit
    >
      <div className="backdrop" ref={nodeRef}>
        {/* Clicking the backdrop closes the dialog as a convenience for
            pointer users; keyboard users close it with Escape instead. */}
        {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="scrim" onClick={onClose} />
        <div
          className="card"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          {children}
        </div>
        <style jsx>{`
          .backdrop {
            position: fixed;
            inset: 0;
            z-index: var(--z-overlay);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .scrim {
            position: absolute;
            inset: 0;
            background: var(--green-120);
            opacity: 0.7;
            cursor: pointer;
          }
          .card {
            position: relative;
            width: 384px;
            /* A fit-content height keeps popup content that is sized in
               percentages at its natural height, instead of stretching it to
               fill the window. */
            height: fit-content;
            max-height: calc(100vh - 48px);
            overflow-y: auto;
            padding-top: 24px;
            box-sizing: border-box;
            border-radius: 16px;
            background: var(--green-95);
            box-shadow: var(--shadow-lifted);
            /* The transform makes the card the containing block for fixed
               elements, which keeps the popup content's own fixed overlays
               inside the card. */
            transform: translateZ(0);
          }
          .dialog-enter .scrim {
            opacity: 0;
          }
          .dialog-enter .card {
            opacity: 0;
            transform: translateY(8px) scale(0.97);
          }
          .dialog-enter-active .scrim {
            opacity: 0.7;
            transition: opacity 0.25s ease;
          }
          .dialog-enter-active .card {
            opacity: 1;
            transform: translateZ(0);
            transition:
              opacity 0.25s ease,
              transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
          }
          .dialog-exit-active .scrim {
            opacity: 0;
            transition: opacity 0.2s ease;
          }
          .dialog-exit-active .card {
            opacity: 0;
            transform: translateY(4px) scale(0.98);
            transition:
              opacity 0.2s ease,
              transform 0.2s ease;
          }
        `}</style>
      </div>
    </CSSTransition>
  )
}

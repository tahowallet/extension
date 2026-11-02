import React, { ReactElement } from "react"

type Props = {
  icon: string
  label: string
  title?: string
  disabled?: boolean
  onClick: () => void
}

/** A compact icon-and-label button for actions on a table row. */
export default function FullTabActionButton({
  icon,
  label,
  title,
  disabled = false,
  onClick,
}: Props): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={label}
      className="action"
    >
      <span className="action_icon" aria-hidden />
      <span className="label">{label}</span>
      <style jsx>{`
        .action {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 12px 0 10px;
          border-radius: 16px;
          background-color: var(--green-95);
          color: var(--green-20);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition:
            background-color 0.2s ease,
            color 0.2s ease,
            transform 0.15s ease;
        }
        .action_icon {
          width: 16px;
          height: 16px;
          mask-image: url("./images/${icon}");
          mask-size: cover;
          background-color: currentColor;
        }
        .action:enabled:hover {
          background-color: var(--trophy-gold);
          color: var(--on-accent);
        }
        .action:enabled:active {
          transform: scale(0.96);
        }
        @media (max-width: 1180px) {
          .action {
            padding: 0;
            width: 32px;
            justify-content: center;
          }
          .label {
            display: none;
          }
        }
        .action:disabled {
          cursor: default;
          color: var(--green-60);
          background-color: transparent;
        }
      `}</style>
    </button>
  )
}

import React, { useState, ReactElement, useEffect } from "react"
import classNames from "classnames"

type SharedToggleButtonProps = {
  onChange: (toggleValue: boolean) => void
  value?: boolean | undefined
}

/**
 * A two-state switch drawn from the `--toggle-*` tokens. A caller recolours it
 * by setting those tokens on an ancestor.
 */
export default function SharedToggleButton({
  onChange,
  value,
}: SharedToggleButtonProps): ReactElement {
  const [isActive, setIsActive] = useState(value || false)

  useEffect(() => {
    setIsActive(!!value)
  }, [value])

  const handleToggleAction = () => {
    onChange(!isActive)
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isActive}
      className={classNames("container", { is_active: isActive })}
      data-testid="toggle"
      onClick={handleToggleAction}
    >
      <div className="bulb" />
      <style jsx>
        {`
          .container {
            width: 40px;
            height: 24px;
            border-radius: 20px;
            background-color: var(--toggle-track);
            box-sizing: border-box;
            padding: 4px;
            cursor: pointer;
            display: flex;
            transition: background-color var(--fade);
          }
          .container.is_active {
            background-color: var(--toggle-track-on);
          }
          .bulb {
            width: 16px;
            height: 16px;
            border-radius: 20px;
            background-color: var(--toggle-knob);
            transition:
              transform 0.2s ease-in-out,
              background-color var(--fade);

            box-shadow: var(--shadow-knob);
          }
          .is_active .bulb {
            transform: translateX(16px);
            background-color: var(--toggle-knob-on);
          }
        `}
      </style>
    </button>
  )
}

SharedToggleButton.defaultProps = {}

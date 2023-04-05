import React, { ReactElement, useState, useEffect } from "react"

interface Props {
  label: string
  onChange: (value: boolean) => void
  value?: boolean
}

export default function SharedCheckbox(props: Props): ReactElement {
  const { label, value, onChange } = props
  const [checked, setChecked] = useState(value || false)

  useEffect(() => {
    setChecked(!!value)
  }, [value])

  return (
    <div className="checkbox">
      <input
        id="checkbox"
        checked={checked}
        onChange={() => onChange(!checked)}
        type="checkbox"
      />
      <span className="checkmark" />
      <label htmlFor="checkbox" className="label">
        {label}
      </label>
      <style jsx>{`
        .checkbox {
          display: flex;
          align-items: center;
          position: relative;
          cursor: pointer;
          font-size: 14px;
          color: var(--green-60);
          user-select: none;
        }

        .checkbox input {
          position: absolute;
          opacity: 0;
          height: 0;
          width: 0;
        }

        .checkmark {
          position: relative;
          height: 15px;
          width: 15px;
          border-radius: 3px;
          background-color: var(--green-60);
          margin-right: 5px;
        }
        .checkbox:hover input ~ .checkmark {
          background-color: var(--green-80);
        }
        .checkbox input:checked ~ .checkmark {
          background-color: var(--trophy-gold);
        }
        .checkmark:after {
          content: "";
          position: absolute;
          display: none;
        }
        .checkbox input:checked ~ .checkmark:after {
          display: block;
        }
        .checkbox .checkmark:after {
          left: 5px;
          top: 2px;
          width: 2px;
          height: 7px;
          border: solid white;
          border-width: 0 3px 3px 0;
          transform: rotate(45deg);
        }
        .label {
          line-height: normal;
          margin-top: 0;
          color: var(--green-60);
        }
      `}</style>
    </div>
  )
}

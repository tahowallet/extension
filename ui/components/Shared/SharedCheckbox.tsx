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
          align-items: start;
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
          top: 5px;
          position: relative;
          height: 16px;
          min-width: 16px;
          border-radius: 3px;
          background-color: var(--green-120);
          margin-right: 10px;
          border: 2px solid var(--green-40);
          box-sizing: border-box;
        }
        .checkbox:hover input ~ .checkmark {
          background-color: var(--green-80);
        }
        .checkbox input:checked ~ .checkmark {
          background-color: var(--trophy-gold);
          border: 0;
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
          border: 2px solid var(--hunter-green);
          border-width: 0 3px 3px 0;
          transform: rotate(45deg);
        }
        .label {
          margin-top: 0;
          color: var(--green-5);
          font-weight: 500;
          font-size: 16px;
          line-height: 24px;
        }
      `}</style>
    </div>
  )
}

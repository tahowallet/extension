import React, { ReactElement, useEffect, useState } from "react"

type Props = {
  id: string
  name?: string
  label: string
  value?: boolean
  onChange: (checked: boolean) => void
}

export default function SharedRadio({
  id,
  name,
  label,
  value,
  onChange,
}: Props): ReactElement {
  const [checked, setChecked] = useState(value || false)

  useEffect(() => {
    setChecked(!!value)
  }, [value])

  return (
    <div className="radio">
      <input
        id={id}
        type="radio"
        name={name || "radio"}
        checked={checked}
        onChange={() => onChange(!checked)}
      />
      <label htmlFor={id} className="radio-label">
        {label}
      </label>
      <style jsx>{`
        .radio {
          padding: 8px 0;
        }
        .radio-label {
          display: flex;
          flex-direction: row;
          align-items: center;
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          line-height: normal;
          color: var(--white);
          margin-top: 0;
          cursor: pointer;
        }
        .radio-label:before {
          content: "";
          border-radius: 100%;
          display: inline-block;
          width: 16px;
          height: 16px;
          position: relative;
          margin-right: 8px;
          vertical-align: top;
          cursor: pointer;
          text-align: center;
          transition: all 250ms ease;
          background-color: var(--green-80);
          box-shadow: inset 0 0 0 2px var(--green-60);
        }
        input[type="radio"] {
          position: absolute;
          opacity: 0;
        }
        input:checked ~ .radio-label:before {
          background-color: var(--green-95);
          box-shadow: inset 0 0 0 5px var(--trophy-gold);
        }
      `}</style>
    </div>
  )
}

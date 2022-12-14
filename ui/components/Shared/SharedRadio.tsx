import React, { ReactElement, useEffect, useState } from "react"

type Props = {
  name?: string
  label: string
  value?: boolean
  onChange: (checked: boolean) => void
}

export default function SharedRadio({
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
        id="radio"
        type="radio"
        name={name || "radio"}
        checked={checked}
        onChange={() => onChange(!checked)}
      />
      <label htmlFor="radio" className="label">
        {label}
      </label>
      <style jsx>{`
        .radio {
          display: flex;
          align-items: center;
          position: relative;
          font-size: 14px;
          color: var(--green-60);
          user-select: none;
          padding: 8px 0;
        }
        input {
          all: revert;
          cursor: pointer;
          margin: 0;
          margin-right: 10px;
          accent-color: var(--trophy-gold);
        }
        .label {
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          line-height: normal;
          color: var(--white);
          margin-top: 0;
        }
      `}</style>
    </div>
  )
}

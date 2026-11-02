import React, { ReactElement, useLayoutEffect, useRef, useState } from "react"

type Segment<T extends string> = { value: T; label: string }

type Props<T extends string> = {
  segments: Segment<T>[]
  value: T
  onChange: (value: T) => void
  label: string
}

/** A row of mutually exclusive options with a sliding selection marker. */
export default function FullTabSegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
}: Props<T>): ReactElement {
  const buttonRefs = useRef<Map<T, HTMLButtonElement>>(new Map())
  const [marker, setMarker] = useState<{ left: number; width: number }>()

  useLayoutEffect(() => {
    const button = buttonRefs.current.get(value)
    if (button) {
      setMarker({ left: button.offsetLeft, width: button.offsetWidth })
    }
  }, [value, segments])

  return (
    <div className="segments" role="tablist" aria-label={label}>
      {marker && (
        <span
          className="marker"
          style={{
            transform: `translateX(${marker.left}px)`,
            width: marker.width,
          }}
        />
      )}
      {segments.map((segment) => (
        <button
          key={segment.value}
          type="button"
          role="tab"
          aria-selected={segment.value === value}
          className={segment.value === value ? "selected" : ""}
          ref={(element) => {
            if (element) buttonRefs.current.set(segment.value, element)
            else buttonRefs.current.delete(segment.value)
          }}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
      <style jsx>{`
        .segments {
          position: relative;
          display: inline-flex;
          align-self: flex-start;
          padding: 4px;
          border-radius: 20px;
          background: var(--green-120);
          border: 1px solid var(--green-95);
        }
        .marker {
          position: absolute;
          top: 4px;
          bottom: 4px;
          left: 0;
          border-radius: 16px;
          background: var(--green-80);
          transition:
            transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
            width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        button {
          position: relative;
          height: 32px;
          padding: 0 16px;
          border-radius: 16px;
          color: var(--green-40);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        button:hover {
          color: var(--green-20);
        }
        button.selected {
          color: var(--text-strong);
        }
        @media (prefers-reduced-motion: reduce) {
          .marker {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}

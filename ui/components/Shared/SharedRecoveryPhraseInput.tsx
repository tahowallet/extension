import React, { ReactElement, useEffect, useMemo, useState } from "react"
import {
  findUnknownWordNumbers,
  getWordNumberAt,
} from "../../utils/recoveryPhrase"

type Props = {
  onChange: (text: string) => void
  onUnknownWordsChange: (wordNumbers: number[]) => void
  label?: string
  errorMessage?: string | null
}

export default function SharedRecoveryPhraseInput(props: Props): ReactElement {
  const {
    onChange,
    onUnknownWordsChange,
    label = "",
    errorMessage = null,
  } = props
  const [phrase, setPhrase] = useState("")
  const [typedWordNumber, setTypedWordNumber] = useState<number>()

  const unknownWordNumbers = useMemo(
    () => findUnknownWordNumbers(phrase, typedWordNumber),
    [phrase, typedWordNumber],
  )

  useEffect(() => {
    onUnknownWordsChange(unknownWordNumbers)
  }, [unknownWordNumbers, onUnknownWordsChange])

  return (
    <>
      <div className="input_wrap">
        <textarea
          id="recovery_phrase"
          value={phrase}
          data-empty={phrase.length < 1}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          aria-invalid={unknownWordNumbers.length > 0 || Boolean(errorMessage)}
          aria-describedby={errorMessage ? "recovery_phrase_error" : undefined}
          onChange={(event) => {
            const { value, selectionStart } = event.currentTarget
            const { nativeEvent } = event
            // Pasted and dropped words are complete, so check them all now.
            const isInsertedWhole =
              nativeEvent instanceof InputEvent &&
              nativeEvent.inputType.startsWith("insertFrom")

            setPhrase(value)
            setTypedWordNumber(
              isInsertedWhole
                ? undefined
                : getWordNumberAt(value, selectionStart),
            )
            onChange(value.trim())
          }}
          onSelect={(event) => {
            const { value, selectionStart } = event.currentTarget
            setTypedWordNumber((current) =>
              getWordNumberAt(value, selectionStart) === current
                ? current
                : undefined,
            )
          }}
          onBlur={() => setTypedWordNumber(undefined)}
        />
        <label htmlFor="recovery_phrase" className="recovery_label">
          {label}
        </label>
        <p id="recovery_phrase_error" className="error" aria-live="polite">
          {errorMessage}
        </p>
      </div>
      <style jsx>{`
        .input_wrap {
          position: relative;
        }

        .recovery_label {
          position: absolute;
          font-size: 12px;
          line-height: 16px;
          transition:
            font-size 0.2s ease-in-out,
            line-height 0.2s ease-in-out,
            top 0.2s ease-in-out,
            left 0.2s ease-in-out,
            padding 0.2s ease-in-out,
            color var(--fade),
            background var(--fade);
          pointer-events: none;
        }

        #recovery_phrase[data-empty="true"]:not(:focus) ~ .recovery_label {
          font-size: 16px;
          line-height: 24px;
          top: 12px;
          left: 16px;
        }

        #recovery_phrase[data-empty="false"] ~ .recovery_label {
          padding: 0 6px;
          color: var(--green-40);
          background: var(--hunter-green);
          top: -8px;
          left: 16px;
        }

        #recovery_phrase {
          display: block;
          width: 320px;
          height: 104px;
          border-radius: 4px;
          border: 2px solid var(--green-60);
          padding: 12px 16px;
          background: transparent;
          color: var(--white);
          font: inherit;
          resize: none;
          overflow-y: scroll;
          transition: border-color var(--fade);
        }

        #recovery_phrase:focus ~ .recovery_label {
          top: -8px;
          left: 16px;
          padding: 0 6px;
          color: var(--trophy-gold);
          background: var(--hunter-green);
          z-index: var(--z-raised);
        }

        #recovery_phrase:focus {
          border: 2px solid var(--trophy-gold);
          outline: 0;
          background: var(--hunter-green);
        }

        #recovery_phrase[aria-invalid="true"] {
          border-color: var(--error);
        }

        .error {
          color: var(--error);
        }

        .error:empty {
          margin: 0;
        }
      `}</style>
    </>
  )
}

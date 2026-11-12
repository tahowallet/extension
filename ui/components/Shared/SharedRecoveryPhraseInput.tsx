import React, {
  ReactElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import {
  WordAtCaret,
  findUnknownWordNumbers,
  getRecoveryWordSuggestions,
  getWordAt,
  replaceWord,
} from "../../utils/recoveryPhrase"

const SUGGESTION_MIN_LETTERS = 2
const SUGGESTION_LIMIT = 6
const SUGGESTIONS_ID = "recovery_phrase_suggestions"

const getSuggestionId = (index: number) => `${SUGGESTIONS_ID}_${index}`

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
  const { t } = useTranslation("translation", {
    keyPrefix: "shared.recoveryWordSuggestions",
  })
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const caretAfterPickRef = useRef<number>()
  const [phrase, setPhrase] = useState("")
  const [typedWord, setTypedWord] = useState<WordAtCaret>()
  const [isListDismissed, setIsListDismissed] = useState(false)
  const [highlightedWord, setHighlightedWord] = useState<string>()

  const unknownWordNumbers = useMemo(
    () => findUnknownWordNumbers(phrase, typedWord?.number),
    [phrase, typedWord?.number],
  )

  const suggestions = useMemo(() => {
    if (!typedWord || typedWord.prefix.length < SUGGESTION_MIN_LETTERS) {
      return []
    }
    const words = getRecoveryWordSuggestions(typedWord.prefix, SUGGESTION_LIMIT)
    const isOnlyTheTypedWord =
      words.length === 1 && words[0] === typedWord.prefix.toLowerCase()

    return isOnlyTheTypedWord ? [] : words
  }, [typedWord])

  const isListOpen = suggestions.length > 0 && !isListDismissed
  const highlightedIndex = highlightedWord
    ? suggestions.indexOf(highlightedWord)
    : -1

  useEffect(() => {
    onUnknownWordsChange(unknownWordNumbers)
  }, [unknownWordNumbers, onUnknownWordsChange])

  useLayoutEffect(() => {
    const caret = caretAfterPickRef.current
    if (caret === undefined) return

    textareaRef.current?.setSelectionRange(caret, caret)
    caretAfterPickRef.current = undefined
  }, [phrase])

  const updatePhrase = (value: string, word: WordAtCaret | undefined) => {
    setPhrase(value)
    setTypedWord(word)
    setIsListDismissed(false)
    setHighlightedWord(undefined)
    onChange(value.trim())
  }

  const pickSuggestion = (suggestion: string) => {
    if (!typedWord) return

    const replaced = replaceWord(phrase, typedWord, suggestion)
    caretAfterPickRef.current = replaced.caret
    updatePhrase(replaced.text, undefined)
  }

  const moveHighlight = (step: 1 | -1) => {
    const count = suggestions.length
    // With nothing highlighted, Down starts at the first word and Up at the last.
    const from =
      highlightedIndex === -1 && step === -1 ? count : highlightedIndex

    setHighlightedWord(suggestions[(from + step + count) % count])
  }

  return (
    <>
      <div className="input_wrap">
        <div className="field">
          <textarea
            ref={textareaRef}
            id="recovery_phrase"
            value={phrase}
            data-empty={phrase.length < 1}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            aria-autocomplete="list"
            aria-controls={isListOpen ? SUGGESTIONS_ID : undefined}
            aria-activedescendant={
              isListOpen && highlightedIndex !== -1
                ? getSuggestionId(highlightedIndex)
                : undefined
            }
            aria-invalid={
              unknownWordNumbers.length > 0 || Boolean(errorMessage)
            }
            aria-describedby={
              errorMessage ? "recovery_phrase_error" : undefined
            }
            onChange={(event) => {
              const { value, selectionStart } = event.currentTarget
              const { nativeEvent } = event
              // Pasted, dropped or filled-in text holds whole words, so check
              // them all now instead of waiting for the last one.
              const isInsertedWhole =
                nativeEvent instanceof InputEvent &&
                (nativeEvent.inputType.startsWith("insertFrom") ||
                  /\s/.test(nativeEvent.data ?? ""))

              updatePhrase(
                value,
                isInsertedWhole ? undefined : getWordAt(value, selectionStart),
              )
            }}
            onSelect={(event) => {
              const { value, selectionStart } = event.currentTarget
              setTypedWord((current) => {
                const word = getWordAt(value, selectionStart)
                return word && word.number === current?.number
                  ? word
                  : undefined
              })
            }}
            onKeyDown={(event) => {
              if (!isListOpen || event.nativeEvent.isComposing) return

              switch (event.key) {
                case "ArrowDown":
                case "ArrowUp":
                  event.preventDefault()
                  moveHighlight(event.key === "ArrowDown" ? 1 : -1)
                  break
                case "Enter":
                case "Tab":
                  // With nothing highlighted, Tab leaves the field as usual.
                  if (highlightedIndex !== -1) {
                    event.preventDefault()
                    pickSuggestion(suggestions[highlightedIndex])
                  }
                  break
                case "Escape":
                  event.preventDefault()
                  setIsListDismissed(true)
                  setHighlightedWord(undefined)
                  break
                default:
                  break
              }
            }}
            onBlur={() => setTypedWord(undefined)}
          />
          <label htmlFor="recovery_phrase" className="recovery_label">
            {label}
          </label>
          {isListOpen && (
            <ul
              id={SUGGESTIONS_ID}
              role="listbox"
              aria-label={t("label")}
              className="suggestions"
            >
              {suggestions.map((suggestion, index) => (
                // Keyboard picks go through the textarea, which keeps focus.
                // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={suggestion}
                  id={getSuggestionId(index)}
                  role="option"
                  aria-selected={index === highlightedIndex}
                  className={classNames("suggestion", {
                    highlighted: index === highlightedIndex,
                  })}
                  // Keeps focus in the textarea so the list stays open.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickSuggestion(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="visually_hidden" aria-live="polite">
          {isListOpen ? t("count", { count: suggestions.length }) : ""}
        </p>
        <p id="recovery_phrase_error" className="error" aria-live="polite">
          {errorMessage}
        </p>
      </div>
      <style jsx>{`
        .input_wrap {
          position: relative;
        }

        .field {
          position: relative;
          width: fit-content;
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

        .suggestions {
          display: block;
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          box-sizing: border-box;
          width: 100%;
          margin: 0;
          padding: 4px 0;
          overflow-y: auto;
          background-color: var(--green-95);
          border-radius: 4px;
          box-shadow: var(--shadow-menu);
          z-index: var(--z-dropdown);
        }

        .suggestion {
          display: block;
          list-style-type: none;
          padding: 4px 16px;
          line-height: 24px;
          color: var(--green-20);
          cursor: pointer;
          transition: color var(--fade);
        }

        .suggestion:hover {
          color: var(--trophy-gold);
        }

        .suggestion.highlighted {
          color: var(--trophy-gold);
          background-color: var(--green-80);
        }

        .visually_hidden {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip-path: inset(50%);
          white-space: nowrap;
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

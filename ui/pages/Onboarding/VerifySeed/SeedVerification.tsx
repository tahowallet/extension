import classNames from "classnames"
import React, { ReactElement, useEffect, useState } from "react"
import SharedButton from "../../../components/Shared/SharedButton"
import { OnboardingBox } from "../styles"

type Word = {
  index: number
  word?: string
  isActive: boolean
}

function SeedWord(
  props: Word & { onSubmit: (index: number, word?: string) => void }
): ReactElement {
  const { index, word, isActive = false, onSubmit } = props
  return (
    <>
      <div
        className={classNames("word_container", {
          is_active: isActive,
          is_filled: !!word,
        })}
        onClick={() => onSubmit(index, word)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSubmit(index, word)
          }
        }}
        role="button"
      >
        <span className="word_index">{index + 1}</span>
        <span className="dash">-</span>
        {word || <div className="word_box" />}
      </div>
      <style jsx>{`
        .word_container {
          cursor: pointer;
          color: var(--green-60);
          font-size: 18px;
          line-height: 24px;
          display: flex;
          margin-bottom: 24px;
          width: 140px;
        }
        .word_index {
          width: 15px;
        }
        .word_container.is_active {
          color: var(--trophy-gold);
        }
        .word_container.is_filled {
          color: var(--green-20);
        }
        .word_box {
          border: 1px solid;
          border-radius: 4px;
          width: 70px;
          height: 22px;
        }
        .dash {
          margin: 0 11px 0 8px;
        }
      `}</style>
    </>
  )
}

function SeedVerification({
  setStep,
  mnemonic,
}: {
  setStep: (s: "success" | "error") => void
  mnemonic: string[]
}): ReactElement {
  const [selectedWords, setSelectedWords] = useState<Word[]>([])
  const [remainingWords, setRemainingWords] = useState<string[]>([])

  useEffect(() => {
    if (mnemonic) {
      const randomizedIndexes = mnemonic
        ?.map((_, index) => index)
        .sort(() => Math.random() - 0.5)
        .slice(0, 8)

      // To display the order of verification in the UI (the unfilled numbers "1 -", "7 -", etc)
      const sortedIndexes = [...randomizedIndexes].sort((a, b) => {
        if (a === 0) {
          return -1
        }
        return (a && b && a - b) || 0
      })

      const list = sortedIndexes.map((index) => ({
        index,
        word: undefined,
        isActive: false,
      }))
      list[0].isActive = true

      setSelectedWords(list)
      setRemainingWords(randomizedIndexes.map((i) => mnemonic[i]))
    }
  }, [mnemonic])

  function handleVerification() {
    const isValid = !selectedWords.some(
      ({ index, word }) => mnemonic?.[index] !== word
    )
    setStep(isValid ? "success" : "error")
  }

  const handleAdd = (selectedWord: string) => {
    const active = selectedWords.some((item) => item.isActive)

    if (!active) return

    setRemainingWords(
      remainingWords.filter((word: string) => {
        return word !== selectedWord
      })
    )
    setSelectedWords((list) => {
      let updated = false
      return list.map((item) => {
        const { isActive, index } = item

        if (isActive) {
          updated = true
          return {
            isActive: false,
            word: selectedWord,
            index,
          }
        }

        if (updated && !item.word) {
          updated = false
          return {
            ...item,
            isActive: true,
          }
        }

        return item
      })
    })
  }

  const handleClick = (index: number, word?: string) => {
    setSelectedWords((list) =>
      list.map((item) => {
        if (item.index === index) {
          return {
            ...item,
            word: undefined,
            isActive: true,
          }
        }

        return { ...item, isActive: false }
      })
    )

    if (word) setRemainingWords(() => [...remainingWords, word])
  }

  return (
    <>
      <div className="onboarding_box">
        {selectedWords.map(({ index, word, isActive }) => (
          <SeedWord
            index={index}
            word={word}
            isActive={isActive}
            onSubmit={handleClick}
          />
        ))}
      </div>
      <ul className="button_group">
        {remainingWords?.length === 0 ? (
          <div className="center_horizontal">
            <SharedButton
              type="primary"
              size="medium"
              onClick={() => handleVerification()}
            >
              Verify recovery phrase
            </SharedButton>
          </div>
        ) : (
          remainingWords?.map((remainingWord) => (
            <li className="button_spacing" key={`word_choice_${remainingWord}`}>
              <SharedButton
                type="primary"
                size="small"
                onClick={() => {
                  handleAdd(remainingWord)
                }}
              >
                {remainingWord}
              </SharedButton>
            </li>
          ))
        )}
      </ul>
      <style jsx>
        {`
          .button_group {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            width: calc(100% - 20px);
          }
          .button_spacing {
            margin-right: 8px;
            margin-bottom: 8px;
          }
          .selected_wrap {
            max-height: 159px;
            overflow-y: scroll;
            overflow-anchor: none;
          }
          .column {
            height: 152px;
            font-size: 16px;
            font-weight: 600;
            line-height: 38px;
            text-align: right;
          }
          .column_wrap {
            display: flex;
            width: 167px;
          }
          .dashes {
            margin-right: 8px;
            margin-left: 5px;
            width: 12px;
          }
          .words {
            width: 69px;
            text-align: left;
          }
          .numbers {
            width: 18px;
            text-align: right;
          }
          .onboarding_box {
            ${OnboardingBox}
            flex-wrap: wrap;
            height: 226px;
            justify-content: space-between;
            padding-bottom: 0;
          }
        `}
      </style>
    </>
  )
}

export default SeedVerification

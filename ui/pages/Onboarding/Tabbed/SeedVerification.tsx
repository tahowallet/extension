import { importKeyring } from "@tallyho/tally-background/redux-slices/keyrings"
import classNames from "classnames"
import React, { ReactElement, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useHistory } from "react-router-dom"
import SharedButton from "../../../components/Shared/SharedButton"
import SharedIcon from "../../../components/Shared/SharedIcon"
import { useBackgroundDispatch } from "../../../hooks"
import OnboardingTip from "./OnboardingTip"

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
        <div className="word_box">{word}</div>
      </div>
      <style jsx>{`
        .word_container {
          cursor: pointer;
          color: var(--green-60);
          font-size: 18px;
          line-height: 24px;
          display: flex;
          gap: 8px;
        }

        .word_index {
          width: 16px;
          padding: 4px 0;
          text-align: right;
        }

        .word_container.is_active {
          color: var(--trophy-gold);
        }
        .word_container.is_active .word_box {
          background: var(--trophy-gold);
        }
        .word_container.is_filled {
          color: var(--green-40);
        }
        .word_container.is_filled .word_box {
          background: var(--green-60);
          border-color: var(--green-60);
          color: var(--white);
          background-image: url("./images/icons/s/close.svg");
          background-size: 16px;
          background-position: calc(100% - 8px) 8px;
          background-repeat: no-repeat;
          font-family: "Segment";
          font-style: normal;
          font-weight: 600;
          font-size: 16px;
          line-height: 24px;
        }

        .word_box {
          border: 1px solid;
          border-radius: 4px;
          min-width: 55px;
          width: auto;
          height: 22px;
          padding: 4px 8px;
          padding-right: 32px;
          text-align: left;
        }
        .dash {
          padding: 4px 0;
          font-size: 18px;
          line-height: 24px;
        }
      `}</style>
    </>
  )
}

function SeedVerification({
  mnemonic,
  nextPage,
}: {
  mnemonic: string[]
  nextPage: string
}): ReactElement {
  const { t } = useTranslation()
  const [selectedWords, setSelectedWords] = useState<Word[]>([])
  const [remainingWords, setRemainingWords] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [isValidSeed, setIsValidSeed] = useState(false)
  const dispatch = useBackgroundDispatch()
  const history = useHistory()

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

  const handleVerification = () => {
    const isValid = !selectedWords.some(
      ({ index, word }) => mnemonic?.[index] !== word
    )

    setSubmitted(true)
    setIsValidSeed(isValid)
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
      const newList = list.map((item) => {
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

      if (submitted) {
        const isValid = !newList.some(
          ({ index, word }) => mnemonic?.[index] !== word
        )

        setIsValidSeed(isValid)
      }

      return newList
    })
  }

  const handleClick = (index: number, word?: string) => {
    if (isValidSeed) return

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

  const handleOnboardingComplete = () => {
    dispatch(
      importKeyring({
        mnemonic: mnemonic.join(" "),
        source: "internal",
      })
    ).then(() => history.push(nextPage))
  }

  return (
    <>
      <div className="words_list">
        {selectedWords.map(({ index, word, isActive }) => (
          <SeedWord
            key={`${word}-${index}`}
            index={index}
            word={word}
            isActive={isActive}
            onSubmit={handleClick}
          />
        ))}
      </div>
      <div className="actions">
        {remainingWords?.length === 0 ? (
          <>
            <div className="verify_and_submit">
              {submitted ? (
                <SharedButton
                  type="primary"
                  style={{ background: "var(--green-80)" }}
                  size="medium"
                  isDisabled
                >
                  <span
                    className="valid_status_btn_content"
                    data-is-valid={isValidSeed}
                  >
                    {isValidSeed ? (
                      <>
                        <SharedIcon
                          color="var(--success)"
                          width={24}
                          icon="icons/m/notif-correct.svg"
                        />
                        Verified
                      </>
                    ) : (
                      <>
                        <SharedIcon
                          color="var(--error)"
                          width={24}
                          icon="icons/m/notif-wrong.svg"
                        />
                        Incorrect Order
                      </>
                    )}
                  </span>
                </SharedButton>
              ) : (
                <SharedButton
                  type="primary"
                  size="medium"
                  onClick={handleVerification}
                >
                  {t("onboarding.seedVerification.verifySeedPrompt")}
                </SharedButton>
              )}

              <SharedButton
                type="primary"
                size="medium"
                isDisabled={!submitted || !isValidSeed}
                onClick={handleOnboardingComplete}
              >
                Finalise
              </SharedButton>
            </div>
            {submitted && !isValidSeed && (
              <div className="error">
                Verify the order and remove the ones that aren&apos;t in the
                right position.
              </div>
            )}
          </>
        ) : (
          <ul className="remaining_word_list">
            {remainingWords?.map((remainingWord, i) => {
              const key = `word_choice_${remainingWord}-${i}`
              return (
                <li className="button_spacing" key={key}>
                  <SharedButton
                    type="primary"
                    size="small"
                    onClick={() => handleAdd(remainingWord)}
                  >
                    {remainingWord}
                  </SharedButton>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <OnboardingTip>
        If you didn’t write it down, you can{" "}
        <Link
          component={({ navigate, children }) => (
            <span
              className="reset_seed_link"
              role="link"
              tabIndex={0}
              onKeyUp={navigate}
              onClick={navigate}
            >
              {children}
            </span>
          )}
          to="/onboarding/new-seed"
        >
          start with a new phrase
        </Link>
      </OnboardingTip>
      <style jsx>
        {`
          .error {
            width: 100%;
            font-family: "Segment";
            font-style: normal;
            font-weight: 400;
            font-size: 16px;
            line-height: 24px;
            color: var(--green-40);
          }

          .valid_status_btn_content[data-is-valid="false"] {
            color: var(--error);
          }

          .valid_status_btn_content[data-is-valid="true"] {
            color: var(--success);
          }

          .valid_status_btn_content {
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .reset_seed_link {
            cursor: pointer;
            color: var(--trophy-gold);
          }

          .words_list {
            display: grid;
            grid: repeat(4, 1fr) / auto-flow;
            gap: 19px 40px;
            background: var(--green-95);
            border-radius: 8px;
            padding: 36px;
            margin-bottom: 16px;
            place-items: start;
          }

          .remaining_word_list {
            display: flex;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 8px;
            margin: 0;
          }

          .actions {
            display: flex;
            flex-direction: column;
            gap: 20px;
            margin-bottom: 24px;
          }
          .verify_and_submit {
            display: flex;
            justify-content: space-between;
          }
        `}
      </style>
    </>
  )
}

export default SeedVerification

import { OneTimeAnalyticsEvent } from "@tallyho/tally-background/lib/posthog"
import { sendEvent } from "@tallyho/tally-background/redux-slices/ui"
import classNames from "classnames"
import React, { ReactElement, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import SharedButton from "../../../../components/Shared/SharedButton"
import SharedIcon from "../../../../components/Shared/SharedIcon"
import { useBackgroundDispatch } from "../../../../hooks"
import OnboardingTip from "../OnboardingTip"
import OnboardingRoutes from "../Routes"

type SeedWordProps = {
  word?: string
  index: number
  isActive: boolean
  onSubmit: () => void
}

function SeedWord(props: SeedWordProps): ReactElement {
  const { index, word, isActive = false, onSubmit } = props
  return (
    <>
      <div
        className={classNames("word_container", {
          is_active: isActive,
          is_filled: !!word,
        })}
        onClick={() => onSubmit()}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSubmit()
          }
        }}
        role="button"
        data-testid="verify_seed_word_placeholder"
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

type SeedWordWithIndex = {
  wordIndex: number
  word: string
}

type SeedWordPlaceholder = {
  correctWord: string
  selectedWord?: string
  wordIndex: number
  key: string
}

export default function NewSeedVerify({
  onVerify,
  mnemonic,
}: {
  onVerify: (mnemonic: string[]) => void
  mnemonic: string[]
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "onboarding.tabbed.newWalletVerify",
  })

  const dispatch = useBackgroundDispatch()

  const SEED_WORDS_TO_VERIFY = 8

  const randomIndexes = useMemo(
    () =>
      mnemonic
        .map((_, index) => index)
        .sort(() => Math.random() - 0.5)
        .slice(0, SEED_WORDS_TO_VERIFY),
    [mnemonic]
  )

  const [placeholderList, setPlaceholders] = useState<SeedWordPlaceholder[]>(
    () => {
      const randomSeedWords: SeedWordWithIndex[] = randomIndexes
        .map((index) => ({
          wordIndex: index,
          word: mnemonic[index],
        }))
        .sort(({ wordIndex: a }, { wordIndex: b }) => a - b)

      return randomSeedWords.map(({ wordIndex, word }) => ({
        correctWord: word,
        selectedWord: undefined,
        key: `${word}-${wordIndex}`,
        wordIndex,
      }))
    }
  )

  const [activePlaceholder, setActivePlaceholder] = useState<number>(0)

  const [remainingWords, setRemainingWords] = useState<string[]>(() =>
    randomIndexes.map((index) => mnemonic[index])
  )

  const [submitted, setSubmitted] = useState(false)
  const [isValidSeed, setIsValidSeed] = useState(false)

  const handleVerification = () => {
    const isValid = placeholderList.every(
      ({ correctWord, selectedWord }) => correctWord === selectedWord
    )

    setSubmitted(true)
    setIsValidSeed(isValid)

    if (isValid) {
      dispatch(sendEvent(OneTimeAnalyticsEvent.ONBOARDING_FINISHED))
    }
  }

  const handleAdd = (wordIndex: number) => {
    const position =
      activePlaceholder >= 0
        ? activePlaceholder
        : placeholderList.findIndex((word) => word.selectedWord === undefined)

    if (position >= 0) {
      const newSelectedWords = placeholderList.map((word, index) =>
        index === position
          ? { ...word, selectedWord: remainingWords[wordIndex] }
          : word
      )

      setPlaceholders(newSelectedWords)

      setRemainingWords((words) => words.filter((_, i) => i !== wordIndex))

      const nextActivePlaceholder = newSelectedWords.findIndex(
        (word) => word.selectedWord === undefined
      )

      // Set the next available placeholder as active
      setActivePlaceholder(nextActivePlaceholder)

      if (submitted && nextActivePlaceholder === -1) {
        const isValid = newSelectedWords.every(
          ({ correctWord, selectedWord }) => correctWord === selectedWord
        )

        setIsValidSeed(isValid)
      }
    }
  }

  const handlePlaceholderClick = (position: number): void => {
    if (isValidSeed) return
    const { selectedWord } = placeholderList[position]

    // Clear if placeholder is not empty
    if (selectedWord) {
      setRemainingWords((words) => [...words, selectedWord])

      setPlaceholders((words) =>
        words.map((word, i) =>
          i === position ? { ...word, selectedWord: undefined } : word
        )
      )
    }

    setActivePlaceholder(position)
  }

  return (
    <section className="verify_section fade_in">
      <h1 className="center_text">{t("title")}</h1>
      <div className="subtitle center_text">{t("subtitle")}</div>
      <div className="words_list">
        {placeholderList.map(({ selectedWord, key, wordIndex }, i) => (
          <SeedWord
            key={key}
            index={wordIndex}
            word={selectedWord}
            isActive={activePlaceholder === i}
            onSubmit={() => handlePlaceholderClick(i)}
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

                        {t("validState")}
                      </>
                    ) : (
                      <>
                        <SharedIcon
                          color="var(--error)"
                          width={24}
                          icon="icons/m/notif-wrong.svg"
                        />

                        {t("invalidState")}
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
                  {t("verifyValidState")}
                </SharedButton>
              )}

              <SharedButton
                type="primary"
                size="medium"
                isDisabled={!submitted || !isValidSeed}
                onClick={() => onVerify(mnemonic)}
              >
                {t("submit")}
              </SharedButton>
            </div>
            {submitted && !isValidSeed && (
              <div className="error">{t("invalidStateMsg")}</div>
            )}
          </>
        ) : (
          <ul
            className="remaining_word_list"
            data-testid="remaining_seed_words"
          >
            {remainingWords.map((word, i) => {
              const key = `${word}-${i}`
              return (
                <li className="button_spacing" key={key}>
                  <SharedButton
                    type="primary"
                    size="small"
                    onClick={() => handleAdd(i)}
                  >
                    {word}
                  </SharedButton>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <OnboardingTip>
        <Trans
          t={t}
          i18nKey="tip"
          components={{
            url: (
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
                replace
                to={OnboardingRoutes.NEW_SEED}
              />
            ),
          }}
        />
      </OnboardingTip>
      <style jsx>
        {`
          h1 {
            font-family: "Quincy CF";
            font-style: normal;
            font-weight: 500;
            font-size: 36px;
            line-height: 42px;
            color: var(--white);
            margin: 24px 0 4px;
          }

          .subtitle {
            font-family: "Segment";
            font-style: normal;
            font-weight: 400;
            font-size: 16px;
            line-height: 24px;
            color: var(--green-40);
            margin-bottom: 41px;
          }

          .verify_section {
            max-width: 450px;
            margin: 0 auto;
          }

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
    </section>
  )
}

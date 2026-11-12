import { isValidMnemonic } from "@ethersproject/hdnode"
import { wordlists } from "ethers"

const BIP39_WORD_COUNT = 2048

const RECOVERY_PHRASE_LENGTHS = [12, 24]

let englishWords: string[] | undefined

function getEnglishWords(): string[] {
  englishWords ??= Array.from({ length: BIP39_WORD_COUNT }, (_, index) =>
    wordlists.en.getWord(index),
  )
  return englishWords
}

export type RecoveryPhraseCheck = {
  result: "valid" | "unknownWords" | "wordCount" | "checksum"
  unknownWordNumbers: number[]
  wordCount: number
}

export function normalizeRecoveryPhrase(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

export function splitRecoveryPhrase(text: string): string[] {
  const phrase = normalizeRecoveryPhrase(text)
  return phrase ? phrase.split(" ") : []
}

/**
 * Matches the lookup `isValidMnemonic` does, so a word accepted here is never
 * rejected by the final check.
 */
export function isRecoveryWord(word: string): boolean {
  return wordlists.en.getWordIndex(word.toLowerCase().normalize("NFKD")) !== -1
}

export function getRecoveryWordSuggestions(
  prefix: string,
  limit: number,
): string[] {
  const start = prefix.trim().toLowerCase()
  if (!start) return []

  return getEnglishWords()
    .filter((word) => word.startsWith(start))
    .slice(0, limit)
}

/**
 * Returns 1-based positions of words not in the list. Leave out the last word
 * while it may still be being typed.
 */
export function findUnknownWordNumbers(
  text: string,
  { includeLastWord }: { includeLastWord: boolean },
): number[] {
  const words = splitRecoveryPhrase(text)
  const checkedWords = includeLastWord ? words : words.slice(0, -1)

  return checkedWords.flatMap((word, index) =>
    isRecoveryWord(word) ? [] : [index + 1],
  )
}

export function checkRecoveryPhrase(text: string): RecoveryPhraseCheck {
  const words = splitRecoveryPhrase(text)
  const wordCount = words.length
  const unknownWordNumbers = findUnknownWordNumbers(text, {
    includeLastWord: true,
  })

  if (unknownWordNumbers.length > 0) {
    return { result: "unknownWords", unknownWordNumbers, wordCount }
  }
  if (!RECOVERY_PHRASE_LENGTHS.includes(wordCount)) {
    return { result: "wordCount", unknownWordNumbers, wordCount }
  }
  if (!isValidMnemonic(words.join(" "))) {
    return { result: "checksum", unknownWordNumbers, wordCount }
  }
  return { result: "valid", unknownWordNumbers, wordCount }
}

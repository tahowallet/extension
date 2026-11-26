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

export type WordAtCaret = {
  number: number
  start: number
  end: number
  prefix: string
}

/**
 * Returns the word that ends at the caret, which is the word being typed, or
 * `undefined` when the caret follows whitespace. `number` is 1-based and
 * `prefix` is the part of the word before the caret.
 */
export function getWordAt(
  text: string,
  caret: number,
): WordAtCaret | undefined {
  const textBeforeCaret = text.slice(0, caret)
  const prefix = textBeforeCaret.match(/\S+$/)?.[0]
  if (!prefix) return undefined

  const restOfWord = text.slice(caret).match(/^\S*/)?.[0] ?? ""

  return {
    number: splitRecoveryPhrase(textBeforeCaret).length,
    start: caret - prefix.length,
    end: caret + restOfWord.length,
    prefix,
  }
}

/**
 * Puts `replacement` and a single space in place of `word`, returning the new
 * text and the caret position after that space.
 */
export function replaceWord(
  text: string,
  word: WordAtCaret,
  replacement: string,
): { text: string; caret: number } {
  const textAfterWord = text.slice(word.end).replace(/^\s*/, "")

  return {
    text: `${text.slice(0, word.start)}${replacement} ${textAfterWord}`,
    caret: word.start + replacement.length + 1,
  }
}

/**
 * Returns 1-based numbers of words not in the list, leaving out
 * `skipWordNumber` so a word isn't marked while it's being typed.
 */
export function findUnknownWordNumbers(
  text: string,
  skipWordNumber?: number,
): number[] {
  return splitRecoveryPhrase(text).flatMap((word, index) =>
    index + 1 === skipWordNumber || isRecoveryWord(word) ? [] : [index + 1],
  )
}

export function checkRecoveryPhrase(text: string): RecoveryPhraseCheck {
  const words = splitRecoveryPhrase(text)
  const wordCount = words.length
  const unknownWordNumbers = findUnknownWordNumbers(text)

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

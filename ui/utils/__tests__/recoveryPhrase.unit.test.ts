import { isValidMnemonic } from "@ethersproject/hdnode"
import {
  checkRecoveryPhrase,
  findUnknownWordNumbers,
  getRecoveryWordSuggestions,
  getWordAt,
  isRecoveryWord,
  normalizeRecoveryPhrase,
  replaceWord,
  splitRecoveryPhrase,
} from "../recoveryPhrase"

// Public BIP39 test vectors.
const VALID_12 = `${"abandon ".repeat(11)}about`
const VALID_24 = `${"abandon ".repeat(23)}art`
const BAD_CHECKSUM_12 = "abandon ".repeat(12).trim()

const withWordAt = (phrase: string, number: number, word: string) => {
  const words = phrase.split(" ")
  words[number - 1] = word
  return words.join(" ")
}

describe("isRecoveryWord", () => {
  it("accepts exact list words", () => {
    expect(isRecoveryWord("abandon")).toBe(true)
    expect(isRecoveryWord("zoo")).toBe(true)
  })

  it("ignores case", () => {
    expect(isRecoveryWord("ABANDON")).toBe(true)
    expect(isRecoveryWord("Abandon")).toBe(true)
  })

  it("rejects misspellings and other words", () => {
    expect(isRecoveryWord("abandonn")).toBe(false)
    expect(isRecoveryWord("abandom")).toBe(false)
    expect(isRecoveryWord("aba")).toBe(false)
    expect(isRecoveryWord("")).toBe(false)
  })
})

describe("getRecoveryWordSuggestions", () => {
  it("finds words by prefix in list order", () => {
    expect(getRecoveryWordSuggestions("aba", 6)).toEqual(["abandon"])
    expect(getRecoveryWordSuggestions("ab", 3)).toEqual([
      "abandon",
      "ability",
      "able",
    ])
  })

  it("caps the number of suggestions", () => {
    expect(getRecoveryWordSuggestions("a", 6)).toHaveLength(6)
  })

  it("narrows to at most one word after four letters", () => {
    expect(getRecoveryWordSuggestions("aban", 6)).toEqual(["abandon"])
  })

  it("ignores case and surrounding whitespace", () => {
    expect(getRecoveryWordSuggestions(" ABA ", 6)).toEqual(["abandon"])
  })

  it("returns nothing for an empty or unknown prefix", () => {
    expect(getRecoveryWordSuggestions("", 6)).toEqual([])
    expect(getRecoveryWordSuggestions("xq", 6)).toEqual([])
  })
})

describe("normalizeRecoveryPhrase", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeRecoveryPhrase("  Abandon\tabout\n\nzoo  ")).toBe(
      "abandon about zoo",
    )
  })

  it("splits an empty phrase into no words", () => {
    expect(splitRecoveryPhrase("   ")).toEqual([])
  })
})

describe("getWordAt", () => {
  it("finds the word that ends at the caret", () => {
    expect(getWordAt("abandon abo", 11)).toEqual({
      number: 2,
      start: 8,
      end: 11,
      prefix: "abo",
    })
    expect(getWordAt("abandon abo", 7)?.number).toBe(1)
    expect(getWordAt("  abandon\n\tabo", 14)?.number).toBe(2)
  })

  it("covers the whole word when the caret is inside it", () => {
    expect(getWordAt("abandon abo", 3)).toEqual({
      number: 1,
      start: 0,
      end: 7,
      prefix: "aba",
    })
  })

  it("finds no word when the caret follows whitespace", () => {
    expect(getWordAt("abandon ", 8)).toBeUndefined()
    expect(getWordAt("abandon abo", 8)).toBeUndefined()
    expect(getWordAt("", 0)).toBeUndefined()
  })
})

describe("replaceWord", () => {
  it("replaces the last word and adds a space", () => {
    const text = "abandon abo"
    const word = getWordAt(text, 11)!

    expect(replaceWord(text, word, "about")).toEqual({
      text: "abandon about ",
      caret: 14,
    })
  })

  it("replaces a whole word in the middle", () => {
    const text = "abandon abxyz about"
    const word = getWordAt(text, 10)!

    expect(replaceWord(text, word, "ability")).toEqual({
      text: "abandon ability about",
      caret: 16,
    })
  })
})

describe("findUnknownWordNumbers", () => {
  it("returns 1-based numbers of unknown words", () => {
    const phrase = withWordAt(withWordAt(VALID_12, 3, "abndon"), 7, "abandom")

    expect(findUnknownWordNumbers(phrase)).toEqual([3, 7])
  })

  it("can leave out the word being typed", () => {
    const phrase = withWordAt(withWordAt(VALID_12, 3, "abndon"), 12, "abo")

    expect(findUnknownWordNumbers(phrase, 12)).toEqual([3])
    expect(findUnknownWordNumbers(phrase, 3)).toEqual([12])
  })
})

describe("checkRecoveryPhrase", () => {
  it("accepts valid 12 and 24 word phrases", () => {
    expect(checkRecoveryPhrase(VALID_12)).toEqual({
      result: "valid",
      unknownWordNumbers: [],
      wordCount: 12,
    })
    expect(checkRecoveryPhrase(VALID_24).result).toBe("valid")
  })

  it("accepts a valid phrase with odd case and whitespace", () => {
    expect(
      checkRecoveryPhrase(`  ${VALID_12.toUpperCase().replace(/ /g, "\n ")} `)
        .result,
    ).toBe("valid")
  })

  it("reports unknown words before the word count", () => {
    expect(checkRecoveryPhrase("abandon abandom")).toEqual({
      result: "unknownWords",
      unknownWordNumbers: [2],
      wordCount: 2,
    })
  })

  it.each([0, 11, 13, 23, 25])("rejects %i words", (count) => {
    expect(checkRecoveryPhrase("abandon ".repeat(count))).toEqual({
      result: "wordCount",
      unknownWordNumbers: [],
      wordCount: count,
    })
  })

  it("reports a checksum failure when every word is valid", () => {
    expect(checkRecoveryPhrase(BAD_CHECKSUM_12).result).toBe("checksum")
  })

  it.each([
    VALID_12,
    VALID_24,
    BAD_CHECKSUM_12,
    withWordAt(VALID_12, 5, "abandom"),
  ])("agrees with isValidMnemonic on %s", (phrase) => {
    expect(checkRecoveryPhrase(phrase).result === "valid").toBe(
      isValidMnemonic(normalizeRecoveryPhrase(phrase)),
    )
  })
})

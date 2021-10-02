import { decodeJSON, encodeJSON } from "../lib/utils"

function randomFloat(): number {
  return Math.random()
}

function randomPositiveInt(max: number): number {
  return Math.floor(randomFloat() * max)
}

function randomBigInt(): BigInt {
  const f = randomFloat()
  if (f < 0.1) {
    return BigInt(0)
  }
  if (f < 0.3) {
    return BigInt("100000")
  }
  if (f < 0.5) {
    return BigInt("10000000000")
  }
  return BigInt(10) ** BigInt(randomPositiveInt(10) + 10)
}

function randomNumber(): number {
  return 1.1
}

function randomString(maxLength: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890äćüÖ"
  let rv = ""
  for (let i = 0; i < maxLength; i += 1) {
    rv += alphabet.charAt(randomPositiveInt(alphabet.length))
  }
  return rv
}

function randomJSONAtom(
  includeBigInt = false
): string | number | null | undefined | BigInt {
  const max = includeBigInt ? 4 : 3
  const choice = randomPositiveInt(max)
  switch (choice) {
    case 0:
      return randomString(10)
    case 1:
      return randomNumber()
    case 2:
      return null
    case 3:
      return randomBigInt()
    default:
      return undefined
  }
}

function randomJSONAtomArray(
  maxLength: number,
  includeBigInt = false
): ReturnType<typeof randomJSONAtom>[] {
  const arr = []
  for (let i = 0; i < maxLength; i += 1) {
    arr.push(randomJSONAtom(includeBigInt))
  }
  return arr
}

/* eslint-disable @typescript-eslint/no-use-before-define */
function randomJSONObject(maxKeys: number, includeBigInt = false) {
  const numKeys = randomPositiveInt(maxKeys)
  const rv = {}
  for (let i = 0; i < numKeys; i += 1) {
    rv[randomString(30)] = randomJSONComponent(includeBigInt)
  }
  return rv
}
/* eslint-enable @typescript-eslint/no-use-before-define */

function randomJSONComponent(includeBigInt = false) {
  const f = randomFloat()
  if (f < 0.1) {
    return randomJSONObject(10, includeBigInt)
  }
  if (f < 0.2) {
    return randomJSONAtomArray(10, includeBigInt)
  }
  return randomJSONAtom(includeBigInt)
}

test("encodes vanilla JSON without throwing", () => {
  for (let i = 0; i < 100; i += 1) {
    const json = randomJSONComponent()
    encodeJSON(json)
  }
})

test("decodes vanilla JSON it encoded", () => {
  for (let i = 0; i < 100; i += 1) {
    const json = randomJSONComponent()
    const encoded = encodeJSON(json)
    expect(decodeJSON(encoded)).toStrictEqual(json)
  }
})

test("encodes bigints correctly", () => {
  // plain bigint
  for (let i = 0; i < 10; i += 1) {
    const big = randomBigInt()
    expect(encodeJSON(big)).toStrictEqual(`{"B_I_G_I_N_T":"${big.toString()}"}`)
  }
  // bigint arrays
  for (let i = 0; i < 10; i += 1) {
    const bigArr = [randomBigInt()]
    expect(encodeJSON(bigArr)).toStrictEqual(
      `[{"B_I_G_I_N_T":"${bigArr[0].toString()}"}]`
    )
  }
  // bigint object values
  for (let i = 0; i < 10; i += 1) {
    const big = randomBigInt()
    const bigObj = { test: big }
    expect(encodeJSON(bigObj)).toStrictEqual(
      `{"test":{"B_I_G_I_N_T":"${big.toString()}"}}`
    )
  }
})

test("encodes random JSON with bigints without throwing", () => {
  for (let i = 0; i < 100; i += 1) {
    const json = randomJSONComponent(true)
    encodeJSON(json)
  }
})

test("decodes random JSON with bigints that it encoded", () => {
  for (let i = 0; i < 100; i += 1) {
    const json = randomJSONComponent(true)
    const encoded = encodeJSON(json)
    expect(decodeJSON(encoded)).toStrictEqual(json)
  }
})

test("encodes very large JSON without throwing", () => {
  const json = randomJSONAtomArray(32000)
  encodeJSON(json)
})
test("decodes large JSON", () => {
  const json = randomJSONAtomArray(32000)
  const encoded = encodeJSON(json)
  expect(decodeJSON(encoded)).toStrictEqual(json)
})

test("encodes very large JSON with bigints", () => {
  const json = randomJSONAtomArray(32000, true)
  encodeJSON(json)
})
test("decodes large JSON with bigints", () => {
  const json = randomJSONAtomArray(32000, true)
  const encoded = encodeJSON(json)
  expect(decodeJSON(encoded)).toStrictEqual(json)
})

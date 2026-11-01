import { decodeJSON, encodeJSON } from "../lib/utils"

const smallBigInt = 12n
// Included as libraries exist that handle bigints but unexpectedly fail on
// large ones.
const hugeBigInt = 10n ** 400n

test("round-trips bigints correctly", () => {
  // plain
  expect(decodeJSON(encodeJSON(smallBigInt))).toStrictEqual(smallBigInt)
  expect(decodeJSON(encodeJSON(hugeBigInt))).toStrictEqual(hugeBigInt)

  // in arrays
  const bigArray = [smallBigInt, hugeBigInt]
  expect(decodeJSON(encodeJSON(bigArray))).toStrictEqual(bigArray)

  // in object values
  const bigObject = { small: smallBigInt, huge: hugeBigInt }
  expect(decodeJSON(encodeJSON(bigObject))).toStrictEqual(bigObject)
})

test("round-trips mixed values with bigints correctly", () => {
  const mixedArray = [smallBigInt, 132.167, 153, 12.683e13, "hello", hugeBigInt]
  const mixedObject = {
    small: smallBigInt,
    huge: hugeBigInt,
    number: 153,
    float: 132.167,
    exp: 12.683e13,
    string: "hello",
    nullCheck: null,
  }
  const mixedObjectWithUndefined = {
    ...mixedObject,
    undefinedCheck: undefined,
  }

  expect(decodeJSON(encodeJSON(mixedArray))).toStrictEqual(mixedArray)
  expect(decodeJSON(encodeJSON(mixedObjectWithUndefined))).toStrictEqual(
    mixedObject,
  )
})

import type { AddressOnNetwork } from "@tallyho/tally-background/accounts"
import { ETHEREUM, ROOTSTOCK } from "@tallyho/tally-background/constants"
import type { EVMNetwork } from "@tallyho/tally-background/networks"
import {
  isProbablyEVMAddress,
  normalizeEVMAddress,
  isValidChecksumAddress,
  isMixedCaseAddress,
} from "@tallyho/tally-background/lib/utils"
import {
  checkControlCompatibility,
  resolveNameOnNetwork,
} from "@tallyho/tally-background/redux-slices/accounts"
import { selectCurrentAccount } from "@tallyho/tally-background/redux-slices/selectors"
import type { HexString } from "@tallyho/tally-background/types"
import { useRef, useState, useCallback } from "react"
import { useBackgroundDispatch, useBackgroundSelector } from "./redux-hooks"

/**
 * A handler that is called once a valid input is processed through a
 * validator. If an invalid value is entered by the user, the validator will be
 * called with `undefined` to facilitate form state maintenance.
 */
export type ValidDataChangeHandler<T> = (validData: T | undefined) => void
/**
 * A data validator that may return a validation error or, if the data is
 * valid, undefined.
 */
export type AdditionalDataValidator<T> = (
  data: T,
) => { error: string } | undefined

export type ValidationHookProperties = {
  /**
   * A passthrough for the raw value. This is useful to avoid clearing the
   * user's input just because they entered an invalid value, and can be used
   * as a direct input to a `value` prop.
   */
  rawValue: string
  /**
   * The error message from parsing the current value, if any.
   */
  errorMessage: string | undefined
  /**
   * The handler that should receive new raw user inputs (e.g. for passing to
   * an input's `onChange`).
   */
  handleInputChange: (newValue: string) => void
}

export type AsyncValidationHookProperties = ValidationHookProperties & {
  /**
   * A boolean indicating if the async validator is currently validating the
   * passed input. The most straightforward use of this is to show a spinner
   * while the validator is running.
   */
  isValidating: boolean
}

/**
 * A hook that provides validation for a string input that should produce a
 * type T. Validation hooks typically handle parsing internally and may do
 * limited validation; additional validation may be provided with one or more
 * additional validators, which are expected to be called in sequence.
 *
 * The `onValidChange` handler is invoked with a validated value, or `undefined`
 * if the entered value was invalid.
 *
 * Validation hooks return an object with two properties; see
 * `ValidationHookProperties` for more.
 *
 * @param onValidChange A change handler that is invoked with the parsed and
 *     validated user input, or undefined if the user input was empty,
 *     unparsable, or invalid.
 * @param additionalValidators One or more additional validator functions that
 *     can layer caller-specified validation on the parsed value.
 */
export type ValidationHook<T> = (
  onValidChange: ValidDataChangeHandler<T>,
  ...additionalValidators: AdditionalDataValidator<T>[]
) => ValidationHookProperties

/**
 * A hook that provides asynchronous validation for a string input that should
 * produce a type T. These hooks function the same as {@see ValidationHook},
 * but may perform asynchronous operations. As such, they return an additional
 * property to indicate whether an asynchronous validation is currently in
 * progress, which can be used to reflect the pending operation in the UI.
 */
export type AsyncValidationHook<T> = (
  onValidChange: ValidDataChangeHandler<T>,
  ...additionalValidators: AdditionalDataValidator<Promise<T>>[]
) => AsyncValidationHookProperties

/**
 * A ValidationHook that parses string values using a parser and allows for
 * additional validation. Empty strings or strings of entirely whitespace do
 * not trigger an error, but do trigger the change handler with a value of
 * `undefined`.
 */
export const useParsedValidation = <T>(
  onValidChange: (validValue: T | undefined) => void,
  parser: (value: string) => { parsed: T } | { error: string },
  additionalValidator?: AdditionalDataValidator<T>,
): ValidationHookProperties => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [rawValue, setRawValue] = useState<string>("")

  const handleInputChange = (newValue: string) => {
    setRawValue(newValue)

    const trimmed = newValue.trim()

    setErrorMessage(undefined)
    if (trimmed === "") {
      onValidChange(undefined)
    } else {
      try {
        const parseResult = parser(trimmed)
        if ("error" in parseResult) {
          setErrorMessage(parseResult.error)
        } else {
          const additionalValidation = additionalValidator?.(parseResult.parsed)
          if (additionalValidation !== undefined) {
            setErrorMessage(additionalValidation.error)
          } else {
            onValidChange(parseResult.parsed)
          }
        }
      } catch (e) {
        setErrorMessage("Must be a number")
      }
    }
  }

  return { rawValue, errorMessage, handleInputChange }
}

/**
 * The valid value reported by `useAddressOrNameValidation`.
 */
export type ResolvedAddressOrName = {
  address: HexString
  name?: string
  /**
   * Only set for names: the network the name was resolved on. That is the
   * current network, or Ethereum mainnet when the name only resolved there.
   */
  resolvedNetwork?: EVMNetwork
  /**
   * Only set for names. False when the name resolved on Ethereum mainnet and
   * the address is not known to be control-compatible with the current network
   * (see RFB 5). The name is still valid in that case.
   */
  controlCompatible?: boolean
}

/**
 * An AsyncValidationHook that attempts to resolve strings as either addresses
 * or names resolvable via internal name resolution. Empty strings or strings
 * of entirely whitespace do not trigger an error, but do trigger the change
 * handler with a value of `undefined`.
 *
 * Address-like strings are immediately considered valid, while non-address
 * strings are resolved asynchronously. A name that does not resolve on the
 * current network falls back to Ethereum mainnet (unless the current network
 * is Ethereum mainnet), and is then reported with whether it is
 * control-compatible with the current network.
 */
export const useAddressOrNameValidation: AsyncValidationHook<
  ResolvedAddressOrName | undefined
> = (onValidChange) => {
  const [errorMessage, setErrorMessage] = useState<string | undefined>()
  const [rawValue, setRawValue] = useState<string>("")
  // Flag and value tracked separately due to async handling.
  const [isValidating, setIsValidating] = useState(false)
  const validatingValue = useRef<string | undefined>(undefined)
  const dispatch = useBackgroundDispatch()

  const { network } = useBackgroundSelector(selectCurrentAccount)

  const handleInputChange = useCallback(
    async (newValue: string) => {
      setRawValue(newValue)

      const trimmed = newValue.trim()

      setErrorMessage(undefined)
      // Whatever this input is, a name lookup still in flight is now outdated:
      // clear the marker its `isStale()` check reads, so its late result is
      // dropped. The name branch below sets the marker again if it needs to.
      validatingValue.current = undefined
      setIsValidating(false)

      if (trimmed === "") {
        onValidChange(undefined)
      } else if (isProbablyEVMAddress(trimmed)) {
        // Apply checksum validation only for RSK network
        if (
          ROOTSTOCK.chainID === network.chainID &&
          isMixedCaseAddress(trimmed) &&
          !isValidChecksumAddress(trimmed, +network.chainID)
        ) {
          onValidChange(undefined)
          setErrorMessage("Be careful! This may not be a valid RSK address.")
        } else {
          onValidChange({ address: normalizeEVMAddress(trimmed) })
        }
      } else {
        setIsValidating(true)
        validatingValue.current = trimmed

        // Asynchronicity means we could already have started validating another
        // value before this validation completed; ignore those cases. Every
        // await below checks this, as the fallback adds another round trip.
        const isStale = () => validatingValue.current !== trimmed
        const settle = (value: ResolvedAddressOrName | undefined) => {
          onValidChange(value)
          if (value === undefined) {
            setErrorMessage("Address could not be found")
          }
          setIsValidating(false)
          validatingValue.current = undefined
        }

        const resolved = (await dispatch(
          resolveNameOnNetwork({ name: trimmed, network }),
        )) as unknown as AddressOnNetwork | undefined

        if (isStale()) {
          return
        }

        if (resolved !== undefined) {
          settle({
            name: trimmed,
            address: resolved.address,
            resolvedNetwork: network,
            controlCompatible: true,
          })
          return
        }

        // No record for the current network. Fall back to Ethereum mainnet,
        // unless that is the current network already.
        if (network.chainID === ETHEREUM.chainID) {
          settle(undefined)
          return
        }

        const mainnetResolved = (await dispatch(
          resolveNameOnNetwork({ name: trimmed, network: ETHEREUM }),
        )) as unknown as AddressOnNetwork | undefined

        if (isStale()) {
          return
        }

        if (mainnetResolved === undefined) {
          settle(undefined)
          return
        }

        const controlCompatible = (await dispatch(
          checkControlCompatibility({
            objectOnNetwork: { name: trimmed, network: ETHEREUM },
            otherNetwork: network,
          }),
        )) as unknown as boolean

        if (isStale()) {
          return
        }

        settle({
          name: trimmed,
          address: mainnetResolved.address,
          resolvedNetwork: ETHEREUM,
          controlCompatible,
        })
      }
    },
    [dispatch, network, onValidChange],
  )

  return {
    rawValue,
    errorMessage,
    isValidating,
    handleInputChange,
  }
}

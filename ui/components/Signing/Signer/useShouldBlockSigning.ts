import {
  selectHasInsufficientFunds,
  selectIsSigningNetworkUnreachable,
} from "@tallyho/tally-background/redux-slices/selectors/transactionConstructionSelectors"
import { selectAdditionalSigningStatus } from "@tallyho/tally-background/redux-slices/signing"
import { useBackgroundSelector } from "../../../hooks"

/**
 * Why signing is being held back, when it is. Ordered below by how little the
 * user can do about it: unsaved fee edits are their own doing and reversible,
 * while a chain we cannot read leaves the fees and the nonce unverifiable
 * however the form is filled in.
 */
export type SigningBlockReason =
  | "network-unreachable"
  | "unsaved-changes"
  | "insufficient-funds"

/**
 * The message explaining a block, keyed rather than resolved — as with
 * `signingActionLabelI18nKey`, and spelled out as a union for the same reason
 * that one is: `t` given an arbitrary `string` widens to every value in the
 * locale file, objects included.
 *
 * Insufficient funds has no entry: the amount already on screen is the
 * explanation, and always was.
 */
const MESSAGE_I18N_KEY_BY_REASON = {
  "network-unreachable": "signTransaction.networkUnreachableTooltip",
  "unsaved-changes": "signTransaction.unsavedChangesTooltip",
  "insufficient-funds": undefined,
} as const

/**
 * Whether signing should be held back, why, and what to say about it.
 *
 * Every signer frame shares this, so a new reason not to sign is added in one
 * place and worded once rather than per frame.
 */
export default function useShouldBlockSigning(): {
  shouldBlockSigning: boolean
  blockReason?: SigningBlockReason
  messageI18nKey?: (typeof MESSAGE_I18N_KEY_BY_REASON)[SigningBlockReason]
} {
  const hasInsufficientFunds = useBackgroundSelector(selectHasInsufficientFunds)
  const additionalSigningStatus = useBackgroundSelector(
    selectAdditionalSigningStatus,
  )
  const isNetworkUnreachable = useBackgroundSelector(
    selectIsSigningNetworkUnreachable,
  )

  const blockReason: SigningBlockReason | undefined =
    (isNetworkUnreachable && "network-unreachable") ||
    (additionalSigningStatus === "editing" && "unsaved-changes") ||
    (hasInsufficientFunds && "insufficient-funds") ||
    undefined

  return {
    shouldBlockSigning: blockReason !== undefined,
    blockReason,
    messageI18nKey:
      blockReason === undefined
        ? undefined
        : MESSAGE_I18N_KEY_BY_REASON[blockReason],
  }
}

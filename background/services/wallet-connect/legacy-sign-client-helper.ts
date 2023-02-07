import { IClientMeta, IWalletConnectSession } from "@walletconnect/legacy-types"
import LegacySignClient from "@walletconnect/client"

import { getSdkError } from "@walletconnect/utils"
import { TranslatedRequestParams } from "./types"
import {
  approveEIP155Request,
  rejectEIP155Request,
} from "./eip155-request-utils"

export type LegacyProposal = {
  id: number
  params: [{ chainId: number; peerId: string; peerMeta: IClientMeta }]
}

export type LegacyEventData = {
  id: number
  topic: string
  method: string
  params: unknown[]
}

type SessionProposalListener = (payload: LegacyProposal) => void
type SessionRequestListener = (payload: LegacyEventData) => void

let legacySignClient: LegacySignClient | undefined

/* eslint-disable */
function tempFeatureLog(message?: any, ...optionalParams: any[]): void {
  console.log(`[WalletConnect Demo V1] - ${message || ""}`, optionalParams)
}
/* eslint-enable */

function deleteCachedLegacySession(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem("walletconnect")
}

function getCachedLegacySession(): IWalletConnectSession | null {
  if (typeof window === "undefined") return null

  const local = window.localStorage
    ? window.localStorage.getItem("walletconnect")
    : null

  let session = null
  if (local) {
    session = JSON.parse(local)
  }
  return session
}

export function createLegacySignClient(
  uri?: string,
  sessionProposalListener?: SessionProposalListener,
  sessionRequestListener?: SessionRequestListener
): void {
  // If URI is passed always create a new session,
  // otherwise fall back to cached session if client isn't already instantiated.
  if (uri) {
    deleteCachedLegacySession()
    legacySignClient = new LegacySignClient({ uri })
  } else if (!legacySignClient && getCachedLegacySession()) {
    const session = getCachedLegacySession()
    if (session != null) {
      legacySignClient = new LegacySignClient({ session })
    }
  } else {
    return
  }

  legacySignClient?.on("session_request", (error, payload) => {
    if (error) {
      throw new Error(`legacySignClient > session_request failed: ${error}`)
    }
    tempFeatureLog("LegacySessionProposalModal", { legacyProposal: payload })
    sessionProposalListener?.(payload)
  })

  legacySignClient?.on("connect", () => {
    tempFeatureLog("legacySignClient > connect")
  })

  legacySignClient?.on("error", (error) => {
    throw new Error(`legacySignClient > on error: ${error}`)
  })

  legacySignClient?.on("call_request", (error, payload) => {
    if (error) {
      throw new Error(`legacySignClient > call_request failed: ${error}`)
    }
    // onCallRequest(payload)
    sessionRequestListener?.(payload)
  })

  legacySignClient?.on("disconnect", async () => {
    deleteCachedLegacySession()
  })
}

export function acknowledgeLegacyProposal(
  proposal: LegacyProposal,
  accounts: string[]
): void {
  const { params } = proposal
  const [{ chainId }] = params

  legacySignClient?.approveSession({
    accounts,
    chainId: chainId ?? 1,
  })
}

export function rejectLegacyProposal(): void {
  legacySignClient?.rejectSession(getSdkError("USER_REJECTED_METHODS"))
}

export function processLegacyRequestParams(
  payload: LegacyEventData
): TranslatedRequestParams | undefined {
  // TODO: figure out if this method is needed
  const { method } = payload
  // TODO: handle chain id

  switch (method) {
    case "eth_signTypedData":
    case "personal_sign":
    case "eth_sendTransaction":
    case "eth_signTransaction":
      return payload
    default:
      return undefined
  }
}

export async function postLegacyApprovalResponse(
  event: TranslatedRequestParams,
  payload: string
): Promise<void> {
  const { id } = event
  const { result } = approveEIP155Request(event, payload)
  legacySignClient?.approveRequest({
    id,
    result,
  })
}

export async function postLegacyRejectionResponse(
  event: TranslatedRequestParams
): Promise<void> {
  const { id } = event
  const { error } = rejectEIP155Request(event)
  legacySignClient?.rejectRequest({
    id,
    error,
  })
}

import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import type {
  SparkSendRequest,
  SparkSendResult,
} from "@tallyho/tally-background/services/spark/types"
import { selectCurrentSparkAccount } from "@tallyho/tally-background/redux-slices/selectors"
import type { RootState } from "@tallyho/tally-background/redux-slices"
import {
  estimateSparkLightningFee,
  sendSpark,
  SparkResult,
} from "@tallyho/tally-background/redux-slices/spark"
import {
  sparkAddressNetwork,
  toSparkAddress,
} from "@tallyho/tally-background/lib/spark-address"
import { sparkExplorerTransferURL } from "@tallyho/tally-background/constants/spark"
import {
  useAreInternalSignersUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import SharedLink from "../Shared/SharedLink"
import { formatSats, parseSats, shortenSparkAddress } from "./format"

type Draft =
  | { kind: "spark"; request: SparkSendRequest & { kind: "spark" } }
  | {
      kind: "lightning"
      request: SparkSendRequest & { kind: "lightning" }
      estimatedFeeSats: number
    }

// Pay at most this much over the SDK's fee estimate before failing, so a
// small route change doesn't fail the payment but a large one can't surprise.
const LIGHTNING_FEE_BUFFER_SATS = 10

function looksLikeLightningInvoice(input: string): boolean {
  return /^(lightning:)?ln(bc|tb|bcrt)/i.test(input.trim())
}

/**
 * Send bitcoin from a Spark account to a Spark address or a Lightning
 * invoice. Shows a confirmation step before anything is sent: the Spark SDK
 * has no dry run, so the send in the confirmation step is final.
 */
export default function SparkSendForm(): ReactElement | null {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const dispatch = useBackgroundDispatch()
  const isUnlocked = useAreInternalSignersUnlocked(false)
  const [destination, setDestination] = useState("")
  const [amount, setAmount] = useState("")
  const [draft, setDraft] = useState<Draft | undefined>()
  const [sent, setSent] = useState<SparkSendResult | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const account = useBackgroundSelector(selectCurrentSparkAccount)
  const balance = useBackgroundSelector((state: RootState) =>
    account ? state.spark.balances[account.id] : undefined,
  )

  if (!account) {
    return null
  }

  const networkType = account.network.sparkNetworkType
  const available = balance?.available ?? 0n

  const review = async () => {
    setError(undefined)
    const trimmed = destination.trim()

    if (looksLikeLightningInvoice(trimmed)) {
      const invoice = trimmed.replace(/^lightning:/i, "")
      const amountSats = amount.trim() === "" ? undefined : parseSats(amount)
      if (amount.trim() !== "" && amountSats === undefined) {
        setError(t("invalidAmount"))
        return
      }
      setIsLoading(true)
      const fee = (await dispatch(
        estimateSparkLightningFee({
          accountID: account.id,
          invoice,
          amountSats,
        }),
      )) as unknown as SparkResult<number>
      setIsLoading(false)
      if (!fee.ok) {
        setError(fee.error)
        return
      }
      setDraft({
        kind: "lightning",
        estimatedFeeSats: fee.value,
        request: {
          kind: "lightning",
          accountID: account.id,
          invoice,
          amountSats,
          maxFeeSats: fee.value + LIGHTNING_FEE_BUFFER_SATS,
        },
      })
      return
    }

    const addressNetwork = sparkAddressNetwork(trimmed)
    if (addressNetwork === undefined) {
      setError(t("send.invalidDestination"))
      return
    }
    if (addressNetwork !== networkType) {
      setError(
        t("send.wrongNetwork", { network: addressNetwork.toLowerCase() }),
      )
      return
    }
    const amountSats = parseSats(amount)
    if (amountSats === undefined) {
      setError(t("invalidAmount"))
      return
    }
    if (BigInt(amountSats) > available) {
      setError(t("send.insufficientFunds"))
      return
    }
    setDraft({
      kind: "spark",
      request: {
        kind: "spark",
        accountID: account.id,
        receiverSparkAddress: toSparkAddress(trimmed, networkType),
        amountSats,
      },
    })
  }

  const confirm = async () => {
    if (!draft) {
      return
    }
    setIsLoading(true)
    setError(undefined)
    const result = (await dispatch(
      sendSpark(draft.request),
    )) as unknown as SparkResult<SparkSendResult>
    setIsLoading(false)
    if (result.ok) {
      setSent(result.value)
      setDraft(undefined)
      setDestination("")
      setAmount("")
    } else {
      setError(result.error)
    }
  }

  if (sent) {
    return (
      <div className="send" data-testid="spark-send-result">
        <p className="success">{t("send.sent")}</p>
        {sent.kind === "spark" && (
          <SharedLink
            url={sparkExplorerTransferURL(account.network, sent.id)}
            text={t("viewOnExplorer")}
          />
        )}
        <SharedButton
          type="secondary"
          size="medium"
          onClick={() => setSent(undefined)}
        >
          {t("send.another")}
        </SharedButton>
        <style jsx>{`
          .send {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding-top: 16px;
          }
          .success {
            color: var(--success);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="send">
      {draft ? (
        <div className="confirm" data-testid="spark-send-confirm">
          <h3>{t("send.confirmTitle")}</h3>
          <dl>
            <dt>{t("send.to")}</dt>
            <dd>
              {draft.kind === "spark"
                ? shortenSparkAddress(draft.request.receiverSparkAddress)
                : `${draft.request.invoice.slice(0, 16)}…`}
            </dd>
            {(draft.kind === "spark" ||
              draft.request.amountSats !== undefined) && (
              <>
                <dt>{t("send.amount")}</dt>
                <dd>
                  {formatSats(
                    BigInt(
                      draft.kind === "spark"
                        ? draft.request.amountSats
                        : (draft.request.amountSats ?? 0),
                    ),
                  )}
                </dd>
              </>
            )}
            {draft.kind === "lightning" && (
              <>
                <dt>{t("send.estimatedFee")}</dt>
                <dd>
                  {formatSats(BigInt(draft.estimatedFeeSats))} (
                  {t("send.maxFee")}{" "}
                  {formatSats(BigInt(draft.request.maxFeeSats))})
                </dd>
              </>
            )}
          </dl>
          <p className="warning">{t("send.irreversible")}</p>
          <div className="buttons">
            <SharedButton
              type="secondary"
              size="medium"
              onClick={() => setDraft(undefined)}
              isDisabled={isLoading}
            >
              {t("send.back")}
            </SharedButton>
            <SharedButton
              type="primary"
              size="medium"
              onClick={confirm}
              isLoading={isLoading}
              isDisabled={!isUnlocked}
            >
              {t("send.confirm")}
            </SharedButton>
          </div>
        </div>
      ) : (
        <div className="form">
          {/* SharedInput floats its label against the nearest positioned box. */}
          <div className="input_wrap">
            <SharedInput
              label={t("send.destination")}
              value={destination}
              onChange={(value) => setDestination(value ?? "")}
            />
          </div>
          <div className="input_wrap">
            <SharedInput
              label={
                looksLikeLightningInvoice(destination)
                  ? t("send.amountOptional")
                  : t("amountSats")
              }
              value={amount}
              onChange={(value) => setAmount(value ?? "")}
            />
          </div>
          <p className="hint">
            {t("send.available", { amount: formatSats(available) })}
          </p>
          <SharedButton
            type="primary"
            size="medium"
            onClick={review}
            isLoading={isLoading}
            isDisabled={!isUnlocked || destination.trim() === ""}
          >
            {t("send.review")}
          </SharedButton>
          {!isUnlocked && <p className="hint">{t("unlockToUse")}</p>}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <style jsx>{`
        .send {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-top: 12px;
        }
        .input_wrap {
          position: relative;
          margin-top: 8px;
        }
        .form,
        .confirm {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        h3 {
          margin: 0;
          color: var(--white);
        }
        dl {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 8px 16px;
          margin: 0;
        }
        dt {
          color: var(--green-40);
        }
        dd {
          margin: 0;
          color: var(--white);
          overflow-wrap: anywhere;
        }
        .buttons {
          display: flex;
          justify-content: space-between;
        }
        .hint {
          color: var(--green-40);
          font-size: 14px;
          margin: 0;
        }
        .warning {
          color: var(--attention);
          font-size: 14px;
          margin: 0;
        }
        .error {
          color: var(--error);
          font-size: 14px;
          overflow-wrap: anywhere;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

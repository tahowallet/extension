import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import type { SparkLightningInvoice } from "@tallyho/tally-background/services/spark/types"
import {
  createSparkLightningInvoice,
  getSparkDepositAddress,
  SparkResult,
} from "@tallyho/tally-background/redux-slices/spark"
import { selectCurrentSparkAccount } from "@tallyho/tally-background/redux-slices/selectors"
import {
  useAreInternalSignersUnlocked,
  useBackgroundDispatch,
  useBackgroundSelector,
} from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import { parseSats } from "./format"

type ReceiveMode = "spark" | "lightning" | "bitcoin"

/**
 * Spark's extra ways to receive, for the shared Receive screen: besides the
 * Spark address it shows by default, a Lightning invoice or a reusable
 * bitcoin deposit address. Reports the value to show via `onRequestChange`
 * (undefined for the account address).
 */
export default function SparkReceiveOptions({
  onRequestChange,
}: {
  onRequestChange: (value: string | undefined) => void
}): ReactElement | null {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const dispatch = useBackgroundDispatch()
  const isUnlocked = useAreInternalSignersUnlocked(false)
  const account = useBackgroundSelector(selectCurrentSparkAccount)
  const [mode, setMode] = useState<ReceiveMode>("spark")
  const [invoiceAmount, setInvoiceAmount] = useState("")
  const [hasInvoice, setHasInvoice] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  if (!account) {
    return null
  }

  const select = async (next: ReceiveMode) => {
    setMode(next)
    setError(undefined)
    setHasInvoice(false)
    onRequestChange(undefined)
    if (next !== "bitcoin") {
      return
    }
    setIsLoading(true)
    const result = (await dispatch(
      getSparkDepositAddress(account.id),
    )) as unknown as SparkResult<string>
    setIsLoading(false)
    if (result.ok) {
      onRequestChange(result.value)
    } else {
      setError(result.error)
    }
  }

  const createInvoice = async () => {
    const amountSats = parseSats(invoiceAmount)
    if (amountSats === undefined) {
      setError(t("invalidAmount"))
      return
    }
    setIsLoading(true)
    setError(undefined)
    const result = (await dispatch(
      createSparkLightningInvoice({ accountID: account.id, amountSats }),
    )) as unknown as SparkResult<SparkLightningInvoice>
    setIsLoading(false)
    if (result.ok) {
      setHasInvoice(true)
      onRequestChange(result.value.encodedInvoice)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="options">
      <div className="modes" role="tablist">
        {(["spark", "lightning", "bitcoin"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            className={mode === option ? "selected" : ""}
            disabled={!isUnlocked && option !== "spark"}
            onClick={() => select(option)}
          >
            {t(`receive.${option}`)}
          </button>
        ))}
      </div>
      {mode === "lightning" && !hasInvoice && (
        <div className="form">
          <SharedInput
            label={t("amountSats")}
            value={invoiceAmount}
            onChange={(value) => setInvoiceAmount(value ?? "")}
          />
          <SharedButton
            type="secondary"
            size="medium"
            onClick={createInvoice}
            isLoading={isLoading}
          >
            {t("receive.createInvoice")}
          </SharedButton>
        </div>
      )}
      {mode === "bitcoin" && !isLoading && !error && (
        <p className="hint">{t("receive.depositHint")}</p>
      )}
      {!isUnlocked && <p className="hint">{t("unlockToUse")}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <style jsx>{`
        .options {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          width: 100%;
          padding: 0 24px;
          box-sizing: border-box;
        }
        .modes {
          display: flex;
          gap: 8px;
        }
        .modes button {
          padding: 4px 12px;
          border-radius: 16px;
          color: var(--green-40);
          border: 1px solid var(--green-80);
        }
        .modes button.selected {
          color: var(--trophy-gold);
          border-color: var(--trophy-gold);
        }
        .modes button:disabled {
          opacity: 0.5;
        }
        .form {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .hint {
          color: var(--green-40);
          font-size: 14px;
          text-align: center;
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

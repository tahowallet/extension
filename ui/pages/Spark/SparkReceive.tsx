import React, { ReactElement, useState } from "react"
import { useTranslation } from "react-i18next"
import QRCode from "react-qr-code"
import type {
  SparkAccount,
  SparkLightningInvoice,
} from "@tallyho/tally-background/services/spark/types"
import {
  createSparkLightningInvoice,
  getSparkDepositAddress,
  SparkResult,
} from "@tallyho/tally-background/redux-slices/spark"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import {
  useAreInternalSignersUnlocked,
  useBackgroundDispatch,
} from "../../hooks"
import SharedButton from "../../components/Shared/SharedButton"
import SharedInput from "../../components/Shared/SharedInput"
import { parseSats } from "../../components/Spark/format"

type ReceiveMode = "spark" | "lightning" | "bitcoin"

function CopyableCode({
  value,
  testID,
}: {
  value: string
  testID: string
}): ReactElement {
  const dispatch = useBackgroundDispatch()
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  return (
    <div className="code">
      <div className="qr">
        <QRCode
          value={
            value.toUpperCase().startsWith("LN") ? value.toUpperCase() : value
          }
          size={160}
        />
      </div>
      <code data-testid={testID}>{value}</code>
      <SharedButton
        type="secondary"
        size="small"
        iconSmall="copy"
        onClick={() => {
          navigator.clipboard.writeText(value)
          dispatch(setSnackbarMessage(t("copied")))
        }}
      >
        {t("copy")}
      </SharedButton>
      <style jsx>{`
        .code {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .qr {
          background: #fff;
          padding: 8px;
          border-radius: 8px;
        }
        code {
          max-width: 100%;
          overflow-wrap: anywhere;
          font-size: 12px;
          color: var(--green-20);
          text-align: center;
        }
      `}</style>
    </div>
  )
}

/**
 * Receive on Spark (Spark address), over Lightning (BOLT11 invoice), or from
 * the Bitcoin main chain (reusable deposit address).
 */
export default function SparkReceive({
  account,
}: {
  account: SparkAccount
}): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "spark" })
  const dispatch = useBackgroundDispatch()
  const isUnlocked = useAreInternalSignersUnlocked(false)
  const [mode, setMode] = useState<ReceiveMode>("spark")
  const [depositAddress, setDepositAddress] = useState<string | undefined>()
  const [invoiceAmount, setInvoiceAmount] = useState("")
  const [invoice, setInvoice] = useState<SparkLightningInvoice | undefined>()
  const [error, setError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  const loadDepositAddress = async () => {
    setIsLoading(true)
    setError(undefined)
    const result = (await dispatch(
      getSparkDepositAddress(account.id),
    )) as unknown as SparkResult<string>
    setIsLoading(false)
    if (result.ok) {
      setDepositAddress(result.value)
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
      setInvoice(result.value)
    } else {
      setError(result.error)
    }
  }

  return (
    <div className="receive">
      <div className="modes" role="tablist">
        {(["spark", "lightning", "bitcoin"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            className={mode === option ? "selected" : ""}
            onClick={() => {
              setMode(option)
              setError(undefined)
            }}
          >
            {t(`receive.${option}`)}
          </button>
        ))}
      </div>

      {mode === "spark" && (
        <CopyableCode value={account.address} testID="spark-receive-address" />
      )}

      {mode === "lightning" &&
        (invoice ? (
          <>
            <CopyableCode
              value={invoice.encodedInvoice}
              testID="spark-lightning-invoice"
            />
            <SharedButton
              type="tertiary"
              size="small"
              onClick={() => setInvoice(undefined)}
            >
              {t("receive.newInvoice")}
            </SharedButton>
          </>
        ) : (
          <div className="form">
            <SharedInput
              label={t("amountSats")}
              value={invoiceAmount}
              onChange={(value) => setInvoiceAmount(value ?? "")}
            />
            <SharedButton
              type="primary"
              size="medium"
              onClick={createInvoice}
              isLoading={isLoading}
              isDisabled={!isUnlocked}
            >
              {t("receive.createInvoice")}
            </SharedButton>
          </div>
        ))}

      {mode === "bitcoin" &&
        (depositAddress ? (
          <>
            <CopyableCode
              value={depositAddress}
              testID="spark-deposit-address"
            />
            <p className="hint">{t("receive.depositHint")}</p>
          </>
        ) : (
          <SharedButton
            type="primary"
            size="medium"
            onClick={loadDepositAddress}
            isLoading={isLoading}
            isDisabled={!isUnlocked}
          >
            {t("receive.showDepositAddress")}
          </SharedButton>
        ))}

      {!isUnlocked && mode !== "spark" && (
        <p className="hint">{t("unlockToUse")}</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <style jsx>{`
        .receive {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding-top: 12px;
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
        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
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

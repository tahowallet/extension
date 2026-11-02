import React, { ReactElement } from "react"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { selectAccountTotalsForOverview } from "@tallyho/tally-background/redux-slices/selectors"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedAvatar from "../../components/Shared/SharedAvatar"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import FullTabNetworkSection from "../../components/FullTab/FullTabNetworkSection"
import FullTabSection from "../../components/FullTab/FullTabSection"
import {
  useAccountNetworks,
  useFullTabAccount,
} from "../../components/FullTab/hooks"

const formatTotal = (total: number) =>
  total.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

/**
 * The full-tab page for a single account. It shows the account's name,
 * address and total balance, followed by one of three views: its assets on
 * each network it's tracked on, its activity, or its NFTs.
 */
export default function FullTabAccount(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "fullTab.account" })
  const { address } = useParams<{ address: string }>()
  const dispatch = useBackgroundDispatch()
  const copyAddress = () => {
    void navigator.clipboard.writeText(address)
    void dispatch(setSnackbarMessage(t("addressCopied")))
  }
  const account = useFullTabAccount(address)
  const networks = useAccountNetworks(address)
  const overviewTotals = useBackgroundSelector(selectAccountTotalsForOverview)

  const totals = overviewTotals[normalizeEVMAddress(address)]?.totals ?? {}
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0)

  return (
    <FullTabSection
      eyebrow={t("eyebrow")}
      title={
        <div className="account_title">
          <SharedAvatar
            width="48px"
            avatarURL={account?.avatarURL}
            backupAvatar="./images/avatar@2x.png"
          />
          <div className="account_names">
            <span className="name">
              {account?.name ?? account?.shortenedAddress ?? address}
            </span>
            <button
              type="button"
              className="full_address"
              onClick={copyAddress}
            >
              {address}
              <span className="copy_icon" aria-hidden />
            </button>
          </div>
        </div>
      }
      aside={
        <div className="total">
          <span className="total_label">{t("totalBalance")}</span>
          <span className="total_value">${formatTotal(total)}</span>
        </div>
      }
    >
      <div className="networks">
        {networks.map((network) => (
          <FullTabNetworkSection
            key={network.chainID}
            address={address}
            network={network}
          />
        ))}
      </div>
      <style jsx>{`
        .account_title {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .account_names {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .name {
          font-size: 28px;
          line-height: 36px;
          color: var(--text-strong);
        }
        .full_address {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--green-40);
          font-size: 14px;
          font-variant-numeric: tabular-nums;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .full_address:hover {
          color: var(--gold-80);
        }
        .copy_icon {
          width: 16px;
          height: 16px;
          mask-image: url("./images/icons/s/copy.svg");
          mask-size: cover;
          background-color: currentColor;
        }
        .total {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .total_label {
          color: var(--green-40);
          font-size: 14px;
        }
        .total_value {
          color: var(--text-strong);
          font-size: 32px;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        .networks {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }
      `}</style>
    </FullTabSection>
  )
}

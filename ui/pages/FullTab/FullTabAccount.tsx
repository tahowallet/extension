import React, { ReactElement, useRef } from "react"
import { useHistory, useParams } from "react-router-dom"
import { CSSTransition, SwitchTransition } from "react-transition-group"
import { useTranslation } from "react-i18next"
import { selectAccountTotalsForOverview } from "@tallyho/tally-background/redux-slices/selectors"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedAvatar from "../../components/Shared/SharedAvatar"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import FullTabNetworkSection from "../../components/FullTab/FullTabNetworkSection"
import FullTabSection from "../../components/FullTab/FullTabSection"
import FullTabValueChart from "../../components/FullTab/FullTabValueChart"
import SharedPanelSwitcher from "../../components/Shared/SharedPanelSwitcher"
import FullTabAccountNetworkPanel from "../../components/FullTab/FullTabAccountNetworkPanel"
import {
  accountPath,
  useAccountNetworks,
  useFullTabAccount,
} from "../../components/FullTab/hooks"

type AccountView = "assets" | "nfts" | "activity"

const ACCOUNT_VIEWS = [
  { value: "assets", label: "assets" },
  { value: "nfts", label: "NFTs" },
  { value: "activity", label: "activity" },
] as const satisfies readonly { value: AccountView; label: string }[]

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
  const { t } = useTranslation()
  const { t: tWallet } = useTranslation("translation", {
    keyPrefix: "wallet.pages",
  })
  const history = useHistory()
  const { address, view = "assets" } = useParams<{
    address: string
    view?: AccountView
  }>()
  const viewRef = useRef<HTMLDivElement>(null)
  const dispatch = useBackgroundDispatch()
  const copyAddress = () => {
    void navigator.clipboard.writeText(address)
    void dispatch(setSnackbarMessage(t("topMenu.addressCopiedMsg")))
  }
  const account = useFullTabAccount(address)
  const networks = useAccountNetworks(address)
  const overviewTotals = useBackgroundSelector(selectAccountTotalsForOverview)

  const totals = overviewTotals[normalizeEVMAddress(address)]?.totals ?? {}
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0)

  return (
    <FullTabSection
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
          <span className="total_label">{t("wallet.totalAccountBalance")}</span>
          <span className="total_value">${formatTotal(total)}</span>
        </div>
      }
    >
      <FullTabValueChart
        addresses={[address]}
        label={t("wallet.totalAccountBalance")}
        currentValue={total}
      />
      <div className="views">
        <SharedPanelSwitcher
          panelId="account_views"
          panelNames={ACCOUNT_VIEWS.map(({ label }) => tWallet(label))}
          panelNumber={ACCOUNT_VIEWS.findIndex(({ value }) => value === view)}
          setPanelNumber={(index) => {
            const newView = ACCOUNT_VIEWS[index].value
            history.replace(
              newView === "assets"
                ? accountPath(address)
                : `${accountPath(address)}/${newView}`,
            )
          }}
        />
        <SwitchTransition>
          <CSSTransition
            key={view}
            nodeRef={viewRef}
            timeout={200}
            classNames="view_fade"
          >
            <div ref={viewRef}>
              {view === "assets" ? (
                <div className="networks">
                  {networks.map((network) => (
                    <FullTabNetworkSection
                      key={network.chainID}
                      address={address}
                      network={network}
                    />
                  ))}
                </div>
              ) : (
                <FullTabAccountNetworkPanel address={address} kind={view} />
              )}
            </div>
          </CSSTransition>
        </SwitchTransition>
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
        .views {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .view_fade-enter {
          opacity: 0;
          transform: translateY(6px);
        }
        .view_fade-enter-active {
          opacity: 1;
          transform: none;
          transition:
            opacity 0.2s ease,
            transform 0.2s ease;
        }
        .view_fade-exit {
          opacity: 1;
        }
        .view_fade-exit-active {
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .view_fade-enter,
          .view_fade-enter-active,
          .view_fade-exit-active {
            transform: none;
            transition: none;
          }
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

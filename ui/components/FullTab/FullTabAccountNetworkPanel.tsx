import React, { ReactElement, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  selectCurrentAccount,
  selectCurrentAccountActivities,
} from "@tallyho/tally-background/redux-slices/selectors"
import { setNewSelectedAccount } from "@tallyho/tally-background/redux-slices/ui"
import { NETWORKS_SUPPORTING_NFTS } from "@tallyho/tally-background/nfts"
import { sameEVMAddress } from "@tallyho/tally-background/lib/utils"
import { sameNetwork } from "@tallyho/tally-background/networks"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import WalletActivityList from "../Wallet/WalletActivityList"
import NFTListCurrentWallet from "../NFTs/NFTListCurrentWallet"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import { useAccountNetworks } from "./hooks"

type Props = {
  address: string
  kind: "activity" | "nfts"
}

function ActivityForCurrentAccount(): ReactElement {
  const activities = useBackgroundSelector(selectCurrentAccountActivities)
  return <WalletActivityList activities={activities ?? []} />
}

/**
 * An account's activity or NFTs on one network at a time. The popup's
 * components for these act on the selected account, so picking a network
 * here selects the account on it.
 */
export default function FullTabAccountNetworkPanel({
  address,
  kind,
}: Props): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const currentAccount = useBackgroundSelector(selectCurrentAccount)
  const accountNetworks = useAccountNetworks(address)
  const networks =
    kind === "nfts"
      ? accountNetworks.filter(({ chainID }) =>
          NETWORKS_SUPPORTING_NFTS.has(chainID),
        )
      : accountNetworks

  const isCurrentAccount = sameEVMAddress(currentAccount.address, address)
  const currentNetwork = networks.find((network) =>
    sameNetwork(network, currentAccount.network),
  )
  const isSelected = isCurrentAccount && currentNetwork !== undefined

  useEffect(() => {
    if (!isSelected && networks.length > 0) {
      void dispatch(setNewSelectedAccount({ address, network: networks[0] }))
    }
  }, [address, dispatch, isSelected, networks])

  return (
    <div className="panel">
      <div
        className="networks"
        role="radiogroup"
        aria-label={t("fullTab.account.network")}
      >
        {networks.map((network) => {
          const checked =
            isSelected && sameNetwork(network, currentAccount.network)
          return (
            <button
              key={network.chainID}
              type="button"
              role="radio"
              aria-checked={checked}
              className={checked ? "chip checked" : "chip"}
              onClick={() =>
                dispatch(setNewSelectedAccount({ address, network }))
              }
            >
              <SharedNetworkIcon network={network} size={18} />
              {network.name}
            </button>
          )
        })}
      </div>
      <div className="card">
        {!isSelected ? (
          <div className="loading">
            <SharedLoadingSpinner />
          </div>
        ) : kind === "activity" ? (
          <ActivityForCurrentAccount />
        ) : (
          <NFTListCurrentWallet />
        )}
      </div>
      <style jsx>{`
        .panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .networks {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 32px;
          padding: 0 14px 0 8px;
          border-radius: 16px;
          border: 1px solid var(--green-80);
          color: var(--green-40);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            color 0.2s ease,
            background-color 0.2s ease;
        }
        .chip:hover {
          color: var(--green-20);
          border-color: var(--green-60);
        }
        .chip.checked {
          color: var(--text-strong);
          border-color: var(--trophy-gold);
          background: var(--green-95);
        }
        .card {
          position: relative;
          max-width: 720px;
          min-height: 400px;
          max-height: 640px;
          overflow-y: auto;
          padding: 16px;
          box-sizing: border-box;
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          /* The transform makes the card the containing block for fixed
             elements, which keeps the popup components' slide-up menus
             within the card. */
          transform: translateZ(0);
        }
        .loading {
          display: flex;
          justify-content: center;
          padding: 40px;
        }
      `}</style>
    </div>
  )
}

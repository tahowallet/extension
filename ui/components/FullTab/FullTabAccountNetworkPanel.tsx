import React, { ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { NETWORKS_SUPPORTING_NFTS } from "@tallyho/tally-background/nfts"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { BOAR_SUPPORTED_CHAIN_IDS } from "@tallyho/tally-background/constants"
import { useBackgroundSelector, useNFTsReload } from "../../hooks"
import NFTList from "../NFTs/NFTList"
import NFTsExploreBanner from "../NFTs/NFTsExploreBanner"
import FullTabActivityTable, {
  NetworkActivity,
  mergeNetworkActivity,
} from "./FullTabActivityTable"
import FullTabNetworkFilter, {
  NetworkFilterOption,
} from "./FullTabNetworkFilter"
import { useAccountNetworks } from "./hooks"

type Props = {
  address: string
  kind: "activity" | "nfts"
}

/**
 * Tracks which of the given network options are currently shown, returning
 * the set of shown chain IDs and a setter for it. All networks are shown by
 * default.
 *
 * Note that the hook tracks hidden networks rather than shown ones, so that a
 * network the account newly appears on starts out shown.
 */
function useNetworkSelection(options: NetworkFilterOption[]) {
  const chainIDs = options.map(({ network }) => network.chainID).join(",")
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const selected = useMemo(
    () =>
      new Set(
        chainIDs
          .split(",")
          .filter((chainID) => chainID !== "" && !hidden.has(chainID)),
      ),
    [chainIDs, hidden],
  )
  const setSelected = (next: Set<string>) =>
    setHidden(
      new Set(chainIDs.split(",").filter((chainID) => !next.has(chainID))),
    )

  return [selected, setSelected] as const
}

/**
 * Shows an account's activity across all of its networks, newest first, with
 * a filter to narrow it down by network.
 */
function AccountActivity({ address }: { address: string }): ReactElement {
  const { t } = useTranslation()
  const networks = useAccountNetworks(address)
  const activitiesByNetwork = useBackgroundSelector(
    (state) => state.activities.activities[normalizeEVMAddress(address)],
  )

  const byNetwork = useMemo(
    () =>
      networks.map((network) => ({
        network,
        entries: (activitiesByNetwork?.[network.chainID] ?? []).map(
          (activity): NetworkActivity => ({ activity, network, address }),
        ),
      })),
    [activitiesByNetwork, address, networks],
  )

  const options = byNetwork.map(({ network, entries }) => ({
    network,
    count: entries.length,
  }))
  const [selected, setSelected] = useNetworkSelection(options)

  const entries = useMemo(
    () =>
      mergeNetworkActivity(
        byNetwork
          .filter(({ network }) => selected.has(network.chainID))
          .map(({ entries: networkEntries }) => networkEntries),
      ),
    [byNetwork, selected],
  )

  const indexesHistory = networks.some(({ chainID }) =>
    BOAR_SUPPORTED_CHAIN_IDS.has(chainID),
  )

  return (
    <div className="panel">
      <FullTabNetworkFilter
        options={options}
        selected={selected}
        onChange={setSelected}
      />
      <div className="card">
        <FullTabActivityTable
          entries={entries}
          showNetwork={selected.size !== 1}
          emptyMessage={
            indexesHistory
              ? t("wallet.activities.historicalActivityExplainer")
              : t("wallet.activities.defaultHistoricalActivityExplainer")
          }
        />
      </div>
      <style jsx>{`
        .panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .card {
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}

/**
 * Shows an account's NFTs across the networks that support NFTs, with a
 * filter to narrow them down by network. If the account holds no NFTs, shows
 * the NFT explore banner instead.
 */
function AccountNFTs({ address }: { address: string }): ReactElement {
  const accountNetworks = useAccountNetworks(address)
  const networks = useMemo(
    () =>
      accountNetworks.filter(({ chainID }) =>
        NETWORKS_SUPPORTING_NFTS.has(chainID),
      ),
    [accountNetworks],
  )
  const nfts = useBackgroundSelector((state) => state.nfts.nfts)
  const isLoading = useBackgroundSelector((state) => state.nfts.isReloading)
  const normalizedAddress = normalizeEVMAddress(address)

  useNFTsReload()

  const byNetwork = useMemo(
    () =>
      networks.map((network) => {
        const collections = Object.values(
          nfts[network.chainID]?.[normalizedAddress] ?? {},
        )
        return {
          network,
          collections,
          count: collections.reduce(
            (sum, { nfts: collectionNFTs }) => sum + collectionNFTs.length,
            0,
          ),
        }
      }),
    [networks, nfts, normalizedAddress],
  )

  const options = byNetwork.map(({ network, count }) => ({ network, count }))
  const [selected, setSelected] = useNetworkSelection(options)

  const collections = byNetwork
    .filter(({ network }) => selected.has(network.chainID))
    .flatMap(({ collections: networkCollections }) => networkCollections)
  const total = byNetwork.reduce((sum, { count }) => sum + count, 0)

  return (
    <div className="panel">
      <FullTabNetworkFilter
        options={options}
        selected={selected}
        onChange={setSelected}
      />
      <div className="card">
        {total === 0 && !isLoading ? (
          <NFTsExploreBanner type="nfts" />
        ) : (
          <NFTList collections={collections} />
        )}
      </div>
      <style jsx>{`
        .panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .card {
          position: relative;
          padding: 16px;
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          /* The transform makes the card the containing block for fixed
             elements, which keeps the popup components' slide-up menus
             within the card. */
          transform: translateZ(0);
        }
      `}</style>
    </div>
  )
}

/**
 * Shows an account's activity or NFTs, depending on `kind`, with a filter to
 * narrow them down by network.
 */
export default function FullTabAccountNetworkPanel({
  address,
  kind,
}: Props): ReactElement {
  // Keying by address remounts the panel when the account changes, so each
  // account starts out with every network shown.
  return kind === "activity" ? (
    <AccountActivity key={address} address={address} />
  ) : (
    <AccountNFTs key={address} address={address} />
  )
}

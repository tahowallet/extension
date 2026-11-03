import React, { ReactElement, useCallback, useMemo, useState } from "react"
import { Link, Redirect, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  makeSelectAccountBalancesOnNetwork,
  selectAccountSignersByAddress,
} from "@tallyho/tally-background/redux-slices/selectors"
import { selectEVMNetworks } from "@tallyho/tally-background/redux-slices/selectors/networks"
import {
  getFullAssetID,
  isNetworkBaseAsset,
  isTrustedAsset,
  isVerifiedAsset,
} from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { isSmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import {
  normalizeEVMAddress,
  sameEVMAddress,
} from "@tallyho/tally-background/lib/utils"
import { networkSupportsSwaps } from "@tallyho/tally-background/lib/0x-swap"
import {
  selectInitializationTimeExpired,
  setNewSelectedAccount,
} from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import FullTabSection from "../../components/FullTab/FullTabSection"
import FullTabValueChart from "../../components/FullTab/FullTabValueChart"
import FullTabDialog from "../../components/FullTab/FullTabDialog"
import FullTabActivityTable from "../../components/FullTab/FullTabActivityTable"
import {
  accountPath,
  BASE_ASSET_ID,
  useFullTabAccount,
  useOpenPageAs,
} from "../../components/FullTab/hooks"
import SharedAssetIcon from "../../components/Shared/SharedAssetIcon"
import SharedNetworkIcon from "../../components/Shared/SharedNetworkIcon"
import SharedButton from "../../components/Shared/SharedButton"
import SharedLoadingSpinner from "../../components/Shared/SharedLoadingSpinner"
import AssetVerifyToggler from "../../components/Wallet/UnverifiedAsset/AssetVerifyToggler"
import AssetWarning from "../../components/Wallet/UnverifiedAsset/AssetWarning"
import { displayAssetAmount } from "../../utils/amounts"
import { activityInvolvesAsset } from "../../utils/activities"
import { getBlockExplorerURL } from "../../utils/networks"
import { blockExplorer } from "../../utils/constants"

function Stat({
  label,
  value,
  title,
}: {
  label: string
  value: React.ReactNode
  title?: string
}): ReactElement {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <span className="value" title={title}>
        {value}
      </span>
      <style jsx>{`
        .stat {
          flex: 1;
          min-width: 160px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 16px 20px;
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
        }
        .label {
          color: var(--green-40);
          font-size: 14px;
        }
        .value {
          color: var(--text-strong);
          font-size: 24px;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  )
}

/**
 * The full-tab page for an asset that an account holds on a network. It shows
 * the account's balance of the asset, its value and unit price, the actions
 * available for it, and the account's activity involving the asset.
 *
 * If the network is unknown, or the account turns out not to hold the asset,
 * the page redirects back to the account's page.
 */
export default function FullTabAsset(): ReactElement {
  const { t } = useTranslation()
  const dispatch = useBackgroundDispatch()
  const openPageAs = useOpenPageAs()
  const { address, chainID, assetID } = useParams<{
    address: string
    chainID: string
    assetID: string
  }>()
  const account = useFullTabAccount(address)
  const networks = useBackgroundSelector(selectEVMNetworks)
  const network = networks.find((candidate) => candidate.chainID === chainID)
  const signer = useBackgroundSelector(
    (state) =>
      selectAccountSignersByAddress(state)[normalizeEVMAddress(address)],
  )

  const selectBalances = useMemo(
    () =>
      network ? makeSelectAccountBalancesOnNetwork({ address, network }) : null,
    [address, network],
  )
  const balances = useBackgroundSelector((state) =>
    selectBalances ? selectBalances(state) : undefined,
  )
  const isLoaded = balances !== undefined && balances !== "loading"
  // Right after the wallet starts, balances can load before the assets they
  // refer to, so an asset is only treated as missing once the initialization
  // time has expired.
  const initializationTimeExpired = useBackgroundSelector(
    selectInitializationTimeExpired,
  )

  const assetAmount = useMemo(() => {
    if (!isLoaded) return undefined
    return [...balances.assetAmounts, ...balances.unverifiedAssetAmounts].find(
      ({ asset }) =>
        assetID === BASE_ASSET_ID
          ? isNetworkBaseAsset(asset)
          : isSmartContractFungibleAsset(asset) &&
            sameEVMAddress(asset.contractAddress, assetID),
    )
  }, [assetID, balances, isLoaded])

  const asset = assetAmount?.asset
  const contractAddress =
    asset && isSmartContractFungibleAsset(asset)
      ? asset.contractAddress
      : undefined

  const activitiesOnNetwork = useBackgroundSelector(
    (state) =>
      state.activities.activities[normalizeEVMAddress(address)]?.[chainID],
  )
  const entries = useMemo(
    () =>
      network && asset
        ? (activitiesOnNetwork ?? [])
            .filter((activity) =>
              activityInvolvesAsset(activity, asset.symbol, contractAddress),
            )
            .map((activity) => ({ activity, network, address }))
        : [],
    [activitiesOnNetwork, address, asset, contractAddress, network],
  )

  const [reviewing, setReviewing] = useState(false)
  const closeReview = useCallback(() => setReviewing(false), [])

  // If the network is unknown, or the asset is gone (for example because it
  // was hidden) or never existed, redirect back to the account's page.
  if (!network || (isLoaded && initializationTimeExpired && !assetAmount)) {
    return <Redirect to={accountPath(address)} />
  }

  if (!asset || !assetAmount) {
    return (
      <div className="loading">
        <SharedLoadingSpinner />
        <style jsx>{`
          .loading {
            display: flex;
            justify-content: center;
            padding: 80px;
          }
        `}</style>
      </div>
    )
  }

  const isTrusted = isTrustedAsset(asset)
  const isVerified = isVerifiedAsset(asset)
  const isReadOnly = signer?.type === "read-only"
  const amount = displayAssetAmount(assetAmount)
  const explorerURL = getBlockExplorerURL(network)
  const supportsSwaps = networkSupportsSwaps(network.chainID)

  const review = async () => {
    await dispatch(setNewSelectedAccount({ address, network }))
    setReviewing(true)
  }

  return (
    <FullTabSection
      eyebrow={
        <Link className="back" to={accountPath(address)}>
          ← {account?.name ?? account?.shortenedAddress ?? address}
        </Link>
      }
      title={
        <div className="title">
          <span className="asset_icon">
            <SharedAssetIcon
              size={48}
              logoURL={asset.metadata?.logoURL}
              symbol={asset.symbol}
              untrusted={!isTrusted}
            />
            <span className="network_badge" title={network.name}>
              <SharedNetworkIcon network={network} size={20} />
            </span>
          </span>
          <div className="names">
            <h1 title={asset.symbol}>{asset.symbol}</h1>
            <span className="subtitle">
              {asset.name} · {network.name}
              {contractAddress && explorerURL && (
                <a
                  className="explorer"
                  href={`${explorerURL}/token/${contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {blockExplorer[network.chainID]
                    ? t("assets.viewAsset", {
                        siteTitle: blockExplorer[network.chainID].title,
                      })
                    : t("assets.openNetworkExplorer")}
                  <span className="new_tab" aria-hidden />
                </a>
              )}
            </span>
          </div>
        </div>
      }
      aside={
        <div className="actions">
          {isVerified && isSmartContractFungibleAsset(asset) && (
            <AssetVerifyToggler
              text={t("assets.verifiedByUser")}
              icon="notif-correct"
              color="var(--green-20)"
              hoverColor="var(--white)"
              onClick={() => {
                void review()
              }}
            />
          )}
          {!isTrusted && isSmartContractFungibleAsset(asset) && (
            <SharedButton
              type="primary"
              size="medium"
              onClick={() => {
                void review()
              }}
            >
              {t("assets.verifyAsset")}
            </SharedButton>
          )}
          {isTrusted && !isReadOnly && (
            <>
              <SharedButton
                type="primary"
                size="medium"
                iconSmall="send"
                onClick={() => {
                  void openPageAs({ address, network }, "/send", asset)
                }}
              >
                {t("shared.send")}
              </SharedButton>
              <SharedButton
                type="primary"
                size="medium"
                iconSmall="swap"
                isDisabled={!supportsSwaps}
                onClick={() => {
                  void openPageAs({ address, network }, "/swap", {
                    symbol: asset.symbol,
                    contractAddress,
                  })
                }}
              >
                {t("shared.swap")}
              </SharedButton>
            </>
          )}
        </div>
      }
    >
      {isTrusted && (
        <FullTabValueChart
          addresses={[address]}
          chainIDs={[network.chainID]}
          assetID={getFullAssetID(asset)}
          label={`${asset.symbol} · ${t("fullTab.table.value")}`}
        />
      )}
      <div className="stats">
        <Stat
          label={t("overview.tableHeader.balance")}
          value={`${amount.text} ${asset.symbol}`}
          title={amount.title}
        />
        {isTrusted && (
          <>
            <Stat
              label={t("fullTab.table.value")}
              value={
                assetAmount.localizedMainCurrencyAmount !== undefined
                  ? `$${assetAmount.localizedMainCurrencyAmount}`
                  : "—"
              }
            />
            <Stat
              label={t("overview.tableHeader.price")}
              value={
                assetAmount.localizedUnitPrice !== undefined
                  ? `$${assetAmount.localizedUnitPrice}`
                  : "—"
              }
            />
          </>
        )}
      </div>
      <section className="activity">
        <h2>{t("wallet.pages.activity")}</h2>
        <div className="card">
          <FullTabActivityTable
            entries={entries}
            showNetwork={false}
            emptyMessage={t(
              "wallet.activities.defaultHistoricalActivityExplainer",
            )}
          />
        </div>
      </section>
      <FullTabDialog
        isOpen={reviewing}
        onClose={closeReview}
        label={t("assets.verifyAsset")}
      >
        {reviewing && isSmartContractFungibleAsset(asset) && (
          <AssetWarning
            asset={asset}
            close={closeReview}
            openActivityDetails={() => undefined}
          />
        )}
      </FullTabDialog>
      <style jsx>{`
        .title {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .asset_icon {
          position: relative;
          display: inline-flex;
        }
        .network_badge {
          position: absolute;
          right: -4px;
          bottom: -4px;
          display: inline-flex;
          border-radius: 50%;
          box-shadow: 0 0 0 2px var(--hunter-green);
        }
        .names {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        h1 {
          margin: 0;
          font-family: "Quincy CF", serif;
          font-size: 36px;
          line-height: 44px;
          font-weight: 500;
          color: var(--text-strong);
          max-width: 480px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .subtitle {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--green-40);
          font-size: 15px;
        }
        .explorer {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--green-40);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .explorer:hover {
          color: var(--trophy-gold);
        }
        .new_tab {
          width: 14px;
          height: 14px;
          mask-image: url("./images/icons/s/new-tab.svg");
          mask-size: cover;
          background: currentColor;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .stats {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        .activity {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
          color: var(--text-strong);
        }
        .card {
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          overflow: hidden;
        }
        .title :global(.back),
        :global(.back) {
          color: var(--green-40);
          text-decoration: none;
          text-transform: none;
          letter-spacing: 0;
          font-size: 16px;
          transition: color 0.2s ease;
        }
        :global(.back:hover) {
          color: var(--trophy-gold);
        }
      `}</style>
    </FullTabSection>
  )
}

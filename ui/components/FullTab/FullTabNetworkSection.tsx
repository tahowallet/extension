import React, { ReactElement, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link, useHistory } from "react-router-dom"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { makeSelectAccountBalancesOnNetwork } from "@tallyho/tally-background/redux-slices/selectors"
import { selectInitializationTimeExpired } from "@tallyho/tally-background/redux-slices/ui"
import { isNetworkBaseAsset } from "@tallyho/tally-background/redux-slices/utils/asset-utils"
import { isSmartContractFungibleAsset } from "@tallyho/tally-background/assets"
import { useBackgroundSelector } from "../../hooks"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import SharedLoadingSpinner from "../Shared/SharedLoadingSpinner"
import FullTabAssetTable from "./FullTabAssetTable"
import AssetListItemActions from "../Wallet/AssetListItem/AssetListItemActions"
import { accountPath, assetPath, useOpenPageAs } from "./hooks"

type Props = {
  address: string
  network: EVMNetwork
}

/**
 * Renders one network's section of an account's page. The header shows the
 * network and the account's total value on it, along with a link to the
 * account's unverified assets on the network (if it has any) and a button to
 * add a custom asset. Below the header is a table of the account's assets on
 * the network.
 */
export default function FullTabNetworkSection({
  address,
  network,
}: Props): ReactElement {
  const { t } = useTranslation()
  const openPageAs = useOpenPageAs()
  const history = useHistory()
  const initializationLoadingTimeExpired = useBackgroundSelector(
    selectInitializationTimeExpired,
  )

  const selectBalances = useMemo(
    () => makeSelectAccountBalancesOnNetwork({ address, network }),
    [address, network],
  )
  const balances = useBackgroundSelector(selectBalances)
  const isLoading = balances === "loading" || balances === undefined

  const unverifiedCount = isLoading ? 0 : balances.unverifiedAssetAmounts.length

  return (
    <section className="network_section">
      <header>
        <div className="network_title">
          <SharedNetworkIcon network={network} size={28} hasBackground />
          <h2>{network.name}</h2>
          <span className="network_total">
            {!isLoading && balances.totalMainCurrencyValue !== undefined
              ? `$${balances.totalMainCurrencyValue}`
              : null}
          </span>
        </div>
        <div className="network_links">
          {unverifiedCount > 0 && (
            <Link
              className="pill attention"
              to={`${accountPath(address)}/${network.chainID}/unverified`}
            >
              {t("wallet.unverifiedAssets.hiddenAssets", {
                stateOfHiddenAssets: t(
                  "wallet.unverifiedAssets.stateOfHiddenAssets2",
                ),
                amount: unverifiedCount,
              })}
            </Link>
          )}
          <button
            type="button"
            className="pill"
            onClick={() =>
              openPageAs({ address, network }, "/settings/add-custom-asset")
            }
          >
            {t("settings.addCustomAsset")}
          </button>
        </div>
      </header>
      <div className="table_card">
        {isLoading ? (
          <div className="loading">
            <SharedLoadingSpinner size="small" />
          </div>
        ) : (
          <FullTabAssetTable
            assetAmounts={balances.assetAmounts}
            initializationLoadingTimeExpired={initializationLoadingTimeExpired}
            onRowClick={({ asset }) =>
              history.push(assetPath(address, network.chainID, asset))
            }
            renderActions={({ asset }) =>
              isSmartContractFungibleAsset(asset) ||
              isNetworkBaseAsset(asset) ? (
                <AssetListItemActions
                  asset={asset}
                  network={network}
                  onNavigate={(pathname, state) =>
                    openPageAs({ address, network }, pathname, state)
                  }
                />
              ) : null
            }
          />
        )}
      </div>
      <style jsx>{`
        .network_section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .network_title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 500;
          color: var(--text-strong);
        }
        .network_total {
          color: var(--green-40);
          font-size: 16px;
          font-variant-numeric: tabular-nums;
        }
        .network_links {
          display: flex;
          gap: 8px;
        }
        .network_links :global(.pill),
        .pill {
          display: inline-flex;
          align-items: center;
          height: 28px;
          padding: 0 12px;
          border-radius: 14px;
          border: 1px solid var(--green-80);
          color: var(--green-20);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          background: transparent;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            color 0.2s ease,
            background-color 0.2s ease;
        }
        .network_links :global(.pill:hover),
        .pill:hover {
          border-color: var(--trophy-gold);
          color: var(--trophy-gold);
        }
        .network_links :global(.pill.attention) {
          border-color: var(--attention-20);
          color: var(--attention);
        }
        .network_links :global(.pill.attention:hover) {
          background-color: var(--attention-20);
        }
        .table_card {
          background: var(--green-120);
          border: 1px solid var(--green-95);
          border-radius: 12px;
          overflow: hidden;
        }
        .loading {
          padding: 24px;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </section>
  )
}

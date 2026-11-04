import React, { ReactElement, useMemo } from "react"
import { NavLink } from "react-router-dom"
import {
  AccountTotal,
  selectAccountTotalsForOverview,
  selectCurrentNetworkAccountTotalsByCategory,
} from "@tallyho/tally-background/redux-slices/selectors"
import { accountTypes } from "@tallyho/tally-background/redux-slices/accounts"
import { normalizeEVMAddress } from "@tallyho/tally-background/lib/utils"
import { isSameAccountSignerWithId } from "@tallyho/tally-background/utils/signing"
import { useBackgroundSelector } from "../../hooks"
import { isAccountSingular } from "../../utils/accounts"
import { walletTypeDetails } from "../AccountsNotificationPanel/AccountsNotificationPanelAccounts"
import SharedAvatar from "../Shared/SharedAvatar"
import { accountPath } from "./hooks"

type WalletGroup = {
  key: string
  title: string
  icon: string
  accounts: AccountTotal[]
}

type CategoryGroup = {
  category: string
  wallets: WalletGroup[]
}

/**
 * Returns the wallet's accounts grouped the same way the popup's account
 * panel groups them: first by category, then by the signer that holds them.
 * Each signer's group is titled the way the popup titles it, for example
 * "Wallet 1", a custom title the user has set, or "Read-only".
 */
function useAccountGroups(): CategoryGroup[] {
  const totalsByType = useBackgroundSelector(
    selectCurrentNetworkAccountTotalsByCategory,
  )
  const signerSettings = useBackgroundSelector(
    (state) => state.ui.accountSignerSettings,
  )

  return useMemo(() => {
    const byCategory = new Map<string, AccountTotal[]>()
    accountTypes.forEach((accountType) => {
      const { category } = walletTypeDetails[accountType]
      byCategory.set(category, [
        ...(byCategory.get(category) ?? []),
        ...(totalsByType[accountType] ?? []),
      ])
    })

    return [...byCategory.entries()]
      .filter(([, totals]) => totals.length > 0)
      .map(([category, totals]) => {
        const bySigner = new Map<string, AccountTotal[]>()
        totals.forEach((total) => {
          const key = total.signerId ?? "read-only"
          bySigner.set(key, [...(bySigner.get(key) ?? []), total])
        })

        const wallets = [...bySigner.entries()].map(
          ([key, accounts], index) => {
            const { accountType, accountSigner } = accounts[0]
            const { title, icon } = walletTypeDetails[accountType]
            const customTitle =
              accountSigner.type === "read-only"
                ? undefined
                : signerSettings.find(({ signer }) =>
                    isSameAccountSignerWithId(signer, accountSigner),
                  )?.title

            return {
              key,
              icon,
              accounts,
              title: isAccountSingular(accountType)
                ? title
                : (customTitle ?? `${title} ${index + 1}`),
            }
          },
        )

        return { category, wallets }
      })
  }, [signerSettings, totalsByType])
}

function useAccountTotal(): (address: string) => number {
  const overviewTotals = useBackgroundSelector(selectAccountTotalsForOverview)
  return (address) =>
    Object.values(
      overviewTotals[normalizeEVMAddress(address)]?.totals ?? {},
    ).reduce((sum, value) => sum + value, 0)
}

const formatTotal = (total: number) =>
  `$${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`

function AccountNavItem({
  account,
  total,
}: {
  account: AccountTotal
  total: number
}): ReactElement {
  return (
    <NavLink
      to={accountPath(account.address)}
      className="nav_item"
      activeClassName="active"
    >
      <SharedAvatar
        width="24px"
        avatarURL={account.avatarURL}
        backupAvatar="./images/avatar@2x.png"
      />
      <span className="account_name" title={account.address}>
        {account.name ?? account.shortenedAddress}
      </span>
      <span className="account_total">{formatTotal(total)}</span>
    </NavLink>
  )
}

function WalletIcon({ icon }: { icon: string }): ReactElement {
  return (
    <span className="wallet_icon">
      <span
        className="wallet_icon_mask"
        style={{ maskImage: `url("${icon}")` }}
      />
      <style jsx>{`
        .wallet_icon {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: var(--green-80);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .wallet_icon_mask {
          width: 16px;
          height: 16px;
          mask-size: contain;
          mask-repeat: no-repeat;
          mask-position: center;
          background: var(--green-20);
        }
      `}</style>
    </span>
  )
}

/**
 * Renders the wallet's accounts in the full-tab view's nav, with one card per
 * wallet. Each card is headed by the wallet's type icon, its name as the
 * popup shows it, and the number of accounts it holds, followed by a link to
 * each of those accounts with its total balance.
 */
export default function FullTabAccountGroups(): ReactElement {
  const groups = useAccountGroups()
  const accountTotal = useAccountTotal()

  return (
    <div className="cards">
      {groups.flatMap(({ wallets }) =>
        wallets.map(({ key, title, icon, accounts }) => (
          <div className="card" key={key}>
            <div className="card_header">
              <WalletIcon icon={icon} />
              <span className="wallet_title">{title}</span>
              <span className="count">{accounts.length}</span>
            </div>
            {accounts.map((account) => (
              <AccountNavItem
                key={account.address}
                account={account}
                total={accountTotal(account.address)}
              />
            ))}
          </div>
        )),
      )}
      <style jsx>{`
        .cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .card {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 6px;
          border-radius: 10px;
          background: var(--hunter-green);
          border: 1px solid var(--green-95);
        }
        .card_header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 6px 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--green-40);
        }
        .wallet_title {
          flex: 1;
        }
        .count {
          min-width: 18px;
          height: 18px;
          padding: 0 5px;
          box-sizing: border-box;
          border-radius: 9px;
          background: var(--green-95);
          color: var(--green-40);
          font-size: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .card :global(.nav_item::before) {
          display: none;
        }
      `}</style>
    </div>
  )
}

import React, { ReactElement, ReactNode } from "react"
import { selectCurrentAccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { selectCurrentNetwork } from "@tallyho/tally-background/redux-slices/selectors/uiSelectors"
import { useBackgroundSelector } from "../../hooks"
import SharedNetworkIcon from "../Shared/SharedNetworkIcon"
import SharedAvatar from "../Shared/SharedAvatar"
import EmbeddedPageContext from "./EmbeddedPageContext"

/**
 * Renders a popup page at popup size inside the full-tab view, below a bar
 * that names the account and network the page acts on. Pages rendered this
 * way see {@link EmbeddedPageContext} set, so they leave out the popup's own
 * top and tab bars.
 */
export default function FullTabEmbeddedPage({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const account = useBackgroundSelector(selectCurrentAccountTotal)
  const network = useBackgroundSelector(selectCurrentNetwork)

  return (
    <div className="embedded">
      <div className="context_bar">
        <div className="acting_as">
          <SharedAvatar
            width="20px"
            avatarURL={account?.avatarURL}
            backupAvatar="./images/avatar@2x.png"
          />
          <span>{account?.name ?? account?.shortenedAddress}</span>
          <span className="divider">·</span>
          <SharedNetworkIcon network={network} size={18} />
          <span>{network.name}</span>
        </div>
      </div>
      <div className="frame">
        <EmbeddedPageContext.Provider value>
          {children}
        </EmbeddedPageContext.Provider>
      </div>
      <style jsx>{`
        .embedded {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px 24px 64px;
        }
        .context_bar {
          width: 384px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .back {
          color: var(--green-40);
          font-size: 16px;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .back:hover {
          color: var(--trophy-gold);
        }
        .acting_as {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--green-20);
          font-size: 14px;
          max-width: 384px;
          overflow: hidden;
          white-space: nowrap;
        }
        .divider {
          color: var(--green-60);
        }
        .frame {
          position: relative;
          width: 384px;
          height: 600px;
          border-radius: 16px;
          overflow: hidden;
          background: var(--hunter-green);
          box-shadow: var(--shadow-lifted);
          border: 1px solid var(--green-95);
          /* The transform makes the frame the containing block for fixed
             elements, which keeps the popup page's overlays within it. */
          transform: translateZ(0);
        }
      `}</style>
    </div>
  )
}

import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { NameResolverSystem } from "@tallyho/tally-background/services/name"
import classNames from "classnames"
import React, { ReactElement, useCallback } from "react"
import { useBackgroundDispatch } from "../../hooks"
import SharedTooltip from "./SharedTooltip"
import { trimNameMiddle, trimWithEllipsis } from "../../utils/textUtils"

type SharedAddressProps = {
  id?: string
  address: string
  name?: string | undefined
  elide: boolean
  nameResolverSystem?: NameResolverSystem
  /**
   * Always show the address, even if `name` is passed.
   */
  alwaysShowAddress: boolean
  /**
   * Show a copy icon after the content text.
   */
  showCopyIcon?: boolean
  /**
   * A smaller, single-line rendering for tight rows: 14px text, names cut in
   * the middle rather than at 15 characters, and the name's details in a
   * tooltip on the whole thing rather than behind an info icon.
   */
  compact?: boolean
}

// Long enough for most ENS names, short enough to share a row.
const COMPACT_NAME_LENGTH = 18

/**
 * The SharedAddress component is used to render addresses that can optionally
 * be represented as resolved names, and that are copiable by clicking.
 *
 * The component always expects an `address` prop. If an optional `name` prop
 * is passed, it is shown; otherwise, a truncated version of the address is
 * shown. The component tooltip always has a tooltip with the full address.
 * Additionally, clicking the component will copy the address to the clipboard
 * and present the user with a snackbar message indicating this has occurred.
 *
 * If the optional `nameResolverSystem` property is provided, an info tooltip
 * is included in the component to inform the user of which name resolver
 * system was used to resolve the passed `name`. If no `name` is passed, the
 * `nameResolverSystem` prop is ignored.
 */
export default function SharedAddress({
  id,
  name,
  address,
  elide,
  nameResolverSystem,
  alwaysShowAddress,
  showCopyIcon,
  compact = false,
}: SharedAddressProps): ReactElement {
  const dispatch = useBackgroundDispatch()

  const primaryText = name ?? truncateAddress(address)

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(address)
    dispatch(setSnackbarMessage("Address copied to clipboard"))
  }, [address, dispatch])

  if (compact) {
    return (
      <>
        <SharedTooltip
          width={200}
          height={26}
          verticalPosition="top"
          horizontalPosition="left"
          style={{ margin: "-5px 0" }}
          IconComponent={() => (
            <button
              id={id}
              type="button"
              className="compact"
              onClick={copyAddress}
            >
              {name === undefined
                ? truncateAddress(address)
                : trimNameMiddle(name, COMPACT_NAME_LENGTH)}
            </button>
          )}
        >
          <div className="compact_tooltip">
            {name !== undefined && <div>{name}</div>}
            <div className="compact_tooltip_address">{address}</div>
            {name !== undefined && nameResolverSystem !== undefined && (
              <div>Resolved using {nameResolverSystem}</div>
            )}
            <div>Click to copy</div>
          </div>
        </SharedTooltip>
        {/*
         * Outside the tooltip: its content only mounts while it shows, and
         * these styles are also for the address itself.
         */}
        <style jsx>{`
          .compact {
            font-size: 14px;
            line-height: 16px;
            white-space: nowrap;
            color: var(--green-20);
            transition: 300ms color;
          }
          .compact:hover {
            color: var(--gold-80);
          }
          .compact_tooltip {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .compact_tooltip_address {
            word-break: break-all;
          }
        `}</style>
      </>
    )
  }

  return (
    <button
      id={id}
      type="button"
      onClick={copyAddress}
      title={`Copy to clipboard:\n${address}`}
      className={classNames({ ellipsis: elide })}
    >
      <p className={classNames({ ellipsis: elide })}>
        {trimWithEllipsis(primaryText, 15)}
        {name !== undefined && nameResolverSystem !== undefined && (
          <>
            <SharedTooltip width={130}>
              <p className="name_source_tooltip">
                Resolved using {nameResolverSystem}
              </p>
            </SharedTooltip>{" "}
          </>
        )}
      </p>
      {alwaysShowAddress && name !== undefined && (
        <p className="detail">{truncateAddress(address)}</p>
      )}
      {showCopyIcon === true && <span className="copy_icon" />}
      <style jsx>{`
        button {
          display: flex;
          white-space: nowrap;
          transition: 300ms color;
          max-width: 100%;
        }
        button :last-child {
          top: 3px;
        }
        button:hover {
          color: var(--gold-80);
        }
        .copy_icon {
          mask-image: url("./images/copy@2x.png");
          mask-size: cover;
          width: 24px;
          height: 24px;
          margin-left: 10px;
          display: inline-block;
          background-color: var(--green-5);
        }
        button:hover .copy_icon {
          background-color: var(--trophy-gold);
        }
        .name_source_tooltip {
          margin: 0;
          text-align: center;
        }
        p {
          font-size: 16px;
          line-height: 24px;
          margin: 0;
        }
        p.detail {
          font-size: 14px;
          line-height: 16px;
          color: var(--green-40);
        }
      `}</style>
    </button>
  )
}

SharedAddress.defaultProps = {
  alwaysShowAddress: false,
  elide: false,
}

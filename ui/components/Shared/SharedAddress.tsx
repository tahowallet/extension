import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import { NameResolverSystem } from "@tallyho/tally-background/services/name"
import classNames from "classnames"
import React, { ReactElement, useCallback } from "react"
import { useBackgroundDispatch } from "../../hooks"
import SharedTooltip from "./SharedTooltip"
import { trimWithEllipsis } from "../../utils/textUtils"

type SharedAddressProps = {
  address: string
  name?: string | undefined
  elide: boolean
  nameResolverSystem?: NameResolverSystem
  alwaysShowAddress: boolean
}

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
  name,
  address,
  elide,
  nameResolverSystem,
  alwaysShowAddress,
}: SharedAddressProps): ReactElement {
  const dispatch = useBackgroundDispatch()

  const primaryText = name ?? truncateAddress(address)

  const copyAddress = useCallback(() => {
    navigator.clipboard.writeText(address)
    dispatch(setSnackbarMessage("Address copied to clipboard"))
  }, [address, dispatch])

  return (
    <button
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
      <style jsx>{`
        button {
          transition: 300ms color;
          max-width: 100%;
        }
        button :last-child {
          top: 3px;
        }
        button:hover {
          color: var(--gold-80);
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

import React, { ReactElement } from "react"
import classNames from "classnames"
import { useTranslation } from "react-i18next"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { truncateAddress } from "@tallyho/tally-background/lib/utils"
import SharedButton from "../Shared/SharedButton"
import SharedNetworkIconStack from "../Shared/SharedNetworkIconStack"

type Props = {
  name: string
  address: string
  isOwnAccount?: boolean
  isHighlighted?: boolean
  /** When set, shows which networks the name applies on. */
  applicableNetworks?: EVMNetwork[]
  onSelect?: () => void
  onEdit: () => void
  onMouseMove?: () => void
}

export default function AddressBookListItem({
  name,
  address,
  isOwnAccount = false,
  isHighlighted = false,
  applicableNetworks,
  onSelect,
  onEdit,
  onMouseMove,
}: Props): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "addressBook" })

  return (
    <li
      className={classNames("item", {
        highlighted: isHighlighted,
        selectable: onSelect !== undefined,
      })}
      onMouseMove={onMouseMove}
    >
      <button
        type="button"
        className="details"
        onClick={onSelect}
        disabled={onSelect === undefined}
        title={address}
      >
        <span className="name_row">
          <span className="name">{name}</span>
          {isOwnAccount && <span className="tag">{t("yourAccount")}</span>}
        </span>
        <span className="address">{truncateAddress(address)}</span>
      </button>
      <div className="actions">
        {applicableNetworks !== undefined && (
          <SharedNetworkIconStack
            networks={applicableNetworks}
            ringColor="var(--hunter-green)"
          />
        )}
        <SharedButton
          type="tertiaryGray"
          size="small"
          iconSmall="edit"
          iconPosition="left"
          onClick={(event) => {
            event.stopPropagation()
            onEdit()
          }}
        >
          {t("edit")}
        </SharedButton>
      </div>
      <style jsx>{`
        .item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 12px 16px 12px 24px;
          margin-bottom: 8px;
          border-radius: 8px;
          border: 1px solid transparent;
          background-color: var(--hunter-green);
          box-sizing: border-box;
          transition: border-color var(--fade);
        }
        .item.selectable.highlighted {
          border-color: var(--success);
        }
        .details {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex-grow: 1;
          min-width: 0;
          text-align: left;
          cursor: default;
        }
        .item.selectable .details {
          cursor: pointer;
        }
        .name_row {
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: 100%;
        }
        .name {
          color: var(--text-strong);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .tag {
          flex-shrink: 0;
          padding: 0 6px;
          border-radius: 4px;
          background-color: var(--green-95);
          color: var(--green-40);
          font-size: 12px;
          line-height: 18px;
        }
        .address {
          color: var(--green-40);
          font-size: 14px;
          line-height: 20px;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
      `}</style>
    </li>
  )
}

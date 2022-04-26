import React, { ReactElement } from "react"
import { AccountTotal } from "@tallyho/tally-background/redux-slices/selectors"
import { HexString } from "@tallyho/tally-background/types"
import { addOrEditAddressName } from "@tallyho/tally-background/redux-slices/accounts"
import { useDispatch } from "react-redux"
import SharedButton from "../Shared/SharedButton"
import SharedAccountItemSummary from "../Shared/SharedAccountItemSummary"
import AccountItemActionHeader from "./AccountItemActionHeader"
import SharedInput from "../Shared/SharedInput"

interface AccountItemEditNameProps {
  account: AccountTotal
  address: HexString
  close: () => void
}

export default function AccountItemEditName({
  account,
  address,
  close,
}: AccountItemEditNameProps): ReactElement {
  const dispatch = useDispatch()
  const [newName, setNewName] = React.useState("")
  const [error, setError] = React.useState("")
  const [touched, setTouched] = React.useState(false)

  React.useEffect(() => {
    if (touched && newName.trim() === "") {
      setError("Name is required")
    } else {
      setError("")
    }
  }, [newName, error, touched])

  return (
    <div className="edit_address_name">
      <div className="header">
        <AccountItemActionHeader
          label="Edit name"
          icon="icons/s/edit.svg"
          color="#fff"
        />
      </div>
      <div className="account_container standard_width">
        <SharedAccountItemSummary accountTotal={account} isSelected={false} />
      </div>
      <div
        className="details"
        role="presentation"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={() => {
            dispatch(
              addOrEditAddressName({
                name: newName,
                address,
              })
            )
            close()
          }}
        >
          <SharedInput
            label=""
            placeholder="Type new name"
            errorMessage={error}
            onChange={(value) => {
              if (!touched) {
                setTouched(true)
              }
              setNewName(value)
            }}
          />
        </form>
      </div>
      <div className="button_container">
        <SharedButton
          type="secondary"
          size="medium"
          onClick={(e) => {
            e.stopPropagation()
            close()
          }}
        >
          Cancel
        </SharedButton>
        <SharedButton
          type="primaryGreen"
          size="medium"
          onClick={(e) => {
            if (error) {
              e.stopPropagation()
              return
            }
            dispatch(
              addOrEditAddressName({
                name: newName,
                address,
              })
            )
            close()
          }}
        >
          Save name
        </SharedButton>
      </div>
      <style jsx>{`
        li {
        }
        .header {
          height: 24px;
        }
        .edit_address_name {
          margin-left: 20px;
          margin-right: 20px;
          display: flex;
          flex-direction: column;
          height: 95%;
        }
        form {
          margin-top: 0px;
        }
        .details {
          display: flex;
          flex-direction: column;
          line-height: 24px;
          font-size: 16px;
          margin-top: 21px;
        }
        .button_container {
          margin-top: 52px;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
        .account_container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0 auto;
          width: 336px;
          height: 52px;
          margin-top: 15px;
          background-color: var(--hunter-green);
          padding: 5px;
          border-radius: 16px;
        }
      `}</style>
    </div>
  )
}

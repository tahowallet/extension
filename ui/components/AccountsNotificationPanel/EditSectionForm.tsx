import React, { ReactElement, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import SharedButton from "../Shared/SharedButton"
import SharedInput from "../Shared/SharedInput"
import AccountItemActionHeader from "../AccountItem/AccountItemActionHeader"

function EditSectionForm({
  onSubmit: onSubmitCallback,
  onCancel,
  accountTypeIcon,
  currentName,
}: {
  onSubmit: (name: string) => void
  onCancel: () => void
  accountTypeIcon: string
  currentName: string
}): ReactElement {
  const { t } = useTranslation("translation", {
    keyPrefix: "accounts.accountItem",
  })
  const [newName, setNewName] = useState("")
  const [error, setError] = useState("")
  const [touched, setTouched] = useState(false)

  const callbackRef = useRef(onSubmitCallback)
  callbackRef.current = onSubmitCallback

  useEffect(() => {
    if (touched && newName.trim() === "") {
      setError(t("noNameError"))
    } else {
      setError("")
    }
  }, [newName, error, touched, t])

  const onSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!newName) {
        setTouched(true)
        setError(t("noNameError"))
        return
      }

      if (error) {
        return
      }

      callbackRef.current(newName)
    },
    [error, newName, t],
  )

  return (
    <div
      className="edit_address_name"
      role="none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="header">
        <AccountItemActionHeader
          label={t("editName")}
          icon="icons/s/edit.svg"
          color="#fff"
        />
      </div>
      <div className="wallet_title">
        <h2 className="left">
          <div className="icon_wrap">
            <div className="icon" />
          </div>
          {currentName}
        </h2>
      </div>
      <form className="form" onSubmit={onSubmit}>
        <div className="details" role="presentation">
          <SharedInput
            label=""
            placeholder={t("typeNewName")}
            errorMessage={error}
            autoFocus
            onChange={(value) => {
              if (!touched) {
                setTouched(true)
              }
              setNewName(value)
            }}
          />
        </div>
        <div className="button_container">
          <SharedButton
            type="secondary"
            size="medium"
            onClick={() => {
              onCancel()
            }}
          >
            {t("cancel")}
          </SharedButton>
          <SharedButton type="primaryGreen" size="medium" isFormSubmit>
            {t("saveName")}
          </SharedButton>
        </div>
      </form>
      <style jsx>{`
        .icon_wrap {
          background-color: var(--green-60);
          margin: 0 7px 0 0;
          border-radius: 4px;
        }
        .icon {
          mask-image: url("${accountTypeIcon}");
          mask-size: cover;
          background-color: var(--green-20);
          width: 24px;
          height: 24px;
        }

        .wallet_title {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--hunter-green);
          border-radius: 4px;
          padding: 8px;
          margin-top: 24px;
        }

        .account_container {
          margin: 0 auto;
          width: 336px;
          height: 52px;
          margin-top: 15px;
        }

        .wallet_title > h2 {
          display: flex;
          align-items: center;
          color: var(--green-40);
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          margin: 0;
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
          margin: 0px;
        }
        .details {
          display: flex;
          flex-direction: column;
          line-height: 24px;
          font-size: 16px;
          margin-top: 16px;
        }
        .button_container {
          margin-top: 32px;
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }
      `}</style>
    </div>
  )
}

export default EditSectionForm

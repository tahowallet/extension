import { setSnackbarMessage } from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useDispatch } from "react-redux"
import SharedButton from "../Shared/SharedButton"
import SharedSlideUpMenu from "../Shared/SharedSlideUpMenu"

export default function AnalyticsSlideUpMenu(props: {
  isOpen: boolean
  title: string
  description: string
  submitLabel: string
  snackBarMsg: string
  onCancel: () => void
  onSubmit: () => void
}): ReactElement {
  const {
    isOpen,
    onCancel,
    onSubmit,
    title,
    description,
    submitLabel,
    snackBarMsg,
  } = props

  const dispatch = useDispatch()
  const { t } = useTranslation()

  const handleSubmit = () => {
    onSubmit()
    dispatch(setSnackbarMessage(snackBarMsg))
  }

  return (
    <>
      <SharedSlideUpMenu
        size="custom"
        customSize="247px"
        isOpen={isOpen}
        close={() => onCancel()}
      >
        <div className="menu_container">
          <div>
            <h2 className="title">{title}</h2>
            <p className="simple_text">{description}</p>
          </div>
          <div className="btn_container">
            <SharedButton
              type="primary"
              size="small"
              onClick={() => onCancel()}
            >
              {t("shared.cancelBtn")}
            </SharedButton>
            <SharedButton
              type="tertiary"
              size="small"
              onClick={() => handleSubmit()}
            >
              {submitLabel}
            </SharedButton>
          </div>
        </div>
      </SharedSlideUpMenu>
      <style jsx>{`
        .menu_container {
          box-sizing: border-box;
          padding: 0 24px 24px 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }
        .title {
          font-size: 18px;
          font-weight: 600;
          line-height: 24px;
          margin-top: 0;
        }
        .btn_container {
          display: flex;
          flex-direction: row;
        }
      `}</style>
    </>
  )
}

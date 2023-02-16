import {
  selectShowGlobalModal,
  toggleShowGlobalModal,
} from "@tallyho/tally-background/redux-slices/ui"
import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import { useBackgroundDispatch, useBackgroundSelector } from "../../hooks"
import SharedButton from "../Shared/SharedButton"
import SharedModal from "../Shared/SharedModal"

// TODO update
const IMG = "./images/doggo_gold.svg"
const LINK = "https://blog.taho.xyz"

export default function GlobalModal(): ReactElement {
  const { t } = useTranslation("translation", { keyPrefix: "globalModal" })

  const showModal = useBackgroundSelector(selectShowGlobalModal)
  const dispatch = useBackgroundDispatch()

  const toggleShowModal = (toggle: boolean) => {
    dispatch(toggleShowGlobalModal(toggle))
  }

  const handleClick = () => {
    toggleShowModal(false)
    window.open(LINK, "_blank")?.focus()
  }

  return (
    <SharedModal
      isOpen={showModal}
      onClose={() => toggleShowModal(false)}
      width="90%"
      minHeight="550px"
      bgColor="var(--green-95)"
      shadowBgColor="var(--green-120)"
    >
      <div className="content">
        <img className="image" src={IMG} alt="" />
        <div className="text_wrap">
          <h1 className="title">{t("title")}</h1>
          <div className="description">{t("description")}</div>
        </div>
        <SharedButton type="primary" size="medium" onClick={handleClick}>
          {t("button")}
        </SharedButton>
      </div>
      <style jsx>{`
        .content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          gap: 38px;
        }
        .image {
          max-width: 100%;
        }
        .text_wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .title {
          font-weight: 600;
          font-size: 18px;
          line-height: 24px;
          color: var(--trophy-gold);
        }
        .description {
          font-weight: 500;
          font-size: 14px;
          line-height: 16px;
          letter-spacing: 0.03em;
          color: var(--green-20);

          display: flex;
          align-items: flex-end;
          text-align: center;
          padding: 0px 32px;
        }
      `}</style>
    </SharedModal>
  )
}

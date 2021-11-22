import React, {
  Dispatch,
  KeyboardEvent,
  ReactElement,
  SetStateAction,
} from "react"

interface ModalProps {
  setModalVisible: Dispatch<SetStateAction<boolean>>
}

export default function Modal({ setModalVisible }: ModalProps): ReactElement {
  const handleEscKey = (e: KeyboardEvent) => {
    if (e.key === "Esc") {
      setModalVisible(false)
    }
  }
  return (
    <div className="modal__wrap">
      <div
        className="modal__backdrop"
        onClick={() => setModalVisible(false)}
        onKeyDown={(e) => handleEscKey(e)}
        role="button"
        aria-label="backdrop"
        tabIndex={0}
      />

      <div className="modal__content">
        <div className="modal__title"> Why Delegate?</div>
        <div>Read this text and chose your own degenerate.</div>
        <button
          className="modal__button"
          type="button"
          onClick={() => setModalVisible(false)}
        >
          Understood
        </button>
      </div>
      <style jsx>{`
        .modal__wrap {
          width: 100vw;
          height: 100vh;
          display: flex;
          position: absolute;
          justify-content: center;
          align-items: center;
          z-index: 3;
        }

        @keyframes slideup {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0%);
          }
        }
        .modal__backdrop {
          opacity: 0.7;
          width: 100vw;
          height: 100vh;
          background: #001413;
          position: absolute;
          z-index: 3;
        }
        .modal__content {
          width: 70vw;
          height: 70vh;
          padding: 24px;
          background: #001413;
          z-index: 4;
          text-align: center;
          display: flex;
          flex-flow: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          border-radius: 12px;
          animation-name: slideup;
          animation-duration: 0.4s;
        }
        .modal__title {
          font-family: Segment;
          font-size: 18px;
          line-height: 24px;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          color: #d64045;
        }
        .modal__button {
          height: 40px;
          border-radius: 4px;
          background-color: var(--trophy-gold);
          color: #002522;
          font-size: 20px;
          letter-spacing: 0.48px;
          line-height: 24px;
          text-align: center;
          padding: 0px 17px;
          margin-bottom: 16px;
          margin-right: 8px;
          z-index: 2;
        }
      `}</style>
    </div>
  )
}

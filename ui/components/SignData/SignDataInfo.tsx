import React from "react"

type Props = {
  label: string
  content: string
}

export default function SignDataInfo({ label, content }: Props): JSX.Element {
  return (
    <>
      <div className="wrapper">
        <div className="label">{label}:</div>
        <div className="content">{content}</div>
      </div>
      <style jsx>{`
        .wrapper {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 16px;
          line-height: 24px;
        }
        .wrapper .label {
          font-size: 16px;
        }
        .content {
          color: var(--green-20);
          word-break: break-word;
          margin-left: 3px;
        }
      `}</style>
    </>
  )
}

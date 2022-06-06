import SharedButton from "../../Shared/SharedButton";

export default function SignerBaseFrame({
  children,
  signingAction,
  onConfirm,
  onReject
}: SigningFrameProps): ReactElement {
  return (
    <>
      {children}
      <footer>
        <SharedButton
          iconSize="large"
          size="large"
          type="secondary"
          onClick={onReject}
        >
          Reject
        </SharedButton>

        <SharedButton
          type="primary"
          iconSize="large"
          size="large"
          onClick={onConfirm}
          showLoadingOnClick
        >
          {signingAction}
        </SharedButton>
      </footer>
    </>
  )
}

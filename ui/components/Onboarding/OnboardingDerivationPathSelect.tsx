import React, { ReactElement } from "react"
import SharedSelect from "../Shared/SharedSelect"

// TODO make this network specific
const derivationPaths: { value: string; label: string }[] = [
  {
    value: "m/44'/60'/0'/0",
    label: "ETH (m/44'/60'/0'/0)",
  },
  {
    value: "m/44'/1'/0'/0",
    label: "ETH Testnet (m/44'/1'/0'/0)",
  },
  {
    value: "m/44'/61'/0'/0",
    label: "Trezor (m/44'/61'/0'/0)",
  },
  {
    value: "m/44'/137'/0'/0",
    label: "RSK (m/44'/137'/0'/0)",
  },
  {
    value: "m/44'/37310'/0'/1",
    label: "RSK Testnet (m/44'/37310'/0'/0)",
  },
]

type Props = {
  onChange: (option: string) => void
}

export default function OnboardingDerivationPathSelectAlt(
  props: Props
): ReactElement {
  const { onChange } = props

  return (
    <SharedSelect
      placement="top"
      options={derivationPaths}
      placeholder="Select derivation path"
      onChange={onChange}
    />
  )
}

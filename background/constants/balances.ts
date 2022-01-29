import { ethers } from "ethers"

const balances = [
  { account: "0x1234", amount: ethers.BigNumber.from(100) },
  { account: "0x1234", amount: ethers.BigNumber.from(101) },
  { account: "0x1245", amount: ethers.BigNumber.from(102) },
  { account: "0x123456", amount: ethers.BigNumber.from(103) },
]
export default balances

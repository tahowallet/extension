interface ContractsList {
  [chainId: number]: {
    distributor: string
  }
}

const Contracts = {
  1: {
    distributor: "0x123",
  },
} as ContractsList

export default Contracts

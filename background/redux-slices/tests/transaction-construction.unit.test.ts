import reducer, {
  clearCustomGas,
  initialState,
  NetworkFeeTypeChosen,
} from "../transaction-construction"

describe("Transaction Construction Redux Slice", () => {
  describe("Actions", () => {
    describe("clearCustomGas", () => {
      it("Should reset selected fee type to Regular", () => {
        const mockState = {
          ...initialState,
          feeTypeSeected: NetworkFeeTypeChosen.Custom,
        }

        const newState = reducer(mockState, clearCustomGas())
        expect(newState.feeTypeSelected).toBe(NetworkFeeTypeChosen.Regular)
      })
    })
  })
})

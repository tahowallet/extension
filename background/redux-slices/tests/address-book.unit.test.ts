import { ETHEREUM } from "../../constants"
import { normalizeEVMAddress } from "../../lib/utils"
import reducer, {
  AddressBookEntry,
  initialState,
  setAddressBook,
} from "../address-book"

const ADDRESS = normalizeEVMAddress(
  "0x1111111111111111111111111111111111111111",
)
const entry = (
  address: string,
  network: AddressBookEntry["network"],
  name: string,
  updatedAt = 1,
): AddressBookEntry => ({
  address: normalizeEVMAddress(address),
  network,
  name,
  createdAt: updatedAt,
  updatedAt,
})

describe("address book slice", () => {
  it("replaces its entries with the name service's", () => {
    const entries = [entry(ADDRESS, ETHEREUM, "Brother")]

    expect(reducer(initialState, setAddressBook(entries)).entries).toEqual(
      entries,
    )
  })
})

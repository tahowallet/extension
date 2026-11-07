import { ETHEREUM, OPTIMISM, POLYGON } from "../../constants"
import { normalizeEVMAddress } from "../../lib/utils"
import type { RootState } from ".."
import reducer, {
  AddressBookEntry,
  initialState,
  setAddressBook,
} from "../address-book"
import {
  selectAddressBookEntriesForNetwork,
  selectNameApplicableNetworks,
} from "../selectors/addressBookSelectors"
import type { ControlCompatibility } from "../../services/signing"

const ADDRESS = normalizeEVMAddress(
  "0x1111111111111111111111111111111111111111",
)
const OTHER = normalizeEVMAddress("0x2222222222222222222222222222222222222222")

const entry = (
  address: string,
  network: AddressBookEntry["network"],
  name: string,
  updatedAt = 1,
): AddressBookEntry => ({
  address: normalizeEVMAddress(address),
  network,
  name,
  additionalChainIDs: [],
  createdAt: updatedAt,
  updatedAt,
})

const stateWith = (
  entries: AddressBookEntry[],
  controlCompatibility: ControlCompatibility = {},
): RootState =>
  ({
    addressBook: { entries },
    account: { controlCompatibility },
    networks: {
      evmNetworks: {
        [ETHEREUM.chainID]: ETHEREUM,
        [POLYGON.chainID]: POLYGON,
        [OPTIMISM.chainID]: OPTIMISM,
      },
    },
  }) as unknown as RootState

describe("address book slice", () => {
  it("replaces its entries with the name service's", () => {
    const entries = [entry(ADDRESS, ETHEREUM, "Brother")]

    expect(reducer(initialState, setAddressBook(entries)).entries).toEqual(
      entries,
    )
  })
})

describe("selectNameApplicableNetworks", () => {
  it("is just the saved network without known compatibility", () => {
    expect(
      selectNameApplicableNetworks(stateWith([]), {
        address: ADDRESS,
        network: ETHEREUM,
      }),
    ).toEqual([ETHEREUM])
  })

  it("adds the networks the address is control-compatible with", () => {
    const state = stateWith([], {
      [ADDRESS]: { [ETHEREUM.chainID]: [POLYGON.chainID, OPTIMISM.chainID] },
    })

    expect(
      selectNameApplicableNetworks(state, {
        address: ADDRESS,
        network: ETHEREUM,
      }).map(({ chainID }) => chainID),
    ).toEqual([ETHEREUM.chainID, OPTIMISM.chainID, POLYGON.chainID])
  })
})

describe("selectAddressBookEntriesForNetwork", () => {
  it("includes entries saved elsewhere only where they're compatible", () => {
    const state = stateWith(
      [entry(ADDRESS, POLYGON, "Mine"), entry(OTHER, POLYGON, "Theirs")],
      { [ADDRESS]: { [POLYGON.chainID]: [ETHEREUM.chainID] } },
    )

    expect(
      selectAddressBookEntriesForNetwork(state, ETHEREUM).map(
        ({ name }) => name,
      ),
    ).toEqual(["Mine"])
  })

  it("keeps one entry per address, preferring the one saved on the network", () => {
    const state = stateWith(
      [
        entry(ADDRESS, POLYGON, "From Polygon", 5),
        entry(ADDRESS, ETHEREUM, "On Ethereum", 1),
      ],
      { [ADDRESS]: { [POLYGON.chainID]: [ETHEREUM.chainID] } },
    )

    expect(
      selectAddressBookEntriesForNetwork(state, ETHEREUM).map(
        ({ name }) => name,
      ),
    ).toEqual(["On Ethereum"])
  })

  it("includes entries the user applied to the network", () => {
    const state = stateWith([
      {
        ...entry(OTHER, POLYGON, "Chosen"),
        additionalChainIDs: [ETHEREUM.chainID],
      },
    ])

    expect(
      selectAddressBookEntriesForNetwork(state, ETHEREUM).map(
        ({ name }) => name,
      ),
    ).toEqual(["Chosen"])
  })
})

import React, { ReactElement, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  isBuiltInNetwork,
  TEST_NETWORK_BY_CHAIN_ID,
} from "@tallyho/tally-background/constants"
import { EVMNetwork, sameNetwork } from "@tallyho/tally-background/networks"
import {
  selectProductionEVMNetworks,
  selectTestnetNetworks,
  selectUnreachableNetworks,
} from "@tallyho/tally-background/redux-slices/selectors/networks"
import { selectShowTestNetworks } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector, useListKeyboardNavigation } from "../../hooks"
import SharedSearchableList from "../Shared/SharedSearchableList"
import TopMenuProtocolListItem from "./TopMenuProtocolListItem"
import { productionNetworkDescription } from "./TopMenuProtocolList"

type Props = {
  currentNetwork: EVMNetwork | undefined
  onNetworkChange: (network: EVMNetwork) => void
}

export default function SelectNetworkMenuContent({
  currentNetwork,
  onNetworkChange,
}: Props): ReactElement {
  const { t } = useTranslation()
  const showTestNetworks = useBackgroundSelector(selectShowTestNetworks)
  const productionNetworks = useBackgroundSelector(selectProductionEVMNetworks)
  const testnetNetworks = useBackgroundSelector(selectTestnetNetworks)
  // Read once for the whole list rather than once per row; see
  // `selectUnreachableNetworks` for why that distinction matters here.
  const unreachableNetworks = useBackgroundSelector(selectUnreachableNetworks)

  const [searchTerm, setSearchTerm] = useState("")

  // Build and filter networks by category
  const {
    filteredBuiltinNetworks,
    filteredCustomNetworks,
    filteredTestNetworks,
    filteredNetworks,
  } = useMemo(() => {
    const builtinNetworks = productionNetworks.filter(isBuiltInNetwork)
    const customNetworks = productionNetworks.filter(
      (network) => !isBuiltInNetwork(network),
    )
    const testNetworks = showTestNetworks
      ? [...TEST_NETWORK_BY_CHAIN_ID].flatMap(
          (chainId) =>
            testnetNetworks.find((network) => network.chainID === chainId) ??
            [],
        )
      : []

    const filterBySearchTerm = (networks: EVMNetwork[]) =>
      searchTerm.trim() === ""
        ? networks
        : networks.filter((network) =>
            network.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )

    const builtin = filterBySearchTerm(builtinNetworks)
    const custom = filterBySearchTerm(customNetworks)
    const test = filterBySearchTerm(testNetworks)

    return {
      filteredBuiltinNetworks: builtin,
      filteredCustomNetworks: custom,
      filteredTestNetworks: test,
      // Combined list for keyboard navigation index tracking
      filteredNetworks: [...builtin, ...custom, ...test],
    }
  }, [productionNetworks, testnetNetworks, showTestNetworks, searchTerm])

  const {
    highlightedIndex: selectedIndex,
    setHighlightedIndex: setSelectedIndex,
    handleKeyDown,
  } = useListKeyboardNavigation(filteredNetworks, onNetworkChange, searchTerm)

  return (
    <>
      <SharedSearchableList
        title={t("topMenu.selectNetwork")}
        searchPlaceholder={t("topMenu.searchNetworks")}
        onSearchChange={setSearchTerm}
        onSearchKeyDown={handleKeyDown}
      >
        <ul className="networks_list">
          {filteredBuiltinNetworks.map((network, index) => (
            <TopMenuProtocolListItem
              key={network.chainID}
              network={network}
              isSelected={
                currentNetwork !== undefined &&
                sameNetwork(currentNetwork, network)
              }
              isHighlighted={index === selectedIndex}
              info={
                productionNetworkDescription[network.chainID] ??
                t("protocol.compatibleChain")
              }
              onSelect={onNetworkChange}
              onMouseMove={() => setSelectedIndex(index)}
              isDisabled={false}
              isUnreachable={unreachableNetworks[network.chainID] === true}
            />
          ))}
          {filteredCustomNetworks.length > 0 && (
            <>
              <li className="protocol_divider">
                <div className="divider_label">
                  {t("topMenu.protocolList.customNetworksSectionTitle")}
                </div>
                <div className="divider_line" />
              </li>
              {filteredCustomNetworks.map((network, index) => {
                const globalIndex = filteredBuiltinNetworks.length + index
                return (
                  <TopMenuProtocolListItem
                    key={network.chainID}
                    network={network}
                    isSelected={
                      currentNetwork !== undefined &&
                      sameNetwork(currentNetwork, network)
                    }
                    isHighlighted={globalIndex === selectedIndex}
                    info={t("protocol.compatibleChain")}
                    onSelect={onNetworkChange}
                    onMouseMove={() => setSelectedIndex(globalIndex)}
                    isDisabled={false}
                    isUnreachable={
                      unreachableNetworks[network.chainID] === true
                    }
                  />
                )
              })}
            </>
          )}
          {filteredTestNetworks.length > 0 && (
            <>
              <li className="protocol_divider">
                <div className="divider_label">
                  {t("topMenu.protocolList.testnetsSectionTitle")}
                </div>
                <div className="divider_line" />
              </li>
              {filteredTestNetworks.map((network, index) => {
                const globalIndex =
                  filteredBuiltinNetworks.length +
                  filteredCustomNetworks.length +
                  index
                return (
                  <TopMenuProtocolListItem
                    key={network.chainID}
                    network={network}
                    isSelected={
                      currentNetwork !== undefined &&
                      sameNetwork(currentNetwork, network)
                    }
                    isHighlighted={globalIndex === selectedIndex}
                    info={t("protocol.compatibleChain")}
                    onSelect={onNetworkChange}
                    onMouseMove={() => setSelectedIndex(globalIndex)}
                    isDisabled={false}
                    isUnreachable={
                      unreachableNetworks[network.chainID] === true
                    }
                  />
                )
              })}
            </>
          )}
        </ul>
      </SharedSearchableList>
      <style jsx>{`
        .networks_list {
          display: block;
          width: 100%;
        }
        .networks_list :global(.protocol_divider) {
          display: flex;
          margin-top: 8px;
          margin-bottom: 16px;
          gap: 15px;
          position: relative;
        }
        .networks_list :global(.divider_line) {
          flex-grow: 1;
          align-self: center;
          background: var(--green-120);
          height: 1px;
          margin-top: 1px;
        }
        .networks_list :global(.divider_label) {
          color: var(--green-40);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
        }
      `}</style>
    </>
  )
}

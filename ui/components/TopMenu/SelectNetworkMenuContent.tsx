import React, {
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  isBuiltInNetwork,
  TEST_NETWORK_BY_CHAIN_ID,
} from "@tallyho/tally-background/constants"
import { EVMNetwork, sameNetwork } from "@tallyho/tally-background/networks"
import {
  selectProductionEVMNetworks,
  selectTestnetNetworks,
} from "@tallyho/tally-background/redux-slices/selectors/networks"
import { selectShowTestNetworks } from "@tallyho/tally-background/redux-slices/ui"
import { useBackgroundSelector } from "../../hooks"
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

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInput = useRef<HTMLInputElement | null>(null)

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

  // Reset selection when search results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [searchTerm])

  // Auto-focus the search input
  useEffect(() => {
    searchInput.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const maxIndex = filteredNetworks.length - 1

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, maxIndex))
          break
        case "ArrowUp":
          event.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case "n":
          if (event.ctrlKey) {
            event.preventDefault()
            setSelectedIndex((prev) => Math.min(prev + 1, maxIndex))
          }
          break
        case "p":
          if (event.ctrlKey) {
            event.preventDefault()
            setSelectedIndex((prev) => Math.max(prev - 1, 0))
          }
          break
        case "Enter":
          event.preventDefault()
          if (filteredNetworks[selectedIndex]) {
            onNetworkChange(filteredNetworks[selectedIndex])
          }
          break
        default:
          break
      }
    },
    [filteredNetworks, selectedIndex, onNetworkChange],
  )

  return (
    <>
      <div className="standard_width_padded center_horizontal">
        <div className="search_label">{t("topMenu.selectNetwork")}</div>
        <div className="search_wrap">
          <input
            type="text"
            ref={searchInput}
            className="search_input"
            placeholder={t("topMenu.searchNetworks")}
            spellCheck={false}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="icon_search" />
        </div>
      </div>
      <div className="divider" />
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
                />
              )
            })}
          </>
        )}
      </ul>
      <style jsx>{`
        .search_label {
          height: 20px;
          color: var(--green-60);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          margin-bottom: 16px;
          margin-top: -5px;
        }
        .search_wrap {
          display: flex;
          position: relative;
        }
        .search_input {
          width: 100%;
          height: 48px;
          border-radius: 4px;
          border: 1px solid var(--green-60);
          padding-left: 16px;
          padding-right: 56px;
          box-sizing: border-box;
          color: var(--green-40);
          background: transparent;
        }
        .search_input::placeholder {
          color: var(--green-40);
        }
        .icon_search {
          background: url("./images/search_large@2x.png");
          background-size: 24px 24px;
          width: 24px;
          height: 24px;
          position: absolute;
          right: 16px;
          top: 12px;
        }
        .divider {
          width: 100%;
          height: 0;
          border-bottom: 1px solid var(--hunter-green);
          margin-top: 15px;
        }
        .networks_list {
          display: block;
          overflow-y: auto;
          height: calc(100% - 120px);
          width: 100%;
          padding: 16px 24px;
          box-sizing: border-box;
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

import React, { ReactElement } from "react"
import { useTranslation } from "react-i18next"
import classNames from "classnames"
import { useDispatch } from "react-redux"
import { setSelectedNetwork } from "@tallyho/tally-background/redux-slices/ui"
import { EVMNetwork } from "@tallyho/tally-background/networks"
import { DEFAULT_NETWORKS } from "@tallyho/tally-background/constants"

// From chainlist.org
const FALLBACK_ICONS_BY_CHAINID: Record<string, string> = {
  "1": "https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg",
  "56": "https://icons.llamao.fi/icons/chains/rsz_binance.jpg",
  "137": "https://icons.llamao.fi/icons/chains/rsz_polygon.jpg",
  "42161": "https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg",
  "43114": "https://icons.llamao.fi/icons/chains/rsz_avalanche.jpg",
  "10": "https://icons.llamao.fi/icons/chains/rsz_optimism.jpg",
  "250": "https://icons.llamao.fi/icons/chains/rsz_fantom.jpg",
  "25": "https://icons.llamao.fi/icons/chains/rsz_cronos.jpg",
  "2222": "https://icons.llamao.fi/icons/chains/rsz_kava.jpg",
  "8217": "https://icons.llamao.fi/icons/chains/rsz_klaytn.jpg",
  "32659": "https://icons.llamao.fi/icons/chains/rsz_fusion.jpg",
  "7700": "https://icons.llamao.fi/icons/chains/rsz_canto.jpg",
  "42220": "https://icons.llamao.fi/icons/chains/rsz_celo.jpg",
  "100": "https://icons.llamao.fi/icons/chains/rsz_xdai.jpg",
  "1284": "https://icons.llamao.fi/icons/chains/rsz_moonbeam.jpg",
  "128": "https://icons.llamao.fi/icons/chains/rsz_heco.jpg",
  "1313161554": "https://icons.llamao.fi/icons/chains/rsz_aurora.jpg",
  "66": "https://icons.llamao.fi/icons/chains/rsz_okexchain.jpg",
  "592": "https://icons.llamao.fi/icons/chains/rsz_astar.jpg",
  "30": "https://icons.llamao.fi/icons/chains/rsz_rsk.jpg",
  "1088": "https://icons.llamao.fi/icons/chains/rsz_metis.jpg",
  "321": "https://icons.llamao.fi/icons/chains/rsz_kucoin.jpg",
  "1285": "https://icons.llamao.fi/icons/chains/rsz_moonriver.jpg",
  "40": "https://icons.llamao.fi/icons/chains/rsz_telos.jpg",
  "4689": "https://icons.llamao.fi/icons/chains/rsz_iotex.jpg",
  "42262": "https://icons.llamao.fi/icons/chains/rsz_oasis.jpg",
  "888": "https://icons.llamao.fi/icons/chains/rsz_wanchain.jpg",
  "361": "https://icons.llamao.fi/icons/chains/rsz_theta.jpg",
  "888888": "https://icons.llamao.fi/icons/chains/rsz_vision.jpg",
  "1231": "https://icons.llamao.fi/icons/chains/rsz_ultron.jpg",
  "1666600000": "https://icons.llamao.fi/icons/chains/rsz_harmony.jpg",
  "2000": "https://icons.llamao.fi/icons/chains/rsz_dogechain.jpg",
  "106": "https://icons.llamao.fi/icons/chains/rsz_velas.jpg",
  "1234": "https://icons.llamao.fi/icons/chains/rsz_step.jpg",
  "10000": "https://icons.llamao.fi/icons/chains/rsz_smartbch.jpg",
  "19": "https://icons.llamao.fi/icons/chains/rsz_songbird.jpg",
  "288": "https://icons.llamao.fi/icons/chains/rsz_boba.jpg",
  "52": "https://icons.llamao.fi/icons/chains/rsz_csc.jpg",
  "108": "https://icons.llamao.fi/icons/chains/rsz_thundercore.jpg",
  "82": "https://icons.llamao.fi/icons/chains/rsz_meter.jpg",
  "50": "https://icons.llamao.fi/icons/chains/rsz_xdc.jpg",
  "32520": "https://icons.llamao.fi/icons/chains/rsz_bitgert.jpg",
  "122": "https://icons.llamao.fi/icons/chains/rsz_fuse.jpg",
  "20": "https://icons.llamao.fi/icons/chains/rsz_elastos.jpg",
  "57": "https://icons.llamao.fi/icons/chains/rsz_syscoin.jpg",
  "71402": "https://icons.llamao.fi/icons/chains/rsz_godwoken.jpg",
  "820": "https://icons.llamao.fi/icons/chains/rsz_callisto.jpg",
  "5551": "https://icons.llamao.fi/icons/chains/rsz_nahmii.jpg",
  "6969": "https://icons.llamao.fi/icons/chains/rsz_tombchain.jpg",
  "9001": "https://icons.llamao.fi/icons/chains/rsz_evmos.jpg",
  "246": "https://icons.llamao.fi/icons/chains/rsz_energyweb.jpg",
  "87": "https://icons.llamao.fi/icons/chains/rsz_nova%20network.jpg",
  "88": "https://icons.llamao.fi/icons/chains/rsz_tomochain.jpg",
  "61": "https://icons.llamao.fi/icons/chains/rsz_ethereumclassic.jpg",
  "8": "https://icons.llamao.fi/icons/chains/rsz_ubiq.jpg",
  "336": "https://icons.llamao.fi/icons/chains/rsz_shiden.jpg",
  "70": "https://icons.llamao.fi/icons/chains/rsz_hoo.jpg",
  "55": "https://icons.llamao.fi/icons/chains/rsz_zyx.jpg",
  "47805": "https://icons.llamao.fi/icons/chains/rsz_rei.jpg",
  "269": "https://icons.llamao.fi/icons/chains/rsz_hpb.jpg",
  "55555": "https://icons.llamao.fi/icons/chains/rsz_reichain.jpg",
  "60": "https://icons.llamao.fi/icons/chains/rsz_gochain.jpg",
  "333999": "https://icons.llamao.fi/icons/chains/rsz_polis.jpg",
  "11297108109": "https://icons.llamao.fi/icons/chains/rsz_palm.jpg",
  "420420": "https://icons.llamao.fi/icons/chains/rsz_kekchain.jpg",
}

interface Props {
  info: string
  network: EVMNetwork
  isSelected: boolean
  isDisabled: boolean
  onSelect: () => void
}

const getNetworkIcon = (network: EVMNetwork) => {
  if (
    DEFAULT_NETWORKS.some(
      (builtInNetwork) => builtInNetwork.chainID === network.chainID
    )
  ) {
    const iconName = network.name.replaceAll(" ", "").toLowerCase()

    return `./images/networks/${iconName}@2x.png`
  }

  return FALLBACK_ICONS_BY_CHAINID[network.chainID] ?? ""
}

export default function TopMenuProtocolListItem(props: Props): ReactElement {
  const { t } = useTranslation()
  const { info, isSelected, network, onSelect, isDisabled } = props

  const dispatch = useDispatch()

  return (
    <li
      className={classNames({ select: isSelected, disabled: isDisabled })}
      onClick={() => {
        if (isDisabled) return

        dispatch(setSelectedNetwork(network))
        onSelect()
      }}
      role="presentation"
    >
      <div className="left">
        <div className="icon_wrap">
          <span className="icon" />
        </div>
      </div>
      <div className="right">
        <div className="title">{network.name}</div>
        <div className="sub_title">
          {info}
          {isSelected && (
            <span className="status">{t("protocol.connected")}</span>
          )}
        </div>
      </div>
      <style jsx>
        {`
          li {
            display: flex;
            margin-bottom: 15px;
            cursor: pointer;
          }
          .status {
            height: 17px;
            color: var(--success);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
            margin-left: 8px;
          }
          .icon {
            background: url(${getNetworkIcon(network)});
            background-size: cover;
            width: 24px;
            height: 24px;
          }
          .icon_wrap {
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background-color: var(--hunter-green);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .left {
            margin-right: 16px;
            margin-left: 2px;
          }
          .right {
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .title {
            height: 24px;
            color: var(--green-5);
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
          }
          .sub_title {
            height: 17px;
            color: var(--green-60);
            font-size: 14px;
            font-weight: 400;
            letter-spacing: 0.42px;
            line-height: 16px;
          }
          .select .icon_wrap {
            border: 2px solid var(--success);
          }
          .select .left {
            margin-left: 0px;
          }
          .disabled {
            cursor: default;
          }
          .disabled .title {
            color var(--green-20);
          }
        `}
      </style>
    </li>
  )
}

TopMenuProtocolListItem.defaultProps = {
  isSelected: false,
  isDisabled: false,
}

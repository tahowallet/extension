import { Ability } from "@tallyho/tally-background/services/abilities"
import React, { ReactElement } from "react"
import SharedButton from "../../components/Shared/SharedButton"
import AbilityCardHeader from "./AbilityCardHeader"

// eslint-disable-next-line import/prefer-default-export
const AbilityCard = ({ ability }: { ability: Ability }): ReactElement => {
  console.log(ability)
  return (
    <>
      <div className="ability_card">
        <AbilityCardHeader ability={ability} />
        <div title={ability.title} className="title">
          {ability.title}
        </div>
        <div className="description">{ability.description}</div>
        <img className="image" alt="logo" src={ability.imageUrl} />
        <div className="controls">
          <SharedButton
            type="primary"
            size="medium"
            iconSmall="new-tab"
            onClick={() => {
              window.open(ability.linkUrl, "_blank")?.focus()
            }}
          >
            Visit website
          </SharedButton>
        </div>
      </div>
      <style jsx>
        {`
          .ability_card {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            padding: 16px;
            width: 310px;
            height: 295px;
            background: rgba(4, 20, 20, 0.4);
            border-radius: 12px;
          }
          .title {
            font-family: Segment;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 320px;
            white-space: nowrap;
            font-size: 18px;
            font-weight: 600;
            line-height: 24px;
            letter-spacing: 0em;
            text-align: left;
            margin-top 8px;
          }
          .description {
            margin-top: 4px;
            height: 48px;
            width: 320px;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: 'Segment';
            font-style: normal;
            font-weight: 500;
            font-size: 16px;
            line-height: 24px;
            color: #789594;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            margin-bottom: 16px;
          }
          .image {
            width: 320px;
            height: 115px;
            border-radius: 4px;
            object-fit: cover;
          }
          .controls {
            margin-top: 16px;
            display: flex;
            flex-direction: row;
          }
        `}
      </style>
    </>
  )
}

export default AbilityCard

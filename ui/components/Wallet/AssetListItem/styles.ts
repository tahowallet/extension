export default `
  .asset_list_item {
    height: 72px;
    width: 100%;
    border-radius: 16px;
    background-color: var(--green-95);
    display: flex;
    padding: 16px;
    box-sizing: border-box;
    margin-bottom: 16px;
    justify-content: space-between;
    align-items: center;
    gap: 8px
  }
  .asset_list_item:hover {
    background-color: var(--green-80);
  }
  .asset_left {
    display: flex;
    min-width: 0;
  }
  .asset_left_content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-left: 16px;
    min-width: 0;
  }
  .asset_right {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }
  .asset_amount {
    height: 17px;
    color: #fefefc;
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.42px;
    line-height: 16px;
    text-transform: uppercase;
    margin-bottom: 8px;
    margin-top: -1px;
    display: flex;
    align-items: baseline;
    white-space: nowrap;
    overflow-x: clip;
  }
  .bold_amount_count {
    flex-shrink: 0;
    height: 24px;
    color: #fefefc;
    font-size: 18px;
    font-weight: 600;
    line-height: 24px;
    margin-right: 4px;
  }
  /* Amounts are kept short, so the symbol is what gives way. */
  .asset_symbol {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .verify_asset {
    display: flex;
    align-items: center;
    gap: 4px;

    font-family: "Segment";
    font-style: normal;
    font-weight: 500;
    font-size: 16px;
    line-height: 24px;
    color: var(--attention);
  }
`

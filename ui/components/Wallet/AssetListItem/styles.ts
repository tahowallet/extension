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
  }
  .asset_list_item:hover {
    background-color: var(--green-80);
  }
  .asset_left {
    display: flex;
  }
  .asset_left_content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin-left: 16px;
  }
  .asset_right {
    display: flex;
    justify-content: flex-end;
    margin-right: 16px;
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
  }
  .bold_amount_count {
    width: 70px;
    height: 24px;
    color: #fefefc;
    font-size: 18px;
    font-weight: 600;
    line-height: 24px;
    margin-right: 4px;
  }
`

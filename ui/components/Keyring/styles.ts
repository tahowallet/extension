export default `
  .top {
    display: flex;
    width: 100%;
  }
  .wordmark {
    background: url("./images/wordmark@2x.png");
    background-size: cover;
    width: 95px;
    height: 25px;
    position: absolute;
    left: 0;
    right: 0;
    margin: 0 auto;
  }
  .serif_header {
    width: 335px;
    text-align: center;
    margin-top: 40px;
    margin-bottom: 25px;
  }
  section {
    padding-top: 25px;
    background-color: var(--hunter-green);
  }
  .input_wrap {
    width: 211px;
    padding-top: 10px;
  }
  .strength_bar_wrap {
    width: 211px;
    height: 26px;
    box-sizing: border-box;
    padding-top: 10px;
  }
  .input_wrap_padding_bottom {
    padding-bottom: 30px;
  }
  .set_as_default_ask {
    display: flex;
    width: 262px;
    justify-content: space-between;
    align-items: center;
    color: var(--green-20);
    font-weight: 500;
  }
  .restore {
    display: none;
    position: fixed;
    bottom: 26px;
  }
  .button_wrap {
    padding-top: 10px;
  }
`

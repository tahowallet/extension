import React, { useState } from 'react';
import PropTypes from 'prop-types';
import SharedSlideUpMenu from '../Shared/SharedSlideUpMenu';
import TopMenuProtocolList from '../TopMenu/TopMenuProtocolList';
import TopMenu from '../TopMenu/TopMenu';
import TabBar from '../TabBar/TabBar';

export default function CorePageWithTabs(props) {
  const { children } = props;

  const [isSlideUpMenuOpen, setIsSlideUpMenuOpen] = useState(false);
  const [isRunAnimation, setRunAnimation] = useState(false);

  return (
    <>
      <SharedSlideUpMenu
        isOpen={isSlideUpMenuOpen}
        isRunAnimation={isRunAnimation}
        close={() => {
          setIsSlideUpMenuOpen(false);
        }}
      >
        <TopMenuProtocolList />
      </SharedSlideUpMenu>
      <div className="wrap">
        <button
          type="button"
          className="trigger"
          onClick={() => {
            setIsSlideUpMenuOpen(!isSlideUpMenuOpen);
            setRunAnimation(true);
          }}
        >
          <TopMenu />
        </button>
        <div className="children_wrap">{children}</div>
        <TabBar />
      </div>
      <style jsx>
        {`
          .wrap {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            height: 100vh;
            width: 100vw;
          }
          .children_wrap {
            height: 480px;
            overflow: scroll;
            width: 100vw;
            display: flex;
            justify-content: center;
          }
        `}
      </style>
    </>
  );
}

CorePageWithTabs.propTypes = {
  children: PropTypes.node.isRequired,
};

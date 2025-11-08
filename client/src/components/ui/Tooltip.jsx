import React from "react";
import Tippy from "@tippyjs/react";
import "tippy.js/dist/tippy.css";

const Tooltip = ({
  content,
  arrow = true,
  children,
  placement = "bottom",
  trigger = "mouseenter focus",
  interactive = false,
}) => {
  return (
    <Tippy
      content={content}
      arrow={arrow}
      placement={placement}
      trigger={trigger}
      interactive={interactive}
    >
      {children}
    </Tippy>
  );
};

export default Tooltip;

import React from "react";

const HoverCard = ({ children }) => {
  return (
    <div className="hover-3d">
      {/* content */}
      {children}
      {/* 8 empty divs needed for the 3D effect */}
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  );
};

export default HoverCard;

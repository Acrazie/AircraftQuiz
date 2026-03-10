import React from "react";
import { Link } from "react-router-dom";

const HoverCard = ({ children, to = "/aircraft-quiz" }) => {
  return (
    <Link to={to}>
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
    </Link>
  );
};

export default HoverCard;

import React from "react";
import { Link } from "react-router-dom";

const HoverCard = ({ children }) => {
    return (
        <Link to='/aircraft-quiz'>
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

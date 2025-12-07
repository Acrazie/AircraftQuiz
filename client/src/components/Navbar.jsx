import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IconPlaneTilt, IconHome, IconSun, IconMoon, IconInfoCircle, IconUserCircle } from "@tabler/icons-react";
import Tooltip from "./ui/Tooltip";
import { FloatingDock } from "./ui/floating-dock";
import { useTheme } from "@/hooks/useTheme";

const Navbar = () => {
    const { theme, toggleTheme } = useTheme();
    const links = [
        {
            title: "Home",
            icon: <IconHome className="h-full w-full text-base-content/70" />,
            href: "/",
        },

        // {
        //     title: "Aircraft Quiz",
        //     icon: <IconPlaneTilt className="h-full w-full text-base-content/70" />,
        //     href: "/aircraft-quiz",
        // },
        {
            title: theme === "light" ? "Switch to Dark" : "Switch to Light",
            icon: (
                <div
                    onClick={(event) => {
                        event.preventDefault(); // Prevent the link from navigating to '#'
                        toggleTheme();
                    }}
                    className="h-full w-full flex items-center justify-center"
                >
                    {theme === "light" ? (
                        // If Light, show Moon (to go dark)
                        <IconMoon className="h-full w-full text text-base-content/70" />
                    ) : (
                        // If Dark, show Sun (to go light)
                        <IconSun className="h-full w-full text-base-content/70" />
                    )}
                </div>
            ),
            href: "#",
        },
        {
            title: "Profile",
            icon: <IconUserCircle className="h-full w-full text-base-content/70" />,
            href: "/profile",
        },
        {
            title: "About",
            icon: <IconInfoCircle className="h-full w-full text-base-content/70" />,
            href: "/about",
        },
    ];
    return (
        <div className="h-20 flex-1 flex justify-center items-center">
            <FloatingDock items={links} />
        </div>
    );
};

export default Navbar;

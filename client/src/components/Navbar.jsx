import React from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  IconPlaneTilt,
  IconHome,
  IconSun,
  IconMoon,
  IconInfoCircle,
  IconUserCircle,
} from "@tabler/icons-react";
import Tooltip from "./ui/Tooltip";
import { FloatingDock } from "./ui/floating-dock";
import { useTheme } from "@/hooks/useTheme";
import useAuthStore from "@/store/useAuthStore";

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleProfileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAuthenticated) {
      navigate("/profile");
    } else {
      navigate("/login");
    }
  };
  const links = [
    {
      title: "Home",
      icon: <IconHome className="h-full w-full text-base-content/70" />,
      href: "/",
    },
    {
      title: theme === "light" ? "Switch to Dark" : "Switch to Light",
      icon:
        theme === "light" ? (
          <IconMoon className="h-full w-full text-base-content/70" />
        ) : (
          <IconSun className="h-full w-full text-base-content/70" />
        ),
      href: "#",
      onClick: (e) => {
        e.preventDefault();
        toggleTheme();
      },
    },
    {
      title: "Profile",
      icon: <IconUserCircle className="h-full w-full text-base-content/70" />,
      href: "#",
      onClick: handleProfileClick,
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

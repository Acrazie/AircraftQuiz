import React from "react";
import { useNavigate } from "react-router-dom";
import {
  IconHome,
  IconSun,
  IconMoon,
  IconInfoCircle,
  IconUserCircle,
  IconCrown,
} from "@tabler/icons-react";
import { FloatingDock } from "./ui/floating-dock";
import useThemeStore from "@/store/useThemeStore";
import useAuthStore from "@/store/useAuthStore";

// Static icon nodes — defined outside the component so they are never recreated
const HOME_ICON = <IconHome className="h-full w-full text-base-content/70" />;
const RANKING_ICON = (
  <IconCrown className="h-full w-full text-base-content/70" />
);
const PROFILE_ICON = (
  <IconUserCircle className="h-full w-full text-base-content/70" />
);
const ABOUT_ICON = (
  <IconInfoCircle className="h-full w-full text-base-content/70" />
);
const MOON_ICON = <IconMoon className="h-full w-full text-base-content/70" />;
const SUN_ICON = <IconSun className="h-full w-full text-base-content/70" />;

const Navbar = () => {
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const handleProfileClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(isAuthenticated ? "/profile" : "/login");
  };

  const handleThemeToggle = (e) => {
    e.preventDefault();
    toggleTheme();
  };

  const isLight = theme === "light";

  const links = [
    { title: "Home", icon: HOME_ICON, href: "/" },
    {
      title: "Profile",
      icon: PROFILE_ICON,
      href: "#",
      onClick: handleProfileClick,
    },
    { title: "Ranking", icon: RANKING_ICON, href: "/ranking" },
    {
      title: isLight ? "Switch to Dark" : "Switch to Light",
      icon: isLight ? MOON_ICON : SUN_ICON,
      href: "#",
      onClick: handleThemeToggle,
    },
    { title: "About", icon: ABOUT_ICON, href: "/about" },
  ];

  return (
    <div className="h-20 flex-1 flex justify-center items-center">
      <FloatingDock items={links} />
    </div>
  );
};

export default Navbar;

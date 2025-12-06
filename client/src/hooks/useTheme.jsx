import { useEffect, useState } from "react";

export function useTheme() {
    // 1. Initialize state from localStorage or default to "light"
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) {
            return savedTheme;
        }

        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
            return "black";
        }

        return "light";
    });

    // 2. Sync with the HTML tag whenever the theme state changes
    useEffect(() => {
        const root = document.documentElement;

        // Set the data-theme attribute for DaisyUI
        root.setAttribute("data-theme", theme);

        // Save to localStorage so it persists on reload
        localStorage.setItem("theme", theme);
    }, [theme]);

    // 3. Helper function to toggle between your specific themes
    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "black" : "light"));
    };

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = (event) => {
            if (!localStorage.getItem("theme")) {
                setTheme(event.matches ? "black" : "light");
            }
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    return { theme, toggleTheme };
}

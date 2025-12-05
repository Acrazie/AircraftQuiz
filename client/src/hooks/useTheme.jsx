import { useEffect, useState } from "react";

export function useTheme() {
    // 1. Initialize state from localStorage or default to "light"
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("theme") || "light";
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

    return { theme, toggleTheme };
}

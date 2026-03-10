import { create } from "zustand";
import { persist } from "zustand/middleware";

const getInitialTheme = () =>
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "black"
    : "light";

const useThemeStore = create(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === "light" ? "black" : "light",
        })),
    }),
    { name: "aero-theme" },
  ),
);

// Keep <html data-theme> in sync with store
useThemeStore.subscribe((state) => {
  document.documentElement.setAttribute("data-theme", state.theme);
});

// Apply on initial load (subscribe doesn't fire for the initial state)
document.documentElement.setAttribute(
  "data-theme",
  useThemeStore.getState().theme,
);

// Mirror system preference changes when the user has no explicit preference
window
  .matchMedia?.("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    if (!localStorage.getItem("aero-theme")) {
      useThemeStore.setState({ theme: e.matches ? "black" : "light" });
    }
  });

export default useThemeStore;

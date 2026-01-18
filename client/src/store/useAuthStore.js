import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      token: null,
      user: null,
      isAuthenticated: false,

      // Actions
      login: (token, user) => {
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          token: undefined,
          user: undefined,
          isAuthenticated: false,
        });
        localStorage.removeItem("Token JWT");
      },

      // Check if token is still valid
      checkAuth: () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }
        // You can add token validation logic here
        return true;
      },
    }),
    {
      name: "Token JWT", // localStorage key
      partialize: (state) => ({ token: state.token, user: state.user}), // Only persist token and user
    },
  ),
);

export default useAuthStore;

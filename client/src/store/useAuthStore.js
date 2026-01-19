import { create } from "zustand";
import { persist } from "zustand/middleware";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      // Actions
      login: (token, refreshToken,  user) => {
        set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set({
          token: undefined,
          refreshToken: undefined,
          user: undefined,
          isAuthenticated: false,
        });
        localStorage.removeItem("Token JWT");
      },

      setToken: (token) => {
        set({ token });
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
      partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken, user: state.user, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user) {
          state.isAuthenticated = true;
        }
      }
    },
  ),
);

export default useAuthStore;

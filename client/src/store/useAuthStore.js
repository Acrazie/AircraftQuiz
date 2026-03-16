import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "@/services/authService";

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      // Actions
      login: (token, refreshToken, user) => {
        set({
          token,
          refreshToken,
          user,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        const { refreshToken } = get();
        // Revoke refresh token on the server (best-effort)
        if (refreshToken) {
          try {
            await authService.logout(refreshToken);
          } catch {
            // Proceed with local logout even if server revocation fails
          }
        }
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
        localStorage.removeItem("Token JWT");
      },

      setToken: (token) => {
        set({ token });
      },

      updateUserStats: (lp, rank, division) => {
        set((state) => ({
          user: state.user ? { ...state.user, lp, rank, division } : state.user,
        }));
      },

      updateAvatarColor: (avatarColor) => {
        set((state) => ({
          user: state.user ? { ...state.user, avatarColor } : state.user,
        }));
      },

      updateAvatarUrl: (avatarUrl) => {
        set((state) => ({
          user: state.user ? { ...state.user, avatarUrl } : state.user,
        }));
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
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user) {
          try {
            const { exp } = JSON.parse(atob(state.token.split(".")[1]));
            state.isAuthenticated = exp * 1000 > Date.now();
          } catch {
            state.isAuthenticated = false;
          }
        }
      },
    },
  ),
);

export default useAuthStore;

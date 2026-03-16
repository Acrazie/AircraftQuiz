import api from "@/lib/axios";

export const authService = {
  // Login user
  login: async (email, password) => {
    const response = await api.post("/login", {
      email,
      password,
    });
    return response.data;
  },

  // Register user
  register: async (username, email, password) => {
    const response = await api.post("/register", {
      username,
      email,
      password,
    });
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post("/token/refresh", {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  logout: async (refreshToken) => {
    const response = await api.post("/logout", {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  googleLogin: async (idToken) => {
    const response = await api.post("/auth/google", {
      id_token: idToken,
    });
    return response.data;
  },
};

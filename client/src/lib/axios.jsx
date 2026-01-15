import useAuthStore from "@/store/useAuthStore"; // Adjust path if needed
import axios from "axios";

// 1. Create the instance
const api = axios.create({
  baseURL: "/api", // Nginx handles the proxy to Symfony
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Add a Request Interceptor (Attach Token Automatically)
api.interceptors.request.use(
  (config) => {
    // Get the token directly from Zustand's state (works outside components!)
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 3. Add a Response Interceptor (Optional: Handle 401 Token Expiry)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Optional: Logout user if token is invalid
      useAuthStore.getState().logout();
      console.warn("Session expired or unauthorized");
    }
    return Promise.reject(error);
  },
);

export default api;

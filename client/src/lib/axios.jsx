import useAuthStore from "@/store/useAuthStore"; // Adjust path if needed
import axios from "axios";

// 1. Create the instance
const api = axios.create({
	baseURL: "/api", // Nginx handles the proxy to Symfony
	headers: {
		"Content-Type": "application/json",
	},
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
	failedQueue.forEach((prom) => {
		if (error) {
			prom.reject(error);
		} else {
			prom.resolve(token);
		}
	});

	failedQueue = [];
};

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
// Response Interceptor with Token Refresh
api.interceptors.response.use(
	(response) => response,
	async (error) => {
		const originalRequest = error.config;

		// If error is 401 and we haven't tried to refresh yet
		if (error.response?.status === 401 && !originalRequest._retry) {
			if (isRefreshing) {
				// If already refreshing, queue this request
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then((token) => {
						originalRequest.headers.Authorization = `Bearer ${token}`;
						return api(originalRequest);
					})
					.catch((err) => Promise.reject(err));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			const { refreshToken, setToken, logout } = useAuthStore.getState();

			if (!refreshToken) {
				logout();
				return Promise.reject(error);
			}

			try {
				// Call refresh endpoint
				const response = await axios.post("/api/token/refresh", {
					refresh_token: refreshToken,
				});

				const { token } = response.data;

				// Update token in store
				setToken(token);

				// Update authorization header
				api.defaults.headers.common.Authorization = `Bearer ${token}`;
				originalRequest.headers.Authorization = `Bearer ${token}`;

				// Process queued requests
				processQueue(null, token);

				return api(originalRequest);
			} catch (refreshError) {
				processQueue(refreshError, null);
				logout();
				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		return Promise.reject(error);
	},
);

export default api;

import React, { useState } from "react";
import {
  IconBrandGoogleFilled,
  IconMail,
  IconKey,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import useAuthStore from "@/store/useAuthStore";
import { authService } from "@/services/authService";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const googleLogin = useGoogleLogin({
    flow: "implicit",
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true);
      try {
        const data = await authService.googleLogin(tokenResponse.access_token);
        login(data.token, data.refresh_token, data.user);
        navigate("/profile");
      } catch (err) {
        setError(err.response?.data?.message || "Google login failed.");
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => setError("Google login failed."),
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.login(email, password);

      // Save token and user data to store
      login(data.token, data.refresh_token, data.user);

      // Navigate to profile
      navigate("/profile");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">
      <legend className="fieldset-legend">Login</legend>

      <div className="flex items-start flex-col mb-4 gap-4">
        <h1 className="card-title leading-none">Login to your account</h1>
        {/* <p className="label">Enter your email below to login to your account</p> */}
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin}>
        <label className="label text-base-content mb-2">Email</label>
        <label className="input w-full">
          <IconMail width="18" height="18" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="grow"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <div className="flex items-end justify-between mt-7 mb-2">
          <label className="label text-base-content">Password</label>
          <label className="label underline-offset-4 hover:underline hover:text-primary cursor-pointer">
            Forgot your password?
          </label>
        </div>
        <label className="input w-full">
          <IconKey width="18" height="18" />
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="grow"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="btn btn-circle btn-ghost btn-xs text-base-content/70"
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <IconEyeOff width="16" height="16" />
            ) : (
              <IconEye width="16" height="16" />
            )}
          </button>
        </label>

        <button
          type="submit"
          className="btn btn-neutral mt-7 w-full"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <button
        className="btn btn-neutral mt-4 w-full"
        onClick={() => googleLogin()}
        disabled={googleLoading}
      >
        <IconBrandGoogleFilled />
        {googleLoading ? "Connecting..." : "Login with Google"}
      </button>
      <div>
        <p className="label">
          Don't have an account?{" "}
          <span className="underline-offset-4 hover:underline hover:text-primary cursor-pointer">
            <Link to="/register">Register</Link>
          </span>
        </p>
      </div>
    </fieldset>
  );
};

export default LoginForm;

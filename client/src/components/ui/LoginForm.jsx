import React, { useState } from "react";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { authService } from "@/services/authService";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await authService.login(email, password);

      // Save token and user data to store
      login(data.token, data.user);

      // Navigate to profile
      navigate("/profile");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed.",
      );
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
        <label className="label text-base-content">Email</label>
        <input
          type="email"
          className="input w-full"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="flex items-end justify-between mt-7">
          <label className="label text-base-content">Password</label>
          <label className="label underline-offset-4 hover:underline hover:text-primary cursor-pointer">
            Forgot your password?
          </label>
        </div>
        <input
          type="password"
          className="input w-full"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          className="btn btn-neutral mt-7 w-full"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <button className="btn btn-neutral mt-4 w-full">
        <IconBrandGoogleFilled />
        Login with Google
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

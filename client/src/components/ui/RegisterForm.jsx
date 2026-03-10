import React, { useState } from "react";
import {
  IconBrandGoogleFilled,
  IconUser,
  IconMail,
  IconKey,
  IconEyeOff,
  IconEye,
} from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { authService } from "@/services/authService";

const RegisterForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleNext = (e) => {
    e.preventDefault();
    setError("");

    // Validation for each step
    if (currentStep === 1 && !username.trim()) {
      setError("Username is required");
      return;
    }
    if (currentStep === 2 && !email.trim()) {
      setError("Email is required");
      return;
    }
    if (currentStep === 3 && !password) {
      setError("Password is required");
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setError("");
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const data = await authService.register(username, email, password);

      // After successful registration, log the user in
      if (data.token) {
        login(data.token, data.refresh_token, data.user);
        navigate("/profile");
      } else {
        // If no token in response, redirect to login
        navigate("/login");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-md">
        <ul className="steps w-full mb-6">
          <li className={`step ${currentStep >= 1 ? "step-primary" : ""}`}>
            Username
          </li>
          <li className={`step ${currentStep >= 2 ? "step-primary" : ""}`}>
            Email
          </li>
          <li className={`step ${currentStep >= 3 ? "step-primary" : ""}`}>
            Password
          </li>
          <li className={`step ${currentStep >= 4 ? "step-primary" : ""}`}>
            Confirm
          </li>
        </ul>
      </div>
      <fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">
        <legend className="fieldset-legend">Register</legend>

        <div className="flex items-start flex-col mb-4 gap-4">
          <h1 className="card-title leading-none">Create an account</h1>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Username */}
        {currentStep === 1 && (
          <form onSubmit={handleNext}>
            <div className="flex flex-col justify-items-center items-center">
              <label className="label text-base-content mb-2">Username</label>
              <label className="input validator w-full">
                <IconUser width="18" height="18" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  pattern="[A-Za-z][A-Za-z0-9\-]*"
                  minLength="3"
                  maxLength="30"
                  title="Only letters, numbers or dash"
                  className="grow"
                />
              </label>
              <p className="validator-hint">
                Must be 3 to 30 characters
                <br />
                containing only letters, numbers or dash
              </p>
            </div>
            <button type="submit" className="btn btn-neutral mt-7 w-full">
              Next
            </button>
          </form>
        )}

        {/* Step 2: Email */}
        {currentStep === 2 && (
          <form onSubmit={handleNext}>
            <div className="flex flex-col justify-items-center items-center">
              <label className="label text-base-content mb-2">Email</label>

              <label className="input validator w-full">
                <IconMail width="18" height="18" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="grow"
                />
              </label>
            </div>

            <div className="flex gap-2 mt-7">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-outline flex-1"
              >
                Back
              </button>
              <button type="submit" className="btn btn-neutral flex-1">
                Next
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Password */}
        {currentStep === 3 && (
          <form onSubmit={handleNext}>
            <div className="flex flex-col justify-items-center items-center">
              <label className="label text-base-content mb-2">Password</label>

              <label className="input validator w-full">
                <IconKey width="18" height="18" />
                <input
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength="8"
                  pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                  title="Must be more than 8 characters, including number, lowercase letter, uppercase letter"
                  className="grow"
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
              <p className="validator-hint hidden">
                Must be more than 8 characters, including
                <br />
                At least one number <br />
                At least one lowercase letter <br />
                At least one uppercase letter
              </p>
            </div>
            <div className="flex gap-2 mt-7">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-outline flex-1"
              >
                Back
              </button>
              <button type="submit" className="btn btn-neutral flex-1">
                Next
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Confirm Password */}
        {currentStep === 4 && (
          <form onSubmit={handleRegister}>
            <div className="flex flex-col justify-items-center items-center">
              <label className="label text-base-content mb-2">
                Confirm Password
              </label>

              <label className="input validator w-full">
                <IconKey width="18" height="18" />
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoFocus
                  className="grow"
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
            </div>
            <div className="flex gap-2 mt-7">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-outline flex-1"
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-neutral flex-1"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </div>
          </form>
        )}

        <div className="divider">OR</div>

        <button className="btn btn-neutral w-full">
          <IconBrandGoogleFilled />
          Sign up with Google
        </button>

        {/* Footer Link */}
        <div className="mt-4">
          <p className="label justify-center">
            Already have an account?{" "}
            <span className="underline-offset-4 hover:underline hover:text-primary cursor-pointer ml-1">
              <Link to="/login">Login</Link>
            </span>
          </p>
        </div>
      </fieldset>
    </>
  );
};

export default RegisterForm;

import React, { useState } from "react";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { authService } from "@/services/authService";

const RegisterForm = () => {
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const { login } = useAuthStore();

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
				login(data.token, data.user);
				navigate("/profile");
			} else {
				// If no token in response, redirect to login
				navigate("/login");
			}
		} catch (err) {
			setError(err.response?.data?.message || "Registration failed. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">
			<legend className="fieldset-legend">Register</legend>

			<div className="flex items-start flex-col mb-4 gap-4">
				<h1 className="card-title leading-none">Create an account</h1>
				{/* <p className="label">Enter your email below to create your account</p> */}
			</div>

			{error && (
				<div className="alert alert-error mb-4">
					<span>{error}</span>
				</div>
			)}

			<form onSubmit={handleRegister}>
				{/* Username Field */}
				<label className="label text-base-content">Username</label>
				<input
					id="username"
					name="username"
					type="text"
					autoComplete="username"
					className="input w-full"
					placeholder="Cesna123"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
					required
				/>
				{/* Email Field */}
				<label className="label text-base-content">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autoComplete="email"
					className="input w-full"
					placeholder="name@example.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					required
				/>

				{/* Password Field */}
				<label className="label text-base-content mt-4">Password</label>
				<input
					id="password"
					name="password"
					autoComplete="new-password"
					type="password"
					className="input w-full"
					placeholder="Password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
				/>

				{/* Added Confirm Password Field */}
				<label className="label text-base-content mt-4">Confirm Password</label>
				<input
					id="password"
					name="password"
					type="password"
					autoComplete="new-password"
					className="input w-full"
					placeholder="Confirm Password"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
					required
				/>

				{/* Action Buttons */}
				<button
					type="submit"
					className="btn btn-neutral mt-7 w-full"
					disabled={loading}>
					{loading ? "Creating account..." : "Create account"}
				</button>
			</form>

			<button className="btn btn-neutral mt-4 w-full">
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
	);
};

export default RegisterForm;

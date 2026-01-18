import React from "react";
import LoginForm from "@/components/ui/LoginForm";
import RegisterForm from "@/components/ui/RegisterForm";
import useAuthStore from "@/store/useAuthStore";
import { Navigate } from "react-router-dom";
const Profile = () => {
	const { isAuthenticated, user, logout } = useAuthStore();
	if (isAuthenticated) {
		return (
			<div className="flex-1 h-full flex flex-col justify-center items-center">
				<div className="card bg-base-200 w-96 shadow-xl">
					<div className="card-body items-center text-center">
						<h2 className="card-title">Welcome, {user?.username || user?.email || "User"}!</h2>
						<p className="text-base-content/70">Email: {user?.email}</p>
						<div className="card-actions justify-end mt-4">
							<button
								className="btn btn-primary"
								onClick={logout}>
								Logout
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}
	return (
		<Navigate
			to="/login"
			replace
		/>
	);
};

export default Profile;

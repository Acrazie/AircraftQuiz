import React from "react";
import { Navigate } from "react-router-dom";
import LoginForm from "@/components/ui/LoginForm";
import useAuthStore from "@/store/useAuthStore";

const Login = () => {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="flex-1 h-full flex flex-col justify-center items-center">
      <LoginForm />
    </div>
  );
};

export default Login;

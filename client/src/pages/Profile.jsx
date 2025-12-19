import React from "react";
import LoginForm from "@/components/ui/LoginForm";
import RegisterForm from "@/components/ui/RegisterForm";
const Profile = () => {
    return (
        <div className="flex-1 h-full flex flex-col justify-center items-center">
            <LoginForm />
            {/* <RegisterForm /> */}
        </div>
    );
};

export default Profile;

import React from "react";
import { IconBrandGoogleFilled } from "@tabler/icons-react";
const LoginForm = () => {
    return (
        <fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">
            <legend className="fieldset-legend">Login</legend>

            <div className="flex items-start flex-col mb-4 gap-4">
                <h1 className="card-title leading-none"> Login to your account</h1>
                <p className="label">Enter your email below to login to your account</p>
            </div>

            <label className="label text-base-content">Email</label>
            <input type="email" className="input w-full" placeholder="Email" />

            <div className="flex items-end justify-between  mt-7">
                <label className="label text-base-content">Password</label>
                <label className="label underline-offset-4 hover:underline hover:text-primary cursor-pointer">
                    Forgot your password ?
                </label>
            </div>
            <input type="password" className="input w-full" placeholder="Password" />

            <button className="btn btn-neutral mt-7">Login</button>
            <button className="btn btn-neutral mt-4">
                <IconBrandGoogleFilled />
                Login with Google
            </button>
            <div>
                <p className="label">
                    Don't have an account?
                    <span className="underline-offset-4 hover:underline hover:text-primary cursor-pointer">
                        Sign up
                    </span>
                </p>
            </div>
        </fieldset>
    );
};

export default LoginForm;

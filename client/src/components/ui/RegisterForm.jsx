import React from "react";
import { IconBrandGoogleFilled } from "@tabler/icons-react";

const RegisterForm = () => {
    return (
        <fieldset className="fieldset bg-base-200 border-base-300 w-md rounded-box border p-8">
            <legend className="fieldset-legend">Register</legend>

        <div className="flex items-start flex-col mb-4 gap-4">
            <h1 className="card-title leading-none">Create an account</h1>
            {/* <p className="label">Enter your email below to create your account</p> */}
        </div>

        {/* Email Field */}
<label className="label text-base-content">Email</label>
<input type="email" className="input w-full" placeholder="name@example.com" />

                {/* Password Field - Removed 'Forgot Password' link */}
                    <label className="label text-base-content mt-4">Password</label>
                    <input type="password" className="input w-full" placeholder="Password" />

                    {/* Added Confirm Password Field */}
                    <label className="label text-base-content mt-4">Confirm Password</label>
                    <input type="password" className="input w-full" placeholder="Confirm Password" />

                    {/* Action Buttons */}
                    <button className="btn btn-neutral mt-7">Create account</button>
                    <button className="btn btn-neutral mt-4">
                <IconBrandGoogleFilled />
                Sign up with Google
            </button>

            {/* Footer Link */}
            <div className="mt-4">
                <p className="label justify-center">
                    Already have an account?
                    <span className="underline-offset-4 hover:underline hover:text-primary cursor-pointer ml-1">
                        Login
                    </span>
                </p>
            </div>
        </fieldset>
    );
};

export default RegisterForm;
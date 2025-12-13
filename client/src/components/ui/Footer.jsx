import React from "react";
import { Link } from "react-router-dom";
import { IconBrandGithub } from "@tabler/icons-react";

const Footer = () => {
    return (
        <footer className="footer footer-horizontal footer-center text-base-content rounded p-10 bg-transparent">
            <nav className="grid grid-flow-col gap-4">
                <Link to="/" className="link link-hover">
                    Home
                </Link>
                <Link to="/about" className="link link-hover">
                    About us
                </Link>
                <Link to="/sign-in" className="link link-hover">
                    Sign In
                </Link>
            </nav>
            <nav>
                <div className="grid grid-flow-col gap-4">
                    <Link to="https://github.com/Acrazie" target="_blank" rel="noopener noreferrer">
                        <IconBrandGithub size={24} />
                    </Link>
                </div>
            </nav>
            <aside>
                <p>
                    Copyright © {new Date().getFullYear()} - All right reserved by Acra... , nan en vrai je m'en fou. ♥️
                </p>
            </aside>
        </footer>
    );
};

export default Footer;

import React from "react";
import { motion as Motion } from "motion/react";
import { IconBrandGithub } from "@tabler/icons-react";
import Footer from "@/components/ui/Footer";
import PlaneModel from "@/components/ui/PlaneModel";

const About = () => {
    return (
        <div className="hero flex-1 h-full flex flex-col justify-between">
            <div className="absolute inset-0 z-0">
                <PlaneModel />
            </div>
            <div className="hero-content text-center pointer-events-none">
                <div className="max-w-2xl grid-cols-1 grid-rows-2 gap-4 items-center pointer-events-auto">
                    <div className="col-span-2 justify-center flex items-center gap-4">
                        <Motion.img
                            src="/favicon.svg"
                            alt="Logo"
                            className="w-24 h-24 cursor-pointer"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", mass: 2.5, damping: 20, stiffness: 1000 }}
                        />
                        <Motion.h1
                            className="text-7xl tracking-tighter cursor-pointer text-error"
                            initial="rest"
                            whileHover={"hover"}
                            animate="rest"
                        >
                            <Motion.span
                                variants={{
                                    rest: { fontWeight: 700, color: "var(--color-base-content)" },
                                    hover: { fontWeight: 200, color: "var(--color-info)" },
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                AERO
                            </Motion.span>
                            <Motion.span
                                className="tracking-widest"
                                variants={{
                                    rest: { fontWeight: 200, color: "var(--color-info)" },
                                    hover: { fontWeight: 700, color: "var(--color-base-content)" },
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                QUIZ
                            </Motion.span>{" "}
                        </Motion.h1>
                    </div>
                    <h2 className="py-6 col-span-2 row-start-2 font-light text-2xl uppercase hover:tracking-widest transition-all duration-300">
                        Juste un mec en slip dans sa chambre.
                    </h2>
                </div>
            </div>
            <div className="z-10 w-full pointer-events-auto">
                <Footer />
            </div>
        </div>
    );
};

export default About;

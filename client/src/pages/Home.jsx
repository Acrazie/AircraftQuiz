import React from "react";
import HoverCard from "@/components/ui/3dhover-card";
import { IconWorld, IconHistory } from "@tabler/icons-react";
// eslint-disable-next-line no-unused-vars
import { motion } from "motion/react";

const Home = () => {
    return (
        <div className="hero flex-1 h-full flex flex-col">
            <div className="hero-content text-center">
                <div className="max-w-2xl grid-cols-1 grid-rows-2 gap-4 items-center justify-center">
                    <div className="col-span-2 justify-center flex items-center gap-4">
                        <motion.img
                            src="/favicon.svg"
                            alt="Logo"
                            className="w-24 h-24 cursor-pointer"
                            whileHover={{ y: -5 }}
                            transition={{ type: "spring", mass: 2.5, damping: 20, stiffness: 1000 }}
                        />
                        <motion.h1
                            className="text-7xl tracking-tighter cursor-pointer text-error"
                            initial="rest"
                            whileHover={"hover"}
                            animate="rest"
                        >
                            <motion.span
                                variants={{
                                    rest: { fontWeight: 700, color: "var(--color-base-content)" },
                                    hover: { fontWeight: 200, color: "var(--color-info)" },
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                AERO
                            </motion.span>
                            <motion.span
                                className="tracking-widest"
                                variants={{
                                    rest: { fontWeight: 200, color: "var(--color-info)" },
                                    hover: { fontWeight: 700, color: "var(--color-base-content)" },
                                }}
                                transition={{ duration: 0.3 }}
                            >
                                QUIZ
                            </motion.span>{" "}
                        </motion.h1>
                    </div>
                    <h2 className="py-6 col-span-2 row-start-2 font-light text-2xl uppercase hover:tracking-widest transition-all duration-300">
                        Test your knowledge about aircrafts !
                    </h2>
                </div>
            </div>
            <div className=" flex-1 grid grid-cols-2 grid-rows-2 gap-x-36">
                {/* Countries */}
                <HoverCard>
                    <div className="card bg-base-100 w-md shadow-sm">
                        <figure className="px-10 pt-10">
                            <IconWorld stroke={2} width={80} height={80} />
                        </figure>
                        <div className="card-body items-center text-center">
                            <h2 className="card-title text-3xl font-bold ">Air Forces</h2>
                            <p className="uppercase">
                                Choose the country
                                <br /> guess the name
                            </p>
                            <div className="card-actions">
                                <button className="btn btn-info">Start</button>
                            </div>
                        </div>
                    </div>
                </HoverCard>
                {/* Histoire */}
                <HoverCard>
                    <div className="card bg-base-100 w-md shadow-sm">
                        <figure className="px-10 pt-10">
                            <IconWorld stroke={2} width={80} height={80} />
                        </figure>
                        <div className="card-body items-center text-center">
                            <h2 className="card-title text-3xl font-bold ">Air Forces</h2>
                            <p className="uppercase">
                                Choose the country
                                <br /> guess the name
                            </p>
                            <div className="card-actions">
                                <button className="btn btn-info">Start</button>
                            </div>
                        </div>
                    </div>
                </HoverCard>
                {/*  */}
            </div>
        </div>
    );
};

export default Home;

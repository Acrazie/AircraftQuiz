import React from "react";
import HoverCard from "@/components/ui/3dhover-card";
import {
  IconWorld,
  IconZoomIn,
  IconCheck,
  IconSwords,
} from "@tabler/icons-react";
import { motion as Motion } from "motion/react";
import useDailyStatus from "@/hooks/useDailyStatus";

const Home = () => {
  const { completedTypes, dailyLoading, dailyError } = useDailyStatus();

  return (
    <div className="hero flex-1 h-full flex flex-col">
      <div className="hero-content text-center">
        <div className="max-w-2xl grid-cols-1 grid-rows-2 gap-4 items-center justify-center">
          <div className="col-span-2 justify-center flex items-center gap-4">
            <Motion.img
              src="/favicon.svg"
              alt="Logo"
              width={96}
              height={96}
              className="w-24 h-24 cursor-pointer"
              whileHover={{ y: -5 }}
              transition={{
                type: "spring",
                mass: 2.5,
                damping: 20,
                stiffness: 1000,
              }}
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
                  hover: {
                    fontWeight: 700,
                    color: "var(--color-base-content)",
                  },
                }}
                transition={{ duration: 0.3 }}
              >
                QUIZ
              </Motion.span>{" "}
            </Motion.h1>
          </div>
          <h2 className="py-6 col-span-2 row-start-2 font-light text-2xl uppercase hover:tracking-widest transition-all duration-300">
            Test your knowledge about aircrafts !
          </h2>
        </div>
      </div>
      {dailyError && (
        <div className="alert alert-warning py-2 text-sm max-w-md">
          <span>Could not load daily progress. Try refreshing.</span>
        </div>
      )}
      <div className=" flex-1 flex items-center justify-center gap-8 px-4 md:px-0 md:gap-16">
        {/* Aircraft (full) */}
        <HoverCard>
          <div className="card bg-base-200 w-md shadow-sm">
            <figure className="px-10 pt-10">
              <IconWorld stroke={2} width={80} height={80} />
            </figure>
            <div className="card-body items-center text-center">
              <h2 className="card-title text-3xl font-bold ">Aircraft</h2>
              <p className="uppercase">
                Choose the country
                <br /> guess the name
              </p>
              <div className="card-actions">
                {dailyLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : completedTypes.includes("full") ? (
                  <span className="btn btn-success btn-sm gap-1 pointer-events-none">
                    <IconCheck size={16} /> Done today
                  </span>
                ) : (
                  <span className="btn btn-info">Start</span>
                )}
              </div>
            </div>
          </div>
        </HoverCard>
        {/* Detail (zoomed) */}
        <HoverCard to="/aircraft-quiz?type=zoomed">
          <div className="card bg-base-200 w-md shadow-sm">
            <figure className="px-10 pt-10">
              <IconZoomIn stroke={2} width={80} height={80} />
            </figure>
            <div className="card-body items-center text-center">
              <h2 className="card-title text-3xl font-bold ">Detail</h2>
              <p className="uppercase">
                Zoomed in
                <br /> guess the name
              </p>
              <div className="card-actions">
                {dailyLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : completedTypes.includes("zoomed") ? (
                  <span className="btn btn-success btn-sm gap-1 pointer-events-none">
                    <IconCheck size={16} /> Done today
                  </span>
                ) : (
                  <span className="btn btn-warning">Start</span>
                )}
              </div>
            </div>
          </div>
        </HoverCard>
        {/* Versus */}
        <HoverCard to="/aircraft-quiz?type=versus">
          <div className="card bg-base-200 w-md shadow-sm">
            <figure className="px-10 pt-10">
              <IconSwords stroke={2} width={80} height={80} />
            </figure>
            <div className="card-body items-center text-center">
              <h2 className="card-title text-3xl font-bold">Versus</h2>
              <p className="uppercase">
                Side by side
                <br /> pick the right one
              </p>
              <div className="card-actions">
                {dailyLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : completedTypes.includes("versus") ? (
                  <span className="btn btn-success btn-sm gap-1 pointer-events-none">
                    <IconCheck size={16} /> Done today
                  </span>
                ) : (
                  <span className="btn btn-error">Start</span>
                )}
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

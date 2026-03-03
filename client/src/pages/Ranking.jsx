import React, { useState, useEffect } from "react";
import { motion as Motion } from "motion/react";
import TableRank from "@/components/ui/TableRank";
import { getLeaderboard } from "@/services/rankingService";

const Ranking = () => {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getLeaderboard()
      .then((res) => {
        if (!cancelled) setEntries(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load leaderboard.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hero flex-1 h-full flex flex-col gap-16">
      <div className="col-span-2 justify-center flex items-center gap-4">
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
            RANKING
          </Motion.span>{" "}
        </Motion.h1>
      </div>
      <div className="w-full flex-1 flex items-center gap-8 sm:px-4 md:px-8 xl:px-16 md:gap-16">
        <TableRank entries={entries} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
};

export default Ranking;

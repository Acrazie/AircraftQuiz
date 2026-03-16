import React, { memo, useState, useEffect } from "react";
import { motion as Motion } from "motion/react";
import { IconCrown } from "@tabler/icons-react";
import PageShell from "@/components/PageShell";
import BrandedTitle from "@/components/ui/BrandedTitle";
import TableRank from "@/components/ui/TableRank";
import { getLeaderboard } from "@/services/rankingService";
import { getAvatarHex } from "@/utils/avatarColors";

const CROWN_CLASS = {
  1: "text-warning",
  2: "text-base-content/50",
  3: "text-warning/70",
};

const PEDESTAL_CLASS = {
  1: "bg-warning/20 h-20",
  2: "bg-base-content/10 h-14",
  3: "bg-warning/10 h-10",
};

const AVATAR_SIZE = {
  1: "h-16 w-16 text-2xl",
  2: "h-12 w-12 text-xl",
  3: "h-10 w-10 text-lg",
};

/** Top-3 podium: arranged left=2nd, center=1st, right=3rd */
const Podium = memo(({ entries }) => {
  const slots = [entries[1] ?? null, entries[0] ?? null, entries[2] ?? null];
  const positions = [2, 1, 3];

  return (
    <div className="flex items-end justify-center gap-3 md:gap-6 w-full">
      {slots.map((entry, i) => {
        const pos = positions[i];
        const avatarSize = AVATAR_SIZE[pos];
        const pedesClass = PEDESTAL_CLASS[pos];
        const crownClass = CROWN_CLASS[pos];

        if (!entry) {
          return (
            <div
              key={pos}
              className="flex flex-col items-center gap-2 min-w-0 w-28 md:w-36"
            >
              <div
                className={`${pedesClass} w-full rounded-t-box flex items-center justify-center`}
              >
                <span className="text-base-content/20 font-bold text-xl">
                  {pos}
                </span>
              </div>
            </div>
          );
        }

        const hex = getAvatarHex(entry.username, entry.avatarColor);
        const initial = entry.username.charAt(0).toUpperCase();

        return (
          <Motion.div
            key={pos}
            className="flex flex-col items-center gap-2 min-w-0 w-28 md:w-36"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
          >
            {/* Card */}
            <div
              className={`card bg-base-200 w-full shadow-md ${pos === 1 ? "shadow-warning/10" : ""}`}
            >
              <div className="card-body items-center p-3 md:p-4 gap-2">
                <IconCrown size={pos === 1 ? 20 : 16} className={crownClass} />
                {/* Avatar */}
                <div className="avatar avatar-placeholder">
                  <div
                    className={`mask mask-squircle ${avatarSize} overflow-hidden`}
                    style={entry.avatarUrl ? {} : { backgroundColor: hex }}
                  >
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        alt={entry.username}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="font-bold text-white">{initial}</span>
                    )}
                  </div>
                </div>
                <p className="font-bold text-center text-sm md:text-base leading-tight truncate w-full text-center">
                  {entry.username}
                </p>
                <span className="text-xs text-base-content/50 font-semibold">
                  {entry.lp.toLocaleString()} LP
                </span>
              </div>
            </div>
            {/* Pedestal */}
            <div
              className={`${pedesClass} w-full rounded-t-box flex items-center justify-center`}
            >
              <span className={`font-black text-xl md:text-2xl ${crownClass}`}>
                {pos}
              </span>
            </div>
          </Motion.div>
        );
      })}
    </div>
  );
});

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
    <PageShell>
      <BrandedTitle suffix="RANKING" />

      {/* Podium — only rendered once data is ready and there's at least 1 entry */}
      {!isLoading && !error && entries.length >= 1 && (
        <div className="w-full max-w-lg mx-auto">
          <Podium entries={entries} />
        </div>
      )}

      {/* Full table */}
      <Motion.div
        className="w-full max-w-2xl mx-auto flex-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <TableRank entries={entries} isLoading={isLoading} error={error} />
      </Motion.div>
    </PageShell>
  );
};

export default Ranking;

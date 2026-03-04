import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import useAuthStore from "@/store/useAuthStore";
import { getLeaderboard } from "@/services/rankingService";

import UnrankedIcon from "@/assets/unranked.svg?react";
import BronzeIcon from "@/assets/bronze.svg?react";
import SilverIcon from "@/assets/silver.svg?react";
import GoldIcon from "@/assets/gold.svg?react";
import PlatinumIcon from "@/assets/platinum.svg?react";
import DiamondIcon from "@/assets/diamond.svg?react";
import ChallengerIcon from "@/assets/challenger.svg?react";

const RANK_ICONS = {
  unranked: UnrankedIcon,
  bronze: BronzeIcon,
  silver: SilverIcon,
  gold: GoldIcon,
  platinum: PlatinumIcon,
  diamond: DiamondIcon,
  challenger: ChallengerIcon,
};

const DIVISION_LABELS = ["I", "II", "III", "IV"];

const RANK_ORDER = [
  "unranked",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "challenger",
];
const RANK_THRESHOLDS = [0, 100, 500, 900, 1300, 1700, 2100];

/** LP progress within the current division (0–100) */
function lpWithinDivision(lp, rank) {
  const rankIdx = RANK_ORDER.indexOf(rank);
  if (rankIdx <= 0) return lp; // unranked: show raw lp toward 100
  if (rank === "challenger") return lp - 2100; // no cap
  const base = RANK_THRESHOLDS[rankIdx];
  return (lp - base) % 100;
}

const Profile = () => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [leaderboardEntry, setLeaderboardEntry] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    setLeaderboardLoading(true);
    getLeaderboard()
      .then((res) => {
        const entry =
          res.data.find((e) => e.username === user.username) ?? null;
        setLeaderboardEntry(entry);
      })
      .catch(() => setLeaderboardEntry(null))
      .finally(() => setLeaderboardLoading(false));
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const rank = user?.rank?.toLowerCase() ?? "unranked";
  const division = user?.division ?? 4;
  const lp = user?.lp ?? 0;
  const RankIcon = RANK_ICONS[rank] ?? UnrankedIcon;
  const showDivision = rank !== "unranked" && rank !== "challenger";
  const divisionLabel = DIVISION_LABELS[division - 1] ?? "IV";
  const progress = Math.min(100, lpWithinDivision(lp, rank));

  return (
    <div className="flex-1 h-full flex flex-col justify-center items-center gap-6 p-8">
      {/* Main card */}
      <div className="card bg-base-200 w-full max-w-lg shadow-xl">
        <div className="card-body gap-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="avatar placeholder">
              <div className="mask mask-squircle h-16 w-16 bg-base-300">
                <span className="text-2xl font-bold">
                  {(user?.username ?? user?.email ?? "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold leading-tight">
                {user?.username ?? "Pilot"}
              </h2>
              <p className="text-base-content/60 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="divider my-0" />

          {/* Rank block */}
          <div className="flex items-center gap-4">
            <RankIcon width="56" height="56" />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold capitalize">{rank}</span>
                {showDivision && (
                  <span className="text-base-content/60 font-semibold">
                    {divisionLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <progress
                  className="progress progress-primary flex-1 h-2"
                  value={progress}
                  max="100"
                />
                <span className="text-xs text-base-content/50 w-14 text-right">
                  {progress} / 100 LP
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="stats bg-base-300 shadow w-full">
            <div className="stat place-items-center">
              <div className="stat-title">Total LP</div>
              <div className="stat-value text-primary text-2xl">{lp}</div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">Quizzes</div>
              <div className="stat-value text-2xl">
                {leaderboardLoading ? (
                  <span className="loading loading-dots loading-sm" />
                ) : (
                  (leaderboardEntry?.quizzes ?? "—")
                )}
              </div>
            </div>
            <div className="stat place-items-center">
              <div className="stat-title">Rank #</div>
              <div className="stat-value text-2xl">
                {leaderboardLoading ? (
                  <span className="loading loading-dots loading-sm" />
                ) : leaderboardEntry ? (
                  `#${leaderboardEntry.position}`
                ) : (
                  "—"
                )}
              </div>
              {!leaderboardLoading && !leaderboardEntry && (
                <div className="stat-desc">Play to appear</div>
              )}
            </div>
          </div>

          <button className="btn btn-error btn-outline w-full" onClick={logout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;

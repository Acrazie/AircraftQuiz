import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion as Motion } from "motion/react";
import useAuthStore from "@/store/useAuthStore";
import { getLeaderboard } from "@/services/rankingService";
import { profileService } from "@/services/profileService";
import { getAvatarHex } from "@/utils/avatarColors";
import { IconCamera, IconLogout } from "@tabler/icons-react";

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

const RANK_BANNER_CLASS = {
  unranked: "bg-base-300",
  bronze: "bg-warning/15",
  silver: "bg-base-content/10",
  gold: "bg-warning/25",
  platinum: "bg-success/10",
  diamond: "bg-info/15",
  challenger: "bg-error/15",
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

function lpWithinDivision(lp, rank) {
  const rankIdx = RANK_ORDER.indexOf(rank);
  if (rankIdx <= 0) return lp;
  if (rank === "challenger") return lp - 2100;
  const base = RANK_THRESHOLDS[rankIdx];
  return (lp - base) % 100;
}

const Profile = () => {
  const { isAuthenticated, user, logout, updateAvatarUrl } = useAuthStore();
  const [leaderboardEntry, setLeaderboardEntry] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const fileInputRef = useRef(null);

  const username = user?.username;
  useEffect(() => {
    if (!isAuthenticated || !username) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    getLeaderboard()
      .then((res) => {
        if (!cancelled)
          setLeaderboardEntry(
            res.data.find((e) => e.username === username) ?? null,
          );
      })
      .catch(() => {
        if (!cancelled) setLeaderboardEntry(null);
      })
      .finally(() => {
        if (!cancelled) setLeaderboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, username]);

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
  const avatarHex = getAvatarHex(user?.username, user?.avatarColor);
  const bannerClass = RANK_BANNER_CLASS[rank] ?? "bg-base-300";

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      setAvatarError("Only JPEG, PNG, WebP or GIF files are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("File is too large (max 2 MB).");
      return;
    }

    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const res = await profileService.uploadAvatar(file);
      updateAvatarUrl(res.data.avatarUrl);
    } catch {
      setAvatarError("Upload failed. Please try again.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col gap-8 p-6 md:p-10 overflow-y-auto">
      {/* Branded title */}
      <div className="flex justify-center">
        <Motion.h1
          className="text-5xl md:text-7xl tracking-tighter cursor-default"
          initial="rest"
          whileHover="hover"
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
            PROFILE
          </Motion.span>
        </Motion.h1>
      </div>

      {/* Profile card */}
      <Motion.div
        className="w-full max-w-xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="card bg-base-200 shadow-xl overflow-hidden">
          {/* Rank banner */}
          <div
            className={`relative h-28 ${bannerClass} flex items-center px-6`}
          >
            {/* Rank name + division */}
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-widest text-base-content/40">
                Current rank
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-bold capitalize">{rank}</span>
                {showDivision && (
                  <span className="text-lg font-semibold text-base-content/50">
                    {divisionLabel}
                  </span>
                )}
              </div>
            </div>
            {/* Rank icon watermark */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
              <RankIcon width={80} height={80} />
            </div>
          </div>

          <div className="card-body gap-5 pt-0">
            {/* Avatar row — overlapping banner */}
            <div className="flex items-end gap-4 -mt-6 z-10">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                <div className="avatar placeholder">
                  <div
                    className="mask mask-squircle h-12 w-12 ring-4 ring-base-200 flex items-center justify-center overflow-hidden"
                    style={
                      user?.avatarUrl ? {} : { backgroundColor: avatarHex }
                    }
                  >
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="avatar"
                        className="h-20 w-20 object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white">
                        {(user?.username ?? user?.email ?? "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                {/* Camera overlay */}
                <button
                  className="absolute inset-0 flex items-center justify-center rounded-[20%] bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  title="Upload photo"
                >
                  {avatarUploading ? (
                    <span className="loading loading-spinner loading-xs text-white" />
                  ) : (
                    <IconCamera size={22} className="text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>

              {/* Identity */}
              <div className="pb-1 min-w-0">
                <h2 className="text-xl font-bold leading-tight truncate">
                  {user?.username ?? "Pilot"}
                </h2>
                <p className="text-base-content/50 text-sm truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Upload error */}
            {avatarError && (
              <div className="alert alert-error py-2 text-sm">
                <span>{avatarError}</span>
              </div>
            )}

            {/* LP progress */}
            <div className="flex items-center gap-3">
              <progress
                className="progress progress-primary flex-1 h-2"
                value={progress}
                max="100"
              />
              <span className="text-xs text-base-content/40 w-16 text-right shrink-0">
                {progress} / 100 LP
              </span>
            </div>

            {/* Stats */}
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

            <div className="divider my-0" />

            {/* Logout */}
            <button
              className="btn btn-error btn-outline w-full gap-2"
              onClick={logout}
            >
              <IconLogout size={16} />
              Logout
            </button>
          </div>
        </div>
      </Motion.div>
    </div>
  );
};

export default Profile;

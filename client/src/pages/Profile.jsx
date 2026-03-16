import React, { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion as Motion } from "motion/react";
import useAuthStore from "@/store/useAuthStore";
import PageShell from "@/components/PageShell";
import BrandedTitle from "@/components/ui/BrandedTitle";
import { getLeaderboard } from "@/services/rankingService";
import { profileService } from "@/services/profileService";
import { getAvatarHex } from "@/utils/avatarColors";
import { IconCamera, IconLogout } from "@tabler/icons-react";
import { RANK_BANNER_CLASS, DIVISION_RANKS } from "@/constants/ranks";
import { RANK_ICONS } from "@/constants/rankIcons";

const DIVISION_LABELS = ["I", "II", "III", "IV"];

/** LP position within the current tier (0-based). */
function divisionLp(lp, rank) {
  if (rank === "master") return lp - 100; // 0–399
  if (rank === "grandmaster") return lp - 500; // 0–499
  if (rank === "challenger") return lp - 1000; // 0+
  return lp; // 0–99 for all division-zone ranks
}

/** Maximum LP within the current tier (null = uncapped). */
function divisionMax(rank) {
  if (rank === "master") return 400; // 100 → 500
  if (rank === "grandmaster") return 500; // 500 → 1000
  if (rank === "challenger") return null; // uncapped
  return 100;
}

const Profile = () => {
  const { isAuthenticated, user, logout, updateAvatarUrl } = useAuthStore();
  const [leaderboardEntry, setLeaderboardEntry] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardError, setLeaderboardError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const fileInputRef = useRef(null);

  const username = user?.username;
  useEffect(() => {
    if (!isAuthenticated || !username) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    setLeaderboardError(false);
    getLeaderboard()
      .then((res) => {
        if (!cancelled)
          setLeaderboardEntry(
            res.data.find((e) => e.username === username) ?? null,
          );
      })
      .catch(() => {
        if (!cancelled) {
          setLeaderboardEntry(null);
          setLeaderboardError(true);
        }
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
  const RankIcon = RANK_ICONS[rank] ?? RANK_ICONS.unranked;
  const showDivision = DIVISION_RANKS.has(rank);
  const divisionLabel = DIVISION_LABELS[division - 1] ?? "IV";
  const currentDivisionLp = divisionLp(lp, rank);
  const maxDivisionLp = divisionMax(rank);
  const progressValue =
    maxDivisionLp !== null
      ? Math.min(currentDivisionLp, maxDivisionLp)
      : currentDivisionLp;
  const progressMax = maxDivisionLp ?? 1000;
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
    <PageShell>
      <BrandedTitle suffix="PROFILE" />

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
                        loading="lazy"
                        decoding="async"
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
                value={progressValue}
                max={progressMax}
              />
              <span className="text-xs text-base-content/40 w-24 text-right shrink-0">
                {maxDivisionLp !== null
                  ? `${currentDivisionLp} / ${maxDivisionLp} LP`
                  : `${currentDivisionLp} LP`}
              </span>
            </div>

            {/* Leaderboard error */}
            {leaderboardError && (
              <div className="alert alert-warning py-2 text-sm">
                <span>Could not load leaderboard stats.</span>
              </div>
            )}

            {/* Stats */}
            <div className="stats bg-base-300 shadow w-full">
              <div className="stat place-items-center">
                <div className="stat-title">Division LP</div>
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
    </PageShell>
  );
};

export default Profile;

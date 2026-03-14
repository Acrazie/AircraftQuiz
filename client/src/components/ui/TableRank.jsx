import React from "react";
import { IconCrown } from "@tabler/icons-react";
import { getAvatarHex } from "@/utils/avatarColors";
import { DIVISION_RANKS } from "@/constants/ranks";

import UnrankedIcon from "@/assets/unranked.svg?react";
import BronzeIcon from "@/assets/bronze.svg?react";
import SilverIcon from "@/assets/silver.svg?react";
import GoldIcon from "@/assets/gold.svg?react";
import PlatinumIcon from "@/assets/platinum.svg?react";
import DiamondIcon from "@/assets/diamond.svg?react";
import MasterIcon from "@/assets/master.svg?react";
import GrandmasterIcon from "@/assets/grandmaster.svg?react";
import ChallengerIcon from "@/assets/challenger.svg?react";

const RANK_ICONS = {
  unranked: UnrankedIcon,
  bronze: BronzeIcon,
  silver: SilverIcon,
  gold: GoldIcon,
  platinum: PlatinumIcon,
  diamond: DiamondIcon,
  master: MasterIcon,
  grandmaster: GrandmasterIcon,
  challenger: ChallengerIcon,
};

const CROWN_CLASS = {
  1: "text-warning",
  2: "text-base-content/50",
  3: "text-warning/70",
};

/**
 * @param {{ entries: Array<{position: number, username: string, rank: string, division: number, quizzes: number, lp: number, avatarUrl: string|null, avatarColor: string|null}>, isLoading: boolean, error: string|null }} props
 */
const TableRank = ({ entries = [], isLoading = false, error = null }) => {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-box">
      <table className="table table-sm w-full">
        <thead>
          <tr className="text-base-content/50 text-xs uppercase tracking-wider">
            <th className="w-12">#</th>
            <th>Pilot</th>
            <th>Rank</th>
            <th className="text-right">Quizzes</th>
            <th className="text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const rank = entry.rank?.toLowerCase() ?? "unranked";
            const RankIcon = RANK_ICONS[rank] ?? UnrankedIcon;
            const showDiv = DIVISION_RANKS.has(rank);
            const crownClass = CROWN_CLASS[entry.position];
            const hex = getAvatarHex(entry.username, entry.avatarColor);

            return (
              <tr
                key={entry.position}
                className="hover:bg-base-300/30 transition-colors"
              >
                <th className="font-bold">
                  {entry.position <= 3 ? (
                    <IconCrown size={16} className={crownClass} />
                  ) : (
                    <span className="text-base-content/40">
                      {entry.position}
                    </span>
                  )}
                </th>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="avatar avatar-placeholder flex-shrink-0">
                      <div
                        className="mask mask-squircle h-8 w-8 overflow-hidden"
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
                          <span className="text-xs font-bold text-white">
                            {entry.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold truncate">
                      {entry.username}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <RankIcon width="14" height="14" />
                    <span className="capitalize text-sm">{entry.rank}</span>
                    {showDiv && (
                      <span className="badge badge-ghost badge-xs">
                        {entry.division}
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right text-base-content/70">
                  {entry.quizzes}
                </td>
                <td className="text-right font-semibold">
                  {entry.lp.toLocaleString()} LP
                </td>
              </tr>
            );
          })}
          {entries.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="text-center text-base-content/40 py-12"
              >
                No pilots on the leaderboard yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableRank;

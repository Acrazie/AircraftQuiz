import React from "react";
import { IconCrown } from "@tabler/icons-react";
import Unranked from "../../assets/challenger.svg?react";

/**
 * @param {{ entries: Array<{position: number, username: string, rank: string, division: number, quizzes: number, lp: number}>, isLoading: boolean, error: string|null }} props
 */
const TableRank = ({ entries = [], isLoading = false, error = null }) => {
  if (isLoading) {
    return (
      <div className="overflow-y-auto flex-1 max-h-[calc(100vh-248px)] flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-y-auto flex-1 max-h-[calc(100vh-248px)] flex items-center justify-center">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 max-h-[calc(100vh-248px)]">
      <table className="table table-xs table-pin-rows">
        <thead>
          <tr>
            <th>#</th>
            <th>Pilots</th>
            <th>Rank</th>
            <th>Quizzes</th>
            <th>Points</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.position}>
              <th>
                {entry.position <= 3 ? (
                  <IconCrown
                    size={18}
                    className={
                      entry.position === 1
                        ? "text-yellow-400"
                        : entry.position === 2
                          ? "text-gray-400"
                          : "text-amber-600"
                    }
                  />
                ) : (
                  entry.position
                )}
              </th>
              <td>
                <div className="flex items-center gap-3">
                  <div className="avatar placeholder">
                    <div className="mask mask-squircle h-10 w-10 bg-base-300">
                      <span className="text-sm font-bold">
                        {entry.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold">{entry.username}</div>
                </div>
              </td>
              <td>
                <div className="flex items-center gap-2">
                  <Unranked width="16" height="16" />
                  <span className="capitalize">{entry.rank}</span>
                  <span className="badge badge-ghost badge-sm">
                    Div. {entry.division}
                  </span>
                </div>
              </td>
              <td>{entry.quizzes}</td>
              <td className="font-semibold">{entry.lp} LP</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-base-content/50 py-8">
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

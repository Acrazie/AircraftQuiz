/** Ordered list of rank names (lowest → highest) */
export const RANK_ORDER = [
  "unranked",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "master",
  "grandmaster",
  "challenger",
];

/** Ranks that show a division number (I–IV) */
export const DIVISION_RANKS = new Set([
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
]);

/** Per-rank banner background class */
export const RANK_BANNER_CLASS = {
  unranked: "bg-base-300",
  bronze: "bg-warning/15",
  silver: "bg-base-content/10",
  gold: "bg-warning/25",
  platinum: "bg-success/10",
  diamond: "bg-info/15",
  master: "bg-purple-500/10",
  grandmaster: "bg-red-500/10",
  challenger: "bg-error/15",
};

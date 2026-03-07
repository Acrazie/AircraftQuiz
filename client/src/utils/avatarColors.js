export const AVATAR_COLORS = {
  sky: "#0ea5e9",
  navy: "#1e3a8a",
  emerald: "#10b981",
  gold: "#f59e0b",
  orange: "#f97316",
  crimson: "#dc2626",
  purple: "#a855f7",
  indigo: "#6366f1",
  cyan: "#06b6d4",
  teal: "#14b8a6",
  rose: "#f43f5e",
  slate: "#64748b",
  lime: "#84cc16",
  amber: "#d97706",
  violet: "#7c3aed",
};

export const COLOR_KEYS = Object.keys(AVATAR_COLORS);

/** Returns the hex color for a user's avatar.
 * Uses the stored avatarColor key if set, otherwise falls back to a
 * deterministic color derived from the username. */
export function getAvatarHex(username, avatarColor) {
  if (avatarColor && AVATAR_COLORS[avatarColor])
    return AVATAR_COLORS[avatarColor];
  let hash = 0;
  for (let i = 0; i < (username ?? "").length; i++) {
    hash = (username.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  }
  return AVATAR_COLORS[COLOR_KEYS[Math.abs(hash) % COLOR_KEYS.length]];
}

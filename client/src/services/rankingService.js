import api from "@/lib/axios";

export const getLeaderboard = () => api.get("/leaderboard");

export const submitScore = (score, totalQuestions) =>
  api.post("/scores", { score, totalQuestions });

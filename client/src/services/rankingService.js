import api from "@/lib/axios";

export const getLeaderboard = () => api.get("/leaderboard");

export const submitScore = (answers, totalQuestions) =>
  api.post("/scores", { answers, totalQuestions });

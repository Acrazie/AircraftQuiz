import api from "@/lib/axios";

export const getLeaderboard = () => api.get("/leaderboard");

export const submitScore = (answers, totalQuestions, type) =>
  api.post("/scores", { answers, totalQuestions, type });

export const getDailyStatus = () => api.get("/quiz/daily-status");

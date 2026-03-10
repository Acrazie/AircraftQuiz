import { create } from "zustand";
import api from "@/lib/axios";
import { submitScore } from "@/services/rankingService";
import useAuthStore from "@/store/useAuthStore";

const useQuizStore = create((set, get) => ({
  // --- STATE ---
  questions: [],
  currentQuestionIndex: 0,
  userAnswers: {}, // Map: { questionId: selectedAnswerId }
  score: 0,
  isLoading: false,
  error: null,
  scoreError: null,
  isFinished: false,
  lpChange: null,
  newRank: null,
  newDivision: null,
  quizType: "full",

  // --- ACTIONS ---

  fetchQuestions: async (type = "full") => {
    set({ isLoading: true, error: null, quizType: type });
    try {
      const response = await api.get(`/questions?count=5&type=${type}`);
      const questions = response.data.map((q) => {
        const answers = [...q.answers];
        for (let i = answers.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [answers[i], answers[j]] = [answers[j], answers[i]];
        }
        return { ...q, answers };
      });
      set({
        questions,
        isLoading: false,
        currentQuestionIndex: 0,
        userAnswers: {},
        isFinished: false,
        score: 0,
        scoreError: null,
        lpChange: null,
        newRank: null,
        newDivision: null,
      });
    } catch (error) {
      set({
        error: error.response?.data?.message || "Failed to load quiz",
        isLoading: false,
      });
    }
  },

  submitAnswer: (questionId, answerId) => {
    set((state) => ({
      userAnswers: {
        ...state.userAnswers,
        [questionId]: answerId,
      },
    }));
  },

  nextQuestion: () => {
    const { questions, currentQuestionIndex } = get();

    if (currentQuestionIndex < questions.length - 1) {
      set({ currentQuestionIndex: currentQuestionIndex + 1 });
    } else {
      set({ isFinished: true });
      get().submitScoreToApi();
    }
  },

  // Only submits if the user is authenticated; score is computed server-side
  submitScoreToApi: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    const { userAnswers, questions, quizType } = get();
    try {
      const response = await submitScore(
        userAnswers,
        questions.length,
        quizType,
      );
      const { score, lpChange, totalLp, rank, division } = response.data;

      set({ score, lpChange, newRank: rank, newDivision: division });
      useAuthStore.getState().updateUserStats(totalLp, rank, division);
    } catch (err) {
      set({
        scoreError: err.response?.data?.message || "Failed to save score",
      });
    }
  },

  resetQuiz: () => {
    set({
      questions: [],
      currentQuestionIndex: 0,
      userAnswers: {},
      score: 0,
      isFinished: false,
      lpChange: null,
      newRank: null,
      newDivision: null,
      scoreError: null,
      quizType: "full",
    });
  },
}));

export default useQuizStore;

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
  isFinished: false,
  lpChange: null,
  newRank: null,
  newDivision: null,

  // --- ACTIONS ---

  fetchQuestions: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get("/questions?count=5");
      set({
        questions: response.data,
        isLoading: false,
        currentQuestionIndex: 0,
        userAnswers: {},
        isFinished: false,
        score: 0,
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
      get().calculateScore();
      set({ isFinished: true });
      get().submitScoreToApi();
    }
  },

  // Only submits if the user is authenticated
  submitScoreToApi: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    const { score, questions } = get();
    try {
      const response = await submitScore(score, questions.length);
      const { lpChange, totalLp, rank, division } = response.data;

      set({ lpChange, newRank: rank, newDivision: division });
      useAuthStore.getState().updateUserStats(totalLp, rank, division);
    } catch {
      // Silently ignore — quiz result is already shown from local state
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      set({ currentQuestionIndex: currentQuestionIndex - 1 });
    }
  },

  calculateScore: () => {
    const { questions, userAnswers } = get();
    let score = 0;

    questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswerId) {
        score++;
      }
    });

    set({ score });
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
    });
  },
}));

export default useQuizStore;

import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import api from "@/lib/axios"; // Uses your configured axios instance

const useQuizStore = create(
  persist(
    (set, get) => ({
      // --- STATE ---
      questions: [],
      currentQuestionIndex: 0,
      userAnswers: {}, // Map: { questionId: selectedAnswerId }
      score: 0,
      isLoading: false,
      error: null,
      isFinished: false,

      // --- ACTIONS ---

      // Fetch questions from Symfony API
      fetchQuestions: async () => {
        set({ isLoading: true, error: null });
        try {
          // Adjust endpoint to match your Symfony Controller route
          const response = await api.get("/questions");
          set({
            questions: response.data,
            isLoading: false,
            // Reset progress on new fetch
            currentQuestionIndex: 0,
            userAnswers: {},
            isFinished: false,
            score: 0,
          });
        } catch (error) {
          set({
            error: error.response?.data?.message || "Failed to load quiz",
            isLoading: false,
          });
        }
      },

      // Select an answer
      submitAnswer: (questionId, answerId) => {
        set((state) => ({
          userAnswers: {
            ...state.userAnswers,
            [questionId]: answerId,
          },
        }));
      },

      // Navigation
      nextQuestion: () => {
        const { questions, currentQuestionIndex } = get();

        if (currentQuestionIndex < questions.length - 1) {
          set({ currentQuestionIndex: currentQuestionIndex + 1 });
        } else {
          // Logic for finishing the quiz
          get().calculateScore();
          set({ isFinished: true });
        }
      },

      prevQuestion: () => {
        const { currentQuestionIndex } = get();
        if (currentQuestionIndex > 0) {
          set({ currentQuestionIndex: currentQuestionIndex - 1 });
        }
      },

      // Calculate score (Simple version)
      calculateScore: () => {
        const { questions, userAnswers } = get();
        let score = 0;

        questions.forEach((q) => {
          // Assuming backend sends 'correctAnswerId' or similar
          if (userAnswers[q.id] === q.correctAnswerId) {
            score++;
          }
        });

        set({ score });
      },

      resetQuiz: () => {
        set({
          currentQuestionIndex: 0,
          userAnswers: {},
          score: 0,
          isFinished: false,
        });
      },
    }),
    {
      name: "quiz-storage", // Key in localStorage
      partialize: (state) => ({
        // Only persist these fields
        questions: state.questions,
        currentQuestionIndex: state.currentQuestionIndex,
        userAnswers: state.userAnswers,
      }),
    },
  ),
);

export default useQuizStore;

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the axios instance and rankingService before importing the store
vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock("@/services/rankingService", () => ({
  submitScore: vi.fn(),
}));

vi.mock("@/store/useAuthStore", () => ({
  default: {
    getState: vi.fn(() => ({ isAuthenticated: false })),
  },
}));

import api from "@/lib/axios";
import useQuizStore from "@/store/useQuizStore";

/** Build a fake question with 4 answers (first is correct). */
function makeQuestion(id, correctFirst = true) {
  const answers = [
    { id: `${id}-a1`, text: "Correct Answer" },
    { id: `${id}-a2`, text: "Wrong A" },
    { id: `${id}-a3`, text: "Wrong B" },
    { id: `${id}-a4`, text: "Wrong C" },
  ];
  return {
    id,
    text: "Which aircraft is this?",
    imageUrl: null,
    correctAnswerId: `${id}-a1`,
    answers: correctFirst ? answers : [...answers].reverse(),
  };
}

beforeEach(() => {
  // Reset store state before each test
  useQuizStore.getState().resetQuiz();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// fetchQuestions
// ---------------------------------------------------------------------------
describe("fetchQuestions", () => {
  it("loads questions and shuffles answers", async () => {
    const fakeQuestions = [
      makeQuestion("q1"),
      makeQuestion("q2"),
      makeQuestion("q3"),
    ];
    api.get.mockResolvedValue({ data: fakeQuestions });

    await useQuizStore.getState().fetchQuestions();

    const { questions, isLoading, error } = useQuizStore.getState();
    expect(isLoading).toBe(false);
    expect(error).toBeNull();
    expect(questions).toHaveLength(3);

    // Each question still has 4 answers and the correctAnswerId is preserved
    questions.forEach((q, i) => {
      expect(q.answers).toHaveLength(4);
      expect(q.correctAnswerId).toBe(fakeQuestions[i].correctAnswerId);
      // The answers array should contain all original answer IDs
      const ids = q.answers.map((a) => a.id);
      expect(ids).toContain(`q${i + 1}-a1`);
    });
  });

  it("does not always keep the correct answer first", async () => {
    // Run fetchQuestions many times with the correct answer always first in the API
    // response — statistically, it should end up in a non-first position at least once.
    const fakeQ = makeQuestion("q1");
    api.get.mockResolvedValue({ data: [fakeQ] });

    const firstPositions = new Set();
    for (let i = 0; i < 40; i++) {
      await useQuizStore.getState().fetchQuestions();
      const q = useQuizStore.getState().questions[0];
      firstPositions.add(q.answers[0].id === "q1-a1" ? "first" : "other");
    }
    // After 40 runs the correct answer should have appeared in a non-first position
    expect(firstPositions.has("other")).toBe(true);
  });

  it("resets scoreError on re-fetch", async () => {
    // Manually set a scoreError to simulate a failed previous submission
    useQuizStore.setState({ scoreError: "Failed to save score" });
    api.get.mockResolvedValue({ data: [makeQuestion("q1")] });

    await useQuizStore.getState().fetchQuestions();

    expect(useQuizStore.getState().scoreError).toBeNull();
  });

  it("sets error on API failure", async () => {
    api.get.mockRejectedValue({
      response: { data: { message: "Server error" } },
    });

    await useQuizStore.getState().fetchQuestions();

    const { error, isLoading } = useQuizStore.getState();
    expect(isLoading).toBe(false);
    expect(error).toBe("Server error");
  });
});

// ---------------------------------------------------------------------------
// submitAnswer
// ---------------------------------------------------------------------------
describe("submitAnswer", () => {
  it("records the selected answer id", () => {
    useQuizStore.setState({
      questions: [makeQuestion("q1")],
      currentQuestionIndex: 0,
    });
    useQuizStore.getState().submitAnswer("q1", "q1-a2");
    expect(useQuizStore.getState().userAnswers["q1"]).toBe("q1-a2");
  });

  it("allows changing the answer before moving on", () => {
    useQuizStore.setState({
      questions: [makeQuestion("q1")],
      currentQuestionIndex: 0,
    });
    useQuizStore.getState().submitAnswer("q1", "q1-a2");
    useQuizStore.getState().submitAnswer("q1", "q1-a1");
    expect(useQuizStore.getState().userAnswers["q1"]).toBe("q1-a1");
  });
});

// ---------------------------------------------------------------------------
// calculateScore
// ---------------------------------------------------------------------------
describe("calculateScore", () => {
  it("counts only correct answers", () => {
    const questions = [
      makeQuestion("q1"),
      makeQuestion("q2"),
      makeQuestion("q3"),
    ];
    useQuizStore.setState({
      questions,
      userAnswers: {
        q1: "q1-a1", // correct
        q2: "q2-a2", // wrong
        q3: "q3-a1", // correct
      },
    });

    useQuizStore.getState().calculateScore();
    expect(useQuizStore.getState().score).toBe(2);
  });

  it("returns 0 when all answers are wrong", () => {
    const questions = [makeQuestion("q1"), makeQuestion("q2")];
    useQuizStore.setState({
      questions,
      userAnswers: { q1: "q1-a3", q2: "q2-a4" },
    });

    useQuizStore.getState().calculateScore();
    expect(useQuizStore.getState().score).toBe(0);
  });

  it("returns full score when all answers are correct", () => {
    const questions = [
      makeQuestion("q1"),
      makeQuestion("q2"),
      makeQuestion("q3"),
    ];
    useQuizStore.setState({
      questions,
      userAnswers: { q1: "q1-a1", q2: "q2-a1", q3: "q3-a1" },
    });

    useQuizStore.getState().calculateScore();
    expect(useQuizStore.getState().score).toBe(3);
  });

  it("score is unaffected by answer display order (shuffle)", () => {
    // Simulate shuffled answers — only correctAnswerId matters for scoring
    const q = makeQuestion("q1");
    q.answers = [...q.answers].reverse(); // correct answer is now LAST
    useQuizStore.setState({ questions: [q], userAnswers: { q1: "q1-a1" } });

    useQuizStore.getState().calculateScore();
    expect(useQuizStore.getState().score).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// resetQuiz
// ---------------------------------------------------------------------------
describe("resetQuiz", () => {
  it("clears all quiz state", () => {
    useQuizStore.setState({
      questions: [makeQuestion("q1")],
      currentQuestionIndex: 2,
      userAnswers: { q1: "q1-a1" },
      score: 5,
      isFinished: true,
      scoreError: "oops",
    });

    useQuizStore.getState().resetQuiz();

    const state = useQuizStore.getState();
    expect(state.questions).toHaveLength(0);
    expect(state.currentQuestionIndex).toBe(0);
    expect(state.userAnswers).toEqual({});
    expect(state.score).toBe(0);
    expect(state.isFinished).toBe(false);
    expect(state.scoreError).toBeNull();
  });
});

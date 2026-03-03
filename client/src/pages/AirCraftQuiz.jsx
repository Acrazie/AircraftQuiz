import React, { useEffect } from "react";
import useQuizStore from "@/store/useQuizStore";

const ANSWER_LABELS = ["A", "B", "C", "D"];
const FALLBACK_IMG =
  "https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp";

const AirCraftQuiz = () => {
  const {
    questions,
    fetchQuestions,
    isLoading,
    error,
    isFinished,
    score,
    currentQuestionIndex,
    userAnswers,
    submitAnswer,
    nextQuestion,
  } = useQuizStore();

  useEffect(() => {
    if (questions.length === 0) {
      fetchQuestions();
    }
  }, [fetchQuestions, questions.length]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-base-200 rounded-box p-12 flex flex-col items-center gap-8 text-center">
          <h2 className="text-4xl font-bold tracking-tight">Mission Debrief</h2>
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Score</div>
              <div className="stat-value text-primary">
                {score} / {questions.length}
              </div>
              <div className="stat-desc">{percentage}% accuracy</div>
            </div>
          </div>
          <button className="btn btn-primary btn-wide" onClick={fetchQuestions}>
            Fly Again
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  const selectedAnswerId = userAnswers[currentQuestion.id];
  const hasAnswered = Boolean(selectedAnswerId);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="h-full flex items-center overflow-y-hidden">
      {/* Sidebar left — progression */}
      <div className="bg-base-200 m-4 p-4 rounded-box w-1/6 h-full flex items-center justify-center">
        <ul className="steps steps-vertical">
          {questions.map((q, idx) => (
            <li
              key={q.id}
              className={`step${idx <= currentQuestionIndex ? " step-primary" : ""}`}
            >
              {idx + 1}
            </li>
          ))}
        </ul>
      </div>

      {/* Center — aircraft image */}
      <div className="h-full m-4 rounded-box w-4/6 overflow-hidden">
        <div
          className="hero h-full rounded-box"
          style={{
            backgroundImage: `url(${currentQuestion.imageUrl || FALLBACK_IMG})`,
          }}
        >
          <div className="hero-overlay rounded-box opacity-30" />
        </div>
      </div>

      {/* Right — question + answers */}
      <div className="bg-base-200 m-4 p-4 rounded-box w-2/6 h-full flex">
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-1/6 flex items-center justify-center">
            <h1 className="text-2xl font-bold text-center">
              {currentQuestion.text}
            </h1>
          </div>
          <div className="h-5/6 flex items-center flex-col justify-center gap-y-4">
            {currentQuestion.answers.map((answer, idx) => (
              <button
                key={answer.id}
                onClick={() => submitAnswer(currentQuestion.id, answer.id)}
                className={`btn flex w-5/6 h-1/10 flex-row justify-start px-12 ${
                  selectedAnswerId === answer.id
                    ? "btn-primary"
                    : "btn-neutral btn-dash"
                }`}
              >
                <kbd className="kbd kbd-xl bg-base-300 text-base-content">
                  {ANSWER_LABELS[idx]}
                </kbd>
                {answer.text}
              </button>
            ))}
            <button
              className="btn btn-success w-5/6 mt-4"
              onClick={nextQuestion}
              disabled={!hasAnswered}
            >
              {isLastQuestion ? "Submit" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirCraftQuiz;

import React, { useEffect } from "react";
import useQuizStore from "@/store/useQuizStore";
import useAuthStore from "@/store/useAuthStore";

const ANSWER_LABELS = ["A", "B", "C", "D"];
const FALLBACK_IMG =
  "https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp";

const AirCraftQuiz = () => {
  const {
    questions,
    fetchQuestions,
    resetQuiz,
    isLoading,
    error,
    isFinished,
    score,
    currentQuestionIndex,
    userAnswers,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    lpChange,
    newRank,
    newDivision,
    scoreError,
  } = useQuizStore();

  const { isAuthenticated } = useAuthStore();

  // Always fetch fresh questions on mount; reset state when leaving
  useEffect(() => {
    fetchQuestions();
    return () => resetQuiz();
  }, [fetchQuestions, resetQuiz]);

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
    const lpPositive = lpChange !== null && lpChange > 0;
    const lpNegative = lpChange !== null && lpChange < 0;
    const percentage =
      isAuthenticated && score !== null
        ? Math.round((score / questions.length) * 100)
        : null;

    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-base-200 rounded-box p-12 flex flex-col items-center gap-8 text-center">
          <h2 className="text-4xl font-bold tracking-tight">Mission Debrief</h2>
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Score</div>
              <div className="stat-value text-primary">
                {isAuthenticated
                  ? `${score ?? "…"} / ${questions.length}`
                  : `— / ${questions.length}`}
              </div>
              <div className="stat-desc">
                {isAuthenticated
                  ? percentage !== null
                    ? `${percentage}% accuracy`
                    : "Calculating…"
                  : "Log in to see your score"}
              </div>
            </div>

            {isAuthenticated && lpChange !== null && (
              <div className="stat">
                <div className="stat-title">LP</div>
                <div
                  className={`stat-value ${lpPositive ? "text-success" : lpNegative ? "text-error" : "text-base-content"}`}
                >
                  {lpPositive ? `+${lpChange}` : lpChange}
                </div>
                <div className="stat-desc capitalize">
                  {newRank}{" "}
                  {newRank !== "unranked" && newRank !== "challenger"
                    ? (["I", "II", "III", "IV"][newDivision - 1] ?? "")
                    : ""}
                </div>
              </div>
            )}
          </div>

          {!isAuthenticated && (
            <p className="text-sm text-base-content/60">
              Login to save your score and earn LP
            </p>
          )}

          {scoreError && <p className="text-sm text-error">{scoreError}</p>}

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
      <div className="flex content-center justify-center bg-base-200 m-4 p-4 rounded-box w-1/6 h-full ">
        <ul className="steps steps-vertical">
          {questions.map((q, idx) => {
            let stepClass = "step";
            const answeredId = userAnswers[q.id];
            if (idx === currentQuestionIndex) {
              stepClass = "step step-primary";
            } else if (answeredId) {
              stepClass = "step step-accent";
            }
            const letter = answeredId
              ? ANSWER_LABELS[q.answers.findIndex((a) => a.id === answeredId)]
              : null;
            return (
              <li key={q.id} className={stepClass}>
                {idx !== currentQuestionIndex && letter}
              </li>
            );
          })}
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
            <div className="flex w-5/6 gap-2 mt-4">
              <button
                className="btn btn-neutral flex-1"
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                ← Back
              </button>
              <button
                className="btn btn-success flex-2"
                onClick={nextQuestion}
                disabled={!hasAnswered}
              >
                {isLastQuestion ? "Submit" : "Next →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirCraftQuiz;

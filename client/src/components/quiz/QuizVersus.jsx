import React from "react";

const FALLBACK_IMG = "/favicon.svg";

const QuizVersus = ({
  currentQuestion,
  currentQuestionIndex,
  questionsLength,
  selectedAnswerId,
  hasAnswered,
  isLastQuestion,
  onSubmitAnswer,
  onNextQuestion,
}) => {
  const answerLeft = currentQuestion.answers[0];
  const answerRight = currentQuestion.answers[1];
  const pickedLeft = selectedAnswerId === answerLeft?.id;
  const pickedRight = selectedAnswerId === answerRight?.id;

  return (
    <div className="h-full flex flex-col overflow-hidden p-4 gap-4">
      {/* Top bar — question + progress */}
      <div className="grid grid-cols-3 items-center bg-base-200 rounded-box px-6 py-3 shrink-0">
        <span className="badge badge-error badge-sm uppercase tracking-wider justify-self-start">
          Versus
        </span>
        <h1 className="text-xl font-bold text-center">
          {currentQuestion.text}
        </h1>
        <span className="text-base-content/50 text-sm font-mono justify-self-end">
          {currentQuestionIndex + 1} / {questionsLength}
        </span>
      </div>

      {/* Side-by-side panels */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Left panel */}
        <button
          onClick={() =>
            answerLeft && onSubmitAnswer(currentQuestion.id, answerLeft.id)
          }
          className={`relative flex-1 rounded-box overflow-hidden border-4 transition-all duration-200 cursor-pointer ${
            pickedLeft
              ? "border-primary"
              : "border-transparent hover:border-base-content/30"
          }`}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${currentQuestion.imageUrl || FALLBACK_IMG})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="hero-overlay opacity-20" />
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 btn btn-lg pointer-events-none ${
              pickedLeft ? "btn-primary" : "btn-neutral"
            }`}
          >
            ← Pick this one
          </div>
        </button>

        {/* Right panel */}
        <button
          onClick={() =>
            answerRight && onSubmitAnswer(currentQuestion.id, answerRight.id)
          }
          className={`relative flex-1 rounded-box overflow-hidden border-4 transition-all duration-200 cursor-pointer ${
            pickedRight
              ? "border-primary"
              : "border-transparent hover:border-base-content/30"
          }`}
        >
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url(${currentQuestion.imageUrlB || FALLBACK_IMG})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="hero-overlay opacity-20" />
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 btn btn-lg pointer-events-none ${
              pickedRight ? "btn-primary" : "btn-neutral"
            }`}
          >
            Pick this one →
          </div>
        </button>
      </div>

      {/* Bottom — next button */}
      <div className="shrink-0 flex justify-end">
        <button
          className="btn btn-success btn-wide"
          onClick={onNextQuestion}
          disabled={!hasAnswered}
        >
          {isLastQuestion ? "Submit" : "Next →"}
        </button>
      </div>
    </div>
  );
};

export default QuizVersus;

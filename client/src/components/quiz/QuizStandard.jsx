import React from "react";

const ANSWER_LABELS = ["A", "B", "C", "D"];
const FALLBACK_IMG = "/favicon.svg";

const QuizStandard = ({
  questions,
  currentQuestion,
  currentQuestionIndex,
  userAnswers,
  selectedAnswerId,
  hasAnswered,
  isLastQuestion,
  quizType,
  onSubmitAnswer,
  onNextQuestion,
}) => (
  <div className="h-full flex items-center overflow-y-hidden">
    {/* Sidebar left — progression */}
    <div className="flex content-center justify-center bg-base-200 m-4 p-4 rounded-box w-1/6 h-full ">
      <ul className="steps steps-vertical">
        {questions.map((q, idx) => {
          const answeredId = userAnswers[q.id];
          const isPast = idx !== currentQuestionIndex && answeredId;
          let stepClass = "step";
          if (idx === currentQuestionIndex) {
            stepClass = "step step-primary";
          } else if (isPast) {
            stepClass =
              answeredId === q.correctAnswerId
                ? "step step-success"
                : "step step-error";
          }
          const letter = answeredId
            ? ANSWER_LABELS[q.answers.findIndex((a) => a.id === answeredId)]
            : null;
          return (
            <li key={q.id} className={stepClass}>
              {isPast && letter}
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
          backgroundSize: "200%",
          backgroundPosition: "center",
        }}
      >
        <div className="hero-overlay rounded-box opacity-30" />
      </div>
    </div>

    {/* Right — question + answers */}
    <div className="bg-base-200 m-4 p-4 rounded-box w-2/6 h-full flex">
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-1/6 flex flex-col items-center justify-center gap-1">
          {quizType === "zoomed" && (
            <span className="badge badge-warning badge-sm uppercase tracking-wider">
              Zoomed Detail
            </span>
          )}
          <h1 className="text-2xl font-bold text-center">
            {currentQuestion.text}
          </h1>
        </div>
        <div className="h-5/6 flex items-center flex-col justify-center gap-y-4">
          {currentQuestion.answers.map((answer, idx) => (
            <button
              key={answer.id}
              onClick={() => onSubmitAnswer(currentQuestion.id, answer.id)}
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
          <div className="flex w-5/6 mt-4">
            <button
              className="btn btn-success w-full"
              onClick={onNextQuestion}
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

export default QuizStandard;

import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion as Motion } from "motion/react";
import {
  IconPlaneTilt,
  IconTrendingUp,
  IconTrendingDown,
  IconCircleCheck,
  IconCircleX,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import useQuizStore from "@/store/useQuizStore";
import useAuthStore from "@/store/useAuthStore";
import { getDailyStatus } from "@/services/rankingService";

const ANSWER_LABELS = ["A", "B", "C", "D"];
const FALLBACK_IMG = "/favicon.svg";

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
    lpChange,
    newRank,
    newDivision,
    scoreError,
  } = useQuizStore();

  const { isAuthenticated } = useAuthStore();
  const [searchParams] = useSearchParams();
  const rawType = searchParams.get("type");
  const quizType =
    rawType === "zoomed" ? "zoomed" : rawType === "versus" ? "versus" : "full";
  const [isAlreadyCompleted, setIsAlreadyCompleted] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // Check daily completion before loading questions
  useEffect(() => {
    const init = async () => {
      if (isAuthenticated) {
        setStatusLoading(true);
        try {
          const res = await getDailyStatus();
          const completed = res.data.completedTypes ?? [];
          if (completed.includes(quizType)) {
            setIsAlreadyCompleted(true);
            setStatusLoading(false);
            return;
          }
        } catch {
          // status check failed — allow quiz to proceed
        }
        setStatusLoading(false);
      }
      fetchQuestions(quizType);
    };
    init();
    return () => resetQuiz();
  }, [fetchQuestions, resetQuiz, quizType, isAuthenticated]);

  if (statusLoading || isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (isAlreadyCompleted) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-base-200 rounded-box p-12 flex flex-col items-center gap-6 text-center">
          <IconCircleCheck width={64} className="text-success" />
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl font-bold">Already completed!</h2>
            <p className="text-base-content/60">
              You&apos;ve already done the{" "}
              {quizType === "zoomed" ? "Detail" : "Aircraft"} quiz today.
            </p>
            <p className="text-base-content/40 text-sm">
              Come back tomorrow for a new challenge.
            </p>
          </div>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
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

    // Compute score locally so unauthenticated users also see results
    const localScore = questions.reduce(
      (acc, q) => acc + (userAnswers[q.id] === q.correctAnswerId ? 1 : 0),
      0,
    );
    const displayScore = isAuthenticated ? (score ?? localScore) : localScore;
    const percentage = Math.round((displayScore / questions.length) * 100);

    const performanceLabel =
      displayScore === questions.length
        ? "Perfect run — Ace Pilot!"
        : displayScore >= questions.length - 1
          ? "Outstanding!"
          : displayScore >= questions.length - 2
            ? "Good run"
            : displayScore >= questions.length - 3
              ? "Needs improvement"
              : "Back to the books";

    const rankLabel =
      newRank && newRank !== "unranked" && newRank !== "challenger"
        ? `${newRank} ${["I", "II", "III", "IV"][newDivision - 1] ?? ""}`
        : (newRank ?? null);

    return (
      <Motion.div
        className="h-full flex gap-4 p-4 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
      >
        {/* Left — summary */}
        <div className="w-2/5 flex flex-col gap-4">
          <div className="bg-base-200 rounded-box p-8 flex flex-col gap-5 flex-1">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-3xl font-bold tracking-tight">
                  Mission Debrief
                </h2>
                {quizType === "zoomed" && (
                  <span className="badge badge-warning badge-sm uppercase tracking-wider">
                    Zoomed
                  </span>
                )}
                {quizType === "versus" && (
                  <span className="badge badge-error badge-sm uppercase tracking-wider">
                    Versus
                  </span>
                )}
              </div>
              <p className="text-base-content/50 text-sm">{performanceLabel}</p>
            </div>

            <div className="divider my-0" />

            {/* Score */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase tracking-widest text-base-content/50">
                  Score
                </span>
                <span className="text-5xl font-bold text-primary">
                  {displayScore}
                  <span className="text-xl text-base-content/30">
                    {" "}
                    / {questions.length}
                  </span>
                </span>
              </div>
              <progress
                className={`progress h-3 ${
                  percentage >= 80
                    ? "progress-success"
                    : percentage >= 60
                      ? "progress-warning"
                      : "progress-error"
                }`}
                value={percentage}
                max={100}
              />
              <span className="text-right text-xs text-base-content/40">
                {percentage}% accuracy
              </span>
            </div>

            <div className="divider my-0" />

            {/* LP */}
            {isAuthenticated ? (
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-widest text-base-content/50">
                  LP
                </span>
                {lpChange !== null ? (
                  <div className="flex items-center gap-2">
                    {lpPositive && (
                      <IconTrendingUp width={18} className="text-success" />
                    )}
                    {lpNegative && (
                      <IconTrendingDown width={18} className="text-error" />
                    )}
                    <span
                      className={`text-3xl font-bold ${
                        lpPositive
                          ? "text-success"
                          : lpNegative
                            ? "text-error"
                            : "text-base-content"
                      }`}
                    >
                      {lpPositive ? `+${lpChange}` : lpChange}
                    </span>
                    {rankLabel && (
                      <span className="badge badge-ghost badge-sm capitalize">
                        {rankLabel}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="loading loading-dots loading-sm" />
                )}
              </div>
            ) : (
              <p className="text-sm text-base-content/40 text-center">
                Login to save your score and earn LP
              </p>
            )}

            {scoreError && (
              <div className="alert alert-error">
                <span>{scoreError}</span>
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={() => fetchQuestions(quizType)}
          >
            <IconPlaneTilt width={20} />
            Fly Again
          </button>
        </div>

        {/* Right — question review */}
        <div className="w-3/5 flex flex-col gap-3 overflow-y-auto pr-1">
          {questions.map((q, idx) => {
            const answeredId = userAnswers[q.id];
            const isCorrect = answeredId === q.correctAnswerId;

            if (quizType === "versus") {
              const correctIsLeft =
                q.answers.find((a) => a.id === q.correctAnswerId)?.text ===
                "Left";
              const userPickedLeft =
                q.answers.find((a) => a.id === answeredId)?.text === "Left";

              return (
                <Motion.div
                  key={q.id}
                  className="bg-base-200 rounded-box overflow-hidden"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.07 }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="badge badge-ghost badge-sm shrink-0">
                      Q{idx + 1}
                    </span>
                    {isCorrect ? (
                      <IconCircleCheck
                        width={16}
                        className="text-success shrink-0"
                      />
                    ) : (
                      <IconCircleX width={16} className="text-error shrink-0" />
                    )}
                    <p className="font-semibold text-sm flex-1 truncate">
                      {q.text}
                    </p>
                  </div>

                  {/* Side-by-side images */}
                  <div className="flex h-40 border-t border-base-300">
                    {/* Left image */}
                    <div
                      className={`relative flex-1 overflow-hidden border-2 ${
                        correctIsLeft ? "border-success" : "border-transparent"
                      }`}
                    >
                      <img
                        src={q.imageUrl || FALLBACK_IMG}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      {!correctIsLeft && (
                        <div className="absolute inset-0 bg-base-100/60" />
                      )}
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {correctIsLeft && (
                          <span className="badge badge-success badge-sm gap-1">
                            <IconCheck width={10} />
                            Answer
                          </span>
                        )}
                        {userPickedLeft && (
                          <span
                            className={`badge badge-sm ${
                              isCorrect ? "badge-success" : "badge-error"
                            }`}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-base-300 shrink-0" />

                    {/* Right image */}
                    <div
                      className={`relative flex-1 overflow-hidden border-2 ${
                        !correctIsLeft ? "border-success" : "border-transparent"
                      }`}
                    >
                      <img
                        src={q.imageUrlB || FALLBACK_IMG}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      {correctIsLeft && (
                        <div className="absolute inset-0 bg-base-100/60" />
                      )}
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {!correctIsLeft && (
                          <span className="badge badge-success badge-sm gap-1">
                            <IconCheck width={10} />
                            Answer
                          </span>
                        )}
                        {!userPickedLeft && (
                          <span
                            className={`badge badge-sm ${
                              isCorrect ? "badge-success" : "badge-error"
                            }`}
                          >
                            You
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Motion.div>
              );
            }

            const answeredText = q.answers.find(
              (a) => a.id === answeredId,
            )?.text;
            const correctText = q.answers.find(
              (a) => a.id === q.correctAnswerId,
            )?.text;

            return (
              <Motion.div
                key={q.id}
                className={`bg-base-200 rounded-box overflow-hidden border-l-4 ${
                  isCorrect ? "border-success" : "border-error"
                }`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.07 }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="badge badge-ghost badge-sm shrink-0">
                    Q{idx + 1}
                  </span>
                  {isCorrect ? (
                    <IconCircleCheck
                      width={16}
                      className="text-success shrink-0"
                    />
                  ) : (
                    <IconCircleX width={16} className="text-error shrink-0" />
                  )}
                  <p className="font-semibold text-sm flex-1 truncate">
                    {q.text}
                  </p>
                </div>

                {/* Body: image + answers */}
                <div className="flex border-t border-base-300 h-28">
                  <div className="w-40 shrink-0 overflow-hidden">
                    <img
                      src={q.imageUrl || FALLBACK_IMG}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div className="w-px bg-base-300 shrink-0" />
                  <div className="flex flex-col justify-center gap-2 px-4 min-w-0">
                    <p className="text-success text-sm flex items-center gap-1.5 font-medium">
                      <IconCheck width={14} className="shrink-0" />
                      {correctText}
                    </p>
                    {!isCorrect && (
                      <p className="text-error text-sm flex items-center gap-1.5">
                        <IconX width={14} className="shrink-0" />
                        <span className="truncate">{answeredText}</span>
                      </p>
                    )}
                  </div>
                </div>
              </Motion.div>
            );
          })}
        </div>
      </Motion.div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-base-200 rounded-box p-12 flex flex-col items-center gap-6 text-center">
          <p className="text-xl font-semibold">No questions available</p>
          <p className="text-base-content/50 text-sm">
            This quiz type has no questions yet.
          </p>
          <Link to="/" className="btn btn-primary">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const selectedAnswerId = userAnswers[currentQuestion.id];
  const hasAnswered = Boolean(selectedAnswerId);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // --- Versus layout ---
  if (quizType === "versus") {
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
            {currentQuestionIndex + 1} / {questions.length}
          </span>
        </div>

        {/* Side-by-side panels */}
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Left panel */}
          <button
            onClick={() =>
              answerLeft && submitAnswer(currentQuestion.id, answerLeft.id)
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
              answerRight && submitAnswer(currentQuestion.id, answerRight.id)
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
            onClick={nextQuestion}
            disabled={!hasAnswered}
          >
            {isLastQuestion ? "Submit" : "Next →"}
          </button>
        </div>
      </div>
    );
  }

  // --- Standard layout (full / zoomed) ---
  return (
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
            <div className="flex w-5/6 mt-4">
              <button
                className="btn btn-success w-full"
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

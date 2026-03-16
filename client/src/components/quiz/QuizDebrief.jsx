import React from "react";
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

const FALLBACK_IMG = "/favicon.svg";

const QuizDebrief = ({
  questions,
  userAnswers,
  quizType,
  score,
  lpChange,
  newRank,
  newDivision,
  scoreError,
  isAuthenticated,
  isLoading,
  onPlayAgain,
}) => {
  const lpPositive = lpChange !== null && lpChange > 0;
  const lpNegative = lpChange !== null && lpChange < 0;

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
          onClick={onPlayAgain}
          disabled={isLoading}
        >
          <IconPlaneTilt width={20} />
          {isLoading ? "Loading..." : "Fly Again"}
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

                <div className="flex h-40 border-t border-base-300">
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

                  <div className="w-px bg-base-300 shrink-0" />

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
};

export default QuizDebrief;

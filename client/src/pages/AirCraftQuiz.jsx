import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { IconCircleCheck } from "@tabler/icons-react";
import useQuizStore from "@/store/useQuizStore";
import useAuthStore from "@/store/useAuthStore";
import { getDailyStatus } from "@/services/rankingService";
import { QUIZ_TYPE_LABELS } from "@/constants/quiz";
import QuizDebrief from "@/components/quiz/QuizDebrief";
import QuizVersus from "@/components/quiz/QuizVersus";
import QuizStandard from "@/components/quiz/QuizStandard";

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
              {QUIZ_TYPE_LABELS[quizType]} quiz today.
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
    return (
      <QuizDebrief
        questions={questions}
        userAnswers={userAnswers}
        quizType={quizType}
        score={score}
        lpChange={lpChange}
        newRank={newRank}
        newDivision={newDivision}
        scoreError={scoreError}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        onPlayAgain={() => fetchQuestions(quizType)}
      />
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

  if (quizType === "versus") {
    return (
      <QuizVersus
        currentQuestion={currentQuestion}
        currentQuestionIndex={currentQuestionIndex}
        questionsLength={questions.length}
        selectedAnswerId={selectedAnswerId}
        hasAnswered={hasAnswered}
        isLastQuestion={isLastQuestion}
        onSubmitAnswer={submitAnswer}
        onNextQuestion={nextQuestion}
      />
    );
  }

  return (
    <QuizStandard
      questions={questions}
      currentQuestion={currentQuestion}
      currentQuestionIndex={currentQuestionIndex}
      userAnswers={userAnswers}
      selectedAnswerId={selectedAnswerId}
      hasAnswered={hasAnswered}
      isLastQuestion={isLastQuestion}
      quizType={quizType}
      onSubmitAnswer={submitAnswer}
      onNextQuestion={nextQuestion}
    />
  );
};

export default AirCraftQuiz;

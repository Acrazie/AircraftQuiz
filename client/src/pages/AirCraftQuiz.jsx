import React, { useEffect } from "react";
import useQuizStore from "@/store/useQuizStore";

const AirCraftQuiz = () => {
  const {
    questions,
    currentQuestionIndex,
    fetchQuestions,
    isLoading,
    submitAnswer,
    nextQuestion,
    userAnswers,
    isFinished,
    score,
  } = useQuizStore();

  useEffect(() => {
    if (questions.length === 0) {
      fetchQuestions();
    }
  }, [fetchQuestions, questions.length]);

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage =
    ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (isFinished) {
    return (
      <div className="text-center p-10">
        <h2>Mission Debrief</h2>
        <p>
          Score: {score} / {questions.length}
        </p>
      </div>
    );
  }
  return (
    <div className="h-full flex items-center overflow-y-hidden">
      {/* Sidebar left progression quizz*/}
      <div className="bg-base-200 m-4 p-4 rounded-box w-1/6">
        <ul className="steps steps-vertical">
          <li className="step step-primary">Question 1</li>
          <li className="step step-primary">Question 2</li>
          <li className="step">Question 3</li>
          <li className="step">Question 4</li>
        </ul>
      </div>
      {/* Image of the plane to guess*/}
      <div className="h-full bg-base-200 m-4 p-4 flex rounded-box w-4/6">
        <div
          className="hero rounded-box"
          style={{
            backgroundImage:
              "url(https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp)",
          }}
        >
          <div className="hero-overlay rounded-box"></div>
          <div className="hero-content text-neutral-content text-center rounded-box">
            <div className="max-w-md rounded-box">
              <h1 className="mb-5 text-5xl font-bold rounded-box">
                Hello there
              </h1>
              <p className="mb-5">
                Provident cupiditate voluptatem et in. Quaerat fugiat ut
                assumenda excepturi exercitationem quasi. In deleniti eaque aut
                repudiandae et a id nisi.
              </p>
              <button className="btn btn-primary">Get Started</button>
            </div>
          </div>
        </div>
      </div>
      {/* Question sidebar right */}
      <div className="bg-base-200 m-4 p-4 rounded-box w-2/6 h-full flex">
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-1/6 flex items-center justify-center flex-wrap">
            <h1 className="text-2xl font-bold">Question title</h1>
          </div>
          <div className="h-5/6 flex items-center flex-col justify-center gap-y-20">
            <button className="btn btn-neutral btn-dash flex w-5/6 h-1/10 flex-row justify-start px-12">
              <kbd className="kbd kbd-xl bg-base-300  text-base-content">A</kbd>
              Answer 1
            </button>
            <button className="btn btn-neutral btn-dash flex w-5/6 h-1/10 flex-row justify-start px-12">
              <kbd className="kbd kbd-xl bg-base-300  text-base-content">B</kbd>
              Answer 1
            </button>
            <button className="btn btn-neutral btn-dash flex w-5/6 h-1/10 flex-row justify-start px-12">
              <kbd className="kbd kbd-xl bg-base-300  text-base-content">C</kbd>
              Answer 1
            </button>
            <button className="btn btn-neutral btn-dash flex w-5/6 h-1/10 flex-row justify-start px-12">
              <kbd className="kbd kbd-xl bg-base-300  text-base-content">D</kbd>
              Answer 1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AirCraftQuiz;

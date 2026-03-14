import React, { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion as Motion } from "motion/react";
import PageShell from "@/components/PageShell";
import {
  IconWorld,
  IconZoomIn,
  IconSwords,
  IconCheck,
} from "@tabler/icons-react";
import useAuthStore from "@/store/useAuthStore";
import { getDailyStatus } from "@/services/rankingService";

const SECTIONS = [
  {
    label: "Identification",
    quizzes: [
      {
        type: "full",
        title: "Aircraft",
        desc: "Choose country / guess the name",
        icon: <IconWorld width={56} height={56} stroke={1.5} />,
        color: "info",
        href: "/aircraft-quiz",
      },
      {
        type: "zoomed",
        title: "Detail",
        desc: "Zoomed in / guess the name",
        icon: <IconZoomIn width={56} height={56} stroke={1.5} />,
        color: "warning",
        href: "/aircraft-quiz?type=zoomed",
      },
    ],
  },
  {
    label: "Competition",
    quizzes: [
      {
        type: "versus",
        title: "Versus",
        desc: "Side by side / pick the right one",
        icon: <IconSwords width={56} height={56} stroke={1.5} />,
        color: "error",
        href: "/aircraft-quiz?type=versus",
      },
    ],
  },
];

const SectionDivider = ({ label }) => (
  <div className="flex items-center gap-3 mt-4">
    <hr className="flex-1 border-base-content/10" />
    <span className="text-xs font-bold uppercase tracking-widest text-base-content/40">
      {label}
    </span>
    <hr className="flex-1 border-base-content/10" />
  </div>
);

const QuizRow = memo(({ quiz, done, index, loading }) => (
  <Motion.div
    initial={{ opacity: 0, x: -16 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.07, duration: 0.35 }}
    whileHover={{ scale: 1.01 }}
    transition={{ type: "spring", stiffness: 400, damping: 25 }}
  >
    <Link to={quiz.href} className="block">
      <div className="card bg-base-200 shadow-sm overflow-hidden">
        <div className="flex flex-row items-stretch">
          {/* Accent icon block */}
          <div
            className={`w-24 flex-shrink-0 flex items-center justify-center bg-${quiz.color}/15 text-${quiz.color}`}
          >
            {quiz.icon}
          </div>

          {/* Body */}
          <div className="flex flex-1 items-center gap-4 px-6 py-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold uppercase tracking-tight leading-tight">
                {quiz.title}
              </h2>
              <p className="text-sm text-base-content/60 uppercase mt-0.5">
                {quiz.desc}
              </p>
              <div className="flex gap-2 mt-2">
                <span className="badge badge-ghost badge-sm">Daily</span>
                <span className="badge badge-ghost badge-sm">Free</span>
              </div>
            </div>

            {/* Action */}
            <div className="flex-shrink-0">
              {loading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : done ? (
                <span className="btn btn-success btn-sm gap-1 pointer-events-none">
                  <IconCheck size={16} /> Done today
                </span>
              ) : (
                <span className={`btn btn-${quiz.color} btn-sm`}>Start →</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  </Motion.div>
));

const Quizzes = () => {
  const { isAuthenticated } = useAuthStore();
  const [completedTypes, setCompletedTypes] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setDailyLoading(true);
    setDailyError(false);
    getDailyStatus()
      .then((res) => setCompletedTypes(res.data.completedTypes ?? []))
      .catch(() => setDailyError(true))
      .finally(() => setDailyLoading(false));
  }, [isAuthenticated]);

  let rowIndex = 0;

  return (
    <PageShell>
      {isAuthenticated && dailyError && (
        <div className="alert alert-warning py-2 text-sm w-full max-w-4xl mx-auto">
          <span>Could not load daily progress. Try refreshing.</span>
        </div>
      )}
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-4">
        <Motion.h1
          className="text-5xl md:text-7xl tracking-tighter cursor-default"
          initial="rest"
          whileHover="hover"
          animate="rest"
        >
          <Motion.span
            variants={{
              rest: { fontWeight: 700, color: "var(--color-base-content)" },
              hover: { fontWeight: 200, color: "var(--color-info)" },
            }}
            transition={{ duration: 0.3 }}
          >
            AERO
          </Motion.span>
          <Motion.span
            className="tracking-widest"
            variants={{
              rest: { fontWeight: 200, color: "var(--color-info)" },
              hover: { fontWeight: 700, color: "var(--color-base-content)" },
            }}
            transition={{ duration: 0.3 }}
          >
            QUIZZES
          </Motion.span>
        </Motion.h1>

        {SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-3">
            <SectionDivider label={section.label} />
            {section.quizzes.map((quiz) => {
              const idx = rowIndex++;
              return (
                <QuizRow
                  key={quiz.type}
                  quiz={quiz}
                  done={completedTypes.includes(quiz.type)}
                  index={idx}
                  loading={dailyLoading}
                />
              );
            })}
          </div>
        ))}
      </div>
    </PageShell>
  );
};

export default Quizzes;

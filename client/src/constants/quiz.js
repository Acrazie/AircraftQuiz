/** All daily quiz type identifiers */
export const QUIZ_TYPES = {
  FULL: "full",
  ZOOMED: "zoomed",
  VERSUS: "versus",
};

/** Human-readable labels per quiz type */
export const QUIZ_TYPE_LABELS = {
  [QUIZ_TYPES.FULL]: "Aircraft",
  [QUIZ_TYPES.ZOOMED]: "Detail",
  [QUIZ_TYPES.VERSUS]: "Versus",
};

/** Number of questions per quiz */
export const QUIZ_QUESTION_COUNT = 5;

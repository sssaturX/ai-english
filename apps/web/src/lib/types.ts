export type Level = "B1" | "B2" | "C1";

export type ExerciseType =
  | "fill_in_gap"
  | "multiple_choice"
  | "sentence_transformation"
  | "error_correction"
  | "open_answer";

export type MultipleChoiceQuestion = {
  id: string;
  type: "multiple_choice";
  topic: string;
  subtopic: string | null;
  level: Level;
  prompt: string;
  options: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  ruleExplanation: string;
};

export type FillInGapQuestion = {
  id: string;
  type: "fill_in_gap";
  topic: string;
  subtopic: string | null;
  level: Level;
  prompt: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  ruleExplanation: string;
};

export type SentenceTransformationQuestion = {
  id: string;
  type: "sentence_transformation";
  topic: string;
  subtopic: string | null;
  level: Level;
  prompt: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  ruleExplanation: string;
};

export type ErrorCorrectionQuestion = {
  id: string;
  type: "error_correction";
  topic: string;
  subtopic: string | null;
  level: Level;
  prompt: string;
  correctAnswer: string;
  acceptableAnswers?: string[];
  ruleExplanation: string;
};

export type OpenAnswerQuestion = {
  id: string;
  type: "open_answer";
  topic: string;
  subtopic: string | null;
  level: Level;
  prompt: string;
  correctAnswer: string;
  evaluationRubric: string;
  expectedAnswerNotes: string;
  ruleExplanation: string;
};

export type QuestionUnion =
  | MultipleChoiceQuestion
  | FillInGapQuestion
  | SentenceTransformationQuestion
  | ErrorCorrectionQuestion
  | OpenAnswerQuestion;

export type CheckExerciseResponse = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string;
  ruleExplanation: string;
  nextSuggestion: string | null;
};

export type GenerateExercisesRequest = {
  topic: string;
  subtopic: string | null;
  level: Level;
  count: number;
};

export type GenerateExercisesResponse = {
  questions: QuestionUnion[];
};


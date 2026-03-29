import type {
  CheckExerciseResponse,
  GenerateExercisesRequest,
  GenerateExercisesResponse,
  QuestionUnion,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

export async function generateExercises(req: GenerateExercisesRequest): Promise<GenerateExercisesResponse> {
  const resp = await fetch(`${API_BASE}/v1/exercises/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err || `Generate failed: ${resp.status}`);
  }

  return (await resp.json()) as GenerateExercisesResponse;
}

export async function checkExerciseAnswer(args: {
  question: QuestionUnion;
  userAnswer: string;
}): Promise<CheckExerciseResponse> {
  const { question, userAnswer } = args;
  const resp = await fetch(`${API_BASE}/v1/exercises/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionId: question.id,
      userAnswer,
      question,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err || `Check failed: ${resp.status}`);
  }

  return (await resp.json()) as CheckExerciseResponse;
}

